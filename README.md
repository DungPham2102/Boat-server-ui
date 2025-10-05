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
    boatId VARCHAR(255) NOT NULL UNIQUE
);
```

### Add Sample Data (Optional)

```sql
INSERT INTO boats (name, boatId) VALUES ('Boat 1', '00001');
INSERT INTO boats (name, boatId) VALUES ('Boat 2', '00002');
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
