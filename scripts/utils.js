/**
 * Utility Functions for PSN Welfare Registry - Vercel Compatible
 */

// Import config if available
const CONFIG = window.CONFIG || {
    ENV: process.env.NODE_ENV || 'development',
    API_URL: '/api'
};

/**
 * Show notification message
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', 'info', 'warning'
 * @param {number} duration - Duration in milliseconds
 */
function showNotification(message, type = 'success', duration = 3000) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'polite');

    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' :
            type === 'error' ? 'exclamation-circle' :
                type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" aria-label="Close notification">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Add styles if not already present
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 9999;
                animation: slideIn 0.3s ease;
                max-width: 400px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 1rem;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            }
            .notification-success {
                background-color: #d4edda;
                color: #155724;
                border-left: 4px solid #28a745;
            }
            .notification-error {
                background-color: #f8d7da;
                color: #721c24;
                border-left: 4px solid #dc3545;
            }
            .notification-info {
                background-color: #d1ecf1;
                color: #0c5460;
                border-left: 4px solid #17a2b8;
            }
            .notification-warning {
                background-color: #fff3cd;
                color: #856404;
                border-left: 4px solid #ffc107;
            }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                flex: 1;
            }
            .notification-close {
                background: none;
                border: none;
                cursor: pointer;
                color: inherit;
                opacity: 0.7;
                padding: 0;
                line-height: 1;
                font-size: 1rem;
                transition: opacity 0.2s;
            }
            .notification-close:hover {
                opacity: 1;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(styles);
    }

    // Add to document
    document.body.appendChild(notification);

    // Add close functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    });

    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
    }
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Validate Nigerian phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
function isValidNigerianPhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    const cleanPhone = phone.replace(/\s+/g, '');
    const phoneRegex = /^(0|234)(7|8|9)(0|1)\d{8}$/;
    return phoneRegex.test(cleanPhone);
}

/**
 * Format date to display format
 * @param {string|Date|number} date - Date to format
 * @param {string} format - 'short' (DD/MM/YYYY) or 'long' (Day, Month DD, YYYY)
 * @returns {string} - Formatted date
 */
function formatDate(date, format = 'short') {
    if (!date) return 'N/A';

    let d;
    try {
        d = new Date(date);
        if (isNaN(d.getTime())) return 'Invalid Date';
    } catch (error) {
        return 'Invalid Date';
    }

    if (format === 'short') {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } else if (format === 'long') {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return d.toLocaleDateString('en-NG', options);
    } else {
        return d.toLocaleDateString();
    }
}

/**
 * Get days until date
 * @param {string|Date} date - Future date
 * @returns {number} - Days until date (negative if past)
 */
function getDaysUntil(date) {
    if (!date) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    const diffTime = target - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Debounce function for limiting rapid calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately
 * @returns {Function} - Debounced function
 */
function debounce(func, wait = 300, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const context = this;
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

/**
 * Throttle function for limiting call frequency
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} - Throttled function
 */
function throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Check if user is authenticated
 * @returns {boolean} - True if user has valid token
 */
function isAuthenticated() {
    // In development, allow mock authentication for testing
    if (CONFIG.ENV === 'development') {
        const devAuth = localStorage.getItem('dev_auth_override');
        if (devAuth === 'true') {
            console.log('🛠️ Development auth override enabled');
            return true;
        }
    }

    const token = localStorage.getItem('psn_welfare_token');
    const user = localStorage.getItem('psn_welfare_user');

    if (!token || !user) {
        return false;
    }

    // Check token expiration if it's a JWT
    if (token.includes('.')) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const isExpired = payload.exp < Date.now() / 1000;
            if (isExpired) {
                console.log('Token expired, clearing storage');
                localStorage.removeItem('psn_welfare_token');
                localStorage.removeItem('psn_welfare_user');
                return false;
            }
            return true;
        } catch (error) {
            console.warn('Invalid token format:', error);
            return false;
        }
    }

    // For non-JWT tokens, just check existence
    return true;
}

/**
 * Get current user from localStorage
 * @returns {Object|null} - User object or null
 */
function getCurrentUser() {
    const userStr = localStorage.getItem('psn_welfare_user');

    if (!userStr) {
        return null;
    }

    try {
        return JSON.parse(userStr);
    } catch (error) {
        console.error('Failed to parse user data:', error);
        // Clear invalid data
        localStorage.removeItem('psn_welfare_user');
        localStorage.removeItem('psn_welfare_token');
        return null;
    }
}

