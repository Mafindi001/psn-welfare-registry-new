/**
 * Real-time User Activity Monitoring for PSN Welfare Registry - Vercel Compatible
 */

class ActivityMonitor {
    constructor() {
        this.activeUsers = new Map();
        this.recentActivity = [];
        this.socket = null;
        this.updateInterval = null;
        this.heartbeatInterval = null;
        this.isMonitoring = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;

        // Configuration
        this.config = {
            pollingInterval: 30000, // 30 seconds
            heartbeatInterval: 25000, // 25 seconds
            reconnectDelay: 5000, // 5 seconds
            maxActivityItems: 50,
            enableWebSocket: window.CONFIG?.FEATURES?.WEBSOCKETS || false,
            enableRealTime: true
        };

        // Initialize
        this.initialize();
    }

    // Initialize monitoring
    async initialize() {
        try {
            console.log('👁️ Initializing activity monitor...');

            // Check if user is admin
            const user = getCurrentUser();
            if (!user || !user.isAdmin) {
                console.log('User is not admin, skipping activity monitor');
                return;
            }

            // Load initial data
            await Promise.all([
                this.loadActiveUsers(),
                this.loadRecentActivity()
            ]);

            // Setup real-time monitoring
            this.startRealtimeMonitoring();

            // Setup dashboard updates
            this.setupDashboardUpdates();

            // Setup UI
            this.setupMonitoringUI();

            console.log('✅ Activity monitor initialized');

        } catch (error) {
            console.error('❌ Activity monitor initialization failed:', error);
        }
    }

    // Load active users
    async loadActiveUsers() {
        try {
            if (typeof ApiService !== 'undefined') {
                const response = await fetch(`${window.CONFIG?.API_URL || '/api'}/admin/monitoring/active-users`, {
                    headers: getAuthHeaders()
                });

                if (response.ok) {
                    const users = await response.json();
                    this.activeUsers = new Map(users.map(user => [user.id, user]));
                }
            } else {
                // Fallback to mock data for demo
                this.activeUsers = this.generateMockActiveUsers();
            }

            this.updateActiveUsersUI();

        } catch (error) {
            console.error('Failed to load active users:', error);
        }
    }

    // Load recent activity
    async loadRecentActivity() {
        try {
            if (typeof ApiService !== 'undefined') {
                const response = await fetch(`${window.CONFIG?.API_URL || '/api'}/admin/monitoring/recent-activity`, {
                    headers: getAuthHeaders()
                });

                if (response.ok) {
                    this.recentActivity = await response.json();
                }
            } else {
                // Fallback to mock data for demo
                this.recentActivity = this.generateMockRecentActivity(20);
            }

            this.updateActivityFeed();

        } catch (error) {
            console.error('Failed to load recent activity:', error);
        }
    }

    // Generate mock active users for demo
    generateMockActiveUsers() {
        const users = new Map();
        const names = ['Dr. John Pharmacist', 'Dr. Sarah Johnson', 'Dr. Michael Adekunle', 'Dr. Chinyere Okoro'];

        names.forEach((name, index) => {
            const minutesAgo = Math.floor(Math.random() * 30);
            users.set(`user_${index}`, {
                id: `user_${index}`,
                fullName: name,
                psnNumber: `PSN-TARA-2024-${(index + 1).toString().padStart(3, '0')}`,
                lastActivity: new Date(Date.now() - minutesAgo * 60 * 1000).toISOString(),
                ipAddress: `192.168.1.${100 + index}`,
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                status: 'active'
            });
        });

        return users;
    }

