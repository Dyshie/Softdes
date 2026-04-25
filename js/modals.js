/**
 * Modal Template Helpers
 * Returns HTML for modals used across different routes
 */

function getOrderModalHTML() {
    return `
        <div class="modal fade" id="order-modal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="order-modal-title">Add Order</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="order-form">
                            <input type="hidden" id="order-id">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="customer-name" class="form-label">Customer Name</label>
                                    <input type="text" class="form-control" id="customer-name" required>
                                </div>
                                <div class="col-md-6">
                                    <label for="customer-phone" class="form-label">Phone</label>
                                    <input type="tel" class="form-control" id="customer-phone" required>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="delivery-address" class="form-label">Delivery Address</label>
                                <textarea class="form-control" id="delivery-address" rows="2" required></textarea>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="product-type" class="form-label">Product</label>
                                    <select class="form-select" id="product-type" required>
                                        <option value="">Select Product</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label for="quantity" class="form-label">Quantity</label>
                                    <input type="number" class="form-control" id="quantity" min="1" required>
                                </div>
                                <div class="col-md-3">
                                    <label for="order-status" class="form-label">Status</label>
                                    <select class="form-select" id="order-status">
                                        <option value="pending">Pending</option>
                                        <option value="processing">Processing</option>
                                        <option value="delivered">Delivered</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="submitOrderForm()">Save Order</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getInventoryModalHTML() {
    return `
        <div class="modal fade" id="inventory-modal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="inventory-modal-title">Add Product</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="inventory-form">
                            <input type="hidden" id="inventory-id">
                            <div class="mb-3">
                                <label for="product-name" class="form-label">Product Name</label>
                                <input type="text" class="form-control" id="product-name" required>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="product-price" class="form-label">Price (₱)</label>
                                    <input type="number" class="form-control" id="product-price" min="0" step="0.01" required>
                                </div>
                                <div class="col-md-6">
                                    <label for="product-unit" class="form-label">Unit</label>
                                    <input type="text" class="form-control" id="product-unit" placeholder="e.g., bottle, gallon" required>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="product-quantity" class="form-label">Quantity in Stock</label>
                                <input type="number" class="form-control" id="product-quantity" min="0" required>
                            </div>
                            <div class="mb-3">
                                <label for="product-description" class="form-label">Description</label>
                                <textarea class="form-control" id="product-description" rows="2"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="submitInventoryForm()">Save Product</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getStaffModalHTML() {
    return `
        <div class="modal fade" id="staff-modal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="staff-modal-title">Add Staff Member</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="staff-form">
                            <input type="hidden" id="staff-id">
                            <div class="mb-3">
                                <label for="staff-name" class="form-label">Full Name</label>
                                <input type="text" class="form-control" id="staff-name" required>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="staff-email" class="form-label">Email</label>
                                    <input type="email" class="form-control" id="staff-email" required>
                                </div>
                                <div class="col-md-6">
                                    <label for="staff-phone" class="form-label">Phone</label>
                                    <input type="tel" class="form-control" id="staff-phone" required>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="staff-role" class="form-label">Role</label>
                                <select class="form-select" id="staff-role" required>
                                    <option value="">Select Role</option>
                                    <option value="admin">Admin</option>
                                    <option value="manager">Manager</option>
                                    <option value="staff">Staff</option>
                                    <option value="driver">Driver</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="staff-status" class="form-label">Status</label>
                                <select class="form-select" id="staff-status">
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="submitStaffForm()">Save Staff</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Open modals
 */
function openOrderModal() {
    const form = document.getElementById('order-form');
    if (!form) return;
    
    document.getElementById('order-modal-title').textContent = 'Add Order';
    form.reset();
    document.getElementById('order-id').value = '';
    populateProductDropdown();
    
    const modal = new bootstrap.Modal(document.getElementById('order-modal'));
    modal.show();
}

function openInventoryModal() {
    const form = document.getElementById('inventory-form');
    if (!form) return;
    
    document.getElementById('inventory-modal-title').textContent = 'Add Product';
    form.reset();
    document.getElementById('inventory-id').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('inventory-modal'));
    modal.show();
}

function openStaffModal() {
    const form = document.getElementById('staff-form');
    if (!form) return;
    
    document.getElementById('staff-modal-title').textContent = 'Add Staff Member';
    form.reset();
    document.getElementById('staff-id').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('staff-modal'));
    modal.show();
}

/**
 * Submit form handlers
 */
function submitOrderForm() {
    const form = document.getElementById('order-form');
    if (form) {
        const event = new Event('submit');
        form.dispatchEvent(event);
    }
}

function submitInventoryForm() {
    const form = document.getElementById('inventory-form');
    if (form) {
        const event = new Event('submit');
        form.dispatchEvent(event);
    }
}

function submitStaffForm() {
    const form = document.getElementById('staff-form');
    if (form) {
        const event = new Event('submit');
        form.dispatchEvent(event);
    }
}

/**
 * Close modal helper
 */
function closeModalByElement(element) {
    const modal = bootstrap.Modal.getInstance(element);
    if (modal) {
        modal.hide();
    }
}
