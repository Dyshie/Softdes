// Global variables
let currentUser = null;
let ordersRef = null;
let staffRef = null;
let inventoryRef = null;
let inventoryData = {}; // Store inventory data for price lookups

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    checkAuthState();
});

function initializeApp() {
    // Initialize Firebase references
    ordersRef = database.ref('orders');
    staffRef = database.ref('staff');
    inventoryRef = database.ref('inventory');
    
    // Load inventory data for product dropdown
    inventoryRef.once('value', (snapshot) => {
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                const product = child.val();
                inventoryData[child.key] = {
                    name: product.name,
                    price: product.price,
                    id: child.key
                };
            });
        }
    });
    
    // Listen for real-time changes to inventory
    inventoryRef.on('child_added', (snapshot) => {
        const product = snapshot.val();
        inventoryData[snapshot.key] = {
            name: product.name,
            price: product.price,
            id: snapshot.key
        };
    });
    
    inventoryRef.on('child_changed', (snapshot) => {
        const product = snapshot.val();
        inventoryData[snapshot.key] = {
            name: product.name,
            price: product.price,
            id: snapshot.key
        };
    });
    
    inventoryRef.on('child_removed', (snapshot) => {
        delete inventoryData[snapshot.key];
    });
}

function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Order form - setup when modal loads
    setTimeout(() => {
        const orderForm = document.getElementById('order-form');
        if (orderForm && !orderForm.dataset.listenerAdded) {
            orderForm.addEventListener('submit', handleOrderSubmit);
            orderForm.dataset.listenerAdded = 'true';
        }
    }, 100);
    
    // Staff form - setup when modal loads
    setTimeout(() => {
        const staffForm = document.getElementById('staff-form');
        if (staffForm && !staffForm.dataset.listenerAdded) {
            staffForm.addEventListener('submit', handleStaffSubmit);
            staffForm.dataset.listenerAdded = 'true';
        }
    }, 100);
    
    // Inventory form - setup when modal loads
    setTimeout(() => {
        const inventoryForm = document.getElementById('inventory-form');
        if (inventoryForm && !inventoryForm.dataset.listenerAdded) {
            inventoryForm.addEventListener('submit', handleInventorySubmit);
            inventoryForm.dataset.listenerAdded = 'true';
        }
    }, 100);
}

// Authentication
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            currentUser = userCredential.user;
            
            // Check if staff member is suspended
            return checkIfStaffSuspended(userCredential.user.uid).then((isSuspended) => {
                if (isSuspended) {
                    // Sign out immediately if suspended
                    auth.signOut();
                    showNotification('Your account has been suspended. Please contact an administrator.', 'error');
                    return Promise.reject(new Error('Account suspended'));
                }
                
                // Update router auth state
                router.setAuthenticated(true);
                
                // Initialize realtime listeners
                realtimeDataManager.initGlobalListeners();
                
                // Navigate to dashboard
                router.navigate('/dashboard');
                
                showNotification('Login successful!');
            });
        })
        .catch((error) => {
            showNotification(error.message, 'error');
        });
}

function checkIfStaffSuspended(uid) {
    return new Promise((resolve) => {
        staffRef.orderByChild('uid').equalTo(uid).once('value', (snapshot) => {
            if (snapshot.exists()) {
                let isSuspended = false;
                snapshot.forEach((child) => {
                    if (child.val().status === 'suspended') {
                        isSuspended = true;
                    }
                });
                resolve(isSuspended);
            } else {
                resolve(false);
            }
        });
    });
}

function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            
            // Update router auth state
            router.setAuthenticated(true);
            
            // Initialize realtime listeners
            realtimeDataManager.initGlobalListeners();
            
            // Initialize router
            router.init();
        } else {
            // Update router auth state
            router.setAuthenticated(false);
            
            // Initialize router for unauthenticated users
            router.init();
        }
    });
}

function logout() {
    auth.signOut().then(() => {
        // Update router auth state
        router.setAuthenticated(false);
        
        // Navigate to login
        router.navigate('/login');
        
        showNotification('Logged out successfully');
    });
}



