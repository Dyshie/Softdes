/**
 * API Client for communicating with Express.js backend
 */
class ApiClient {
    constructor(baseURL = 'http://localhost:5000/api') {
        this.baseURL = baseURL;
        this.token = localStorage.getItem('authToken');
    }

    /**
     * Set authorization token
     */
    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    }

    /**
     * Get authorization headers
     */
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            ...(this.token && { 'Authorization': `Bearer ${this.token}` })
        };
    }

    /**
     * Make API request
     */
    async request(method, endpoint, data = null) {
        try {
            const options = {
                method,
                headers: this.getHeaders()
            };

            if (data) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(`${this.baseURL}${endpoint}`, options);

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                const validationMessage = Array.isArray(error.errors)
                    ? error.errors
                        .map((item) => item?.msg || item?.message || item?.error)
                        .filter(Boolean)
                        .join(', ')
                    : '';

                throw new Error(
                    error.error ||
                    error.message ||
                    validationMessage ||
                    `API Error: ${response.statusText}`
                );
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    /**
     * Authentication endpoints
     */
    auth = {
        login: (email, password) => this.request('POST', '/auth/login', { email, password }),
        register: (email, password, displayName) => this.request('POST', '/auth/register', { email, password, displayName }),
        setupStatus: () => this.request('GET', '/auth/setup-status'),
        createUser: (data) => this.request('POST', '/auth/users', data),
        getProfile: () => this.request('GET', '/auth/me'),
        updateProfile: (data) => this.request('PUT', '/auth/me', data),
        requestVerificationCode: () => this.request('POST', '/auth/verification/request'),
        verifyVerificationCode: (data) => this.request('POST', '/auth/verification/verify', data),
        logout: () => {
            this.token = null;
            localStorage.removeItem('authToken');
        }
    };

    /**
     * Orders endpoints
     */
    orders = {
        getAll: () => this.request('GET', '/orders'),
        getOne: (id) => this.request('GET', `/orders/${id}`),
        create: (data) => this.request('POST', '/orders', data),
        update: (id, data) => this.request('PUT', `/orders/${id}`, data),
        updateStatus: (id, data) => this.request('PATCH', `/orders/${id}/status`, data),
        delete: (id) => this.request('DELETE', `/orders/${id}`)
    };

    /**
     * Inventory endpoints
     */
    inventory = {
        getAll: () => this.request('GET', '/inventory'),
        getOne: (id) => this.request('GET', `/inventory/${id}`),
        create: (data) => this.request('POST', '/inventory', data),
        update: (id, data) => this.request('PUT', `/inventory/${id}`, data),
        delete: (id) => this.request('DELETE', `/inventory/${id}`)
    };

    /**
     * Staff endpoints
     */
    staff = {
        getAll: () => this.request('GET', '/staff'),
        getDrivers: () => this.request('GET', '/staff/drivers'),
        getOne: (id) => this.request('GET', `/staff/${id}`),
        create: (data) => this.request('POST', '/staff', data),
        update: (id, data) => this.request('PUT', `/staff/${id}`, data),
        delete: (id) => this.request('DELETE', `/staff/${id}`)
    };

    /**
     * Dashboard endpoints
     */
    dashboard = {
        getStats: () => this.request('GET', '/dashboard/stats'),
        getRecentOrders: () => this.request('GET', '/dashboard/recent-orders')
    };

    /**
     * Reports endpoints
     */
    reports = {
        getAll: () => this.request('GET', '/reports'),
        generate: (data) => this.request('POST', '/reports/generate', data)
    };

    /**
     * Deliveries endpoints
     */
    deliveries = {
        getAll: () => this.request('GET', '/deliveries')
    };

    /**
     * Generic HTTP methods for direct API calls
     */
    get(endpoint) {
        return this.request('GET', endpoint);
    }

    post(endpoint, data) {
        return this.request('POST', endpoint, data);
    }

    put(endpoint, data) {
        return this.request('PUT', endpoint, data);
    }

    delete(endpoint) {
        return this.request('DELETE', endpoint);
    }
}

// Initialize global API client
const apiClient = new ApiClient();
