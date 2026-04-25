/**
 * Login Component
 */
async function renderLogin() {
    hideNav();
    const container = document.getElementById('app-container');
    
    container.innerHTML = `
        <div class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-6">
                    <div class="card shadow">
                        <div class="card-body p-5">
                            <h2 class="card-title text-center mb-4">Water Station Management</h2>
                            <p class="text-center text-muted mb-4">Clean access for station teams, with a calmer water-themed workspace.</p>
                            <form id="login-form">
                                <div class="mb-3">
                                    <label for="email" class="form-label">Email</label>
                                    <input type="email" class="form-control" id="email" required>
                                </div>
                                <div class="mb-3">
                                    <label for="password" class="form-label">Password</label>
                                    <input type="password" class="form-control" id="password" required>
                                </div>
                                <button type="submit" class="btn btn-primary w-100">Login</button>
                            </form>
                            <hr>
                            <p class="text-center text-muted small">
                                Don't have an account? <a href="#" onclick="renderRegister()">Register here</a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', handleLogin);
}

/**
 * Handle login submission
 */
async function handleLogin(e) {
    e.preventDefault();
    
    try {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const response = await apiClient.auth.login(email, password);
        
        apiClient.setToken(response.idToken);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        document.getElementById('user-name').textContent = response.user.displayName || response.user.email || 'User';
        document.querySelector('nav').classList.add('show');
        applyRoleNavigation(response.user);

        routeTo(getHomeRouteForUser(response.user));
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
}

/**
 * Render registration form
 */
async function renderRegister() {
    hideNav();
    const container = document.getElementById('app-container');
    
    try {
        const status = await apiClient.auth.setupStatus();

        if (!status.canRegister) {
            container.innerHTML = `
                <div class="container mt-5">
                    <div class="row justify-content-center">
                        <div class="col-md-6">
                            <div class="card shadow">
                                <div class="card-body p-5">
                                    <h2 class="card-title text-center mb-4">Registration Closed</h2>
                                    <p class="text-center">Initial setup is complete. Please contact the super admin to create new accounts.</p>
                                    <div class="text-center mt-4">
                                        <button class="btn btn-secondary" onclick="renderLogin()">Back to Login</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            return;
        }
    } catch (error) {
        console.error('Error checking setup status:', error);
        container.innerHTML = '<div class="alert alert-danger">Unable to verify setup status. Please try again later.</div>';
        return;
    }

    container.innerHTML = `
        <div class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-6">
                    <div class="card shadow">
                        <div class="card-body p-5">
                            <h2 class="card-title text-center mb-4">Create Account</h2>
                            <form id="register-form">
                                <div class="mb-3">
                                    <label for="displayName" class="form-label">Full Name</label>
                                    <input type="text" class="form-control" id="displayName" required>
                                </div>
                                <div class="mb-3">
                                    <label for="reg-email" class="form-label">Email</label>
                                    <input type="email" class="form-control" id="reg-email" required>
                                </div>
                                <div class="mb-3">
                                    <label for="reg-password" class="form-label">Password</label>
                                    <input type="password" class="form-control" id="reg-password" required>
                                </div>
                                <button type="submit" class="btn btn-primary w-100">Register</button>
                            </form>
                            <hr>
                            <p class="text-center text-muted small">
                                Already have an account? <a href="#" onclick="renderLogin()">Login here</a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('register-form').addEventListener('submit', handleRegister);
}

/**
 * Handle registration
 */
async function handleRegister(e) {
    e.preventDefault();
    
    try {
        const displayName = document.getElementById('displayName').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;

        await apiClient.auth.register(email, password, displayName);
        
        alert('Registration successful! Please login.');
        renderLogin();
    } catch (error) {
        alert('Registration failed: ' + error.message);
    }
}

/**
 * Handle logout
 */
function logout() {
    apiClient.auth.logout();
    localStorage.removeItem('user');
    hideNav();
    renderLogin();
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    return !!apiClient.token;
}

/**
 * Get current user
 */
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}