// Dashboard Display Functions
function updateDashboardStats(orders) {
    if (!orders) orders = [];
    const today = new Date().toDateString();
    
    let todayOrders = 0;
    let todayRevenue = 0;
    
    orders.forEach((order) => {
        const orderDate = new Date(order.timestamp).toDateString();
        
        if (orderDate === today && order.status === 'delivered') {
            todayOrders++;
            todayRevenue += calculateOrderTotal(order.price, order.quantity);
        }
    });
    
    const todayOrdersEl = document.getElementById('today-orders');
    const todayRevenueEl = document.getElementById('today-revenue');
    
    if (todayOrdersEl) todayOrdersEl.textContent = todayOrders;
    if (todayRevenueEl) todayRevenueEl.textContent = `₱${todayRevenue}`;
}

function displayRecentOrders(orders) {
    const container = document.getElementById('recent-orders-table');
    if (!container) return;
    
    if (!orders || orders.length === 0) {
        container.innerHTML = '<p class="text-muted">No recent orders</p>';
        return;
    }
    
    const recentOrders = orders.slice(-10).reverse();
    
    let html = '<div class="table-responsive"><table class="table table-hover"><thead class="table-light"><tr><th>Customer</th><th>Product</th><th>Status</th><th>Total</th></tr></thead><tbody>';
    recentOrders.forEach(order => {
        const total = calculateOrderTotal(order.price, order.quantity);
        html += `<tr>
            <td>${order.customerName}</td>
            <td>${order.productType}</td>
            <td><span class="status-badge status-${order.status}">${order.status}</span></td>
            <td>₱${total}</td>
        </tr>`;
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function displayStaffOnDuty(staff) {
    const container = document.getElementById('staff-on-duty');
    if (!container) return;
    
    if (!staff || staff.length === 0) {
        container.innerHTML = '<p class="text-muted">No staff on duty</p>';
        return;
    }
    
    const activeStaff = staff.filter(s => s.status === 'active');
    
    if (activeStaff.length === 0) {
        container.innerHTML = '<p class="text-muted">No staff on duty</p>';
        return;
    }
    
    let html = '<div class="table-responsive"><table class="table table-hover"><thead class="table-light"><tr><th>Name</th><th>Role</th><th>Status</th></tr></thead><tbody>';
    activeStaff.forEach(member => {
        html += `<tr>
            <td>${member.name}</td>
            <td>${member.role}</td>
            <td><span class="badge bg-success">Active</span></td>
        </tr>`;
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function updateActiveStaffCount() {
    const staff = realtimeDataManager.getData('staff') || [];
    let activeCount = 0;
    staff.forEach((member) => {
        if (member.status === 'active') activeCount++;
    });
    const el = document.getElementById('active-staff');
    if (el) el.textContent = activeCount;
}

function updateLowStock(inventory) {
    if (!inventory) inventory = {};
    let lowStockCount = 0;
    Object.values(inventory).forEach((product) => {
        if (product.quantity < 10) lowStockCount++;
    });
    const el = document.getElementById('low-stock');
    if (el) el.textContent = lowStockCount;
}

// Order Management
function displayOrders(orders) {
    const container = document.getElementById('orders-table');
    if (!container) return;
    
    if (!orders || orders.length === 0) {
        container.innerHTML = '<p class="text-muted">No orders found</p>';
        return;
    }
    
    let html = '<div class="table-responsive"><table class="table table-hover"><thead class="table-light"><tr><th>Customer</th><th>Phone</th><th>Product</th><th>Qty</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
    orders.forEach(order => {
        const total = calculateOrderTotal(order.price, order.quantity);
        html += `<tr>
            <td>${order.customerName}</td>
            <td>${order.customerPhone}</td>
            <td>${order.productType}</td>
            <td>${order.quantity}</td>
            <td>₱${total}</td>
            <td><span class="status-badge status-${order.status}">${order.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editOrder('${order.id}')">
                    <i class="bi bi-pencil"></i> Edit
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteOrder('${order.id}')">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </td>
        </tr>`;
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function openOrderModal() {
    document.getElementById('order-modal-title').textContent = 'Add Order';
    document.getElementById('order-form').reset();
    document.getElementById('order-id').value = '';
    populateProductDropdown();
    const modal = new bootstrap.Modal(document.getElementById('order-modal'));
    modal.show();
}

function populateProductDropdown() {
    const productSelect = document.getElementById('product-type');
    
    // Clear existing options, keeping the default one
    productSelect.innerHTML = '<option value="">Select Product</option>';
    
    // Load inventory items and populate the dropdown
    inventoryRef.once('value', (snapshot) => {
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                const product = child.val();
                const productId = child.key;
                
                // Store product data for later use
                inventoryData[productId] = {
                    name: product.name,
                    price: product.price,
                    id: productId
                };
                
                // Create option element with product name and price
                const option = document.createElement('option');
                option.value = productId;
                option.textContent = `${product.name} - ₱${product.price}/${product.unit}`;
                productSelect.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No products available';
            option.disabled = true;
            productSelect.appendChild(option);
        }
    });
}

function closeModal(modalId) {
    const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
    if (modal) {
        modal.hide();
    }
}

function handleOrderSubmit(e) {
    e.preventDefault();
    
    const orderId = document.getElementById('order-id').value;
    const productId = document.getElementById('product-type').value;
    
    if (!productId) {
        showNotification('Please select a product', 'error');
        return;
    }
    
    const product = inventoryData[productId];
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }
    
    const quantity = parseInt(document.getElementById('quantity').value, 10);
    if (!quantity || quantity <= 0) {
        showNotification('Quantity must be at least 1', 'error');
        return;
    }
    
    const orderData = {
        customerName: document.getElementById('customer-name').value,
        customerPhone: document.getElementById('customer-phone').value,
        deliveryAddress: document.getElementById('delivery-address').value,
        productId: productId,
        productType: product.name,
        quantity: quantity,
        price: product.price,
        status: document.getElementById('order-status').value,
        timestamp: Date.now()
    };

    const performSave = async () => {
        if (orderId) {
            const snapshot = await ordersRef.child(orderId).once('value');
            const existingOrder = snapshot.val();
            if (!existingOrder) {
                throw new Error('Order not found');
            }

            const oldProductId = existingOrder.productId;
            const oldQuantity = parseInt(existingOrder.quantity || 0, 10);

            if (oldProductId === productId) {
                const quantityDifference = quantity - oldQuantity;
                if (quantityDifference !== 0) {
                    await adjustInventoryQuantity(productId, quantityDifference);
                }
            } else {
                await adjustInventoryQuantity(oldProductId, -oldQuantity);
                await adjustInventoryQuantity(productId, quantity);
            }

            await ordersRef.child(orderId).update(orderData);
        } else {
            await adjustInventoryQuantity(productId, quantity);
            await ordersRef.push(orderData);
        }
    };

    performSave().then(() => {
        closeModal('order-modal');
        showNotification(orderId ? 'Order updated!' : 'Order created!');
        checkInventoryLevel(productId);
    }).catch(error => {
        showNotification('Error saving order: ' + error.message, 'error');
    });
}

function editOrder(orderId) {
    ordersRef.child(orderId).once('value', (snapshot) => {
        const order = snapshot.val();
        document.getElementById('order-modal-title').textContent = 'Edit Order';
        document.getElementById('order-id').value = orderId;
        document.getElementById('customer-name').value = order.customerName;
        document.getElementById('customer-phone').value = order.customerPhone;
        document.getElementById('delivery-address').value = order.deliveryAddress;
        document.getElementById('quantity').value = order.quantity;
        document.getElementById('order-status').value = order.status;
        
        // Populate dropdown first, then set the value
        populateProductDropdown();
        
        // Set the product dropdown after it's populated
        setTimeout(() => {
            if (order.productId) {
                document.getElementById('product-type').value = order.productId;
            } else {
                // For backward compatibility with old orders that only have productType
                const productName = order.productType;
                for (const [id, data] of Object.entries(inventoryData)) {
                    if (data.name === productName) {
                        document.getElementById('product-type').value = id;
                        break;
                    }
                }
            }
        }, 100);
        
        document.getElementById('order-modal').style.display = 'block';
    });
}

function deleteOrder(orderId) {
    if (confirm('Are you sure you want to delete this order?')) {
        ordersRef.child(orderId).remove()
            .then(() => showNotification('Order deleted'))
            .catch(error => showNotification('Error: ' + error.message, 'error'));
    }
}

function filterOrders() {
    const searchTerm = document.getElementById('order-search').value.toLowerCase();
    const statusFilter = document.getElementById('order-status-filter').value;
    
    ordersRef.once('value', (snapshot) => {
        const filteredOrders = [];
        snapshot.forEach((child) => {
            const order = child.val();
            let matchesSearch = order.customerName.toLowerCase().includes(searchTerm) ||
                              order.customerPhone.includes(searchTerm);
            let matchesStatus = statusFilter === 'all' || order.status === statusFilter;
            
            if (matchesSearch && matchesStatus) {
                filteredOrders.push({ id: child.key, ...order });
            }
        });
        displayOrders(filteredOrders);
    });
}

// Staff Management
function loadStaff() {
    staffRef.on('value', (snapshot) => {
        const staff = [];
        snapshot.forEach((child) => {
            staff.push({ id: child.key, ...child.val() });
        });
        displayStaff(staff);
    });
}

function displayStaff(staff) {
    const container = document.getElementById('staff-table');
    if (!container) return;
    
    if (staff.length === 0) {
        container.innerHTML = '<p class="text-muted">No staff members found</p>';
        return;
    }
    
    let html = '<div class="table-responsive"><table class="table table-hover"><thead class="table-light"><tr><th>Name</th><th>Role</th><th>Phone</th><th>Date Added</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
    staff.forEach(member => {
        const dateAdded = member.dateAdded ? new Date(member.dateAdded).toLocaleDateString() : 'N/A';
        let statusBadge = '<span class="badge bg-secondary">Off Duty</span>';
        if (member.status === 'active') {
            statusBadge = '<span class="badge bg-success">Active</span>';
        } else if (member.status === 'suspended') {
            statusBadge = '<span class="badge bg-danger">Suspended</span>';
        }
        
        // Show suspend/unsuspend button based on status
        let suspendButton = '';
        if (member.status === 'suspended') {
            suspendButton = `<button class="btn btn-sm btn-outline-warning ms-1" onclick="unsuspendStaff('${member.id}')" title="Restore access">
                <i class="bi bi-lock-fill"></i> Restore
            </button>`;
        } else {
            suspendButton = `<button class="btn btn-sm btn-outline-danger ms-1" onclick="suspendStaff('${member.id}')" title="Prevent from logging in">
                <i class="bi bi-ban"></i> Suspend
            </button>`;
        }
        
        html += `<tr>
            <td>${member.name}</td>
            <td>${member.role}</td>
            <td>${member.phone}</td>
            <td>${dateAdded}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editStaff('${member.id}')">
                    <i class="bi bi-pencil"></i> Edit
                </button>
                ${suspendButton}
                <button class="btn btn-sm btn-outline-danger ms-1" onclick="deleteStaff('${member.id}')">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </td>
        </tr>`;
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function openStaffModal() {
    document.getElementById('staff-modal-title').textContent = 'Add Staff';
    document.getElementById('staff-form').reset();
    document.getElementById('staff-id').value = '';
    // Set current date for new staff member
    const currentDate = new Date().toLocaleDateString();
    document.getElementById('staff-date-added').value = currentDate;
    const modal = new bootstrap.Modal(document.getElementById('staff-modal'));
    modal.show();
}

function handleStaffSubmit(e) {
    e.preventDefault();
    
    const staffId = document.getElementById('staff-id').value;
    const staffData = {
        name: document.getElementById('staff-name').value,
        email: document.getElementById('staff-email').value,
        role: document.getElementById('staff-role').value,
        phone: document.getElementById('staff-phone').value,
        dateAdded: staffId ? undefined : Date.now(),
        status: document.getElementById('staff-status').value
    };
    
    // Remove dateAdded from update if editing existing staff
    if (staffId) {
        delete staffData.dateAdded;
    }
    
    if (staffId) {
        // Update existing staff
        staffRef.child(staffId).update(staffData)
            .then(() => {
                closeModal('staff-modal');
                showNotification('Staff updated!');
            })
            .catch(error => {
                showNotification('Error updating staff: ' + error.message, 'error');
            });
    } else {
        // Add new staff - create Firebase Auth user first
        const defaultPassword = 'password123'; // Default password, user should change it
        
        auth.createUserWithEmailAndPassword(staffData.email, defaultPassword)
            .then((userCredential) => {
                // User created in Firebase Auth, now save to database
                const user = userCredential.user;
                staffData.uid = user.uid; // Store Firebase Auth UID
                
                return staffRef.push(staffData);
            })
            .then(() => {
                closeModal('staff-modal');
                showNotification('Staff added successfully! Default password: password123');
            })
            .catch(error => {
                showNotification('Error adding staff: ' + error.message, 'error');
            });
    }
}

function editStaff(staffId) {
    staffRef.child(staffId).once('value', (snapshot) => {
        const staff = snapshot.val();
        document.getElementById('staff-modal-title').textContent = 'Edit Staff';
        document.getElementById('staff-id').value = staffId;
        document.getElementById('staff-name').value = staff.name;
        document.getElementById('staff-email').value = staff.email || '';
        document.getElementById('staff-role').value = staff.role;
        document.getElementById('staff-phone').value = staff.phone;
        // Display the date added (read-only for editing)
        const dateAdded = staff.dateAdded ? new Date(staff.dateAdded).toLocaleDateString() : 'N/A';
        document.getElementById('staff-date-added').value = dateAdded;
        document.getElementById('staff-status').value = staff.status;
        document.getElementById('staff-modal').style.display = 'block';
    });
}

function deleteStaff(staffId) {
    if (confirm('Are you sure you want to delete this staff member?')) {
        staffRef.child(staffId).remove()
            .then(() => showNotification('Staff member deleted'))
            .catch(error => showNotification('Error: ' + error.message, 'error'));
    }
}

function suspendStaff(staffId) {
    if (confirm('Are you sure you want to suspend this staff member? They will not be able to log in.')) {
        staffRef.child(staffId).update({ status: 'suspended' })
            .then(() => {
                showNotification('Staff member suspended successfully');
                loadStaff(); // Reload the staff list
            })
            .catch(error => showNotification('Error suspending staff: ' + error.message, 'error'));
    }
}

function unsuspendStaff(staffId) {
    if (confirm('Are you sure you want to restore access to this staff member?')) {
        staffRef.child(staffId).update({ status: 'active' })
            .then(() => {
                showNotification('Staff member access restored');
                loadStaff(); // Reload the staff list
            })
            .catch(error => showNotification('Error restoring staff access: ' + error.message, 'error'));
    }
}

// Utility Functions
function calculateOrderTotal(productIdOrType, quantity) {
    // Check if it's a product ID (from new system)
    if (inventoryData[productIdOrType]) {
        return inventoryData[productIdOrType].price * quantity;
    }
    
    // Fallback for backward compatibility with old hardcoded types
    const prices = {
        'gallon': 50,
        'tank': 100,
        'case': 200
    };
    return (prices[productIdOrType] || 0) * quantity;
}

function adjustInventoryQuantity(productId, quantityDelta) {
    return new Promise((resolve, reject) => {
        inventoryRef.child(productId).transaction((current) => {
            if (!current || typeof current.quantity === 'undefined') {
                return current;
            }

            const currentQty = Number(current.quantity || 0);
            const newQty = currentQty - quantityDelta;
            if (newQty < 0) {
                return;
            }

            return {
                ...current,
                quantity: newQty
            };
        }, (error, committed, snapshot) => {
            if (error) {
                return reject(error);
            }

            if (!committed || !snapshot.exists()) {
                return reject(new Error('Insufficient stock or inventory transaction failed'));
            }

            resolve(snapshot.val());
        }, false);
    });
}

function checkInventoryLevel(productId) {
    inventoryRef.child(productId).once('value', (snapshot) => {
        if (snapshot.exists()) {
            const product = snapshot.val();
            const remaining = Number(product.quantity || 0);
            if (remaining <= 10) {
                sendNotification(`Low stock alert: ${product.name} has only ${remaining} left!`);
            }
        }
    });
}

function sendNotification(message) {
    // You can implement your notification system here
    // For now, we'll use the showNotification function
    showNotification(message, 'warning');
}

function showNotification(message, type = 'success') {
    const alertType = type === 'error' ? 'danger' : (type === 'warning' ? 'warning' : 'success');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${alertType} alert-dismissible fade show`;
    alertDiv.setAttribute('role', 'alert');
    alertDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1050; min-width: 300px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
    
    const icon = type === 'error' ? '❌' : (type === 'warning' ? '⚠️' : '✅');
    alertDiv.innerHTML = `
        ${icon} ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Reports
function generateReport() {
    const period = document.getElementById('report-period').value;
    const reportContent = document.getElementById('report-content');
    
    ordersRef.once('value', (snapshot) => {
        const orders = [];
        snapshot.forEach((child) => {
            orders.push({ id: child.key, ...child.val() });
        });
        
        const reportData = processReportData(orders, period);
        displayReport(reportData, period);
    });
}

function processReportData(orders, period) {
    const report = {};
    const now = new Date();
    
    orders.forEach(order => {
        if (order.status !== 'delivered') return;
        
        const orderDate = new Date(order.timestamp);
        let key;
        
        switch(period) {
            case 'daily':
                key = orderDate.toDateString();
                break;
            case 'weekly':
                const week = getWeekNumber(orderDate);
                key = `Week ${week}, ${orderDate.getFullYear()}`;
                break;
            case 'monthly':
                key = `${orderDate.toLocaleString('default', { month: 'long' })} ${orderDate.getFullYear()}`;
                break;
        }
        
        if (!report[key]) {
            report[key] = {
                orders: 0,
                revenue: 0,
                products: {}
            };
        }
        
        report[key].orders++;
        report[key].revenue += calculateOrderTotal(order.productType, order.quantity);
        report[key].products[order.productType] = (report[key].products[order.productType] || 0) + 1;
    });
    
    return report;
}

function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function displayReport(reportData, period) {
    const container = document.getElementById('report-content');
    let html = `<h4>📊 ${period.charAt(0).toUpperCase() + period.slice(1)} Sales Report</h4>`;
    
    // Calculate totals
    let totalOrders = 0;
    let totalRevenue = 0;
    
    for (const [period_key, data] of Object.entries(reportData)) {
        totalOrders += data.orders;
        totalRevenue += data.revenue;
    }
    
    // Add summary section if there's data
    if (totalOrders > 0) {
        html += `
            <div class="report-item" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-left-color: #667eea;">
                <h5 style="color: white; margin-bottom: 8px;">📈 Summary</h5>
                <p style="color: #fff; margin-right: 40px; margin-bottom: 8px;">
                    <strong>Total Orders:</strong> ${totalOrders}
                </p>
                <p style="color: #ffd700; font-size: 22px; font-weight: bold; margin-right: 0;">
                    💰 Total Revenue: ₱${totalRevenue.toLocaleString()}
                </p>
            </div>
        `;
    }
    
    // Display individual period data
    for (const [period_key, data] of Object.entries(reportData)) {
        const avgOrderValue = (data.revenue / data.orders).toFixed(2);
        
        html += `
            <div class="report-item">
                <h5>${period_key}</h5>
                <p>🛒 <strong>Total Orders:</strong> ${data.orders}</p>
                <p>💵 <strong>Revenue:</strong> ₱${data.revenue.toLocaleString()}</p>
                <p>📊 <strong>Avg Order Value:</strong> ₱${avgOrderValue}</p>
                <p><strong>📦 Products Sold:</strong></p>
                <ul>
        `;
        
        for (const [product, count] of Object.entries(data.products)) {
            html += `<li><strong>${product}:</strong> ${count} unit${count > 1 ? 's' : ''}</li>`;
        }
        
        html += '</ul></div>';
    }
    
    // Show empty state if no data
    if (totalOrders === 0) {
        html = `<p style="text-align: center; color: #999; padding: 40px; font-size: 16px;">📭 No delivered orders found for the selected period</p>`;
    }
    
    container.innerHTML = html;
}

// Make functions globally available
window.showTab = showTab;
window.logout = logout;
window.openOrderModal = openOrderModal;
window.closeModal = closeModal;
window.editOrder = editOrder;
window.deleteOrder = deleteOrder;
window.openStaffModal = openStaffModal;
window.editStaff = editStaff;
window.deleteStaff = deleteStaff;
window.suspendStaff = suspendStaff;
window.unsuspendStaff = unsuspendStaff;
window.openInventoryModal = openInventoryModal;
window.editInventory = editInventory;
window.deleteInventory = deleteInventory;
window.generateReport = generateReport;
window.initMap = initMap;