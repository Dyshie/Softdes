/**
 * Dashboard Component
 */
async function renderDashboard() {
    const container = document.getElementById('app-container');
    
    container.innerHTML = `
        <div class="container-fluid p-4">
            <h1 class="mb-4">Dashboard</h1>
            <div id="stats-container" class="row">
                <div class="col-md-3 mb-4">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="card-title text-muted">Total Orders</h6>
                            <h2 id="total-orders">-</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-4">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="card-title text-muted">Pending Orders</h6>
                            <h2 id="pending-orders">-</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-4">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="card-title text-muted">Total Revenue</h6>
                            <h2 id="total-revenue">₱0</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-4">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="card-title text-muted">Active Staff</h6>
                            <h2 id="active-staff">-</h2>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-12">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">Recent Orders</h5>
                        </div>
                        <div class="card-body">
                            <div id="recent-orders-container">Loading...</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    try {
        const stats = await apiClient.dashboard.getStats();
        const recentOrders = await apiClient.dashboard.getRecentOrders();

        const recentOrdersContainer = document.getElementById('recent-orders-container');
        const totalOrdersElement = document.getElementById('total-orders');
        const pendingOrdersElement = document.getElementById('pending-orders');
        const totalRevenueElement = document.getElementById('total-revenue');
        const activeStaffElement = document.getElementById('active-staff');

        if (!recentOrdersContainer || !totalOrdersElement || !pendingOrdersElement || !totalRevenueElement || !activeStaffElement) {
            return;
        }

        totalOrdersElement.textContent = stats.orders.total;
        pendingOrdersElement.textContent = stats.orders.pending;
        totalRevenueElement.textContent = `₱${Number(stats.orders.revenue || 0).toFixed(2)}`;
        activeStaffElement.textContent = stats.staff.active;

        let ordersHtml = '<div class="table-responsive"><table class="table table-hover"><thead class="table-light"><tr><th>Order ID</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>';
        
        recentOrders.forEach(order => {
            const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A';
            ordersHtml += `<tr>
                <td>${order.id.substring(0, 12)}</td>
                <td>${order.customerName || 'Customer'}</td>
                <td>₱${Number(order.totalAmount || 0).toFixed(2)}</td>
                <td><span class="badge bg-info">${order.status}</span></td>
                <td>${date}</td>
            </tr>`;
        });
        
        ordersHtml += '</tbody></table></div>';
        recentOrdersContainer.innerHTML = ordersHtml;
    } catch (error) {
        console.error('Error loading dashboard:', error);
        const recentOrdersContainer = document.getElementById('recent-orders-container');
        if (recentOrdersContainer) {
            recentOrdersContainer.innerHTML = '<div class="alert alert-danger">Error loading data</div>';
        }
    }
}

// Register dashboard route
router.register('/dashboard', renderDashboard);
