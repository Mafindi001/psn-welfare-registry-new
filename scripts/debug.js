/**
 * Debug script for PSN Welfare Registry
 * Add this script to any page to debug redirection issues
 */

console.log('=== PSN WELFARE REGISTRY DEBUG ===');
console.log('Current URL:', window.location.href);
console.log('Pathname:', window.location.pathname);
console.log('Hostname:', window.location.hostname);

// Check localStorage
console.log('LocalStorage contents:');
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    console.log(`  ${key}:`, localStorage.getItem(key));
}

// Check authentication status
const token = localStorage.getItem('psn_welfare_token');
const user = localStorage.getItem('psn_welfare_user');
console.log('Auth check - Token exists:', !!token);
console.log('Auth check - User exists:', !!user);

if (user) {
    try {
        const userObj = JSON.parse(user);
        console.log('User object:', userObj);
        console.log('Is admin:', userObj.isAdmin || false);
    } catch (e) {
        console.error('Failed to parse user:', e);
    }
}

// Add debug buttons to page
document.addEventListener('DOMContentLoaded', function () {
    // Create debug panel
    const debugPanel = document.createElement('div');
    debugPanel.style.position = 'fixed';
    debugPanel.style.bottom = '10px';
    debugPanel.style.right = '10px';
    debugPanel.style.background = 'rgba(0,0,0,0.8)';
    debugPanel.style.color = 'white';
    debugPanel.style.padding = '10px';
    debugPanel.style.borderRadius = '5px';
    debugPanel.style.zIndex = '9999';
    debugPanel.style.fontSize = '12px';
    debugPanel.style.fontFamily = 'monospace';

    debugPanel.innerHTML = `
        <strong>Debug Panel</strong><br>
        <button onclick="localStorage.clear(); location.reload();" style="margin: 2px; padding: 2px 5px; font-size: 10px;">
            Clear Storage
        </button>
        <button onclick="location.href='/pages/login.html'" style="margin: 2px; padding: 2px 5px; font-size: 10px;">
            Go to Login
        </button>
        <button onclick="location.href='/pages/dashboard.html'" style="margin: 2px; padding: 2px 5px; font-size: 10px;">
            Go to Dashboard
        </button>
        <button onclick="console.clear(); console.log('Console cleared');" style="margin: 2px; padding: 2px 5px; font-size: 10px;">
            Clear Console
        </button>
    `;

    document.body.appendChild(debugPanel);

    // Only show in development
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        debugPanel.style.display = 'none';
    }
});

console.log('=== END DEBUG INFO ===');