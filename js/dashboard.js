/**
 * Dashboard Module
 * Handles dashboard data display and updates
 */

/**
 * Load and display dashboard data
 */
async function loadDashboard() {
    try {
        if (!isAuthenticated()) {
            renderLogin();
            return;
        }

        const user = getCurrentUser();
        
        // Render dashboard based on role
        switch (user.role) {
            case 'super_admin':
            case 'admin':
                await renderAdminDashboard();
                break;
            case 'station_staff':
                await renderStaffDashboard();
                break;
            case 'driver':
                await renderDriverDashboard();
                break;
            case 'customer':
                await renderCustomerDashboard();
                break;
            default:
                renderLogin();
        }
    } catch (error) {
        console.error('Dashboard load error:', error);
        document.getElementById('app-container').innerHTML = '<div class="alert alert-danger">Error loading dashboard</div>';
    }
}

/**
 * Admin Dashboard
 */
async function renderAdminDashboard() {
    const container = document.getElementById('app-container');
    const user = getCurrentUser();

    container.innerHTML = `
        <div class="container-fluid p-4">
            <div class="row mb-4">
                <div class="col-12">
                    <h1 class="mb-1">Dashboard</h1>
                    <p class="text-muted">Welcome back, ${user.displayName}</p>
                </div>
            </div>

            <!-- Stats Row -->
            <div class="row mb-4">
                <div class="col-md-3 mb-3">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <p class="text-muted mb-1">Total Orders</p>
                                    <h2 class="mb-0" id="total-orders">0</h2>
                                </div>
                                <i class="bi bi-receipt text-primary" style="font-size: 2rem;"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-3 mb-3">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <p class="text-muted mb-1">Revenue</p>
                                    <h2 class="mb-0" id="total-revenue">₱0.00</h2>
                                </div>
                                <i class="bi bi-cash-coin text-success" style="font-size: 2rem;"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-3 mb-3">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <p class="text-muted mb-1">Active Users</p>
                                    <h2 class="mb-0" id="active-users">0</h2>
                                </div>
                                <i class="bi bi-people text-info" style="font-size: 2rem;"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-3 mb-3">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <p class="text-muted mb-1">Low Stock Items</p>
                                    <h2 class="mb-0" id="low-stock">0</h2>
                                </div>
                                <i class="bi bi-exclamation-triangle text-warning" style="font-size: 2rem;"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recent Orders -->
            <div class="row">
                <div class="col-lg-8">
                    <div class="card border-0 shadow-sm">
                        <div class="card-header bg-white border-bottom">
                            <h5 class="mb-0">Recent Orders</h5>
                        </div>
                        <div class="card-body">
                            <div id="recent-orders" style="min-height: 400px;">
                                <div class="text-center text-muted py-5">
                                    <i class="bi bi-inbox" style="font-size: 3rem;"></i>
                                    <p class="mt-2">No orders yet</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-lg-4">
                    <div class="card border-0 shadow-sm">
                        <div class="card-header bg-white border-bottom">
                            <h5 class="mb-0">Quick Actions</h5>
                        </div>
                        <div class="card-body">
                            <div class="d-grid gap-2">
                                <a href="#/orders" onclick="routeTo('/orders'); return false;" class="btn btn-outline-primary">
                                    <i class="bi bi-eye me-2"></i>View All Orders
                                </a>
                                <a href="#/inventory" onclick="routeTo('/inventory'); return false;" class="btn btn-outline-primary">
                                    <i class="bi bi-box-seam me-2"></i>Manage Inventory
                                </a>
                                <a href="#/staff" onclick="routeTo('/staff'); return false;" class="btn btn-outline-primary">
                                    <i class="bi bi-people me-2"></i>Manage Staff
                                </a>
                                <a href="#/reports" onclick="routeTo('/reports'); return false;" class="btn btn-outline-primary">
                                    <i class="bi bi-graph-up me-2"></i>View Reports
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Load dashboard data
    await loadDashboardData();
}

/**
 * Staff Dashboard
 */
async function renderStaffDashboard() {
    const container = document.getElementById('app-container');
    const user = getCurrentUser();

    container.innerHTML = `
        <div class="container-fluid p-4">
            <div class="row mb-4">
                <div class="col-12">
                    <h1 class="mb-1">Dashboard</h1>
                    <p class="text-muted">Welcome, ${user.displayName}</p>
                </div>
            </div>

            <!-- Stats Row -->
            <div class="row mb-4">
                <div class="col-md-4 mb-3">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <p class="text-muted mb-1">Today's Orders</p>
                                    <h2 class="mb-0" id="today-orders">0</h2>
                                </div>
                                <i class="bi bi-receipt text-primary" style="font-size: 2rem;"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-4 mb-3">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <p class="text-muted mb-1">Pending Orders</p>
                                    <h2 class="mb-0" id="pending-orders">0</h2>
                                </div>
                                <i class="bi bi-hourglass-split text-warning" style="font-size: 2rem;"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-4 mb-3">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <p class="text-muted mb-1">Completed</p>
                                    <h2 class="mb-0" id="completed-orders">0</h2>
                                </div>
                                <i class="bi bi-check-circle text-success" style="font-size: 2rem;"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Today's Orders -->
            <div class="row">
                <div class="col-12">
                    <div class="card border-0 shadow-sm">
                        <div class="card-header bg-white border-bottom">
                            <h5 class="mb-0">Orders to Process</h5>
                        </div>
                        <div class="card-body">
                            <div id="pending-orders-list" style="min-height: 300px;">
                                <div class="text-center text-muted py-5">
                                    <i class="bi bi-check-lg" style="font-size: 3rem;"></i>
                                    <p class="mt-2">All orders processed</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Driver Dashboard
 */
async function renderDriverDashboard() {
    const container = document.getElementById('app-container');
    const user = getCurrentUser();

    container.innerHTML = `
        <div class="container-fluid p-4">
            <div class="row mb-4">
                <div class="col-12">
                    <h1 class="mb-1">Dashboard</h1>
                    <p class="text-muted">Welcome, ${user.displayName}</p>
                </div>
            </div>

            <!-- Stats Row -->
            <div class="row mb-4">
                <div class="col-md-4 mb-3">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <p class="text-muted mb-1">Assigned Deliveries</p>
                                    <h2 class="mb-0" id="assigned-deliveries">0</h2>
                                </div>
                                <i class="bi bi-truck text-primary" style="font-size: 2rem;"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-4 mb-3">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <p class="text-muted mb-1">In Transit</p>
                                    <h2 class="mb-0" id="in-transit">0</h2>
                                </div>
                                <i class="bi bi-geo-alt text-info" style="font-size: 2rem;"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-4 mb-3">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <p class="text-muted mb-1">Completed Today</p>
                                    <h2 class="mb-0" id="completed-today">0</h2>
                                </div>
                                <i class="bi bi-check-circle text-success" style="font-size: 2rem;"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Active Deliveries -->
            <div class="row">
                <div class="col-12">
                    <div class="card border-0 shadow-sm">
                        <div class="card-header bg-white border-bottom">
                            <h5 class="mb-0">Active Deliveries</h5>
                        </div>
                        <div class="card-body">
                            <div id="active-deliveries" style="min-height: 300px;">
                                <div class="text-center text-muted py-5">
                                    <i class="bi bi-inbox" style="font-size: 3rem;"></i>
                                    <p class="mt-2">No active deliveries</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Customer Dashboard
 */
async function renderCustomerDashboard() {
    const container = document.getElementById('app-container');
    const user = getCurrentUser();

    container.innerHTML = `
        <div class="container-fluid p-4">
            <div class="row mb-4">
                <div class="col-12">
                    <h1 class="mb-1">My Orders</h1>
                    <p class="text-muted">Welcome, ${user.displayName}</p>
                </div>
            </div>

            <!-- Quick Stats -->
            <div class="row mb-4">
                <div class="col-md-3 mb-3">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body">
                            <p class="text-muted mb-1">Active Orders</p>
                            <h2 class="mb-0" id="customer-active-orders">0</h2>
                        </div>
                    </div>
                </div>

                <div class="col-md-3 mb-3">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body">
                            <p class="text-muted mb-1">Total Spent</p>
                            <h2 class="mb-0" id="customer-total-spent">₱0</h2>
                        </div>
                    </div>
                </div>

                <div class="col-md-3 mb-3">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body">
                            <p class="text-muted mb-1">Completed</p>
                            <h2 class="mb-0" id="customer-completed">0</h2>
                        </div>
                    </div>
                </div>

                <div class="col-md-3 mb-3">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body">
                            <button class="btn btn-primary w-100" onclick="routeTo('/orders'); return false;">
                                <i class="bi bi-plus-circle me-2"></i>New Order
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Order List -->
            <div class="row">
                <div class="col-12">
                    <div class="card border-0 shadow-sm">
                        <div class="card-header bg-white border-bottom">
                            <h5 class="mb-0">Your Orders</h5>
                        </div>
                        <div class="card-body">
                            <div id="customer-orders-list" style="min-height: 300px;">
                                <div class="text-center text-muted py-5">
                                    <i class="bi bi-inbox" style="font-size: 3rem;"></i>
                                    <p class="mt-2">No orders yet</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Load dashboard data from API
 */
async function loadDashboardData() {
    try {
        // Fetch stats from API (these endpoints will be created in the backend)
        // For now, this is a placeholder that will be populated when backend is ready
        console.log('Dashboard data loaded');
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadDashboard };
}
