/**
 * Data Visualization with Charts.js for PSN Welfare Reports - Vercel Compatible
 */

class ChartManager {
    constructor() {
        this.charts = new Map();
        this.isInitialized = false;
        this.chartColors = {
            primary: '#2c5aa0',
            secondary: '#34a853',
            accent: '#ff6b35',
            warning: '#f39c12',
            info: '#3498db',
            purple: '#9b59b6',
            teal: '#1abc9c',
            orange: '#e67e22',
            pink: '#e91e63',
            cyan: '#00bcd4'
        };

        // Initialize
        this.initialize();
    }

    // Initialize Charts.js
    initialize() {
        console.log('📊 Initializing chart manager...');

        // Check if Charts.js is already loaded
        if (typeof Chart !== 'undefined') {
            this.isInitialized = true;
            console.log('✅ Charts.js already loaded');
            this.triggerChartsReady();
            return;
        }

        // Load Charts.js dynamically
        this.loadChartJS();
    }

    // Load Charts.js dynamically
    loadChartJS() {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
        script.crossOrigin = 'anonymous';
        script.integrity = 'sha384-3l5L5p5v5p5p5p5p5p5p5p5p5p5p5p5p5p5p5p5p5p5p5p5p5p5p5p5p5p5p5p5p5';
        script.referrerPolicy = 'no-referrer';

        script.onload = () => {
            console.log('✅ Charts.js loaded successfully');
            this.isInitialized = true;
            this.addStyles();
            this.triggerChartsReady();

            // Register any deferred charts
            this.processDeferredCharts();
        };

        script.onerror = (error) => {
            console.error('❌ Failed to load Charts.js:', error);
            showNotification('Failed to load charting library', 'error');
        };

        document.head.appendChild(script);
    }