    // Generate mock recent activity for demo
    generateMockRecentActivity(count) {
        const activities = [];
        const actions = ['LOGIN', 'LOGOUT', 'VIEW_PROFILE', 'UPDATE_PROFILE', 'ADD_DATE', 'SEND_REMINDER'];
        const users = Array.from(this.activeUsers.values());

        for (let i = 0; i < count; i++) {
            const user = users[Math.floor(Math.random() * users.length)];
            const action = actions[Math.floor(Math.random() * actions.length)];
            const minutesAgo = Math.floor(Math.random() * 60);

            activities.push({
                id: `activity_${Date.now()}_${i}`,
                type: this.getActivityType(action),
                user: user,
                action: action,
                message: `${user.fullName} ${action.toLowerCase().replace(/_/g, ' ')}`,
                timestamp: new Date(Date.now() - minutesAgo * 60 * 1000).toISOString(),
                details: {
                    ipAddress: user.ipAddress,
                    userAgent: user.userAgent
                }
            });
        }

        // Sort by timestamp (newest first)
        return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    // Get activity type from action
    getActivityType(action) {
        const types = {
            'LOGIN': 'login',
            'LOGOUT': 'logout',
            'VIEW_PROFILE': 'view',
            'UPDATE_PROFILE': 'update',
            'ADD_DATE': 'add',
            'SEND_REMINDER': 'reminder'
        };
        return types[action] || 'system';
    }

    // Setup WebSocket for real-time updates
    setupWebSocket() {
        if (!this.config.enableWebSocket) {
            console.log('WebSocket disabled in config');
            return;
        }

        const wsUrl = getWebSocketUrl();
        if (!wsUrl) {
            console.log('No WebSocket URL available');
            return;
        }

        try {
            this.socket = new WebSocket(wsUrl);

            this.socket.onopen = () => {
                console.log('✅ Monitoring WebSocket connected');
                this.isMonitoring = true;
                this.reconnectAttempts = 0;

                // Authenticate
                const token = localStorage.getItem('psn_welfare_token');
                if (token) {
                    this.socket.send(JSON.stringify({
                        type: 'AUTH',
                        token: token
                    }));
                }

                // Subscribe to monitoring channels
                this.socket.send(JSON.stringify({
                    type: 'SUBSCRIBE',
                    channels: ['monitoring', 'activity', 'alerts']
                }));

                // Start heartbeat
                this.startHeartbeat();
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            this.socket.onclose = (event) => {
                console.log('WebSocket disconnected:', event.code, event.reason);
                this.isMonitoring = false;

                // Stop heartbeat
                this.stopHeartbeat();

                // Attempt reconnect
                this.attemptReconnect();
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.isMonitoring = false;
            };

        } catch (error) {
            console.error('WebSocket setup error:', error);
        }
    }

    // Handle WebSocket message
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'USER_LOGIN':
                this.handleUserLogin(data.user);
                break;
            case 'USER_LOGOUT':
                this.handleUserLogout(data.userId);
                break;
            case 'USER_ACTION':
                this.handleUserAction(data.action);
                break;
            case 'SYSTEM_ALERT':
                this.handleSystemAlert(data.alert);
                break;
            case 'STATS_UPDATE':
                this.handleStatsUpdate(data.stats);
                break;
            case 'PONG':
                // Heartbeat response
                break;
        }
    }

    // Handle user login
    handleUserLogin(user) {
        this.activeUsers.set(user.id, user);
        this.updateActiveUsersUI();

        // Add to activity feed
        this.addActivity({
            type: 'login',
            user: user,
            timestamp: new Date().toISOString(),
            message: `${user.fullName} logged in`,
            details: {
                ipAddress: user.ipAddress,
                userAgent: user.userAgent
            }
        });

        // Show notification for admins
        if (user.id !== getCurrentUser()?.id) {
            showNotification(`${user.fullName} logged in`, 'info');
        }
    }

    // Handle user logout
    handleUserLogout(userId) {
        const user = this.activeUsers.get(userId);
        if (user) {
            this.activeUsers.delete(userId);
            this.updateActiveUsersUI();

            // Add to activity feed
            this.addActivity({
                type: 'logout',
                user: user,
                timestamp: new Date().toISOString(),
                message: `${user.fullName} logged out`
            });
        }
    }

    // Handle user action
    handleUserAction(action) {
        this.addActivity({
            type: 'action',
            user: action.user,
            timestamp: action.timestamp,
            message: `${action.user.fullName} ${action.description}`,
            details: action.details
        });
    }

