/**
 * Backup System for PSN Welfare Registry - Vercel Compatible
 */

class BackupManager {
    constructor() {
        this.backups = [];
        this.autoBackupInterval = null;
        this.isProcessing = false;

        // Configuration
        this.config = {
            autoBackup: true,
            frequency: 'daily', // daily, weekly, monthly
            retentionDays: 30,
            backupLocation: 'server', // server, cloud, both
            maxBackups: 10,
            compressionLevel: 'medium' // low, medium, high
        };

        // Initialize
        this.initialize();
    }

    // Initialize backup system
    async initialize() {
        try {
            console.log('💾 Initializing backup system...');

            // Load settings
            await this.loadBackupSettings();

            // Load existing backups
            await this.loadBackups();

            // Setup auto-backup
            this.setupAutoBackup();

            // Setup UI
            this.setupBackupUI();

            console.log('✅ Backup system initialized');

            // Log initialization
            await this.logBackupAction('BACKUP_SYSTEM_INITIALIZED', {
                config: this.config
            });

        } catch (error) {
            console.error('❌ Backup system initialization failed:', error);
            showNotification('Failed to initialize backup system', 'error');
        }
    }

    // Load backup settings
    async loadBackupSettings() {
        try {
            if (typeof ApiService !== 'undefined') {
                const response = await ApiService.getSystemSettings();
                if (response.backupSettings) {
                    this.config = { ...this.config, ...response.backupSettings };
                }
            }

            // Apply settings from localStorage for demo
            const savedSettings = localStorage.getItem('backup_settings');
            if (savedSettings) {
                try {
                    const parsed = JSON.parse(savedSettings);
                    this.config = { ...this.config, ...parsed };
                } catch (e) {
                    console.warn('Failed to parse saved backup settings');
                }
            }

        } catch (error) {
            console.warn('Failed to load backup settings:', error);
        }
    }

    // Save backup settings
    async saveBackupSettings() {
        try {
            localStorage.setItem('backup_settings', JSON.stringify(this.config));

            if (typeof ApiService !== 'undefined') {
                await ApiService.updateSystemSettings({
                    backupSettings: this.config
                });
            }

            showNotification('Backup settings saved', 'success');

        } catch (error) {
            console.error('Failed to save backup settings:', error);
            showNotification('Failed to save settings', 'error');
        }
    }

    // Load existing backups
    async loadBackups() {
        try {
            console.log('📥 Loading backups...');

            if (typeof ApiService !== 'undefined') {
                const response = await ApiService.getBackups();
                this.backups = response.data || [];
            } else {
                // Fallback to mock data for demo
                this.backups = this.generateMockBackups(5);
            }

            // Sort by creation date (newest first)
            this.backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            this.renderBackupList();

            // Update last backup display
            this.updateLastBackupDisplay();

        } catch (error) {
            console.error('Error loading backups:', error);
            showNotification('Failed to load backups', 'error');
            this.backups = [];
        }
    }

    // Generate mock backups for demo
    generateMockBackups(count) {
        const backups = [];
        const types = ['full', 'incremental'];
        const statuses = ['completed', 'failed', 'processing'];

        for (let i = 0; i < count; i++) {
            const daysAgo = i * 3;
            const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
            const type = types[Math.floor(Math.random() * types.length)];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const size = Math.floor(Math.random() * 1000000) + 100000;

            backups.push({
                id: `backup_${createdAt.getTime()}`,
                name: `Backup_${createdAt.toISOString().split('T')[0]}`,
                createdAt: createdAt.toISOString(),
                updatedAt: createdAt.toISOString(),
                type: type,
                status: status,
                size: size,
                format: 'zip',
                location: 'server',
                notes: `${type === 'full' ? 'Full system backup' : 'Incremental backup'}`,
                error: status === 'failed' ? 'Storage quota exceeded' : null
            });
        }

        return backups;
    }

