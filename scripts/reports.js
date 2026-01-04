/**
 * Advanced Reports Module for PSN Welfare Registry - Vercel Compatible
 * Version: 1.0.0
 * Compatibility: Vercel, GitHub, VS Code (Windows)
 */

class ReportGenerator {
    constructor() {
        this.currentReport = null;
        this.reportData = null;
        this.reportTemplates = {};
        this.isGenerating = false;

        // Report types configuration
        this.reportTypes = {
            demographics: {
                name: 'Demographics Report',
                description: 'Member demographics and statistics',
                formats: ['pdf', 'csv', 'json'],
                requiresDateRange: false
            },
            calendar: {
                name: 'Celebration Calendar',
                description: 'Upcoming birthdays and anniversaries',
                formats: ['pdf', 'csv', 'json'],
                requiresDateRange: true
            },
            reminders: {
                name: 'Reminder Performance',
                description: 'Reminder delivery statistics and performance',
                formats: ['pdf', 'csv', 'json'],
                requiresDateRange: true
            },
            growth: {
                name: 'Member Growth',
                description: 'Member registration and growth trends',
                formats: ['pdf', 'csv', 'json'],
                requiresDateRange: true
            },
            comprehensive: {
                name: 'Comprehensive Report',
                description: 'Complete system overview and analytics',
                formats: ['pdf'],
                requiresDateRange: true
            },
            custom: {
                name: 'Custom Report',
                description: 'Custom report with selected data',
                formats: ['pdf', 'csv', 'json', 'excel'],
                requiresDateRange: false
            }
        };

        // Initialize
        this.initialize();
    }

    // Initialize report generator
    initialize() {
        console.log('📈 Initializing report generator...');

        try {
            // Load report templates
            this.loadReportTemplates();

            // Setup UI - only if in browser environment
            if (typeof document !== 'undefined') {
                this.setupReportUI();
            }

            console.log('✅ Report generator initialized');
        } catch (error) {
            console.error('Failed to initialize report generator:', error);
        }
    }

    // Load report templates
    loadReportTemplates() {
        this.reportTemplates = {
            demographics: this.getDemographicsTemplate(),
            calendar: this.getCalendarTemplate(),
            reminders: this.getRemindersTemplate(),
            growth: this.getGrowthTemplate(),
            comprehensive: this.getComprehensiveTemplate()
        };
    }

    // Setup report UI
    setupReportUI() {
        // Populate report type selector
        this.populateReportTypeSelector();

        // Setup date pickers
        this.setupDatePickers();

        // Setup event listeners
        this.setupEventListeners();
    }

    // Populate report type selector
    populateReportTypeSelector() {
        const selector = document.getElementById('reportType');
        if (!selector) return;

        selector.innerHTML = '<option value="">Select Report Type...</option>';

        Object.entries(this.reportTypes).forEach(([key, config]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = `${config.name} - ${config.description}`;
            selector.appendChild(option);
        });

        // Add change event
        selector.addEventListener('change', (e) => {
            this.handleReportTypeChange(e.target.value);
        });
    }

    // Setup date pickers
    setupDatePickers() {
        const startDate = document.getElementById('reportStartDate');
        const endDate = document.getElementById('reportEndDate');

        if (startDate) {
            // Set default to first day of current month
            const firstDay = new Date();
            firstDay.setDate(1);
            startDate.value = this.formatDate(firstDay);
            startDate.max = this.formatDate(new Date());
        }

        if (endDate) {
            // Set default to today
            endDate.value = this.formatDate(new Date());
            endDate.max = this.formatDate(new Date());
        }

        // Add change events to validate date range
        if (startDate && endDate) {
            startDate.addEventListener('change', () => {
                if (endDate.value && startDate.value > endDate.value) {
                    endDate.value = startDate.value;
                }
            });

            endDate.addEventListener('change', () => {
                if (startDate.value && endDate.value < startDate.value) {
                    startDate.value = endDate.value;
                }
            });
        }
    }

    // Helper: Format date to YYYY-MM-DD
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Setup event listeners
    setupEventListeners() {
        // Generate report button
        const generateBtn = document.getElementById('generateReportBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateReport());
        }

        // Export report button
        const exportBtn = document.getElementById('exportReportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportCurrentReport());
        }

        // Download format selector
        const formatSelect = document.getElementById('downloadFormat');
        if (formatSelect) {
            formatSelect.addEventListener('change', (e) => {
                this.updateDownloadButton(e.target.value);
            });
        }

        // Clear filters button
        const clearFiltersBtn = document.getElementById('clearReportFilters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearReportFilters());
        }
    }

