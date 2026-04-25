/**
 * Deliveries Component
 */
async function renderDeliveries() {
    const container = document.getElementById('app-container');

    container.innerHTML = `
        <div class="container-fluid p-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1>Deliveries</h1>
                    <p class="text-muted mb-0">Active deliveries assigned to you.</p>
                </div>
                <button class="btn btn-outline-primary" onclick="loadDeliveries()">Refresh</button>
            </div>
            <div id="deliveries-container" class="card">
                <div class="card-body">Loading deliveries...</div>
            </div>
        </div>
    `;

    await loadDeliveries();
}

async function loadDeliveries() {
    try {
        const deliveries = await apiClient.deliveries.getAll();
        const container = document.getElementById('deliveries-container');

        if (!container) {
            return;
        }

        if (!Array.isArray(deliveries) || deliveries.length === 0) {
            container.innerHTML = '<div class="card-body text-muted">No active deliveries assigned.</div>';
            return;
        }

        let html = '<div class="table-responsive"><table class="table table-hover"><thead class="table-light"><tr><th>Order ID</th><th>Customer</th><th>Address</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead><tbody>';

        deliveries.forEach((order) => {
            const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A';
            const status = order.status || 'N/A';
            const actions = [];

            if (status !== 'in_transit' && status !== 'delivered') {
                actions.push(`<button class="btn btn-sm btn-primary me-1" onclick="updateDeliveryStatus('${order.id}', 'in_transit')">Start Delivery</button>`);
            }

            if (status === 'in_transit') {
                actions.push(`<button class="btn btn-sm btn-success" onclick="updateDeliveryStatus('${order.id}', 'delivered')">Mark Delivered</button>`);
            }

            html += `<tr>
                <td>${order.id}</td>
                <td>${order.customerName || 'N/A'}</td>
                <td>${order.customerAddress || 'N/A'}</td>
                <td><span class="badge bg-info">${status}</span></td>
                <td>${date}</td>
                <td>${actions.join('') || '<span class="text-muted">No actions</span>'}</td>
            </tr>`;
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading deliveries:', error);
        const container = document.getElementById('deliveries-container');
        if (container) {
            container.innerHTML = '<div class="alert alert-danger">Error loading deliveries</div>';
        }
    }
}

async function updateDeliveryStatus(orderId, status) {
    try {
        await apiClient.orders.updateStatus(orderId, { status });
        await loadDeliveries();
    } catch (error) {
        alert('Error updating delivery: ' + error.message);
    }
}

router.register('/deliveries', renderDeliveries);