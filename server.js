require("dotenv").config();

const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const WebSocket = require("ws");
const http = require("http");
const path = require("path");
const url = require("url");

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use(express.text()); // Middleware for raw text bodies

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    return;
  }
  console.log("Connected to MySQL database");
});

// --- Authentication ---
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const JWT_SECRET = process.env.JWT_SECRET;
const saltRounds = 10; // for bcrypt

// --- Authentication Endpoints ---

// Register Endpoint
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send("Username and password are required.");
  }

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const query = "INSERT INTO users (username, password) VALUES (?, ?)";
    
    db.query(query, [username, hashedPassword], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).send("Username already exists.");
        }
        console.error("Error registering user:", err);
        return res.status(500).send("Error registering user.");
      }
      res.status(201).send("User registered successfully.");
    });
  } catch (error) {
    console.error("Error hashing password:", error);
    res.status(500).send("Internal server error.");
  }
});

// Login Endpoint
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send("Username and password are required.");
  }

  const query = "SELECT * FROM users WHERE username = ?";
  db.query(query, [username], async (err, results) => {
    if (err) {
      console.error("Error during login:", err);
      return res.status(500).send("Internal server error.");
    }

    if (results.length === 0) {
      return res.status(401).send("Username or password incorrect.");
    }

    const user = results[0];

    try {
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        const accessToken = jwt.sign({ username: user.username, id: user.id }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ accessToken });
      } else {
        res.status(401).send("Username or password incorrect.");
      }
    } catch (error) {
      console.error("Error comparing password:", error);
      res.status(500).send("Internal server error.");
    }
  });
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (token == null) {
    return res.status(401).send("A token is required for authentication");
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).send("Token is not valid");
    }
    req.user = user;
    next();
  });
};
// --- End Authentication ---

app.get("/api/boats", authenticateToken, (req, res) => {
  db.query("SELECT * FROM boats", (err, results) => {
    if (err) {
      res.status(500).send(err);
      return;
    }
    res.json(results);
  });
});

// Add a new boat
app.post("/api/boats", authenticateToken, (req, res) => {
  const { name, boatId } = req.body;
  if (!name || !boatId) {
    return res.status(400).send("Name and Boat ID are required.");
  }
  db.query(
    "INSERT INTO boats (name, boatId) VALUES (?, ?)",
    [name, boatId],
    (err, results) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res
            .status(409)
            .json({ error: `Boat with ID '${boatId}' already exists.` });
        }
        console.error("Error inserting into database:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      res.status(201).json({ id: results.insertId, name, boatId });
    }
  );
});

// Update an existing boat
app.put("/api/boats/:id", authenticateToken, (req, res) => {
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
        if (err.code === "ER_DUP_ENTRY") {
          return res
            .status(409)
            .json({ error: `Boat with ID '${boatId}' already exists.` });
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
app.delete("/api/boats/:id", authenticateToken, (req, res) => {
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
if (process.env.NODE_ENV === "production") {
  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, "build")));

  // The "catchall" handler: for any request that doesn't match one above,
  // send back React's index.html file.
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, "build", "index.html"));
  });
}

// --- WebSocket Server Setup ---
const wss = new WebSocket.Server({ port: 8000 });
const clientsByBoatId = new Map();
const allBoatsSubscribers = new Set();

console.log(
  "WebSocket server started on port 8000. Waiting for UI connections..."
);

