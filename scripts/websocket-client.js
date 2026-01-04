/**
 * WebSocket Client for Real-time Updates
 */

class WebSocketClient {
    constructor() {
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.subscribedRooms = new Set();
        this.messageHandlers = new Map();
        this.isConnected = false;
    }

    connect() {
        const token = localStorage.getItem('psn_welfare_token');
        if (!token) {
            console.log('No authentication token, skipping WebSocket connection');
            return;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`;

        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
            console.log('✅ WebSocket connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.reconnectDelay = 1000;

            // Resubscribe to rooms
            this.subscribedRooms.forEach(room => {
                this.subscribe(room);
            });

            // Start heartbeat
            this.startHeartbeat();

            // Notify connection
            this.triggerEvent('connected', { timestamp: new Date().toISOString() });
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.socket.onclose = (event) => {
            console.log('WebSocket disconnected:', event.code, event.reason);
            this.isConnected = false;
            this.stopHeartbeat();

            // Notify disconnection
            this.triggerEvent('disconnected', {
                code: event.code,
                reason: event.reason
            });

            // Attempt reconnect
            this.attemptReconnect();
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.triggerEvent('error', { error });
        };
    }

    handleMessage(data) {
        console.log('WebSocket message received:', data.type, data);

        // Handle specific message types
        switch (data.type) {
            case 'CONNECTED':
                console.log('WebSocket authenticated successfully');
                break;

            case 'ROOM_JOINED':
                console.log(`Joined room: ${data.room}`);
                break;

            case 'ROOM_LEFT':
                console.log(`Left room: ${data.room}`);
                break;

            case 'PONG':
                // Heartbeat response
                break;

            case 'USER_LOGIN':
                this.handleUserLogin(data.user);
                break;

            case 'USER_LOGOUT':
                this.handleUserLogout(data.userId);
                break;

            case 'AUDIT_LOG':
                this.handleAuditLog(data.log);
                break;

            case 'REMINDER_SENT':
                this.handleReminderSent(data.reminder);
                break;

            case 'SYSTEM_ALERT':
                this.handleSystemAlert(data.alert);
                break;
        }

        // Trigger event handlers
        this.triggerEvent(data.type, data);
        this.triggerEvent('message', data);
    }

    subscribe(room) {
        if (!this.isConnected) {
            this.subscribedRooms.add(room);
            return;
        }

        this.send({
            type: 'SUBSCRIBE',
            room: room
        });

        this.subscribedRooms.add(room);
    }

    unsubscribe(room) {
        if (!this.isConnected) {
            this.subscribedRooms.delete(room);
            return;
        }

        this.send({
            type: 'UNSUBSCRIBE',
            room: room
        });

        this.subscribedRooms.delete(room);
    }

    send(data) {
        if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        } else {
            console.warn('WebSocket not connected, message not sent:', data);
        }
    }

    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.send({ type: 'PING' });
            }
        }, 30000); // Send ping every 30 seconds
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;

        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

        setTimeout(() => {
            this.connect();
        }, this.reconnectDelay);

        // Exponential backoff
        this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
    }

    disconnect() {
        if (this.socket) {
            this.socket.close(1000, 'User initiated disconnect');
        }
        this.stopHeartbeat();
        this.isConnected = false;
    }

    // Event handling
    on(event, handler) {
        if (!this.messageHandlers.has(event)) {
            this.messageHandlers.set(event, new Set());
        }
        this.messageHandlers.get(event).add(handler);
    }

    off(event, handler) {
        if (this.messageHandlers.has(event)) {
            this.messageHandlers.get(event).delete(handler);
        }
    }

    triggerEvent(event, data) {
        if (this.messageHandlers.has(event)) {
            this.messageHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for "${event}":`, error);
                }
            });
        }
    }

    // Message handlers
    handleUserLogin(user) {
        // Update active users list
        if (typeof updateActiveUsers === 'function') {
            updateActiveUsers(user, 'login');
        }

        // Show notification for admins
        const currentUser = getCurrentUser();
        if (currentUser && currentUser.isAdmin) {
            showNotification(`${user.fullName} logged in`, 'info');
        }
    }

    handleUserLogout(userId) {
        // Update active users list
        if (typeof updateActiveUsers === 'function') {
            updateActiveUsers({ id: userId }, 'logout');
        }
    }

    handleAuditLog(log) {
        // Add to audit feed
        if (typeof addAuditLog === 'function') {
            addAuditLog(log);
        }

        // Update admin dashboard
        if (typeof updateActivityFeed === 'function') {
            updateActivityFeed({
                type: 'audit',
                message: `${log.userName} - ${log.action}`,
                timestamp: log.timestamp
            });
        }
    }

    handleReminderSent(reminder) {
        // Update reminder stats
        if (typeof updateReminderStats === 'function') {
            updateReminderStats(reminder);
        }

        // Show notification
        showNotification(`Reminder sent: ${reminder.eventType}`, 'success');
    }

    handleSystemAlert(alert) {
        // Show alert notification
        const alertElement = document.createElement('div');
        alertElement.className = `system-alert alert-${alert.level}`;
        alertElement.innerHTML = `
            <div class="alert-content">
                <strong>System Alert</strong>
                <p>${alert.message}</p>
                <small>${new Date(alert.timestamp).toLocaleTimeString()}</small>
            </div>
            <button class="alert-close">&times;</button>
        `;

        document.body.appendChild(alertElement);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (alertElement.parentNode) {
                alertElement.remove();
            }
        }, 10000);

        // Close button
        alertElement.querySelector('.alert-close').addEventListener('click', () => {
            alertElement.remove();
        });
    }

    // Utility methods
    isUserOnline(userId) {
        // This would check with server in production
        return this.isConnected;
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            subscribedRooms: Array.from(this.subscribedRooms)
        };
    }
}

