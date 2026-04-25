/**
 * Main Application Initialization
 */
document.addEventListener('DOMContentLoaded', async function() {
    initializeApp();
});

/**
 * Initialize application
 */
function initializeApp() {
    // Check if user is authenticated
    if (isAuthenticated()) {
        const user = getCurrentUser();
        if (user) {
            document.getElementById('user-name').textContent = user.displayName || user.email || 'User';
            showNav();
            applyRoleNavigation(user);
        }
        router.init();
    } else {
        // Show login page
        hideNav();
        renderLogin();
    }
}

function showNav() {
    const nav = document.querySelector('nav');
    nav.classList.add('show');
    nav.style.display = 'block';
}

function hideNav() {
    const nav = document.querySelector('nav');
    nav.classList.remove('show');
    nav.style.display = 'none';
}

function isStationStaffRole(role) {
    return role === 'station_staff' || role === 'staff';
}

function applyRoleNavigation(user) {
    const role = user?.role || null;
    const staffNav = document.querySelector('a[data-route="/staff"]');
    const reportsNav = document.querySelector('a[data-route="/reports"]');
    const deliveriesNav = document.querySelector('a[data-route="/deliveries"]');
    const dashboardNav = document.querySelector('a[data-route="/dashboard"]');
    const ordersNav = document.querySelector('a[data-route="/orders"]');
    const inventoryNav = document.querySelector('a[data-route="/inventory"]');
    const profileNav = document.querySelector('a[data-route="/profile"]');

    const showItem = (link, shouldShow) => {
        if (!link) {
            return;
        }

        const item = link.closest('.nav-item');
        if (item) {
            item.style.display = shouldShow ? '' : 'none';
        }
    };

    const isDriver = role === 'driver';
    const isStationStaff = isStationStaffRole(role);
    const isAdmin = role === 'admin' || role === 'super_admin';

    showItem(dashboardNav, !isDriver && (isStationStaff || isAdmin));
    showItem(ordersNav, !isDriver && (isStationStaff || isAdmin));
    showItem(inventoryNav, !isDriver && (isStationStaff || isAdmin));
    showItem(staffNav, isAdmin);
    showItem(reportsNav, isAdmin);
    showItem(deliveriesNav, isDriver);
    showItem(profileNav, !!role);
}

function getHomeRouteForUser(user) {
    return user && user.role === 'driver' ? '/deliveries' : '/dashboard';
}

function canAccessRoute(path) {
    const user = getCurrentUser();
    if (!user) {
        return false;
    }

    const normalizedRole = isStationStaffRole(user.role) ? 'station_staff' : user.role;

    const roleRoutes = {
        driver: ['/deliveries', '/profile'],
        station_staff: ['/dashboard', '/orders', '/inventory', '/profile'],
        admin: ['/dashboard', '/orders', '/inventory', '/staff', '/reports', '/profile'],
        super_admin: ['/dashboard', '/orders', '/inventory', '/staff', '/reports', '/profile']
    };

    return (roleRoutes[normalizedRole] || ['/profile']).includes(path);
}
