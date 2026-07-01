/* 
   ExpenseFlow Dynamic Chart Controller (charts.js)
   Renders and updates Chart.js instances with custom Material 3 theming.
*/

class ChartManager {
    constructor() {
        this.charts = {
            weekly: null,
            category: null,
            mode: null
        };
    }

    // Helper to get active theme text color
    getTextColor() {
        const isDark = document.documentElement.getAttribute('data-theme-mode') === 'dark';
        return isDark ? '#E6E1E5' : '#1D1B20';
    }

    // Dynamic Chart instances reset
    destroyCharts() {
        for (const key in this.charts) {
            if (this.charts[key]) {
                this.charts[key].destroy();
                this.charts[key] = null;
            }
        }
    }

    /* ----------------------------------------------------
       WEEKLY BAR CHART
    ---------------------------------------------------- */
    renderWeeklyChart(canvasId, weeklyData) {
        if (typeof Chart === 'undefined') return;

        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        if (this.charts.weekly) {
            this.charts.weekly.destroy();
        }

        const textColor = this.getTextColor();
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-primary').trim() || '#6750A4';

        const ctx2d = canvas.getContext('2d');
        const gradient = ctx2d.createLinearGradient(0, 0, 0, 150);
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(1, primaryColor + '25'); // Fade to 15% opacity

        this.charts.weekly = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: ['Week 1 (1-7)', 'Week 2 (8-14)', 'Week 3 (15-21)', 'Week 4 (22+)'],
                datasets: [{
                    label: 'Expense Spent',
                    data: weeklyData,
                    backgroundColor: gradient,
                    borderColor: primaryColor,
                    borderWidth: 1.5,
                    borderRadius: 6,
                    maxBarThickness: 28,
                    hoverBackgroundColor: primaryColor
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(29, 27, 32, 0.9)',
                        titleFont: { family: 'Outfit', size: 12 },
                        bodyFont: { family: 'Outfit', size: 13, weight: 'bold' },
                        padding: 10,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: (context) => {
                                const symbol = window.store ? window.store.settings.currency : '$';
                                return ` Spent: ${symbol}${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: textColor,
                            font: { family: 'Outfit', size: 10, weight: '600' }
                        },
                        border: { display: false }
                    },
                    y: {
                        grid: {
                            color: 'rgba(121, 116, 126, 0.1)'
                        },
                        ticks: {
                            color: textColor,
                            font: { family: 'Outfit', size: 10 },
                            callback: (value) => {
                                const symbol = window.store ? window.store.settings.currency : '$';
                                return symbol + value;
                            }
                        },
                        border: { display: false }
                    }
                }
            }
        });
    }

    /* ----------------------------------------------------
       CATEGORY BREAKDOWN DOUGHNUT
    ---------------------------------------------------- */
    renderCategoryChart(canvasId, categoryData) {
        if (typeof Chart === 'undefined') return;

        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.charts.category) {
            this.charts.category.destroy();
        }

        const textColor = this.getTextColor();
        
        // Handle empty categories case
        if (categoryData.length === 0) {
            // Draw dummy empty ring
            categoryData = [{ name: 'No Expenses', amount: 1, color: '#E7E0EC' }];
        }

        const labels = categoryData.map(c => c.name);
        const data = categoryData.map(c => c.amount);
        const colors = categoryData.map(c => c.color);

        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 3,
                    borderColor: getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-surface').trim() || '#FEF7FF',
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(29, 27, 32, 0.9)',
                        titleFont: { family: 'Outfit', size: 12 },
                        bodyFont: { family: 'Outfit', size: 13, weight: 'bold' },
                        padding: 10,
                        cornerRadius: 8,
                        callbacks: {
                            label: (context) => {
                                const symbol = window.store ? window.store.settings.currency : '$';
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const val = context.parsed;
                                const pct = total > 0 ? ((val / total) * 100).toFixed(0) : 0;
                                if (context.label === 'No Expenses') return ' No spending recorded';
                                return ` ${context.label}: ${symbol}${val.toFixed(2)} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    /* ----------------------------------------------------
       PAYMENT MODES DOUGHNUT
    ---------------------------------------------------- */
    renderModeChart(canvasId, modeData) {
        if (typeof Chart === 'undefined') return;

        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.charts.mode) {
            this.charts.mode.destroy();
        }

        if (modeData.length === 0) {
            modeData = [{ name: 'No spends', amount: 1, color: '#E7E0EC' }];
        }

        const labels = modeData.map(m => m.name);
        const data = modeData.map(m => m.amount);
        const colors = modeData.map(m => m.color);

        this.charts.mode = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 3,
                    borderColor: getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-surface').trim() || '#FEF7FF',
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(29, 27, 32, 0.9)',
                        titleFont: { family: 'Outfit', size: 12 },
                        bodyFont: { family: 'Outfit', size: 13, weight: 'bold' },
                        padding: 10,
                        cornerRadius: 8,
                        callbacks: {
                            label: (context) => {
                                const symbol = window.store ? window.store.settings.currency : '$';
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const val = context.parsed;
                                const pct = total > 0 ? ((val / total) * 100).toFixed(0) : 0;
                                if (context.label === 'No spends') return ' No transactions';
                                return ` ${context.label}: ${symbol}${val.toFixed(2)} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}
window.charts = new ChartManager();
