const express = require('express');
const { validationResult, body } = require('express-validator');
const { auth, database } = require('../config/firebase');
const authMiddleware = require('../middleware/authentication');
const { requireRole } = require('../middleware/authorization');
const notificationService = require('../services/notificationService');
const { createVerificationCodeRecord, isOtpExpired, verifyVerificationCode } = require('../utils/verificationOtp');
const { normalizeRole } = require('../utils/roleNormalization');
const router = express.Router();

const sanitizeUserProfile = (userProfile) => {
    if (!userProfile) {
        return userProfile;
    }

    const { otpHash, role, ...safeProfile } = userProfile;
    return {
        ...safeProfile,
        role: normalizeRole(role)
    };
};


const getUserCount = async () => {
    const snapshot = await database.ref('users').once('value');
    return snapshot.exists() ? snapshot.numChildren() : 0;
};

// Check whether initial registration is allowed
router.get('/setup-status', async (req, res) => {
    try {
        const existingUsers = await getUserCount();
        res.status(200).json({ canRegister: existingUsers === 0 });
    } catch (error) {
        console.error('Setup status error:', error);
        res.status(500).json({ error: 'Failed to determine setup status' });
    }
});

// Login endpoint - authenticate and return ID token
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().isLength({ min: 6 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }

    try {
        const { email, password } = req.body;

        // Check if Firebase API key is configured
        if (!process.env.FIREBASE_API_KEY) {
            console.error('FIREBASE_API_KEY not configured');
            return res.status(500).json({
                error: 'Server configuration error',
                message: 'Authentication service not available'
            });
        }

        // Authenticate with Firebase REST API
        const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                returnSecureToken: true
            })
        });

        const authData = await response.json();

        if (!response.ok) {
            console.error('Firebase authentication failed:', authData.error);

            // Handle specific Firebase errors
            if (authData.error?.message === 'INVALID_PASSWORD' ||
                authData.error?.message === 'EMAIL_NOT_FOUND') {
                return res.status(401).json({
                    error: 'Invalid email or password'
                });
            }

            if (authData.error?.message === 'USER_DISABLED') {
                return res.status(401).json({
                    error: 'Account has been disabled'
                });
            }

            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Please try again later'
            });
        }

        const uid = authData.localId;
        const idToken = authData.idToken;

        // Verify the token we just received to ensure it's valid
        try {
            await auth.verifyIdToken(idToken);
        } catch (tokenError) {
            console.error('Token verification failed:', tokenError);
            return res.status(401).json({
                error: 'Authentication token invalid'
            });
        }

        // Get user data from Realtime Database
        const userSnapshot = await database.ref(`users/${uid}`).once('value');

        if (!userSnapshot.exists()) {
            console.error(`User data not found for UID: ${uid}`);
            return res.status(404).json({
                error: 'User profile not found',
                message: 'Please contact administrator'
            });
        }

        const userData = userSnapshot.val();

        // Check if user is active
        if (userData.status !== 'active') {
            return res.status(401).json({
                error: 'Account is not active',
                message: 'Please contact administrator'
            });
        }

        res.status(200).json({
            idToken,
            user: {
                uid,
                email,
                displayName: userData.displayName,
                role: normalizeRole(userData.role),
                phone: userData.phone || null,
                status: userData.status,
                tempPassword: !!userData.tempPassword,
                otpVerified: userData.otpVerified !== false
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Login failed due to server error'
        });
    }
});

