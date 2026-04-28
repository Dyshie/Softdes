/**
 * API Client for communicating with Express.js backend
 */
function resolveApiBaseUrl() {
    const searchParams = new URLSearchParams(window.location.search);
    const queryApiUrl = searchParams.get('api');
    const storedApiUrl = localStorage.getItem('apiBaseUrl');
    const isLocalHost = window.location.hostname.includes('localhost');

    return (
        window.API_BASE_URL ||
        queryApiUrl ||
        storedApiUrl ||
        (isLocalHost ? 'http://localhost:5000/api' : '/api')
    );
}

class ApiClient {
    constructor(baseURL = resolveApiBaseUrl()) {
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
     * Set backend base URL and persist it for future loads
     */
    setBaseURL(baseURL) {
        this.baseURL = baseURL.trim();
        localStorage.setItem('apiBaseUrl', this.baseURL);
        window.API_BASE_URL = this.baseURL;
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
            const contentType = response.headers.get('content-type') || '';
            const isJsonResponse = contentType.includes('application/json');

            if (!response.ok) {
                const error = isJsonResponse
                    ? await response.json().catch(() => ({}))
                    : {};

                if (!isJsonResponse) {
                    throw new Error('Backend API is unavailable on this domain. The /api route is returning HTML instead of JSON. Deploy backend (Functions/Cloud Run) or configure window.API_BASE_URL.');
                }

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

            if (!isJsonResponse) {
                throw new Error('Unexpected API response format. Expected JSON from backend API.');
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
        forgotPassword: (email) => this.request('POST', '/auth/forgot-password', { email }),
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
        getRecentOrders: () => this.request('GET', '/dashboard/recent-orders'),
        getDiagnostics: () => this.request('GET', '/dashboard/diagnostics'),
        getActivity: () => this.request('GET', '/dashboard/activity')
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
     * Notifications endpoints
     */
    notifications = {
        getAll: () => this.request('GET', '/notifications'),
        getUnreadCount: () => this.request('GET', '/notifications/unread-count'),
        markRead: (id) => this.request('PATCH', `/notifications/${id}/read`),
        markAllRead: () => this.request('PATCH', '/notifications/mark-all-read'),
        readAll: () => this.request('PATCH', '/notifications/mark-all-read'),
        delete: (id) => this.request('DELETE', `/notifications/${id}`),
        test: (data) => this.request('POST', '/notifications/test', data),
        getSettings: () => this.request('GET', '/notifications/settings'),
        updateSettings: (data) => this.request('PUT', '/notifications/settings', data)
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
