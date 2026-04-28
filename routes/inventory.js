const express = require('express');
const { validationResult, body } = require('express-validator');
const { database } = require('../config/firebase');
const authMiddleware = require('../middleware/authentication');
const { requireRole } = require('../middleware/authorization');

const router = express.Router();

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const getLowStockThreshold = (product = {}) => {
    if (typeof product.lowStockThreshold !== 'undefined') {
        return toNumber(product.lowStockThreshold, 10);
    }

    if (typeof product.stock?.reorderLevel !== 'undefined') {
        return toNumber(product.stock.reorderLevel, 10);
    }

    return 10;
};

const normalizeInventoryProduct = (product = {}) => {
    const basePrice = typeof product.price !== 'undefined'
        ? toNumber(product.price, 0)
        : toNumber(product.pricing?.sellingPrice, 0);

    const currentQty = typeof product.quantity !== 'undefined'
        ? toNumber(product.quantity, 0)
        : toNumber(product.stock?.current, 0);

    const reservedQty = toNumber(product.stock?.reserved, 0);
    const availableQty = typeof product.stock?.available !== 'undefined'
        ? toNumber(product.stock.available, 0)
        : Math.max(currentQty - reservedQty, 0);

    const costPrice = typeof product.pricing?.costPrice !== 'undefined'
        ? toNumber(product.pricing.costPrice, 0)
        : basePrice;

    const markup = typeof product.pricing?.markup !== 'undefined'
        ? toNumber(product.pricing.markup, 0)
        : Math.max(basePrice - costPrice, 0);

    const lowStockThreshold = getLowStockThreshold(product);
    const reorderQuantity = typeof product.stock?.reorderQuantity !== 'undefined'
        ? toNumber(product.stock.reorderQuantity, 50)
        : 50;

    return {
        ...product,
        price: basePrice,
        quantity: currentQty,
        lowStockThreshold,
        pricing: {
            ...(product.pricing || {}),
            costPrice,
            sellingPrice: basePrice,
            markup
        },
        stock: {
            ...(product.stock || {}),
            current: currentQty,
            reserved: reservedQty,
            available: availableQty,
            reorderLevel: lowStockThreshold,
            reorderQuantity
        }
    };
};

