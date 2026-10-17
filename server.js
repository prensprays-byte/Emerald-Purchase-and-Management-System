const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Successfully connected to MySQL database');

  const createAppliancesTable = `
    CREATE TABLE IF NOT EXISTS appliances (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      category VARCHAR(100),
      sub_category VARCHAR(255),
      item_code VARCHAR(100),
      brand VARCHAR(100),
      size VARCHAR(100),
      design VARCHAR(255),
      surface VARCHAR(100),
      texture VARCHAR(100),
      class VARCHAR(50),
      special_specs VARCHAR(255),
      image_url TEXT,
      quantity INT,
      price DECIMAL(10, 2)
    );
  `;

  const createOrdersTable = `
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      appliance_id INT,
      appliance_name VARCHAR(255),
      quantity INT,
      total_price DECIMAL(10, 2),
      status VARCHAR(50) DEFAULT 'Pending',
      created_by VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Incident Reports Table
  const createIncidentTable = `
    CREATE TABLE IF NOT EXISTS incident_reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255),
      description TEXT,
      reported_by VARCHAR(100),
      status VARCHAR(50) DEFAULT 'Open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  connection.query(createAppliancesTable, (err) => {
    if (err) console.error('Error creating appliances table:', err);
    connection.query(createOrdersTable, (orderErr) => {
      if (orderErr) console.error('Error creating orders table:', orderErr);
      connection.query(createIncidentTable, (incErr) => {
        if (incErr) console.error('Error creating incident table:', incErr);
        connection.release();
      });
    });
  });
});

app.get('/api/inventory', (req, res) => {
  const { category, sub_category } = req.query;
  let query = 'SELECT * FROM appliances WHERE 1=1';
  let params = [];

  if (category && category !== 'All') {
    query += ' AND category = ?';
    params.push(category);
  }
  if (sub_category && sub_category !== 'All') {
    query += ' AND sub_category = ?';
    params.push(sub_category);
  }

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/inventory', (req, res) => {
  const { 
    name, category, sub_category, item_code, brand, size, design, surface, texture, class_type, special_specs, image_url, quantity, price 
  } = req.body;

  const query = `
    INSERT INTO appliances 
    (name, category, sub_category, item_code, brand, size, design, surface, texture, class, special_specs, image_url, quantity, price) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [
    name, category || 'Furniture', sub_category || '', item_code || '', brand || '', size || '', design || '', 
    surface || '', texture || '', class_type || '', special_specs || '', image_url || '', quantity, price
  ], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Item added successfully', id: result.insertId });
  });
});

app.put('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  const { 
    name, category, sub_category, item_code, brand, size, design, surface, texture, class_type, special_specs, image_url, quantity, price 
  } = req.body;

  const query = `
    UPDATE appliances SET 
    name=?, category=?, sub_category=?, item_code=?, brand=?, size=?, design=?, surface=?, texture=?, class=?, special_specs=?, image_url=?, quantity=?, price=? 
    WHERE id=?
  `;

  db.query(query, [
    name, category, sub_category, item_code, brand, size, design, surface, texture, class_type, special_specs, image_url, quantity, price, id
  ], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Item updated successfully' });
  });
});

app.delete('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM appliances WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Item deleted successfully' });
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database server error' });
    if (results.length > 0) {
      res.json({ message: 'Login successful', user: results[0] });
    } else {
      res.status(401).json({ error: 'Invalid username or password' });
    }
  });
});

app.post('/api/register', (req, res) => {
  const { username, password, role } = req.body;
  db.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, password, role || 'staff'], (err) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Username already exists' });
      return res.status(500).json({ error: 'Database server error' });
    }
    res.status(201).json({ message: 'User registered successfully' });
  });
});

app.get('/api/orders', (req, res) => {
  db.query('SELECT * FROM orders ORDER BY created_at DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/orders', (req, res) => {
  const { appliance_id, appliance_name, quantity, total_price, created_by } = req.body;
  const query = 'INSERT INTO orders (appliance_id, appliance_name, quantity, total_price, status, created_by) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(query, [appliance_id, appliance_name, quantity, total_price, 'Pending', created_by || 'Admin'], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Purchase request created successfully', orderId: result.insertId });
  });
});

app.put('/api/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  db.query('UPDATE orders SET status = ? WHERE id = ?', [status, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });

    if (status === 'Received by Admin') {
      db.query('SELECT appliance_id, quantity FROM orders WHERE id = ?', [id], (orderErr, orderResults) => {
        if (!orderErr && orderResults.length > 0) {
          const { appliance_id, quantity } = orderResults[0];
          db.query('UPDATE appliances SET quantity = quantity + ? WHERE id = ?', [quantity, appliance_id]);
        }
      });
    }
    res.json({ message: 'Order status updated successfully' });
  });
});

// INCIDENT REPORT ROUTES
app.get('/api/incidents', (req, res) => {
  db.query('SELECT * FROM incident_reports ORDER BY created_at DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/incidents', (req, res) => {
  const { title, description, reported_by } = req.body;
  const query = 'INSERT INTO incident_reports (title, description, reported_by, status) VALUES (?, ?, ?, ?)';
  db.query(query, [title, description, reported_by || 'User', 'Open'], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Incident reported successfully', id: result.insertId });
  });
});

app.put('/api/incidents/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  db.query('UPDATE incident_reports SET status = ? WHERE id = ?', [status, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Incident status updated successfully' });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));