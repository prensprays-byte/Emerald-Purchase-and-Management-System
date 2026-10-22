const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Emerald System API is running successfully!');
});

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  ssl: false
});

db.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Successfully connected to MySQL database');



  connection.query(createUsersTable, (userErr) => {
    if (userErr) console.error('Error creating users table:', userErr);
    connection.query(createAppliancesTable, (err) => {
      if (err) console.error('Error creating appliances table:', err);
      connection.query(createOrdersTable, (orderErr) => {
        if (orderErr) console.error('Error creating orders table:', orderErr);
        connection.query(createPurchasesTable, (purchErr) => {
          if (purchErr) console.error('Error creating purchases table:', purchErr);
          connection.query(createIncidentTable, (incErr) => {
            if (incErr) console.error('Error creating incident table:', incErr);
            connection.release();
          });
        });
      });
    });
  });
});

app.get('/api/inventory', (req, res) => {
  const { category } = req.query;
  let query = 'SELECT * FROM appliances WHERE 1=1';
  let params = [];

  if (category && category !== 'All') {
    query += ' AND category = ?';
    params.push(category);
  }

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/inventory', (req, res) => {
  const { 
    name, category, item_code, brand, size, design, surface, texture, class_type, class: classVal, special_specs, quantity, price 
  } = req.body;

  const resolvedClass = class_type || classVal || '';

  const query = `
    INSERT INTO appliances 
    (name, category, item_code, brand, size, design, surface, texture, class, special_specs, quantity, price) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [
    name, category || 'Furniture', item_code || '', brand || '', size || '', design || '', 
    surface || '', texture || '', resolvedClass, special_specs || '', quantity, price
  ], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Item added successfully', id: result.insertId });
  });
});

app.put('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  const { 
    name, category, item_code, brand, size, design, surface, texture, class_type, class: classVal, special_specs, quantity, price 
  } = req.body;

  const resolvedClass = class_type || classVal || '';

  const query = `
    UPDATE appliances SET 
    name=?, category=?, item_code=?, brand=?, size=?, design=?, surface=?, texture=?, class=?, special_specs=?, quantity=?, price=? 
    WHERE id=?
  `;

  db.query(query, [
    name, category, item_code, brand, size, design, surface, texture, resolvedClass, special_specs, quantity, price, id
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

app.get('/api/purchases', (req, res) => {
  db.query('SELECT * FROM purchases ORDER BY created_at DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/purchase', (req, res) => {
  const { appliance_id, quantity, created_by } = req.body;

  db.query('SELECT * FROM appliances WHERE id = ?', [appliance_id], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ error: 'Product not found' });
    
    const product = results[0];
    if (product.quantity < quantity) {
      return res.status(400).json({ error: 'Not enough stock available!' });
    }

    const updatedQuantity = product.quantity - Number(quantity);
    const totalPrice = quantity * product.price;

    db.query('UPDATE appliances SET quantity = ? WHERE id = ?', [updatedQuantity, appliance_id], (updateErr) => {
      if (updateErr) return res.status(500).json({ error: updateErr.message });

      const purchaseQuery = 'INSERT INTO purchases (appliance_id, appliance_name, quantity, total_price, purchased_by) VALUES (?, ?, ?, ?, ?)';
      db.query(purchaseQuery, [appliance_id, product.name, quantity, totalPrice, created_by || 'Staff'], (purchErr) => {
        if (purchErr) return res.status(500).json({ error: purchErr.message });
        res.json({ message: 'Purchase successful, recorded to purchases table', newStock: updatedQuantity });
      });
    });
  });
});

// ALWAYS EXPLICITLY SET 'Pending Restock'
app.post('/api/orders', (req, res) => {
  const { appliance_id, appliance_name, quantity, total_price, created_by } = req.body;
  const query = 'INSERT INTO orders (appliance_id, appliance_name, quantity, total_price, status, created_by) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(query, [appliance_id, appliance_name, quantity, total_price, 'Pending Restock', created_by || 'Admin'], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Restock request sent to warehouse successfully', orderId: result.insertId });
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