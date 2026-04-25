const express = require('express');
const { validationResult, body } = require('express-validator');
const { auth, database } = require('../config/firebase');
const authMiddleware = require('../middleware/authentication');
const { requireRole } = require('../middleware/authorization');
const { createVerificationCodeRecord } = require('../utils/verificationOtp');
const { normalizeRole } = require('../utils/roleNormalization');

const router = express.Router();
const standardTemporaryPassword = process.env.DEFAULT_TEMP_PASSWORD || 'WaterStation@123!';

// Get all staff
router.get('/', authMiddleware, requireRole('super_admin', 'admin'), async (req, res) => {
    try {
        const snapshot = await database.ref('staff').once('value');
        const staff = [];

        snapshot.forEach((child) => {
            staff.push({
                id: child.key,
                ...child.val()
            });
        });

        res.status(200).json(staff);
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({ error: 'Failed to fetch staff' });
    }
});

// Get drivers for order assignment
router.get('/drivers', authMiddleware, requireRole('super_admin', 'admin', 'station_staff'), async (req, res) => {
    try {
        const snapshot = await database.ref('staff').once('value');
        const drivers = [];

        snapshot.forEach((child) => {
            const staffMember = child.val() || {};
            const role = staffMember.role || staffMember.position;

            if (role === 'driver' && staffMember.status !== 'suspended') {
                drivers.push({
                    id: child.key,
                    ...staffMember
                });
            }
        });

        drivers.sort((left, right) => {
            const leftName = (left.name || left.email || '').toLowerCase();
            const rightName = (right.name || right.email || '').toLowerCase();
            return leftName.localeCompare(rightName);
        });

        res.status(200).json(drivers);
    } catch (error) {
        console.error('Error fetching drivers:', error);
        res.status(500).json({ error: 'Failed to fetch drivers' });
    }
});

// Get single staff member
router.get('/:id', authMiddleware, requireRole('super_admin', 'admin'), async (req, res) => {
    try {
        const snapshot = await database.ref(`staff/${req.params.id}`).once('value');
        
        if (!snapshot.exists()) {
            return res.status(404).json({ error: 'Staff member not found' });
        }

        res.status(200).json({
            id: req.params.id,
            ...snapshot.val()
        });
    } catch (error) {
        console.error('Error fetching staff member:', error);
        res.status(500).json({ error: 'Failed to fetch staff member' });
    }
});

// Add new staff member
router.post('/', authMiddleware, requireRole('super_admin'), [
    body('name').isString().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').isMobilePhone().withMessage('Valid phone number is required'),
    body('role').optional().trim().toLowerCase().isIn(['driver', 'staff', 'admin', 'station_staff']).withMessage('Invalid role'),
    body('department').optional().isString().isLength({ max: 50 }).withMessage('Department must be max 50 characters'),
    body('salary').optional().isFloat({ min: 0 }).withMessage('Salary must be non-negative'),
    body('hireDate').optional().isISO8601().withMessage('Hire date must be valid ISO 8601 format'),
    body('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const temporaryPassword = standardTemporaryPassword;
        const requestedRole = normalizeRole(req.body.role || 'station_staff', 'station_staff');
        const staffData = {
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            role: requestedRole,
            position: requestedRole,
            department: req.body.department || '',
            salary: req.body.salary || 0,
            hireDate: req.body.hireDate || new Date().toISOString(),
            status: req.body.status || 'active',
            createdBy: req.user.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const userRecord = await auth.createUser({
            email: staffData.email,
            password: temporaryPassword,
            displayName: staffData.name
        });

        const verificationRecord = createVerificationCodeRecord({ uid: userRecord.uid });

        await auth.setCustomUserClaims(userRecord.uid, { role: requestedRole });

        const userProfile = {
            email: staffData.email,
            displayName: staffData.name,
            phone: staffData.phone,
            role: requestedRole,
            createdBy: req.user.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: staffData.status,
            tempPassword: true,
            otpVerified: false,
            otpHash: verificationRecord.otpHash,
            otpExpiresAt: verificationRecord.otpExpiresAt,
            otpRequestedAt: new Date().toISOString()
        };

        await database.ref(`users/${userRecord.uid}`).set(userProfile);

        const newStaffRef = database.ref('staff').push();
        await newStaffRef.set({
            ...staffData,
            uid: userRecord.uid
        });

        const emailSent = false;
        const exposeVerificationCode = process.env.NODE_ENV !== 'production';

        res.status(201).json({
            id: newStaffRef.key,
            uid: userRecord.uid,
            ...staffData,
            temporaryPassword,
            emailSent,
            ...(exposeVerificationCode ? { verificationCode: verificationRecord.verificationCode } : {})
        });
    } catch (error) {
        console.error('Error creating staff:', error);
        if (error.code === 'auth/email-already-exists') {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }
        res.status(500).json({ error: 'Failed to create staff' });
    }
});

// Update staff member
router.put('/:id', authMiddleware, requireRole('super_admin'), async (req, res) => {
    try {
        const staffRef = database.ref(`staff/${req.params.id}`);
        const snapshot = await staffRef.once('value');

        if (!snapshot.exists()) {
            return res.status(404).json({ error: 'Staff member not found' });
        }

        const requestedRole = normalizeRole(req.body.role || snapshot.val().role || snapshot.val().position || 'station_staff', 'station_staff');
        const updatedData = {
            ...snapshot.val(),
            ...req.body,
            role: requestedRole,
            position: requestedRole,
            updatedAt: new Date().toISOString(),
            updatedBy: req.user.uid
        };

        await staffRef.set(updatedData);

        res.status(200).json({
            id: req.params.id,
            ...updatedData
        });
    } catch (error) {
        console.error('Error updating staff:', error);
        res.status(500).json({ error: 'Failed to update staff' });
    }
});

// Delete staff member
router.delete('/:id', authMiddleware, requireRole('super_admin'), async (req, res) => {
    try {
        await database.ref(`staff/${req.params.id}`).remove();
        res.status(200).json({ message: 'Staff member deleted successfully' });
    } catch (error) {
        console.error('Error deleting staff:', error);
        res.status(500).json({ error: 'Failed to delete staff' });
    }
});

module.exports = router;
