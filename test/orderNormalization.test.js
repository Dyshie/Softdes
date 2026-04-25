const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildOrderBackfillUpdate,
    normalizeOrder
} = require('../utils/orderNormalization');

test('normalizeOrder fills legacy totals and dates', () => {
    const normalized = normalizeOrder({
        timestamp: '2026-04-24T10:00:00.000Z',
        items: [
            { productName: 'Water', quantity: '2', price: '15' }
        ]
    });

    assert.equal(normalized.totalAmount, 30);
    assert.equal(normalized.createdAt, '2026-04-24T10:00:00.000Z');
    assert.equal(normalized.items[0].unitPrice, 15);
    assert.equal(normalized.items[0].total, 30);
});

test('buildOrderBackfillUpdate returns only missing fields', () => {
    const updates = buildOrderBackfillUpdate({
        timestamp: '2026-04-24T10:00:00.000Z',
        items: [{ productName: 'Water', quantity: 1, price: 25 }]
    });

    assert.deepEqual(updates, {
        totalAmount: 25,
        createdAt: '2026-04-24T10:00:00.000Z',
        items: [{ productName: 'Water', quantity: 1, price: 25, unitPrice: 25, total: 25 }]
    });
});