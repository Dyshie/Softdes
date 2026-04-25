/**
 * Authentication Module
 * Handles Firebase authentication and session management
 */

let currentUser = null;
let currentIdToken = null;

/**
 * Initialize auth state listener
 */
function initializeAuth() {
    // Check for existing session in localStorage
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('idToken');
    
    if (storedUser && storedToken) {
        currentUser = JSON.parse(storedUser);
        currentIdToken = storedToken;
    }
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    return currentUser !== null && currentIdToken !== null;
}

/**
 * Get current user
 */
function getCurrentUser() {
    return currentUser;
}

/**
 * Get current ID token
 */
function getIdToken() {
    return currentIdToken;
}

/**
 * Login user
 */
async function login(email, password) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        // Store user and token
        currentUser = data.user;
        currentIdToken = data.idToken;

        localStorage.setItem('user', JSON.stringify(currentUser));
        localStorage.setItem('idToken', currentIdToken);

        return { success: true, user: currentUser };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Register first super admin user
 */
async function register(email, password, displayName, phone = '') {
    try {
        // Check if registration is allowed
        const statusResponse = await fetch('/api/auth/setup-status');
        const statusData = await statusResponse.json();

        if (!statusData.canRegister) {
            throw new Error('Registration is closed');
        }

        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                displayName,
                phone
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }

        return { success: true, uid: data.uid };
    } catch (error) {
        console.error('Register error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create new user (admin only)
 */
async function createUser(email, password, displayName, role, phone = '') {
    try {
        if (!isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        const response = await fetch('/api/auth/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentIdToken}`
            },
            body: JSON.stringify({
                email,
                password,
                displayName,
                role,
                phone
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to create user');
        }

        return { success: true, uid: data.uid };
    } catch (error) {
        console.error('Create user error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get current user profile
 */
async function getUserProfile() {
    try {
        if (!isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        const response = await fetch('/api/auth/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentIdToken}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to get profile');
        }

        return { success: true, profile: data };
    } catch (error) {
        console.error('Get profile error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update user profile
 */
async function updateProfile(displayName = null, phone = null) {
    try {
        if (!isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        const updateData = {};
        if (displayName) updateData.displayName = displayName;
        if (phone) updateData.phone = phone;

        const response = await fetch('/api/auth/me', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentIdToken}`
            },
            body: JSON.stringify(updateData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to update profile');
        }

        // Update local user data
        if (displayName) currentUser.displayName = displayName;
        if (phone) currentUser.phone = phone;
        
        localStorage.setItem('user', JSON.stringify(currentUser));

        return { success: true };
    } catch (error) {
        console.error('Update profile error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Logout user
 */
async function logout() {
    try {
        // Call logout endpoint
        await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentIdToken}`
            }
        });

        // Clear local data
        currentUser = null;
        currentIdToken = null;
        localStorage.removeItem('user');
        localStorage.removeItem('idToken');

        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        // Still clear local data even if server call fails
        currentUser = null;
        currentIdToken = null;
        localStorage.removeItem('user');
        localStorage.removeItem('idToken');
        
        return { success: true };
    }
}

/**
 * Check user role
 */
function hasRole(role) {
    if (!currentUser) return false;
    if (Array.isArray(role)) {
        return role.includes(currentUser.role);
    }
    return currentUser.role === role;
}

/**
 * Check if user has multiple roles
 */
function hasAnyRole(...roles) {
    return hasRole(roles);
}

// Initialize auth on page load
initializeAuth();
