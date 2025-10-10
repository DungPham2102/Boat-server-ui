const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use(express.text()); // Middleware for raw text bodies

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
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: `Boat with ID '${boatId}' already exists.` });
        }
        console.error("Error inserting into database:", err);
        return res.status(500).json({ error: "Internal server error" });
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
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: `Boat with ID '${boatId}' already exists.` });
        }
        console.error("Error updating database:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ error: "Boat not found." });
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

// Serve the React app for production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, 'build')));

  // The "catchall" handler: for any request that doesn't match one above,
  // send back React's index.html file.
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

// --- WebSocket Server Setup ---
const wss = new WebSocket.Server({ port: 8000 });
const clientsByBoatId = new Map();
const allBoatsSubscribers = new Set();

console.log("WebSocket server started on port 8000. Waiting for UI connections...");

wss.on("connection", (ws, req) => {
  const path = req.url;
  const boatId = path.substring(1); // e.g., "/all" -> "all", "/boat1" -> "boat1"

  // This server now only accepts connections from UI clients
  if (boatId === "all") {
    console.log("UI client connected, subscribing to ALL boats.");
    allBoatsSubscribers.add(ws);
    ws.on("close", () => {
      console.log("UI client for ALL boats disconnected.");
      allBoatsSubscribers.delete(ws);
    });
    ws.on("error", (error) => {
      console.error("WebSocket error for 'all' subscriber:", error);
      allBoatsSubscribers.delete(ws);
    });
  } else if (boatId) {
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
    console.log("A client connected with an unspecified path. Closing connection.");
    ws.close();
  }
});

// New API endpoint for receiving telemetry data from Raspberry Pi
app.post("/api/telemetry", (req, res) => {
  // The request body is expected to be the raw string from LoRa.
  // We need to enable a raw text body parser for this.
  const messageString = req.body;
  
  if (typeof messageString !== 'string') {
      console.log(`Received non-string data: ${JSON.stringify(req.body)}`);
      return res.status(400).send("Invalid data format. Expected a raw text string.");
  }

  // Expected format: "boat_id,lat,lon,..."
  const parts = messageString.split(',');
  if (parts.length < 2) {
    console.log(`Invalid data format from source: ${messageString}. Skipping.`);
    return res.status(400).send("Invalid data format.");
  }
  const receivedBoatId = parts[0];

  // Check if the boatId exists in the database
  db.query(`SELECT * FROM boats WHERE boatId = ?`, [receivedBoatId], (err, results) => {
    if (err) {
      console.error('Error querying database:', err);
      return res.status(500).send("Database error.");
    }

    if (results.length > 0) {
      // Get clients subscribed to this specific boat
      const specificSubscribers = clientsByBoatId.get(receivedBoatId) || new Set();
      // Combine specific subscribers and 'all' subscribers
      const allReceivers = new Set([...specificSubscribers, ...allBoatsSubscribers]);

      if (allReceivers.size > 0) {
        allReceivers.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(messageString);
          }
        });
      }
      res.status(200).send("Data received and broadcasted.");
    } else {
      // console.log(`Ignoring data for unregistered boatId: ${receivedBoatId}`);
      res.status(404).send("Boat ID not registered.");
    }
  });
});

const server = app.listen(port, () => {
  console.log(`HTTP server listening at http://localhost:${port}`);
});
