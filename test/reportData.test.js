const test = require('node:test');
const assert = require('node:assert/strict');

const { buildDailyReportData, buildReportPdfLines } = require('../utils/reportData');

test('buildDailyReportData filters today orders and adds staff names', () => {
    const report = buildDailyReportData(
        [
            {
                id: 'order-1',
                createdAt: '2026-04-24T08:15:00.000Z',
                createdBy: 'staff-1',
                customerName: 'Customer One',
                totalAmount: 25,
                items: [{ productName: 'Water', quantity: 1, price: 25 }]
            },
            {
                id: 'order-2',
                createdAt: '2026-04-23T08:15:00.000Z',
                createdBy: 'staff-2',
                totalAmount: 100
            }
        ],
        { 'staff-1': { name: 'Report Staff' } },
        '2026-04-24'
    );

    assert.equal(report.date, '2026-04-24');
    assert.equal(report.totalOrders, 1);
    assert.equal(report.totalSales, 25);
    assert.equal(report.orders[0].staffName, 'Report Staff');
});

test('buildReportPdfLines includes the summary and order details', () => {
    const lines = buildReportPdfLines({
        date: '2026-04-24',
        totalOrders: 1,
        totalSales: 25,
        orders: [
            {
                id: 'order-1',
                customerName: 'Customer One',
                staffName: 'Report Staff',
                totalAmount: 25,
                createdAt: '2026-04-24T08:15:00.000Z',
                items: [{ productName: 'Water', quantity: 1 }]
            }
        ]
    });

    assert.ok(lines.includes('Daily Sales Report'));
    assert.ok(lines.includes('Total Orders: 1'));
    assert.ok(lines.includes('Total Sales: ₱25.00'));
    assert.ok(lines.some((line) => line.includes('Order ID: order-1')));
    assert.ok(lines.some((line) => line.includes('Items: Water (1)')));
});