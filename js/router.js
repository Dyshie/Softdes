/**
 * Simple Client-Side Router for Water Station Management System
 * Maintains realtime Firebase listeners across route changes
 */

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.currentParams = {};
        this.middleware = [];
        this.isNavigating = false;
        this.isAuthenticated = false;
        this.authProtectedRoutes = ['/dashboard', '/orders', '/inventory', '/staff', '/reports', '/map'];
    }

    /**
     * Set authentication state
     */
    setAuthenticated(isAuth) {
        this.isAuthenticated = isAuth;
    }

    /**
     * Register a route handler
     * @param {string} path - Route path (e.g., '/dashboard', '/orders')
     * @param {Object} config - Route configuration
     *   - render: Function to render the route
     *   - onEnter: Function called when entering the route
     *   - onExit: Function called when leaving the route
     *   - title: Page title
     */
    register(path, config) {
        this.routes.set(path, {
            path,
            render: config.render || (() => {}),
            onEnter: config.onEnter || (() => {}),
            onExit: config.onExit || (() => {}),
            title: config.title || 'Water Station Management System'
        });
    }

    /**
     * Navigate to a route with auth checking
     * @param {string} path - Route path
     * @param {Object} params - Route parameters
     */
    navigate(path, params = {}) {
        if (this.isNavigating || !this.routes.has(path)) return;
        
        // Check if route requires authentication
        if (this.authProtectedRoutes.includes(path) && !this.isAuthenticated) {
            window.location.hash = '/login';
            return;
        }

        // Redirect to dashboard if trying to access login while authenticated
        if (path === '/login' && this.isAuthenticated) {
            window.location.hash = '/dashboard';
            return;
        }
        
        this.isNavigating = true;

        // Execute onExit for current route
        if (this.currentRoute && this.currentRoute.onExit) {
            try {
                this.currentRoute.onExit();
            } catch (error) {
                console.error('Error in onExit:', error);
            }
        }

        // Get new route
        const newRoute = this.routes.get(path);
        this.currentRoute = newRoute;
        this.currentParams = params;

        // Update URL hash
        const queryString = new URLSearchParams(params).toString();
        const hashPath = queryString ? `${path}?${queryString}` : path;
        window.location.hash = hashPath;

        // Render new route
        try {
            newRoute.render(params);
        } catch (error) {
            console.error('Error rendering route:', error);
            showNotification('Error loading page', 'error');
        }

        // Execute onEnter for new route
        try {
            newRoute.onEnter(params);
        } catch (error) {
            console.error('Error in onEnter:', error);
        }

        // Update navigation links
        this.updateActiveLink(path);

        // Update page title
        document.title = newRoute.title;

        // Show/hide navbar based on route
        this.updateNavbarVisibility(path);

        this.isNavigating = false;
    }

    /**
     * Handle hash changes from browser navigation
     */
    handleHashChange() {
        const hash = window.location.hash.slice(1) || '/login';
        
        // Parse path and query params
        const [path, queryString] = hash.split('?');
        const params = new URLSearchParams(queryString || '');
        const paramsObj = {};
        params.forEach((value, key) => {
            paramsObj[key] = value;
        });

        // Check if we're already on this route
        if (this.currentRoute && this.currentRoute.path === `/${path}`) {
            return;
        }

        const routePath = `/${path}` === '/' ? '/dashboard' : `/${path}`;
        
        if (this.routes.has(routePath)) {
            this.navigate(routePath, paramsObj);
        } else {
            // Route not found, redirect to default
            const defaultRoute = this.isAuthenticated ? '/dashboard' : '/login';
            window.location.hash = defaultRoute;
        }
    }

    /**
     * Update navbar visibility based on route
     */
    updateNavbarVisibility(path) {
        const navbar = document.querySelector('nav');
        const appContainer = document.getElementById('app-container');
        
        if (navbar && appContainer) {
            // Show navbar on all routes except login
            if (path === '/login') {
                navbar.classList.remove('show');
                navbar.style.display = 'none';
                appContainer.classList.remove('container-fluid');
            } else {
                navbar.style.display = 'block';
                navbar.classList.add('show');
                if (!appContainer.classList.contains('container-fluid')) {
                    appContainer.classList.add('container-fluid');
                }
            }
        }
    }

    /**
     * Update active navigation link
     */
    updateActiveLink(path) {
        document.querySelectorAll('[data-route]').forEach(link => {
            const linkPath = link.getAttribute('data-route');
            link.classList.toggle('active', linkPath === path);
        });
    }

    /**
     * Get current route information
     */
    getCurrentRoute() {
        return {
            path: this.currentRoute?.path || null,
            params: this.currentParams
        };
    }

    /**
     * Initialize router with event listeners
     */
    init() {
        window.addEventListener('hashchange', () => this.handleHashChange());
        
        // Handle initial route based on auth state
        const initialRoute = this.isAuthenticated ? '/dashboard' : '/login';
        window.location.hash = initialRoute;
    }
}

// Create global router instance
const router = new Router();

/**
 * Utility function to navigate from HTML
 * Usage: <a href="#" onclick="routeTo('/orders')">Orders</a>
 */
function routeTo(path, params = {}) {
    router.navigate(path, params);
}

/**
 * Utility function to go back
 */
function goBack() {
    window.history.back();
}

/**
 * Utility function to redirect after delay (e.g., after login)
 */
function redirectTo(path, delay = 0) {
    setTimeout(() => {
        window.location.hash = path;
    }, delay);
}

