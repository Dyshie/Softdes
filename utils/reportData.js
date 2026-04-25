const { normalizeOrder } = require('./orderNormalization');

const buildDailyReportData = (orders = [], staffMap = {}, today = new Date().toISOString().split('T')[0]) => {
    const normalizedOrders = orders.map((order) => ({
        ...normalizeOrder(order),
        id: order.id
    }));

    const todaysOrders = normalizedOrders.filter((order) =>
        order.createdAt && order.createdAt.startsWith(today)
    );

    const ordersWithStaff = todaysOrders.map((order) => ({
        ...order,
        staffName: staffMap[order.createdBy]?.name || 'Unknown'
    }));

    const totalSales = ordersWithStaff.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

    return {
        date: today,
        orders: ordersWithStaff,
        totalOrders: ordersWithStaff.length,
        totalSales: Number(totalSales.toFixed(2))
    };
};

const buildReportPdfLines = (reportData) => {
    const lines = [
        'Daily Sales Report',
        `Date: ${new Date(reportData.date).toLocaleDateString()}`,
        `Total Orders: ${reportData.totalOrders}`,
        `Total Sales: ₱${Number(reportData.totalSales || 0).toFixed(2)}`,
        'Order Details:'
    ];

    (reportData.orders || []).forEach((order, index) => {
        lines.push(`${index + 1}. Order ID: ${order.id}`);
        lines.push(`   Customer: ${order.customerName || 'N/A'}`);
        lines.push(`   Staff: ${order.staffName || 'Unknown'}`);
        lines.push(`   Amount: ₱${Number(order.totalAmount || 0).toFixed(2)}`);
        lines.push(`   Time: ${order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : 'N/A'}`);
        lines.push(`   Items: ${Array.isArray(order.items)
            ? order.items.map((item) => `${item.productName} (${item.quantity})`).join(', ')
            : 'No items'}`);
    });

    return lines;
};

module.exports = {
    buildDailyReportData,
    buildReportPdfLines
};