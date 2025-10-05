# Project Setup Guide

## 1. Database Setup

First, set up your MySQL database.

### Create Database and Table
Execute the following SQL commands:
```sql
CREATE DATABASE boat_db;

USE boat_db;

CREATE TABLE boats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    ip VARCHAR(255) NOT NULL
);
```

### Add Sample Data (Optional)
```sql
INSERT INTO boats (name, ip) VALUES ('Boat 1', '192.168.1.1');
INSERT INTO boats (name, ip) VALUES ('Boat 2', '192.168.1.2');
```

### Configure Connection
Open `server.js` and update the `mysql.createConnection` details with your database credentials.

## 2. Run the Backend Server

In a terminal, start the backend server:
```bash
node server.js
```

## 3. Run the Frontend Application

In a separate terminal, install dependencies and start the frontend:
```bash
npm install
npm start
```

The application will be available at `http://localhost:3000`.
