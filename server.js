const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Allows parsing of JSON request bodies

// Create the MySQL database connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Test the database connection
db.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to the MySQL database:', err);
    return;
  }
  console.log('Successfully connected to the MySQL database (emerald_db)');
  connection.release();
});

// ==========================================
// API ROUTES FOR INVENTORY
// ==========================================

// 1. Get all inventory items (Read)
app.get('/api/inventory', (req, res) => {
  const query = 'SELECT * FROM appliances';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching inventory:', err);
      return res.status(500).json({ error: 'Database server error' });
    }
    res.json(results);
  });
});

// 2. Search for an appliance by name or keyword
app.get('/api/inventory/search', (req, res) => {
  const searchTerm = req.query.q || '';
  const query = 'SELECT * FROM appliances WHERE name LIKE ? OR category LIKE ?';
  db.query(query, [`%${searchTerm}%`, `%${searchTerm}%`], (err, results) => {
    if (err) {
      console.error('Error searching inventory:', err);
      return res.status(500).json({ error: 'Database server error' });
    }
    res.json(results);
  });
});

// Add Item (Supports image_url)
app.post('/api/inventory', (req, res) => {
  const { name, category, image_url, quantity, price } = req.body;
  const query = 'INSERT INTO appliances (name, category, image_url, quantity, price) VALUES (?, ?, ?, ?, ?)';
  db.query(query, [name, category, image_url || '', quantity, price], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Item added successfully', id: result.insertId });
  });
});

// Login Route
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const query = 'SELECT * FROM users WHERE username = ? AND password = ?';

  db.query(query, [username, password], (err, results) => {
    if (err) {
      console.error('Error logging in:', err);
      return res.status(500).json({ error: 'Database server error' });
    }

    if (results.length > 0) {
      res.json({ message: 'Login successful', user: results[0] });
    } else {
      res.status(401).json({ error: 'Invalid username or password' });
    }
  });
});

// Register Route
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  const query = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)';

  db.query(query, [username, password, 'admin'], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Username already exists' });
      }
      console.error('Error registering user:', err);
      return res.status(500).json({ error: 'Database server error' });
    }
    res.status(201).json({ message: 'User registered successfully' });
  });
});

// Update Item / Stock / Purchase
app.put('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  const { name, category, image_url, quantity, price } = req.body;
  const query = 'UPDATE appliances SET name=?, category=?, image_url=?, quantity=?, price=? WHERE id=?';
  db.query(query, [name, category, image_url, quantity, price, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Item updated successfully' });
  });
});

// Delete an appliance record
app.delete('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM appliances WHERE id = ?';

  db.query(query, [id], (err, result) => {
    if (err) {
      console.error('Error deleting appliance:', err);
      return res.status(500).json({ error: 'Database server error' });
    }
    res.json({ message: 'Appliance deleted successfully' });
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});