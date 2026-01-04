/**
 * Audit Trail System for PSN Welfare Registry - Vercel Compatible
 */

class AuditTrail {
    constructor() {
        this.logs = [];
        this.isMonitoring = false;
        this.updateInterval = null;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.messageHandlers = new Map();

        // Configuration
        this.config = {
            maxLogs: 1000,
            pollingInterval: 30000, // 30 seconds
            reconnectDelay: 5000, // 5 seconds
            webSocketEnabled: false // Will be enabled if WS is available
        };

        // Initialize
        this.initialize();
    }

    // Initialize audit trail
    async initialize() {
        console.log('🔍 Initializing audit trail...');

        // Load initial logs
        await this.loadAuditLogs();

        // Set up page tracking
        this.setupPageTracking();

        // Start real-time monitoring
        this.startRealtimeMonitoring();

        console.log('✅ Audit trail initialized');
    }

    // Load audit logs
    async loadAuditLogs(filters = {}) {
        try {
            console.log('📥 Loading audit logs...');

            if (typeof ApiService !== 'undefined') {
                const response = await ApiService.getSystemLogs(1, 100, filters);
                this.logs = response.data || [];
            } else {
                // Fallback to mock data for demo
                this.logs = this.generateMockLogs(50);
            }

            this.renderAuditLogs();

            // Log success
            await this.logAction('AUDIT_LOGS_LOADED', {
                count: this.logs.length,
                filters: Object.keys(filters)
            });

            return this.logs;

        } catch (error) {
            console.error('❌ Failed to load audit logs:', error);
            showNotification('Failed to load audit logs', 'error');
            return [];
        }
    }

    // Generate mock logs for demo
    generateMockLogs(count) {
        const logs = [];
        const actions = ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT'];
        const users = ['Admin User', 'System', 'John Pharmacist', 'Sarah Johnson', 'Michael Adekunle'];
        const entities = ['Member', 'Special Date', 'Next of Kin', 'Report', 'Backup', 'Settings'];

        for (let i = 0; i < count; i++) {
            const action = actions[Math.floor(Math.random() * actions.length)];
            const user = users[Math.floor(Math.random() * users.length)];
            const entity = entities[Math.floor(Math.random() * entities.length)];
            const entityId = Math.floor(Math.random() * 1000);
            const hoursAgo = Math.floor(Math.random() * 168);

            logs.push({
                id: `log_${Date.now()}_${i}`,
                action: action,
                userId: user.toLowerCase().replace(/\s+/g, '_'),
                userName: user,
                entityType: entity,
                entityId: entityId.toString(),
                details: `${action} ${entity} ${entityId}`,
                ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                timestamp: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
                severity: action === 'DELETE' || action === 'ERROR' ? 'high' : 'low'
            });
        }

        // Sort by timestamp (newest first)
        return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    // Render audit logs to table
    renderAuditLogs() {
        const tableBody = document.getElementById('logsTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (this.logs.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state-cell">
                        <i class="fas fa-clipboard-list"></i>
                        <p>No audit logs found</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Only show recent logs (first 50)
        const displayLogs = this.logs.slice(0, 50);

        displayLogs.forEach(log => {
            const row = document.createElement('tr');
            row.dataset.logId = log.id;

            row.innerHTML = `
                <td>
                    <div class="timestamp-cell">
                        <div class="timestamp">${this.formatTimestamp(log.timestamp)}</div>
                        <small class="text-muted">${this.getRelativeTime(log.timestamp)}</small>
                    </div>
                </td>
                <td>
                    <div class="user-info">
                        <strong>${log.userName || 'System'}</strong>
                        ${log.userId ? `<br><small>${log.userId}</small>` : ''}
                    </div>
                </td>
                <td>
                    <span class="action-badge ${this.getActionClass(log.action)}">
                        ${this.formatAction(log.action)}
                    </span>
                    ${log.severity === 'high' ?
                    '<i class="fas fa-exclamation-triangle ml-1 text-warning" title="High Severity"></i>' :
                    ''}
                </td>
                <td>
                    <div class="log-details">
                        <div class="log-entity">
                            ${log.entityType ? `<strong>${log.entityType}:</strong> ${log.entityId || 'N/A'}` : ''}
                        </div>
                        <div class="log-message">
                            ${this.formatDetails(log.details)}
                        </div>
                    </div>
                </td>
                <td>
                    <div class="ip-address" title="${log.userAgent || 'N/A'}">
                        ${log.ipAddress || 'N/A'}
                    </div>
                    ${log.userAgent ?
                    `<small class="text-muted">${this.truncateString(log.userAgent, 20)}</small>` :
                    ''}
                </td>
                <td>
                    <div class="log-actions">
                        <button class="btn btn-outline btn-sm view-log-details" 
                                data-log-id="${log.id}"
                                title="View Details">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        ${this.canExportLog(log) ?
                    `<button class="btn btn-outline btn-sm export-log" 
                                    data-log-id="${log.id}"
                                    title="Export Log">
                                <i class="fas fa-download"></i>
                            </button>` :
                    ''}
                    </div>
                </td>
            `;

            tableBody.appendChild(row);
        });

        // Add event listeners to new buttons
        this.attachLogEventListeners();
    }

    // Attach event listeners to log buttons
    attachLogEventListeners() {
        // View log details
        document.querySelectorAll('.view-log-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const logId = e.currentTarget.dataset.logId;
                this.showLogDetails(logId);
            });
        });