// Register endpoint for first-time setup only
router.post('/register', [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('displayName').notEmpty(),
    body('phone').optional().isMobilePhone()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const existingUsers = await getUserCount();
        if (existingUsers > 0) {
            return res.status(403).json({ error: 'Initial registration is closed after first user is created' });
        }

        const { email, password, displayName, phone } = req.body;
        
        // Create Firebase Auth user
        const userRecord = await auth.createUser({
            email,
            password,
            displayName
        });

        // Set custom claims for super_admin
        await auth.setCustomUserClaims(userRecord.uid, { role: 'super_admin' });
        // Store user profile in Realtime Database
        await database.ref(`users/${userRecord.uid}`).set({
            email,
            displayName,
            phone: phone || '',
            role: 'super_admin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'active'
        });
        
        res.status(201).json({
            message: 'Super admin registered successfully',
            uid: userRecord.uid
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Create new user by super admin (with role selection)
router.post('/users', authMiddleware, requireRole('super_admin'), [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('displayName').notEmpty(),
    body('phone').optional().isMobilePhone(),
    body('role').isIn(['admin', 'station_staff', 'driver', 'customer'])
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { email, password, displayName, phone, role } = req.body;
        
        // Create Firebase Auth user
        const userRecord = await auth.createUser({
            email,
            password,
            displayName
        });

        // Set custom claims for role
        await auth.setCustomUserClaims(userRecord.uid, { role });

        // Store user profile in Realtime Database
        await database.ref(`users/${userRecord.uid}`).set({
            email,
            displayName,
            phone: phone || '',
            role,
            createdBy: req.user.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'active'
        });

        res.status(201).json({
            message: 'User created successfully',
            uid: userRecord.uid,
            role: role
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get current user profile
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const userSnapshot = await database.ref(`users/${req.user.uid}`).once('value');
        
        if (!userSnapshot.exists()) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json(sanitizeUserProfile(userSnapshot.val()));
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user profile' });
    }
});

// Update user profile
router.put('/me', authMiddleware, [
    body('displayName').optional().notEmpty(),
    body('phone').optional({ checkFalsy: true }).isMobilePhone(),
    body('newPassword').optional().isLength({ min: 6 }),
    body('confirmPassword').optional().notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { displayName, phone, newPassword, confirmPassword } = req.body;

        const currentProfileSnapshot = await database.ref(`users/${req.user.uid}`).once('value');
        const currentProfile = currentProfileSnapshot.val() || {};

        if ((newPassword && !confirmPassword) || (!newPassword && confirmPassword)) {
            return res.status(400).json({ error: 'Both newPassword and confirmPassword are required when changing password' });
        }

        if (newPassword && confirmPassword && newPassword !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        if (newPassword && currentProfile.otpVerified === false) {
            return res.status(403).json({ error: 'OTP verification is required before changing your password' });
        }

        const updateData = { updatedAt: new Date().toISOString() };
        const authUpdates = {};

        if (displayName) updateData.displayName = displayName;
        if (phone) updateData.phone = phone;
        if (newPassword) {
            authUpdates.password = newPassword;
            updateData.tempPassword = false;
            updateData.passwordChangedAt = new Date().toISOString();
        }

        if (Object.keys(authUpdates).length > 0) {
            await auth.updateUser(req.user.uid, authUpdates);
        }

        await database.ref(`users/${req.user.uid}`).update(updateData);

        const updatedProfileSnapshot = await database.ref(`users/${req.user.uid}`).once('value');

        res.status(200).json({
            message: 'Profile updated successfully',
            user: sanitizeUserProfile(updatedProfileSnapshot.val())
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Request a fresh OTP for profile verification
router.post('/verification/request', authMiddleware, async (req, res) => {
    try {
        const userSnapshot = await database.ref(`users/${req.user.uid}`).once('value');

        if (!userSnapshot.exists()) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userProfile = userSnapshot.val();
        const verificationRecord = createVerificationCodeRecord({ uid: req.user.uid });

        await database.ref(`users/${req.user.uid}`).update({
            otpHash: verificationRecord.otpHash,
            otpExpiresAt: verificationRecord.otpExpiresAt,
            otpRequestedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        await notificationService.sendEmail(userProfile.email, 'verificationCode', {
            displayName: userProfile.displayName || userProfile.email,
            loginEmail: userProfile.email,
            verificationCode: verificationRecord.verificationCode,
            expiresMinutes: verificationRecord.expiresInMinutes
        });

        res.status(200).json({
            message: 'Verification code sent successfully',
            expiresAt: verificationRecord.otpExpiresAt,
            ...(process.env.NODE_ENV !== 'production' || !notificationService.isEmailConfigured()
                ? { verificationCode: verificationRecord.verificationCode }
                : {})
        });
    } catch (error) {
        console.error('Request verification code error:', error);
        res.status(500).json({ error: 'Failed to send verification code' });
    }
});

// Verify OTP for the current profile
router.post('/verification/verify', authMiddleware, [
    body('otpCode').matches(/^\d{6}$/).withMessage('A 6-digit verification code is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { otpCode } = req.body;
        const userSnapshot = await database.ref(`users/${req.user.uid}`).once('value');

        if (!userSnapshot.exists()) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userProfile = userSnapshot.val();

        if (!userProfile.otpHash || !userProfile.otpExpiresAt) {
            return res.status(400).json({ error: 'No verification code is active' });
        }

        if (isOtpExpired(userProfile.otpExpiresAt)) {
            await database.ref(`users/${req.user.uid}`).update({
                otpHash: null,
                otpExpiresAt: null,
                otpRequestedAt: null,
                updatedAt: new Date().toISOString()
            });

            return res.status(400).json({ error: 'Verification code expired. Request a new one.' });
        }

        const isCodeValid = verifyVerificationCode({
            uid: req.user.uid,
            code: otpCode,
            otpHash: userProfile.otpHash,
            otpExpiresAt: userProfile.otpExpiresAt
        });

        if (!isCodeValid) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        const updateData = {
            otpVerified: true,
            otpVerifiedAt: new Date().toISOString(),
            otpHash: null,
            otpExpiresAt: null,
            otpRequestedAt: null,
            updatedAt: new Date().toISOString()
        };

        await database.ref(`users/${req.user.uid}`).update(updateData);

        const updatedProfileSnapshot = await database.ref(`users/${req.user.uid}`).once('value');

        res.status(200).json({
            message: 'Account verified successfully',
            user: sanitizeUserProfile(updatedProfileSnapshot.val())
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'Failed to verify code' });
    }
});

// Logout endpoint
router.post('/logout', (req, res) => {
    res.status(200).json({ message: 'Logout successful' });
});

module.exports = router;