// This function forwards a command to the Raspberry Pi Gateway
function forwardCommandToGateway(boatId, commandData) {
  // IMPORTANT: Replace 'RASPBERRY_PI_IP' with the actual IP of your Gateway.
  // It is recommended to store this IP in the 'boats' table in your database.
  const gatewayIp = "localhost"; // <--- THAY THẾ IP NÀY
  const gatewayPort = 5000; // Port for the Python server on the Gateway

  // The commandData is the raw string we want to send
  const postData = commandData;

  const options = {
    hostname: gatewayIp,
    port: gatewayPort,
    path: "/command",
    method: "POST",
    headers: {
      "Content-Type": "text/plain", // Set content type to plain text
      "Content-Length": Buffer.byteLength(postData),
    },
  };

  const req = http.request(options, (res) => {
    console.log(`GATEWAY RESPONSE STATUS: ${res.statusCode}`);
    res.setEncoding("utf8");
    res.on("data", (chunk) => {
      console.log(`GATEWAY RESPONSE BODY: ${chunk}`);
    });
  });

  req.on("error", (e) => {
    console.error(`Error sending command to gateway: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

wss.on("connection", (ws, req) => {
  // Parse URL to get token and path
  const parsedUrl = url.parse(req.url, true);
  const token = parsedUrl.query.token;
  const pathname = parsedUrl.pathname;

  // --- WebSocket Authentication ---
  if (!token) {
    console.log("WebSocket connection rejected: No token provided.");
    ws.close(1008, "Token required");
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log("WebSocket connection rejected: Invalid token.");
      ws.close(1008, "Invalid token");
      return;
    }

    // Attach user info to the WebSocket object for later use
    ws.user = user;
    console.log(`WebSocket connection authenticated for user: ${user.username}`);

    // --- Original connection logic starts here ---
    const boatIdFromPath = pathname.substring(1);

    // Handle incoming commands from the UI
    ws.on("message", (message) => {
      try {
        const messageString = message.toString();

        // Expected format from UI: "boatId,mode,speed,targetLat,targetLon,kp,ki,kd"
        const parts = messageString.split(",");
        if (parts.length < 8) {
          console.error("Invalid command format from UI:", messageString);
          return;
        }

        // --- BEGIN: LOG COMMAND DATA ---
        const logQuery = `INSERT INTO command_logs (boat_id, user_id, mode, speed, target_lat, target_lon, kp, ki, kd) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const logValues = [
          parts[0],           // boat_id
          ws.user.id,         // user_id (from the authenticated ws connection)
          parseInt(parts[1]), // mode
          parseInt(parts[2]), // speed
          parseFloat(parts[3]),// target_lat
          parseFloat(parts[4]),// target_lon
          parseFloat(parts[5]),// kp
          parseFloat(parts[6]),// ki
          parseFloat(parts[7]),// kd
        ];

        db.query(logQuery, logValues, (logErr, logResult) => {
          if (logErr) {
            console.error("Error saving command log:", logErr);
            // For now, we'll allow the command to be sent even if logging fails.
          } else {
            console.log(`Command from user ${ws.user.username} logged for boat ${parts[0]}.`);
          }
        });
        // --- END: LOG COMMAND DATA ---

        const boatId = parts[0];

        // Forward the entire original message string to the gateway
        forwardCommandToGateway(boatId, messageString);
        console.log(`Command from ${ws.user.username} sent to gateway for boat ${boatId}`);

      } catch (e) {
        console.error("Failed to process message from UI:", e);
      }
    });

    // Handle subscriptions for real-time data
    if (boatIdFromPath === "all") {
      console.log(`UI client (${ws.user.username}) connected, subscribing to ALL boats.`);
      allBoatsSubscribers.add(ws);
      ws.on("close", () => {
        console.log(`UI client (${ws.user.username}) for ALL boats disconnected.`);
        allBoatsSubscribers.delete(ws);
      });
      ws.on("error", (error) => {
        console.error(`WebSocket error for 'all' subscriber (${ws.user.username}):`, error);
        allBoatsSubscribers.delete(ws);
      });
    } else if (boatIdFromPath) {
      console.log(`UI client (${ws.user.username}) connected, subscribing to boat: ${boatIdFromPath}`);
      if (!clientsByBoatId.has(boatIdFromPath)) {
        clientsByBoatId.set(boatIdFromPath, new Set());
      }
      clientsByBoatId.get(boatIdFromPath).add(ws);
      ws.on("close", () => {
        console.log(`UI client (${ws.user.username}) for boat ${boatIdFromPath} disconnected`);
        clientsByBoatId.get(boatIdFromPath).delete(ws);
      });
      ws.on("error", (error) => {
        console.error(
          `WebSocket error for UI client (${ws.user.username}), boat ${boatIdFromPath}:`,
          error
        );
        clientsByBoatId.get(boatIdFromPath).delete(ws);
      });
    } else {
      console.log(
        "A client connected with an unspecified path. Closing connection."
      );
      ws.close();
    }
  });
});

// New API endpoint for receiving telemetry data from Raspberry Pi
app.post("/api/telemetry", (req, res) => {
  // The request body is expected to be the raw string from LoRa.
  // We need to enable a raw text body parser for this.
  const messageString = req.body;

  if (typeof messageString !== "string") {
    console.log(`Received non-string data: ${JSON.stringify(req.body)}`);
    return res
      .status(400)
      .send("Invalid data format. Expected a raw text string.");
  }

  // Data format from App.js: BOAT_ID,lat,lon,current_head,target_head,left_speed,right_speed,pid
  const parts = messageString.split(",");
  if (parts.length < 8) {
    console.log(`Invalid data format from source: ${messageString}. Skipping.`);
    return res.status(400).send("Invalid data format.");
  }
  const receivedBoatId = parts[0];

  // Check if the boatId exists in the database
  db.query(
    `SELECT * FROM boats WHERE boatId = ?`,
    [receivedBoatId],
    (err, results) => {
      if (err) {
        console.error("Error querying database:", err);
        return res.status(500).send("Database error.");
      }

      if (results.length > 0) {
        // --- BEGIN: LOG TELEMETRY DATA ---
        const logQuery = `INSERT INTO telemetry_logs (boat_id, latitude, longitude, current_head, target_head, left_speed, right_speed, pid_output) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        const logValues = [
          receivedBoatId,       // boat_id
          parseFloat(parts[1]), // latitude
          parseFloat(parts[2]), // longitude
          parseFloat(parts[3]), // current_head
          parseFloat(parts[4]), // target_head
          parseInt(parts[5]),   // left_speed
          parseInt(parts[6]),   // right_speed
          parseFloat(parts[7]), // pid_output
        ];

        db.query(logQuery, logValues, (logErr, logResult) => {
          if (logErr) {
            // Log the error but don't stop the data flow
            console.error("Error saving telemetry log:", logErr);
          }
        });
        // --- END: LOG TELEMETRY DATA ---

        // Get clients subscribed to this specific boat
        const specificSubscribers =
          clientsByBoatId.get(receivedBoatId) || new Set();
        // Combine specific subscribers and 'all' subscribers
        const allReceivers = new Set([
          ...specificSubscribers,
          ...allBoatsSubscribers,
        ]);

        if (allReceivers.size > 0) {
          allReceivers.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(messageString);
            }
          });
        }
        res.status(200).send("Data received, logged, and broadcasted.");
      } else {
        // console.log(`Ignoring data for unregistered boatId: ${receivedBoatId}`);
        res.status(404).send("Boat ID not registered.");
      }
    }
  );
});

const server = app.listen(port, () => {
  console.log(`HTTP server listening at http://localhost:${port}`);
});