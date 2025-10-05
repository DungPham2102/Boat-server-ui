const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const WebSocket = require("ws");

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: "localhost",
  user: "admin",
  password: "admin", // Replace with your MySQL password
  database: "boat_db", // Replace with your database name
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    return;
  }
  console.log("Connected to MySQL database");
});

app.get("/api/boats", (req, res) => {
  db.query("SELECT * FROM boats", (err, results) => {
    if (err) {
      res.status(500).send(err);
      return;
    }
    res.json(results);
  });
});

// Add a new boat
app.post("/api/boats", (req, res) => {
  const { name, boatId } = req.body;
  if (!name || !boatId) {
    return res.status(400).send("Name and Boat ID are required.");
  }
  db.query(
    "INSERT INTO boats (name, boatId) VALUES (?, ?)",
    [name, boatId],
    (err, results) => {
      if (err) {
        res.status(500).send(err);
        return;
      }
      res.status(201).json({ id: results.insertId, name, boatId });
    }
  );
});

// Update an existing boat
app.put("/api/boats/:id", (req, res) => {
  const { id } = req.params;
  const { name, boatId } = req.body;
  if (!name || !boatId) {
    return res.status(400).send("Name and Boat ID are required.");
  }
  db.query(
    "UPDATE boats SET name = ?, boatId = ? WHERE id = ?",
    [name, boatId, id],
    (err, results) => {
      if (err) {
        res.status(500).send(err);
        return;
      }
      if (results.affectedRows === 0) {
        return res.status(404).send("Boat not found.");
      }
      res.json({ id: parseInt(id), name, boatId });
    }
  );
});

// Delete a boat
app.delete("/api/boats/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM boats WHERE id = ?", [id], (err, results) => {
    if (err) {
      res.status(500).send(err);
      return;
    }
    if (results.affectedRows === 0) {
      return res.status(404).send("Boat not found.");
    }
    res.status(204).send(); // No Content
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

// WebSocket server for telemetry data
const wss = new WebSocket.Server({ port: 8000 });

const boatConnections = new Map();

wss.on("connection", (ws, req) => {
  const boatId = req.url.substring(1); // Get boatId from URL, e.g., /boat123

  if (!boatId) {
    console.log("Connection attempt without boatId. Closing.");
    ws.close();
    return;
  }

  console.log(`Client connected for boat: ${boatId}`);
  boatConnections.set(boatId, ws);

  ws.on("message", (message) => {
    console.log(`Received from ${boatId}: ${message}`);
    // Here you can process messages sent from the UI to the boat
  });

  ws.on("close", () => {
    console.log(`Client disconnected for boat: ${boatId}`);
    boatConnections.delete(boatId);
  });

  ws.on("error", (error) => {
    console.error(`WebSocket error for boat ${boatId}:`, error);
  });
});

// This is a placeholder for your LoRa data reception logic.
// You would replace this with your actual serial port or other LoRa data source.
function simulateLoRaData() {
  setInterval(() => {
    // Example: "boat123,21.038,105.782,15,90,1500,1500,0.5"
    const boatId = `boat${Math.floor(Math.random() * 3) + 1}`;
    const lat = 21.038 + (Math.random() - 0.5) * 0.01;
    const lon = 105.782 + (Math.random() - 0.5) * 0.01;
    const data = `${lat.toFixed(6)},${lon.toFixed(6)},${(Math.random() * 360).toFixed(0)},90,1500,1500,0.5`;

    const ws = boatConnections.get(boatId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
      console.log(`Sent data to boat ${boatId}: ${data}`);
    } else {
      console.log(`No active WebSocket connection for boat ${boatId}`);
    }
  }, 2000); // Send data every 2 seconds
}

simulateLoRaData(); // Start the simulation
