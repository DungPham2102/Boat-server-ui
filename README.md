# Project Setup and Running Guide

## 1. Initial Setup

### Database
First, set up your MySQL database. Execute the following SQL commands:

```sql
CREATE DATABASE boat_db;

USE boat_db;

CREATE TABLE boats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    boatId VARCHAR(255) NOT NULL UNIQUE
);
```

You can add optional sample data:
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

---

## 2. Running the Application

You can run this application in two modes: Development or Production.

### Development Environment
**Purpose:** For coding, testing new features, and debugging. Requires **2 separate terminals**.

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

**To use the app, open your browser to `http://localhost:3000`.**

### Production Environment
**Purpose:** For deploying the final, optimized version of the application.

1.  **Build the Frontend Application:**
    This command bundles the React app into static files in a `build` directory. You only need to run this when you have made changes to the frontend code (`src` folder).
    ```bash
    npm run build
    ```

2.  **Run the Production Server:**
    This single command starts the server on `http://localhost:3001`, serving both the API and the optimized frontend application.
    ```bash
    NODE_ENV=production node server.js
    ```

**To use the app, open your browser to `http://localhost:3001`.**