    // Add chart styles
    addStyles() {
        // Only add styles once
        if (document.getElementById('chart-manager-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'chart-manager-styles';

        styles.textContent = `
            .chart-container {
                position: relative;
                height: 300px;
                width: 100%;
                margin: 20px 0;
                background: white;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                transition: all 0.3s ease;
            }
            
            .chart-container:hover {
                box-shadow: 0 4px 16px rgba(0,0,0,0.15);
            }
            
            .chart-title {
                margin: 0 0 20px 0;
                color: var(--primary-color, #2c5aa0);
                font-size: 1.2rem;
                font-weight: 600;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .chart-actions {
                display: flex;
                gap: 8px;
            }
            
            .chart-action-btn {
                background: none;
                border: 1px solid #e9ecef;
                border-radius: 4px;
                padding: 4px 8px;
                cursor: pointer;
                font-size: 0.8rem;
                color: #6c757d;
                transition: all 0.2s;
            }
            
            .chart-action-btn:hover {
                background: #f8f9fa;
                color: #495057;
            }
            
            .chart-legend {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-top: 20px;
                font-size: 0.9rem;
            }
            
            .legend-item {
                display: flex;
                align-items: center;
                gap: 5px;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
                transition: background 0.2s;
            }
            
            .legend-item:hover {
                background: #f8f9fa;
            }
            
            .legend-color {
                width: 15px;
                height: 15px;
                border-radius: 3px;
                transition: opacity 0.2s;
            }
            
            .legend-item.hidden .legend-color {
                opacity: 0.3;
            }
            
            .legend-item.hidden .legend-label {
                color: #adb5bd;
                text-decoration: line-through;
            }
            
            .chart-toolbar {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-bottom: 10px;
            }
            
            .chart-period-selector {
                display: flex;
                gap: 5px;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }
            
            .period-btn {
                padding: 6px 15px;
                border: 1px solid var(--border-color, #e9ecef);
                background: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9rem;
                transition: all 0.2s;
            }
            
            .period-btn:hover {
                background: #f8f9fa;
            }
            
            .period-btn.active {
                background: var(--primary-color, #2c5aa0);
                color: white;
                border-color: var(--primary-color, #2c5aa0);
            }
            
            .multi-chart-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 20px;
                margin: 20px 0;
            }
            
            .chart-empty-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: #6c757d;
                text-align: center;
                padding: 40px 20px;
            }
            
            .chart-empty-state i {
                font-size: 3rem;
                margin-bottom: 15px;
                color: #adb5bd;
            }
            
            @media (max-width: 768px) {
                .multi-chart-grid {
                    grid-template-columns: 1fr;
                }
                
                .chart-container {
                    height: 250px;
                    padding: 15px;
                }
                
                .chart-title {
                    font-size: 1.1rem;
                }
            }
            
            @media (max-width: 480px) {
                .chart-container {
                    height: 220px;
                }
                
                .chart-legend {
                    font-size: 0.8rem;
                }
            }
        `;

        document.head.appendChild(styles);
    }

    // Trigger charts ready event
    triggerChartsReady() {
        const event = new CustomEvent('chartsReady', {
            detail: { version: Chart.version }
        });
        document.dispatchEvent(event);
        console.log('🚀 Charts ready event triggered');
    }

    // Process deferred charts
    processDeferredCharts() {
        // Check for any charts that need to be created after initialization
        const chartContainers = document.querySelectorAll('[data-chart-type]');
        chartContainers.forEach(container => {
            const type = container.dataset.chartType;
            const data = container.dataset.chartData;

            if (type && data) {
                try {
                    const chartData = JSON.parse(data);
                    this.createChart(container.id, type, chartData);
                } catch (error) {
                    console.error('Failed to parse chart data:', error);
                }
            }
        });
    }

    // Create chart wrapper
    createChart(canvasId, type, data, options = {}) {
        if (!this.isInitialized) {
            console.warn('Charts.js not initialized yet, deferring chart creation');
            this.deferChartCreation(canvasId, type, data, options);
            return null;
        }

        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas element not found: ${canvasId}`);
            return null;
        }

        try {
            // Destroy existing chart if present
            this.destroyChart(canvasId);

            // Create new chart
            const chart = new Chart(canvas, {
                type: type,
                data: data,
                options: this.getChartOptions(type, options)
            });

            this.charts.set(canvasId, chart);

            // Add legend if needed
            if (options.showLegend !== false) {
                this.createLegend(canvasId, chart);
            }

            // Add actions if needed
            if (options.showActions !== false) {
                this.createChartActions(canvasId, chart);
            }

            return chart;

        } catch (error) {
            console.error(`Failed to create chart ${canvasId}:`, error);
            this.showChartError(canvasId, error.message);
            return null;
        }
    }

    // Defer chart creation
    deferChartCreation(canvasId, type, data, options) {
        const canvas = document.getElementById(canvasId);
        if (canvas) {
            canvas.dataset.chartType = type;
            canvas.dataset.chartData = JSON.stringify(data);
            canvas.dataset.chartOptions = JSON.stringify(options);
        }
    }

    // Get chart options based on type
    getChartOptions(type, customOptions = {}) {
        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // We'll create custom legend
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: { size: 14 },
                    bodyFont: { size: 14 },
                    padding: 12,
                    cornerRadius: 6,
                    displayColors: true,
                    callbacks: {}
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        };

        switch (type) {
            case 'bar':
            case 'horizontalBar':
                return {
                    ...baseOptions,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0, 0, 0, 0.05)' },
                            ticks: { font: { size: 12 } }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { font: { size: 12 } }
                        }
                    }
                };

            case 'line':
                return {
                    ...baseOptions,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0, 0, 0, 0.05)' },
                            ticks: { font: { size: 12 } }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { font: { size: 12 } }
                        }
                    }
                };

            case 'pie':
            case 'doughnut':
                return {
                    ...baseOptions,
                    cutout: type === 'doughnut' ? '60%' : 0,
                    plugins: {
                        ...baseOptions.plugins,
                        tooltip: {
                            ...baseOptions.plugins.tooltip,
                            callbacks: {
                                label: function (context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                };

            case 'radar':
                return {
                    ...baseOptions,
                    scales: {
                        r: {
                            angleLines: { display: true },
                            suggestedMin: 0,
                            ticks: { display: false }
                        }
                    }
                };

            default:
                return baseOptions;
        }
    }

    // Create demographic chart
    createDemographicsChart(containerId, data) {
        const chartData = {
            labels: data.labels,
            datasets: [{
                label: data.label || 'Number of Members',
                data: data.values,
                backgroundColor: data.colors || this.generateColors(data.values.length),
                borderColor: '#fff',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            }]
        };

        return this.createChart(containerId, 'bar', chartData, {
            showLegend: true,
            showActions: true
        });
    }

    // Create age distribution chart
    createAgeDistributionChart(containerId, data) {
        const chartData = {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: data.colors || this.generateColors(data.values.length, 0.7),
                borderColor: '#fff',
                borderWidth: 2,
                hoverOffset: 15
            }]
        };

        return this.createChart(containerId, 'doughnut', chartData, {
            showLegend: true,
            showActions: true
        });
    }

    // Create monthly celebrations chart
    createMonthlyCelebrationsChart(containerId, data) {
        const chartData = {
            labels: data.months,
            datasets: [
                {
                    label: 'Birthdays',
                    data: data.birthdays,
                    borderColor: this.chartColors.primary,
                    backgroundColor: this.transparentize(this.chartColors.primary, 0.1),
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Anniversaries',
                    data: data.anniversaries,
                    borderColor: this.chartColors.secondary,
                    backgroundColor: this.transparentize(this.chartColors.secondary, 0.1),
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }
            ]
        };

        return this.createChart(containerId, 'line', chartData, {
            showLegend: true,
            showActions: true
        });
    }

    // Create reminder performance chart
    createReminderPerformanceChart(containerId, data) {
        const chartData = {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: this.generateColors(data.values.length, 0.7),
                borderColor: this.generateColors(data.values.length),
                borderWidth: 2
            }]
        };

        return this.createChart(containerId, 'polarArea', chartData, {
            showLegend: true,
            showActions: true
        });
    }

    // Create member growth chart
    createMemberGrowthChart(containerId, data) {
        const chartData = {
            labels: data.labels,
            datasets: [
                {
                    label: 'New Members',
                    data: data.newMembers,
                    backgroundColor: this.transparentize(this.chartColors.primary, 0.7),
                    borderColor: this.chartColors.primary,
                    borderWidth: 1,
                    borderRadius: 6
                },
                {
                    label: 'Total Members',
                    data: data.totalMembers,
                    type: 'line',
                    borderColor: this.chartColors.secondary,
                    borderWidth: 3,
                    tension: 0.4,
                    fill: false
                }
            ]
        };

        return this.createChart(containerId, 'bar', chartData, {
            showLegend: true,
            showActions: true
        });
    }

    // Create activity chart
    createActivityChart(containerId, data) {
        const chartData = {
            labels: data.labels,
            datasets: [
                {
                    label: 'This Week',
                    data: data.thisWeek,
                    borderColor: this.chartColors.primary,
                    backgroundColor: this.transparentize(this.chartColors.primary, 0.2),
                    borderWidth: 2
                },
                {
                    label: 'Last Week',
                    data: data.lastWeek,
                    borderColor: this.chartColors.secondary,
                    backgroundColor: this.transparentize(this.chartColors.secondary, 0.2),
                    borderWidth: 2
                }
            ]
        };

        return this.createChart(containerId, 'radar', chartData, {
            showLegend: true,
            showActions: true
        });
    }

    // Create dashboard summary charts
    createDashboardCharts(containerId, stats) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Clear container
        container.innerHTML = '';

        // Create chart grid
        const grid = document.createElement('div');
        grid.className = 'multi-chart-grid';

        // Define charts to create
        const chartDefinitions = [
            {
                id: 'memberGrowthChart',
                title: 'Member Growth Trend',
                type: 'memberGrowth',
                data: stats.memberGrowth || this.getSampleMemberGrowthData()
            },
            {
                id: 'monthlyCelebrationsChart',
                title: 'Monthly Celebrations',
                type: 'monthlyCelebrations',
                data: stats.monthlyCelebrations || this.getSampleMonthlyCelebrationsData()
            },
            {
                id: 'reminderPerformanceChart',
                title: 'Reminder Performance',
                type: 'reminderPerformance',
                data: stats.reminderPerformance || this.getSampleReminderPerformanceData()
            },
            {
                id: 'ageDistributionChart',
                title: 'Age Distribution',
                type: 'ageDistribution',
                data: stats.ageDistribution || this.getSampleAgeDistributionData()
            }
        ];

        // Create each chart
        chartDefinitions.forEach(def => {
            const chartContainer = this.createChartContainer(def.id, def.title);
            const canvas = document.createElement('canvas');
            canvas.id = def.id;
            chartContainer.appendChild(canvas);
            grid.appendChild(chartContainer);
        });

        container.appendChild(grid);

        // Initialize charts after DOM is ready
        setTimeout(() => {
            chartDefinitions.forEach(def => {
                switch (def.type) {
                    case 'memberGrowth':
                        this.createMemberGrowthChart(def.id, def.data);
                        break;
                    case 'monthlyCelebrations':
                        this.createMonthlyCelebrationsChart(def.id, def.data);
                        break;
                    case 'reminderPerformance':
                        this.createReminderPerformanceChart(def.id, def.data);
                        break;
                    case 'ageDistribution':
                        this.createAgeDistributionChart(def.id, def.data);
                        break;
                }
            });
        }, 100);
    }

    // Create chart container
    createChartContainer(chartId, title) {
        const container = document.createElement('div');
        container.className = 'chart-container';
        container.id = `${chartId}Container`;

        const titleElement = document.createElement('div');
        titleElement.className = 'chart-title';
        titleElement.innerHTML = `
            <span>${title}</span>
            <div class="chart-actions" id="${chartId}Actions"></div>
        `;

        container.appendChild(titleElement);
        return container;
    }

    // Create chart legend
    createLegend(chartId, chart) {
        const chartContainer = document.getElementById(`${chartId}Container`);
        if (!chartContainer) return;

        // Remove existing legend
        const existingLegend = chartContainer.querySelector('.chart-legend');
        if (existingLegend) existingLegend.remove();

        const legendContainer = document.createElement('div');
        legendContainer.className = 'chart-legend';
        legendContainer.id = `${chartId}Legend`;

        const datasets = chart.data.datasets;
        datasets.forEach((dataset, index) => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.dataset.datasetIndex = index;

            const color = dataset.backgroundColor || dataset.borderColor || '#cccccc';
            const colorStyle = Array.isArray(color) ? color[0] : color;

            legendItem.innerHTML = `
                <div class="legend-color" style="background-color: ${colorStyle};"></div>
                <span class="legend-label">${dataset.label || `Dataset ${index + 1}`}</span>
            `;

            legendItem.addEventListener('click', () => {
                const meta = chart.getDatasetMeta(index);
                meta.hidden = meta.hidden === null ? !chart.data.datasets[index].hidden : null;
                chart.update();
                legendItem.classList.toggle('hidden', meta.hidden);
            });

            legendContainer.appendChild(legendItem);
        });

        chartContainer.appendChild(legendContainer);
    }

    // Create chart actions
    createChartActions(chartId, chart) {
        const actionsContainer = document.getElementById(`${chartId}Actions`);
        if (!actionsContainer) return;

        actionsContainer.innerHTML = `
            <button class="chart-action-btn" title="Export as PNG" data-action="export-png">
                <i class="fas fa-download"></i>
            </button>
            <button class="chart-action-btn" title="Refresh Data" data-action="refresh">
                <i class="fas fa-sync-alt"></i>
            </button>
            <button class="chart-action-btn" title="Toggle Fullscreen" data-action="fullscreen">
                <i class="fas fa-expand"></i>
            </button>
        `;

        // Add event listeners
        actionsContainer.querySelector('[data-action="export-png"]').addEventListener('click', () => {
            this.exportChart(chartId, 'png');
        });

        actionsContainer.querySelector('[data-action="refresh"]').addEventListener('click', () => {
            this.refreshChart(chartId);
        });

        actionsContainer.querySelector('[data-action="fullscreen"]').addEventListener('click', () => {
            this.toggleFullscreen(chartId);
        });
    }

    // Export chart as image
    exportChart(chartId, format = 'png', quality = 1.0) {
        const chart = this.charts.get(chartId);
        if (!chart) {
            showNotification('Chart not found', 'error');
            return null;
        }

        try {
            const canvas = chart.canvas;
            const link = document.createElement('a');
            const filename = `chart-${chartId}-${new Date().toISOString().split('T')[0]}.${format}`;

            link.download = filename;
            link.href = canvas.toDataURL(`image/${format}`, quality);
            link.click();

            // Log export
            if (typeof AuditLogger !== 'undefined') {
                AuditLogger.logAction('CHART_EXPORTED', {
                    chartId: chartId,
                    format: format,
                    filename: filename
                }, 'low');
            }

            showNotification(`Chart exported as ${format.toUpperCase()}`, 'success');
            return link.href;

        } catch (error) {
            console.error('Export error:', error);
            showNotification('Failed to export chart', 'error');
            return null;
        }
    }

    // Export all charts as images
    exportAllCharts(format = 'png') {
        const charts = Array.from(this.charts.values());
        if (charts.length === 0) {
            showNotification('No charts to export', 'warning');
            return;
        }

        showNotification(`Exporting ${charts.length} charts...`, 'info');

        charts.forEach((chart, index) => {
            setTimeout(() => {
                const chartId = Array.from(this.charts.entries()).find(([id, c]) => c === chart)?.[0];
                if (chartId) {
                    this.exportChart(chartId, format);
                }
            }, index * 500);
        });
    }

    // Refresh chart data
    async refreshChart(chartId) {
        const chart = this.charts.get(chartId);
        if (!chart) return;

        showNotification('Refreshing chart data...', 'info');

        try {
            // Simulate data refresh (in production, this would fetch from API)
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Update chart with new data
            // This would be replaced with actual API call
            const newData = this.getSampleDataForChart(chartId);
            chart.data = newData;
            chart.update();

            showNotification('Chart data refreshed', 'success');

        } catch (error) {
            console.error('Refresh error:', error);
            showNotification('Failed to refresh chart data', 'error');
        }
    }

    // Toggle fullscreen for chart
    toggleFullscreen(chartId) {
        const chartContainer = document.getElementById(`${chartId}Container`);
        if (!chartContainer) return;

        if (!document.fullscreenElement) {
            if (chartContainer.requestFullscreen) {
                chartContainer.requestFullscreen();
            } else if (chartContainer.webkitRequestFullscreen) {
                chartContainer.webkitRequestFullscreen();
            } else if (chartContainer.msRequestFullscreen) {
                chartContainer.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }

    // Update chart data
    updateChart(chartId, newData) {
        const chart = this.charts.get(chartId);
        if (!chart) return;

        chart.data = newData;
        chart.update();
    }

    // Destroy chart
    destroyChart(chartId) {
        const chart = this.charts.get(chartId);
        if (chart) {
            chart.destroy();
            this.charts.delete(chartId);

            // Remove legend and actions
            const chartContainer = document.getElementById(`${chartId}Container`);
            if (chartContainer) {
                const legend = chartContainer.querySelector('.chart-legend');
                if (legend) legend.remove();

                const actions = chartContainer.querySelector('.chart-actions');
                if (actions) actions.innerHTML = '';
            }
        }
    }

    // Destroy all charts
    destroyAllCharts() {
        this.charts.forEach((chart, chartId) => {
            chart.destroy();
        });
        this.charts.clear();
    }

    // Show chart error
    showChartError(canvasId, errorMessage) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const container = canvas.closest('.chart-container');
        if (!container) return;

        container.innerHTML = `
            <div class="chart-empty-state">
                <i class="fas fa-chart-line"></i>
                <h4>Chart Error</h4>
                <p>${errorMessage}</p>
                <button class="btn btn-outline btn-sm mt-2" onclick="chartManager.retryChart('${canvasId}')">
                    Retry
                </button>
            </div>
        `;
    }

    // Retry chart creation
    retryChart(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const container = canvas.closest('.chart-container');
        if (!container) return;

        // Restore original canvas
        container.innerHTML = `<canvas id="${canvasId}"></canvas>`;

        // Try to recreate chart from data attributes
        const type = canvas.dataset.chartType;
        const data = canvas.dataset.chartData;
        const options = canvas.dataset.chartOptions;

        if (type && data) {
            try {
                const chartData = JSON.parse(data);
                const chartOptions = options ? JSON.parse(options) : {};
                this.createChart(canvasId, type, chartData, chartOptions);
            } catch (error) {
                console.error('Failed to recreate chart:', error);
            }
        }
    }

    // Helper: Generate colors
    generateColors(count, alpha = 1) {
        const colors = Object.values(this.chartColors);
        const result = [];

        for (let i = 0; i < count; i++) {
            const color = colors[i % colors.length];
            result.push(alpha < 1 ? this.transparentize(color, alpha) : color);
        }

        return result;
    }

    // Helper: Create transparent color
    transparentize(color, alpha) {
        if (color.startsWith('rgba')) return color;

        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Sample data for demos
    getSampleMemberGrowthData() {
        return {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            newMembers: [15, 22, 18, 25, 30, 28],
            totalMembers: [120, 142, 160, 185, 215, 243]
        };
    }

    getSampleMonthlyCelebrationsData() {
        return {
            months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            birthdays: [8, 12, 10, 15, 18, 14],
            anniversaries: [5, 7, 6, 9, 11, 8]
        };
    }

    getSampleReminderPerformanceData() {
        return {
            labels: ['Sent', 'Delivered', 'Opened', 'Clicked'],
            values: [95, 92, 78, 45]
        };
    }

    getSampleAgeDistributionData() {
        return {
            labels: ['18-25', '26-35', '36-45', '46-55', '56-65', '65+'],
            values: [15, 42, 68, 45, 22, 8]
        };
    }

    // Get sample data for specific chart
    getSampleDataForChart(chartId) {
        if (chartId.includes('Growth')) {
            return this.getSampleMemberGrowthData();
        } else if (chartId.includes('Celebrations')) {
            return this.getSampleMonthlyCelebrationsData();
        } else if (chartId.includes('Performance')) {
            return this.getSampleReminderPerformanceData();
        } else if (chartId.includes('Distribution')) {
            return this.getSampleAgeDistributionData();
        }

        return null;
    }
}

// Create global chart manager instance
const chartManager = new ChartManager();

// Export for use in other modules
window.chartManager = chartManager;

// Initialize charts when Charts.js is loaded
if (typeof Chart !== 'undefined') {
    chartManager.triggerChartsReady();
} else {
    document.addEventListener('chartsReady', () => {
        console.log('Charts.js ready, initializing charts...');
    });
}