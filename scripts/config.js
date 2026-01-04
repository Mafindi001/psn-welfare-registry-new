/**
 * Configuration for PSN Welfare Registry - Vercel Compatible
 * This handles path configurations for different environments
 */

const CONFIG = {
    // Determine environment
    ENV: process.env.NODE_ENV || 'development',

    // Base path for assets - works with Vercel deployment
    BASE_PATH: '',

    // API URL - Use Vercel environment variables
    API_URL: process.env.NEXT_PUBLIC_API_URL ||
        (window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1'
            ? 'http://localhost:5000/api'
            : '/api'), // For production on same domain

    // App Info
    APP_NAME: 'PSN Taraba Welfare Registry',
    VERSION: '1.0.0',

    // Feature flags
    FEATURES: {
        WEBSOCKETS: process.env.NEXT_PUBLIC_ENABLE_WEBSOCKETS === 'true' || false,
        REAL_TIME_MONITORING: process.env.NEXT_PUBLIC_ENABLE_MONITORING === 'true' || false,
        BACKUP_SYSTEM: process.env.NEXT_PUBLIC_ENABLE_BACKUP === 'true' || true
    }
};

// Function to get full path for assets (Vercel compatible)
function getAssetPath(relativePath) {
    // Remove leading slash if present in relativePath to avoid double slash
    const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;

    if (CONFIG.BASE_PATH && CONFIG.BASE_PATH !== '/') {
        // Ensure no double slashes
        const base = CONFIG.BASE_PATH.endsWith('/')
            ? CONFIG.BASE_PATH.slice(0, -1)
            : CONFIG.BASE_PATH;
        return `${base}/${cleanPath}`;
    }

    return `/${cleanPath}`;
}

// Function to get API endpoint
function getApiEndpoint(endpoint) {
    // Remove leading slash from endpoint
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;

    // For production on Vercel with API routes on same domain
    if (CONFIG.ENV === 'production' && CONFIG.API_URL === '/api') {
        return `/api/${cleanEndpoint}`;
    }

    // For development or external API
    return `${CONFIG.API_URL}/${cleanEndpoint}`;
}

// Function to check if running on Vercel
function isVercel() {
    return process.env.VERCEL === '1' ||
        window.location.hostname.includes('vercel.app');
}

// Function to check if in development
function isDevelopment() {
    return CONFIG.ENV === 'development' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
}

// Function to get WebSocket URL (Vercel compatible)
function getWebSocketUrl() {
    if (CONFIG.ENV === 'development') {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.hostname}:5000/ws`;
    }

    // For Vercel production - adjust based on your WebSocket server
    if (CONFIG.FEATURES.WEBSOCKETS) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Replace with your WebSocket server URL
        const wsHost = process.env.NEXT_PUBLIC_WS_URL || window.location.host;
        return `${protocol}//${wsHost}/ws`;
    }

    return null;
}

// Make config available globally
window.CONFIG = CONFIG;
window.getAssetPath = getAssetPath;
window.getApiEndpoint = getApiEndpoint;
window.isVercel = isVercel;
window.isDevelopment = isDevelopment;
window.getWebSocketUrl = getWebSocketUrl;

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONFIG,
        getAssetPath,
        getApiEndpoint,
        isVercel,
        isDevelopment,
        getWebSocketUrl
    };
}

// Log config in development
if (isDevelopment()) {
    console.log('🔧 App Configuration:', {
        environment: CONFIG.ENV,
        apiUrl: CONFIG.API_URL,
        basePath: CONFIG.BASE_PATH,
        isVercel: isVercel(),
        features: CONFIG.FEATURES
    });
}