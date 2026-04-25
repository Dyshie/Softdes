require('dotenv').config();

const { database } = require('../config/firebase');
const { buildOrderBackfillUpdate } = require('../utils/orderNormalization');

async function run() {
    const snapshot = await database.ref('orders').once('value');

    if (!snapshot.exists()) {
        console.log('No orders found; nothing to backfill.');
        return;
    }

    let scanned = 0;
    let updated = 0;

    const tasks = [];

    snapshot.forEach((child) => {
        scanned += 1;
        const order = child.val() || {};
        const updates = buildOrderBackfillUpdate(order);

        if (Object.keys(updates).length === 0) {
            return;
        }

        updated += 1;
        tasks.push(database.ref(`orders/${child.key}`).update(updates));
    });

    if (tasks.length > 0) {
        await Promise.all(tasks);
    }

    console.log(`Backfill complete. Scanned ${scanned} orders, updated ${updated}.`);
}

run()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Order backfill failed:', error);
        process.exit(1);
    });