const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeDateValue = (value) => {
    if (!value) {
        return null;
    }

    const candidate = new Date(value);
    return Number.isNaN(candidate.getTime()) ? null : candidate.toISOString();
};

const normalizeOrderItem = (item = {}) => {
    const quantity = toNumber(item.quantity, 0);
    const unitPrice = typeof item.unitPrice !== 'undefined'
        ? toNumber(item.unitPrice, 0)
        : toNumber(item.price, 0);
    const total = typeof item.total !== 'undefined'
        ? toNumber(item.total, quantity * unitPrice)
        : quantity * unitPrice;

    return {
        ...item,
        quantity,
        unitPrice,
        price: unitPrice,
        total: Number(total.toFixed(2))
    };
};

const normalizeOrder = (order = {}) => {
    const normalizedItems = Array.isArray(order.items)
        ? order.items.map(normalizeOrderItem)
        : [];

    const computedTotalAmount = normalizedItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const totalAmount = typeof order.totalAmount !== 'undefined'
        ? toNumber(order.totalAmount, computedTotalAmount)
        : computedTotalAmount;

    const normalizedOrder = {
        ...order,
        items: normalizedItems,
        totalAmount: Number(totalAmount.toFixed(2))
    };

    const createdAt = normalizeDateValue(order.createdAt ?? order.timestamp ?? order.date);
    if (createdAt) {
        normalizedOrder.createdAt = createdAt;
    }

    const updatedAt = normalizeDateValue(order.updatedAt);
    if (updatedAt) {
        normalizedOrder.updatedAt = updatedAt;
    }

    return normalizedOrder;
};

const buildOrderBackfillUpdate = (order = {}) => {
    const normalizedOrder = normalizeOrder(order);
    const updates = {};

    if (typeof order.totalAmount === 'undefined' || toNumber(order.totalAmount, null) !== normalizedOrder.totalAmount) {
        updates.totalAmount = normalizedOrder.totalAmount;
    }

    if (!order.createdAt && normalizedOrder.createdAt) {
        updates.createdAt = normalizedOrder.createdAt;
    }

    if (Array.isArray(order.items)) {
        const requiresItemRewrite = order.items.some((item, index) => {
            const normalizedItem = normalizedOrder.items[index] || {};
            return typeof item.unitPrice === 'undefined'
                || typeof item.price === 'undefined'
                || typeof item.total === 'undefined'
                || toNumber(item.unitPrice, null) !== normalizedItem.unitPrice
                || toNumber(item.price, null) !== normalizedItem.price
                || toNumber(item.total, null) !== normalizedItem.total;
        });

        if (requiresItemRewrite) {
            updates.items = normalizedOrder.items;
        }
    }

    return updates;
};

module.exports = {
    buildOrderBackfillUpdate,
    normalizeOrder,
    normalizeOrderItem,
    normalizeDateValue,
    toNumber
};