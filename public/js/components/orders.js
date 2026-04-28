/**
 * Orders Component
 */
async function renderOrders() {
    const container = document.getElementById('app-container');
    
    container.innerHTML = `
        <div class="container-fluid p-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1>Orders</h1>
                <button class="btn btn-primary" onclick="openOrderModal()">New Order</button>
            </div>
            <div id="orders-container" class="card">
                <div class="card-body">Loading orders...</div>
            </div>
        </div>
    `;

    // Load and cache inventory for order forms
    await loadInventoryCache();
    await loadOrders();
}

function getCurrentRole() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.role || null;
}

function isStationStaffRole(role) {
    return role === 'station_staff' || role === 'staff';
}

function canManageOrders() {
    const role = getCurrentRole();
    return role === 'super_admin' || role === 'admin' || isStationStaffRole(role);
}

function canAssignDrivers() {
    return canManageOrders();
}

function getInventoryUnitPrice(item) {
    if (typeof item.price !== 'undefined') {
        return Number(item.price || 0);
    }

    return Number(item.pricing?.sellingPrice || 0);
}

function getInventoryUnit(item) {
    return item.unit || 'unit';
}

function buildDriverNameMap(drivers = []) {
    return drivers.reduce((map, driver) => {
        const driverName = driver.name || driver.displayName || driver.email || driver.id;

        if (driver.id) {
            map[driver.id] = driverName;
        }

        if (driver.uid) {
            map[driver.uid] = driverName;
        }

        return map;
    }, {});
}

function getDriverAssignmentValue(driver) {
    return driver.uid || driver.id || '';
}

function resolveDriverSelectionValue(selectedDriverId, drivers = []) {
    if (!selectedDriverId) {
        return '';
    }

    const directMatch = drivers.find((driver) => getDriverAssignmentValue(driver) === selectedDriverId);
    if (directMatch) {
        return getDriverAssignmentValue(directMatch);
    }

    const legacyMatch = drivers.find((driver) => driver.id === selectedDriverId || driver.uid === selectedDriverId);
    return legacyMatch ? getDriverAssignmentValue(legacyMatch) : selectedDriverId;
}

async function loadDriverDirectory() {
    try {
        const drivers = await apiClient.staff.getDrivers();
        return buildDriverNameMap(drivers);
    } catch (error) {
        console.error('Error loading driver directory:', error);
        return {};
    }
}

/**
 * Load and display orders
 */
