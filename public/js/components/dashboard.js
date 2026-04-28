/**
 * Dashboard Component
 */
async function renderDashboard() {
    const container = document.getElementById('app-container');
    const currentUser = getCurrentUser() || {};
    const isAdmin = currentUser.role === 'super_admin' || currentUser.role === 'admin';
    
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

            ${isAdmin ? `
                <div class="row mt-4">
                    <div class="col-lg-5 mb-4">
                        <div class="card h-100 shadow-sm">
                            <div class="card-header bg-white d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">System Diagnostics</h5>
                                <span class="badge bg-secondary">Admin only</span>
                            </div>
                            <div class="card-body" id="diagnostics-container">
                                <div class="text-muted">Loading diagnostics...</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-7 mb-4">
                        <div class="card h-100 shadow-sm">
                            <div class="card-header bg-white d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">Recent Activity</h5>
                                <span class="badge bg-info text-dark">Operational timeline</span>
                            </div>
                            <div class="card-body" id="activity-container">
                                <div class="text-muted">Loading activity...</div>
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}
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

    if (isAdmin) {
        await loadAdminDashboardPanels();
    }
}

function escapeDashboardHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[character]));
}

async function loadAdminDashboardPanels() {
    try {
        const [diagnostics, activity] = await Promise.all([
            apiClient.dashboard.getDiagnostics(),
            apiClient.dashboard.getActivity()
        ]);

        const diagnosticsContainer = document.getElementById('diagnostics-container');
        if (diagnosticsContainer) {
            const warnings = Array.isArray(diagnostics.warnings) ? diagnostics.warnings : [];
            const smtpStatus = diagnostics.smtp || {};

            diagnosticsContainer.innerHTML = `
                <div class="small text-muted mb-3">API base URL: ${escapeDashboardHtml(apiClient.baseURL)}</div>
                <div class="list-group list-group-flush mb-3">
                    <div class="list-group-item d-flex justify-content-between align-items-center px-0">
                        <span>Firebase DB</span>
                        <span class="badge ${diagnostics.firebaseDatabaseConfigured ? 'bg-success' : 'bg-danger'}">${diagnostics.firebaseDatabaseConfigured ? 'Configured' : 'Missing'}</span>
                    </div>
                    <div class="list-group-item d-flex justify-content-between align-items-center px-0">
                        <span>Firebase API key</span>
                        <span class="badge ${diagnostics.firebaseApiKeyConfigured ? 'bg-success' : 'bg-danger'}">${diagnostics.firebaseApiKeyConfigured ? 'Configured' : 'Missing'}</span>
                    </div>
                    <div class="list-group-item d-flex justify-content-between align-items-center px-0">
                        <span>SMTP</span>
                        <span class="badge ${smtpStatus.smtpHealthy ? 'bg-success' : 'bg-warning text-dark'}">${smtpStatus.smtpHealthy ? 'Healthy' : 'Needs attention'}</span>
                    </div>
                </div>
                ${warnings.length > 0 ? `<div class="alert alert-warning mb-0">${warnings.map(escapeDashboardHtml).join('<br>')}</div>` : '<div class="alert alert-success mb-0">No diagnostics warnings detected.</div>'}
            `;
        }

        const activityContainer = document.getElementById('activity-container');
        if (activityContainer) {
            if (!Array.isArray(activity) || activity.length === 0) {
                activityContainer.innerHTML = '<div class="text-muted">No recent activity available.</div>';
                return;
            }

            activityContainer.innerHTML = `
                <div class="list-group list-group-flush">
                    ${activity.map((entry) => {
                        const time = entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'N/A';
                        return `
                            <div class="list-group-item px-0">
                                <div class="d-flex justify-content-between align-items-start gap-3">
                                    <div>
                                        <div class="fw-semibold">${escapeDashboardHtml(entry.title)}</div>
                                        <div class="text-muted small">${escapeDashboardHtml(entry.description)}</div>
                                        <div class="text-muted small mt-1">By ${escapeDashboardHtml(entry.actorName || 'System')}</div>
                                    </div>
                                    <span class="text-muted small text-nowrap">${escapeDashboardHtml(time)}</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading admin dashboard panels:', error);

        const diagnosticsContainer = document.getElementById('diagnostics-container');
        if (diagnosticsContainer) {
            diagnosticsContainer.innerHTML = '<div class="alert alert-danger mb-0">Error loading diagnostics</div>';
        }

        const activityContainer = document.getElementById('activity-container');
        if (activityContainer) {
            activityContainer.innerHTML = '<div class="alert alert-danger mb-0">Error loading activity</div>';
        }
    }
}

// Register dashboard route
router.register('/dashboard', renderDashboard);