    // Handle system alert
    handleSystemAlert(alert) {
        this.addActivity({
            type: 'alert',
            timestamp: alert.timestamp,
            message: alert.message,
            severity: alert.severity,
            details: alert.details
        });

        // Show notification for critical alerts
        if (alert.severity === 'critical' || alert.severity === 'high') {
            this.showAlertNotification(alert);
        }
    }

    // Handle stats update
    handleStatsUpdate(stats) {
        this.updateDashboardStats(stats);
    }

    // Attempt WebSocket reconnect
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.config.reconnectDelay * this.reconnectAttempts;

        console.log(`Attempting reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);

        setTimeout(() => {
            if (!this.isMonitoring) {
                this.setupWebSocket();
            }
        }, delay);
    }

    // Start heartbeat
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    type: 'PING',
                    timestamp: new Date().toISOString()
                }));
            }
        }, this.config.heartbeatInterval);
    }

    // Stop heartbeat
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // Start real-time monitoring
    startRealtimeMonitoring() {
        if (this.isMonitoring) return;

        // Try WebSocket first
        this.setupWebSocket();

        // Start polling as fallback
        this.startPolling();
    }

    // Start polling (fallback)
    startPolling() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.updateInterval = setInterval(async () => {
            if (!this.isMonitoring) {
                await Promise.all([
                    this.loadActiveUsers(),
                    this.loadRecentActivity()
                ]);
            }
        }, this.config.pollingInterval);
    }

    // Setup dashboard updates
    setupDashboardUpdates() {
        // Update dashboard stats every minute
        setInterval(async () => {
            await this.updateDashboardStats();
        }, 60000);

        // Refresh activity feed every 2 minutes
        setInterval(async () => {
            await this.loadRecentActivity();
        }, 120000);
    }

    // Setup monitoring UI
    setupMonitoringUI() {
        // Add monitoring controls if they don't exist
        if (!document.getElementById('monitoringControls')) {
            this.createMonitoringControls();
        }

        // Update connection status
        this.updateConnectionStatus();
    }

    // Create monitoring controls
    createMonitoringControls() {
        const controls = document.createElement('div');
        controls.id = 'monitoringControls';
        controls.className = 'monitoring-controls';
        controls.innerHTML = `
            <div class="connection-status" id="connectionStatus">
                <span class="status-indicator"></span>
                <span class="status-text">Connecting...</span>
                <span class="status-actions">
                    <button class="btn btn-sm btn-outline" id="refreshMonitoring" title="Refresh">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button class="btn btn-sm btn-outline" id="toggleMonitoring" title="Pause Monitoring">
                        <i class="fas fa-pause"></i>
                    </button>
                </span>
            </div>
        `;

        // Find a good place to insert controls
        const dashboardHeader = document.querySelector('.dashboard-header');
        if (dashboardHeader) {
            dashboardHeader.appendChild(controls);
        } else {
            document.body.appendChild(controls);
        }

        // Add event listeners
        document.getElementById('refreshMonitoring').addEventListener('click', () => {
            this.refreshMonitoring();
        });

        document.getElementById('toggleMonitoring').addEventListener('click', () => {
            this.toggleMonitoring();
        });
    }

    // Update connection status
    updateConnectionStatus() {
        const statusElement = document.getElementById('connectionStatus');
        if (!statusElement) return;

        const indicator = statusElement.querySelector('.status-indicator');
        const text = statusElement.querySelector('.status-text');
        const toggleBtn = document.getElementById('toggleMonitoring');

        if (this.isMonitoring) {
            indicator.className = 'status-indicator connected';
            text.textContent = `Connected (${this.activeUsers.size} active users)`;
            if (toggleBtn) {
                toggleBtn.innerHTML = '<i class="fas fa-pause"></i>';
                toggleBtn.title = 'Pause Monitoring';
            }
        } else {
            indicator.className = 'status-indicator disconnected';
            text.textContent = 'Disconnected';
            if (toggleBtn) {
                toggleBtn.innerHTML = '<i class="fas fa-play"></i>';
                toggleBtn.title = 'Resume Monitoring';
            }
        }
    }

    // Refresh monitoring
    async refreshMonitoring() {
        showNotification('Refreshing monitoring data...', 'info');

        try {
            await Promise.all([
                this.loadActiveUsers(),
                this.loadRecentActivity(),
                this.updateDashboardStats()
            ]);

            showNotification('Monitoring data refreshed', 'success');

        } catch (error) {
            console.error('Refresh error:', error);
            showNotification('Failed to refresh monitoring data', 'error');
        }
    }

    // Toggle monitoring
    toggleMonitoring() {
        if (this.isMonitoring) {
            this.stopMonitoring();
            showNotification('Monitoring paused', 'warning');
        } else {
            this.startRealtimeMonitoring();
            showNotification('Monitoring resumed', 'success');
        }

        this.updateConnectionStatus();
    }

    // Stop monitoring
    stopMonitoring() {
        this.isMonitoring = false;

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.close();
        }

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // Update active users UI
    updateActiveUsersUI() {
        const container = document.getElementById('activeUsersList');
        if (!container) return;

        container.innerHTML = '';

        if (this.activeUsers.size === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users-slash"></i>
                    <p>No active users</p>
                </div>
            `;
            return;
        }

