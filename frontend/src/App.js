import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('emerald_logged_in') === 'true');
  const [userRole, setUserRole] = useState(() => localStorage.getItem('emerald_user_role') || '');
  const [username, setUsername] = useState(() => localStorage.getItem('emerald_username') || '');
  const [activeTab, setActiveTab] = useState('home');

  const [isRegistering, setIsRegistering] = useState(false);
  const [registerRole, setRegisterRole] = useState('staff');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [appliances, setAppliances] = useState([]);
  const [orders, setOrders] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [search, setSearch] = useState('');

  // Main & Sub Category States
  const [selectedMainCategory, setSelectedMainCategory] = useState('All');
  const [selectedSubCategory, setSelectedSubCategory] = useState('All');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentForm, setIncidentForm] = useState({ title: '', description: '' });

  // New Product Form State
  const [productForm, setProductForm] = useState({
    name: '',
    category: 'Furniture',
    sub_category: 'Chairs & Tables',
    item_code: '',
    brand: '',
    size: '',
    design: '',
    surface: '',
    texture: '',
    class_type: 'A',
    special_specs: '',
    image_url: '',
    quantity: '',
    price: ''
  });

  const [selectedItem, setSelectedItem] = useState(null);
  const [purchaseQty, setPurchaseQty] = useState(1);
  const [editFormData, setEditFormData] = useState({});

  const categoryHierarchy = {
    'Furniture': [
      'Chairs & Tables',
      'Racks & Shelves',
      'Wardrobe & Cabinets',
      'Office Furniture'
    ],
    'Storage and Organizer': [
      'Laundry Organizers',
      'Plastic Containers & Crates',
      'Kitchen Storage & Accessories',
      'Toolboxes & Storage Boxes'
    ],
    'Appliance': [
      'Electric Fans',
      'Washing Machines',
      'Air Cooling & Conditioning',
      'Small Home Appliances'
    ]
  };

  const fetchAppliances = useCallback(async () => {
    try {
      let url = 'http://localhost:5000/api/inventory';
      const params = new URLSearchParams();

      if (selectedMainCategory !== 'All') params.append('category', selectedMainCategory);
      if (selectedSubCategory !== 'All') params.append('sub_category', selectedSubCategory);

      if (params.toString()) url += `?${params.toString()}`;

      const response = await axios.get(url);
      setAppliances(response.data.map(item => ({ ...item, max_stock: item.max_stock || item.quantity || 100 })));
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  }, [selectedMainCategory, selectedSubCategory]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

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
      fetchIncidents();
    }
  }, [isLoggedIn, fetchAppliances, fetchIncidents]);

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
    const activeSub = (selectedSubCategory !== 'All' && categoryHierarchy[activeCat]?.includes(selectedSubCategory))
      ? selectedSubCategory
      : categoryHierarchy[activeCat][0];

    setProductForm({
      name: '',
      category: activeCat,
      sub_category: activeSub,
      item_code: '',
      brand: '',
      size: '',
      design: '',
      surface: '',
      texture: '',
      class_type: 'A',
      special_specs: '',
      image_url: '',
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
        image_url: productForm.image_url || 'https://via.placeholder.com/200?text=No+Image',
        quantity: Number(productForm.quantity),
        price: Number(productForm.price)
      });
      setShowAddModal(false);
      fetchAppliances();
      alert('Product added successfully!');
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add item.');
    }
  };

  const handleAddIncident = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/incidents', {
        title: incidentForm.title,
        description: incidentForm.description,
        reported_by: username || 'User'
      });
      setShowIncidentModal(false);
      setIncidentForm({ title: '', description: '' });
      fetchIncidents();
      alert('Incident report submitted successfully!');
    } catch (error) {
      console.error('Error submitting incident:', error);
      alert('Failed to submit incident report. Ensure server.js has the /api/incidents route.');
    }
  };

  const handleUpdateIncidentStatus = async (id, targetStatus) => {
    try {
      await axios.put(`http://localhost:5000/api/incidents/${id}/status`, { status: targetStatus });
      fetchIncidents();
    } catch (error) {
      alert('Failed to update incident status.');
    }
  };

  const openCardModal = (item) => {
    setSelectedItem(item);
    setPurchaseQty(1);
    setEditFormData({ ...item });
  };

  const handleAdminPurchase = async () => {
    if (purchaseQty <= 0) return alert('Please enter a valid purchase quantity!');
    const totalPrice = purchaseQty * selectedItem.price;

    try {
      await axios.post('http://localhost:5000/api/orders', {
        appliance_id: selectedItem.id,
        appliance_name: selectedItem.name,
        quantity: purchaseQty,
        total_price: totalPrice,
        created_by: username || 'Admin'
      });
      setSelectedItem(null);
      fetchOrders();
      alert('Purchase request created and sent to Staff.');
    } catch (error) {
      alert('Failed to complete purchase.');
    }
  };

  const handleUpdateOrderStatus = async (orderId, targetStatus) => {
    try {
      await axios.put(`http://localhost:5000/api/orders/${orderId}/status`, { status: targetStatus });
      fetchOrders();
      fetchAppliances();
    } catch (error) {
      alert('Failed to update order status.');
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
    const matchesSub = selectedSubCategory === 'All' || 
      (item.sub_category && item.sub_category.trim() === selectedSubCategory.trim());
    const matchesSearch = 
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.item_code && item.item_code.toLowerCase().includes(search.toLowerCase())) ||
      (item.brand && item.brand.toLowerCase().includes(search.toLowerCase()));

    return matchesMain && matchesSub && matchesSearch;
  });

  const pendingOrdersCount = orders.filter((order) => order.status !== 'Received by Admin').length;
  const openIncidentsCount = incidents.filter((inc) => inc.status === 'Open').length;
  const totalNotificationBadge = pendingOrdersCount + openIncidentsCount;

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
          <p>Browse products, manage inventory stock, and track order notifications.</p>
          <small style={{ color: '#81c784' }}>Logged in as: <strong>{userRole.toUpperCase()}</strong> ({username})</small>
        </div>
        <div className="top-right-nav">
          <button className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>Home</button>
          <button className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
          <button className={`nav-btn ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
            Notification {totalNotificationBadge > 0 && <span className="badge">{totalNotificationBadge}</span>}
          </button>
          <button className={`nav-btn ${activeTab === 'services' ? 'active' : ''}`} onClick={() => setActiveTab('services')}>Services</button>
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
                onClick={() => { setSelectedMainCategory('All'); setSelectedSubCategory('All'); }}
              >
                <span className="cat-icon">📦</span>
                <span>All Categories</span>
              </div>
              {Object.keys(categoryHierarchy).map((mainCat) => (
                <div 
                  key={mainCat} 
                  className={`category-card ${selectedMainCategory === mainCat ? 'active' : ''}`} 
                  onClick={() => { setSelectedMainCategory(mainCat); setSelectedSubCategory('All'); }}
                >
                  <span className="cat-icon">{mainCat === 'Furniture' ? '🛋️' : mainCat === 'Storage and Organizer' ? '📦' : '🔌'}</span>
                  <span>{mainCat}</span>
                </div>
              ))}
            </div>

            {selectedMainCategory !== 'All' && (
              <div className="subcategory-bar">
                <span style={{ color: '#81c784', fontSize: '0.85rem', fontWeight: 'bold' }}>Sub-Categories under {selectedMainCategory}:</span>
                <div className="subcategory-chips">
                  <button 
                    className={`sub-chip ${selectedSubCategory === 'All' ? 'active' : ''}`}
                    onClick={() => setSelectedSubCategory('All')}
                  >
                    All Types
                  </button>
                  {categoryHierarchy[selectedMainCategory].map((subCat) => (
                    <button 
                      key={subCat} 
                      className={`sub-chip ${selectedSubCategory === subCat ? 'active' : ''}`}
                      onClick={() => setSelectedSubCategory(subCat)}
                    >
                      {subCat}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0', flexWrap: 'wrap', gap: '10px' }}>
            <input type="text" className="search-input" placeholder="Search by name, item code, brand..." value={search} onChange={(e) => setSearch(e.target.value)} />
            
            {userRole === 'admin' && (
              <button className="btn-add" onClick={openAddModal} style={{ fontSize: '0.95rem', padding: '10px 20px' }}>
                + Add New Product
              </button>
            )}
          </div>

          <h3>Product Catalog ({selectedMainCategory} {selectedSubCategory !== 'All' ? `> ${selectedSubCategory}` : ''})</h3>
          
          <div className="product-grid">
            {filteredAppliances.length > 0 ? (
              filteredAppliances.map((item) => {
                const isLowStock = item.quantity <= (item.max_stock || item.quantity) * 0.5;
                return (
                  <div key={item.id} className="product-card" onClick={() => openCardModal(item)}>
                    <div style={{ position: 'relative' }}>
                      <img src={item.image_url || 'https://via.placeholder.com/200?text=No+Image'} alt={item.name} className="product-image" />
                      {isLowStock && <span className="low-stock-badge" title="Low Stock!">!</span>}
                    </div>
                    <div className="product-name">{item.name}</div>
                    
                    <div className="product-specs-list">
                      {item.sub_category && <div className="spec-row"><span className="spec-label">Sub Category:</span> <span className="spec-val">{item.sub_category}</span></div>}
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
                    <div className="product-stock" style={{ color: isLowStock ? '#ef5350' : '#b0bec5' }}>Stock: {item.quantity}</div>
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
        <div className="tab-content">
          <div className="services-section">
            <h3>System Dashboard Overview</h3>
            <div className="services-grid">
              <div className="service-card"><h4>📦 Total Products</h4><p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#81c784' }}>{appliances.length}</p></div>
              <div className="service-card"><h4>📋 Total Orders</h4><p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#81c784' }}>{orders.length}</p></div>
              <div className="service-card"><h4>⚠️ Open Incidents</h4><p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef5350' }}>{openIncidentsCount}</p></div>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATION TAB WITH INCIDENT REPORTS */}
      {activeTab === 'notifications' && (
        <div className="tab-content">
          <div className="notification-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0 }}>🚨 Incident Reports & Feedback</h3>
              <button className="btn-add" onClick={() => setShowIncidentModal(true)} style={{ backgroundColor: '#d32f2f' }}>
                + File Incident Report
              </button>
            </div>

            <div className="orders-grid" style={{ marginBottom: '30px' }}>
              {incidents.length > 0 ? (
                incidents.map((inc) => {
                  const isOpen = inc.status === 'Open';
                  return (
                    <div key={inc.id} className={`order-card ${isOpen ? 'status-yellow' : 'status-green'}`}>
                      <div className="order-header">
                        <strong>Incident #{inc.id}: {inc.title}</strong>
                        <span className="order-status-badge">{inc.status}</span>
                      </div>
                      <div className="order-details">
                        <p><strong>Description:</strong> {inc.description}</p>
                        <p><small>Reported by: {inc.reported_by} on {new Date(inc.created_at).toLocaleString()}</small></p>
                      </div>
                      {userRole === 'staff' && isOpen && (
                        <button className="btn-status-action" style={{ backgroundColor: '#2e7d32' }} onClick={() => handleUpdateIncidentStatus(inc.id, 'Resolved')}>
                          Mark as Resolved
                        </button>
                      )}
                      {!isOpen && <div className="status-note-success"><small>✅ Resolved</small></div>}
                    </div>
                  );
                })
              ) : (<p className="no-notifications">No incident reports found.</p>)}
            </div>

            <h3>{userRole === 'admin' ? 'Admin Purchase Records & Live Order Status' : 'Staff Purchase Notifications & Dispatch Tracker'}</h3>
            <div className="orders-grid">
              {orders.length > 0 ? (
                orders.map((order) => {
                  const isGreen = order.status === 'Shipped' || order.status === 'Received by Admin';
                  return (
                    <div key={order.id} className={`order-card ${isGreen ? 'status-green' : 'status-yellow'}`}>
                      <div className="order-header"><strong>Order #{order.id}</strong><span className="order-status-badge">{order.status}</span></div>
                      <div className="order-details">
                        <p><strong>Item:</strong> {order.appliance_name}</p>
                        <p><strong>Qty:</strong> {order.quantity} | <strong>Total:</strong> ₱{Number(order.total_price).toFixed(2)}</p>
                        <p><small>Purchased by: {order.created_by}</small></p>
                      </div>
                      {userRole === 'staff' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                          {order.status === 'Pending' && <button className="btn-status-action" onClick={() => handleUpdateOrderStatus(order.id, 'Received by Staff')}>Receive Purchase</button>}
                          {order.status === 'Received by Staff' && <button className="btn-status-action" style={{ backgroundColor: '#1b5e20' }} onClick={() => handleUpdateOrderStatus(order.id, 'Shipped')}>Shipped Purchase</button>}
                          {order.status === 'Shipped' && <div className="status-note"><small>✈️ Shipped! Waiting for Admin...</small></div>}
                          {order.status === 'Received by Admin' && <div className="status-note-success"><small>✅ Received Successfully!</small></div>}
                        </div>
                      )}
                      {userRole === 'admin' && (
                        <div style={{ marginTop: '10px' }}>
                          {order.status === 'Shipped' ? (
                            <button className="btn-status-action" style={{ backgroundColor: '#2e7d32' }} onClick={() => handleUpdateOrderStatus(order.id, 'Received by Admin')}>Confirm Received</button>
                          ) : (
                            <div className="admin-status-note"><small>Live Status: <strong>{order.status}</strong></small></div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (<p className="no-notifications">No purchase records found</p>)}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'services' && (
        <div className="tab-content">
          <div className="services-section">
            <h3>Emerald System Services</h3>
            <div className="services-grid">
              <div className="service-card"><h4>📦 Inventory Management</h4><p>Track stock levels in real time across hierarchical categories.</p></div>
              <div className="service-card"><h4>🚚 Order Processing</h4><p>Streamline purchases through automated workflows.</p></div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL FOR FILING INCIDENT REPORT */}
      {showIncidentModal && (
        <div className="modal-overlay" onClick={() => setShowIncidentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Report an Incident / Issue</h2>
            <form onSubmit={handleAddIncident}>
              <div className="modal-inputs">
                <label>Issue Title</label>
                <input type="text" placeholder="e.g., Broken Shelf, Missing Stock" value={incidentForm.title} onChange={(e) => setIncidentForm({...incidentForm, title: e.target.value})} required />

                <label>Description & Feedback</label>
                <textarea 
                  rows="4" 
                  placeholder="Describe what went wrong in detail..." 
                  value={incidentForm.description} 
                  onChange={(e) => setIncidentForm({...incidentForm, description: e.target.value})} 
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #2e7d32', background: '#121814', color: 'white', resize: 'vertical' }}
                  required 
                />
              </div>

              <div className="action-buttons" style={{ marginTop: '20px' }}>
                <button type="submit" className="btn-add" style={{ backgroundColor: '#d32f2f' }}>Submit Report</button>
                <button type="button" className="btn-cancel" onClick={() => setShowIncidentModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP MODAL FOR ADDING NEW PRODUCT */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Product & Specifications</h2>
            <form onSubmit={handleAddAppliance}>
              <div className="modal-inputs">
                <label>Product Name</label>
                <input type="text" placeholder="Product Name" value={productForm.name} onChange={(e) => setProductForm({...productForm, name: e.target.value})} required />

                <label>Main Category</label>
                <select 
                  value={productForm.category} 
                  onChange={(e) => {
                    const newCat = e.target.value;
                    setProductForm({...productForm, category: newCat, sub_category: categoryHierarchy[newCat][0]});
                  }} 
                  className="dropdown-input"
                >
                  {Object.keys(categoryHierarchy).map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <label>Sub Category / Type</label>
                <select 
                  value={productForm.sub_category} 
                  onChange={(e) => setProductForm({...productForm, sub_category: e.target.value})} 
                  className="dropdown-input"
                >
                  {categoryHierarchy[productForm.category]?.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                </select>

                <label>Item Code</label>
                <input type="text" placeholder="Item Code" value={productForm.item_code} onChange={(e) => setProductForm({...productForm, item_code: e.target.value})} />

                <label>Brand</label>
                <input type="text" placeholder="Brand" value={productForm.brand} onChange={(e) => setProductForm({...productForm, brand: e.target.value})} />

                <label>Size</label>
                <input type="text" placeholder="Size" value={productForm.size} onChange={(e) => setProductForm({...productForm, size: e.target.value})} />

                <label>Design</label>
                <input type="text" placeholder="Design" value={productForm.design} onChange={(e) => setProductForm({...productForm, design: e.target.value})} />

                <label>Surface</label>
                <input type="text" placeholder="Surface" value={productForm.surface} onChange={(e) => setProductForm({...productForm, surface: e.target.value})} />

                <label>Texture</label>
                <input type="text" placeholder="Texture" value={productForm.texture} onChange={(e) => setProductForm({...productForm, texture: e.target.value})} />

                <label>Class</label>
                <input type="text" placeholder="Class" value={productForm.class_type} onChange={(e) => setProductForm({...productForm, class_type: e.target.value})} />

                <label>Special Specs</label>
                <input type="text" placeholder="Special Specs" value={productForm.special_specs} onChange={(e) => setProductForm({...productForm, special_specs: e.target.value})} />

                <label>Image URL</label>
                <input type="text" placeholder="Image URL" value={productForm.image_url} onChange={(e) => setProductForm({...productForm, image_url: e.target.value})} />

                <label>Quantity</label>
                <input type="number" placeholder="Quantity" value={productForm.quantity} onChange={(e) => setProductForm({...productForm, quantity: e.target.value})} required />

                <label>Price (₱)</label>
                <input type="number" step="0.01" placeholder="Price" value={productForm.price} onChange={(e) => setProductForm({...productForm, price: e.target.value})} required />
              </div>

              <div className="action-buttons" style={{ marginTop: '20px' }}>
                <button type="submit" className="btn-add">Save Product</button>
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP MODAL FOR PRODUCT DETAILS & EDITING/PURCHASING */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedItem.name}</h2>
            <img src={selectedItem.image_url || 'https://via.placeholder.com/200?text=No+Image'} alt={selectedItem.name} className="modal-image" />

            {userRole === 'admin' ? (
              <div className="modal-inputs">
                <h4>Edit Item Information & Specifications</h4>
                <label>Name</label><input type="text" value={editFormData.name || ''} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} />
                <label>Main Category</label>
                <select 
                  value={editFormData.category || 'Furniture'} 
                  onChange={(e) => {
                    const newCat = e.target.value;
                    setEditFormData({...editFormData, category: newCat, sub_category: categoryHierarchy[newCat]?.[0] || ''});
                  }} 
                  className="dropdown-input"
                >
                  {Object.keys(categoryHierarchy).map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <label>Sub Category / Type</label>
                <select 
                  value={editFormData.sub_category || ''} 
                  onChange={(e) => setEditFormData({...editFormData, sub_category: e.target.value})} 
                  className="dropdown-input"
                >
                  {categoryHierarchy[editFormData.category || 'Furniture']?.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                </select>

                <label>Item Code</label><input type="text" value={editFormData.item_code || ''} onChange={(e) => setEditFormData({...editFormData, item_code: e.target.value})} />
                <label>Brand</label><input type="text" value={editFormData.brand || ''} onChange={(e) => setEditFormData({...editFormData, brand: e.target.value})} />
                <label>Size</label><input type="text" value={editFormData.size || ''} onChange={(e) => setEditFormData({...editFormData, size: e.target.value})} />
                <label>Design</label><input type="text" value={editFormData.design || ''} onChange={(e) => setEditFormData({...editFormData, design: e.target.value})} />
                <label>Surface</label><input type="text" value={editFormData.surface || ''} onChange={(e) => setEditFormData({...editFormData, surface: e.target.value})} />
                <label>Texture</label><input type="text" value={editFormData.texture || ''} onChange={(e) => setEditFormData({...editFormData, texture: e.target.value})} />
                <label>Class</label><input type="text" value={editFormData.class || ''} onChange={(e) => setEditFormData({...editFormData, class: e.target.value})} />
                <label>Special Specs</label><input type="text" value={editFormData.special_specs || ''} onChange={(e) => setEditFormData({...editFormData, special_specs: e.target.value})} />
                <label>Image URL</label><input type="text" value={editFormData.image_url || ''} onChange={(e) => setEditFormData({...editFormData, image_url: e.target.value})} />
                <label>Quantity</label><input type="number" value={editFormData.quantity || 0} onChange={(e) => setEditFormData({...editFormData, quantity: e.target.value})} />
                <label>Price (₱)</label><input type="number" step="0.01" value={editFormData.price || 0} onChange={(e) => setEditFormData({...editFormData, price: e.target.value})} />

                <hr style={{ borderColor: '#37474f', margin: '15px 0' }} />
                <h4>Admin Purchase Request (Restock)</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label>Quantity to Purchase:</label>
                  <input type="number" min="1" value={purchaseQty} onChange={(e) => setPurchaseQty(Number(e.target.value))} style={{ width: '70px', textAlign: 'center' }} />
                </div>
                <div className="action-buttons">
                  <button className="btn-save" onClick={handleAdminPurchase}>Purchase Item</button>
                  <button className="btn-save" style={{ backgroundColor: '#1976d2' }} onClick={handleAdminSaveEdit}>Save Changes</button>
                  <button className="btn-delete" onClick={() => handleDelete(selectedItem.id)}>Delete Item</button>
                  <button className="btn-cancel" onClick={() => setSelectedItem(null)}>Close</button>
                </div>
              </div>
            ) : (
              <div>
                <p><strong>Brand:</strong> {selectedItem.brand}</p>
                <p><strong>Item Code:</strong> {selectedItem.item_code}</p>
                <p><strong>Category:</strong> {selectedItem.category} &gt; {selectedItem.sub_category}</p>
                <p><strong>Size:</strong> {selectedItem.size}</p>
                <p><strong>Design:</strong> {selectedItem.design}</p>
                <p><strong>Surface:</strong> {selectedItem.surface} | <strong>Texture:</strong> {selectedItem.texture}</p>
                <p><strong>Class:</strong> {selectedItem.class} | <strong>Specs:</strong> {selectedItem.special_specs}</p>
                <p><strong>Price:</strong> ₱{Number(selectedItem.price).toFixed(2)}</p>
                <p><strong>Stock:</strong> {selectedItem.quantity}</p>
                <div className="action-buttons"><button className="btn-cancel" onClick={() => setSelectedItem(null)}>Close</button></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;