    // Handle report type change
    handleReportTypeChange(reportType) {
        const dateRangeSection = document.getElementById('dateRangeSection');
        const customOptionsSection = document.getElementById('customOptionsSection');

        if (!dateRangeSection || !customOptionsSection) return;

        const config = this.reportTypes[reportType];

        if (config) {
            // Show/hide date range based on report type
            dateRangeSection.style.display = config.requiresDateRange ? 'block' : 'none';

            // Show/hide custom options
            customOptionsSection.style.display = reportType === 'custom' ? 'block' : 'none';

            // Update description
            const descriptionElement = document.getElementById('reportDescription');
            if (descriptionElement) {
                descriptionElement.textContent = config.description;
            }

            // Update available formats
            this.updateFormatOptions(config.formats);
        }
    }

    // Update format options
    updateFormatOptions(formats) {
        const formatSelect = document.getElementById('downloadFormat');
        if (!formatSelect) return;

        // Clear existing options
        formatSelect.innerHTML = '';

        // Add available formats
        formats.forEach(format => {
            const option = document.createElement('option');
            option.value = format;
            option.textContent = format.toUpperCase();
            formatSelect.appendChild(option);
        });

        // Update download button
        this.updateDownloadButton(formats[0]);
    }

    // Update download button
    updateDownloadButton(format) {
        const exportBtn = document.getElementById('exportReportBtn');
        if (exportBtn && this.currentReport) {
            exportBtn.disabled = false;
            exportBtn.innerHTML = `
                <i class="fas fa-download"></i>
                Download ${format.toUpperCase()}
            `;
        }
    }

    // Generate report
    async generateReport() {
        if (this.isGenerating) {
            this.showNotification('Report generation already in progress', 'warning');
            return;
        }

        // Get form values
        const reportType = document.getElementById('reportType')?.value;
        const startDate = document.getElementById('reportStartDate')?.value;
        const endDate = document.getElementById('reportEndDate')?.value;

        if (!reportType) {
            this.showNotification('Please select a report type', 'error');
            return;
        }

        const config = this.reportTypes[reportType];
        if (config.requiresDateRange && (!startDate || !endDate)) {
            this.showNotification('Please select a date range', 'error');
            return;
        }

        try {
            this.isGenerating = true;
            this.showNotification('Generating report...', 'info');

            // Prepare parameters
            const params = {
                reportType,
                startDate,
                endDate,
                filters: this.getReportFilters()
            };

            let response;

            // Check for API service or use mock
            if (typeof window.ApiService !== 'undefined') {
                response = await window.ApiService.generateReport(reportType, params);
            } else {
                // Mock report generation for demo
                response = await this.mockGenerateReport(reportType, params);
            }

            this.currentReport = {
                id: response.reportId || `report_${Date.now()}`,
                type: reportType,
                generatedAt: new Date().toISOString(),
                params: params,
                data: response.data
            };

            this.reportData = response.data;

            // Display report preview
            this.displayReportPreview();

            // Enable export button
            const exportBtn = document.getElementById('exportReportBtn');
            if (exportBtn) {
                exportBtn.disabled = false;
            }

            // Log report generation
            await this.logReportAction('REPORT_GENERATED', {
                reportId: this.currentReport.id,
                reportType: reportType,
                parameters: params
            });

            this.showNotification(`${config.name} generated successfully`, 'success');

        } catch (error) {
            console.error('Report generation error:', error);
            this.showNotification(`Failed to generate report: ${error.message}`, 'error');

            // Show error in preview
            this.showReportError(error.message);

        } finally {
            this.isGenerating = false;
        }
    }

