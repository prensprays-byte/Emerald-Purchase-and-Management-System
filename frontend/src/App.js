import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('emerald_logged_in') === 'true';
  });

  // Store active user role ('admin' or 'staff')
  const [userRole, setUserRole] = useState(() => {
    return localStorage.getItem('emerald_user_role') || '';
  });

  const [isRegistering, setIsRegistering] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [appliances, setAppliances] = useState([]);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', category: '', quantity: '', price: '' });

  useEffect(() => {
    if (isLoggedIn) {
      fetchAppliances();
    }
  }, [isLoggedIn]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        username: loginUsername,
        password: loginPassword,
      });
      if (response.data.message === 'Login successful') {
        const user = response.data.user;
        setIsLoggedIn(true);
        setUserRole(user.role);
        
        // Reset any leftover editing state when logging in
        setEditingId(null);
        setEditFormData({ name: '', category: '', quantity: '', price: '' });

        // Save session and role to localStorage
        localStorage.setItem('emerald_logged_in', 'true');
        localStorage.setItem('emerald_user_role', user.role);
        setLoginError('');
      }
    } catch (error) {
      setLoginError(error.response?.data?.error || 'Invalid credentials');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/register', {
        username: loginUsername,
        password: loginPassword,
      });
      if (response.status === 201) {
        setSuccessMessage('Registration successful! Please log in.');
        setLoginError('');
        setIsRegistering(false);
        setLoginPassword('');
      }
    } catch (error) {
      setLoginError(error.response?.data?.error || 'Registration failed');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole('');
    
    // Clear editing state on logout so next user starts fresh
    setEditingId(null);
    setEditFormData({ name: '', category: '', quantity: '', price: '' });

    localStorage.removeItem('emerald_logged_in');
    localStorage.removeItem('emerald_user_role');
    setLoginUsername('');
    setLoginPassword('');
  };

  const fetchAppliances = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/inventory');
      setAppliances(response.data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const handleAddAppliance = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/inventory', {
        name,
        category,
        quantity: Number(quantity),
        price: Number(price),
      });
      setName('');
      setCategory('');
      setQuantity('');
      setPrice('');
      fetchAppliances();
    } catch (error) {
      console.error('Error adding appliance:', error);
      alert('Failed to add item. Ensure database table exists.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this appliance?')) {
      try {
        await axios.delete(`http://localhost:5000/api/inventory/${id}`);
        fetchAppliances();
      } catch (error) {
        console.error('Error deleting appliance:', error);
      }
    }
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setEditFormData({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      price: item.price
    });
  };

  const handleSaveEdit = async (id) => {
    try {
      await axios.put(`http://localhost:5000/api/inventory/${id}`, {
        name: editFormData.name,
        category: editFormData.category,
        quantity: Number(editFormData.quantity),
        price: Number(editFormData.price)
      });
      setEditingId(null);
      fetchAppliances();
    } catch (error) {
      console.error('Error updating appliance:', error);
    }
  };

  const filteredAppliances = appliances.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  // AUTH SCREEN (LOGIN / REGISTER)
  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <form onSubmit={isRegistering ? handleRegister : handleLogin} className="login-card">
          <h2>Emerald Mini Depot</h2>
          <p>{isRegistering ? 'Create a new account' : 'Please log in to access the Inventory System'}</p>
          
          {loginError && <div className="error-message">{loginError}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="Enter username"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-login">
            {isRegistering ? 'Register' : 'Log In'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '15px' }}>
            <button
              type="button"
              className="toggle-link-btn"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setLoginError('');
                setSuccessMessage('');
              }}
            >
              {isRegistering ? 'Already have an account? Log in' : "Don't have an account? Register"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // MAIN INVENTORY DASHBOARD
  return (
    <div className="inventory-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Emerald Inventory Tracking System</h1>
          <p>Manage and track your appliances and hardware easily.</p>
          <small style={{ color: '#81c784' }}>Logged in as: <strong>{userRole.toUpperCase()}</strong></small>
        </div>
        <button onClick={handleLogout} className="btn-logout">Logout</button>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '20px', marginTop: '15px' }}>
        <input
          type="text"
          className="search-input"
          placeholder="Search appliances or categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Add Appliance Form */}
      <form onSubmit={handleAddAppliance} className="form-card">
        <h3>Add New Appliance</h3>
        <div className="form-inputs">
          <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input type="text" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} required />
          <input type="number" placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          <input type="number" step="0.01" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} required />
          <button type="submit" className="btn-add">Add Item</button>
        </div>
      </form>

      {/* Appliance Table */}
      <h3>Appliance List</h3>
      <table className="inventory-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Category</th>
            <th>Quantity</th>
            <th>Price</th>
            {/* Show Actions column header ONLY for Admins */}
            {userRole === 'admin' && <th style={{ textAlign: 'center' }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {filteredAppliances.length > 0 ? (
            filteredAppliances.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>

                {/* Render inline inputs ONLY if editingId matches AND user is an Admin */}
                {editingId === item.id && userRole === 'admin' ? (
                  <>
                    <td><input type="text" className="table-edit-input" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} /></td>
                    <td><input type="text" className="table-edit-input" value={editFormData.category} onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })} /></td>
                    <td><input type="number" className="table-edit-input" value={editFormData.quantity} onChange={(e) => setEditFormData({ ...editFormData, quantity: e.target.value })} /></td>
                    <td><input type="number" step="0.01" className="table-edit-input" value={editFormData.price} onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })} /></td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="action-buttons">
                        <button className="btn-save" onClick={() => handleSaveEdit(item.id)}>Save</button>
                        <button className="btn-cancel" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{item.name}</td>
                    <td>{item.category}</td>
                    <td>{item.quantity}</td>
                    <td>₱{Number(item.price).toFixed(2)}</td>
                    {/* Render Edit and Delete buttons ONLY for Admins */}
                    {userRole === 'admin' && (
                      <td style={{ textAlign: 'center' }}>
                        <div className="action-buttons">
                          <button className="btn-edit" onClick={() => handleEditClick(item)}>Edit</button>
                          <button className="btn-delete" onClick={() => handleDelete(item.id)}>Delete</button>
                        </div>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={userRole === 'admin' ? "6" : "5"} style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                No appliances found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;