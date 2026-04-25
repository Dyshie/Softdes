/**
 * Reports Component
 */
async function renderReports() {
    const container = document.getElementById('app-container');

    container.innerHTML = `
        <div class="container-fluid p-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1>Daily Reports</h1>
                <button class="btn btn-success" onclick="generateReport()">Generate Sales Report</button>
            </div>
            <div id="reports-container" class="card">
                <div class="card-body">Loading reports...</div>
            </div>
        </div>
    `;

    await loadReports();
}

/**
 * Load and display daily reports
 */
async function loadReports() {
    try {
        const data = await apiClient.reports.getAll();
        const container = document.getElementById('reports-container');

        if (!container) {
            return;
        }

        const reportDate = data.date ? new Date(data.date).toLocaleDateString() : 'Today';
        const totalOrders = Number(data.totalOrders || 0);
        const totalSales = Number(data.totalSales || 0);
        const orders = Array.isArray(data.orders) ? data.orders : [];

        let html = `
            <div class="mb-3">
                <h5>Report for ${reportDate}</h5>
                <p class="text-muted">Total Orders: ${totalOrders} | Total Sales: ₱${totalSales.toFixed(2)}</p>
            </div>
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead class="table-light">
                        <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Items</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Staff</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (orders.length === 0) {
            html += `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">No orders found for this date.</td>
                </tr>
            `;
        } else {
            orders.forEach((order) => {
                const createdAt = order.createdAt ? new Date(order.createdAt) : null;
                const time = createdAt ? createdAt.toLocaleTimeString() : 'N/A';
                const itemsSummary = Array.isArray(order.items)
                    ? order.items.map((item) => `${item.productName} (${item.quantity})`).join(', ')
                    : 'No items';

                html += `
                    <tr>
                        <td>${order.id || 'N/A'}</td>
                        <td>${order.customerName || 'N/A'}</td>
                        <td>${itemsSummary}</td>
                        <td>₱${Number(order.totalAmount || 0).toFixed(2)}</td>
                        <td><span class="badge bg-info">${order.status || 'N/A'}</span></td>
                        <td>${order.staffName || 'Unknown'}</td>
                        <td>${time}</td>
                    </tr>
                `;
            });
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading reports:', error);
        const container = document.getElementById('reports-container');
        if (container) {
            container.innerHTML = '<div class="alert alert-danger">Error loading reports</div>';
        }
    }
}

/**
 * Generate sales report
 */
async function generateReport() {
    try {
        const response = await fetch(`${apiClient.baseURL}/reports/generate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiClient.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to generate report');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-report-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error generating report:', error);
        alert(`Error generating report: ${error.message}`);
    }
}

// Register the route
router.register('/reports', renderReports);