    // Mock report generation for demo
    async mockGenerateReport(reportType, params) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockData = this.getMockReportData(reportType, params);
                resolve({
                    success: true,
                    reportId: `mock_report_${Date.now()}`,
                    data: mockData,
                    generatedAt: new Date().toISOString(),
                    message: 'Mock report generated successfully'
                });
            }, 2000);
        });
    }

    // Get mock report data
    getMockReportData(reportType, params) {
        switch (reportType) {
            case 'demographics':
                return this.getMockDemographicsData();
            case 'calendar':
                return this.getMockCalendarData(params);
            case 'reminders':
                return this.getMockRemindersData(params);
            case 'growth':
                return this.getMockGrowthData(params);
            case 'comprehensive':
                return this.getMockComprehensiveData(params);
            default:
                return { message: 'Mock data not available for this report type' };
        }
    }

    // Get report filters
    getReportFilters() {
        const filters = {};

        // Add any additional filters from the UI
        const statusFilter = document.getElementById('reportStatusFilter')?.value;
        const typeFilter = document.getElementById('reportTypeFilter')?.value;
        const departmentFilter = document.getElementById('reportDepartmentFilter')?.value;

        if (statusFilter) filters.status = statusFilter;
        if (typeFilter) filters.memberType = typeFilter;
        if (departmentFilter) filters.department = departmentFilter;

        return filters;
    }

    // Clear report filters
    clearReportFilters() {
        const filters = ['reportStatusFilter', 'reportTypeFilter', 'reportDepartmentFilter'];

        filters.forEach(filterId => {
            const element = document.getElementById(filterId);
            if (element) element.value = '';
        });

        this.showNotification('Filters cleared', 'info');
    }

    // Display report preview
    displayReportPreview() {
        const preview = document.getElementById('reportPreview');
        const content = document.getElementById('reportContent');

        if (!preview || !content) return;

        preview.style.display = 'block';

        // Scroll to preview
        preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Generate preview HTML based on report type
        let previewHTML;

        switch (this.currentReport.type) {
            case 'demographics':
                previewHTML = this.generateDemographicsPreview();
                break;
            case 'calendar':
                previewHTML = this.generateCalendarPreview();
                break;
            case 'reminders':
                previewHTML = this.generateRemindersPreview();
                break;
            case 'growth':
                previewHTML = this.generateGrowthPreview();
                break;
            case 'comprehensive':
                previewHTML = this.generateComprehensivePreview();
                break;
            default:
                previewHTML = this.generateDefaultPreview();
        }

        content.innerHTML = previewHTML;

        // Initialize charts if needed
        this.initializeReportCharts();
    }

    // Generate default preview
    generateDefaultPreview() {
        return `
            <div class="report-section">
                <div class="report-header">
                    <h4>Report Preview</h4>
                    <p class="report-meta">
                        Generated: ${new Date().toLocaleDateString()}
                    </p>
                </div>
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    <p>Select a report type and generate to see preview here.</p>
                </div>
            </div>
        `;
    }

    // Show report error
    showReportError(errorMessage) {
        const preview = document.getElementById('reportPreview');
        const content = document.getElementById('reportContent');

        if (!preview || !content) return;

        preview.style.display = 'block';
        content.innerHTML = `
            <div class="report-error">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="error-content">
                    <h4>Report Generation Failed</h4>
                    <p>${errorMessage}</p>
                    <button class="btn btn-outline btn-sm mt-3" onclick="window.reportGenerator.retryReport()">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            </div>
        `;
    }

    // Retry report generation
    retryReport() {
        if (this.currentReport) {
            this.generateReport();
        }
    }

    // Generate demographics preview
    generateDemographicsPreview() {
        const data = this.reportData || this.getMockDemographicsData();

        return `
            <div class="report-section">
                <div class="report-header">
                    <h4>Demographics Report</h4>
                    <p class="report-meta">
                        Generated: ${new Date().toLocaleDateString()} | 
                        Members: ${data.totalMembers || 0}
                    </p>
                </div>
                
                <div class="report-stats-grid">
                    <div class="report-stat">
                        <h5>Total Members</h5>
                        <h3>${data.totalMembers?.toLocaleString() || '0'}</h3>
                    </div>
                    <div class="report-stat">
                        <h5>Active Members</h5>
                        <h3>${data.activeMembers?.toLocaleString() || '0'}</h3>
                    </div>
                    <div class="report-stat">
                        <h5>Male Members</h5>
                        <h3>${data.maleCount?.toLocaleString() || '0'}</h3>
                    </div>
                    <div class="report-stat">
                        <h5>Female Members</h5>
                        <h3>${data.femaleCount?.toLocaleString() || '0'}</h3>
                    </div>
                </div>
                
                <div class="report-charts">
                    <h5>Age Distribution</h5>
                    <div class="chart-container">
                        <canvas id="demographicsAgeChart"></canvas>
                    </div>
                    
                    <h5>Department Distribution</h5>
                    <div class="chart-container">
                        <canvas id="demographicsDeptChart"></canvas>
                    </div>
                </div>
                
                <div class="report-insights">
                    <h5>Key Insights</h5>
                    <ul>
                        <li>Average member age: ${data.averageAge || 'N/A'} years</li>
                        <li>Most common age group: ${data.mostCommonAgeGroup || 'N/A'}</li>
                        <li>Member growth this year: ${data.yearlyGrowth || '0'}%</li>
                        <li>Active participation rate: ${data.participationRate || '0'}%</li>
                    </ul>
                </div>
            </div>
        `;
    }

    // Generate calendar preview
    generateCalendarPreview() {
        const data = this.reportData || this.getMockCalendarData(this.currentReport?.params);

        return `
            <div class="report-section">
                <div class="report-header">
                    <h4>Celebration Calendar Report</h4>
                    <p class="report-meta">
                        Period: ${this.currentReport?.params?.startDate || 'N/A'} to 
                        ${this.currentReport?.params?.endDate || 'N/A'} | 
                        Total Celebrations: ${data.totalCelebrations || 0}
                    </p>
                </div>
                
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Month</th>
                            <th>Birthdays</th>
                            <th>Anniversaries</th>
                            <th>Total</th>
                            <th>Reminders Sent</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(data.monthlyData || []).map(month => `
                            <tr>
                                <td><strong>${month.month}</strong></td>
                                <td>${month.birthdays}</td>
                                <td>${month.anniversaries}</td>
                                <td>${month.total}</td>
                                <td>${month.remindersSent}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="report-charts">
                    <h5>Monthly Celebrations Trend</h5>
                    <div class="chart-container">
                        <canvas id="calendarTrendChart"></canvas>
                    </div>
                </div>
                
                <div class="report-summary">
                    <h5>Summary</h5>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <span class="summary-label">Total Birthdays:</span>
                            <span class="summary-value">${data.totalBirthdays || 0}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Total Anniversaries:</span>
                            <span class="summary-value">${data.totalAnniversaries || 0}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Peak Month:</span>
                            <span class="summary-value">${data.peakMonth || 'N/A'}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Average per Month:</span>
                            <span class="summary-value">${data.averagePerMonth || 0}</span>
                        </div>
                    </div>
                </div>
                
                <div class="report-recommendations">
                    <h5>Recommendations</h5>
                    <ul>
                        <li>Schedule advance reminders for peak celebration months</li>
                        <li>Consider bulk celebrations for months with high event density</li>
                        <li>Review reminder delivery success rates for improvement</li>
                    </ul>
                </div>
            </div>
        `;
    }

    // Generate growth preview
    generateGrowthPreview() {
        const data = this.reportData || this.getMockGrowthData(this.currentReport?.params);

        return `
            <div class="report-section">
                <div class="report-header">
                    <h4>Member Growth Report</h4>
                    <p class="report-meta">
                        Period: ${this.currentReport?.params?.startDate || 'N/A'} to 
                        ${this.currentReport?.params?.endDate || 'N/A'} | 
                        Growth Rate: ${data.growthRate || '0'}%
                    </p>
                </div>
                
                <div class="report-stats-grid">
                    <div class="report-stat">
                        <h5>New Members</h5>
                        <h3>${data.newMembers?.toLocaleString() || '0'}</h3>
                    </div>
                    <div class="report-stat">
                        <h5>Total Members</h5>
                        <h3>${data.totalMembers?.toLocaleString() || '0'}</h3>
                    </div>
                    <div class="report-stat">
                        <h5>Growth Rate</h5>
                        <h3>${data.growthRate || '0'}%</h3>
                    </div>
                    <div class="report-stat">
                        <h5>Retention Rate</h5>
                        <h3>${data.retentionRate || '0'}%</h3>
                    </div>
                </div>
                
                <div class="report-charts">
                    <h5>Growth Trend</h5>
                    <div class="chart-container">
                        <canvas id="growthTrendChart"></canvas>
                    </div>
                </div>
                
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Period</th>
                            <th>New Members</th>
                            <th>Cumulative Total</th>
                            <th>Growth %</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(data.periodicData || []).map(period => `
                            <tr>
                                <td>${period.period}</td>
                                <td>${period.newMembers}</td>
                                <td>${period.cumulativeTotal}</td>
                                <td>${period.growthPercentage}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="report-insights">
                    <h5>Growth Insights</h5>
                    <ul>
                        <li>Average monthly growth: ${data.averageMonthlyGrowth || '0'}%</li>
                        <li>Peak growth period: ${data.peakGrowthPeriod || 'N/A'}</li>
                        <li>Member acquisition cost: ${data.acquisitionCost || 'N/A'}</li>
                        <li>Projected next quarter growth: ${data.projectedGrowth || '0'}%</li>
                    </ul>
                </div>
            </div>
        `;
    }

    // Generate reminders preview
    generateRemindersPreview() {
        const data = this.reportData || this.getMockRemindersData(this.currentReport?.params);

        return `
            <div class="report-section">
                <div class="report-header">
                    <h4>Reminder Performance Report</h4>
                    <p class="report-meta">
                        Period: ${this.currentReport?.params?.startDate || 'N/A'} to 
                        ${this.currentReport?.params?.endDate || 'N/A'} | 
                        Success Rate: ${data.successRate || '0'}%
                    </p>
                </div>
                
                <div class="report-stats-grid">
                    <div class="report-stat">
                        <h5>Total Sent</h5>
                        <h3>${data.totalSent?.toLocaleString() || '0'}</h3>
                    </div>
                    <div class="report-stat">
                        <h5>Successful</h5>
                        <h3>${data.successful?.toLocaleString() || '0'}</h3>
                    </div>
                    <div class="report-stat">
                        <h5>Failed</h5>
                        <h3>${data.failed?.toLocaleString() || '0'}</h3>
                    </div>
                    <div class="report-stat">
                        <h5>Success Rate</h5>
                        <h3>${data.successRate || '0'}%</h3>
                    </div>
                </div>
                
                <div class="report-charts">
                    <h5>Delivery Performance</h5>
                    <div class="chart-container">
                        <canvas id="remindersPerformanceChart"></canvas>
                    </div>
                </div>
                
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Reminder Type</th>
                            <th>Sent</th>
                            <th>Delivered</th>
                            <th>Opened</th>
                            <th>Click Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(data.byType || []).map(type => `
                            <tr>
                                <td>${type.type}</td>
                                <td>${type.sent}</td>
                                <td>${type.delivered}</td>
                                <td>${type.opened}</td>
                                <td>${type.clickRate}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="report-analysis">
                    <h5>Performance Analysis</h5>
                    <div class="analysis-content">
                        <p><strong>Top Performing Channel:</strong> ${data.topChannel || 'N/A'}</p>
                        <p><strong>Average Delivery Time:</strong> ${data.avgDeliveryTime || 'N/A'}</p>
                        <p><strong>Peak Delivery Hours:</strong> ${data.peakHours || 'N/A'}</p>
                        <p><strong>Common Failure Reasons:</strong> ${data.failureReasons?.join(', ') || 'N/A'}</p>
                    </div>
                </div>
            </div>
        `;
    }

    // Generate comprehensive preview
    generateComprehensivePreview() {
        const data = this.reportData || this.getMockComprehensiveData(this.currentReport?.params);

        return `
            <div class="report-section">
                <div class="report-header">
                    <h4>Comprehensive System Report</h4>
                    <p class="report-meta">
                        Period: ${this.currentReport?.params?.startDate || 'N/A'} to 
                        ${this.currentReport?.params?.endDate || 'N/A'} | 
                        Generated: ${new Date().toLocaleDateString()}
                    </p>
                </div>
                
                <div class="report-executive-summary">
                    <h5>Executive Summary</h5>
                    <p>This comprehensive report provides an overview of all system activities, 
                    member statistics, engagement metrics, and performance indicators for the 
                    selected period.</p>
                </div>
                
                <div class="report-metrics">
                    <h5>Key Performance Indicators</h5>
                    <div class="metrics-grid">
                        ${data.metrics ? Object.entries(data.metrics).map(([key, value]) => `
                            <div class="metric-item">
                                <span class="metric-label">${key.replace(/([A-Z])/g, ' $1')}:</span>
                                <span class="metric-value">${value}</span>
                            </div>
                        `).join('') : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // Initialize report charts
    initializeReportCharts() {
        if (typeof window.chartManager === 'undefined') return;

        // Initialize charts based on report type
        switch (this.currentReport?.type) {
            case 'demographics':
                this.initializeDemographicsCharts();
                break;
            case 'calendar':
                this.initializeCalendarCharts();
                break;
            case 'growth':
                this.initializeGrowthCharts();
                break;
            case 'reminders':
                this.initializeRemindersCharts();
                break;
        }
    }

    // Initialize demographics charts
    initializeDemographicsCharts() {
        const data = this.reportData || this.getMockDemographicsData();

        if (data.ageDistribution && window.chartManager) {
            window.chartManager.createDemographicsChart('demographicsAgeChart', {
                labels: data.ageDistribution.labels,
                values: data.ageDistribution.values,
                label: 'Members by Age'
            });
        }

        if (data.departmentDistribution && window.chartManager) {
            window.chartManager.createAgeDistributionChart('demographicsDeptChart', {
                labels: data.departmentDistribution.labels,
                values: data.departmentDistribution.values
            });
        }
    }

    // Initialize calendar charts
    initializeCalendarCharts() {
        const data = this.reportData || this.getMockCalendarData(this.currentReport?.params);

        if (data.monthlyData && window.chartManager) {
            const labels = data.monthlyData.map(item => item.month);
            const birthdayData = data.monthlyData.map(item => item.birthdays);
            const anniversaryData = data.monthlyData.map(item => item.anniversaries);

            window.chartManager.createCalendarChart('calendarTrendChart', {
                labels: labels,
                birthdayData: birthdayData,
                anniversaryData: anniversaryData
            });
        }
    }

    // Initialize growth charts
    initializeGrowthCharts() {
        const data = this.reportData || this.getMockGrowthData(this.currentReport?.params);

        if (data.periodicData && window.chartManager) {
            const labels = data.periodicData.map(item => item.period);
            const growthData = data.periodicData.map(item => item.newMembers);

            window.chartManager.createGrowthChart('growthTrendChart', {
                labels: labels,
                data: growthData
            });
        }
    }

    // Initialize reminders charts
    initializeRemindersCharts() {
        const data = this.reportData || this.getMockRemindersData(this.currentReport?.params);

        if (data.byType && window.chartManager) {
            const labels = data.byType.map(item => item.type);
            const successRates = data.byType.map(item => item.delivered / item.sent * 100);

            window.chartManager.createReminderPerformanceChart('remindersPerformanceChart', {
                labels: labels,
                successRates: successRates
            });
        }
    }

    // Export current report
    async exportCurrentReport(format = null) {
        if (!this.currentReport) {
            this.showNotification('No report generated yet', 'error');
            return;
        }

        const selectedFormat = format || document.getElementById('downloadFormat')?.value || 'pdf';

        try {
            this.showNotification(`Exporting report as ${selectedFormat.toUpperCase()}...`, 'info');

            if (typeof window.ApiService !== 'undefined') {
                await window.ApiService.downloadReport(this.currentReport.id, selectedFormat);
            } else {
                // Mock export for demo
                await this.mockExportReport(selectedFormat);
            }

            // Log export
            await this.logReportAction('REPORT_EXPORTED', {
                reportId: this.currentReport.id,
                reportType: this.currentReport.type,
                format: selectedFormat
            });

            this.showNotification('Report exported successfully', 'success');

        } catch (error) {
            console.error('Export error:', error);
            this.showNotification(`Export failed: ${error.message}`, 'error');
        }
    }

    // Mock export for demo
    async mockExportReport(format) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Create download link
                const content = JSON.stringify(this.currentReport, null, 2);
                const mimeType = this.getMimeType(format);
                const blob = new Blob([content], { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `report_${this.currentReport.id}_${new Date().toISOString().split('T')[0]}.${format}`;
                document.body.appendChild(a);
                a.click();

                // Cleanup
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                }, 100);

                resolve({ success: true });
            }, 1000);
        });
    }

    // Get MIME type for format
    getMimeType(format) {
        const mimeTypes = {
            pdf: 'application/pdf',
            csv: 'text/csv',
            json: 'application/json',
            excel: 'application/vnd.ms-excel'
        };
        return mimeTypes[format] || 'application/octet-stream';
    }

    // Export all data
    async exportAllData(format = 'json') {
        try {
            this.showNotification(`Exporting all data as ${format.toUpperCase()}...`, 'info');

            if (typeof window.ApiService !== 'undefined') {
                await window.ApiService.exportData(format);
            } else {
                // Mock export for demo
                await this.mockExportAllData(format);
            }

            // Log export
            await this.logReportAction('FULL_DATA_EXPORT', {
                format: format,
                timestamp: new Date().toISOString()
            });

            this.showNotification('Data exported successfully', 'success');

        } catch (error) {
            console.error('Full export error:', error);
            this.showNotification(`Export failed: ${error.message}`, 'error');
        }
    }

    // Mock export all data for demo
    async mockExportAllData(format) {
        const exportData = {
            timestamp: new Date().toISOString(),
            type: 'full_export',
            data: {
                members: [],
                specialDates: [],
                nextOfKin: []
            }
        };

        const content = JSON.stringify(exportData, null, 2);
        const filename = `psn_welfare_full_export_${new Date().toISOString().split('T')[0]}.${format}`;

        this.downloadFile(content, filename, 'application/json');
    }

    // Download file helper
    downloadFile(content, filename, mimeType) {
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

    // Log report action
    async logReportAction(action, details = {}) {
        try {
            if (typeof window.AuditLogger !== 'undefined') {
                await window.AuditLogger.logAction(action, details, 'medium');
            }
        } catch (error) {
            console.warn('Failed to log report action:', error);
        }
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add to body
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('notification-hide');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Get mock data for demos
    getMockDemographicsData() {
        return {
            totalMembers: 157,
            activeMembers: 149,
            maleCount: 95,
            femaleCount: 62,
            averageAge: 42,
            mostCommonAgeGroup: '36-45',
            yearlyGrowth: 15,
            participationRate: 85,
            ageDistribution: {
                labels: ['18-25', '26-35', '36-45', '46-55', '56-65', '65+'],
                values: [15, 42, 68, 45, 22, 8]
            },
            departmentDistribution: {
                labels: ['Pharmacy', 'Medicine', 'Administration', 'Support', 'Other'],
                values: [85, 42, 18, 7, 5]
            }
        };
    }

    getMockCalendarData(params) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const monthlyData = months.map(month => ({
            month,
            birthdays: Math.floor(Math.random() * 15) + 5,
            anniversaries: Math.floor(Math.random() * 10) + 2,
            remindersSent: Math.floor(Math.random() * 20) + 5
        })).map(data => ({
            ...data,
            total: data.birthdays + data.anniversaries
        }));

        const totalBirthdays = monthlyData.reduce((sum, data) => sum + data.birthdays, 0);
        const totalAnniversaries = monthlyData.reduce((sum, data) => sum + data.anniversaries, 0);

        return {
            totalCelebrations: totalBirthdays + totalAnniversaries,
            totalBirthdays,
            totalAnniversaries,
            peakMonth: 'May',
            averagePerMonth: Math.round((totalBirthdays + totalAnniversaries) / 12),
            monthlyData
        };
    }

    getMockGrowthData(params) {
        const periods = ['Q1 2023', 'Q2 2023', 'Q3 2023', 'Q4 2023', 'Q1 2024', 'Q2 2024'];

        let cumulative = 120;
        const periodicData = periods.map(period => {
            const newMembers = Math.floor(Math.random() * 20) + 10;
            cumulative += newMembers;
            const growthPercentage = Math.round((newMembers / (cumulative - newMembers)) * 100);

            return {
                period,
                newMembers,
                cumulativeTotal: cumulative,
                growthPercentage
            };
        });

        const totalNewMembers = periodicData.reduce((sum, data) => sum + data.newMembers, 0);

        return {
            newMembers: totalNewMembers,
            totalMembers: cumulative,
            growthRate: Math.round((periodicData[periodicData.length - 1].newMembers /
                periodicData[periodicData.length - 2].newMembers - 1) * 100),
            retentionRate: 92,
            averageMonthlyGrowth: 8,
            peakGrowthPeriod: 'Q4 2023',
            acquisitionCost: '₦5,250',
            projectedGrowth: 12,
            periodicData
        };
    }

    getMockRemindersData(params) {
        const types = ['Birthday', 'Anniversary', 'Profile Update', 'Event', 'General'];

        const byType = types.map(type => {
            const sent = Math.floor(Math.random() * 300) + 100;
            const delivered = Math.floor(Math.random() * 280) + 90;
            const opened = Math.floor(Math.random() * 250) + 80;
            const clickRate = Math.floor(Math.random() * 30) + 10;

            return {
                type,
                sent,
                delivered,
                opened,
                clickRate
            };
        });

        const totalSent = byType.reduce((sum, type) => sum + type.sent, 0);
        const totalDelivered = byType.reduce((sum, type) => sum + type.delivered, 0);

        return {
            totalSent,
            successful: totalDelivered,
            failed: totalSent - totalDelivered,
            successRate: Math.round((totalDelivered / totalSent) * 100),
            topChannel: 'Email',
            avgDeliveryTime: '2.4 seconds',
            peakHours: '10:00 AM - 12:00 PM',
            failureReasons: ['Invalid Email', 'Server Timeout', 'Spam Filter'],
            byType
        };
    }

    getMockComprehensiveData(params) {
        return {
            metrics: {
                totalMembers: 157,
                activeMembers: 149,
                monthlyGrowth: '8.5%',
                engagementRate: '78%',
                reminderSuccess: '96%',
                satisfactionScore: '4.7/5'
            }
        };
    }

    // Template getters
    getDemographicsTemplate() {
        return {
            sections: ['summary', 'age_distribution', 'gender_distribution', 'department_distribution', 'insights']
        };
    }

    getCalendarTemplate() {
        return {
            sections: ['summary', 'monthly_breakdown', 'trend_analysis', 'recommendations']
        };
    }

    getRemindersTemplate() {
        return {
            sections: ['performance_summary', 'delivery_metrics', 'channel_analysis', 'failure_analysis']
        };
    }

    getGrowthTemplate() {
        return {
            sections: ['growth_summary', 'trend_analysis', 'periodic_breakdown', 'projections']
        };
    }

    getComprehensiveTemplate() {
        return {
            sections: ['executive_summary', 'demographics', 'engagement', 'growth', 'recommendations', 'appendices']
        };
    }
}

