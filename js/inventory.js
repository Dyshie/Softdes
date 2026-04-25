// Inventory Management Functions
function loadInventory() {
    inventoryRef.on('value', (snapshot) => {
        const products = [];
        snapshot.forEach((child) => {
            products.push({ id: child.key, ...child.val() });
        });
        displayInventory(products);
    });
}

function displayInventory(products) {
    const container = document.getElementById('inventory-table');
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = '<p class="text-muted">No products in inventory</p>';
        return;
    }
    
    let html = '<div class="table-responsive"><table class="table table-hover"><thead class="table-light"><tr><th>Product Name</th><th>Price</th><th>Quantity</th><th>Unit</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
    products.forEach(product => {
        const status = product.quantity < 10 ? 'Low Stock' : 'In Stock';
        const statusBadge = product.quantity < 10 ? '<span class="badge bg-warning text-dark">Low Stock</span>' : '<span class="badge bg-success">In Stock</span>';
        
        html += `<tr>
            <td>${product.name}</td>
            <td>₱${product.price}</td>
            <td>${product.quantity}</td>
            <td>${product.unit}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editInventory('${product.id}')">
                    <i class="bi bi-pencil"></i> Edit
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteInventory('${product.id}')">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </td>
        </tr>`;
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function openInventoryModal() {
    document.getElementById('inventory-modal-title').textContent = 'Add Product';
    document.getElementById('inventory-form').reset();
    document.getElementById('product-id').value = '';
    const modal = new bootstrap.Modal(document.getElementById('inventory-modal'));
    modal.show();
}

function handleInventorySubmit(e) {
    e.preventDefault();
    
    const productId = document.getElementById('product-id').value;
    const productData = {
        name: document.getElementById('product-name').value,
        price: parseFloat(document.getElementById('product-price').value),
        quantity: parseInt(document.getElementById('product-quantity').value),
        unit: document.getElementById('product-unit').value
    };
    
    const savePromise = productId ? 
        inventoryRef.child(productId).update(productData) :
        inventoryRef.push(productData);
    
    savePromise.then(() => {
        closeModal('inventory-modal');
        showNotification(productId ? 'Product updated!' : 'Product added!');
        
        // Check if new product has low stock
        if (productData.quantity < 10) {
            sendNotification(`Warning: ${productData.name} has low stock (${productData.quantity} left)!`);
        }
    }).catch(error => {
        showNotification('Error saving product: ' + error.message, 'error');
    });
}

function editInventory(productId) {
    inventoryRef.child(productId).once('value', (snapshot) => {
        const product = snapshot.val();
        document.getElementById('inventory-modal-title').textContent = 'Edit Product';
        document.getElementById('product-id').value = productId;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-quantity').value = product.quantity;
        document.getElementById('product-unit').value = product.unit;
        document.getElementById('inventory-modal').style.display = 'block';
    });
}

function deleteInventory(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        inventoryRef.child(productId).remove()
            .then(() => showNotification('Product deleted'))
            .catch(error => showNotification('Error: ' + error.message, 'error'));
    }
}

// Stock management
function updateStock(productId, quantityChange) {
    inventoryRef.child(productId).once('value', (snapshot) => {
        const product = snapshot.val();
        const newQuantity = product.quantity + quantityChange;
        
        if (newQuantity < 0) {
            showNotification('Insufficient stock!', 'error');
            return;
        }
        
        inventoryRef.child(productId).update({
            quantity: newQuantity
        }).then(() => {
            if (newQuantity < 10) {
                sendNotification(`Low stock alert: ${product.name} has only ${newQuantity} left!`);
            }
        });
    });
}

// Make inventory functions globally available
window.updateStock = updateStock;

