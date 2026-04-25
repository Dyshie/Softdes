/**
 * Client-side Router for Single Page Application
 */
class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
    }

    /**
     * Register a route
     */
    register(path, component) {
        this.routes.set(path, component);
    }

    /**
     * Navigate to a route
     */
    async navigate(path) {
        if (typeof canAccessRoute === 'function' && !canAccessRoute(path)) {
            const fallbackRoute = typeof getHomeRouteForUser === 'function'
                ? getHomeRouteForUser(getCurrentUser())
                : '/dashboard';

            if (path !== fallbackRoute) {
                return this.navigate(fallbackRoute);
            }

            if (typeof renderLogin === 'function') {
                hideNav();
                renderLogin();
            }

            return;
        }

        const component = this.routes.get(path);
        
        if (!component) {
            this.navigate('/dashboard');
            return;
        }

        const container = document.getElementById('app-container');

        try {
            container.innerHTML = '';
            
            if (typeof component === 'function') {
                await component();
            } else {
                container.innerHTML = component;
            }

            this.currentRoute = path;
            window.location.hash = path;
        } catch (error) {
            console.error('Navigation error:', error);
            if (container) {
                container.innerHTML = '<div class="alert alert-danger">Error loading page</div>';
            }
        }
    }

    /**
     * Handle hash change
     */
    handleHashChange() {
        const hash = window.location.hash.slice(1) || '/dashboard';
        this.navigate(hash);
    }

    /**
     * Initialize router
     */
    init() {
        window.addEventListener('hashchange', () => this.handleHashChange());
        this.handleHashChange();
    }
}

// Global router instance
const router = new Router();

// Navigation function
function routeTo(path) {
    router.navigate(path);
}
