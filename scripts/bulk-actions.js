/**
 * Bulk Actions Module for PSN Welfare Registry - Vercel Compatible
 */

class BulkActionsManager {
    constructor() {
        this.selectedMembers = new Set();
        this.isProcessing = false;
        this.progress = {
            current: 0,
            total: 0,
            message: '',
            success: 0,
            failed: 0
        };

        // Email templates
        this.emailTemplates = {
            welcome: {
                name: 'Welcome Email',
                subject: 'Welcome to PSN Taraba Welfare Registry',
                body: `Dear {name},

Welcome to the Pharmaceutical Society of Nigeria, Taraba State Chapter Welfare Registry.

Your account has been created successfully:
- PSN Number: {psnNumber}
- Login Email: {email}

Please login to update your profile and add special dates for automated reminders.

Best regards,
PSN Taraba Welfare Team`,
                variables: ['name', 'psnNumber', 'email']
            },
            announcement: {
                name: 'Announcement',
                subject: 'Important Announcement from PSN Taraba',
                body: `Dear {name},

{announcement}

Best regards,
PSN Taraba Executive Council`,
                variables: ['name', 'announcement']
            },
            reminder: {
                name: 'Profile Reminder',
                subject: 'Reminder: Update Your Profile',
                body: `Dear {name},

This is a reminder to update your profile information in the PSN Welfare Registry.

Please ensure your contact details and next-of-kin information are up to date.

Best regards,
PSN Taraba Welfare Team`,
                variables: ['name']
            },
            event: {
                name: 'Event Invitation',
                subject: 'Upcoming PSN Taraba Event',
                body: `Dear {name},

You are invited to our upcoming event:
Event: {eventName}
Date: {eventDate}
Time: {eventTime}
Venue: {eventVenue}

We look forward to your participation.

Best regards,
PSN Taraba Events Committee`,
                variables: ['name', 'eventName', 'eventDate', 'eventTime', 'eventVenue']
            }
        };

        // Initialize
        this.initialize();
    }

    // Initialize bulk actions manager
    initialize() {
        console.log('⚡ Initializing bulk actions manager...');

        // Setup UI
        this.setupUI();

        // Setup event listeners
        this.setupEventListeners();

        console.log('✅ Bulk actions manager initialized');
    }

    // Setup UI elements
    setupUI() {
        // Create progress modal if it doesn't exist
        if (!document.getElementById('bulkProgressModal')) {
            this.createProgressModal();
        }

        // Create email template modal if it doesn't exist
        if (!document.getElementById('emailTemplateModal')) {
            this.createEmailTemplateModal();
        }
    }