        // Export log
        document.querySelectorAll('.export-log').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const logId = e.currentTarget.dataset.logId;
                await this.exportSingleLog(logId);
            });
        });
    }

    // Show log details
    showLogDetails(logId) {
        const log = this.logs.find(l => l.id === logId);
        if (!log) return;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <h3>Audit Log Details</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="log-detail-grid">
                        <div class="detail-item">
                            <label>Timestamp:</label>
                            <span>${this.formatTimestamp(log.timestamp)} (${this.getRelativeTime(log.timestamp)})</span>
                        </div>
                        <div class="detail-item">
                            <label>User:</label>
                            <span>${log.userName} (${log.userId})</span>
                        </div>
                        <div class="detail-item">
                            <label>Action:</label>
                            <span class="action-badge ${this.getActionClass(log.action)}">
                                ${this.formatAction(log.action)}
                            </span>
                        </div>
                        <div class="detail-item">
                            <label>Entity:</label>
                            <span>${log.entityType || 'N/A'} ${log.entityId ? `(${log.entityId})` : ''}</span>
                        </div>
                        <div class="detail-item">
                            <label>Details:</label>
                            <pre class="log-details-pre">${JSON.stringify(log.details, null, 2)}</pre>
                        </div>
                        <div class="detail-item">
                            <label>IP Address:</label>
                            <span>${log.ipAddress || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <label>User Agent:</label>
                            <pre class="user-agent">${log.userAgent || 'N/A'}</pre>
                        </div>
                        <div class="detail-item">
                            <label>Severity:</label>
                            <span class="severity-badge ${log.severity || 'low'}">
                                ${(log.severity || 'low').toUpperCase()}
                            </span>
                        </div>
                        <div class="detail-item">
                            <label>Log ID:</label>
                            <code>${log.id}</code>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="this.closest('.modal').remove()">
                        Close
                    </button>
                    <button class="btn btn-primary export-log-btn" data-log-id="${log.id}">
                        <i class="fas fa-download"></i> Export This Log
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

        // Export button
        modal.querySelector('.export-log-btn').addEventListener('click', async () => {
            await this.exportSingleLog(logId);
        });
    }

    // Log an action
    async logAction(action, details = {}, severity = 'low') {
        try {
            const user = getCurrentUser();
            const timestamp = new Date().toISOString();

            const logEntry = {
                action,
                details: typeof details === 'string' ? { message: details } : details,
                userId: user?.id,
                userName: user?.fullName,
                userRole: user?.isAdmin ? 'Admin' : 'Member',
                timestamp,
                ipAddress: await this.getIPAddress(),
                userAgent: navigator.userAgent,
                severity,
                source: 'frontend'
            };

            // Add to local logs immediately for UI responsiveness
            this.addLogToStore(logEntry);

            // Send to server if API is available
            if (typeof ApiService !== 'undefined') {
                await this.sendLogToServer(logEntry);
            }

            // Show notification for important actions
            if (this.isImportantAction(action)) {
                this.showLogNotification(logEntry);
            }

            // Update UI if on logs page
            if (document.getElementById('logsTableBody')) {
                this.renderAuditLogs();
            }

            return logEntry;

        } catch (error) {
            console.error('Failed to log action:', error);
            // Still add to local store even if server call fails
            const fallbackLog = {
                action,
                details,
                timestamp: new Date().toISOString(),
                userName: 'System',
                error: error.message
            };
            this.addLogToStore(fallbackLog);
        }
    }

    // Add log to local store
    addLogToStore(logEntry) {
        this.logs.unshift(logEntry);

        // Keep only maxLogs
        if (this.logs.length > this.config.maxLogs) {
            this.logs.pop();
        }
    }

    // Send log to server
    async sendLogToServer(logEntry) {
        try {
            await fetch(`${window.CONFIG?.API_URL || '/api'}/audit-logs`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(logEntry)
            });
        } catch (error) {
            console.warn('Failed to send log to server:', error);
            throw error;
        }
    }

    // Start real-time monitoring
    startRealtimeMonitoring() {
        if (this.isMonitoring) return;

        this.isMonitoring = true;

        // Try WebSocket first
        this.setupWebSocket();

        // Fallback polling
        this.startPolling();
    }

    // Setup WebSocket connection
    setupWebSocket() {
        // Check if WebSocket is supported and enabled
        if (!window.CONFIG?.FEATURES?.WEBSOCKETS) {
            console.log('WebSocket feature disabled in config');
            return;
        }

        const wsUrl = getWebSocketUrl();
        if (!wsUrl) {
            console.log('No WebSocket URL available');
            return;
        }

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('✅ Audit trail WebSocket connected');
                this.reconnectAttempts = 0;
                this.config.webSocketEnabled = true;

                // Authenticate
                const token = localStorage.getItem('psn_welfare_token');
                if (token) {
                    this.ws.send(JSON.stringify({
                        type: 'AUTH',
                        token: token
                    }));
                }

                // Subscribe to audit logs
                this.ws.send(JSON.stringify({
                    type: 'SUBSCRIBE',
                    channel: 'audit-logs'
                }));
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            this.ws.onclose = (event) => {
                console.log('WebSocket disconnected:', event.code, event.reason);
                this.config.webSocketEnabled = false;
                this.isMonitoring = false;

                // Attempt reconnect
                this.attemptWebSocketReconnect();
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.config.webSocketEnabled = false;
            };

        } catch (error) {
            console.error('WebSocket setup error:', error);
            this.config.webSocketEnabled = false;
        }
    }

    // Handle WebSocket message
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'NEW_AUDIT_LOG':
                this.handleNewLog(data.log);
                break;
            case 'BULK_AUDIT_LOGS':
                data.logs.forEach(log => this.handleNewLog(log));
                break;
            case 'SYSTEM_ALERT':
                this.handleSystemAlert(data.alert);
                break;
            case 'PONG':
                // Heartbeat response
                break;
        }
    }

    // Handle new log from WebSocket
    handleNewLog(log) {
        // Check if log already exists
        if (this.logs.some(existing => existing.id === log.id)) {
            return;
        }

        this.addLogToStore(log);

        // Show notification for important logs
        if (this.isImportantAction(log.action) || log.severity === 'high') {
            this.showLogNotification(log);
        }

        // Update UI if on logs page
        if (document.getElementById('logsTableBody')) {
            this.renderAuditLogs();
        }

        // Trigger event
        this.triggerEvent('newLog', log);
    }

    // Attempt WebSocket reconnect
    attemptWebSocketReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max WebSocket reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.config.reconnectDelay * this.reconnectAttempts;

        console.log(`Attempting WebSocket reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);

        setTimeout(() => {
            if (!this.isMonitoring) {
                this.setupWebSocket();
            }
        }, delay);
    }

    // Start polling as fallback
    startPolling() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.updateInterval = setInterval(async () => {
            if (!this.config.webSocketEnabled) {
                await this.checkForNewLogs();
            }
        }, this.config.pollingInterval);
    }

    // Check for new logs via polling
    async checkForNewLogs() {
        try {
            const response = await fetch(`${window.CONFIG?.API_URL || '/api'}/audit-logs/recent`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to fetch recent logs');

            const newLogs = await response.json();

            newLogs.forEach(log => {
                if (!this.logs.some(existing => existing.id === log.id)) {
                    this.handleNewLog(log);
                }
            });

        } catch (error) {
            console.error('Polling error:', error);
        }
    }

    // Setup page tracking
    setupPageTracking() {
        // Track page views
        let lastPage = '';

        const trackPageView = () => {
            const currentPage = window.location.pathname;
            if (currentPage !== lastPage) {
                this.logAction('PAGE_VIEW', {
                    page: currentPage,
                    referrer: document.referrer,
                    title: document.title
                }, 'low');
                lastPage = currentPage;
            }
        };

        // Initial page view
        window.addEventListener('load', trackPageView);

        // Track using History API
        const originalPushState = history.pushState;
        history.pushState = function (...args) {
            originalPushState.apply(this, args);
            setTimeout(trackPageView, 100);
        };

        // Track form submissions
        document.addEventListener('submit', (e) => {
            const form = e.target;
            if (form.id || form.name) {
                this.logAction('FORM_SUBMIT', {
                    formId: form.id,
                    formName: form.name,
                    action: form.action,
                    method: form.method
                }, 'medium');
            }
        });

        // Track important button clicks
        document.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (button && button.dataset.auditAction) {
                this.logAction(button.dataset.auditAction, {
                    buttonText: button.textContent.trim(),
                    buttonId: button.id,
                    buttonClass: button.className
                }, 'medium');
            }
        });
    }

    // Export audit logs
    async exportAuditLogs(format = 'csv', filters = {}) {
        try {
            showNotification('Exporting audit logs...', 'info');

            // Get logs with filters
            let logs = this.logs;
            if (Object.keys(filters).length > 0) {
                logs = this.filterLogs(logs, filters);
            }

            if (logs.length === 0) {
                showNotification('No logs to export', 'warning');
                return;
            }

            let content, filename, mimeType;

            switch (format.toLowerCase()) {
                case 'csv':
                    content = this.logsToCSV(logs);
                    filename = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
                    mimeType = 'text/csv';
                    break;

                case 'json':
                    content = JSON.stringify(logs, null, 2);
                    filename = `audit_logs_${new Date().toISOString().split('T')[0]}.json`;
                    mimeType = 'application/json';
                    break;

                default:
                    throw new Error(`Unsupported format: ${format}`);
            }

            this.downloadFile(content, filename, mimeType);

            // Log the export
            await this.logAction('AUDIT_LOGS_EXPORTED', {
                format: format,
                count: logs.length,
                filters: filters
            }, 'medium');

            showNotification(`Exported ${logs.length} audit logs as ${format.toUpperCase()}`, 'success');

        } catch (error) {
            console.error('Export error:', error);
            showNotification(`Export failed: ${error.message}`, 'error');
            throw error;
        }
    }

    // Export single log
    async exportSingleLog(logId) {
        const log = this.logs.find(l => l.id === logId);
        if (!log) {
            showNotification('Log not found', 'error');
            return;
        }

        const content = JSON.stringify(log, null, 2);
        const filename = `audit_log_${logId}_${new Date().toISOString().split('T')[0]}.json`;

        this.downloadFile(content, filename, 'application/json');

        // Log the export
        await this.logAction('SINGLE_LOG_EXPORTED', {
            logId: logId,
            action: log.action
        }, 'low');

        showNotification('Log exported successfully', 'success');
    }

    // Filter logs
    filterLogs(logs, filters) {
        return logs.filter(log => {
            let matches = true;

            if (filters.action && log.action !== filters.action) {
                matches = false;
            }

            if (filters.userId && log.userId !== filters.userId) {
                matches = false;
            }

            if (filters.startDate) {
                const logDate = new Date(log.timestamp);
                const startDate = new Date(filters.startDate);
                if (logDate < startDate) matches = false;
            }

            if (filters.endDate) {
                const logDate = new Date(log.timestamp);
                const endDate = new Date(filters.endDate);
                if (logDate > endDate) matches = false;
            }

            if (filters.severity && log.severity !== filters.severity) {
                matches = false;
            }

            return matches;
        });
    }

    // Helper methods
    logsToCSV(logs) {
        const headers = ['Timestamp', 'User', 'Action', 'Entity', 'Entity ID', 'Details', 'IP Address', 'Severity'];

        const rows = logs.map(log => [
            `"${this.formatTimestamp(log.timestamp)}"`,
            `"${log.userName || 'System'}"`,
            `"${log.action}"`,
            `"${log.entityType || ''}"`,
            `"${log.entityId || ''}"`,
            `"${JSON.stringify(log.details).replace(/"/g, '""')}"`,
            `"${log.ipAddress || ''}"`,
            `"${log.severity || 'low'}"`
        ]);

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    formatTimestamp(timestamp) {
        try {
            return new Date(timestamp).toLocaleString('en-NG', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch (error) {
            return timestamp;
        }
    }

    getRelativeTime(timestamp) {
        try {
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
        } catch (error) {
            return 'Unknown';
        }
    }

    formatAction(action) {
        return action.replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    getActionClass(action) {
        const classes = {
            'CREATE': 'badge-success',
            'UPDATE': 'badge-info',
            'DELETE': 'badge-danger',
            'LOGIN': 'badge-primary',
            'LOGOUT': 'badge-secondary',
            'EXPORT': 'badge-warning',
            'VIEW': 'badge-light',
            'ERROR': 'badge-dark'
        };
        return classes[action] || 'badge-secondary';
    }

    formatDetails(details) {
        if (!details) return 'No details';
        if (typeof details === 'string') return details;

        try {
            const str = JSON.stringify(details);
            return str.length > 100 ? str.substring(0, 100) + '...' : str;
        } catch (error) {
            return 'Invalid details';
        }
    }

    truncateString(str, maxLength) {
        if (!str) return '';
        return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
    }

    isImportantAction(action) {
        const importantActions = ['DELETE', 'ERROR', 'SECURITY_BREACH', 'ADMIN_ACTION', 'EXPORT'];
        return importantActions.includes(action);
    }

    canExportLog(log) {
        return log.action !== 'SECURITY_BREACH' && log.severity !== 'critical';
    }

    showLogNotification(log) {
        const notification = {
            title: this.formatAction(log.action),
            message: `${log.userName || 'System'} - ${this.formatDetails(log.details)}`,
            timestamp: this.getRelativeTime(log.timestamp),
            type: log.severity === 'high' || log.action === 'ERROR' ? 'error' :
                log.severity === 'medium' ? 'warning' : 'info',
            logId: log.id
        };

        // Show toast notification
        showNotification(`${notification.title}: ${notification.message}`, notification.type);

        // Add to activity feed if exists
        this.addToActivityFeed(notification);
    }

    addToActivityFeed(notification) {
        const feed = document.getElementById('activityFeed');
        if (!feed) return;

        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <div class="activity-icon ${notification.type}">
                <i class="fas fa-${notification.type === 'error' ? 'exclamation-triangle' :
                notification.type === 'warning' ? 'exclamation-circle' : 'info-circle'}"></i>
            </div>
            <div class="activity-content">
                <p class="activity-text">
                    <strong>${notification.title}</strong><br>
                    ${notification.message}
                </p>
                <p class="activity-time">${notification.timestamp}</p>
            </div>
            <button class="activity-action view-log" data-log-id="${notification.logId}" title="View Log">
                <i class="fas fa-arrow-right"></i>
            </button>
        `;

        feed.insertBefore(activityItem, feed.firstChild);

        // Limit to 10 items
        if (feed.children.length > 10) {
            feed.removeChild(feed.lastChild);
        }

        // Add click event to view log
        activityItem.querySelector('.view-log').addEventListener('click', () => {
            this.showLogDetails(notification.logId);
        });
    }

    async getIPAddress() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'Unknown';
        }
    }

    downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        setTimeout(() => {
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 100);
    }

    handleSystemAlert(alert) {
        console.log('System alert:', alert);
        showNotification(alert.message, alert.severity === 'critical' ? 'error' : 'warning');
    }

    // Event handling system
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

    // Cleanup
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close();
        }

        this.isMonitoring = false;
        this.messageHandlers.clear();

        console.log('Audit trail destroyed');
    }
}

// Create global audit logger instance
const AuditLogger = new AuditTrail();

// Export for use in other modules
window.AuditLogger = AuditLogger;

// Auto-initialize on admin pages
if (window.location.pathname.includes('admin.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        // AuditLogger will auto-initialize
    });
}

// Add audit trail styles
const auditStyles = `
    <style>
        .action-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .badge-success { background: #d4edda; color: #155724; }
        .badge-info { background: #d1ecf1; color: #0c5460; }
        .badge-warning { background: #fff3cd; color: #856404; }
        .badge-danger { background: #f8d7da; color: #721c24; }
        .badge-primary { background: #cce5ff; color: #004085; }
        .badge-secondary { background: #e2e3e5; color: #383d41; }
        .badge-light { background: #fefefe; color: #818182; }
        .badge-dark { background: #d6d8d9; color: #1b1e21; }
        
        .timestamp-cell {
            display: flex;
            flex-direction: column;
        }
        
        .timestamp {
            font-weight: 600;
        }
        
        .log-details {
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .log-details-pre {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            max-height: 200px;
            overflow: auto;
            font-family: 'Courier New', monospace;
            font-size: 12px;
        }
        
        .log-detail-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }
        
        .detail-item {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .detail-item label {
            font-weight: 600;
            color: #6c757d;
            font-size: 14px;
        }
        
        .severity-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
        }
        
        .severity-badge.high { background: #f8d7da; color: #721c24; }
        .severity-badge.medium { background: #fff3cd; color: #856404; }
        .severity-badge.low { background: #d4edda; color: #155724; }
        
        .log-actions {
            display: flex;
            gap: 5px;
        }
        
        .activity-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            border-bottom: 1px solid #e9ecef;
        }
        
        .activity-item:last-child {
            border-bottom: none;
        }
        
        .activity-icon {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
        }
        
        .activity-icon.info { background: #d1ecf1; color: #0c5460; }
        .activity-icon.warning { background: #fff3cd; color: #856404; }
        .activity-icon.error { background: #f8d7da; color: #721c24; }
        
        .activity-content {
            flex: 1;
        }
        
        .activity-text {
            margin: 0;
            font-size: 14px;
        }
        
        .activity-time {
            margin: 4px 0 0 0;
            font-size: 12px;
            color: #6c757d;
        }
        
        .activity-action {
            background: none;
            border: none;
            color: #6c757d;
            cursor: pointer;
            padding: 5px;
            border-radius: 4px;
        }
        
        .activity-action:hover {
            background: #f8f9fa;
            color: #495057;
        }
        
        .user-agent {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            background: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            max-height: 100px;
            overflow: auto;
        }
    </style>
`;

// Add styles to document
document.head.insertAdjacentHTML('beforeend', auditStyles);