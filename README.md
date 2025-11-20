# GPS-based Boat Control System

This project contains the main server and web interface for a real-time boat tracking and control system capable of managing multiple gateways.

## System Architecture

The system operates based on the following model:

1.  **Boat Device**: Equipped with a GPS module and a LoRa transceiver.

    - **Upstream:** It continuously broadcasts its GPS coordinates and status (telemetry) via LoRa signals.
    - **Downstream:** It listens for, receives, and executes control commands sent from its assigned Gateway.

2.  **Raspberry Pi (Gateway)**: One or more devices with a LoRa transceiver, each with a unique ID and IP address.

    - **Upstream:** It listens for LoRa signals from boats and forwards the data by sending an HTTP POST request to the Laptop Server.
    - **Downstream:** It provides an API endpoint to receive commands from the Laptop Server and transmits them to the specific boat via LoRa.

3.  **Laptop Server (This Project)**: A Node.js application that:

    - Manages a database of boats and gateways.
    - **Upstream:** Provides an API to receive telemetry data, saves it to the database, and pushes it to the browser via WebSocket.
    - **Downstream:** Receives control commands from the browser via WebSocket and forwards them to the Fog Server.
    - Serves the React-based user interface, handles user authentication, and provides an API for managing boats and gateways.

4.  **Fog Server**: A central server responsible for routing commands.

    - It receives control commands from the main Laptop Server.
    - It looks up the correct Gateway IP address for the target boat.
    - It forwards the command to the appropriate Gateway, which then sends it to the boat.

5.  **Web Browser (Client)**: The React application running in the user's browser.
    - Provides a UI to manage boats and assign them to different gateways.
    - Displays live boat positions and statuses.
    - Captures user input (e.g., setting a new target) and sends commands to the Laptop Server via WebSocket.

---

# Project Setup and Running Guide

Follow these steps to get the application running on your local machine.

## 1. Prerequisites

- **Node.js**: Version `20.x` or later.
- **npm**: Included with Node.js.
- **MySQL**: A running MySQL server instance.

## 2. Database Setup

You need to create a database and the required tables.

### Create Database User

First, ensure you have a MySQL user for the application. Run this in your MySQL client:

```sql
-- Create user 'admin' with a password.
CREATE USER 'admin'@'localhost' IDENTIFIED WITH 'mysql_native_password' BY 'password';

-- Grant all privileges to the user.
GRANT ALL PRIVILEGES ON *.* TO 'admin'@'localhost' WITH GRANT OPTION;

-- Reload privileges.
FLUSH PRIVILEGES;
```

> **Note:** Remember to use these credentials in your `.env` file later.

### Create Database and Tables

This script sets up the entire database structure.

```sql
-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS boat_db;

-- Switch to the new database
USE boat_db;

-- Create the table for gateways
CREATE TABLE gateways (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gatewayId VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255)
);

-- Create the table for boats, with a foreign key to gateways
CREATE TABLE boats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    boatId VARCHAR(255) NOT NULL UNIQUE,
    gateway_id VARCHAR(255), -- This links to gateways.gatewayId
    CONSTRAINT fk_gateway
        FOREIGN KEY (gateway_id)
        REFERENCES gateways(gatewayId)
        ON DELETE SET NULL
);

-- Create the table for user accounts
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the table for telemetry logs
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

-- Create the table for command logs
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

## 3. Application Configuration

Create a file named `.env` in the project root and add the following content. **This is a mandatory step.**

```
# JWT Secret for signing authentication tokens
JWT_SECRET="your-super-secret-key-that-is-long-and-random"

# MySQL Database Connection
DB_HOST="localhost"
DB_USER="admin"
DB_PASSWORD="password"
DB_DATABASE="boat_db"
```

> **Important**: Replace the database credentials with the ones you created in the previous step.

## 4. Install Dependencies

Navigate to the project root directory in your terminal and run:

```bash
npm install
```

## 5. Fog Server Integration

**IMPORTANT NOTE**: The control command forwarding logic has been changed. Instead of dynamically looking up a gateway's IP address from the database, the server now sends all control commands to a single, hardcoded "Fog Server" address.

- **Modified File**: `server.js`
- **Function**: `forwardCommandToGateway`
- **Current Endpoint**: This function sends a `POST` request to `http://localhost:10000/command`.

This change was made to delegate the task of finding and communicating with the correct gateway to the Fog Server. If you need to change this target address, edit the `fogServerUrl` constant inside the `forwardCommandToGateway` function in `server.js`.

---

## 6. Running the Application

### For Development

This mode is ideal for development, as it provides hot-reloading for the frontend. You will need **two separate terminals**.

1.  **Run the Backend Server (Terminal 1):**
    Starts the API server on `http://localhost:3001`.

    ```bash
    node server.js
    ```

2.  **Run the Frontend Server (Terminal 2):**
    Starts the React development server on `http://localhost:3000`.

    ```bash
    npm start
    ```

3.  **Access the Application:**
    Open your browser to **`http://localhost:3000`**. You will need to create a user account from the login page before you can use the application.

### For Production

This mode builds the frontend into optimized static files and serves everything from a single server instance.

1.  **Build the Frontend:**
    This bundles the React app into the `build` directory.

    ```bash
    npm run build
    ```

2.  **Run the Production Server:**
    This command serves both the API and the static frontend files.

    ```bash
    NODE_ENV=production node server.js
    ```

3.  **Access the Application:**
    Open your browser to **`http://localhost:3001`**.