        Array.from(this.activeUsers.values()).forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'active-user';
            userElement.dataset.userId = user.id;

            const sessionDuration = this.getSessionDuration(user.lastActivity);
            const isCurrentUser = user.id === getCurrentUser()?.id;

            userElement.innerHTML = `
                <div class="user-avatar ${isCurrentUser ? 'current-user' : ''}">
                    <i class="fas fa-user"></i>
                </div>
                <div class="user-info">
                    <strong>${user.fullName}</strong>
                    <small>${user.psnNumber}</small>
                    ${isCurrentUser ? '<span class="badge-you">You</span>' : ''}
                </div>
                <div class="user-status">
                    <span class="status-indicator active"></span>
                    <small>${sessionDuration}</small>
                </div>
            `;

            // Add click event to view user details
            userElement.addEventListener('click', () => {
                this.showUserDetails(user);
            });

            container.appendChild(userElement);
        });

        // Update active users count
        const countElement = document.getElementById('activeUsersCount');
        if (countElement) {
            countElement.textContent = this.activeUsers.size;
        }
    }

    // Update activity feed
    updateActivityFeed() {
        const feed = document.getElementById('activityFeed');
        if (!feed) return;

        feed.innerHTML = '';

        // Show only recent activities
        const recentActivities = this.recentActivity.slice(0, 10);

        if (recentActivities.length === 0) {
            feed.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }

        recentActivities.forEach(activity => {
            const activityElement = document.createElement('div');
            activityElement.className = 'activity-item';
            activityElement.dataset.activityId = activity.id;

            activityElement.innerHTML = `
                <div class="activity-icon ${activity.type}">
                    <i class="fas ${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <p class="activity-text">${activity.message}</p>
                    <p class="activity-time">${this.getRelativeTime(activity.timestamp)}</p>
                    ${activity.details?.ipAddress ?
                    `<small class="activity-ip">IP: ${activity.details.ipAddress}</small>` :
                    ''}
                </div>
                <button class="activity-action view-details" title="View Details">
                    <i class="fas fa-arrow-right"></i>
                </button>
            `;

            // Add click event to view details
            activityElement.querySelector('.view-details').addEventListener('click', (e) => {
                e.stopPropagation();
                this.showActivityDetails(activity);
            });

            feed.appendChild(activityElement);
        });
    }

    // Add new activity
    addActivity(activity) {
        activity.id = `activity_${Date.now()}_${this.recentActivity.length}`;
        this.recentActivity.unshift(activity);

        // Keep only max items
        if (this.recentActivity.length > this.config.maxActivityItems) {
            this.recentActivity.pop();
        }

        // Update UI
        this.updateActivityFeed();
    }

    // Update dashboard stats
    async updateDashboardStats(stats = null) {
        try {
            if (!stats) {
                if (typeof ApiService !== 'undefined') {
                    const response = await fetch(`${window.CONFIG?.API_URL || '/api'}/admin/stats/realtime`, {
                        headers: getAuthHeaders()
                    });

                    if (response.ok) {
                        stats = await response.json();
                    }
                }
            }

            if (stats) {
                // Update stat cards
                this.updateStatCard('totalMembers', stats.totalMembers);
                this.updateStatCard('activeMembers', stats.activeMembers);
                this.updateStatCard('upcomingCelebrations', stats.upcomingCelebrations);
                this.updateStatCard('remindersSent', stats.remindersSent);
                this.updateStatCard('systemHealth', stats.systemHealth);

                // Update last updated time
                const lastUpdated = document.getElementById('lastUpdated');
                if (lastUpdated) {
                    lastUpdated.textContent = new Date().toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
            }

        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }

    // Update individual stat card
    updateStatCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            // Animate value change
            const current = parseInt(element.textContent.replace(/,/g, '')) || 0;
            if (current !== value) {
                this.animateValue(element, current, value, 500);
            }
        }
    }

    // Animate value change
    animateValue(element, start, end, duration) {
        const startTime = performance.now();

        const updateValue = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const currentValue = Math.floor(start + (end - start) * progress);
            element.textContent = currentValue.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(updateValue);
            }
        };

        requestAnimationFrame(updateValue);
    }

    // Show alert notification
    showAlertNotification(alert) {
        const notification = document.createElement('div');
        notification.className = `alert-notification ${alert.severity}`;
        notification.innerHTML = `
            <div class="alert-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="alert-content">
                <strong>System Alert</strong>
                <p>${alert.message}</p>
                <small>${new Date(alert.timestamp).toLocaleTimeString()}</small>
            </div>
            <button class="alert-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);

        // Close button
        notification.querySelector('.alert-close').addEventListener('click', () => {
            notification.remove();
        });
    }

    // Show user details
    showUserDetails(user) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>User Activity Details</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="user-details-grid">
                        <div class="detail-item">
                            <label>Name:</label>
                            <span>${user.fullName}</span>
                        </div>
                        <div class="detail-item">
                            <label>PSN Number:</label>
                            <span>${user.psnNumber}</span>
                        </div>
                        <div class="detail-item">
                            <label>Last Activity:</label>
                            <span>${this.formatDateTime(user.lastActivity)} (${this.getRelativeTime(user.lastActivity)})</span>
                        </div>
                        <div class="detail-item">
                            <label>Session Duration:</label>
                            <span>${this.getSessionDuration(user.lastActivity)}</span>
                        </div>
                        <div class="detail-item">
                            <label>IP Address:</label>
                            <span>${user.ipAddress}</span>
                        </div>
                        <div class="detail-item">
                            <label>Status:</label>
                            <span class="status-badge status-active">Active</span>
                        </div>
                        <div class="detail-item">
                            <label>User Agent:</label>
                            <pre class="user-agent">${user.userAgent}</pre>
                        </div>
                    </div>
                    
                    <h4>Recent Activities</h4>
                    <div class="user-activities" id="userActivitiesList"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="this.closest('.modal').remove()">
                        Close
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Load user activities
        this.loadUserActivities(user.id, modal.querySelector('#userActivitiesList'));

        // Close modal
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Load user activities
    loadUserActivities(userId, container) {
        const userActivities = this.recentActivity.filter(activity =>
            activity.user && activity.user.id === userId
        ).slice(0, 5);

        if (userActivities.length === 0) {
            container.innerHTML = '<p class="text-muted">No recent activities</p>';
            return;
        }

        container.innerHTML = userActivities.map(activity => `
            <div class="activity-item small">
                <div class="activity-icon ${activity.type}">
                    <i class="fas ${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <p class="activity-text">${activity.message}</p>
                    <p class="activity-time">${this.getRelativeTime(activity.timestamp)}</p>
                </div>
            </div>
        `).join('');
    }

    // Show activity details
    showActivityDetails(activity) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Activity Details</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="activity-details-grid">
                        <div class="detail-item">
                            <label>Type:</label>
                            <span class="activity-type ${activity.type}">
                                ${activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                            </span>
                        </div>
                        <div class="detail-item">
                            <label>User:</label>
                            <span>${activity.user?.fullName || 'System'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Timestamp:</label>
                            <span>${this.formatDateTime(activity.timestamp)}</span>
                        </div>
                        <div class="detail-item">
                            <label>Relative Time:</label>
                            <span>${this.getRelativeTime(activity.timestamp)}</span>
                        </div>
                        <div class="detail-item">
                            <label>Message:</label>
                            <span>${activity.message}</span>
                        </div>
                        ${activity.details?.ipAddress ? `
                        <div class="detail-item">
                            <label>IP Address:</label>
                            <span>${activity.details.ipAddress}</span>
                        </div>
                        ` : ''}
                        ${activity.details?.userAgent ? `
                        <div class="detail-item">
                            <label>User Agent:</label>
                            <pre class="user-agent">${activity.details.userAgent}</pre>
                        </div>
                        ` : ''}
                        ${activity.severity ? `
                        <div class="detail-item">
                            <label>Severity:</label>
                            <span class="severity-badge ${activity.severity}">
                                ${activity.severity.toUpperCase()}
                            </span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="this.closest('.modal').remove()">
                        Close
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Helper: Get session duration
    getSessionDuration(lastActivity) {
        const now = new Date();
        const last = new Date(lastActivity);
        const diff = now - last;
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m`;
        return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    }

    // Helper: Get activity icon
    getActivityIcon(type) {
        const icons = {
            'login': 'fa-sign-in-alt',
            'logout': 'fa-sign-out-alt',
            'action': 'fa-user-edit',
            'alert': 'fa-exclamation-circle',
            'system': 'fa-cog',
            'reminder': 'fa-bell',
            'view': 'fa-eye',
            'update': 'fa-edit',
            'add': 'fa-plus'
        };
        return icons[type] || 'fa-info-circle';
    }

    // Helper: Get relative time
    getRelativeTime(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = now - time;

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return `${Math.floor(days / 7)}w ago`;
    }

    // Helper: Format date time
    formatDateTime(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-NG', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    }

    // Cleanup
    destroy() {
        this.stopMonitoring();

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        console.log('Activity monitor destroyed');
    }
}

// Create global activity monitor instance
const ActivityTracker = new ActivityMonitor();

// Export for use in other modules
window.ActivityTracker = ActivityTracker;

// Auto-initialize on admin pages
if (window.location.pathname.includes('admin.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        // ActivityTracker will auto-initialize
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        ActivityTracker.destroy();
    });
}

// Add monitoring styles
const monitoringStyles = `
    <style>
        .active-user {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            border-bottom: 1px solid var(--border-color);
            cursor: pointer;
            transition: background 0.2s;
        }
        
        .active-user:hover {
            background: #f8f9fa;
        }
        
        .active-user:last-child {
            border-bottom: none;
        }
        
        .user-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--bg-light);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--primary-color);
        }
        
        .user-avatar.current-user {
            background: var(--primary-color);
            color: white;
        }
        
        .user-info {
            flex: 1;
        }
        
        .user-info strong {
            display: block;
            font-size: 0.95rem;
        }
        
        .user-info small {
            color: var(--text-light);
            font-size: 0.85rem;
        }
        
        .badge-you {
            display: inline-block;
            padding: 2px 6px;
            background: var(--primary-color);
            color: white;
            border-radius: 10px;
            font-size: 0.7rem;
            margin-left: 5px;
        }
        
        .user-status {
            text-align: right;
        }
        
        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 5px;
        }
        
        .status-indicator.active {
            background-color: var(--secondary-color);
            box-shadow: 0 0 0 2px rgba(52, 168, 83, 0.2);
        }
        
        .status-indicator.connected {
            background-color: var(--secondary-color);
        }
        
        .status-indicator.disconnected {
            background-color: #e74c3c;
        }
        
        .activity-item .activity-icon {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .activity-item .activity-icon.login {
            background: rgba(52, 168, 83, 0.1);
            color: var(--secondary-color);
        }
        
        .activity-item .activity-icon.logout {
            background: rgba(108, 117, 125, 0.1);
            color: #6c757d;
        }
        
        .activity-item .activity-icon.alert {
            background: rgba(231, 76, 60, 0.1);
            color: #e74c3c;
        }
        
        .activity-item .activity-icon.system {
            background: rgba(52, 152, 219, 0.1);
            color: #3498db;
        }
        
        .activity-item .activity-icon.reminder {
            background: rgba(155, 89, 182, 0.1);
            color: #9b59b6;
        }
        
        .activity-item.small .activity-icon {
            width: 28px;
            height: 28px;
            font-size: 0.8rem;
        }
        
        .alert-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 15px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            max-width: 400px;
            z-index: 9999;
            animation: slideIn 0.3s ease;
        }
        
        .alert-notification.critical {
            border-left: 4px solid #e74c3c;
        }
        
        .alert-notification.high {
            border-left: 4px solid #e67e22;
        }
        
        .alert-notification.medium {
            border-left: 4px solid #f1c40f;
        }
        
        .alert-notification.low {
            border-left: 4px solid #3498db;
        }
        
        .alert-icon {
            font-size: 1.2rem;
            margin-top: 2px;
        }
        
        .alert-content {
            flex: 1;
        }
        
        .alert-content strong {
            display: block;
            margin-bottom: 5px;
            color: var(--text-color);
        }
        
        .alert-content p {
            margin: 0 0 5px 0;
            font-size: 0.95rem;
        }
        
        .alert-content small {
            color: var(--text-light);
            font-size: 0.85rem;
        }
        
        .alert-close {
            background: none;
            border: none;
            color: var(--text-light);
            cursor: pointer;
            padding: 0;
            font-size: 1rem;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .monitoring-controls {
            background: #f8f9fa;
            padding: 10px 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid #e9ecef;
        }
        
        .connection-status {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
        }
        
        .status-text {
            flex: 1;
            font-size: 0.9rem;
            color: #495057;
        }
        
        .status-actions {
            display: flex;
            gap: 5px;
        }
        
        .user-details-grid,
        .activity-details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .detail-item {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .detail-item label {
            font-weight: 600;
            color: #6c757d;
            font-size: 0.9rem;
        }
        
        .user-agent {
            font-family: 'Courier New', monospace;
            font-size: 0.8rem;
            background: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            max-height: 100px;
            overflow: auto;
            margin: 0;
        }
        
        .severity-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        
        .severity-badge.critical {
            background: #f8d7da;
            color: #721c24;
        }
        
        .severity-badge.high {
            background: #fff3cd;
            color: #856404;
        }
        
        .severity-badge.medium {
            background: #d1ecf1;
            color: #0c5460;
        }
        
        .severity-badge.low {
            background: #d4edda;
            color: #155724;
        }
        
        .activity-type {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        
        .activity-type.login { background: #d4edda; color: #155724; }
        .activity-type.logout { background: #e2e3e5; color: #383d41; }
        .activity-type.alert { background: #f8d7da; color: #721c24; }
        .activity-type.system { background: #d1ecf1; color: #0c5460; }
        .activity-type.reminder { background: #e8d9f3; color: #542c85; }
        
        .user-activities {
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 10px;
        }
        
        .activity-ip {
            display: block;
            font-family: 'Courier New', monospace;
            color: #6c757d;
            font-size: 0.8rem;
            margin-top: 2px;
        }
    </style>
`;

// Add styles to document
document.head.insertAdjacentHTML('beforeend', monitoringStyles);