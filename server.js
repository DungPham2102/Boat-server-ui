const express = require("express");
const mysql = require("mysql");
const cors = require("cors");

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
  const { name, ip } = req.body;
  if (!name || !ip) {
    return res.status(400).send("Name and IP are required.");
  }
  db.query("INSERT INTO boats (name, ip) VALUES (?, ?)", [name, ip], (err, results) => {
    if (err) {
      res.status(500).send(err);
      return;
    }
    res.status(201).json({ id: results.insertId, name, ip });
  });
});

// Update an existing boat
app.put("/api/boats/:id", (req, res) => {
  const { id } = req.params;
  const { name, ip } = req.body;
  if (!name || !ip) {
    return res.status(400).send("Name and IP are required.");
  }
  db.query("UPDATE boats SET name = ?, ip = ? WHERE id = ?", [name, ip, id], (err, results) => {
    if (err) {
      res.status(500).send(err);
      return;
    }
    if (results.affectedRows === 0) {
      return res.status(404).send("Boat not found.");
    }
    res.json({ id: parseInt(id), name, ip });
  });
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
