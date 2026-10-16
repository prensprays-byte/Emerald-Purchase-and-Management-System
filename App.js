import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('emerald_logged_in') === 'true';
  });

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
  
  // Pagination State (5 rows x 4 items = 20 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // New Item Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');

  // Selected Card Modal State (Zoom & Purchase / Edit)
  const [selectedItem, setSelectedItem] = useState(null);
  const [purchaseQty, setPurchaseQty] = useState(1);
  const [editFormData, setEditFormData] = useState({ name: '', category: '', image_url: '', quantity: '', price: '' });

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
        setSelectedItem(null);
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
    setSelectedItem(null);
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
        image_url: imageUrl || 'https://via.placeholder.com/200?text=No+Image',
        quantity: Number(quantity),
        price: Number(price),
      });
      setName('');
      setCategory('');
      setImageUrl('');
      setQuantity('');
      setPrice('');
      fetchAppliances();
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add item.');
    }
  };

  const openCardModal = (item) => {
    setSelectedItem(item);
    setPurchaseQty(1);
    setEditFormData({
      name: item.name,
      category: item.category,
      image_url: item.image_url || '',
      quantity: item.quantity,
      price: item.price
    });
  };

  const handlePurchase = async () => {
    if (purchaseQty > selectedItem.quantity) {
      alert('Cannot purchase more than available stock!');
      return;
    }
    const newQuantity = selectedItem.quantity - purchaseQty;
    try {
      await axios.put(`http://localhost:5000/api/inventory/${selectedItem.id}`, {
        ...selectedItem,
        quantity: newQuantity
      });
      setSelectedItem(null);
      fetchAppliances();
    } catch (error) {
      console.error('Error updating stock on purchase:', error);
    }
  };

  const handleAdminSaveEdit = async () => {
    try {
      await axios.put(`http://localhost:5000/api/inventory/${selectedItem.id}`, {
        name: editFormData.name,
        category: editFormData.category,
        image_url: editFormData.image_url,
        quantity: Number(editFormData.quantity),
        price: Number(editFormData.price)
      });
      setSelectedItem(null);
      fetchAppliances();
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await axios.delete(`http://localhost:5000/api/inventory/${id}`);
        setSelectedItem(null);
        
        // Fetch fresh inventory first, then check if we need to adjust the page
        const response = await axios.get('http://localhost:5000/api/inventory');
        const updatedAppliances = response.data;
        setAppliances(updatedAppliances);

        // Filter items based on current search query
        const updatedFiltered = updatedAppliances.filter((item) =>
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.category.toLowerCase().includes(search.toLowerCase())
        );

        // Calculate new total pages
        const newTotalPages = Math.ceil(updatedFiltered.length / itemsPerPage);
        
        // If current page exceeds the new total pages (and we are past page 1), move back one page
        if (currentPage > newTotalPages && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  // Filter items based on search
  const filteredAppliances = appliances.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination Calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAppliances = filteredAppliances.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAppliances.length / itemsPerPage);

  // AUTH SCREEN
  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <form onSubmit={isRegistering ? handleRegister : handleLogin} className="login-card">
          <h2>Emerald Purchase and Management System</h2>
          <p>{isRegistering ? 'Create a new account' : 'Please log in to access the system'}</p>
          
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

  // MAIN DASHBOARD
  return (
    <div className="inventory-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Emerald Purchase and Management System</h1>
          <p>Browse products, manage inventory stock, and process purchases.</p>
          <small style={{ color: '#81c784' }}>Logged in as: <strong>{userRole.toUpperCase()}</strong></small>
        </div>
        <button onClick={handleLogout} className="btn-logout">Logout</button>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '20px', marginTop: '15px' }}>
        <input
          type="text"
          className="search-input"
          placeholder="Search items or categories..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Add Item Form (Admin Only) */}
      {userRole === 'admin' && (
        <form onSubmit={handleAddAppliance} className="form-card">
          <h3>Add New Product</h3>
          <div className="form-inputs">
            <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <input type="text" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} required />
            <input type="text" placeholder="Image URL (Direct link ending in .jpg/.png)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            <input type="number" placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            <input type="number" step="0.01" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} required />
            <button type="submit" className="btn-add">Add Product</button>
          </div>
        </form>
      )}

      {/* Product Box Grid Catalog (Strictly 4 per row) */}
      <h3>Product Catalog</h3>
      <div className="product-grid">
        {currentAppliances.length > 0 ? (
          currentAppliances.map((item) => (
            <div key={item.id} className="product-card" onClick={() => openCardModal(item)}>
              <img 
                src={item.image_url || 'https://via.placeholder.com/200?text=No+Image'} 
                alt={item.name} 
                className="product-image" 
                onError={(e) => {
                  e.target.onerror = null; 
                  e.target.src = 'https://via.placeholder.com/200?text=Invalid+Image';
                }}
              />
              <div className="product-name">{item.name}</div>
              <div className="product-category">{item.category}</div>
              <div className="product-price">₱{Number(item.price).toFixed(2)}</div>
              <div className="product-stock">Stock: {item.quantity}</div>
            </div>
          ))
        ) : (
          <div style={{ color: '#999', gridColumn: '1 / -1', textAlign: 'center', padding: '20px' }}>
            No products found
          </div>
        )}
      </div>

     {/* Pagination Number Buttons (Always visible, even for 1 page) */}
     <div className="pagination-container">
        {Array.from({ length: totalPages || 1 }, (_, index) => (
          <button
            key={index + 1}
            className={`page-btn ${currentPage === index + 1 ? 'active' : ''}`}
            onClick={() => setCurrentPage(index + 1)}
          >
            {index + 1}
          </button>
        ))}
      </div>
  
      {/* Zoom Modal Popup for Purchase / Edit */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedItem.name}</h2>
            <img 
              src={selectedItem.image_url || 'https://via.placeholder.com/200?text=No+Image'} 
              alt={selectedItem.name} 
              className="modal-image" 
              onError={(e) => {
                e.target.onerror = null; 
                e.target.src = 'https://via.placeholder.com/200?text=Invalid+Image';
              }}
            />

            {userRole === 'admin' ? (
              /* Admin Edit Form inside Modal */
              <div className="modal-inputs">
                <label>Name</label>
                <input type="text" value={editFormData.name} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} />
                <label>Category</label>
                <input type="text" value={editFormData.category} onChange={(e) => setEditFormData({...editFormData, category: e.target.value})} />
                <label>Image URL</label>
                <input type="text" value={editFormData.image_url} onChange={(e) => setEditFormData({...editFormData, image_url: e.target.value})} />
                <label>Quantity</label>
                <input type="number" value={editFormData.quantity} onChange={(e) => setEditFormData({...editFormData, quantity: e.target.value})} />
                <label>Price (₱)</label>
                <input type="number" step="0.01" value={editFormData.price} onChange={(e) => setEditFormData({...editFormData, price: e.target.value})} />
                
                <div className="action-buttons">
                  <button className="btn-save" onClick={handleAdminSaveEdit}>Save</button>
                  <button className="btn-delete" onClick={() => handleDelete(selectedItem.id)}>Delete</button>
                  <button className="btn-cancel" onClick={() => setSelectedItem(null)}>Close</button>
                </div>
              </div>
            ) : (
              /* Staff / User Purchase Mode */
              <div>
                <p><strong>Category:</strong> {selectedItem.category}</p>
                <p><strong>Price:</strong> ₱{Number(selectedItem.price).toFixed(2)}</p>
                <p><strong>Available Stock:</strong> {selectedItem.quantity}</p>

                <div style={{ margin: '15px 0' }}>
                  <label style={{ marginRight: '10px', fontSize: '14px' }}>Purchase Quantity:</label>
                  <input 
                    type="number" 
                    min="1" 
                    max={selectedItem.quantity} 
                    value={purchaseQty} 
                    onChange={(e) => setPurchaseQty(Number(e.target.value))}
                    style={{ width: '60px', padding: '6px', textAlign: 'center', background: '#121814', color: 'white', border: '1px solid #2e7d32', borderRadius: '4px' }}
                  />
                </div>

                <div className="action-buttons">
                  <button className="btn-save" onClick={handlePurchase}>Confirm Purchase</button>
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