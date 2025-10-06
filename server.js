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

// --- New WebSocket Logic ---
// Key: boatId (string), Value: Set of WebSocket clients (UIs)
const clientsByBoatId = new Map();

console.log("WebSocket server started on port 8000. Waiting for connections...");

wss.on("connection", (ws, req) => {
  const path = req.url;
  const boatId = path.substring(1);

  // If the URL has a boatId, it's a UI client subscribing for data.
  if (boatId) {
    console.log(`UI client connected, subscribing to boat: ${boatId}`);
    if (!clientsByBoatId.has(boatId)) {
      clientsByBoatId.set(boatId, new Set());
    }
    clientsByBoatId.get(boatId).add(ws);

    ws.on("close", () => {
      console.log(`UI client for boat ${boatId} disconnected`);
      clientsByBoatId.get(boatId).delete(ws);
    });

    ws.on("error", (error) => {
      console.error(`WebSocket error for UI client (boat ${boatId}):`, error);
      clientsByBoatId.get(boatId).delete(ws);
    });

  } else {
    // If the URL is empty, it's a data source (our Python script).
    console.log("Data source connected.");

    ws.on('message', (message) => {
        const messageString = message.toString();
        
        // Data format from Python script: "boat_id,lat,lon,..."
        const parts = messageString.split(',');
        if (parts.length < 2) {
            console.log(`Invalid data format from source: ${messageString}. Skipping.`);
            return;
        }
        const receivedBoatId = parts[0];

        // Find all UI clients subscribed to this boatId
        const subscribers = clientsByBoatId.get(receivedBoatId);
        if (subscribers && subscribers.size > 0) {
            console.log(`Broadcasting data for boat ${receivedBoatId} to ${subscribers.size} subscribers.`);
            subscribers.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    // The UI expects the full data string
                    client.send(messageString);
                }
            });
        } else {
            // This is normal if no UI is currently watching this boat
            // console.log(`No subscribers found for boat ${receivedBoatId}.`);
        }
    });

    ws.on('close', () => {
        console.log('Data source disconnected.');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error for data source:', error);
    });
  }
});

// The old simulation logic is now replaced by the Python script.
// function simulateLoRaData() { ... }
// simulateLoRaData();
