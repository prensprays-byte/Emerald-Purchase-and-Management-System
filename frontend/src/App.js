import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => sessionStorage.getItem('emerald_logged_in') === 'true');
  const [userRole, setUserRole] = useState(() => sessionStorage.getItem('emerald_user_role') || '');
  const [username, setUsername] = useState(() => sessionStorage.getItem('emerald_username') || '');
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
  const [showRestockConfirmModal, setShowRestockConfirmModal] = useState(false);
  const [showSaleConfirmModal, setShowSaleConfirmModal] = useState(false);
  const [isSubmittingRestock, setIsSubmittingRestock] = useState(false);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

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

  const syncChannelRef = useRef(null);

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

  const refreshAllData = useCallback(async () => {
    await Promise.all([
      fetchAppliances(),
      fetchOrders(),
      fetchPurchases(),
      fetchIncidents()
    ]);
    if (userRole === 'admin' || userRole === 'audit') {
      await fetchUsers();
    }
  }, [userRole, fetchAppliances, fetchOrders, fetchPurchases, fetchIncidents, fetchUsers]);

  const notifyOtherTabs = (eventType) => {
    if (syncChannelRef.current) {
      syncChannelRef.current.postMessage({ type: eventType });
    }
  };

  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('emerald_system_sync');
      syncChannelRef.current = channel;
      channel.onmessage = () => {
        if (isLoggedIn) {
          refreshAllData();
        }
      };
      return () => {
        channel.close();
        syncChannelRef.current = null;
      };
    }
  }, [isLoggedIn, refreshAllData]);

  useEffect(() => {
    if (!isLoggedIn) return;

    refreshAllData();

    const intervalId = setInterval(() => {
      refreshAllData();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [isLoggedIn, refreshAllData]);

  const navigateToTab = (tabName) => {
    setActiveTab(tabName);
    setNotiFilter('all');
    if (isLoggedIn) {
      refreshAllData();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/login', { username: loginUsername, password: loginPassword });
      if (response.data.message === 'Login successful') {
        const user = response.data.user;
        setIsLoggedIn(true);
        setUserRole(user.role);
        setUsername(user.username);
        setActiveTab('home');
        setNotiFilter('all');

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
    setShowRestockConfirmModal(false);
    setShowSaleConfirmModal(false);
    setActiveTab('home');
    setNotiFilter('all');
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
      await fetchAppliances();
      notifyOtherTabs('inventory_updated');
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
      await fetchIncidents();
      notifyOtherTabs('incidents_updated');
      alert('Incident report submitted to warehouse successfully!');
    } catch (error) {
      console.error('Error submitting incident:', error);
      alert('Failed to submit incident report.');
    }
  };

  const openCardModal = (item) => {
    setSelectedItem(item);
    setShowRestockConfirmModal(false);
    setShowSaleConfirmModal(false);
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

  // Step 1: Open second verification confirmation popup
  const handleOpenRestockVerification = () => {
    if (!purchaseQty || Number(purchaseQty) <= 0) {
      alert('Please enter a valid restock quantity!');
      return;
    }
    setShowRestockConfirmModal(true);
  };

  // Step 2: Execute API request after second verification
  const handleConfirmRestockRequest = async () => {
    const qtyNum = Number(purchaseQty);
    if (!selectedItem || qtyNum <= 0) return;
    setIsSubmittingRestock(true);
    const totalPrice = qtyNum * Number(selectedItem.price);

    try {
      await axios.post('http://localhost:5000/api/orders', {
        appliance_id: selectedItem.id,
        appliance_name: selectedItem.name,
        quantity: qtyNum,
        total_price: totalPrice,
        created_by: username || userRole
      });
      setShowRestockConfirmModal(false);
      setSelectedItem(null);
      await fetchOrders();
      notifyOtherTabs('orders_updated');
      alert(`Restock request for ${qtyNum}x ${selectedItem.name} sent to warehouse successfully!`);
    } catch (error) {
      alert('Failed to send restock request.');
    } finally {
      setIsSubmittingRestock(false);
    }
  };

  // Step 1 (Staff): Open second verification popup for customer sale
  const handleOpenSaleVerification = () => {
    const qtyNum = Number(purchaseQty);
    if (!qtyNum || qtyNum <= 0) {
      alert('Please enter a valid quantity to buy!');
      return;
    }
    if (!selectedItem || qtyNum > Number(selectedItem.quantity)) {
      alert('Not enough stock available!');
      return;
    }
    setShowSaleConfirmModal(true);
  };

  // Step 2 (Staff): Execute sale after second verification
  const handleConfirmCustomerPurchase = async () => {
    const qtyNum = Number(purchaseQty);
    if (!selectedItem || qtyNum <= 0) return;
    if (qtyNum > Number(selectedItem.quantity)) {
      alert('Not enough stock available!');
      return;
    }

    setIsSubmittingSale(true);
    try {
      await axios.post('http://localhost:5000/api/purchase', {
        appliance_id: selectedItem.id,
        quantity: qtyNum,
        created_by: username || 'Staff'
      });
      setShowSaleConfirmModal(false);
      setSelectedItem(null);
      await Promise.all([fetchAppliances(), fetchPurchases()]);
      notifyOtherTabs('purchases_updated');
      alert(`Successfully processed sale of ${qtyNum}x ${selectedItem.name}! Recorded to history.`);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to complete purchase.');
    } finally {
      setIsSubmittingSale(false);
    }
  };

  const handleUpdateOrderStatus = async (e, orderId, targetStatus) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const actor = username || userRole;
    setOrders((prevOrders) =>
      prevOrders.map((ord) => {
        if (ord.id !== orderId) return ord;
        const patch = { status: targetStatus };
        if (targetStatus === 'Restock Received by Warehouse') patch.received_by_wh = actor;
        if (targetStatus === 'Shipping') patch.shipped_by = actor;
        return { ...ord, ...patch };
      })
    );

    try {
      const response = await axios.put(`http://localhost:5000/api/orders/${orderId}/status`, {
        status: targetStatus,
        username: actor
      });
      if (response.status === 200) {
        await Promise.all([fetchOrders(), fetchAppliances()]);
        notifyOtherTabs('orders_updated');
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
        received_quantity: actualQty,
        username: username || userRole
      });
      if (response.status === 200) {
        await Promise.all([fetchOrders(), fetchAppliances()]);
        notifyOtherTabs('orders_updated');
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
      await fetchAppliances();
      notifyOtherTabs('inventory_updated');
      alert('Item updated successfully!');
    } catch (error) {
      alert('Failed to update item.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await axios.delete(`http://localhost:5000/api/inventory/${id}`);
      setSelectedItem(null);
      await fetchAppliances();
      notifyOtherTabs('inventory_updated');
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      await axios.put(`http://localhost:5000/api/users/${userId}/role`, { role: newRole });
      await fetchUsers();
      notifyOtherTabs('users_updated');
      alert('User role updated successfully!');
    } catch (error) {
      alert('Failed to update user role.');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await axios.delete(`http://localhost:5000/api/users/${userId}`);
        await fetchUsers();
        notifyOtherTabs('users_updated');
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
    return st === 'pending restock' || st === '';
  });

  const onProcessRestocks = orders.filter((order) => {
    const st = (order.status || '').toLowerCase();
    return st === 'restock received by warehouse';
  });

  const toShipRestocks = orders.filter((order) => {
    const st = (order.status || '').toLowerCase();
    return st === 'shipping';
  });

  const successfulRestocks = orders.filter((order) => {
    const st = (order.status || '').toLowerCase();
    return st === 'received by admin';
  });

  const openIncidents = incidents.filter((inc) => inc.status === 'Open');
  const totalNotificationBadge = pendingRestocks.length + onProcessRestocks.length + toShipRestocks.length + openIncidents.length;

  const globalBackgroundStyle = {
    backgroundImage: `linear-gradient(rgba(11, 15, 12, 0.72), rgba(11, 15, 12, 0.82)), url(${process.env.PUBLIC_URL}/emerald-bg.png)`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    backgroundRepeat: 'no-repeat'
  };

  if (!isLoggedIn) {
    return (
      <div className="login-container auth-background" style={globalBackgroundStyle}>
        <form onSubmit={isRegistering ? handleRegister : handleLogin} className="login-card">
          <h2>Emerald System</h2>
          <p>{isRegistering ? 'Create a new account' : 'Please log in'}</p>
          {loginError && <div className="error-message">{loginError}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}

          <div className="form-group">
            <label>Username</label>
            <input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
          </div>

          <button type="submit" className="btn-login">{isRegistering ? 'Register' : 'Log In'}</button>

          <div className="login-toggle-wrapper">
            <button type="button" className="toggle-link-btn" onClick={() => { setIsRegistering(!isRegistering); setLoginError(''); setSuccessMessage(''); }}>
              {isRegistering ? 'Already have an account? Log in' : "Don't have an account? Register"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="app-layout" style={globalBackgroundStyle}>
      {/* Hide native up/down number arrows & style 3-line sidebar toggle */}
      <style>{`
        .no-spinner::-webkit-outer-spin-button,
        .no-spinner::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinner {
          -moz-appearance: textfield;
          appearance: textfield;
        }
        .hamburger-toggle-btn {
          width: 40px;
          height: 38px;
          border-radius: 8px;
          border: 1px solid rgba(129, 199, 132, 0.35);
          background-color: rgba(16, 28, 21, 0.92);
          color: #81c784;
          font-size: 20px;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.2s ease, border-color 0.2s ease;
          flex-shrink: 0;
        }
        .hamburger-toggle-btn:hover {
          background-color: rgba(129, 199, 132, 0.18);
          border-color: #81c784;
        }
        .sidebar-header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .header-title-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
      `}</style>

      {/* SIDEBAR NAVIGATION */}
      {isSidebarOpen && (
        <div className="sidebar-container">
          <div>
            <div className="sidebar-header-top">
              <h2 className="sidebar-brand" style={{ margin: 0 }}>Emerald System</h2>
              <button
                type="button"
                className="hamburger-toggle-btn"
                onClick={() => setIsSidebarOpen(false)}
                title="Hide side menu"
                aria-label="Hide side menu"
              >
                ☰
              </button>
            </div>
            <div className="sidebar-user-badge">
              Logged as: <strong>{userRole.toUpperCase()}</strong> ({username})
            </div>

            <div className="sidebar-nav-links">
              <button
                onClick={() => navigateToTab('home')}
                className={`nav-link ${activeTab === 'home' ? 'active' : ''}`}
              >
                <span> Home</span>
              </button>

              <button
                onClick={() => navigateToTab('dashboard')}
                className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
              >
                <span> Dashboard</span>
              </button>

              {(userRole === 'admin' || userRole === 'warehouse' || userRole === 'audit') && (
                <button
                  onClick={() => navigateToTab('notifications')}
                  className={`nav-link ${activeTab === 'notifications' ? 'active' : ''}`}
                >
                  <span> Notification</span>
                  {totalNotificationBadge > 0 && <span className="badge badge-red">{totalNotificationBadge}</span>}
                </button>
              )}

              {(userRole === 'staff' || userRole === 'admin' || userRole === 'audit') && (
                <button
                  onClick={() => navigateToTab('history')}
                  className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}
                >
                  <span> Purchase History</span>
                  {purchases.length > 0 && <span className="badge badge-blue">{purchases.length}</span>}
                </button>
              )}

              {(userRole === 'admin' || userRole === 'audit') && (
                <button
                  onClick={() => navigateToTab('roles')}
                  className={`nav-link ${activeTab === 'roles' ? 'active' : ''}`}
                >
                  <span> Role Management</span>
                </button>
              )}

              {userRole === 'admin' && (
                <button
                  onClick={() => navigateToTab('services')}
                  className={`nav-link ${activeTab === 'services' ? 'active' : ''}`}
                >
                  <span> Services</span>
                </button>
              )}
            </div>
          </div>

          <div>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="main-content-area">
        <div className="page-header">
          <div className="header-title-row">
            {!isSidebarOpen && (
              <button
                type="button"
                className="hamburger-toggle-btn"
                onClick={() => setIsSidebarOpen(true)}
                title="Show side menu"
                aria-label="Show side menu"
              >
                ☰
              </button>
            )}
            <h1 style={{ margin: 0 }}>Emerald Mini Depot Purchase and Management System</h1>
          </div>
          <p>Welcome back, {username}!</p>
        </div>

        {activeTab === 'home' && (
          <div className="tab-content">
            <div className="category-selection-container">
              <div className="main-category-banner">
                SELECT INVENTORY CATEGORY
              </div>

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

            <div className="toolbar-container">
              <input type="text" className="search-input" placeholder="Search product name, code, brand..." value={search} onChange={(e) => setSearch(e.target.value)} />

              {userRole === 'admin' && (
                <button className="btn-add" onClick={openAddModal}>
                  + Add New Product
                </button>
              )}
            </div>

            <h3 className="section-title">Product Catalog ({selectedMainCategory})</h3>

            <div className="product-grid">
              {filteredAppliances.length > 0 ? (
                filteredAppliances.map((item) => {
                  const isLowStock = item.quantity <= 50 || item.quantity <= (item.max_stock || 100) * 0.5;
                  return (
                    <div key={item.id} className="product-card" onClick={() => openCardModal(item)}>
                      {isLowStock && <span className="low-stock-badge" title="Low Stock (less than or equal to 50 or 50%)">!</span>}
                      <div className="product-name">{item.name}</div>

                      <div className="product-specs-list">
                        {item.brand && <div className="spec-row"><span className="spec-label">Brand:</span> <span className="spec-val">{item.brand}</span></div>}
                        {item.size && <div className="spec-row"><span className="spec-label">Size:</span> <span className="spec-val">{item.size}</span></div>}
                        {item.class && <div className="spec-row"><span className="spec-label">Class:</span> <span className="spec-val">{item.class}</span></div>}
                      </div>

                      <div className="product-price">₱{Number(item.price).toFixed(2)}</div>
                      <div className="product-stock" style={{ color: isLowStock ? '#ef4444' : '#9ca3af' }}>
                        Stock: {item.quantity} {isLowStock && '(Low Stock!)'}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state">No products found in this category</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="tab-content">
            <div className="dashboard-overview-card">
              <h3>Dashboard Overview</h3>
              <div className="services-grid">
                {(userRole === 'admin' || userRole === 'audit') && (
                  <>
                    <div className="service-card">
                      <h4>📦 Total Products</h4>
                      <p className="metric-value">{appliances.length}</p>
                    </div>
                    <div className="service-card">
                      <h4>📋 Total Orders</h4>
                      <p className="metric-value">{orders.length}</p>
                    </div>
                    <div className="service-card">
                      <h4>🛒 Total Sales</h4>
                      <p className="metric-value">{purchases.length}</p>
                    </div>
                    <div className="service-card">
                      <h4>⚠️ Open Incidents</h4>
                      <p className="metric-value metric-crimson">{openIncidents.length}</p>
                    </div>
                  </>
                )}
                {userRole === 'staff' && (
                  <>
                    <div className="service-card">
                      <h4>📦 Total Products</h4>
                      <p className="metric-value">{appliances.length}</p>
                    </div>
                    <div className="service-card">
                      <h4>🛒 Total Purchases Recorded</h4>
                      <p className="metric-value">{purchases.length}</p>
                    </div>
                  </>
                )}
                {userRole === 'warehouse' && (
                  <>
                    <div className="service-card">
                      <h4>⏳ Pending Restocks</h4>
                      <p className="metric-value metric-amber">{pendingRestocks.length}</p>
                    </div>
                    <div className="service-card">
                      <h4>⚙️ On Process</h4>
                      <p className="metric-value metric-amber">{onProcessRestocks.length}</p>
                    </div>
                    <div className="service-card">
                      <h4>🚚 To Ship (In Transit)</h4>
                      <p className="metric-value">{toShipRestocks.length}</p>
                    </div>
                    <div className="service-card">
                      <h4>✅ Successful Restocks</h4>
                      <p className="metric-value">{successfulRestocks.length}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Role Management Tab */}
        {activeTab === 'roles' && (userRole === 'admin' || userRole === 'audit') && (
          <div className="tab-content">
            <div className="table-container-card">
              <h3>👥 User Role Management {userRole === 'audit'}</h3>
              {systemUsers.length > 0 ? (
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Current Role</th>
                        {userRole === 'admin' && <th>Change Role</th>}
                        {userRole === 'admin' && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {systemUsers.map((u) => (
                        <tr key={u.id}>
                          <td className="table-muted">#{u.id}</td>
                          <td className="table-bold">{u.username}</td>
                          <td>
                            <span className={`role-badge role-${u.role}`}>
                              {u.role}
                            </span>
                          </td>
                          {userRole === 'admin' && (
                            <td>
                              <select
                                value={u.role}
                                onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                                className="dropdown-input role-select"
                              >
                                <option value="admin">Admin</option>
                                <option value="warehouse">Warehouse</option>
                                <option value="staff">Staff</option>
                                <option value="audit">Audit</option>
                              </select>
                            </td>
                          )}
                          {userRole === 'admin' && (
                            <td>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="btn-table-delete"
                              >
                                Delete User
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="no-notifications">No users found.</p>
              )}
            </div>
          </div>
        )}

        {/* PURCHASE HISTORY TABLE */}
        {activeTab === 'history' && (userRole === 'staff' || userRole === 'admin' || userRole === 'audit') && (
          <div className="tab-content">
            <div className="table-container-card">
              <h3>🛒 Customer Purchase History</h3>
              {purchases.length > 0 ? (
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Item Name</th>
                        <th>Qty</th>
                        <th>Total Price</th>
                        <th>Processed By</th>
                        <th>Date / Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.map((p) => (
                        <tr key={p.id}>
                          <td className="table-muted">#{p.id}</td>
                          <td className="table-bold">{p.appliance_name}</td>
                          <td>{p.quantity}</td>
                          <td className="table-emerald">₱{Number(p.total_price).toFixed(2)}</td>
                          <td className="table-muted">{p.purchased_by}</td>
                          <td className="table-muted text-sm">{p.created_at ? new Date(p.created_at).toLocaleString() : 'N/A'}</td>
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
        {activeTab === 'notifications' && (userRole === 'admin' || userRole === 'warehouse' || userRole === 'audit') && (
          <div className="tab-content">
            <div className="notification-section">
              <div className="sub-chips-row">
                <button className={`sub-chip ${notiFilter === 'all' ? 'active' : ''}`} onClick={() => setNotiFilter('all')}>All Notifications</button>
                <button className={`sub-chip ${notiFilter === 'restocks' ? 'active' : ''}`} onClick={() => setNotiFilter('restocks')}>🚚 Restock Requests {pendingRestocks.length > 0 && `(${pendingRestocks.length})`}</button>
                <button className={`sub-chip ${notiFilter === 'incidents' ? 'active' : ''}`} onClick={() => setNotiFilter('incidents')}>🚨 Incident Reports {openIncidents.length > 0 && `(${openIncidents.length})`}</button>
              </div>

              {(notiFilter === 'all' || notiFilter === 'incidents') && (
                <>
                  <div className="section-header-row">
                    <h3>🚨 Incident Reports</h3>
                    {userRole === 'admin' && (
                      <button className="btn-add btn-crimson" onClick={() => setShowIncidentModal(true)}>+ File Incident Report</button>
                    )}
                  </div>

                  <div className="incident-list-container">
                    {incidents.length > 0 ? (
                      incidents.map((inc) => {
                        const isOpen = inc.status === 'Open';
                        return (
                          <div key={inc.id} className={`incident-card ${isOpen ? 'incident-open' : 'incident-resolved'}`}>
                            <div>
                              <div className="incident-title-row">
                                <strong>Product: {inc.title}</strong>
                                <span className={`status-pill ${isOpen ? 'pill-amber' : 'pill-emerald'}`}>
                                  {inc.status}
                                </span>
                              </div>
                              <p className="incident-desc"><strong>Issue:</strong> {inc.description}</p>
                              <small className="incident-reporter">Reported by: <strong>{inc.reported_by}</strong></small>
                            </div>
                            <div>
                              {userRole === 'admin' && isOpen && (
                                <button
                                  onClick={async () => {
                                    try {
                                      await axios.put(`http://localhost:5000/api/incidents/${inc.id}/status`, { status: 'Resolved' });
                                      await fetchIncidents();
                                      notifyOtherTabs('incidents_updated');
                                    } catch (err) {
                                      alert('Failed to update status');
                                    }
                                  }}
                                  className="btn-resolve"
                                >
                                  Mark as Resolved
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="no-notifications empty-box">No incident reports found.</p>
                    )}
                  </div>
                </>
              )}

              {(notiFilter === 'all' || notiFilter === 'restocks') && (
                <div className="table-container-card">
                  <h3>🚚 Shipping Tracker</h3>
                  {orders.length > 0 ? (
                    <div className="table-responsive">
                      <table>
                        <thead>
                          <tr>
                            <th>ID & Date</th>
                            <th>Item & Qty</th>
                            <th>Total Price</th>
                            <th>Audit Trail</th>
                            <th>Shipping Process</th>
                            <th>Status</th>
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
                              <tr key={order.id}>
                                <td>
                                  <span className="table-muted">#{order.id}</span>
                                  <div className="table-muted text-sm">{order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}</div>
                                </td>
                                <td>
                                  <div className="table-bold">{order.appliance_name}</div>
                                  <div className="text-sm table-muted">Ordered: {order.quantity} | Received: {isCompleted ? (order.received_quantity ?? order.quantity) : '—'}</div>
                                </td>
                                <td className="table-emerald">₱{Number(order.total_price).toFixed(2)}</td>
                                <td>
                                  <div className="text-sm" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    <span><strong>Requested By:</strong> {order.created_by || 'Admin'}</span>
                                    <span><strong>Received by WH:</strong> {order.received_by_wh || 'Pending'}</span>
                                    <span><strong>Shipped By:</strong> {order.shipped_by || 'Pending'}</span>
                                    <span><strong>Received By:</strong> {order.received_by_admin_user || 'Pending'}</span>
                                  </div>
                                </td>
                                <td>
                                  <div className="progress-steps-container">
                                    <div className={`p-step ${isReceivedByWarehouse || isShipping || isCompleted ? 'completed' : ''}`} title="Order Received">1</div>
                                    <div className="p-line"></div>
                                    <div className={`p-step ${isReceivedByWarehouse || isShipping || isCompleted ? 'completed' : ''}`} title="Processing / Received by WH">2</div>
                                    <div className="p-line"></div>
                                    <div className={`p-step ${isShipping || isCompleted ? 'completed' : ''}`} title="Dispatch / In Transit">3</div>
                                    <div className="p-line"></div>
                                    <div className={`p-step ${isCompleted ? 'completed' : ''}`} title="Delivered / Received by Admin">4</div>
                                  </div>
                                  <div className="progress-label">
                                    {isPending && 'Pending'}
                                    {isReceivedByWarehouse && 'Processing'}
                                    {isShipping && 'In Transit (Dispatch)'}
                                    {isCompleted && 'Delivered'}
                                  </div>
                                </td>
                                <td>
                                  {currentRole === 'warehouse' && (
                                    <div>
                                      {isPending && (
                                        <button
                                          type="button"
                                          onClick={(e) => handleUpdateOrderStatus(e, order.id, 'Restock Received by Warehouse')}
                                          className="btn-wf-amber"
                                        >
                                          Receive Purchase
                                        </button>
                                      )}
                                      {isReceivedByWarehouse && (
                                        <button
                                          type="button"
                                          onClick={(e) => handleUpdateOrderStatus(e, order.id, 'Shipping')}
                                          className="btn-wf-emerald"
                                        >
                                          Shipping (Dispatch)
                                        </button>
                                      )}
                                      {isShipping && <span className="wf-label-emerald"> 🚚 In Transit to Admin</span>}
                                      {isCompleted && <span className="wf-label-emerald">✅ Delivered</span>}
                                    </div>
                                  )}

                                  {currentRole === 'admin' && (
                                    <div>
                                      {isPending && <span className="wf-label-amber">⌛ Waiting for Warehouse</span>}
                                      {isReceivedByWarehouse && <span className="wf-label-emerald">📦 Processing by WH</span>}
                                      {isShipping && (
                                        <button
                                          type="button"
                                          onClick={(e) => handleAdminReceiveShipping(e, order.id, order.quantity)}
                                          className="btn-wf-emerald"
                                        >
                                          Receive Shipping (Deliver)
                                        </button>
                                      )}
                                      {isCompleted && <span className="wf-label-emerald">✅ Stock Delivered & Updated</span>}
                                    </div>
                                  )}

                                  {currentRole === 'audit' && (
                                    <div>
                                      {isPending && <span className="wf-label-amber">⌛ Waiting for Warehouse</span>}
                                      {isReceivedByWarehouse && <span className="wf-label-emerald">📦 Processing by WH</span>}
                                      {isShipping && <span className="wf-label-emerald">🚚 In Transit to Admin</span>}
                                      {isCompleted && <span className="wf-label-emerald">✅ Stock Delivered & Updated</span>}
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

        {activeTab === 'services' && userRole === 'admin' && (
          <div className="tab-content">
            <div className="services-section">
              <h3>Emerald System Services</h3>
              <div className="services-grid services-grid-cols">
                <div className="service-card">
                  <h4 className="service-card-title">📦 Inventory Management</h4>
                  <p className="service-card-desc">Track stock levels and catalog items in real time.</p>
                </div>
                <div className="service-card">
                  <h4 className="service-card-title">🚚 Order Processing</h4>
                  <p className="service-card-desc">Streamline and monitor restocks across roles seamlessly.</p>
                </div>
                <div className="service-card">
                  <h4 className="service-card-title">👥 User Roles & Access</h4>
                  <p className="service-card-desc">Oversee admin, warehouse, staff, and audit permissions securely.</p>
                </div>
                <div className="service-card">
                  <h4 className="service-card-title">🚨 System Incident Logs</h4>
                  <p className="service-card-desc">File and manage incident reports sent directly to the warehouse.</p>
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
                  <label>Category</label>
                  <select
                    value={incidentForm.category}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      const firstItemOfCat = appliances.find(i => i.category === newCat);
                      setIncidentForm({
                        ...incidentForm,
                        category: newCat,
                        product_name: firstItemOfCat ? firstItemOfCat.name : ''
                      });
                    }}
                    className="dropdown-input"
                  >
                    {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <label>Product Name</label>
                  <select
                    value={incidentForm.product_name}
                    onChange={(e) => setIncidentForm({ ...incidentForm, product_name: e.target.value })}
                    className="dropdown-input"
                    required
                  >
                    <option value="">-- Select Product --</option>
                    {appliances
                      .filter(item => item.category === incidentForm.category)
                      .map(item => (
                        <option key={item.id} value={item.name}>{item.name} {item.brand ? `(${item.brand})` : ''}</option>
                      ))
                    }
                  </select>

                  <label>Description (Damaged, Missing, etc.)</label>
                  <textarea
                    rows="4"
                    value={incidentForm.description}
                    onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                    required
                  />
                </div>

                <div className="action-buttons">
                  <button type="submit" className="btn-add btn-crimson">Submit Report</button>
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
                  <label>Product Name</label>
                  <input type="text" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required />

                  <label>Category</label>
                  <select value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} className="dropdown-input">
                    {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <label>Brand</label>
                  <input type="text" value={productForm.brand} onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })} />

                  <label>Size</label>
                  <div className="size-inputs-row">
                    <input
                      type="text"
                      placeholder="e.g. 40"
                      value={productForm.size_value}
                      onChange={(e) => setProductForm({ ...productForm, size_value: e.target.value })}
                    />
                    <select
                      value={productForm.size_unit}
                      onChange={(e) => setProductForm({ ...productForm, size_unit: e.target.value })}
                      className="dropdown-input unit-select"
                    >
                      <option value="cm">cm</option>
                      <option value="inches">inches</option>
                    </select>
                  </div>

                  <label>Quantity</label>
                  <input type="number" value={productForm.quantity} onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })} required />

                  <label>Price (₱)</label>
                  <input type="number" step="0.01" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} required />
                </div>

                <div className="action-buttons">
                  <button type="submit" className="btn-add">Save Product</button>
                  <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {selectedItem && (
          <div className="modal-overlay" onClick={() => { setSelectedItem(null); setShowRestockConfirmModal(false); setShowSaleConfirmModal(false); }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{selectedItem.name}</h2>

              {userRole === 'admin' ? (
                <div className="modal-inputs">
                  <h4>Edit Item Information</h4>
                  <label>Name</label>
                  <input type="text" value={editFormData.name || ''} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} />

                  <label>Category</label>
                  <select value={editFormData.category || 'Furniture'} onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })} className="dropdown-input">
                    {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <label>Brand</label>
                  <input type="text" value={editFormData.brand || ''} onChange={(e) => setEditFormData({ ...editFormData, brand: e.target.value })} />

                  <label>Size</label>
                  <div className="size-inputs-row">
                    <input
                      type="text"
                      placeholder="e.g. 40"
                      value={editSizeValue}
                      onChange={(e) => setEditSizeValue(e.target.value)}
                    />
                    <select
                      value={editSizeUnit}
                      onChange={(e) => setEditSizeUnit(e.target.value)}
                      className="dropdown-input unit-select"
                    >
                      <option value="cm">cm</option>
                      <option value="inches">inches</option>
                    </select>
                  </div>

                  <label>Quantity (Stock)</label>
                  <input type="number" value={editFormData.quantity || 0} onChange={(e) => setEditFormData({ ...editFormData, quantity: e.target.value })} />

                  <label>Price (₱)</label>
                  <input type="number" step="0.01" value={editFormData.price || 0} onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })} />

                  {/* UPGRADED WAREHOUSE RESTOCK PANEL */}
                  <div
                    style={{
                      marginTop: '18px',
                      padding: '16px',
                      borderRadius: '10px',
                      background: 'linear-gradient(145deg, rgba(16, 28, 21, 0.95), rgba(11, 18, 14, 0.98))',
                      border: '1px solid rgba(129, 199, 132, 0.35)',
                      boxShadow: '0 6px 18px rgba(0, 0, 0, 0.35)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, color: '#81c784', fontSize: '15px', letterSpacing: '0.3px' }}>
                        🚚 Request Warehouse Restock
                      </h4>
                      <span
                        style={{
                          fontSize: '12px',
                          padding: '3px 8px',
                          borderRadius: '999px',
                          backgroundColor: 'rgba(129, 199, 132, 0.14)',
                          color: '#a5d6a7',
                          border: '1px solid rgba(129, 199, 132, 0.25)'
                        }}
                      >
                        Current Stock: <strong>{selectedItem.quantity}</strong>
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      <label style={{ margin: 0, fontSize: '13px', color: '#d1d5db' }}>Order Qty:</label>
                      <input
                        type="number"
                        min="1"
                        value={purchaseQty}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') {
                            setPurchaseQty('');
                            return;
                          }
                          const parsed = Number(raw);
                          if (!Number.isNaN(parsed)) {
                            setPurchaseQty(parsed < 0 ? 0 : parsed);
                          }
                        }}
                        onBlur={() => {
                          if (!purchaseQty || Number(purchaseQty) < 1) {
                            setPurchaseQty(1);
                          }
                        }}
                        className="restock-qty-input no-spinner"
                        style={{ width: '90px', textAlign: 'center', fontWeight: '600' }}
                      />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[10, 25, 50].map((inc) => (
                          <button
                            key={inc}
                            type="button"
                            onClick={() => setPurchaseQty((prev) => Number(prev || 0) + inc)}
                            style={{
                              padding: '5px 10px',
                              fontSize: '12px',
                              borderRadius: '6px',
                              border: '1px solid rgba(129, 199, 132, 0.35)',
                              backgroundColor: 'rgba(129, 199, 132, 0.1)',
                              color: '#81c784',
                              cursor: 'pointer'
                            }}
                          >
                            +{inc}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(0, 0, 0, 0.32)',
                        marginBottom: '12px',
                        fontSize: '13px'
                      }}
                    >
                      <div>
                        <span style={{ color: '#9ca3af', display: 'block', fontSize: '11px' }}>Projected Stock</span>
                        <strong style={{ color: '#81c784' }}>
                          {Number(selectedItem.quantity) + Number(purchaseQty || 0)} units
                        </strong>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ color: '#9ca3af', display: 'block', fontSize: '11px' }}>Estimated Total</span>
                        <strong style={{ color: '#fbbf24' }}>
                          ₱{(Number(purchaseQty || 0) * Number(selectedItem.price || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-save btn-amber"
                      onClick={handleOpenRestockVerification}
                      style={{ width: '100%', fontWeight: '600', padding: '10px' }}
                    >
                      Request Restock
                    </button>
                  </div>

                  <div className="action-buttons" style={{ marginTop: '14px' }}>
                    <button className="btn-save btn-blue" onClick={handleAdminSaveEdit}>Save Changes</button>
                    <button className="btn-delete" onClick={() => handleDelete(selectedItem.id)}>Delete Item</button>
                    <button className="btn-cancel" onClick={() => setSelectedItem(null)}>Close</button>
                  </div>
                </div>
              ) : userRole === 'staff' ? (
                <div>
                  <p><strong>Brand:</strong> {selectedItem.brand}</p>
                  <p><strong>Category:</strong> {selectedItem.category}</p>
                  <p><strong>Size:</strong> {selectedItem.size || 'N/A'}</p>
                  <p><strong>Price:</strong> ₱{Number(selectedItem.price).toFixed(2)}</p>
                  <p><strong>Stock Available:</strong> {selectedItem.quantity}</p>

                  {/* UPGRADED STAFF PROCESS SALE PANEL */}
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '16px',
                      borderRadius: '10px',
                      background: 'linear-gradient(145deg, rgba(16, 28, 21, 0.95), rgba(11, 18, 14, 0.98))',
                      border: '1px solid rgba(129, 199, 132, 0.35)',
                      boxShadow: '0 6px 18px rgba(0, 0, 0, 0.35)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, color: '#81c784', fontSize: '15px', letterSpacing: '0.3px' }}>
                        🛒 Process Sale
                      </h4>
                      <span
                        style={{
                          fontSize: '12px',
                          padding: '3px 8px',
                          borderRadius: '999px',
                          backgroundColor: 'rgba(129, 199, 132, 0.14)',
                          color: '#a5d6a7',
                          border: '1px solid rgba(129, 199, 132, 0.25)'
                        }}
                      >
                        Available: <strong>{selectedItem.quantity}</strong>
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      <label style={{ margin: 0, fontSize: '13px', color: '#d1d5db' }}>Quantity to Buy:</label>
                      <input
                        type="number"
                        min="1"
                        max={selectedItem.quantity}
                        value={purchaseQty}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') {
                            setPurchaseQty('');
                            return;
                          }
                          const parsed = Number(raw);
                          if (!Number.isNaN(parsed)) {
                            setPurchaseQty(parsed < 0 ? 0 : Math.min(parsed, Number(selectedItem.quantity)));
                          }
                        }}
                        onBlur={() => {
                          if (!purchaseQty || Number(purchaseQty) < 1) {
                            setPurchaseQty(1);
                          }
                        }}
                        className="restock-qty-input no-spinner"
                        style={{ width: '90px', textAlign: 'center', fontWeight: '600' }}
                      />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[1, 5, 10].map((inc) => (
                          <button
                            key={inc}
                            type="button"
                            onClick={() =>
                              setPurchaseQty((prev) =>
                                Math.min(Number(selectedItem.quantity), Number(prev || 0) + inc)
                              )
                            }
                            style={{
                              padding: '5px 10px',
                              fontSize: '12px',
                              borderRadius: '6px',
                              border: '1px solid rgba(129, 199, 132, 0.35)',
                              backgroundColor: 'rgba(129, 199, 132, 0.1)',
                              color: '#81c784',
                              cursor: 'pointer'
                            }}
                          >
                            +{inc}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(0, 0, 0, 0.32)',
                        marginBottom: '12px',
                        fontSize: '13px'
                      }}
                    >
                      <div>
                        <span style={{ color: '#9ca3af', display: 'block', fontSize: '11px' }}>Remaining Stock</span>
                        <strong style={{ color: '#81c784' }}>
                          {Math.max(0, Number(selectedItem.quantity) - Number(purchaseQty || 0))} units
                        </strong>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ color: '#9ca3af', display: 'block', fontSize: '11px' }}>Total Sale</span>
                        <strong style={{ color: '#fbbf24' }}>
                          ₱{(Number(purchaseQty || 0) * Number(selectedItem.price || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-save btn-emerald-solid"
                      onClick={handleOpenSaleVerification}
                      style={{ width: '100%', fontWeight: '600', padding: '10px' }}
                    >
                      Purchase Item
                    </button>
                  </div>

                  <div className="action-buttons" style={{ marginTop: '14px' }}>
                    <button className="btn-cancel" onClick={() => setSelectedItem(null)}>Close</button>
                  </div>
                </div>
              ) : (
                <div>
                  <p><strong>Brand:</strong> {selectedItem.brand}</p>
                  <p><strong>Category:</strong> {selectedItem.category}</p>
                  <p><strong>Size:</strong> {selectedItem.size || 'N/A'}</p>
                  <p><strong>Price:</strong> ₱{Number(selectedItem.price).toFixed(2)}</p>
                  <p><strong>Stock Available:</strong> {selectedItem.quantity}</p>

                  <div className="action-buttons">
                    <button className="btn-cancel" onClick={() => setSelectedItem(null)}>Close</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECOND VERIFICATION CONFIRMATION POPUP FOR RESTOCK */}
        {selectedItem && showRestockConfirmModal && (
          <div
            className="modal-overlay"
            onClick={() => !isSubmittingRestock && setShowRestockConfirmModal(false)}
            style={{ zIndex: 1100, backgroundColor: 'rgba(0, 0, 0, 0.78)' }}
          >
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '420px',
                border: '1px solid rgba(129, 199, 132, 0.5)',
                boxShadow: '0 14px 36px rgba(0, 0, 0, 0.65)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '22px' }}>🔔</span>
                <h3 style={{ margin: 0, color: '#81c784' }}>Verify Warehouse Restock</h3>
              </div>
              <p style={{ color: '#d1d5db', fontSize: '14px', marginBottom: '14px' }}>
                Please confirm the restock details below before dispatching this request to the warehouse:
              </p>

              <div
                style={{
                  backgroundColor: 'rgba(11, 15, 12, 0.85)',
                  border: '1px solid rgba(129, 199, 132, 0.25)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '14px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9ca3af' }}>Product:</span>
                  <strong style={{ color: '#f3f4f6' }}>{selectedItem.name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9ca3af' }}>Restock Quantity:</span>
                  <strong style={{ color: '#81c784' }}>+{purchaseQty} unit(s)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9ca3af' }}>Stock After Delivery:</span>
                  <strong style={{ color: '#e5e7eb' }}>
                    {selectedItem.quantity} → {Number(selectedItem.quantity) + Number(purchaseQty)}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px' }}>
                  <span style={{ color: '#9ca3af' }}>Total Restock Value:</span>
                  <strong style={{ color: '#fbbf24' }}>
                    ₱{(Number(purchaseQty) * Number(selectedItem.price)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-cancel"
                  disabled={isSubmittingRestock}
                  onClick={() => setShowRestockConfirmModal(false)}
                >
                  Go Back
                </button>
                <button
                  type="button"
                  className="btn-save btn-emerald-solid"
                  disabled={isSubmittingRestock}
                  onClick={handleConfirmRestockRequest}
                >
                  {isSubmittingRestock ? 'Sending...' : 'Confirm & Send Request'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECOND VERIFICATION CONFIRMATION POPUP FOR STAFF SALE */}
        {selectedItem && showSaleConfirmModal && (
          <div
            className="modal-overlay"
            onClick={() => !isSubmittingSale && setShowSaleConfirmModal(false)}
            style={{ zIndex: 1100, backgroundColor: 'rgba(0, 0, 0, 0.78)' }}
          >
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '420px',
                border: '1px solid rgba(129, 199, 132, 0.5)',
                boxShadow: '0 14px 36px rgba(0, 0, 0, 0.65)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '22px' }}>🔔</span>
                <h3 style={{ margin: 0, color: '#81c784' }}>Verify Customer Sale</h3>
              </div>
              <p style={{ color: '#d1d5db', fontSize: '14px', marginBottom: '14px' }}>
                Please confirm the sale details below before recording this transaction:
              </p>

              <div
                style={{
                  backgroundColor: 'rgba(11, 15, 12, 0.85)',
                  border: '1px solid rgba(129, 199, 132, 0.25)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '14px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9ca3af' }}>Product:</span>
                  <strong style={{ color: '#f3f4f6' }}>{selectedItem.name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9ca3af' }}>Quantity to Buy:</span>
                  <strong style={{ color: '#81c784' }}>{purchaseQty} unit(s)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9ca3af' }}>Remaining Stock:</span>
                  <strong style={{ color: '#e5e7eb' }}>
                    {selectedItem.quantity} → {Math.max(0, Number(selectedItem.quantity) - Number(purchaseQty))}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px' }}>
                  <span style={{ color: '#9ca3af' }}>Total Sale Amount:</span>
                  <strong style={{ color: '#fbbf24' }}>
                    ₱{(Number(purchaseQty) * Number(selectedItem.price)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-cancel"
                  disabled={isSubmittingSale}
                  onClick={() => setShowSaleConfirmModal(false)}
                >
                  Go Back
                </button>
                <button
                  type="button"
                  className="btn-save btn-emerald-solid"
                  disabled={isSubmittingSale}
                  onClick={handleConfirmCustomerPurchase}
                >
                  {isSubmittingSale ? 'Processing...' : 'Confirm & Complete Sale'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;