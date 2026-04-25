/**
 * Route Handlers and Realtime Data Management
 * Manages Firebase listeners and component rendering for each route
 */

class RealtimeDataManager {
    constructor() {
        this.listeners = new Map();
        this.isInitialized = false;
        this.data = {
            orders: [],
            staff: [],
            inventory: {},
            stats: {}
        };
    }

    /**
     * Initialize global realtime listeners (called once at app startup)
     */
    initGlobalListeners() {
        if (this.isInitialized) return;

        // Orders listener
        this.addListener('orders-global', ordersRef.on('value', (snapshot) => {
            this.data.orders = [];
            snapshot.forEach((child) => {
                this.data.orders.push({ id: child.key, ...child.val() });
            });
            this.notifySubscribers('orders');
        }));

        // Staff listener
        this.addListener('staff-global', staffRef.on('value', (snapshot) => {
            this.data.staff = [];
            snapshot.forEach((child) => {
                this.data.staff.push({ id: child.key, ...child.val() });
            });
            this.notifySubscribers('staff');
        }));

        // Inventory listener (already handled in app.js, but we can add it here too)
        this.addListener('inventory-global', inventoryRef.on('value', (snapshot) => {
            this.data.inventory = {};
            snapshot.forEach((child) => {
                const product = child.val();
                this.data.inventory[child.key] = {
                    name: product.name,
                    price: product.price,
                    quantity: product.quantity,
                    unit: product.unit,
                    id: child.key
                };
            });
            this.notifySubscribers('inventory');
        }));

        this.isInitialized = true;
    }

    /**
     * Add a listener and track it for cleanup
     */
    addListener(id, unsubscriber) {
        this.listeners.set(id, unsubscriber);
    }

    /**
     * Remove specific listener
     */
    removeListener(id) {
        const unsubscriber = this.listeners.get(id);
        if (unsubscriber) {
            unsubscriber();
            this.listeners.delete(id);
        }
    }

    /**
     * Remove all listeners for a route
     */
    removeRouteListeners(routeId) {
        for (const [id] of this.listeners) {
            if (id.startsWith(`${routeId}-`)) {
                this.removeListener(id);
            }
        }
    }

    /**
     * Get current data
     */
    getData(type) {
        return this.data[type] || null;
    }

    /**
     * Subscribe to data changes
     */
    subscribe(dataType, callback) {
        if (!this._subscribers) this._subscribers = {};
        if (!this._subscribers[dataType]) this._subscribers[dataType] = [];
        this._subscribers[dataType].push(callback);
    }

    /**
     * Notify subscribers of data changes
     */
    notifySubscribers(dataType) {
        if (!this._subscribers || !this._subscribers[dataType]) return;
        this._subscribers[dataType].forEach(callback => {
            try {
                callback(this.data[dataType]);
            } catch (error) {
                console.error('Error in subscriber callback:', error);
            }
        });
    }
}

// Global realtime data manager
const realtimeDataManager = new RealtimeDataManager();

/**
 * ROUTE: Login
 */