// Get all inventory items
router.get('/', authMiddleware, requireRole('super_admin', 'admin', 'station_staff'), async (req, res) => {
    try {
        const snapshot = await database.ref('inventory').once('value');
        const inventory = [];

        snapshot.forEach((child) => {
            const normalizedProduct = normalizeInventoryProduct(child.val() || {});
            inventory.push({
                id: child.key,
                ...normalizedProduct
            });
        });

        res.status(200).json(inventory);
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// Get single product
router.get('/:id', authMiddleware, requireRole('super_admin', 'admin', 'station_staff'), async (req, res) => {
    try {
        const snapshot = await database.ref(`inventory/${req.params.id}`).once('value');
        
        if (!snapshot.exists()) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const normalizedProduct = normalizeInventoryProduct(snapshot.val() || {});

        res.status(200).json({
            id: req.params.id,
            ...normalizedProduct
        });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// Add new product
router.post('/', authMiddleware, requireRole('super_admin', 'admin', 'station_staff'), [
    body('name').isString().isLength({ min: 1, max: 100 }).withMessage('Product name must be 1-100 characters'),
    body('description').optional().isString().isLength({ max: 500 }).withMessage('Description must be max 500 characters'),
    body('category').optional().isString().isLength({ max: 50 }).withMessage('Category must be max 50 characters'),
    body('pricing.costPrice').optional().isFloat({ min: 0 }).withMessage('Cost price must be non-negative'),
    body('pricing.sellingPrice').optional().isFloat({ min: 0 }).withMessage('Selling price must be non-negative'),
    body('stock.current').optional().isInt({ min: 0 }).withMessage('Current stock must be non-negative integer'),
    body('stock.reserved').optional().isInt({ min: 0 }).withMessage('Reserved stock must be non-negative integer'),
    body('stock.available').optional().isInt({ min: 0 }).withMessage('Available stock must be non-negative integer'),
    body('stock.reorderLevel').optional().isInt({ min: 0 }).withMessage('Reorder level must be non-negative integer'),
    body('stock.reorderQuantity').optional().isInt({ min: 1 }).withMessage('Reorder quantity must be positive integer'),
    body('lowStockThreshold').optional().isInt({ min: 0 }).withMessage('Low stock threshold must be non-negative integer'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be non-negative'),
    body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be non-negative integer'),
    body('unit').trim().toLowerCase().isIn(['piece', 'liter', 'box', 'kg', 'gallon']).withMessage('Invalid unit'),
    body('barcode').optional().isString().isLength({ max: 50 }).withMessage('Barcode must be max 50 characters'),
    body('supplier.supplierName').optional().isString().isLength({ max: 100 }).withMessage('Supplier name must be max 100 characters'),
    body('supplier.leadTime').optional().isInt({ min: 0 }).withMessage('Lead time must be non-negative integer'),
    body('status').optional().isIn(['active', 'inactive', 'discontinued']).withMessage('Invalid status'),
    body().custom((value) => {
        const hasNested = value?.pricing && value?.stock;
        const hasFlat = typeof value?.price !== 'undefined' && typeof value?.quantity !== 'undefined';

        if (!hasNested && !hasFlat) {
            throw new Error('Provide either pricing/stock or price/quantity');
        }

        return true;
    })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const lowStockThreshold = req.body.lowStockThreshold ?? req.body.stock?.reorderLevel ?? 10;
        const timestamp = new Date().toISOString();
        const productData = normalizeInventoryProduct({
            name: req.body.name,
            description: req.body.description || '',
            category: req.body.category || '',
            pricing: {
                costPrice: req.body.pricing?.costPrice ?? req.body.price ?? 0,
                sellingPrice: req.body.pricing?.sellingPrice ?? req.body.price ?? 0,
                markup: req.body.pricing?.markup
            },
            stock: {
                current: req.body.stock?.current ?? req.body.quantity ?? 0,
                reserved: req.body.stock?.reserved ?? 0,
                available: req.body.stock?.available,
                reorderLevel: req.body.stock?.reorderLevel ?? lowStockThreshold,
                reorderQuantity: req.body.stock?.reorderQuantity ?? 50
            },
            price: req.body.price,
            quantity: req.body.quantity,
            lowStockThreshold,
            unit: req.body.unit,
            image: req.body.image || '',
            barcode: req.body.barcode || '',
            supplier: {
                supplierId: req.body.supplier?.supplierId || '',
                supplierName: req.body.supplier?.supplierName || '',
                leadTime: req.body.supplier?.leadTime || 0
            },
            status: req.body.status || 'active',
            createdAt: timestamp,
            updatedAt: timestamp,
            lastRestocked: timestamp,
            createdBy: req.user.uid,
            updatedBy: req.user.uid
        });

        const newProductRef = database.ref('inventory').push();
        await newProductRef.set(productData);

        res.status(201).json({
            id: newProductRef.key,
            ...productData
        });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// Update product
router.put('/:id', authMiddleware, requireRole('super_admin', 'admin', 'station_staff'), [
    body('name').optional().isString().isLength({ min: 1, max: 100 }).withMessage('Product name must be 1-100 characters'),
    body('description').optional().isString().isLength({ max: 500 }).withMessage('Description must be max 500 characters'),
    body('category').optional().isString().isLength({ max: 50 }).withMessage('Category must be max 50 characters'),
    body('pricing.costPrice').optional().isFloat({ min: 0 }).withMessage('Cost price must be non-negative'),
    body('pricing.sellingPrice').optional().isFloat({ min: 0 }).withMessage('Selling price must be non-negative'),
    body('stock.current').optional().isInt({ min: 0 }).withMessage('Current stock must be non-negative integer'),
    body('stock.reserved').optional().isInt({ min: 0 }).withMessage('Reserved stock must be non-negative integer'),
    body('stock.available').optional().isInt({ min: 0 }).withMessage('Available stock must be non-negative integer'),
    body('stock.reorderLevel').optional().isInt({ min: 0 }).withMessage('Reorder level must be non-negative integer'),
    body('stock.reorderQuantity').optional().isInt({ min: 1 }).withMessage('Reorder quantity must be positive integer'),
    body('lowStockThreshold').optional().isInt({ min: 0 }).withMessage('Low stock threshold must be non-negative integer'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be non-negative'),
    body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be non-negative integer'),
    body('unit').optional().trim().toLowerCase().isIn(['piece', 'liter', 'box', 'kg', 'gallon']).withMessage('Invalid unit'),
    body('barcode').optional().isString().isLength({ max: 50 }).withMessage('Barcode must be max 50 characters'),
    body('supplier.supplierName').optional().isString().isLength({ max: 100 }).withMessage('Supplier name must be max 100 characters'),
    body('supplier.leadTime').optional().isInt({ min: 0 }).withMessage('Lead time must be non-negative integer'),
    body('status').optional().isIn(['active', 'inactive', 'discontinued']).withMessage('Invalid status')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const productRef = database.ref(`inventory/${req.params.id}`);
        const snapshot = await productRef.once('value');

        if (!snapshot.exists()) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const currentData = normalizeInventoryProduct(snapshot.val() || {});
        const mergedData = {
            ...currentData,
            ...req.body,
            pricing: {
                ...(currentData.pricing || {}),
                ...(req.body.pricing || {})
            },
            stock: {
                ...(currentData.stock || {}),
                ...(req.body.stock || {})
            },
            supplier: {
                ...(currentData.supplier || {}),
                ...(req.body.supplier || {})
            },
            updatedAt: new Date().toISOString(),
            updatedBy: req.user.uid
        };

        if (typeof req.body.price !== 'undefined' && typeof req.body.pricing?.sellingPrice === 'undefined') {
            mergedData.pricing.sellingPrice = req.body.price;
        }

        if (typeof req.body.quantity !== 'undefined' && typeof req.body.stock?.current === 'undefined') {
            mergedData.stock.current = req.body.quantity;
        }

        const updatedData = normalizeInventoryProduct(mergedData);

        await productRef.set(updatedData);

        res.status(200).json({
            id: req.params.id,
            ...updatedData
        });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// Delete product
router.delete('/:id', authMiddleware, requireRole('super_admin', 'admin', 'station_staff'), async (req, res) => {
    try {
        await database.ref(`inventory/${req.params.id}`).remove();
        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

module.exports = router;