    // Create progress modal
    createProgressModal() {
        const modal = document.createElement('div');
        modal.id = 'bulkProgressModal';
        modal.className = 'modal';
        modal.style.display = 'none';

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Bulk Action Progress</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="progress-container">
                        <div class="progress-header">
                            <h4 id="progressTitle">Processing...</h4>
                            <p id="progressMessage">Initializing bulk action</p>
                        </div>
                        
                        <div class="progress-bar-container">
                            <div class="progress-bar">
                                <div class="progress-fill" id="progressFill" style="width: 0%"></div>
                            </div>
                            <div class="progress-text">
                                <span id="progressPercentage">0%</span>
                                <span id="progressCount">(0/0)</span>
                            </div>
                        </div>
                        
                        <div class="progress-stats">
                            <div class="stat-item">
                                <span class="stat-label">Successful:</span>
                                <span class="stat-value success" id="successCount">0</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Failed:</span>
                                <span class="stat-value error" id="failedCount">0</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Remaining:</span>
                                <span class="stat-value" id="remainingCount">0</span>
                            </div>
                        </div>
                        
                        <div class="progress-details">
                            <h5>Details:</h5>
                            <div class="log-container" id="progressLog"></div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" id="cancelBulkAction" disabled>
                        Cancel
                    </button>
                    <button class="btn btn-primary" id="closeProgressModal" style="display: none;">
                        Close
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // Create email template modal
    createEmailTemplateModal() {
        const modal = document.createElement('div');
        modal.id = 'emailTemplateModal';
        modal.className = 'modal';
        modal.style.display = 'none';

        modal.innerHTML = `
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <h3>Send Bulk Email</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="bulkEmailForm">
                        <div class="form-group">
                            <label for="templateSelect">Email Template</label>
                            <select id="templateSelect" class="form-control" required>
                                <option value="">Select a template...</option>
                                ${Object.keys(this.emailTemplates).map(key => `
                                    <option value="${key}">${this.emailTemplates[key].name}</option>
                                `).join('')}
                                <option value="custom">Custom Email</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="emailSubject">Subject</label>
                            <input type="text" id="emailSubject" class="form-control" required
                                   placeholder="Email subject">
                        </div>
                        
                        <div class="form-group">
                            <label for="emailBody">Email Body</label>
                            <textarea id="emailBody" class="form-control" rows="10" required
                                      placeholder="Email content..."></textarea>
                            <small class="form-text text-muted">
                                Use variables like {name}, {email}, {psnNumber} in your template
                            </small>
                        </div>
                        
                        <div class="form-group">
                            <label for="customVariables">Custom Variables (JSON)</label>
                            <textarea id="customVariables" class="form-control" rows="3"
                                      placeholder='{"eventName": "Annual Meeting", "eventDate": "2024-06-15"}'></textarea>
                            <small class="form-text text-muted">
                                Add custom variables to replace in the template
                            </small>
                        </div>
                        
                        <div class="form-check mb-3">
                            <input type="checkbox" id="sendCopyToAdmin" class="form-check-input">
                            <label for="sendCopyToAdmin" class="form-check-label">
                                Send a copy to admin
                            </label>
                        </div>
                        
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle"></i>
                            This will send emails to ${this.selectedMembers.size} selected members
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline" id="cancelEmailModal">
                        Cancel
                    </button>
                    <button type="button" class="btn btn-primary" id="sendBulkEmail">
                        Send Emails
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // Setup event listeners
    setupEventListeners() {
        // Template selection
        const templateSelect = document.getElementById('templateSelect');
        if (templateSelect) {
            templateSelect.addEventListener('change', (e) => {
                this.handleTemplateSelection(e.target.value);
            });
        }

        // Send bulk email button
        const sendBulkEmailBtn = document.getElementById('sendBulkEmail');
        if (sendBulkEmailBtn) {
            sendBulkEmailBtn.addEventListener('click', () => this.sendBulkEmails());
        }

        // Cancel email modal
        const cancelEmailModalBtn = document.getElementById('cancelEmailModal');
        if (cancelEmailModalBtn) {
            cancelEmailModalBtn.addEventListener('click', () => {
                this.closeEmailTemplateModal();
            });
        }

        // Close progress modal
        const closeProgressModalBtn = document.getElementById('closeProgressModal');
        if (closeProgressModalBtn) {
            closeProgressModalBtn.addEventListener('click', () => {
                this.closeProgressModal();
            });
        }

        // Cancel bulk action
        const cancelBulkActionBtn = document.getElementById('cancelBulkAction');
        if (cancelBulkActionBtn) {
            cancelBulkActionBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to cancel this bulk action?')) {
                    this.cancelBulkAction();
                }
            });
        }

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', function () {
                this.closest('.modal').style.display = 'none';
            });
        });
    }

    // Handle template selection
    handleTemplateSelection(templateKey) {
        const subjectInput = document.getElementById('emailSubject');
        const bodyTextarea = document.getElementById('emailBody');

        if (!subjectInput || !bodyTextarea) return;

        if (templateKey === 'custom') {
            subjectInput.value = '';
            bodyTextarea.value = '';
            subjectInput.disabled = false;
            bodyTextarea.disabled = false;
            return;
        }

        const template = this.emailTemplates[templateKey];
        if (template) {
            subjectInput.value = template.subject;
            bodyTextarea.value = template.body;
            subjectInput.disabled = true;
            bodyTextarea.disabled = false;
        }
    }

    // Send bulk emails
    async sendBulkEmails() {
        if (this.selectedMembers.size === 0) {
            showNotification('Please select members first', 'warning');
            return;
        }

        const templateKey = document.getElementById('templateSelect')?.value;
        const subject = document.getElementById('emailSubject')?.value.trim();
        const body = document.getElementById('emailBody')?.value.trim();
        const customVariablesJson = document.getElementById('customVariables')?.value.trim();
        const sendCopyToAdmin = document.getElementById('sendCopyToAdmin')?.checked;

        if (!templateKey || !subject || !body) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }

        let customVariables = {};
        if (customVariablesJson) {
            try {
                customVariables = JSON.parse(customVariablesJson);
            } catch (error) {
                showNotification('Invalid JSON in custom variables', 'error');
                return;
            }
        }

        if (!confirm(`Send email to ${this.selectedMembers.size} members?`)) {
            return;
        }

        try {
            this.startProgress('Sending bulk emails', this.selectedMembers.size);

            const memberIds = Array.from(this.selectedMembers);
            const memberDetails = await this.getMemberDetails(memberIds);

            // Prepare email data
            const emailData = {
                templateKey,
                subject,
                body,
                customVariables,
                sendCopyToAdmin,
                members: memberDetails.map(member => ({
                    id: member.id,
                    email: member.email,
                    variables: {
                        name: member.fullName,
                        psnNumber: member.psnNumber,
                        email: member.email,
                        ...customVariables
                    }
                }))
            };

            // Show progress modal
            this.showProgressModal();

            // Send emails
            let result;
            if (typeof ApiService !== 'undefined') {
                result = await ApiService.sendBulkEmails(emailData);
            } else {
                // Mock sending for demo
                result = await this.mockSendBulkEmails(emailData);
            }

            this.updateProgress(this.selectedMembers.size, this.selectedMembers.size, 'Emails sent successfully');

            // Log bulk action
            await this.logBulkAction('BULK_EMAIL_SENT', {
                count: result.sentCount || this.selectedMembers.size,
                templateKey,
                subject,
                memberCount: this.selectedMembers.size
            });

            showNotification(`Emails sent to ${result.sentCount || this.selectedMembers.size} members`, 'success');

            // Close email modal
            this.closeEmailTemplateModal();

            // Complete progress
            this.completeProgress();

            return result;

        } catch (error) {
            console.error('Bulk email error:', error);
            this.updateProgress(this.selectedMembers.size, 0, `Failed: ${error.message}`, true);
            showNotification(`Failed to send emails: ${error.message}`, 'error');
            throw error;
        }
    }

    // Mock send bulk emails for demo
    async mockSendBulkEmails(emailData) {
        return new Promise((resolve, reject) => {
            let processed = 0;
            const total = emailData.members.length;

            const interval = setInterval(() => {
                processed += Math.floor(Math.random() * 3) + 1;
                if (processed > total) processed = total;

                this.updateProgress(processed, total, `Sending email ${processed}/${total}`);

                if (processed === total) {
                    clearInterval(interval);

                    // Simulate some failures
                    const failedCount = Math.floor(Math.random() * 3);
                    const sentCount = total - failedCount;

                    setTimeout(() => {
                        resolve({
                            success: true,
                            sentCount,
                            failedCount,
                            message: `Sent ${sentCount} emails, ${failedCount} failed`
                        });
                    }, 1000);
                }
            }, 300);
        });
    }

    // Send bulk reminders
    async sendBulkReminders(reminderType = 'profile_update', customMessage = null) {
        if (this.selectedMembers.size === 0) {
            showNotification('Please select members first', 'warning');
            return;
        }

        if (!confirm(`Send ${reminderType} reminders to ${this.selectedMembers.size} members?`)) {
            return;
        }

        try {
            this.startProgress('Sending bulk reminders', this.selectedMembers.size);
            this.showProgressModal();

            const memberIds = Array.from(this.selectedMembers);

            const reminderData = {
                memberIds,
                reminderType,
                message: customMessage,
                sendToNextOfKin: reminderType.includes('event'),
                scheduleDate: new Date().toISOString()
            };

            let result;
            if (typeof ApiService !== 'undefined') {
                result = await ApiService.sendBulkReminders(reminderData);
            } else {
                // Mock sending for demo
                result = await this.mockSendBulkReminders(reminderData);
            }

            this.updateProgress(this.selectedMembers.size, this.selectedMembers.size, 'Reminders scheduled');

            // Log bulk action
            await this.logBulkAction('BULK_REMINDERS_SENT', {
                count: result.scheduledCount || this.selectedMembers.size,
                reminderType,
                memberCount: this.selectedMembers.size
            });

            showNotification(`Reminders scheduled for ${result.scheduledCount || this.selectedMembers.size} members`, 'success');

            this.completeProgress();
            return result;

        } catch (error) {
            console.error('Bulk reminder error:', error);
            this.updateProgress(this.selectedMembers.size, 0, `Failed: ${error.message}`, true);
            showNotification(`Failed to schedule reminders: ${error.message}`, 'error');
            throw error;
        }
    }

    // Mock send bulk reminders for demo
    async mockSendBulkReminders(reminderData) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    scheduledCount: reminderData.memberIds.length,
                    message: 'Reminders scheduled successfully'
                });
            }, 2000);
        });
    }

    // Update member status in bulk
    async updateMemberStatusBulk(status) {
        if (this.selectedMembers.size === 0) {
            showNotification('Please select members first', 'warning');
            return;
        }

        const action = status === 'active' ? 'activate' : 'deactivate';
        const actionText = action.charAt(0).toUpperCase() + action.slice(1);

        if (!confirm(`${actionText} ${this.selectedMembers.size} selected members?`)) {
            return;
        }

        try {
            this.startProgress(`${actionText}ing members`, this.selectedMembers.size);
            this.showProgressModal();

            const memberIds = Array.from(this.selectedMembers);
            const updates = memberIds.map(id => ({
                id,
                status
            }));

            // Process updates
            let successCount = 0;
            let failedCount = 0;

            for (let i = 0; i < updates.length; i++) {
                try {
                    if (typeof ApiService !== 'undefined') {
                        await ApiService.updateMember(updates[i].id, { status: updates[i].status });
                    }
                    successCount++;
                } catch (error) {
                    failedCount++;
                    console.error(`Failed to update member ${updates[i].id}:`, error);
                    this.addProgressLog(`Failed to update member ${updates[i].id}: ${error.message}`);
                }

                this.updateProgress(i + 1, updates.length, `Updated ${i + 1}/${updates.length} members`);

                // Small delay to prevent overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Update local state if in admin dashboard
            if (typeof window.renderMembersTable === 'function') {
                setTimeout(() => {
                    window.renderMembersTable();
                    this.updateSelectedCount();
                }, 500);
            }

            // Log bulk action
            await this.logBulkAction('BULK_STATUS_UPDATE', {
                action,
                successCount,
                failedCount,
                newStatus: status
            });

            if (failedCount > 0) {
                showNotification(`${actionText}d ${successCount} members, ${failedCount} failed`, failedCount === updates.length ? 'error' : 'warning');
            } else {
                showNotification(`${actionText}d ${successCount} members successfully`, 'success');
            }

            this.completeProgress();

        } catch (error) {
            console.error('Bulk status update error:', error);
            this.updateProgress(this.selectedMembers.size, 0, `Failed: ${error.message}`, true);
            showNotification(`Failed to update member status: ${error.message}`, 'error');
        }
    }

    // Export selected members data
    async exportSelectedMembers(format = 'csv') {
        if (this.selectedMembers.size === 0) {
            showNotification('Please select members first', 'warning');
            return;
        }

        try {
            this.startProgress('Exporting member data', this.selectedMembers.size);
            this.showProgressModal();

            const memberIds = Array.from(this.selectedMembers);
            const members = await this.getMemberDetails(memberIds);

            let content, filename;

            switch (format.toLowerCase()) {
                case 'csv':
                    content = this.convertToCSV(members);
                    filename = `psn_members_export_${new Date().toISOString().split('T')[0]}.csv`;
                    break;

                case 'json':
                    content = JSON.stringify(members, null, 2);
                    filename = `psn_members_export_${new Date().toISOString().split('T')[0]}.json`;
                    break;

                case 'excel':
                    // For Excel, we'll use CSV for now (in production, use a library like SheetJS)
                    content = this.convertToCSV(members);
                    filename = `psn_members_export_${new Date().toISOString().split('T')[0]}.xlsx`;
                    break;

                default:
                    throw new Error(`Unsupported format: ${format}`);
            }

            this.updateProgress(members.length, members.length, 'Data prepared');

            // Download file
            this.downloadFile(content, filename, format);

            // Log export
            await this.logBulkAction('BULK_EXPORT', {
                format,
                count: members.length
            });

            this.completeProgress();
            showNotification(`Exported ${members.length} members as ${format.toUpperCase()}`, 'success');

        } catch (error) {
            console.error('Export error:', error);
            this.updateProgress(this.selectedMembers.size, 0, `Failed: ${error.message}`, true);
            showNotification(`Export failed: ${error.message}`, 'error');
        }
    }

    // Convert members to CSV
    convertToCSV(members) {
        const headers = ['PSN Number', 'Full Name', 'Email', 'Phone', 'Status', 'Type', 'Registered Date', 'Last Login'];

        const rows = members.map(member => [
            `"${member.psnNumber || ''}"`,
            `"${member.fullName || ''}"`,
            `"${member.email || ''}"`,
            `"${member.phone || ''}"`,
            `"${member.status || ''}"`,
            `"${member.isAdmin ? 'Admin' : 'Member'}"`,
            `"${member.registeredDate ? formatDate(member.registeredDate) : ''}"`,
            `"${member.lastLogin ? formatDate(member.lastLogin) : ''}"`
        ]);

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    // Helper: Get member details
    async getMemberDetails(memberIds) {
        if (typeof ApiService !== 'undefined') {
            const promises = memberIds.map(id => ApiService.getMemberDetails(id));
            return await Promise.all(promises);
        } else {
            // Mock data for demo
            return memberIds.map(id => ({
                id,
                psnNumber: `PSN-TARA-2024-${id.split('_')[1]}`,
                fullName: `Member ${id.split('_')[1]}`,
                email: `member${id.split('_')[1]}@example.com`,
                phone: '08030000000',
                status: 'active',
                isAdmin: false,
                registeredDate: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            }));
        }
    }

    // Helper: Download file
    downloadFile(content, filename, type) {
        const mimeTypes = {
            'csv': 'text/csv',
            'json': 'application/json',
            'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        };

        const mimeType = mimeTypes[type.toLowerCase()] || 'text/plain';
        const blob = new Blob([content], { type: mimeType });
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

    // Update selection UI
    updateSelectedCount() {
        const count = this.selectedMembers.size;
        const countElement = document.getElementById('selectedCount');

        if (countElement) {
            countElement.textContent = count;
            countElement.parentElement.style.display = count > 0 ? 'flex' : 'none';
        }

        // Enable/disable bulk action buttons
        const bulkButtons = [
            'exportSelectedBtn',
            'deactivateSelectedBtn',
            'deleteSelectedBtn',
            'sendBulkEmailBtn',
            'sendBulkReminderBtn'
        ];

        bulkButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.disabled = count === 0;
                btn.title = count === 0 ? 'Select members first' : '';
            }
        });
    }

    // Select member
    selectMember(memberId) {
        this.selectedMembers.add(memberId);
        this.updateSelectedCount();
    }

    // Deselect member
    deselectMember(memberId) {
        this.selectedMembers.delete(memberId);
        this.updateSelectedCount();
    }

    // Toggle member selection
    toggleMemberSelection(memberId) {
        if (this.selectedMembers.has(memberId)) {
            this.deselectMember(memberId);
        } else {
            this.selectMember(memberId);
        }
    }

    // Select all members
    selectAllMembers(memberIds) {
        memberIds.forEach(id => this.selectedMembers.add(id));
        this.updateSelectedCount();
    }

    // Deselect all members
    deselectAllMembers() {
        this.selectedMembers.clear();
        this.updateSelectedCount();
    }

    // Get selected members
    getSelectedMembers() {
        return Array.from(this.selectedMembers);
    }

    // Start progress tracking
    startProgress(title, total) {
        this.progress = {
            current: 0,
            total,
            message: 'Starting...',
            success: 0,
            failed: 0
        };

        this.isProcessing = true;

        // Update UI
        const progressTitle = document.getElementById('progressTitle');
        if (progressTitle) progressTitle.textContent = title;

        this.updateProgress(0, total, 'Initializing...');
    }

    // Update progress
    updateProgress(current, total, message, isError = false) {
        this.progress.current = current;
        this.progress.total = total;
        this.progress.message = message;

        if (isError) {
            this.progress.failed++;
        } else if (current > 0) {
            this.progress.success++;
        }

        // Update UI
        const progressFill = document.getElementById('progressFill');
        const progressPercentage = document.getElementById('progressPercentage');
        const progressCount = document.getElementById('progressCount');
        const progressMessage = document.getElementById('progressMessage');
        const successCount = document.getElementById('successCount');
        const failedCount = document.getElementById('failedCount');
        const remainingCount = document.getElementById('remainingCount');

        if (progressFill) {
            const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;
            progressFill.style.width = `${percentage}%`;
        }

        if (progressPercentage) {
            const percentage = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;
            progressPercentage.textContent = `${percentage}%`;
        }

        if (progressCount) {
            progressCount.textContent = `(${current}/${total})`;
        }

        if (progressMessage) {
            progressMessage.textContent = message;
        }

        if (successCount) {
            successCount.textContent = this.progress.success;
        }

        if (failedCount) {
            failedCount.textContent = this.progress.failed;
        }

        if (remainingCount) {
            remainingCount.textContent = total - current;
        }

        // Add to log
        if (isError) {
            this.addProgressLog(`❌ ${message}`, 'error');
        } else {
            this.addProgressLog(`✓ ${message}`);
        }
    }

    // Add progress log
    addProgressLog(message, type = 'info') {
        const logContainer = document.getElementById('progressLog');
        if (!logContainer) return;

        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `
            <span class="log-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span class="log-message">${message}</span>
        `;

        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    // Complete progress
    completeProgress() {
        this.isProcessing = false;

        const cancelBtn = document.getElementById('cancelBulkAction');
        const closeBtn = document.getElementById('closeProgressModal');

        if (cancelBtn) cancelBtn.style.display = 'none';
        if (closeBtn) closeBtn.style.display = 'block';

        this.addProgressLog('✅ Bulk action completed successfully', 'success');
    }

    // Cancel bulk action
    cancelBulkAction() {
        this.isProcessing = false;
        this.addProgressLog('⚠️ Bulk action cancelled by user', 'warning');

        const cancelBtn = document.getElementById('cancelBulkAction');
        const closeBtn = document.getElementById('closeProgressModal');

        if (cancelBtn) cancelBtn.disabled = true;
        if (closeBtn) {
            closeBtn.style.display = 'block';
            closeBtn.textContent = 'Close';
        }

        showNotification('Bulk action cancelled', 'warning');
    }

    // Show progress modal
    showProgressModal() {
        const modal = document.getElementById('bulkProgressModal');
        if (modal) {
            modal.style.display = 'flex';

            // Reset log
            const logContainer = document.getElementById('progressLog');
            if (logContainer) logContainer.innerHTML = '';

            // Reset buttons
            const cancelBtn = document.getElementById('cancelBulkAction');
            const closeBtn = document.getElementById('closeProgressModal');

            if (cancelBtn) {
                cancelBtn.disabled = false;
                cancelBtn.style.display = 'block';
            }

            if (closeBtn) closeBtn.style.display = 'none';
        }
    }

    // Close progress modal
    closeProgressModal() {
        const modal = document.getElementById('bulkProgressModal');
        if (modal) modal.style.display = 'none';

        // Clear selection after successful action
        this.deselectAllMembers();
    }

    // Show email template modal
    showEmailTemplateModal() {
        if (this.selectedMembers.size === 0) {
            showNotification('Please select members first', 'warning');
            return;
        }

        const modal = document.getElementById('emailTemplateModal');
        if (modal) {
            modal.style.display = 'flex';

            // Reset form
            const form = document.getElementById('bulkEmailForm');
            if (form) form.reset();

            // Update selection count in modal
            const alert = modal.querySelector('.alert');
            if (alert) {
                alert.innerHTML = `
                    <i class="fas fa-info-circle"></i>
                    This will send emails to ${this.selectedMembers.size} selected members
                `;
            }
        }
    }

    // Close email template modal
    closeEmailTemplateModal() {
        const modal = document.getElementById('emailTemplateModal');
        if (modal) modal.style.display = 'none';
    }

    // Log bulk action
    async logBulkAction(action, details = {}) {
        try {
            if (typeof AuditLogger !== 'undefined') {
                await AuditLogger.logAction(action, {
                    ...details,
                    selectedCount: this.selectedMembers.size,
                    performedBy: getCurrentUser()?.id
                }, 'medium');
            }
        } catch (error) {
            console.warn('Failed to log bulk action:', error);
        }
    }
}

// Create global bulk actions manager instance
const BulkManager = new BulkActionsManager();

// Export for use in other modules
window.BulkManager = BulkManager;

// Helper functions for integration with admin.js
window.selectMember = function (memberId) {
    BulkManager.selectMember(memberId);
};

window.deselectMember = function (memberId) {
    BulkManager.deselectMember(memberId);
};

window.toggleMemberSelection = function (memberId) {
    BulkManager.toggleMemberSelection(memberId);
};

window.selectAllMembers = function (memberIds) {
    BulkManager.selectAllMembers(memberIds);
};

window.deselectAllMembers = function () {
    BulkManager.deselectAllMembers();
};

window.getSelectedMembers = function () {
    return BulkManager.getSelectedMembers();
};

window.showEmailTemplateModal = function () {
    BulkManager.showEmailTemplateModal();
};

// Add bulk actions styles
const bulkActionsStyles = `
    <style>
        .bulk-actions-bar {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 15px;
            flex-wrap: wrap;
            border: 1px solid #e9ecef;
        }
        
        .selected-count {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 15px;
            background: #e8f4fd;
            border-radius: 20px;
            font-weight: 600;
            color: #2c5aa0;
        }
        
        .bulk-action-buttons {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        .progress-container {
            padding: 20px;
        }
        
        .progress-header {
            margin-bottom: 20px;
        }
        
        .progress-header h4 {
            margin: 0 0 5px 0;
            color: #2c3e50;
        }
        
        .progress-header p {
            margin: 0;
            color: #6c757d;
        }
        
        .progress-bar-container {
            margin-bottom: 20px;
        }
        
        .progress-bar {
            height: 20px;
            background: #e9ecef;
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 8px;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #2c5aa0, #3498db);
            border-radius: 10px;
            transition: width 0.3s ease;
        }
        
        .progress-text {
            display: flex;
            justify-content: space-between;
            font-size: 0.9rem;
            color: #6c757d;
        }
        
        .progress-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .stat-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 6px;
        }
        
        .stat-label {
            font-weight: 600;
            color: #495057;
        }
        
        .stat-value {
            font-weight: 700;
            font-size: 1.2rem;
        }
        
        .stat-value.success {
            color: #28a745;
        }
        
        .stat-value.error {
            color: #dc3545;
        }
        
        .progress-details {
            margin-top: 20px;
        }
        
        .progress-details h5 {
            margin: 0 0 10px 0;
            color: #495057;
        }
        
        .log-container {
            max-height: 200px;
            overflow-y: auto;
            background: #f8f9fa;
            border-radius: 6px;
            padding: 10px;
            font-family: 'Courier New', monospace;
            font-size: 0.85rem;
        }
        
        .log-entry {
            display: flex;
            gap: 10px;
            padding: 5px 0;
            border-bottom: 1px solid #e9ecef;
        }
        
        .log-entry:last-child {
            border-bottom: none;
        }
        
        .log-entry.error {
            color: #dc3545;
        }
        
        .log-entry.success {
            color: #28a745;
        }
        
        .log-time {
            color: #6c757d;
            min-width: 60px;
        }
        
        .log-message {
            flex: 1;
        }
        
        .template-preview {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
            border-left: 4px solid #2c5aa0;
        }
        
        .template-preview h5 {
            margin: 0 0 10px 0;
            color: #2c3e50;
        }
        
        .template-preview pre {
            margin: 0;
            white-space: pre-wrap;
            font-family: inherit;
            font-size: 0.9rem;
            color: #495057;
        }
        
        .variable-tag {
            display: inline-block;
            padding: 2px 6px;
            background: #e8f4fd;
            color: #2c5aa0;
            border-radius: 4px;
            font-size: 0.8rem;
            font-family: 'Courier New', monospace;
            margin: 0 2px;
        }
        
        .email-template-card {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .email-template-card:hover {
            border-color: #2c5aa0;
            box-shadow: 0 2px 8px rgba(44, 90, 160, 0.1);
        }
        
        .email-template-card.selected {
            border-color: #2c5aa0;
            background: #e8f4fd;
        }
        
        .template-name {
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        
        .template-subject {
            color: #6c757d;
            font-size: 0.9rem;
            margin-bottom: 10px;
        }
        
        .template-variables {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
        }
    </style>
`;

// Add styles to document
document.head.insertAdjacentHTML('beforeend', bulkActionsStyles);