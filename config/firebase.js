const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin SDK
let credential;
let serviceAccount;
const rootDir = path.join(__dirname, '../');
const fallbackKeyPath = path.join(rootDir, 'firebase-key.json');

// Attempt to load service account JSON from the project root
try {
    let serviceAccountPath = fallbackKeyPath;

    if (!fs.existsSync(serviceAccountPath)) {
        const jsonFiles = fs.readdirSync(rootDir).filter((name) => name.endsWith('.json'));
        const adminSdkFile = jsonFiles.find((name) => name.includes('firebase-adminsdk'));
        serviceAccountPath = adminSdkFile ? path.join(rootDir, adminSdkFile) : jsonFiles[0];
    }

    if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
        serviceAccount = require(serviceAccountPath);
        credential = admin.credential.cert(serviceAccount);
    } else {
        throw new Error('No Firebase service account JSON file found');
    }
} catch (error) {
    // Fall back to environment variables
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
        console.warn('Warning: Firebase credentials not found. Please either:');
        console.warn('1. Create firebase-key.json or place your service account JSON file in the project root, or');
        console.warn('2. Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL in .env');
        process.exit(1);
    }

    const envServiceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    };

    credential = admin.credential.cert(envServiceAccount);
}

admin.initializeApp({
    credential: credential,
    databaseURL: process.env.FIREBASE_DATABASE_URL
});

const database = admin.database();
const auth = admin.auth();

module.exports = {
    admin,
    database,
    auth
};
