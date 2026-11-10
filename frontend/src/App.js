import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => sessionStorage.getItem('emerald_logged_in') === 'true');
  const [userRole, setUserRole] = useState(() => sessionStorage.getItem('emerald_user_role') || '');
  const [username, setUsername] = useState(() => sessionStorage.getItem('emerald_username') || '');
  const [activeTab, setActiveTab] = useState('home');

  const [notiFilter, setNotiFilter] = useState('all');

  const [isRegistering, setIsRegistering] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [appliances, setAppliances] = useState([]);
  const [orders, setOrders] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [search, setSearch] = useState('');

  const [selectedMainCategory, setSelectedMainCategory] = useState('All');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  
  const [incidentForm, setIncidentForm] = useState({ category: 'Furniture', product_name: '', description: '' });

  const categoriesList = ['Furniture', 'Storage and Organizer', 'Appliance'];

  const [productForm, setProductForm] = useState({
    name: '',
    category: 'Furniture',
    item_code: '',
    brand: '',
    size_value: '',
    size_unit: 'cm',
    quantity: '',
    price: ''
  });

  const [selectedItem, setSelectedItem] = useState(null);
  const [purchaseQty, setPurchaseQty] = useState(1);
  const [editFormData, setEditFormData] = useState({});
  const [editSizeValue, setEditSizeValue] = useState('');
  const [editSizeUnit, setEditSizeUnit] = useState('cm');

  const fetchAppliances = useCallback(async () => {
    try {
      let url = 'http://localhost:5000/api/inventory';
      const params = new URLSearchParams();

      if (selectedMainCategory !== 'All') params.append('category', selectedMainCategory);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await axios.get(url);
      setAppliances(response.data.map(item => ({ ...item, max_stock: item.max_stock || 100 })));
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  }, [selectedMainCategory]);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  }, []);

  const fetchPurchases = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/purchases');
      setPurchases(response.data);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    }
  }, []);

  const fetchIncidents = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/incidents');
      setIncidents(response.data);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/users');
      setSystemUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchAppliances();
      fetchOrders();
      fetchPurchases();
      fetchIncidents();
      if (userRole === 'admin') {
        fetchUsers();
      }
    }
  }, [isLoggedIn, userRole, fetchAppliances, fetchOrders, fetchPurchases, fetchIncidents, fetchUsers]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/login', { username: loginUsername, password: loginPassword });
      if (response.data.message === 'Login successful') {
        const user = response.data.user;
        setIsLoggedIn(true);
        setUserRole(user.role);
        setUsername(user.username);
        
        sessionStorage.setItem('emerald_logged_in', 'true');
        sessionStorage.setItem('emerald_user_role', user.role);
        sessionStorage.setItem('emerald_username', user.username);

        setLoginUsername('');
        setLoginPassword('');
        setLoginError('');
      }
    } catch (error) {
      setLoginError(error.response?.data?.error || 'Invalid credentials');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/register', { username: loginUsername, password: loginPassword });
      setSuccessMessage('Registration successful! You can now log in.');
      setIsRegistering(false);
      setLoginPassword('');
      setLoginUsername('');
    } catch (error) {
      setLoginError(error.response?.data?.error || 'Registration failed');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole('');
    setUsername('');
    setSelectedItem(null);
    sessionStorage.clear();
  };

  const openAddModal = () => {
    const activeCat = selectedMainCategory !== 'All' ? selectedMainCategory : 'Furniture';
    setProductForm({
      name: '',
      category: activeCat,
      item_code: '',
      brand: '',
      size_value: '',
      size_unit: 'cm',
      quantity: '',
      price: ''
    });
    setShowAddModal(true);
  };

  const handleAddAppliance = async (e) => {
    e.preventDefault();
    const formattedSize = productForm.size_value ? `${productForm.size_value} ${productForm.size_unit}` : '';
    try {
      await axios.post('http://localhost:5000/api/inventory', {
        name: productForm.name,
        category: productForm.category,
        item_code: productForm.item_code,
        brand: productForm.brand,
        size: formattedSize,
        quantity: Number(productForm.quantity),
        price: Number(productForm.price)
      });
      setShowAddModal(false);
      fetchAppliances();
      alert('Product added successfully!');
    } catch (error) {
      console.error('Error adding product:', error);
      alert(error.response?.data?.error || 'Failed to add item.');
    }
  };

  const handleAddIncident = async (e) => {
    e.preventDefault();
    if (!incidentForm.product_name) {
      alert('Please select a product to report!');
      return;
    }
    try {
      await axios.post('http://localhost:5000/api/incidents', {
        title: incidentForm.product_name,
        description: incidentForm.description,
        reported_by: username || 'User'
      });
      setShowIncidentModal(false);
      setIncidentForm({ category: 'Furniture', product_name: '', description: '' });
      fetchIncidents();
      alert('Incident report submitted to warehouse successfully!');
    } catch (error) {
      console.error('Error submitting incident:', error);
      alert('Failed to submit incident report.');
    }
  };

  const openCardModal = (item) => {
    setSelectedItem(item);
    setPurchaseQty(1);
    setEditFormData({ ...item });
    
    if (item.size) {
      const parts = item.size.split(' ');
      setEditSizeValue(parts[0] || '');
      setEditSizeUnit(parts[1] || 'cm');
    } else {
      setEditSizeValue('');
      setEditSizeUnit('cm');
    }
  };

  const handleAdminRestockRequest = async () => {
    if (purchaseQty <= 0) return alert('Please enter a valid restock quantity!');
    const totalPrice = purchaseQty * selectedItem.price;

    try {
      await axios.post('http://localhost:5000/api/orders', {
        appliance_id: selectedItem.id,
        appliance_name: selectedItem.name,
        quantity: purchaseQty,
        total_price: totalPrice,
        created_by: username || userRole
      });
      setSelectedItem(null);
      fetchOrders();
      alert('Restock request sent to warehouse successfully!');
    } catch (error) {
      alert('Failed to send restock request.');
    }
  };

  const handleCustomerPurchase = async () => {
    if (purchaseQty <= 0) return alert('Please enter a valid quantity to buy!');
    if (purchaseQty > selectedItem.quantity) return alert('Not enough stock available!');

    try {
      await axios.post('http://localhost:5000/api/purchase', {
        appliance_id: selectedItem.id,
        quantity: purchaseQty,
        created_by: username || 'Staff'
      });
      setSelectedItem(null);
      fetchAppliances();
      fetchPurchases();
      alert(`Successfully processed sale of ${purchaseQty}x ${selectedItem.name}! Recorded to history.`);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to complete purchase.');
    }
  };

  const handleUpdateOrderStatus = async (e, orderId, targetStatus) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setOrders((prevOrders) =>
      prevOrders.map((ord) =>
        ord.id === orderId ? { ...ord, status: targetStatus } : ord
      )
    );

    try {
      const response = await axios.put(`http://localhost:5000/api/orders/${orderId}/status`, { status: targetStatus });
      if (response.status === 200) {
        fetchOrders();
        fetchAppliances();
      }
    } catch (error) {
      console.error('Order status update error:', error);
      alert('Failed to update order status.');
      fetchOrders();
    }
  };

  const handleAdminReceiveShipping = async (e, orderId, orderedQty) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
  
    const inputVal = prompt(`Enter actual physical quantity received (Ordered: ${orderedQty}):`, orderedQty);
    if (inputVal === null) return;
  
    const actualQty = Number(inputVal);
    if (isNaN(actualQty) || actualQty < 0) {
      alert('Please enter a valid quantity!');
      return;
    }
  
    try {
      const response = await axios.put(`http://localhost:5000/api/orders/${orderId}/status`, {
        status: 'Received by Admin',
        received_quantity: actualQty
      });
      if (response.status === 200) {
        fetchOrders();
        fetchAppliances();
        alert(`Stock verified and updated! Received: ${actualQty} unit(s).`);
      }
    } catch (error) {
      console.error('Order verification error:', error);
      alert('Failed to update order status.');
      fetchOrders();
    }
  };

  const handleAdminSaveEdit = async () => {
    try {
      const formattedSize = editSizeValue ? `${editSizeValue} ${editSizeUnit}` : '';
      const updatedPayload = { ...editFormData, size: formattedSize };

      await axios.put(`http://localhost:5000/api/inventory/${selectedItem.id}`, updatedPayload);
      setSelectedItem(null);
      fetchAppliances();
      alert('Item updated successfully!');
    } catch (error) {
      alert('Failed to update item.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await axios.delete(`http://localhost:5000/api/inventory/${id}`);
      setSelectedItem(null);
      fetchAppliances();
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      await axios.put(`http://localhost:5000/api/users/${userId}/role`, { role: newRole });
      fetchUsers();
      alert('User role updated successfully!');
    } catch (error) {
      alert('Failed to update user role.');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await axios.delete(`http://localhost:5000/api/users/${userId}`);
        fetchUsers();
        alert('User deleted successfully!');
      } catch (error) {
        alert('Failed to delete user.');
      }
    }
  };

  const filteredAppliances = appliances.filter((item) => {
    const matchesMain = selectedMainCategory === 'All' || item.category === selectedMainCategory;
    const matchesSearch = 
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.item_code && item.item_code.toLowerCase().includes(search.toLowerCase())) ||
      (item.brand && item.brand.toLowerCase().includes(search.toLowerCase()));

    return matchesMain && matchesSearch;
  });

  const pendingRestocks = orders.filter((order) => {
    const st = (order.status || '').toLowerCase();
    return st !== 'received by admin';
  });

  const successfulRestocks = orders.filter((order) => {
    const st = (order.status || '').toLowerCase();
    return st === 'received by admin';
  });

  const openIncidents = incidents.filter((inc) => inc.status === 'Open');
  const totalNotificationBadge = pendingRestocks.length + openIncidents.length;

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <form onSubmit={isRegistering ? handleRegister : handleLogin} className="login-card">
          <h2>Emerald System</h2>
          <p>{isRegistering ? 'Create a new account (Default: Staff)' : 'Welcome back! Please enter details.'}</p>
          {loginError && <div className="error-message">{loginError}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}
          
          <div className="form-group">
            <label>Username</label>
            <input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} placeholder="Enter username" required />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Enter password" required />
          </div>

          <button type="submit" className="btn-login">{isRegistering ? 'Register' : 'Log In'}</button>
          
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button type="button" className="toggle-link-btn" onClick={() => { setIsRegistering(!isRegistering); setLoginError(''); setSuccessMessage(''); }}>
              {isRegistering ? 'Already have an account? Log in' : "Don't have an account? Register"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)', color: 'var(--text-main)' }}>
      
      {/* SIDEBAR NAVIGATION */}
      <div className="sidebar-container">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>💎</span>
            <h2 style={{ color: 'var(--primary-emerald)', fontSize: '1.2rem', margin: 0, fontWeight: '700' }}>Emerald System</h2>
          </div>
          <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: 'var(--radius-md)', marginBottom: '25px', border: '1px solid var(--emerald-border)' }}>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Logged in as</span>
            <strong style={{ color: 'var(--text-main)', fontSize: '0.88rem' }}>{username}</strong> <span style={{ fontSize: '0.75rem', color: 'var(--primary-emerald)', textTransform: 'uppercase' }}>({userRole})</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button onClick={() => setActiveTab('home')} className={`nav-link ${activeTab === 'home' ? 'active' : ''}`}>
              <span>🏠 Home</span>
            </button>

            <button onClick={() => setActiveTab('dashboard')} className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}>
              <span>📊 Dashboard</span>
            </button>
            
            {(userRole === 'admin' || userRole === 'warehouse') && (
              <button onClick={() => setActiveTab('notifications')} className={`nav-link ${activeTab === 'notifications' ? 'active' : ''}`}>
                <span>🔔 Notification</span>
                {totalNotificationBadge > 0 && <span className="badge" style={{ background: 'var(--accent-crimson)', color: '#fff' }}>{totalNotificationBadge}</span>}
              </button>
            )}

            {(userRole === 'staff' || userRole === 'admin') && (
              <button onClick={() => setActiveTab('history')} className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}>
                <span>🛒 Purchase History</span>
                {purchases.length > 0 && <span className="badge" style={{ background: 'var(--accent-blue)', color: '#fff' }}>{purchases.length}</span>}
              </button>
            )}

            {userRole === 'admin' && (
              <button onClick={() => setActiveTab('roles')} className={`nav-link ${activeTab === 'roles' ? 'active' : ''}`}>
                <span>👥 Role Management</span>
              </button>
            )}

            {userRole !== 'staff' && userRole !== 'warehouse' && (
              <button onClick={() => setActiveTab('services')} className={`nav-link ${activeTab === 'services' ? 'active' : ''}`}>
                <span>⚙️ Services</span>
              </button>
            )}
          </div>
        </div>

        <div>
          <button onClick={handleLogout} className="btn-delete" style={{ width: '100%', textAlign: 'center' }}>
            Logout
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid var(--emerald-border)', paddingBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', color: 'var(--text-main)', margin: 0, fontWeight: '700' }}>Emerald Inventory & Management</h1>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '0.9rem' }}>Welcome back, <strong style={{ color: 'var(--primary-emerald)' }}>{username}</strong>!</p>
          </div>
          {activeTab === 'home' && (
            <input type="text" className="search-input" placeholder="🔍 Search product name, code, brand..." value={search} onChange={(e) => setSearch(e.target.value)} />
          )}
        </div>

        {activeTab === 'home' && (
          <div className="tab-content">
            <div className="category-selection-container">
              <div className="main-category-banner">Select Inventory Category</div>
              <div className="category-grid">
                <div className={`category-card ${selectedMainCategory === 'All' ? 'active' : ''}`} onClick={() => setSelectedMainCategory('All')}>
                  <span className="cat-icon">📦</span>
                  <span>All Categories</span>
                </div>
                {categoriesList.map((mainCat) => (
                  <div key={mainCat} className={`category-card ${selectedMainCategory === mainCat ? 'active' : ''}`} onClick={() => setSelectedMainCategory(mainCat)}>
                    <span className="cat-icon">{mainCat === 'Furniture' ? '🛋️' : mainCat === 'Storage and Organizer' ? '📦' : '🔌'}</span>
                    <span>{mainCat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 16px 0' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>Product Catalog ({selectedMainCategory})</h3>
              {userRole === 'admin' && (
                <button className="btn-add" onClick={openAddModal}>+ Add New Product</button>
              )}
            </div>
            
            <div className="product-grid">
              {filteredAppliances.length > 0 ? (
                filteredAppliances.map((item) => {
                  const isLowStock = item.quantity <= 50 || item.quantity <= (item.max_stock || 100) * 0.5;
                  return (
                    <div key={item.id} className="product-card" onClick={() => openCardModal(item)}>
                      {isLowStock && <span className="low-stock-badge">Low Stock</span>}
                      <div className="product-name">{item.name}</div>
                      
                      <div className="product-specs-list">
                        {item.brand && <div className="spec-row"><span className="spec-label">Brand:</span> <span className="spec-val">{item.brand}</span></div>}
                        {item.size && <div className="spec-row"><span className="spec-label">Size:</span> <span className="spec-val">{item.size}</span></div>}
                        {item.class && <div className="spec-row"><span className="spec-label">Class:</span> <span className="spec-val">{item.class}</span></div>}
                      </div>

                      <div>
                        <div className="product-price">₱{Number(item.price).toFixed(2)}</div>
                        <div className="product-stock" style={{ color: isLowStock ? 'var(--accent-crimson)' : 'var(--text-muted)' }}>
                          Stock: {item.quantity} units
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ color: 'var(--text-dim)', gridColumn: '1 / -1', textAlign: 'center', padding: '40px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--emerald-border)' }}>
                  No products found matching criteria.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="tab-content">
            <h3 style={{ marginBottom: '20px', color: 'var(--text-main)' }}>System Overview</h3>
            <div className="services-grid">
              <div className="service-card">
                <h4>📦 Total Products</h4>
                <p style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--primary-emerald)', margin: '8px 0 0' }}>{appliances.length}</p>
              </div>
              {userRole === 'admin' && (
                <>
                  <div className="service-card">
                    <h4>📋 Total Restock Orders</h4>
                    <p style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--primary-emerald)', margin: '8px 0 0' }}>{orders.length}</p>
                  </div>
                  <div className="service-card">
                    <h4>⚠️ Open Incidents</h4>
                    <p style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--accent-crimson)', margin: '8px 0 0' }}>{openIncidents.length}</p>
                  </div>
                </>
              )}
              {userRole === 'staff' && (
                <div className="service-card">
                  <h4>🛒 Sales Recorded</h4>
                  <p style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--primary-emerald)', margin: '8px 0 0' }}>{purchases.length}</p>
                </div>
              )}
              {userRole === 'warehouse' && (
                <>
                  <div className="service-card">
                    <h4>🚚 Pending Restocks</h4>
                    <p style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--accent-amber)', margin: '8px 0 0' }}>{pendingRestocks.length}</p>
                  </div>
                  <div className="service-card">
                    <h4>✅ Completed Restocks</h4>
                    <p style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--primary-emerald)', margin: '8px 0 0' }}>{successfulRestocks.length}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ROLE MANAGEMENT */}
        {activeTab === 'roles' && userRole === 'admin' && (
          <div className="tab-content">
            <div className="notification-section" style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--emerald-border)' }}>
              <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-main)' }}>👥 User Role Management</h3>
              {systemUsers.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>ID</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Username</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Current Role</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Change Role</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {systemUsers.map((u) => (
                        <tr key={u.id}>
                          <td style={{ padding: '14px 16px', color: 'var(--text-dim)' }}>#{u.id}</td>
                          <td style={{ padding: '14px 16px', fontWeight: '600' }}>{u.username}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', background: u.role === 'admin' ? 'var(--emerald-glow)' : u.role === 'warehouse' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)', color: u.role === 'admin' ? 'var(--primary-emerald)' : u.role === 'warehouse' ? 'var(--accent-amber)' : 'var(--accent-blue)' }}>
                              {u.role.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <select value={u.role} onChange={(e) => handleUpdateUserRole(u.id, e.target.value)} className="dropdown-input" style={{ width: '140px', padding: '6px 10px' }}>
                              <option value="admin">Admin</option>
                              <option value="warehouse">Warehouse</option>
                              <option value="staff">Staff</option>
                            </select>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <button onClick={() => handleDeleteUser(u.id)} className="btn-delete" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p style={{ color: 'var(--text-dim)' }}>No users found.</p>}
            </div>
          </div>
        )}

        {/* PURCHASE HISTORY */}
        {activeTab === 'history' && (userRole === 'staff' || userRole === 'admin') && (
          <div className="tab-content">
            <div className="notification-section" style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--emerald-border)' }}>
              <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-main)' }}>🛒 Sales & Purchase History</h3>
              {purchases.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>ID</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Item Name</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Qty</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Total Price</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Processed By</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Date / Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.map((p) => (
                        <tr key={p.id}>
                          <td style={{ padding: '14px 16px', color: 'var(--text-dim)' }}>#{p.id}</td>
                          <td style={{ padding: '14px 16px', fontWeight: '600' }}>{p.appliance_name}</td>
                          <td style={{ padding: '14px 16px' }}>{p.quantity}</td>
                          <td style={{ padding: '14px 16px', color: 'var(--primary-emerald)', fontWeight: '700' }}>₱{Number(p.total_price).toFixed(2)}</td>
                          <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{p.purchased_by}</td>
                          <td style={{ padding: '14px 16px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>{p.created_at ? new Date(p.created_at).toLocaleString() : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p style={{ color: 'var(--text-dim)' }}>No purchases recorded yet.</p>}
            </div>
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (userRole === 'admin' || userRole === 'warehouse') && (
          <div className="tab-content">
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              <button className={`sub-chip ${notiFilter === 'all' ? 'active' : ''}`} onClick={() => setNotiFilter('all')}>All Notifications</button>
              <button className={`sub-chip ${notiFilter === 'restocks' ? 'active' : ''}`} onClick={() => setNotiFilter('restocks')}>🚚 Restock Requests ({pendingRestocks.length})</button>
              <button className={`sub-chip ${notiFilter === 'incidents' ? 'active' : ''}`} onClick={() => setNotiFilter('incidents')}>🚨 Incidents ({openIncidents.length})</button>
            </div>

            {(notiFilter === 'all' || notiFilter === 'incidents') && (
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-main)' }}>🚨 Incident Reports</h3>
                  {userRole === 'admin' && <button className="btn-add" onClick={() => setShowIncidentModal(true)} style={{ background: 'var(--accent-crimson)' }}>+ File Incident</button>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {incidents.length > 0 ? (
                    incidents.map((inc) => (
                      <div key={inc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '18px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--emerald-border)', borderLeft: `4px solid ${inc.status === 'Open' ? 'var(--accent-amber)' : 'var(--primary-emerald)'}` }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <strong style={{ fontSize: '0.98rem' }}>{inc.title}</strong>
                            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: inc.status === 'Open' ? 'rgba(245, 158, 11, 0.15)' : 'var(--emerald-glow)', color: inc.status === 'Open' ? 'var(--accent-amber)' : 'var(--primary-emerald)', fontWeight: '700' }}>
                              {inc.status}
                            </span>
                          </div>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0 0 4px 0' }}>{inc.description}</p>
                          <small style={{ color: 'var(--text-dim)' }}>Reported by: {inc.reported_by}</small>
                        </div>
                        {userRole === 'admin' && inc.status === 'Open' && (
                          <button onClick={async () => {
                            try {
                              await axios.put(`http://localhost:5000/api/incidents/${inc.id}/status`, { status: 'Resolved' });
                              fetchIncidents();
                            } catch (err) {
                              alert('Failed to update status');
                            }
                          }} className="btn-add" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>Mark Resolved</button>
                        )}
                      </div>
                    ))
                  ) : <p style={{ color: 'var(--text-dim)' }}>No incident reports found.</p>}
                </div>
              </div>
            )}

            {(notiFilter === 'all' || notiFilter === 'restocks') && (
              <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--emerald-border)' }}>
                <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-main)' }}>🚚 Restock Tracker</h3>
                {orders.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th style={{ padding: '12px 16px', textAlign: 'left' }}>ID</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left' }}>Item Name</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left' }}>Ordered Qty</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left' }}>Received Qty</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left' }}>Total Price</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left' }}>Status</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => {
                          const rawStatus = order.status ? order.status.trim() : 'Pending Restock';
                          const statusLower = rawStatus.toLowerCase();
                          const isPending = statusLower === 'pending restock' || statusLower === '';
                          const isReceivedByWarehouse = statusLower === 'restock received by warehouse';
                          const isShipping = statusLower === 'shipping';
                          const isCompleted = statusLower === 'received by admin';

                          return (
                            <tr key={order.id}>
                              <td style={{ padding: '14px 16px', color: 'var(--text-dim)' }}>#{order.id}</td>
                              <td style={{ padding: '14px 16px', fontWeight: '600' }}>{order.appliance_name}</td>
                              <td style={{ padding: '14px 16px' }}>{order.quantity}</td>
                              <td style={{ padding: '14px 16px', color: 'var(--primary-emerald)', fontWeight: '700' }}>
                                {isCompleted ? (order.received_quantity ?? order.quantity) : '—'}
                              </td>
                              <td style={{ padding: '14px 16px' }}>₱{Number(order.total_price).toFixed(2)}</td>
                              <td style={{ padding: '14px 16px' }}>
                                <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', background: isCompleted ? 'var(--emerald-glow)' : 'rgba(245, 158, 11, 0.15)', color: isCompleted ? 'var(--primary-emerald)' : 'var(--accent-amber)' }}>
                                  {rawStatus}
                                </span>
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                {userRole === 'warehouse' && (
                                  <>
                                    {isPending && <button onClick={(e) => handleUpdateOrderStatus(e, order.id, 'Restock Received by Warehouse')} className="btn-add" style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'var(--accent-amber)' }}>Receive Purchase</button>}
                                    {isReceivedByWarehouse && <button onClick={(e) => handleUpdateOrderStatus(e, order.id, 'Shipping')} className="btn-add" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Ship Order</button>}
                                    {isShipping && <span style={{ color: 'var(--primary-emerald)', fontSize: '0.82rem' }}>✈️ In Transit</span>}
                                    {isCompleted && <span style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>✅ Completed</span>}
                                  </>
                                )}
                                {userRole === 'admin' && (
                                  <>
                                    {isPending && <span style={{ color: 'var(--accent-amber)', fontSize: '0.82rem' }}>⌛ Awaiting Warehouse</span>}
                                    {isReceivedByWarehouse && <span style={{ color: 'var(--primary-emerald)', fontSize: '0.82rem' }}>📦 Processing at Warehouse</span>}
                                    {isShipping && <button onClick={(e) => handleAdminReceiveShipping(e, order.id, order.quantity)} className="btn-add" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Verify & Receive Stock</button>}
                                    {isCompleted && <span style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>✅ Stock Updated</span>}
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : <p style={{ color: 'var(--text-dim)' }}>No active restock requests.</p>}
              </div>
            )}
          </div>
        )}

        {/* SERVICES TAB */}
        {activeTab === 'services' && userRole !== 'staff' && userRole !== 'warehouse' && (
          <div className="tab-content">
            <h3 style={{ marginBottom: '20px', color: 'var(--text-main)' }}>System Capabilities</h3>
            <div className="services-grid">
              <div className="service-card">
                <h4 style={{ color: 'var(--primary-emerald)', marginBottom: '8px' }}>📦 Inventory Control</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>Track real-time stock levels and edit specs dynamically.</p>
              </div>
              <div className="service-card">
                <h4 style={{ color: 'var(--primary-emerald)', marginBottom: '8px' }}>🚚 Supply Chain Workflow</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>Automate restock orders across Admin and Warehouse teams.</p>
              </div>
              <div className="service-card">
                <h4 style={{ color: 'var(--primary-emerald)', marginBottom: '8px' }}>👥 Access Controls</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>Enforce role-based security across Admin, Staff, and Warehouse views.</p>
              </div>
            </div>
          </div>
        )}

        {/* MODALS */}
        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Add New Product</h2>
              <form onSubmit={handleAddAppliance}>
                <div className="modal-inputs">
                  <label>Product Name</label>
                  <input type="text" value={productForm.name} onChange={(e) => setProductForm({...productForm, name: e.target.value})} required />
                  
                  <label>Category</label>
                  <select value={productForm.category} onChange={(e) => setProductForm({...productForm, category: e.target.value})} className="dropdown-input">
                    {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  
                  <label>Item Code</label>
                  <input type="text" value={productForm.item_code} onChange={(e) => setProductForm({...productForm, item_code: e.target.value})} />
                  
                  <label>Brand</label>
                  <input type="text" value={productForm.brand} onChange={(e) => setProductForm({...productForm, brand: e.target.value})} />
                  
                  <label>Size</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" placeholder="e.g. 40" value={productForm.size_value} onChange={(e) => setProductForm({...productForm, size_value: e.target.value})} style={{ flex: '1' }} />
                    <select value={productForm.size_unit} onChange={(e) => setProductForm({...productForm, size_unit: e.target.value})} className="dropdown-input" style={{ width: '100px' }}>
                      <option value="cm">cm</option>
                      <option value="inches">inches</option>
                    </select>
                  </div>

                  <label>Quantity</label>
                  <input type="number" value={productForm.quantity} onChange={(e) => setProductForm({...productForm, quantity: e.target.value})} required />
                  
                  <label>Price (₱)</label>
                  <input type="number" step="0.01" value={productForm.price} onChange={(e) => setProductForm({...productForm, price: e.target.value})} required />
                </div>

                <div className="action-buttons">
                  <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn-add">Save Product</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showIncidentModal && (
          <div className="modal-overlay" onClick={() => setShowIncidentModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Report Incident</h2>
              <form onSubmit={handleAddIncident}>
                <div className="modal-inputs">
                  <label>Category</label>
                  <select value={incidentForm.category} onChange={(e) => {
                    const newCat = e.target.value;
                    const firstItemOfCat = appliances.find(i => i.category === newCat);
                    setIncidentForm({ ...incidentForm, category: newCat, product_name: firstItemOfCat ? firstItemOfCat.name : '' });
                  }} className="dropdown-input">
                    {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <label>Product Name</label>
                  <select value={incidentForm.product_name} onChange={(e) => setIncidentForm({...incidentForm, product_name: e.target.value})} className="dropdown-input" required>
                    <option value="">-- Select Product --</option>
                    {appliances.filter(item => item.category === incidentForm.category).map(item => (
                      <option key={item.id} value={item.name}>{item.name} {item.brand ? `(${item.brand})` : ''}</option>
                    ))}
                  </select>

                  <label>Description</label>
                  <textarea rows="4" value={incidentForm.description} onChange={(e) => setIncidentForm({...incidentForm, description: e.target.value})} placeholder="Provide damage or issue details..." required />
                </div>

                <div className="action-buttons">
                  <button type="button" className="btn-cancel" onClick={() => setShowIncidentModal(false)}>Cancel</button>
                  <button type="submit" className="btn-add" style={{ background: 'var(--accent-crimson)' }}>Submit Incident</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {selectedItem && (
          <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{selectedItem.name}</h2>

              {userRole === 'admin' ? (
                <div className="modal-inputs">
                  <label>Name</label>
                  <input type="text" value={editFormData.name || ''} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} />
                  
                  <label>Category</label>
                  <select value={editFormData.category || 'Furniture'} onChange={(e) => setEditFormData({...editFormData, category: e.target.value})} className="dropdown-input">
                    {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  
                  <label>Item Code</label>
                  <input type="text" value={editFormData.item_code || ''} onChange={(e) => setEditFormData({...editFormData, item_code: e.target.value})} />
                  
                  <label>Brand</label>
                  <input type="text" value={editFormData.brand || ''} onChange={(e) => setEditFormData({...editFormData, brand: e.target.value})} />
                  
                  <label>Quantity in Stock</label>
                  <input type="number" value={editFormData.quantity || 0} onChange={(e) => setEditFormData({...editFormData, quantity: e.target.value})} />
                  
                  <label>Price (₱)</label>
                  <input type="number" step="0.01" value={editFormData.price || 0} onChange={(e) => setEditFormData({...editFormData, price: e.target.value})} />

                  <hr style={{ borderColor: 'var(--emerald-border)', margin: '16px 0' }} />
                  
                  <label>Request Restock Quantity</label>
                  <input type="number" min="1" value={purchaseQty} onChange={(e) => setPurchaseQty(Number(e.target.value))} />

                  <div className="action-buttons">
                    <button className="btn-delete" onClick={() => handleDelete(selectedItem.id)}>Delete</button>
                    <button className="btn-save" style={{ background: 'var(--accent-amber)' }} onClick={handleAdminRestockRequest}>Request Restock</button>
                    <button className="btn-save" onClick={handleAdminSaveEdit}>Save Edits</button>
                    <button className="btn-cancel" onClick={() => setSelectedItem(null)}>Close</button>
                  </div>
                </div>
              ) : userRole === 'staff' ? (
                <div>
                  <p style={{ color: 'var(--text-muted)' }}><strong>Brand:</strong> {selectedItem.brand || 'N/A'}</p>
                  <p style={{ color: 'var(--text-muted)' }}><strong>Item Code:</strong> {selectedItem.item_code || 'N/A'}</p>
                  <p style={{ color: 'var(--text-muted)' }}><strong>Price:</strong> <span style={{ color: 'var(--primary-emerald)', fontWeight: '700' }}>₱{Number(selectedItem.price).toFixed(2)}</span></p>
                  <p style={{ color: 'var(--text-muted)' }}><strong>Stock Available:</strong> {selectedItem.quantity}</p>

                  <hr style={{ borderColor: 'var(--emerald-border)', margin: '16px 0' }} />
                  <div className="modal-inputs">
                    <label>Quantity to Sell</label>
                    <input type="number" min="1" max={selectedItem.quantity} value={purchaseQty} onChange={(e) => setPurchaseQty(Number(e.target.value))} />
                  </div>

                  <div className="action-buttons">
                    <button className="btn-cancel" onClick={() => setSelectedItem(null)}>Close</button>
                    <button className="btn-save" onClick={handleCustomerPurchase}>Process Purchase</button>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ color: 'var(--text-muted)' }}><strong>Brand:</strong> {selectedItem.brand || 'N/A'}</p>
                  <p style={{ color: 'var(--text-muted)' }}><strong>Item Code:</strong> {selectedItem.item_code || 'N/A'}</p>
                  <p style={{ color: 'var(--text-muted)' }}><strong>Stock Available:</strong> {selectedItem.quantity}</p>
                  <div className="action-buttons">
                    <button className="btn-cancel" onClick={() => setSelectedItem(null)}>Close</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;