// Create global WebSocket client instance
const wsClient = new WebSocketClient();

// Initialize WebSocket when user is authenticated
function initWebSocket() {
    if (isAuthenticated()) {
        wsClient.connect();

        // Subscribe based on user role
        const user = getCurrentUser();
        if (user) {
            // Personal room
            wsClient.subscribe(`user:${user.id}`);

            // Admin rooms
            if (user.isAdmin) {
                wsClient.subscribe('admin:dashboard');
                wsClient.subscribe('admin:notifications');
                wsClient.subscribe('admin:audit');
            }

            // System broadcasts
            wsClient.subscribe('system:broadcast');
        }
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    wsClient.disconnect();
});

// Export for use in other modules
window.wsClient = wsClient;
window.initWebSocket = initWebSocket;

// Add WebSocket styles
const wsStyles = `
    <style>
        .system-alert {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 15px;
            max-width: 400px;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            border-left: 4px solid #3498db;
        }
        
        .system-alert.alert-critical {
            border-left-color: #e74c3c;
            background: #fff5f5;
        }
        
        .system-alert.alert-warning {
            border-left-color: #f39c12;
            background: #fff8e1;
        }
        
        .system-alert.alert-info {
            border-left-color: #3498db;
            background: #f0f8ff;
        }
        
        .alert-content {
            margin-right: 30px;
        }
        
        .alert-content strong {
            display: block;
            margin-bottom: 5px;
            color: #2c3e50;
        }
        
        .alert-content p {
            margin: 0 0 5px 0;
            font-size: 14px;
        }
        
        .alert-content small {
            color: #7f8c8d;
            font-size: 12px;
        }
        
        .alert-close {
            position: absolute;
            top: 10px;
            right: 10px;
            background: none;
            border: none;
            font-size: 20px;
            color: #95a5a6;
            cursor: pointer;
            line-height: 1;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
        }
        
        .alert-close:hover {
            background: #f8f9fa;
            color: #2c3e50;
        }
        
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .connection-status {
            position: fixed;
            bottom: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
        }
        
        .connection-status.connected {
            background: rgba(52, 168, 83, 0.8);
        }
        
        .connection-status.disconnected {
            background: rgba(231, 76, 60, 0.8);
        }
        
        .connection-status.reconnecting {
            background: rgba(241, 196, 15, 0.8);
        }
    </style>
`;

// Add styles to document
document.head.insertAdjacentHTML('beforeend', wsStyles);

// Add connection status indicator
document.addEventListener('DOMContentLoaded', () => {
    const statusElement = document.createElement('div');
    statusElement.className = 'connection-status';
    statusElement.id = 'connectionStatus';
    document.body.appendChild(statusElement);

    // Update connection status
    function updateConnectionStatus() {
        const status = wsClient.getConnectionStatus();
        const element = document.getElementById('connectionStatus');

        if (element) {
            if (status.isConnected) {
                element.className = 'connection-status connected';
                element.textContent = '🟢 Connected';
                element.title = `Subscribed to ${status.subscribedRooms.length} rooms`;
            } else if (wsClient.reconnectAttempts > 0) {
                element.className = 'connection-status reconnecting';
                element.textContent = `🟡 Reconnecting (${wsClient.reconnectAttempts}/${wsClient.maxReconnectAttempts})`;
            } else {
                element.className = 'connection-status disconnected';
                element.textContent = '🔴 Disconnected';
            }
        }
    }

    // Listen for connection events
    wsClient.on('connected', updateConnectionStatus);
    wsClient.on('disconnected', updateConnectionStatus);
    wsClient.on('error', updateConnectionStatus);

    // Initial update
    updateConnectionStatus();

    // Auto-initialize WebSocket on admin pages
    if (window.location.pathname.includes('admin.html') ||
        window.location.pathname.includes('dashboard.html')) {
        initWebSocket();
    }
});