router.register('/login', {
    title: 'Login - Water Station Management System',
    render(params) {
        const buildLabel = window.APP_BUILD || 'local-dev';
        const appContainer = document.getElementById('app-container');
        appContainer.style.padding = '0';
        appContainer.style.minHeight = '100vh';
        appContainer.innerHTML = `
            <div class="d-flex align-items-center justify-content-center min-vh-100" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <div style="width: 100%; max-width: 400px; padding: 20px;">
                    <div class="card shadow-lg border-0">
                        <div class="card-body p-5">
                            <div class="text-center mb-4">
                                <i class="bi bi-droplet-fill" style="font-size: 3rem; color: #667eea;"></i>
                                <h2 class="card-title mt-3">Water Station<br>Management System</h2>
                            </div>
                            <form id="login-form">
                                <div class="mb-3">
                                    <label for="email" class="form-label">Email Address</label>
                                    <input type="email" class="form-control" id="email" placeholder="your@email.com" required>
                                </div>
                                <div class="mb-3">
                                    <label for="password" class="form-label">Password</label>
                                    <input type="password" class="form-control" id="password" placeholder="Enter your password" required>
                                </div>
                                <div class="d-grid">
                                    <button type="submit" class="btn btn-primary btn-lg">Login</button>
                                </div>
                                <hr class="my-4">
                                <p class="text-center text-muted small">Demo credentials available upon request</p>
                                <p class="text-center text-muted small mb-0">Build: <span id="build-label">${buildLabel}</span></p>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    onEnter(params) {
        // Setup login form handler
        setTimeout(() => {
            const loginForm = document.getElementById('login-form');
            if (loginForm && !loginForm.dataset.listenerAdded) {
                loginForm.addEventListener('submit', handleLogin);
                loginForm.dataset.listenerAdded = 'true';
            }
        }, 100);
    },
    onExit(params) {
        // Cleanup and restore padding
        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            appContainer.style.padding = '';
            appContainer.style.minHeight = '';
        }
    }
});

/**
 * ROUTE: Dashboard
 */
router.register('/dashboard', {
    title: 'Dashboard - Water Station Management System',
    render(params) {
        const appContainer = document.getElementById('app-container');
        appContainer.style.padding = '';
        appContainer.style.minHeight = '';
        appContainer.innerHTML = `
            <div class="container-fluid">
                <h3 class="mb-4">
                    <i class="bi bi-speedometer2 me-2"></i>Real-time Dashboard
                </h3>
                <div class="row g-4 mb-4">
                    <div class="col-md-3">
                        <div class="card h-100 border-primary">
                            <div class="card-body text-center">
                                <i class="bi bi-receipt display-4 text-primary mb-3"></i>
                                <h5 class="card-title">Total Orders Today</h5>
                                <h2 class="text-primary" id="today-orders">0</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card h-100 border-success">
                            <div class="card-body text-center">
                                <i class="bi bi-cash-coin display-4 text-success mb-3"></i>
                                <h5 class="card-title">Revenue Today</h5>
                                <h2 class="text-success" id="today-revenue">₱0</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card h-100 border-info">
                            <div class="card-body text-center">
                                <i class="bi bi-people-fill display-4 text-info mb-3"></i>
                                <h5 class="card-title">Active Staff</h5>
                                <h2 class="text-info" id="active-staff">0</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card h-100 border-warning">
                            <div class="card-body text-center">
                                <i class="bi bi-exclamation-triangle display-4 text-warning mb-3"></i>
                                <h5 class="card-title">Low Stock Items</h5>
                                <h2 class="text-warning" id="low-stock">0</h2>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row g-4">
                    <div class="col-lg-8">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="bi bi-clock-history me-2"></i>Recent Orders
                                </h5>
                            </div>
                            <div class="card-body">
                                <div id="recent-orders-table"></div>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-4">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="bi bi-person-check me-2"></i>Staff On Duty
                                </h5>
                            </div>
                            <div class="card-body">
                                <div id="staff-on-duty"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    onEnter(params) {
        // Subscribe to realtime updates
        realtimeDataManager.subscribe('orders', (orders) => {
            updateDashboardStats(orders);
            displayRecentOrders(orders);
        });

        realtimeDataManager.subscribe('staff', (staff) => {
            displayStaffOnDuty(staff);
            updateActiveStaffCount();
        });

        realtimeDataManager.subscribe('inventory', (inventory) => {
            updateLowStock(inventory);
        });

        // Initial render
        updateDashboardStats(realtimeDataManager.getData('orders'));
        displayRecentOrders(realtimeDataManager.getData('orders'));
        displayStaffOnDuty(realtimeDataManager.getData('staff'));
        updateActiveStaffCount();
        updateLowStock(realtimeDataManager.getData('inventory'));
    },
    onExit(params) {
        // Cleanup can happen here if needed
    }
});

/**
 * ROUTE: Orders Management
 */
router.register('/orders', {
    title: 'Orders - Water Station Management System',
    render(params) {
        const appContainer = document.getElementById('app-container');
        appContainer.style.padding = '';
        appContainer.style.minHeight = '';
        appContainer.innerHTML = `
            <div class="container-fluid">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h3 class="mb-0">
                        <i class="bi bi-receipt me-2"></i>Order Management
                    </h3>
                    <button onclick="openOrderModal()" class="btn btn-primary">
                        <i class="bi bi-plus-circle me-2"></i>Add New Order
                    </button>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <input type="text" class="form-control" id="order-search" placeholder="Search orders...">
                    </div>
                    <div class="col-md-3">
                        <select class="form-select" id="order-status-filter">
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>
                <div class="card">
                    <div class="card-body">
                        <div id="orders-table"></div>
                    </div>
                </div>
            </div>
            ${getOrderModalHTML()}
        `;
    },
    onEnter(params) {
        // Subscribe to realtime updates
        realtimeDataManager.subscribe('orders', (orders) => {
            displayOrders(orders);
        });

        // Setup search and filter listeners
        setTimeout(() => {
            const searchInput = document.getElementById('order-search');
            const statusFilter = document.getElementById('order-status-filter');
            
            if (searchInput) searchInput.addEventListener('input', filterOrders);
            if (statusFilter) statusFilter.addEventListener('change', filterOrders);
        }, 100);

        // Initial render
        displayOrders(realtimeDataManager.getData('orders'));
    },
    onExit(params) {
        realtimeDataManager.removeRouteListeners('orders');
    }
});

/**
 * ROUTE: Inventory Management
 */
router.register('/inventory', {
    title: 'Inventory - Water Station Management System',
    render(params) {
        const appContainer = document.getElementById('app-container');
        appContainer.style.padding = '';
        appContainer.style.minHeight = '';
        appContainer.innerHTML = `
            <div class="container-fluid">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h3 class="mb-0">
                        <i class="bi bi-box-seam me-2"></i>Inventory Management
                    </h3>
                    <button onclick="openInventoryModal()" class="btn btn-primary">
                        <i class="bi bi-plus-circle me-2"></i>Add Product
                    </button>
                </div>
                <div class="card">
                    <div class="card-body">
                        <div id="inventory-table"></div>
                    </div>
                </div>
            </div>
            ${getInventoryModalHTML()}
        `;
    },
    onEnter(params) {
        realtimeDataManager.subscribe('inventory', (inventory) => {
            displayInventory(inventory);
        });

        displayInventory(realtimeDataManager.getData('inventory'));
    },
    onExit(params) {
        realtimeDataManager.removeRouteListeners('inventory');
    }
});

/**
 * ROUTE: Staff Management
 */
router.register('/staff', {
    title: 'Staff - Water Station Management System',
    render(params) {
        const appContainer = document.getElementById('app-container');
        appContainer.style.padding = '';
        appContainer.style.minHeight = '';
        appContainer.innerHTML = `
            <div class="container-fluid">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h3 class="mb-0">
                        <i class="bi bi-people me-2"></i>Staff Management
                    </h3>
                    <button onclick="openStaffModal()" class="btn btn-primary">
                        <i class="bi bi-plus-circle me-2"></i>Add Staff Member
                    </button>
                </div>
                <div class="card">
                    <div class="card-body">
                        <div id="staff-table"></div>
                    </div>
                </div>
            </div>
            ${getStaffModalHTML()}
        `;
    },
    onEnter(params) {
        realtimeDataManager.subscribe('staff', (staff) => {
            displayStaff(staff);
        });

        displayStaff(realtimeDataManager.getData('staff'));
    },
    onExit(params) {
        realtimeDataManager.removeRouteListeners('staff');
    }
});

/**
 * ROUTE: Reports
 */
router.register('/reports', {
    title: 'Reports - Water Station Management System',
    render(params) {
        const appContainer = document.getElementById('app-container');
        appContainer.style.padding = '';
        appContainer.style.minHeight = '';
        appContainer.innerHTML = `
            <div class="container-fluid">
                <h3 class="mb-4">
                    <i class="bi bi-graph-up me-2"></i>Reports & Analytics
                </h3>
                <div class="row g-4">
                    <div class="col-lg-6">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">Orders by Status</h5>
                            </div>
                            <div class="card-body">
                                <div id="status-chart">Loading...</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-6">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">Revenue Trend</h5>
                            </div>
                            <div class="card-body">
                                <div id="revenue-chart">Loading...</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card mt-4">
                    <div class="card-header">
                        <h5 class="mb-0">Order History</h5>
                    </div>
                    <div class="card-body">
                        <div id="reports-table"></div>
                    </div>
                </div>
            </div>
        `;
    },
    onEnter(params) {
        realtimeDataManager.subscribe('orders', (orders) => {
            displayReports(orders);
        });

        displayReports(realtimeDataManager.getData('orders'));
    },
    onExit(params) {
        realtimeDataManager.removeRouteListeners('reports');
    }
});