// Create global report generator instance only in browser environment
if (typeof window !== 'undefined') {
    const ReportManager = new ReportGenerator();
    window.ReportManager = ReportManager;
    window.reportGenerator = ReportManager;
}

// Export for ES modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReportGenerator;
}

// Add report styles to document
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('style');
        style.textContent = `
            .report-section {
                padding: 25px;
                background: white;
                border-radius: 10px;
                box-shadow: 0 3px 10px rgba(0,0,0,0.08);
                margin-bottom: 25px;
            }
            
            .report-header {
                margin-bottom: 25px;
                padding-bottom: 15px;
                border-bottom: 2px solid #f0f0f0;
            }
            
            .report-header h4 {
                margin: 0 0 8px 0;
                color: #2c3e50;
                font-size: 1.4rem;
            }
            
            .report-meta {
                margin: 0;
                color: #6c757d;
                font-size: 0.95rem;
            }
            
            .report-stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 20px;
                margin: 25px 0;
            }
            
            .report-stat {
                text-align: center;
                padding: 20px 15px;
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                border-radius: 8px;
                border-left: 4px solid var(--primary-color, #3498db);
                transition: transform 0.2s, box-shadow 0.2s;
            }
            
            .report-stat:hover {
                transform: translateY(-3px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            }
            
            .report-stat h5 {
                margin: 0 0 10px 0;
                color: #495057;
                font-size: 0.95rem;
                font-weight: 600;
            }
            
            .report-stat h3 {
                margin: 0;
                color: var(--primary-color, #3498db);
                font-size: 2rem;
                font-weight: 700;
            }
            
            .report-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                font-size: 0.9rem;
            }
            
            .report-table th {
                background: #f8f9fa;
                padding: 12px 15px;
                text-align: left;
                font-weight: 600;
                border-bottom: 2px solid #dee2e6;
            }
            
            .report-table td {
                padding: 10px 15px;
                border-bottom: 1px solid #dee2e6;
            }
            
            .report-table tr:hover {
                background: #f8f9fa;
            }
            
            .report-charts {
                margin: 30px 0;
            }
            
            .chart-container {
                position: relative;
                height: 300px;
                margin: 20px 0;
            }
            
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                z-index: 1000;
                animation: slideIn 0.3s ease;
                max-width: 350px;
            }
            
            .notification-success {
                background: #28a745;
                border-left: 4px solid #1e7e34;
            }
            
            .notification-error {
                background: #dc3545;
                border-left: 4px solid #bd2130;
            }
            
            .notification-info {
                background: #17a2b8;
                border-left: 4px solid #117a8b;
            }
            
            .notification-warning {
                background: #ffc107;
                border-left: 4px solid #d39e00;
                color: #212529;
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .notification-hide {
                animation: slideOut 0.3s ease forwards;
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
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            .report-error {
                text-align: center;
                padding: 40px 20px;
                color: #dc3545;
            }
            
            .error-icon {
                font-size: 3rem;
                margin-bottom: 20px;
            }
        `;
        document.head.appendChild(style);
    });
}