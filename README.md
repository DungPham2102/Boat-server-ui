# GPS-based Boat Control System

This project contains the main server and web interface for a real-time boat tracking and control system.

## System Architecture

The system operates based on the following model:

1.  **Boat Device**: Equipped with a GPS module and a LoRa transceiver. 
    *   **Upstream:** It continuously broadcasts its GPS coordinates and status (telemetry) via LoRa signals.
    *   **Downstream:** It listens for, receives, and executes control commands sent from the Gateway.

2.  **Raspberry Pi (Gateway)**: A device with a LoRa transceiver running a dedicated script.
    *   **Upstream:** It listens for LoRa signals from the boat and forwards the data by sending an HTTP POST request to the Laptop Server.
    *   **Downstream:** It provides an API endpoint to receive commands from the Laptop Server and transmits them to the boat via LoRa.

3.  **Laptop Server (This Project)**: A Node.js application that:
    *   **Upstream:** Provides an API to receive telemetry data from the Gateway, processes it, and pushes it to the browser via WebSocket.
    *   **Downstream:** Receives control commands from the browser via WebSocket and forwards them to the Gateway by sending an HTTP POST request.
    *   Serves the React-based user interface and handles user authentication.

4.  **Web Browser (Client)**: The React application running in the user's browser.
    *   **Upstream:** Loads the UI, establishes a WebSocket connection, and displays the boat's live position and status.
    *   **Downstream:** Captures user input (e.g., setting a new target, changing mode) and sends these commands to the Laptop Server via WebSocket.

---

# Project Setup and Running Guide

## 1. Initial Setup

### Database
First, set up your MySQL database. Execute the following SQL commands to create the database and the required tables.

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
```

You can add optional sample data for boats:
```sql
INSERT INTO boats (name, boatId) VALUES ('Boat 1', '00001');
INSERT INTO boats (name, boatId) VALUES ('Boat 2', '00002');
```

### Configure Connection
Open `server.js` and update the `mysql.createConnection` details with your database credentials.

### Install Dependencies
In the project root, run:
```bash
npm install
```

### Configure Gateway Connection
To send commands from the UI to the boat, the server needs to know the IP address of the Raspberry Pi Gateway.

-   **File**: `server.js`
-   **Function**: `forwardCommandToGateway`
-   **Variable**: `const gatewayIp`

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

3.  **Register Your First User (Terminal 3, run once):**
    Before you can log in, you must create a user account. Use a tool like `curl` or Postman to send a `POST` request.
    ```bash
    curl -X POST http://localhost:3001/api/register \
    -H "Content-Type: application/json" \
    -d '{"username": "admin", "password": "your_password"}'
    ```

**To use the app, open your browser to `http://localhost:3000` and log in with the credentials you just registered.**

### Production Environment
**Purpose:** For deploying the final, optimized version of the application.

1.  **Build the Frontend Application:**
    This command bundles the React app into static files in a `build` directory. You only need to run this when you have made changes to the frontend code (`src` folder).
    ```bash
    npm run build
    ```

2.  **Register a User (If you haven't already):**
    Follow step 3 from the Development Environment section to create a user account.

3.  **Run the Production Server:**
    This single command starts the server on `http://localhost:3001`, serving both the API and the optimized frontend application.
    ```bash
    NODE_ENV=production node server.js
    ```

**To use the app, open your browser to `http://localhost:3001` and log in.**
