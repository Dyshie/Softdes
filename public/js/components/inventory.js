/**
 * Inventory Component
 */
async function renderInventory() {
    const container = document.getElementById('app-container');
    
    container.innerHTML = `
        <div class="container-fluid p-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1>Inventory</h1>
                <button class="btn btn-primary" onclick="openInventoryModal()">Add Product</button>
            </div>
            <div id="inventory-container" class="card">
                <div class="card-body">Loading inventory...</div>
            </div>
        </div>
    `;

    await loadInventory();
}

function getProductPrice(product) {
    if (typeof product.price !== 'undefined') {
        return Number(product.price || 0);
    }

    return Number(product.pricing?.sellingPrice || 0);
}

function getProductQuantity(product) {
    if (typeof product.quantity !== 'undefined') {
        return Number(product.quantity || 0);
    }

    return Number(product.stock?.current || 0);
}

/**
 * Load and display inventory
 */
async function loadInventory() {
    try {
        const products = await apiClient.inventory.getAll();
        const container = document.getElementById('inventory-container');

        if (!container) {
            return;
        }

        let html = '<div class="table-responsive"><table class="table table-hover"><thead class="table-light"><tr><th>Product Name</th><th>Price</th><th>Quantity</th><th>Unit</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
        
        products.forEach(product => {
            const price = getProductPrice(product);
            const quantity = getProductQuantity(product);
            const statusBadge = quantity < 10 ? '<span class="badge bg-warning text-dark">Low Stock</span>' : '<span class="badge bg-success">In Stock</span>';
            
            html += `<tr>
                <td>${product.name}</td>
                <td>₱${price.toFixed(2)}</td>
                <td>${quantity}</td>
                <td>${product.unit}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editInventory('${product.id}')">Edit</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteInventory('${product.id}')">Delete</button>
                </td>
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading inventory:', error);
        const container = document.getElementById('inventory-container');
        if (container) {
            container.innerHTML = '<div class="alert alert-danger">Error loading inventory</div>';
        }
    }
}

/**
 * Open inventory modal for creating/editing
 */
async function openInventoryModal(productId = null) {
    let modalHtml = `
        <div class="modal fade" id="inventoryModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="inventory-modal-title">Add Product</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="inventory-form">
                            <div class="mb-3">
                                <label for="product-name" class="form-label">Product Name</label>
                                <input type="text" class="form-control" id="product-name" required>
                            </div>
                            <div class="mb-3">
                                <label for="product-price" class="form-label">Price</label>
                                <input type="number" class="form-control" id="product-price" step="0.01" required>
                            </div>
                            <div class="mb-3">
                                <label for="product-quantity" class="form-label">Quantity</label>
                                <input type="number" class="form-control" id="product-quantity" required>
                            </div>
                            <div class="mb-3">
                                <label for="product-unit" class="form-label">Unit</label>
                                <select class="form-select" id="product-unit" required>
                                    <option value="piece" selected>Piece</option>
                                    <option value="liter">Liter</option>
                                    <option value="box">Box</option>
                                    <option value="kg">Kg</option>
                                    <option value="gallon">Gallon</option>
                                </select>
                            </div>
                            <input type="hidden" id="product-id">
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="saveInventory()">Save Product</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('inventoryModal'));

    if (productId) {
        try {
            const product = await apiClient.inventory.getOne(productId);
            document.getElementById('product-id').value = productId;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-price').value = getProductPrice(product);
            document.getElementById('product-quantity').value = getProductQuantity(product);
            document.getElementById('product-unit').value = product.unit || 'piece';
            document.getElementById('inventory-modal-title').textContent = 'Edit Product';
        } catch (error) {
            console.error('Error loading product:', error);
        }
    }

    modal.show();
    
    document.getElementById('inventoryModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

/**
 * Save product
 */
async function saveInventory() {
    try {
        const productId = document.getElementById('product-id').value;
        const price = parseFloat(document.getElementById('product-price').value);
        const quantity = parseInt(document.getElementById('product-quantity').value);

        const data = {
            name: document.getElementById('product-name').value,
            price,
            quantity,
            pricing: {
                costPrice: price,
                sellingPrice: price,
                markup: 0
            },
            stock: {
                current: quantity,
                reserved: 0,
                available: quantity,
                reorderLevel: 10,
                reorderQuantity: 50
            },
            unit: document.getElementById('product-unit').value.trim().toLowerCase()
        };

        if (productId) {
            await apiClient.inventory.update(productId, data);
        } else {
            await apiClient.inventory.create(data);
        }

        bootstrap.Modal.getInstance(document.getElementById('inventoryModal')).hide();
        await loadInventory();
    } catch (error) {
        alert('Error saving product: ' + error.message);
    }
}

/**
 * Edit product
 */
async function editInventory(productId) {
    await openInventoryModal(productId);
}

/**
 * Delete product
 */
async function deleteInventory(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        await apiClient.inventory.delete(productId);
        await loadInventory();
    } catch (error) {
        alert('Error deleting product: ' + error.message);
    }
}

// Register inventory route
router.register('/inventory', renderInventory);