async function loadOrders() {
    try {
        const [orders, driverNameMap] = await Promise.all([
            apiClient.orders.getAll(),
            loadDriverDirectory()
        ]);
        const container = document.getElementById('orders-container');

        if (!container) {
            return;
        }

        let html = '<div class="table-responsive"><table class="table table-hover"><thead class="table-light"><tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Amount</th><th>Status</th><th>Driver</th><th>Date</th><th>Actions</th></tr></thead><tbody>';
        
        orders.forEach(order => {
            const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A';
            const itemsSummary = order.items ? order.items.map(item => `${item.productName} (${item.quantity})`).join(', ') : 'No items';
            const assignedDriver = order.assignedDriver
                ? (driverNameMap[order.assignedDriver] || order.assignedDriver)
                : 'Unassigned';
            const canApprove = canManageOrders() && order.status === 'pending';
            html += `<tr>
                <td>${order.id}</td>
                <td>${order.customerName || 'N/A'}</td>
                <td>${itemsSummary}</td>
                <td>₱${Number(order.totalAmount || 0).toFixed(2)}</td>
                <td><span class="badge bg-info">${order.status}</span></td>
                <td>${assignedDriver}</td>
                <td>${date}</td>
                <td>
                    ${canApprove ? `<button class="btn btn-sm btn-success me-1" onclick="acceptOrder('${order.id}')">Accept</button>` : ''}
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editOrder('${order.id}')">Edit</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteOrder('${order.id}')">Delete</button>
                </td>
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading orders:', error);
        const container = document.getElementById('orders-container');
        if (container) {
            container.innerHTML = '<div class="alert alert-danger">Error loading orders</div>';
        }
    }
}

/**
 * Open order modal for creating/editing
 */
async function openOrderModal(orderId = null) {
    // Get inventory from cache
    let inventory = JSON.parse(localStorage.getItem('inventory') || '[]');
    let selectedDriverValue = '';

    // Create modal HTML
    let modalHtml = `
        <div class="modal fade" id="orderModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="order-modal-title">New Order</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="order-form">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="order-customer-name" class="form-label">Customer Name</label>
                                    <input type="text" class="form-control" id="order-customer-name" required>
                                </div>
                                <div class="col-md-6">
                                    <label for="order-customer-phone" class="form-label">Phone Number</label>
                                    <input type="tel" class="form-control" id="order-customer-phone" required>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="order-customer-address" class="form-label">Delivery Address</label>
                                <textarea class="form-control" id="order-customer-address" rows="2" required></textarea>
                            </div>
                            <div class="mb-3">
                                <label for="order-customer-id" class="form-label">Customer UID (optional)</label>
                                <input type="text" class="form-control" id="order-customer-id" placeholder="Auto-filled with current user if left blank">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Order Items</label>
                                <div id="order-items">
                                    <div class="order-item row mb-2">
                                        <div class="col-md-5">
                                            <select class="form-select product-select" required>
                                                <option value="">Select Product</option>
                                                ${inventory.map(item => {
                                                    const unitPrice = getInventoryUnitPrice(item);
                                                    const unit = getInventoryUnit(item);
                                                    return `<option value="${item.id}" data-price="${unitPrice}" data-unit="${unit}">${item.name} - ₱${unitPrice}/${unit}</option>`;
                                                }).join('')}
                                            </select>
                                        </div>
                                        <div class="col-md-3">
                                            <input type="number" class="form-control quantity-input" placeholder="Qty" min="1" required>
                                        </div>
                                        <div class="col-md-3">
                                            <input type="text" class="form-control item-total" readonly placeholder="Total">
                                        </div>
                                        <div class="col-md-1">
                                            <button type="button" class="btn btn-outline-danger btn-sm remove-item" onclick="removeOrderItem(this)">
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <button type="button" class="btn btn-outline-primary btn-sm" onclick="addOrderItem()">Add Item</button>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="order-total-amount" class="form-label">Total Amount</label>
                                    <div class="input-group">
                                        <span class="input-group-text">₱</span>
                                        <input type="number" class="form-control" id="order-total-amount" readonly step="0.01">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <label for="order-status" class="form-label">Status</label>
                                    <select class="form-control" id="order-status">
                                        <option value="pending">Pending</option>
                                        <option value="confirmed">Confirmed</option>
                                        <option value="processing">Processing</option>
                                        <option value="delivered">Delivered</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-12">
                                    <label for="order-assigned-driver" class="form-label">Assigned Driver</label>
                                    <select class="form-control" id="order-assigned-driver">
                                        <option value="">Loading drivers...</option>
                                    </select>
                                </div>
                            </div>
                            <input type="hidden" id="order-id">
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="saveOrder()">Save Order</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('orderModal'));

    if (orderId) {
        try {
            const order = await apiClient.orders.getOne(orderId);
            document.getElementById('order-id').value = orderId;
            document.getElementById('order-customer-name').value = order.customerName || '';
            document.getElementById('order-customer-phone').value = order.customerPhone || '';
            document.getElementById('order-customer-address').value = order.customerAddress || '';
            document.getElementById('order-customer-id').value = order.customerId || '';
            document.getElementById('order-total-amount').value = order.totalAmount;
            document.getElementById('order-status').value = order.status;
            selectedDriverValue = order.assignedDriver || '';
            document.getElementById('order-modal-title').textContent = 'Edit Order';

            // Load existing items if available
            if (order.items && order.items.length > 0) {
                loadOrderItems(order.items);
            }
        } catch (error) {
            console.error('Error loading order:', error);
        }
    } else {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (currentUser.uid) {
            document.getElementById('order-customer-id').value = currentUser.uid;
        }
    }

    await loadDriverOptions(selectedDriverValue);

    modal.show();

    document.getElementById('orderModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });

    // Add event listeners for price calculation
    setupOrderItemListeners();
}

/**
 * Save order
 */
async function saveOrder() {
    try {
        const orderId = document.getElementById('order-id').value;
        const items = getOrderItems();

        if (items.length === 0) {
            alert('Please add at least one item to the order.');
            return;
        }

        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const customerIdInput = document.getElementById('order-customer-id').value.trim();
        const customerId = customerIdInput || currentUser.uid;

        if (!customerId) {
            alert('Customer UID is required. Please provide a customer ID.');
            return;
        }

        const data = {
            customerId,
            customerName: document.getElementById('order-customer-name').value,
            customerPhone: document.getElementById('order-customer-phone').value,
            customerAddress: document.getElementById('order-customer-address').value,
            items: items,
            totalAmount: parseFloat(document.getElementById('order-total-amount').value),
            status: document.getElementById('order-status').value,
            assignedDriver: document.getElementById('order-assigned-driver').value || null
        };

        if (orderId) {
            await apiClient.orders.update(orderId, data);
        } else {
            await apiClient.orders.create(data);
        }

        bootstrap.Modal.getInstance(document.getElementById('orderModal')).hide();
        await loadOrders();
    } catch (error) {
        alert('Error saving order: ' + error.message);
    }
}

async function loadDriverOptions(selectedDriverId = '') {
    const select = document.getElementById('order-assigned-driver');
    if (!select) {
        return;
    }

    if (!canAssignDrivers()) {
        select.innerHTML = '<option value="">Driver assignment unavailable</option>';
        select.disabled = true;
        return;
    }

    try {
        const drivers = await apiClient.staff.getDrivers();

        const options = ['<option value="">Select a driver</option>'];
        drivers.forEach((driver) => {
            const optionValue = getDriverAssignmentValue(driver);
            options.push(`<option value="${optionValue}">${driver.name || driver.email || driver.id}</option>`);
        });

        select.innerHTML = options.join('');
        select.disabled = false;
        select.value = resolveDriverSelectionValue(selectedDriverId, drivers);
    } catch (error) {
        console.error('Error loading drivers:', error);
        select.innerHTML = '<option value="">Unable to load drivers</option>';
        select.disabled = true;
    }
}

/**
 * Add new order item row
 */
function addOrderItem() {
    const inventory = JSON.parse(localStorage.getItem('inventory') || '[]');
    const itemsContainer = document.getElementById('order-items');

    const itemHtml = `
        <div class="order-item row mb-2">
            <div class="col-md-5">
                <select class="form-select product-select" required>
                    <option value="">Select Product</option>
                    ${inventory.map(item => {
                        const unitPrice = getInventoryUnitPrice(item);
                        const unit = getInventoryUnit(item);
                        return `<option value="${item.id}" data-price="${unitPrice}" data-unit="${unit}">${item.name} - ₱${unitPrice}/${unit}</option>`;
                    }).join('')}
                </select>
            </div>
            <div class="col-md-3">
                <input type="number" class="form-control quantity-input" placeholder="Qty" min="1" required>
            </div>
            <div class="col-md-3">
                <input type="text" class="form-control item-total" readonly placeholder="Total">
            </div>
            <div class="col-md-1">
                <button type="button" class="btn btn-outline-danger btn-sm remove-item" onclick="removeOrderItem(this)">Remove</button>
            </div>
        </div>
    `;

    itemsContainer.insertAdjacentHTML('beforeend', itemHtml);
    setupOrderItemListeners();
}

/**
 * Remove order item row
 */
function removeOrderItem(button) {
    const itemRow = button.closest('.order-item');
    itemRow.remove();
    calculateTotal();
}

/**
 * Setup event listeners for order items
 */
function setupOrderItemListeners() {
    // Product selection change
    document.querySelectorAll('.product-select').forEach(select => {
        select.addEventListener('change', function() {
            calculateItemTotal(this.closest('.order-item'));
            calculateTotal();
        });
    });

    // Quantity change
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('input', function() {
            calculateItemTotal(this.closest('.order-item'));
            calculateTotal();
        });
    });
}

/**
 * Calculate total for a single item
 */
function calculateItemTotal(itemRow) {
    const productSelect = itemRow.querySelector('.product-select');
    const quantityInput = itemRow.querySelector('.quantity-input');
    const totalInput = itemRow.querySelector('.item-total');

    const selectedOption = productSelect.options[productSelect.selectedIndex];
    const price = selectedOption ? parseFloat(selectedOption.getAttribute('data-price')) || 0 : 0;
    const quantity = parseInt(quantityInput.value) || 0;

    const total = price * quantity;
    totalInput.value = total > 0 ? `₱${total.toFixed(2)}` : '';
}

/**
 * Calculate total order amount
 */
function calculateTotal() {
    let total = 0;
    document.querySelectorAll('.item-total').forEach(input => {
        const value = input.value.replace('₱', '');
        total += parseFloat(value) || 0;
    });

    document.getElementById('order-total-amount').value = total.toFixed(2);
}

/**
 * Get order items data
 */
function getOrderItems() {
    const items = [];
    document.querySelectorAll('.order-item').forEach(itemRow => {
        const productSelect = itemRow.querySelector('.product-select');
        const quantityInput = itemRow.querySelector('.quantity-input');

        const selectedOption = productSelect.options[productSelect.selectedIndex];
        if (selectedOption && selectedOption.value && quantityInput.value) {
            const unitPrice = parseFloat(selectedOption.getAttribute('data-price')) || 0;
            const quantity = parseInt(quantityInput.value) || 0;
            items.push({
                productId: selectedOption.value,
                productName: selectedOption.text.split(' - ')[0],
                unit: selectedOption.getAttribute('data-unit'),
                unitPrice,
                price: unitPrice,
                quantity,
                total: Number((unitPrice * quantity).toFixed(2))
            });
        }
    });
    return items;
}

/**
 * Load existing order items (for editing)
 */
function loadOrderItems(items) {
    const itemsContainer = document.getElementById('order-items');
    itemsContainer.innerHTML = '';

    items.forEach(item => {
        const itemPrice = Number(item.unitPrice ?? item.price ?? 0);
        const itemHtml = `
            <div class="order-item row mb-2">
                <div class="col-md-5">
                    <select class="form-select product-select" required>
                        <option value="">Select Product</option>
                        ${JSON.parse(localStorage.getItem('inventory') || '[]').map(invItem =>
                            `<option value="${invItem.id}" data-price="${getInventoryUnitPrice(invItem)}" data-unit="${getInventoryUnit(invItem)}" ${invItem.id === item.productId ? 'selected' : ''}>${invItem.name} - ₱${getInventoryUnitPrice(invItem)}/${getInventoryUnit(invItem)}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="col-md-3">
                    <input type="number" class="form-control quantity-input" placeholder="Qty" min="1" value="${item.quantity}" required>
                </div>
                <div class="col-md-3">
                    <input type="text" class="form-control item-total" readonly placeholder="Total" value="₱${(itemPrice * item.quantity).toFixed(2)}">
                </div>
                <div class="col-md-1">
                    <button type="button" class="btn btn-outline-danger btn-sm remove-item" onclick="removeOrderItem(this)">Remove</button>
                </div>
            </div>
        `;
        itemsContainer.insertAdjacentHTML('beforeend', itemHtml);
    });

    setupOrderItemListeners();
}

/**
 * Load and cache inventory data for order forms
 */
async function loadInventoryCache() {
    try {
        const inventory = await apiClient.inventory.getAll();
        localStorage.setItem('inventory', JSON.stringify(inventory));
    } catch (error) {
        console.error('Error loading inventory cache:', error);
        localStorage.setItem('inventory', JSON.stringify([]));
    }
}

/**
 * Edit order
 */
async function editOrder(orderId) {
    await openOrderModal(orderId);
}

async function acceptOrder(orderId) {
    try {
        await apiClient.orders.updateStatus(orderId, { status: 'processing' });
        await loadOrders();
    } catch (error) {
        alert('Error accepting order: ' + error.message);
    }
}

/**
 * Delete order
 */
async function deleteOrder(orderId) {
    if (!confirm('Are you sure you want to delete this order?')) return;
    
    try {
        await apiClient.orders.delete(orderId);
        await loadOrders();
    } catch (error) {
        alert('Error deleting order: ' + error.message);
    }
}

// Register orders route
router.register('/orders', renderOrders);

window.acceptOrder = acceptOrder;
