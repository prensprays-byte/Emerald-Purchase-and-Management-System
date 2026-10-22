import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('emerald_logged_in') === 'true');
  const [userRole, setUserRole] = useState(() => localStorage.getItem('emerald_user_role') || '');
  const [username, setUsername] = useState(() => localStorage.getItem('emerald_username') || '');
  const [activeTab, setActiveTab] = useState('home');

  const [notiFilter, setNotiFilter] = useState('all');

  const [isRegistering, setIsRegistering] = useState(false);
  const [registerRole, setRegisterRole] = useState('staff');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [appliances, setAppliances] = useState([]);
  const [orders, setOrders] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [search, setSearch] = useState('');

  const [selectedMainCategory, setSelectedMainCategory] = useState('All');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentForm, setIncidentForm] = useState({ product_name: '', description: '' });

  const categoriesList = ['Furniture', 'Storage and Organizer', 'Appliance'];

  const [productForm, setProductForm] = useState({
    name: '',
    category: 'Furniture',
    item_code: '',
    brand: '',
    size: '',
    design: '',
    surface: '',
    texture: '',
    class_type: 'A',
    special_specs: '',
    quantity: '',
    price: ''
  });

  const [selectedItem, setSelectedItem] = useState(null);
  const [purchaseQty, setPurchaseQty] = useState(1);
  const [editFormData, setEditFormData] = useState({});

  const fetchAppliances = useCallback(async () => {
    try {
      let url = 'http://localhost:5000/api/inventory';
      const params = new URLSearchParams();

      if (selectedMainCategory !== 'All') params.append('category', selectedMainCategory);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await axios.get(url);
      setAppliances(response.data.map(item => ({ ...item, max_stock: item.max_stock || item.quantity || 100 })));
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

  useEffect(() => {
    if (isLoggedIn) {
      fetchAppliances();
      fetchOrders();
      fetchPurchases();
      fetchIncidents();
    }
  }, [isLoggedIn, fetchAppliances, fetchOrders, fetchPurchases, fetchIncidents]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/login', { username: loginUsername, password: loginPassword });
      if (response.data.message === 'Login successful') {
        const user = response.data.user;
        setIsLoggedIn(true);
        setUserRole(user.role);
        setUsername(user.username);
        localStorage.setItem('emerald_logged_in', 'true');
        localStorage.setItem('emerald_user_role', user.role);
        localStorage.setItem('emerald_username', user.username);
        setLoginError('');
      }
    } catch (error) {
      setLoginError(error.response?.data?.error || 'Invalid credentials');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/register', { username: loginUsername, password: loginPassword, role: registerRole });
      setSuccessMessage('Registration successful! Please log in.');
      setIsRegistering(false);
      setLoginPassword('');
    } catch (error) {
      setLoginError(error.response?.data?.error || 'Registration failed');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole('');
    setUsername('');
    setSelectedItem(null);
    localStorage.clear();
  };

  const openAddModal = () => {
    const activeCat = selectedMainCategory !== 'All' ? selectedMainCategory : 'Furniture';
    setProductForm({
      name: '',
      category: activeCat,
      item_code: '',
      brand: '',
      size: '',
      design: '',
      surface: '',
      texture: '',
      class_type: 'A',
      special_specs: '',
      quantity: '',
      price: ''
    });
    setShowAddModal(true);
  };

  const handleAddAppliance = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/inventory', {
        ...productForm,
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
    try {
      await axios.post('http://localhost:5000/api/incidents', {
        title: incidentForm.product_name,
        description: incidentForm.description,
        reported_by: username || 'User'
      });
      setShowIncidentModal(false);
      setIncidentForm({ product_name: '', description: '' });
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

  const handleAdminSaveEdit = async () => {
    try {
      await axios.put(`http://localhost:5000/api/inventory/${selectedItem.id}`, editFormData);
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
          <p>{isRegistering ? 'Create a new account' : 'Please log in'}</p>
          {loginError && <div className="error-message">{loginError}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}
          <div className="form-group"><label>Username</label><input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} required /></div>
          <div className="form-group"><label>Password</label><input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required /></div>
          {isRegistering && (
            <div className="form-group">
              <label>Role</label>
              <select value={registerRole} onChange={(e) => setRegisterRole(e.target.value)} className="dropdown-input">
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
                <option value="warehouse">Warehouse</option>
              </select>
            </div>
          )}
          <button type="submit" className="btn-login">{isRegistering ? 'Register' : 'Log In'}</button>
          <div style={{ textAlign: 'center', marginTop: '15px' }}>
            <button type="button" className="toggle-link-btn" onClick={() => setIsRegistering(!isRegistering)}>
              {isRegistering ? 'Already have an account? Log in' : "Don't have an account? Register"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="inventory-container">
      <div className="top-header">
        <div className="header-title-area">
          <h1>Emerald Purchase and Management System</h1>
          <small style={{ color: '#81c784' }}>Logged in as: <strong>{userRole.toUpperCase()}</strong> ({username})</small>
        </div>
        <div className="top-right-nav">
          <button className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>Home</button>
          <button className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
          
          {(userRole === 'admin' || userRole === 'warehouse') && (
            <button className={`nav-btn ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
              Notification {totalNotificationBadge > 0 && <span className="badge">{totalNotificationBadge}</span>}
            </button>
          )}
          {userRole === 'staff' && (
            <button className={`nav-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
              Purchase History {purchases.length > 0 && <span className="badge">{purchases.length}</span>}
            </button>
          )}

          {userRole !== 'staff' && userRole !== 'warehouse' && (
            <button className={`nav-btn ${activeTab === 'services' ? 'active' : ''}`} onClick={() => setActiveTab('services')}>Services</button>
          )}

          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </div>

      {activeTab === 'home' && (
        <div className="tab-content">
          <div className="category-selection-container">
            <div className="main-category-banner">SELECT MAIN CATEGORY</div>
            <div className="category-grid">
              <div 
                className={`category-card ${selectedMainCategory === 'All' ? 'active' : ''}`} 
                onClick={() => setSelectedMainCategory('All')}
              >
                <span className="cat-icon">📦</span>
                <span>All Categories</span>
              </div>
              {categoriesList.map((mainCat) => (
                <div 
                  key={mainCat} 
                  className={`category-card ${selectedMainCategory === mainCat ? 'active' : ''}`} 
                  onClick={() => setSelectedMainCategory(mainCat)}
                >
                  <span className="cat-icon">{mainCat === 'Furniture' ? '🛋️' : mainCat === 'Storage and Organizer' ? '📦' : '🔌'}</span>
                  <span>{mainCat}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0', flexWrap: 'wrap', gap: '10px' }}>
            <input type="text" className="search-input" placeholder="Search by name, item code, brand..." value={search} onChange={(e) => setSearch(e.target.value)} />
            
            {userRole === 'admin' && (
              <button className="btn-add" onClick={openAddModal} style={{ fontSize: '0.95rem', padding: '10px 20px' }}>
                + Add New Product
              </button>
            )}
          </div>

          <h3>Product Catalog ({selectedMainCategory})</h3>
          
          <div className="product-grid">
            {filteredAppliances.length > 0 ? (
              filteredAppliances.map((item) => {
                const isLowStock = item.quantity <= (item.max_stock || item.quantity) * 0.5;
                return (
                  <div key={item.id} className="product-card" onClick={() => openCardModal(item)}>
                    <div style={{ position: 'relative' }}>
                      <img src="https://via.placeholder.com/200?text=No+Image" alt={item.name} className="product-image" />
                      {isLowStock && <span className="low-stock-badge" title="Low Stock (&le; 50%)!">!</span>}
                    </div>
                    <div className="product-name">{item.name}</div>
                    
                    <div className="product-specs-list">
                      {item.item_code && <div className="spec-row"><span className="spec-label">Item Code:</span> <span className="spec-val">{item.item_code}</span></div>}
                      {item.brand && <div className="spec-row"><span className="spec-label">Brand:</span> <span className="spec-val">{item.brand}</span></div>}
                      {item.size && <div className="spec-row"><span className="spec-label">Size:</span> <span className="spec-val">{item.size}</span></div>}
                      {item.design && <div className="spec-row"><span className="spec-label">Design:</span> <span className="spec-val">{item.design}</span></div>}
                      {item.surface && <div className="spec-row"><span className="spec-label">Surface:</span> <span className="spec-val">{item.surface}</span></div>}
                      {item.texture && <div className="spec-row"><span className="spec-label">Texture:</span> <span className="spec-val">{item.texture}</span></div>}
                      {item.class && <div className="spec-row"><span className="spec-label">Class:</span> <span className="spec-val">{item.class}</span></div>}
                      {item.special_specs && <div className="spec-row"><span className="spec-label">Special Specs:</span> <span className="spec-val">{item.special_specs}</span></div>}
                    </div>

                    <div className="product-price">₱{Number(item.price).toFixed(2)}</div>
                    <div className="product-stock" style={{ color: isLowStock ? '#ef5350' : '#b0bec5' }}>
                      Stock: {item.quantity} {isLowStock && '(Low Stock!)'}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ color: '#999', gridColumn: '1 / -1', textAlign: 'center', padding: '20px' }}>No products found in this category</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div className="tab-content" style={{ paddingBottom: '20px' }}>
          <div className="services-section" style={{ padding: '15px 20px' }}>
            <h3 style={{ marginBottom: '15px' }}>Dashboard Overview</h3>
            <div className="services-grid" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <div className="service-card" style={{ flex: '1 1 200px', padding: '15px' }}>
                <h4>📦 Total Products</h4>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#81c784', margin: '5px 0 0' }}>{appliances.length}</p>
              </div>
              {userRole === 'admin' && (
                <>
                  <div className="service-card" style={{ flex: '1 1 200px', padding: '15px' }}>
                    <h4>📋 Total Orders</h4>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#81c784', margin: '5px 0 0' }}>{orders.length}</p>
                  </div>
                  <div className="service-card" style={{ flex: '1 1 200px', padding: '15px' }}>
                    <h4>⚠️ Open Incidents</h4>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef5350', margin: '5px 0 0' }}>{openIncidents.length}</p>
                  </div>
                </>
              )}
              {userRole === 'staff' && (
                <div className="service-card" style={{ flex: '1 1 200px', padding: '15px' }}>
                  <h4>🛒 Total Purchases Recorded</h4>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#81c784', margin: '5px 0 0' }}>{purchases.length}</p>
                </div>
              )}
              {userRole === 'warehouse' && (
                <>
                  <div className="service-card" style={{ flex: '1 1 200px', padding: '15px' }}>
                    <h4>🚚 Pending Restocks</h4>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff8f00', margin: '5px 0 0' }}>{pendingRestocks.length}</p>
                  </div>
                  <div className="service-card" style={{ flex: '1 1 200px', padding: '15px' }}>
                    <h4>✅ Successful Restocks</h4>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#81c784', margin: '5px 0 0' }}>{successfulRestocks.length}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PURCHASE HISTORY TABLE FOR STAFF */}
      {activeTab === 'history' && userRole === 'staff' && (
        <div className="tab-content" style={{ paddingBottom: '20px' }}>
          <div className="notification-section" style={{ padding: '20px', background: '#101612', borderRadius: '8px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff', marginBottom: '20px' }}>
              🛒 Customer Purchase History
            </h3>
            {purchases.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: '#101612', color: '#e0e0e0' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1a261c', color: '#81c784', fontSize: '0.95rem' }}>
                      <th style={{ padding: '12px 16px', fontWeight: '600' }}>ID</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600' }}>Item Name</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600' }}>Qty</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600' }}>Total Price</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600' }}>Processed By</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600' }}>Date / Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #162018' }}>
                        <td style={{ padding: '12px 16px', color: '#b0bec5' }}>#{p.id}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#ffffff' }}>{p.appliance_name}</td>
                        <td style={{ padding: '12px 16px', color: '#e0e0e0' }}>{p.quantity}</td>
                        <td style={{ padding: '12px 16px', color: '#81c784', fontWeight: '500' }}>₱{Number(p.total_price).toFixed(2)}</td>
                        <td style={{ padding: '12px 16px', color: '#b0bec5' }}>{p.purchased_by}</td>
                        <td style={{ padding: '12px 16px', color: '#b0bec5', fontSize: '0.9rem' }}>{p.created_at ? new Date(p.created_at).toLocaleString() : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="no-notifications">No purchase records found yet.</p>
            )}
          </div>
        </div>
      )}

      {/* NOTIFICATIONS TAB */}
      {activeTab === 'notifications' && (userRole === 'admin' || userRole === 'warehouse') && (
        <div className="tab-content">
          <div className="notification-section">
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <button className={`sub-chip ${notiFilter === 'all' ? 'active' : ''}`} onClick={() => setNotiFilter('all')}>All Notifications</button>
              <button className={`sub-chip ${notiFilter === 'restocks' ? 'active' : ''}`} onClick={() => setNotiFilter('restocks')}>🚚 Restock Requests {pendingRestocks.length > 0 && `(${pendingRestocks.length})`}</button>
              <button className={`sub-chip ${notiFilter === 'incidents' ? 'active' : ''}`} onClick={() => setNotiFilter('incidents')}>🚨 Incident Reports {openIncidents.length > 0 && `(${openIncidents.length})`}</button>
            </div>

            {(notiFilter === 'all' || notiFilter === 'incidents') && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, color: '#ffffff' }}>🚨 Incident Reports</h3>
                  {userRole === 'admin' && (
                    <button className="btn-add" onClick={() => setShowIncidentModal(true)} style={{ backgroundColor: '#d32f2f' }}>+ File Incident Report</button>
                  )}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
                  {incidents.length > 0 ? (
                    incidents.map((inc) => {
                      const isOpen = inc.status === 'Open';
                      return (
                        <div key={inc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#101612', padding: '16px 20px', borderRadius: '8px', borderLeft: `4px solid ${isOpen ? '#ff8f00' : '#81c784'}`, border: '1px solid #1a261c' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                              <strong style={{ color: '#ffffff', fontSize: '1rem' }}>Product: {inc.title}</strong>
                              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: isOpen ? 'rgba(255, 143, 0, 0.2)' : 'rgba(129, 199, 132, 0.2)', color: isOpen ? '#ffb74d' : '#81c784', fontWeight: 'bold' }}>
                                {inc.status}
                              </span>
                            </div>
                            <p style={{ color: '#b0bec5', fontSize: '0.9rem', margin: '0 0 6px 0' }}><strong>Issue:</strong> {inc.description}</p>
                            <small style={{ color: '#78909c' }}>Reported by: <strong>{inc.reported_by}</strong></small>
                          </div>
                          <div>
                            {userRole === 'admin' && isOpen && (
                              <button 
                                onClick={async () => {
                                  try {
                                    await axios.put(`http://localhost:5000/api/incidents/${inc.id}/status`, { status: 'Resolved' });
                                    fetchIncidents();
                                  } catch (err) {
                                    alert('Failed to update status');
                                  }
                                }}
                                style={{ backgroundColor: '#2e7d32', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                              >
                                Mark as Resolved
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="no-notifications" style={{ background: '#101612', padding: '20px', borderRadius: '8px', textAlign: 'center', color: '#b0bec5' }}>No incident reports found.</p>
                  )}
                </div>
              </>
            )}

            {(notiFilter === 'all' || notiFilter === 'restocks') && (
              <div style={{ padding: '20px', background: '#101612', borderRadius: '8px' }}>
                <h3 style={{ color: '#ffffff', marginBottom: '20px' }}>🚚 Warehouse & Admin Restock Tracker</h3>
                {orders.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: '#101612', color: '#e0e0e0' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #1a261c', color: '#81c784', fontSize: '0.95rem' }}>
                          <th style={{ padding: '12px 16px', fontWeight: '600' }}>ID</th>
                          <th style={{ padding: '12px 16px', fontWeight: '600' }}>Item Name</th>
                          <th style={{ padding: '12px 16px', fontWeight: '600' }}>Qty</th>
                          <th style={{ padding: '12px 16px', fontWeight: '600' }}>Total Price</th>
                          <th style={{ padding: '12px 16px', fontWeight: '600' }}>Status</th>
                          <th style={{ padding: '12px 16px', fontWeight: '600' }}>Action / Workflow</th>
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

                          const currentRole = (userRole || '').toLowerCase();

                          return (
                            <tr key={order.id} style={{ borderBottom: '1px solid #162018' }}>
                              <td style={{ padding: '12px 16px', color: '#b0bec5' }}>#{order.id}</td>
                              <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#ffffff' }}>{order.appliance_name}</td>
                              <td style={{ padding: '12px 16px', color: '#e0e0e0' }}>{order.quantity}</td>
                              <td style={{ padding: '12px 16px', color: '#81c784', fontWeight: '500' }}>₱{Number(order.total_price).toFixed(2)}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', background: isCompleted ? '#1b5e20' : '#ff8f00', color: '#ffffff' }}>
                                  {rawStatus}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                {/* WAREHOUSE WORKFLOW CONTROLS */}
                                {currentRole === 'warehouse' && (
                                  <div>
                                    {isPending && (
                                      <button 
                                        type="button"
                                        onClick={(e) => handleUpdateOrderStatus(e, order.id, 'Restock Received by Warehouse')}
                                        style={{ backgroundColor: '#ff8f00', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                      >
                                        Receive Purchase
                                      </button>
                                    )}
                                    {isReceivedByWarehouse && (
                                      <button 
                                        type="button"
                                        onClick={(e) => handleUpdateOrderStatus(e, order.id, 'Shipping')}
                                        style={{ backgroundColor: '#1b5e20', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                      >
                                        Shipping
                                      </button>
                                    )}
                                    {isShipping && <span style={{ color: '#81c784', fontSize: '0.85rem' }}>✈️ Shipped to Admin</span>}
                                    {isCompleted && <span style={{ color: '#81c784', fontSize: '0.85rem' }}>✅ Completed</span>}
                                  </div>
                                )}

                                {/* ADMIN WORKFLOW CONTROLS */}
                                {currentRole === 'admin' && (
                                  <div>
                                    {isPending && <span style={{ color: '#ffb74d', fontSize: '0.85rem' }}>⌛ Waiting for Warehouse</span>}
                                    {isReceivedByWarehouse && <span style={{ color: '#81c784', fontSize: '0.85rem' }}>📦 Received by Warehouse</span>}
                                    {isShipping && (
                                      <button 
                                        type="button"
                                        onClick={(e) => handleUpdateOrderStatus(e, order.id, 'Received by Admin')}
                                        style={{ backgroundColor: '#2e7d32', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                      >
                                        Receive Shipping
                                      </button>
                                    )}
                                    {isCompleted && <span style={{ color: '#81c784', fontSize: '0.85rem' }}>✅ Stock Updated</span>}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="no-notifications">No active restock requests.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'services' && userRole !== 'staff' && userRole !== 'warehouse' && (
        <div className="tab-content">
          <div className="services-section">
            <h3>Emerald System Services</h3>
            <div className="services-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
              <div className="service-card" style={{ padding: '20px', background: '#101612', borderRadius: '8px' }}>
                <h4 style={{ color: '#81c784', marginBottom: '8px' }}>📦 Inventory Management</h4>
                <p style={{ color: '#b0bec5', fontSize: '0.9rem', margin: 0 }}>Track stock levels and catalog items in real time.</p>
              </div>
              <div className="service-card" style={{ padding: '20px', background: '#101612', borderRadius: '8px' }}>
                <h4 style={{ color: '#81c784', marginBottom: '8px' }}>🚚 Order Processing</h4>
                <p style={{ color: '#b0bec5', fontSize: '0.9rem', margin: 0 }}>Streamline and monitor restocks across roles seamlessly.</p>
              </div>
              <div className="service-card" style={{ padding: '20px', background: '#101612', borderRadius: '8px' }}>
                <h4 style={{ color: '#81c784', marginBottom: '8px' }}>👥 User Roles & Access</h4>
                <p style={{ color: '#b0bec5', fontSize: '0.9rem', margin: 0 }}>Oversee admin, warehouse, and staff permissions securely.</p>
              </div>
              <div className="service-card" style={{ padding: '20px', background: '#101612', borderRadius: '8px' }}>
                <h4 style={{ color: '#81c784', marginBottom: '8px' }}>🚨 System Incident Logs</h4>
                <p style={{ color: '#b0bec5', fontSize: '0.9rem', margin: 0 }}>File and manage incident reports sent directly to the warehouse.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showIncidentModal && (
        <div className="modal-overlay" onClick={() => setShowIncidentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Report an Incident</h2>
            <form onSubmit={handleAddIncident}>
              <div className="modal-inputs">
                <label>Product Name</label>
                <input type="text" placeholder="e.g. Office Chair" value={incidentForm.product_name} onChange={(e) => setIncidentForm({...incidentForm, product_name: e.target.value})} required />
                <label>Description (Damaged, Missing, etc.)</label>
                <textarea rows="4" placeholder="e.g. 2 pieces arrived damaged" value={incidentForm.description} onChange={(e) => setIncidentForm({...incidentForm, description: e.target.value})} required />
              </div>
              <div className="action-buttons" style={{ marginTop: '20px' }}>
                <button type="submit" className="btn-add" style={{ backgroundColor: '#d32f2f' }}>Submit Report</button>
                <button type="button" className="btn-cancel" onClick={() => setShowIncidentModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Product</h2>
            <form onSubmit={handleAddAppliance}>
              <div className="modal-inputs">
                <label>Product Name</label><input type="text" value={productForm.name} onChange={(e) => setProductForm({...productForm, name: e.target.value})} required />
                <label>Category</label><select value={productForm.category} onChange={(e) => setProductForm({...productForm, category: e.target.value})} className="dropdown-input">{categoriesList.map(c => <option key={c} value={c}>{c}</option>)}</select>
                <label>Item Code</label><input type="text" value={productForm.item_code} onChange={(e) => setProductForm({...productForm, item_code: e.target.value})} />
                <label>Brand</label><input type="text" value={productForm.brand} onChange={(e) => setProductForm({...productForm, brand: e.target.value})} />
                <label>Size</label><input type="text" value={productForm.size} onChange={(e) => setProductForm({...productForm, size: e.target.value})} />
                <label>Design</label><input type="text" value={productForm.design} onChange={(e) => setProductForm({...productForm, design: e.target.value})} />
                <label>Surface</label><input type="text" value={productForm.surface} onChange={(e) => setProductForm({...productForm, surface: e.target.value})} />
                <label>Texture</label><input type="text" value={productForm.texture} onChange={(e) => setProductForm({...productForm, texture: e.target.value})} />
                <label>Class</label><input type="text" value={productForm.class_type} onChange={(e) => setProductForm({...productForm, class_type: e.target.value})} />
                <label>Special Specs</label><input type="text" value={productForm.special_specs} onChange={(e) => setProductForm({...productForm, special_specs: e.target.value})} />
                <label>Quantity</label><input type="number" value={productForm.quantity} onChange={(e) => setProductForm({...productForm, quantity: e.target.value})} required />
                <label>Price (₱)</label><input type="number" step="0.01" value={productForm.price} onChange={(e) => setProductForm({...productForm, price: e.target.value})} required />
              </div>
              <div className="action-buttons" style={{ marginTop: '20px' }}>
                <button type="submit" className="btn-add">Save Product</button>
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedItem.name}</h2>
            <img src="https://via.placeholder.com/200?text=No+Image" alt={selectedItem.name} className="modal-image" />

            {userRole === 'admin' ? (
              <div className="modal-inputs">
                <h4>Edit Item Information & Restock</h4>
                <label>Name</label><input type="text" value={editFormData.name || ''} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} />
                <label>Category</label><select value={editFormData.category || 'Furniture'} onChange={(e) => setEditFormData({...editFormData, category: e.target.value})} className="dropdown-input">{categoriesList.map(c => <option key={c} value={c}>{c}</option>)}</select>
                <label>Item Code</label><input type="text" value={editFormData.item_code || ''} onChange={(e) => setEditFormData({...editFormData, item_code: e.target.value})} />
                <label>Brand</label><input type="text" value={editFormData.brand || ''} onChange={(e) => setEditFormData({...editFormData, brand: e.target.value})} />
                <label>Quantity (Stock)</label><input type="number" value={editFormData.quantity || 0} onChange={(e) => setEditFormData({...editFormData, quantity: e.target.value})} />
                <label>Price (₱)</label><input type="number" step="0.01" value={editFormData.price || 0} onChange={(e) => setEditFormData({...editFormData, price: e.target.value})} />

                <hr style={{ borderColor: '#37474f', margin: '15px 0' }} />
                
                <h4>Request Warehouse Restock</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.85rem' }}>Restock Quantity:</label>
                  <input type="number" min="1" value={purchaseQty} onChange={(e) => setPurchaseQty(Number(e.target.value))} style={{ width: '80px', textAlign: 'center', padding: '6px' }} />
                </div>

                <div className="action-buttons">
                  <button className="btn-save" style={{ backgroundColor: '#ff8f00' }} onClick={handleAdminRestockRequest}>Restock</button>
                  <button className="btn-save" style={{ backgroundColor: '#1976d2' }} onClick={handleAdminSaveEdit}>Save Changes</button>
                  <button className="btn-delete" onClick={() => handleDelete(selectedItem.id)}>Delete Item</button>
                  <button className="btn-cancel" onClick={() => setSelectedItem(null)}>Close</button>
                </div>
              </div>
            ) : userRole === 'staff' ? (
              <div>
                <p><strong>Brand:</strong> {selectedItem.brand}</p>
                <p><strong>Item Code:</strong> {selectedItem.item_code}</p>
                <p><strong>Category:</strong> {selectedItem.category}</p>
                <p><strong>Price:</strong> ₱{Number(selectedItem.price).toFixed(2)}</p>
                <p><strong>Stock Available:</strong> {selectedItem.quantity}</p>

                <hr style={{ borderColor: '#37474f', margin: '15px 0' }} />
                <h4>Process Sale</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                  <label>Quantity to Buy:</label>
                  <input type="number" min="1" max={selectedItem.quantity} value={purchaseQty} onChange={(e) => setPurchaseQty(Number(e.target.value))} style={{ width: '70px', textAlign: 'center' }} />
                </div>

                <div className="action-buttons">
                  <button className="btn-save" style={{ backgroundColor: '#2e7d32' }} onClick={handleCustomerPurchase}>Purchase Item</button>
                  <button className="btn-cancel" onClick={() => setSelectedItem(null)}>Close</button>
                </div>
              </div>
            ) : (
              // WAREHOUSE VIEW ONLY
              <div>
                <p><strong>Brand:</strong> {selectedItem.brand}</p>
                <p><strong>Item Code:</strong> {selectedItem.item_code}</p>
                <p><strong>Category:</strong> {selectedItem.category}</p>
                <p><strong>Price:</strong> ₱{Number(selectedItem.price).toFixed(2)}</p>
                <p><strong>Stock Available:</strong> {selectedItem.quantity}</p>

                <div className="action-buttons" style={{ marginTop: '20px' }}>
                  <button className="btn-cancel" onClick={() => setSelectedItem(null)}>Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;