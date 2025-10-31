# GPS-based Boat Control System

This project contains the main server and web interface for a real-time boat tracking and control system.

## System Architecture

The system operates based on the following model:

1.  **Boat Device**: Equipped with a GPS module and a LoRa transceiver.

    - **Upstream:** It continuously broadcasts its GPS coordinates and status (telemetry) via LoRa signals.
    - **Downstream:** It listens for, receives, and executes control commands sent from the Gateway.

2.  **Raspberry Pi (Gateway)**: A device with a LoRa transceiver running a dedicated script.

    - **Upstream:** It listens for LoRa signals from the boat and forwards the data by sending an HTTP POST request to the Laptop Server.
    - **Downstream:** It provides an API endpoint to receive commands from the Laptop Server and transmits them to the boat via LoRa.

3.  **Laptop Server (This Project)**: A Node.js application that:

    - **Upstream:** Provides an API to receive telemetry data from the Gateway, processes it, saves it to a database, and pushes it to the browser via WebSocket.
    - **Downstream:** Receives control commands from the browser via WebSocket, saves them to a database, and forwards them to the Gateway by sending an HTTP POST request.
    - Serves the React-based user interface and handles user authentication.

4.  **Web Browser (Client)**: The React application running in the user's browser.
    - **Upstream:** Loads the UI, establishes a WebSocket connection, and displays the boat's live position and status.
    - **Downstream:** Captures user input (e.g., setting a new target) and sends these commands to the Laptop Server via WebSocket.

---

# Data Formats

To ensure the system operates correctly, components communicating with the Node.js server must adhere to the following JSON formats.

### 1. Telemetry Data from Gateway to Server

This is the data flow from the boat's device, through the Gateway, which is sent to the server's `/api/telemetry` endpoint via an HTTP `POST` request.

**Required Format:**

- **Content-Type**: `application/json`
- **Body**:
  ```json
  {
    "boatId": "string",
    "lat": number,
    "lon": number,
    "head": number,
    "targetHead": number,
    "leftSpeed": number,
    "rightSpeed": number
  }
  ```

**Important Notes:**
- `boatId` must be a string.
- All other fields (`lat`, `lon`, `head`, etc.) must be of type number, **not** enclosed in quotes.

**Example:**
```json
{
  "boatId": "00001",
  "lat": 21.038737,
  "lon": 105.782458,
  "head": 45.5,
  "targetHead": 50,
  "leftSpeed": 1510,
  "rightSpeed": 1510
}
```

### 2. Control Commands from User Interface (UI) to Server

This is the data flow sent from the browser (UI) to the server via a WebSocket connection when a user sends a control command.

**Required Format:**

- The data is a JSON string.
- **Contents of the parsed JSON string:**
  ```json
  {
    "boatId": "string",
    "speed": number,
    "targetLat": number,
    "targetLon": number,
    "kp": number,
    "ki": number,
    "kd": number
  }
  ```

**Important Notes:**
- `boatId` must be a string.
- The control fields (`speed`, `targetLat`, `kp`, etc.) must be of type number.

**Example:**
```json
{
  "boatId": "00001",
  "speed": 1550,
  "targetLat": 21.689426,
  "targetLon": 102.092629,
  "kp": 1.0,
  "ki": 0.1,
  "kd": 0.05
}
```

---

# Project Setup and Running Guide

## 1. Initial Setup

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: This project requires Node.js version `20.19.2`. Using other versions may cause issues during dependency installation.
- **npm**: Node Package Manager, which is included with Node.js.

### Database

First, set up your MySQL database. Execute the following SQL commands to create the database and the required tables.

#### 1. Create Database User (Required)

Before creating the tables, you need a dedicated MySQL user for the application. Run these commands in your MySQL client:

```sql
-- 1. Create user 'admin' to connect from localhost, using the old authentication method and setting a password.
CREATE USER 'admin'@'localhost' IDENTIFIED WITH 'mysql_native_password' BY 'password';

-- 2. Grant all privileges (like root) to user 'admin' on all databases.
GRANT ALL PRIVILEGES ON *.* TO 'admin'@'localhost' WITH GRANT OPTION;

-- 3. Reload the grant tables for the changes to take effect immediately.
FLUSH PRIVILEGES;
```

> **Note:** Remember to use the same credentials (`admin` and `password`) in your `.env` file later.

#### 2. Create Database and Tables

Now, execute the following SQL commands to create the database and tables:

```sql
-- Create the database
CREATE DATABASE boat_db;

-- Switch to the new database
USE boat_db;

-- Create the table for boats
CREATE TABLE boats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    boatId VARCHAR(255) NOT NULL UNIQUE
);

-- Create the table for user accounts
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the table for telemetry logs (data from boats)
CREATE TABLE telemetry_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  boat_id VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  current_head FLOAT,
  target_head FLOAT,
  left_speed INT,
  right_speed INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (boat_id) REFERENCES boats(boatId) ON DELETE CASCADE
);

-- Create the table for command logs (data to boats)
CREATE TABLE command_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  boat_id VARCHAR(255) NOT NULL,
  user_id INT,
  speed INT,
  target_lat DECIMAL(10, 8),
  target_lon DECIMAL(11, 8),
  kp FLOAT,
  ki FLOAT,
  kd FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (boat_id) REFERENCES boats(boatId) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

You can add optional sample data for boats:

```sql
INSERT INTO boats (name, boatId) VALUES ('Boat 1', '00001');
INSERT INTO boats (name, boatId) VALUES ('Boat 2', '00002');
```

### Configuration

Before starting the server, you must create a `.env` file in the root of the project to store necessary credentials. This is a mandatory step.

1.  Create a file named `.env` in the project root.
2.  Copy the following template into it and replace the values with your own credentials.

```
# JWT Secret for signing authentication tokens
JWT_SECRET="your-super-secret-key-that-is-long-and-random"

# MySQL Database Connection
DB_HOST="localhost"
DB_USER="your_db_user"
DB_PASSWORD="your_db_password"
DB_DATABASE="boat_db"
```

> **Note:** The server will not start correctly if this file is missing or if any of the variables are not set.

### Install Dependencies

In the project root, run:

```bash
npm install
```

### Configure Gateway Connection

To send commands from the UI to the boat, the server needs to know the IP address of the Raspberry Pi Gateway.

- **File**: `server.js`
- **Function**: `forwardCommandToGateway`
- **Variable**: `const gatewayIp`

You must configure this IP address to match your Raspberry Pi's static IP. For example:

```javascript
const gatewayIp = "192.168.1.100"; // <-- Replace with your Pi's actual IP
```

---

## 2. Running the Application

You can run this application in two modes: Development or Production.

### Development Environment

**Purpose:** For coding, testing new features, and debugging. Requires up to **3 separate terminals**.

1.  **Run the Backend Server (Terminal 1):**
    Starts the API server on `http://localhost:3001`.

    ```bash
    node server.js
    ```

2.  **Run the Frontend Server (Terminal 2):**
    Starts the React development server on `http://localhost:3000` with hot-reloading.

    ```bash
    npm start
    ```

### 3.  **Register Your First User:**
    Before you can log in, you must create a user account. You can do this directly from the login page of the application.

**To use the app, open your browser to `http://localhost:3000` and log in with the credentials you just registered.**

### Production Environment

**Purpose:** For deploying the final, optimized version of the application.

1.  **Build the Frontend Application:**
    This command bundles the React app into static files in a `build` directory. You only need to run this when you have made changes to the frontend code (`src` folder).

    ```bash
    npm run build
    ```

2.  **Register a User (If you haven't already):**
    If you haven't created a user account yet, you can do so from the login page.

3.  **Run the Production Server:**
    This single command starts the server on `http://localhost:3001`, serving both the API and the optimized frontend application.
    ```bash
    NODE_ENV=production node server.js
    ```

**To use the app, open your browser to `http://localhost:3001` and log in.**