    // Create new backup
    async createBackup(manual = false, options = {}) {
        if (this.isProcessing) {
            showNotification('Another backup operation is in progress', 'warning');
            return;
        }

        this.isProcessing = true;

        try {
            const backupName = options.name ||
                `Backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;

            showNotification('Creating backup...', 'info');

            // Create backup object
            const backupData = {
                name: backupName,
                type: options.type || 'full',
                notes: options.notes || (manual ? 'Manual backup' : 'Auto backup'),
                compression: options.compression || this.config.compressionLevel,
                location: options.location || this.config.backupLocation
            };

            let backupResult;

            if (typeof ApiService !== 'undefined') {
                backupResult = await ApiService.createBackup(backupData);
            } else {
                // Mock backup creation for demo
                backupResult = await this.mockCreateBackup(backupData);
            }

            // Add to backups list
            if (backupResult.success) {
                const newBackup = {
                    id: backupResult.backupId || `backup_${Date.now()}`,
                    name: backupData.name,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    type: backupData.type,
                    status: 'completed',
                    size: backupResult.size || 0,
                    format: 'zip',
                    location: backupData.location,
                    notes: backupData.notes,
                    downloadUrl: backupResult.downloadUrl
                };

                this.backups.unshift(newBackup);

                // Enforce max backups limit
                if (this.backups.length > this.config.maxBackups) {
                    this.backups = this.backups.slice(0, this.config.maxBackups);
                }

                this.renderBackupList();
                this.updateLastBackupDisplay();

                // Log backup creation
                await this.logBackupAction('BACKUP_CREATED', {
                    backupId: newBackup.id,
                    backupName: newBackup.name,
                    type: newBackup.type,
                    size: newBackup.size,
                    manual: manual
                });

                showNotification('Backup created successfully', 'success');
            }

            return backupResult;

        } catch (error) {
            console.error('Backup creation error:', error);

            // Log backup failure
            await this.logBackupAction('BACKUP_FAILED', {
                error: error.message,
                manual: manual
            });

            showNotification(`Backup failed: ${error.message}`, 'error');
            throw error;

        } finally {
            this.isProcessing = false;
        }
    }

    // Mock backup creation for demo
    async mockCreateBackup(backupData) {
        // Simulate backup process
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const success = Math.random() > 0.1; // 90% success rate

                if (success) {
                    resolve({
                        success: true,
                        backupId: `backup_${Date.now()}`,
                        size: Math.floor(Math.random() * 5000000) + 1000000,
                        message: 'Backup created successfully'
                    });
                } else {
                    reject(new Error('Mock backup creation failed'));
                }
            }, 3000);
        });
    }

    // Restore from backup
    async restoreBackup(backupId, options = {}) {
        if (!confirm('Are you sure you want to restore this backup? This will overwrite current data.')) {
            return;
        }

        if (this.isProcessing) {
            showNotification('Another operation is in progress', 'warning');
            return;
        }

        this.isProcessing = true;

        try {
            const backup = this.backups.find(b => b.id === backupId);
            if (!backup) {
                throw new Error('Backup not found');
            }

            if (backup.status !== 'completed') {
                throw new Error('Cannot restore incomplete backup');
            }

            showNotification('Restoring backup...', 'info');

            let restoreResult;

            if (typeof ApiService !== 'undefined') {
                restoreResult = await ApiService.restoreBackup(backupId, options);
            } else {
                // Mock restore for demo
                restoreResult = await this.mockRestoreBackup(backupId);
            }

            if (restoreResult.success) {
                // Log restoration
                await this.logBackupAction('BACKUP_RESTORED', {
                    backupId: backupId,
                    backupName: backup.name,
                    timestamp: new Date().toISOString()
                });

                showNotification('Backup restored successfully', 'success');

                // Reload page after delay
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }

            return restoreResult;

        } catch (error) {
            console.error('Backup restoration error:', error);

            // Log restoration failure
            await this.logBackupAction('BACKUP_RESTORE_FAILED', {
                backupId: backupId,
                error: error.message
            });

            showNotification(`Restore failed: ${error.message}`, 'error');
            throw error;

        } finally {
            this.isProcessing = false;
        }
    }

    // Mock restore for demo
    async mockRestoreBackup(backupId) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const success = Math.random() > 0.2; // 80% success rate

                if (success) {
                    resolve({
                        success: true,
                        message: 'Backup restored successfully'
                    });
                } else {
                    reject(new Error('Mock restore failed'));
                }
            }, 4000);
        });
    }

    // Delete backup
    async deleteBackup(backupId) {
        if (!confirm('Are you sure you want to delete this backup?')) {
            return;
        }

        try {
            showNotification('Deleting backup...', 'info');

            if (typeof ApiService !== 'undefined') {
                await fetch(`${window.CONFIG?.API_URL || '/api'}/admin/backup/${backupId}`, {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                });
            }

            // Remove from local list
            const index = this.backups.findIndex(b => b.id === backupId);
            if (index !== -1) {
                const deletedBackup = this.backups[index];
                this.backups.splice(index, 1);

                this.renderBackupList();

                // Log deletion
                await this.logBackupAction('BACKUP_DELETED', {
                    backupId: backupId,
                    backupName: deletedBackup.name,
                    size: deletedBackup.size
                });

                showNotification('Backup deleted successfully', 'success');
            }

        } catch (error) {
            console.error('Backup deletion error:', error);
            showNotification(`Delete failed: ${error.message}`, 'error');
        }
    }

    // Export backup
    async exportBackup(backupId, format = 'zip') {
        try {
            showNotification('Exporting backup...', 'info');

            if (typeof ApiService !== 'undefined') {
                const response = await fetch(
                    `${window.CONFIG?.API_URL || '/api'}/admin/backup/${backupId}/export?format=${format}`,
                    {
                        headers: getAuthHeaders()
                    }
                );

                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(error.message || 'Export failed');
                }

                const blob = await response.blob();
                const backup = this.backups.find(b => b.id === backupId);
                const filename = backup ?
                    `${backup.name}_${new Date().toISOString().split('T')[0]}.${format}` :
                    `backup_${backupId}_${new Date().toISOString().split('T')[0]}.${format}`;

                this.downloadFile(blob, filename);

            } else {
                // Mock export for demo
                const backup = this.backups.find(b => b.id === backupId);
                const content = JSON.stringify(backup, null, 2);
                const filename = `${backup?.name || 'backup'}_${new Date().toISOString().split('T')[0]}.json`;

                this.downloadTextFile(content, filename, 'application/json');
            }

            // Log export
            await this.logBackupAction('BACKUP_EXPORTED', {
                backupId: backupId,
                format: format
            });

            showNotification('Backup exported successfully', 'success');

        } catch (error) {
            console.error('Backup export error:', error);
            showNotification(`Export failed: ${error.message}`, 'error');
        }
    }

    // Setup auto-backup schedule
    setupAutoBackup() {
        if (!this.config.autoBackup) {
            console.log('Auto-backup disabled');
            return;
        }

        // Clear existing interval
        if (this.autoBackupInterval) {
            clearInterval(this.autoBackupInterval);
            this.autoBackupInterval = null;
        }

        // Calculate interval based on frequency
        let interval;
        switch (this.config.frequency) {
            case 'daily':
                interval = 24 * 60 * 60 * 1000; // 24 hours
                break;
            case 'weekly':
                interval = 7 * 24 * 60 * 60 * 1000; // 7 days
                break;
            case 'monthly':
                interval = 30 * 24 * 60 * 60 * 1000; // 30 days
                break;
            default:
                interval = 24 * 60 * 60 * 1000;
        }

        // Schedule auto-backup
        this.autoBackupInterval = setInterval(async () => {
            try {
                console.log('🔄 Auto-backup triggered');
                await this.createBackup(false, {
                    type: 'incremental',
                    notes: 'Automatic scheduled backup'
                });
            } catch (error) {
                console.error('Auto-backup failed:', error);
            }
        }, interval);

        console.log(`Auto-backup scheduled: ${this.config.frequency} (every ${interval / (1000 * 60 * 60)} hours)`);
    }

    // Setup backup UI
    setupBackupUI() {
        // Update UI elements
        this.updateUIFromConfig();

        // Setup event listeners
        this.setupEventListeners();
    }

    // Update UI from config
    updateUIFromConfig() {
        // Update last backup display
        this.updateLastBackupDisplay();

        // Update settings form if exists
        const frequencySelect = document.getElementById('backupFrequency');
        const autoBackupCheckbox = document.getElementById('autoBackup');
        const retentionInput = document.getElementById('retentionDays');
        const compressionSelect = document.getElementById('compressionLevel');
        const maxBackupsInput = document.getElementById('maxBackups');

        if (frequencySelect) frequencySelect.value = this.config.frequency;
        if (autoBackupCheckbox) autoBackupCheckbox.checked = this.config.autoBackup;
        if (retentionInput) retentionInput.value = this.config.retentionDays;
        if (compressionSelect) compressionSelect.value = this.config.compressionLevel;
        if (maxBackupsInput) maxBackupsInput.value = this.config.maxBackups;
    }

    // Update last backup display
    updateLastBackupDisplay() {
        if (this.backups.length > 0) {
            const latestBackup = this.backups[0];
            const lastBackupElement = document.getElementById('lastBackup');
            const lastBackupSizeElement = document.getElementById('lastBackupSize');
            const backupHealthElement = document.getElementById('backupHealth');

            if (lastBackupElement) {
                lastBackupElement.textContent = this.formatDateTime(latestBackup.createdAt);
            }

            if (lastBackupSizeElement) {
                lastBackupSizeElement.textContent = this.formatSize(latestBackup.size);
            }

            if (backupHealthElement) {
                const daysSince = Math.floor((new Date() - new Date(latestBackup.createdAt)) / (1000 * 60 * 60 * 24));

                if (daysSince <= 1) {
                    backupHealthElement.innerHTML = '<span class="status-badge status-success">Excellent</span>';
                } else if (daysSince <= 3) {
                    backupHealthElement.innerHTML = '<span class="status-badge status-warning">Good</span>';
                } else if (daysSince <= 7) {
                    backupHealthElement.innerHTML = '<span class="status-badge status-warning">Fair</span>';
                } else {
                    backupHealthElement.innerHTML = '<span class="status-badge status-error">Poor</span>';
                }
            }
        }
    }

    // Render backup list
    renderBackupList() {
        const container = document.getElementById('backupList');
        if (!container) return;

        container.innerHTML = '';

        if (this.backups.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-database"></i>
                    <h3>No backups found</h3>
                    <p>Create your first backup to protect your data</p>
                    <button class="btn btn-primary" onclick="BackupSystem.createBackup(true)">
                        <i class="fas fa-plus"></i> Create First Backup
                    </button>
                </div>
            `;
            return;
        }

        this.backups.forEach(backup => {
            const backupCard = document.createElement('div');
            backupCard.className = 'backup-card';
            backupCard.dataset.backupId = backup.id;

            const daysOld = Math.floor((new Date() - new Date(backup.createdAt)) / (1000 * 60 * 60 * 24));
            const statusClass = backup.status === 'completed' ? 'status-success' :
                backup.status === 'processing' ? 'status-warning' : 'status-error';

            backupCard.innerHTML = `
                <div class="backup-header">
                    <div class="backup-title">
                        <h4>${backup.name}</h4>
                        <span class="backup-type ${backup.type === 'full' ? 'full-backup' : 'incremental-backup'}">
                            ${backup.type === 'full' ? 'Full' : 'Incremental'}
                        </span>
                    </div>
                    <div class="backup-meta">
                        <span class="backup-size">${this.formatSize(backup.size)}</span>
                        <span class="backup-status ${statusClass}">
                            ${backup.status.charAt(0).toUpperCase() + backup.status.slice(1)}
                        </span>
                    </div>
                </div>
                <div class="backup-details">
                    <div class="detail-item">
                        <i class="fas fa-calendar"></i>
                        <span>Created: ${this.formatDateTime(backup.createdAt)}</span>
                        <small>(${daysOld} ${daysOld === 1 ? 'day' : 'days'} ago)</small>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-hdd"></i>
                        <span>Location: ${backup.location || 'Server'}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-file-archive"></i>
                        <span>Format: ${backup.format || 'ZIP'}</span>
                    </div>
                    ${backup.notes ? `
                    <div class="detail-item">
                        <i class="fas fa-sticky-note"></i>
                        <span>Notes: ${backup.notes}</span>
                    </div>
                    ` : ''}
                    ${backup.error ? `
                    <div class="detail-item error">
                        <i class="fas fa-exclamation-circle"></i>
                        <span>Error: ${backup.error}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="backup-actions">
                    ${backup.status === 'completed' ? `
                    <button class="btn btn-outline btn-sm restore-backup" 
                            data-backup-id="${backup.id}"
                            title="Restore Backup">
                        <i class="fas fa-undo"></i> Restore
                    </button>
                    <button class="btn btn-outline btn-sm export-backup" 
                            data-backup-id="${backup.id}"
                            title="Export Backup">
                        <i class="fas fa-download"></i> Export
                    </button>
                    ` : ''}
                    <button class="btn btn-outline btn-sm btn-danger delete-backup" 
                            data-backup-id="${backup.id}"
                            title="Delete Backup">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            `;

            container.appendChild(backupCard);
        });

        // Add event listeners
        this.attachBackupCardListeners();
    }

    // Attach event listeners to backup cards
    attachBackupCardListeners() {
        // Restore backup
        document.querySelectorAll('.restore-backup').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const backupId = e.currentTarget.dataset.backupId;
                this.restoreBackup(backupId);
            });
        });

        // Export backup
        document.querySelectorAll('.export-backup').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const backupId = e.currentTarget.dataset.backupId;
                this.exportBackup(backupId);
            });
        });

        // Delete backup
        document.querySelectorAll('.delete-backup').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const backupId = e.currentTarget.dataset.backupId;
                this.deleteBackup(backupId);
            });
        });
    }

    // Setup event listeners
    setupEventListeners() {
        // Backup now button
        const backupNowBtn = document.getElementById('backupNowBtn');
        if (backupNowBtn) {
            backupNowBtn.addEventListener('click', () => this.createBackup(true));
        }

        // Restore latest button
        const restoreBackupBtn = document.getElementById('restoreBackupBtn');
        if (restoreBackupBtn) {
            restoreBackupBtn.addEventListener('click', () => {
                if (this.backups.length > 0) {
                    this.restoreBackup(this.backups[0].id);
                }
            });
        }

        // Export all data button
        const exportAllDataBtn = document.getElementById('exportAllDataBtn');
        if (exportAllDataBtn) {
            exportAllDataBtn.addEventListener('click', () => this.exportAllData());
        }

        // Settings form
        const settingsForm = document.getElementById('backupSettingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSettingsFromForm();
            });
        }

        // Backup frequency selector
        const backupFrequency = document.getElementById('backupFrequency');
        if (backupFrequency) {
            backupFrequency.addEventListener('change', (e) => {
                this.config.frequency = e.target.value;
                this.setupAutoBackup();
            });
        }

        // Auto backup checkbox
        const autoBackupCheckbox = document.getElementById('autoBackup');
        if (autoBackupCheckbox) {
            autoBackupCheckbox.addEventListener('change', (e) => {
                this.config.autoBackup = e.target.checked;
                this.setupAutoBackup();
            });
        }

        // Clean old backups button
        const cleanBackupsBtn = document.getElementById('cleanBackupsBtn');
        if (cleanBackupsBtn) {
            cleanBackupsBtn.addEventListener('click', () => this.cleanOldBackups());
        }
    }

    // Save settings from form
    async saveSettingsFromForm() {
        try {
            const form = document.getElementById('backupSettingsForm');
            if (!form) return;

            const formData = new FormData(form);

            this.config = {
                ...this.config,
                frequency: formData.get('frequency') || 'daily',
                autoBackup: formData.get('autoBackup') === 'on',
                retentionDays: parseInt(formData.get('retentionDays')) || 30,
                compressionLevel: formData.get('compressionLevel') || 'medium',
                maxBackups: parseInt(formData.get('maxBackups')) || 10,
                backupLocation: formData.get('backupLocation') || 'server'
            };

            await this.saveBackupSettings();

        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    // Export all data
    async exportAllData(format = 'json') {
        try {
            showNotification('Exporting all data...', 'info');

            if (typeof ApiService !== 'undefined') {
                await ApiService.exportData(format);
            } else {
                // Mock export for demo
                const exportData = {
                    timestamp: new Date().toISOString(),
                    type: 'full_export',
                    data: {
                        members: [],
                        specialDates: [],
                        nextOfKin: [],
                        backups: this.backups
                    }
                };

                const content = JSON.stringify(exportData, null, 2);
                const filename = `psn_welfare_full_export_${new Date().toISOString().split('T')[0]}.${format}`;

                this.downloadTextFile(content, filename, 'application/json');
            }

            // Log export
            await this.logBackupAction('FULL_DATA_EXPORT', {
                format: format,
                timestamp: new Date().toISOString()
            });

            showNotification('Data exported successfully', 'success');

        } catch (error) {
            console.error('Full export error:', error);
            showNotification(`Export failed: ${error.message}`, 'error');
        }
    }

    // Clean old backups
    async cleanOldBackups() {
        if (!confirm('Clean backups older than retention period?')) {
            return;
        }

        try {
            showNotification('Cleaning old backups...', 'info');

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

            const oldBackups = this.backups.filter(backup => {
                return new Date(backup.createdAt) < cutoffDate;
            });

            if (oldBackups.length === 0) {
                showNotification('No old backups to clean', 'info');
                return;
            }

            // Delete old backups
            for (const backup of oldBackups) {
                await this.deleteBackup(backup.id);
            }

            showNotification(`Cleaned ${oldBackups.length} old backups`, 'success');

        } catch (error) {
            console.error('Error cleaning backups:', error);
            showNotification(`Cleanup failed: ${error.message}`, 'error');
        }
    }

    // Log backup action
    async logBackupAction(action, details = {}) {
        try {
            if (typeof AuditLogger !== 'undefined') {
                await AuditLogger.logAction(action, details, 'medium');
            }
        } catch (error) {
            console.warn('Failed to log backup action:', error);
        }
    }

    // Helper: Format file size
    formatSize(bytes) {
        if (bytes === 0 || !bytes) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
                minute: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    }

    // Helper: Download file
    downloadFile(blob, filename) {
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

    // Helper: Download text file
    downloadTextFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        this.downloadFile(blob, filename);
    }

    // Get backup health status
    getBackupHealth() {
        if (this.backups.length === 0) {
            return {
                status: 'critical',
                message: 'No backups found',
                lastBackup: null,
                daysSinceLast: null
            };
        }

        const latestBackup = this.backups[0];
        const daysSince = Math.floor((new Date() - new Date(latestBackup.createdAt)) / (1000 * 60 * 60 * 24));

        let status, message;

        if (daysSince <= 1) {
            status = 'excellent';
            message = 'Backups are up to date';
        } else if (daysSince <= 3) {
            status = 'good';
            message = 'Recent backup exists';
        } else if (daysSince <= 7) {
            status = 'fair';
            message = 'Backup is getting old';
        } else {
            status = 'poor';
            message = 'Backup is outdated';
        }

        if (latestBackup.status !== 'completed') {
            status = 'critical';
            message = 'Last backup failed';
        }

        return {
            status,
            message,
            lastBackup: latestBackup.createdAt,
            daysSinceLast: daysSince,
            backupCount: this.backups.length
        };
    }

    // Get backup statistics
    getBackupStats() {
        const totalSize = this.backups.reduce((sum, backup) => sum + (backup.size || 0), 0);
        const completedBackups = this.backups.filter(b => b.status === 'completed').length;
        const failedBackups = this.backups.filter(b => b.status === 'failed').length;

        return {
            totalBackups: this.backups.length,
            completedBackups,
            failedBackups,
            totalSize: this.formatSize(totalSize),
            averageSize: this.formatSize(totalSize / this.backups.length || 0),
            health: this.getBackupHealth()
        };
    }
}

// Create global backup manager instance
const BackupSystem = new BackupManager();

// Export for use in other modules
window.BackupSystem = BackupSystem;

// Add backup styles
const backupStyles = `
    <style>
        .backup-card {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            transition: box-shadow 0.2s;
        }
        
        .backup-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .backup-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .backup-title {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        .backup-title h4 {
            margin: 0;
            font-size: 1.1rem;
            color: #2c3e50;
        }
        
        .backup-type {
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        
        .full-backup {
            background: #e8f4fd;
            color: #3498db;
        }
        
        .incremental-backup {
            background: #e8f6f3;
            color: #27ae60;
        }
        
        .backup-meta {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .backup-size {
            background: #f8f9fa;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.9rem;
            color: #6c757d;
        }
        
        .backup-status {
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.85rem;
            font-weight: 600;
        }
        
        .backup-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            margin-bottom: 20px;
            font-size: 0.9rem;
        }
        
        .detail-item {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #495057;
        }
        
        .detail-item i {
            width: 16px;
            color: #6c757d;
        }
        
        .detail-item.error {
            color: #e74c3c;
        }
        
        .detail-item.error i {
            color: #e74c3c;
        }
        
        .backup-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        .backup-health-indicator {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .health-excellent {
            background: #d4edda;
            border-left: 4px solid #28a745;
        }
        
        .health-good {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
        }
        
        .health-fair {
            background: #ffeaa7;
            border-left: 4px solid #f39c12;
        }
        
        .health-poor {
            background: #f8d7da;
            border-left: 4px solid #dc3545;
        }
        
        .health-critical {
            background: #f5b7b1;
            border-left: 4px solid #e74c3c;
        }
        
        .backup-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .stat-card {
            background: white;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #e9ecef;
        }
        
        .stat-card h3 {
            margin: 0 0 5px 0;
            font-size: 1.8rem;
            color: #2c5aa0;
        }
        
        .stat-card p {
            margin: 0;
            color: #6c757d;
            font-size: 0.9rem;
        }
        
        .settings-section {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid #e9ecef;
        }
        
        .settings-section h3 {
            margin: 0 0 20px 0;
            color: #2c3e50;
        }
        
        .settings-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #495057;
        }
        
        .form-group input,
        .form-group select {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ced4da;
            border-radius: 4px;
            font-size: 0.95rem;
        }
        
        .form-group input:focus,
        .form-group select:focus {
            outline: none;
            border-color: #2c5aa0;
            box-shadow: 0 0 0 0.2rem rgba(44, 90, 160, 0.25);
        }
        
        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .checkbox-group input {
            width: auto;
        }
    </style>
`;

// Add styles to document
document.head.insertAdjacentHTML('beforeend', backupStyles);