/**
 * Redirect to login if not authenticated
 * @param {boolean} redirectImmediately - Redirect immediately or return false
 * @returns {boolean} - True if authenticated
 */
function requireAuth(redirectImmediately = true) {
    const isAuth = isAuthenticated();

    if (!isAuth && redirectImmediately) {
        // Store current location for post-login redirect
        const currentPath = window.location.pathname + window.location.search;
        if (!currentPath.includes('/login.html') && !currentPath.includes('/register.html')) {
            sessionStorage.setItem('redirectAfterLogin', currentPath);
        }

        // Use timeout to avoid redirect loops
        setTimeout(() => {
            window.location.href = '/pages/login.html';
        }, 100);
        return false;
    }

    return isAuth;
}

/**
 * Logout user and clear storage
 * @param {boolean} redirectToLogin - Redirect to login page
 */
function logout(redirectToLogin = true) {
    // Clear authentication data
    localStorage.removeItem('psn_welfare_token');
    localStorage.removeItem('psn_welfare_user');

    // Clear any app-specific data
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('psn_') || key.startsWith('dev_')) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Clear session storage
    sessionStorage.clear();

    console.log('User logged out successfully');

    if (redirectToLogin) {
        window.location.href = '/pages/login.html';
    }
}

/**
 * Format PSN number with standard format
 * @param {string} psnNumber - Raw PSN number
 * @returns {string} - Formatted PSN number
 */
function formatPSNNumber(psnNumber) {
    if (!psnNumber || typeof psnNumber !== 'string') return '';

    // Remove spaces and convert to uppercase
    let formatted = psnNumber.replace(/\s+/g, '').toUpperCase();

    // Add hyphens for readability
    if (!formatted.includes('-')) {
        if (formatted.startsWith('PSN')) {
            formatted = 'PSN-' + formatted.substring(3);
        }
        // Add other formatting rules as needed
    }

    return formatted;
}

/**
 * Calculate password strength
 * @param {string} password - Password to check
 * @returns {Object} - {score: number, label: string, color: string}
 */
function calculatePasswordStrength(password) {
    if (!password || password.length === 0) {
        return { score: 0, label: 'Empty', color: '#e74c3c' };
    }

    let score = 0;

    // Length
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;

    // Complexity
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    // Labels based on score
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const colors = ['#e74c3c', '#e67e22', '#f1c40f', '#3498db', '#2ecc71', '#27ae60'];

    const finalScore = Math.min(score, 5);
    return {
        score: finalScore,
        label: labels[finalScore],
        color: colors[finalScore]
    };
}

/**
 * Safe JSON parse with default value
 * @param {string} str - JSON string to parse
 * @param {any} defaultValue - Default value if parsing fails
 * @returns {any} - Parsed value or default
 */
function safeJSONParse(str, defaultValue = null) {
    if (!str || typeof str !== 'string') return defaultValue;

    try {
        return JSON.parse(str);
    } catch (error) {
        console.warn('JSON parse error:', error);
        return defaultValue;
    }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
async function copyToClipboard(text) {
    if (!text) return false;

    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            return successful;
        }
    } catch (error) {
        console.error('Copy to clipboard failed:', error);
        return false;
    }
}

/**
 * Generate unique ID
 * @param {number} length - Length of ID (default: 8)
 * @returns {string} - Unique ID
 */
function generateId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Export for use in other modules
window.showNotification = showNotification;
window.isValidEmail = isValidEmail;
window.isValidNigerianPhone = isValidNigerianPhone;
window.formatDate = formatDate;
window.getDaysUntil = getDaysUntil;
window.debounce = debounce;
window.throttle = throttle;
window.isAuthenticated = isAuthenticated;
window.getCurrentUser = getCurrentUser;
window.requireAuth = requireAuth;
window.logout = logout;
window.formatPSNNumber = formatPSNNumber;
window.calculatePasswordStrength = calculatePasswordStrength;
window.safeJSONParse = safeJSONParse;
window.copyToClipboard = copyToClipboard;
window.generateId = generateId;

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showNotification,
        isValidEmail,
        isValidNigerianPhone,
        formatDate,
        getDaysUntil,
        debounce,
        throttle,
        isAuthenticated,
        getCurrentUser,
        requireAuth,
        logout,
        formatPSNNumber,
        calculatePasswordStrength,
        safeJSONParse,
        copyToClipboard,
        generateId
    };
}