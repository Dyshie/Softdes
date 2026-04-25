const express = require('express');
const { database } = require('../config/firebase');
const authMiddleware = require('../middleware/authentication');
const { requireRole } = require('../middleware/authorization');
const PDFDocument = require('pdfkit');
const { normalizeOrder } = require('../utils/orderNormalization');
const { buildDailyReportData, buildReportPdfLines } = require('../utils/reportData');

const router = express.Router();

// Get daily report data
router.get('/', authMiddleware, requireRole('super_admin', 'admin'), async (req, res) => {
    try {
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];

        // Fetch all orders
        const ordersSnapshot = await database.ref('orders').once('value');
        const allOrders = [];
        ordersSnapshot.forEach((child) => {
            allOrders.push({
                id: child.key,
                ...normalizeOrder(child.val() || {})
            });
        });

        // Fetch all staff for lookup
        const staffSnapshot = await database.ref('staff').once('value');
        const staffMap = {};
        staffSnapshot.forEach((child) => {
            staffMap[child.key] = child.val();
        });

        const reportData = buildDailyReportData(allOrders, staffMap, today);

        res.status(200).json({
            ...reportData
        });
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

// Generate sales report PDF
router.post('/generate', authMiddleware, requireRole('super_admin', 'admin'), async (req, res) => {
    try {
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];

        // Fetch all orders
        const ordersSnapshot = await database.ref('orders').once('value');
        const allOrders = [];
        ordersSnapshot.forEach((child) => {
            allOrders.push({
                id: child.key,
                ...child.val()
            });
        });

        // Fetch all staff for lookup
        const staffSnapshot = await database.ref('staff').once('value');
        const staffMap = {};
        staffSnapshot.forEach((child) => {
            staffMap[child.key] = child.val();
        });
        const reportData = buildDailyReportData(allOrders, staffMap, today);

        // Create PDF
        const doc = new PDFDocument();
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=sales-report-${today}.pdf`);
            res.send(pdfData);
        });

        // Add content to PDF
        buildReportPdfLines(reportData).forEach((line, index) => {
            if (index === 0) {
                doc.fontSize(20).text(line, { align: 'center' });
                return;
            }

            if (index === 1) {
                doc.moveDown();
                doc.fontSize(14).text(line);
                return;
            }

            if (index === 4) {
                doc.moveDown();
                doc.fontSize(12).text(line);
                doc.moveDown();
                return;
            }

            doc.text(line);

            if (line.startsWith('   Items:')) {
                doc.moveDown(0.5);
            }
        });

        doc.end();
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

module.exports = router;