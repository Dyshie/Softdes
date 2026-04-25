/**
 * Display Functions for Routes
 * These functions render content for each route based on realtime data
 */

// ============ ORDERS DISPLAY ============
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
    
    // Re-attach event listeners for search and filter
    setTimeout(() => {
        const searchInput = document.getElementById('order-search');
        const statusFilter = document.getElementById('order-status-filter');
        
        if (searchInput && !searchInput.dataset.listenerAdded) {
            searchInput.addEventListener('input', filterOrders);
            searchInput.dataset.listenerAdded = 'true';
        }
        if (statusFilter && !statusFilter.dataset.listenerAdded) {
            statusFilter.addEventListener('change', filterOrders);
            statusFilter.dataset.listenerAdded = 'true';
        }
    }, 50);
}

function filterOrders() {
    const searchTerm = document.getElementById('order-search')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('order-status-filter')?.value || 'all';
    
    const allOrders = realtimeDataManager.getData('orders') || [];
    
    const filteredOrders = allOrders.filter(order => {
        const matchesSearch = order.customerName.toLowerCase().includes(searchTerm) ||
                            order.customerPhone.includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });
    
    displayOrders(filteredOrders);
}

// ============ STAFF DISPLAY ============
function displayStaff(staff) {
    const container = document.getElementById('staff-table');
    if (!container) return;
    
    if (!staff || staff.length === 0) {
        container.innerHTML = '<p class="text-muted">No staff members found</p>';
        return;
    }
    
    let html = '<div class="table-responsive"><table class="table table-hover"><thead class="table-light"><tr><th>Name</th><th>Role</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
    
    staff.forEach(member => {
        const statusBadge = `<span class="badge bg-${member.status === 'active' ? 'success' : member.status === 'suspended' ? 'danger' : 'secondary'}">${member.status}</span>`;
        
        let suspendButton = '';
        if (member.status === 'active') {
            suspendButton = `<button class="btn btn-sm btn-outline-warning ms-1" onclick="suspendStaff('${member.id}')">
                <i class="bi bi-ban"></i> Suspend
            </button>`;
        } else if (member.status === 'suspended') {
            suspendButton = `<button class="btn btn-sm btn-outline-success ms-1" onclick="unsuspendStaff('${member.id}')">
                <i class="bi bi-check"></i> Unsuspend
            </button>`;
        }
        
        html += `<tr>
            <td>${member.name}</td>
            <td>${member.role}</td>
            <td>${member.phone}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-info me-1" onclick="viewStaffCard('${member.id}')">
                    <i class="bi bi-person-vcard"></i> View
                </button>
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

// Staff Card Modal
function viewStaffCard(staffId) {
    const staff = (realtimeDataManager.getData('staff') || []).find(s => s.id === staffId);
    if (!staff) {
        showNotification('Staff not found', 'error');
        return;
    }
    // Remove any existing modal
    const existing = document.getElementById('staff-card-modal');
    if (existing) existing.remove();
    // Modal HTML
    const modalHtml = `
    <div class="modal fade" id="staff-card-modal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title"><i class="bi bi-person-vcard me-2"></i>Staff Details</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="card shadow border-0">
              <div class="card-body">
                <h4 class="card-title mb-2">${staff.name}</h4>
                <p class="mb-1"><strong>Email:</strong> ${staff.email || 'N/A'}</p>
                <p class="mb-1"><strong>Phone:</strong> ${staff.phone || 'N/A'}</p>
                <p class="mb-1"><strong>Address:</strong> ${staff.address || 'N/A'}</p>
                <p class="mb-1"><strong>Age:</strong> ${staff.age || 'N/A'}</p>
                <p class="mb-1"><strong>Status:</strong> <span class="badge bg-${staff.status === 'active' ? 'success' : staff.status === 'suspended' ? 'danger' : 'secondary'}">${staff.status}</span></p>
                <p class="mb-1"><strong>Date Hired:</strong> ${staff.dateAdded ? (new Date(staff.dateAdded).toLocaleDateString()) : 'N/A'}</p>
                <p class="mb-1"><strong>Date Suspended:</strong> ${staff.status === 'suspended' && staff.dateSuspended ? (new Date(staff.dateSuspended).toLocaleDateString()) : (staff.status === 'suspended' ? 'Unknown' : 'N/A')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('staff-card-modal'));
    modal.show();
    document.getElementById('staff-card-modal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}


// ============ INVENTORY DISPLAY ============
function displayInventory(inventory) {
    const container = document.getElementById('inventory-table');
    if (!container) return;
    
    if (!inventory || Object.keys(inventory).length === 0) {
        container.innerHTML = '<p class="text-muted">No products found</p>';
        return;
    }
    
    let html = '<div class="table-responsive"><table class="table table-hover"><thead class="table-light"><tr><th>Product Name</th><th>Unit</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
    
    Object.entries(inventory).forEach(([id, product]) => {
        const stockStatus = product.quantity < 10 ? 'danger' : 'success';
        const stockBadge = `<span class="badge bg-${stockStatus}">${product.quantity} units</span>`;
        
        html += `<tr>
            <td>${product.name}</td>
            <td>${product.unit}</td>
            <td>₱${product.price}</td>
            <td>${stockBadge}</td>
            <td>${product.quantity < 10 ? '<span class="badge bg-warning">Low Stock</span>' : '<span class="badge bg-success">In Stock</span>'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editInventory('${id}')">
                    <i class="bi bi-pencil"></i> Edit
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteInventory('${id}')">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </td>
        </tr>`;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// ============ REPORTS DISPLAY ============
function displayReports(orders) {
    const container = document.getElementById('reports-table');
    if (!container) return;
    
    if (!orders || orders.length === 0) {
        container.innerHTML = '<p class="text-muted">No orders found</p>';
        return;
    }
    
    // Calculate statistics
    let totalOrders = 0;
    let totalRevenue = 0;
    let byStatus = { pending: 0, processing: 0, delivered: 0, cancelled: 0 };
    let byProduct = {};
    
    orders.forEach(order => {
        totalOrders++;
        const orderTotal = calculateOrderTotal(order.price, order.quantity);
        totalRevenue += orderTotal;
        
        byStatus[order.status] = (byStatus[order.status] || 0) + 1;
        byProduct[order.productType] = (byProduct[order.productType] || 0) + 1;
    });
    
    // Display summary stats
    let html = `
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card">
                    <div class="card-body text-center">
                        <h6 class="text-muted">Total Orders</h6>
                        <h3>${totalOrders}</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card">
                    <div class="card-body text-center">
                        <h6 class="text-muted">Total Revenue</h6>
                        <h3>₱${totalRevenue.toLocaleString()}</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card">
                    <div class="card-body text-center">
                        <h6 class="text-muted">Delivered</h6>
                        <h3>${byStatus.delivered}</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card">
                    <div class="card-body text-center">
                        <h6 class="text-muted">Avg Order Value</h6>
                        <h3>₱${totalOrders > 0 ? Math.round(totalRevenue / totalOrders).toLocaleString() : 0}</h3>
                    </div>
                </div>
            </div>
        </div>
        
        <h5 class="mb-3">Orders by Status</h5>
        <table class="table table-sm">
            <tr>
                <td>Pending: <strong>${byStatus.pending}</strong></td>
                <td>Processing: <strong>${byStatus.processing}</strong></td>
                <td>Delivered: <strong>${byStatus.delivered}</strong></td>
                <td>Cancelled: <strong>${byStatus.cancelled}</strong></td>
            </tr>
        </table>
        
        <h5 class="mb-3 mt-4">Top Products</h5>
        <table class="table table-sm">
    `;
    
    Object.entries(byProduct)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([product, count]) => {
            html += `<tr><td>${product}</td><td><strong>${count} units</strong></td></tr>`;
        });
    
    html += '</table>';
    container.innerHTML = html;
}

// ============ UTILITY FUNCTIONS ============
function calculateOrderTotal(price, quantity) {
    return (parseFloat(price) || 0) * parseInt(quantity);
}

function showNotification(message, type = 'success') {
    const alertType = type === 'error' ? 'danger' : (type === 'warning' ? 'warning' : 'success');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${alertType} alert-dismissible fade show`;
    alertDiv.setAttribute('role', 'alert');
    alertDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1050; min-width: 300px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); animation: slideIn 0.3s ease-out;';
    
    const icon = type === 'error' ? '❌' : (type === 'warning' ? '⚠️' : '✅');
    alertDiv.innerHTML = `${icon} ${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => alertDiv.remove(), 3000);
}

function populateProductDropdown() {
    const productSelect = document.getElementById('product-type');
    if (!productSelect) return;
    
    productSelect.innerHTML = '<option value="">Select Product</option>';
    const inventory = realtimeDataManager.getData('inventory') || {};
    
    Object.entries(inventory).forEach(([id, product]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `${product.name} - ₱${product.price}/${product.unit}`;
        productSelect.appendChild(option);
    });
}

function checkInventoryLevel(productId, orderedQuantity) {
    const inventory = realtimeDataManager.getData('inventory') || {};
    const product = inventory[productId];
    
    if (product && product.quantity - orderedQuantity < 10) {
        showNotification(`⚠️ Low stock: ${product.name} has only ${product.quantity - orderedQuantity} left!`, 'warning');
    }
}
