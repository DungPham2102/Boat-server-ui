# GPS-based Boat Control System

This project contains the main server and web interface for a real-time boat tracking and control system capable of managing multiple gateways.

## System Architecture

The system operates based on the following model:

1.  **Boat Device**: Equipped with a GPS module and a LoRa transceiver.
    -   **Upstream:** It continuously broadcasts its GPS coordinates and status (telemetry) via LoRa signals.
    -   **Downstream:** It listens for, receives, and executes control commands sent from its assigned Gateway.

2.  **Raspberry Pi (Gateway)**: One or more devices with a LoRa transceiver, each with a unique ID and IP address.
    -   **Upstream:** It listens for LoRa signals from boats and forwards the data by sending an HTTP POST request to the Laptop Server.
    -   **Downstream:** It provides an API endpoint to receive commands from the Laptop Server and transmits them to the specific boat via LoRa.

3.  **Laptop Server (This Project)**: A Node.js application that:
    -   Manages a database of boats and gateways, including the relationship between them.
    -   **Upstream:** Provides an API to receive telemetry data, processes it, saves it to a database, and pushes it (enriched with gateway info) to the browser via WebSocket.
    -   **Downstream:** Receives control commands from the browser via WebSocket. It dynamically looks up the correct gateway IP address for the target boat, saves the command to a database, and forwards it to the appropriate gateway.
    -   Serves the React-based user interface, handles user authentication, and provides an API for managing boats and gateways.

4.  **Web Browser (Client)**: The React application running in the user's browser.
    -   Provides a UI to manage boats and assign them to different gateways.
    -   Loads the UI, establishes a WebSocket connection, and displays the boats' live positions and statuses, including which gateway is managing them.
    -   Captures user input (e.g., setting a new target) and sends these commands to the Laptop Server via WebSocket.

---

# Data Formats

### 1. Telemetry Data from Gateway to Server

Data sent from a Gateway to the server's `/api/telemetry` endpoint via HTTP `POST`.

-   **Content-Type**: `application/json`
-   **Body**:
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

### 2. Telemetry Data from Server to UI (WebSocket)

This is the enriched data broadcasted from the server to the UI. Note the addition of `gateway_id`.

-   **Format**: JSON string
-   **Contents**:
    ```json
    {
      "boatId": "string",
      "lat": number,
      "lon": number,
      "head": number,
      "targetHead": number,
      "leftSpeed": number,
      "rightSpeed": number,
      "gateway_id": "string"
    }
    ```

### 3. Control Commands from UI to Server (WebSocket)

-   **Format**: JSON string
-   **Contents**:
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

---

# Project Setup and Running Guide

## 1. Initial Setup

### Prerequisites

-   **Node.js**: Version `20.19.2` or compatible.
-   **npm**: Included with Node.js.
-   **MySQL**: A running MySQL server instance.

### Database

Execute the following SQL script in your MySQL client. This will create the database, all necessary tables with the correct structure, and optional sample data.

#### 1. Create Database User (Required)

First, ensure you have a MySQL user for the application.

```sql
-- Create user 'admin' with a password.
CREATE USER 'admin'@'localhost' IDENTIFIED WITH 'mysql_native_password' BY 'password';

-- Grant all privileges to the user.
GRANT ALL PRIVILEGES ON *.* TO 'admin'@'localhost' WITH GRANT OPTION;

-- Reload privileges.
FLUSH PRIVILEGES;
```

> **Note:** Remember to use these credentials in your `.env` file.

#### 2. Create Database and Tables

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
    name VARCHAR(255),
    ip_address VARCHAR(255) NOT NULL
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

-- --- OPTIONAL SAMPLE DATA ---

-- Add a sample gateway
INSERT INTO gateways (gatewayId, name, ip_address) VALUES ('GW001', 'Main Gateway', '192.168.1.100');

-- Add a sample boat and assign it to the gateway 'GW001'
INSERT INTO boats (name, boatId, gateway_id) VALUES ('Boat 1', '00001', 'GW001');

-- Add another sample boat without an assigned gateway
INSERT INTO boats (name, boatId) VALUES ('Boat 2', '00002');
```

### Configuration

Create a `.env` file in the project root with the following content. **This is a mandatory step.**

```
# JWT Secret for signing authentication tokens
JWT_SECRET="your-super-secret-key-that-is-long-and-random"

# MySQL Database Connection
DB_HOST="localhost"
DB_USER="your_db_user"      # e.g., admin
DB_PASSWORD="your_db_password"  # e.g., password
DB_DATABASE="boat_db"
```

### Install Dependencies

In the project root, run:
```bash
npm install
```

### Gateway Management

Gateway IP addresses are no longer hard-coded. You must add and manage your gateways in the database. You can do this via a MySQL client or by building a UI for it. The sample data above shows how to add a gateway. The server will dynamically use the IP address from the `gateways` table when sending commands to a boat.

---

## 2. Running the Application

### Development Environment

Requires **2 separate terminals**.

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

3.  **Register & Log In:**
    Before you can use the app, you must create a user account from the login page.

**Open your browser to `http://localhost:3000` and log in.**

### Production Environment

1.  **Build the Frontend:**
    This bundles the React app into static files in the `build` directory.
    ```bash
    npm run build
    ```

2.  **Run the Production Server:**
    This single command serves both the API and the static frontend files.
    ```bash
    NODE_ENV=production node server.js
    ```

**Open your browser to `http://localhost:3001` and log in.**