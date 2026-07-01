/* 
   ExpenseFlow UI Orchestrator (ui.js)
   Manages tab navigation, bottom sheet panels, dynamic list render engines, form bindings, and system themes.
*/

class AppUI {
    constructor() {
        this.activeView = 'home';
        this.activeFormType = 'expense'; // 'expense' | 'income'
        this.selectedCategory = '';
        this.selectedMode = 'Cash';
        this.activeFilter = 'all';
        this.activeAnalyticsMonth = '';
        this.undoStack = null; // Single undo slot for deleting transactions
        this.editingTransactionId = null; // Stored transaction ID when editing
        
        this.initDOMElements();
        this.bindEvents();
        this.startAndroidClock();
    }

    initDOMElements() {
        // Core Layout
        this.views = {
            home: document.getElementById('view-home'),
            transactions: document.getElementById('view-transactions'),
            analytics: document.getElementById('view-analytics'),
            settings: document.getElementById('view-settings')
        };
        this.navItems = document.querySelectorAll('.bottom-nav .nav-item');
        this.mainFab = document.getElementById('main-fab');

        // Form Sheet
        this.addSheet = document.getElementById('add-entry-sheet');
        this.closeSheetBtn = document.getElementById('close-sheet-btn');
        this.sheetBackdrop = document.getElementById('add-sheet-backdrop');
        this.sheetTitle = document.getElementById('sheet-title');
        this.toggleExpense = document.getElementById('toggle-type-expense');
        this.toggleIncome = document.getElementById('toggle-type-income');
        
        // Form Fields
        this.entryForm = document.getElementById('entry-form');
        this.entryAmount = document.getElementById('entry-amount');
        this.entryDate = document.getElementById('entry-date');
        this.entryNote = document.getElementById('entry-note');
        this.formCategoryChips = document.getElementById('form-category-chips');
        this.formModeChips = document.getElementById('form-mode-chips');
        this.formModeGroup = document.getElementById('form-mode-group');
        this.addCustomCatBtn = document.getElementById('add-custom-cat-btn');

        // Dynamic Custom Card & Category Input Elements
        this.cardNameGroup = document.getElementById('form-card-name-group');
        this.entryCardName = document.getElementById('entry-card-name');
        this.customCategoryGroup = document.getElementById('form-custom-category-group');
        this.entryCustomCategory = document.getElementById('entry-custom-category');
        this.exportExcelBtn = document.getElementById('analytics-export-excel-btn');
        this.pwaIconsBtn = document.getElementById('settings-pwa-icons-btn');
        this.balanceVisibilityBtn = document.getElementById('balance-visibility-btn');
        
        // Investments & Dash elements
        this.dashInvestments = document.getElementById('dash-investments');
        this.entryIsInvestment = document.getElementById('entry-is-investment');

        // Overlays
        this.genericDialog = document.getElementById('generic-dialog');
        this.confirmDialog = document.getElementById('confirm-dialog');
        this.snackbar = document.getElementById('app-snackbar');

        // Details bottom-sheet overlay
        this.detailsSheet = document.getElementById('details-entry-sheet');
        this.detailsBackdrop = document.getElementById('details-sheet-backdrop');
        this.closeDetailsBtn = document.getElementById('close-details-btn');
        this.detailsType = document.getElementById('details-type');
        this.detailsAmount = document.getElementById('details-amount');
        this.detailsDate = document.getElementById('details-date');
        this.detailsCategory = document.getElementById('details-category');
        this.detailsCatIcon = document.getElementById('details-cat-icon');
        this.detailsMode = document.getElementById('details-mode');
        this.detailsModeItem = document.getElementById('details-mode-item');
        this.detailsModeIcon = document.getElementById('details-mode-icon');
        this.detailsNotes = document.getElementById('details-notes');
        this.detailsNotesItem = document.getElementById('details-notes-item');
        this.detailsInvestmentBadgeItem = document.getElementById('details-investment-badge-item');
        this.detailsDuplicateBtn = document.getElementById('details-duplicate-btn');
        this.detailsEditBtn = document.getElementById('details-edit-btn');
        this.detailsDeleteBtn = document.getElementById('details-delete-btn');

        // Theme Switcher buttons
        this.themeChips = document.querySelectorAll('.theme-picker .theme-chip');
        this.headerThemeBtn = document.getElementById('theme-toggle-btn');
    }

    formatAmount(amount, showSign = false, signText = '') {
        const symbol = window.store.settings.currency;
        if (window.store.settings.privacyMode) {
            return `${showSign ? signText : ''}${symbol}••••`;
        }
        return `${showSign ? signText : ''}${symbol}${parseFloat(amount).toFixed(2)}`;
    }

    startAndroidClock() {
        const clockEl = document.getElementById('status-time');
        const updateTime = () => {
            const now = new Date();
            let hrs = now.getHours();
            let mins = now.getMinutes();
            // Pad 0
            hrs = hrs < 10 ? '0' + hrs : hrs;
            mins = mins < 10 ? '0' + mins : mins;
            if (clockEl) clockEl.textContent = `${hrs}:${mins}`;
        };
        updateTime();
        setInterval(updateTime, 1000);
    }

    /* ----------------------------------------------------
       VIEW ROUTER
    ---------------------------------------------------- */
    switchToView(viewName) {
        if (!this.views[viewName]) return;
        
        this.activeView = viewName;
        
        // Toggle view visibility classes
        for (const view in this.views) {
            if (view === viewName) {
                this.views[view].classList.add('active');
            } else {
                this.views[view].classList.remove('active');
            }
        }

        // Toggle navigation active highlights
        this.navItems.forEach(item => {
            if (item.getAttribute('data-target') === viewName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Toggle FAB size/presence on scrollable views
        if (viewName === 'settings' || viewName === 'analytics') {
            this.mainFab.style.transform = 'translateX(-50%) scale(0)';
            this.mainFab.style.pointerEvents = 'none';
        } else {
            this.mainFab.style.transform = 'translateX(-50%) scale(1)';
            this.mainFab.style.pointerEvents = 'auto';
        }

        // Trigger updates depending on view
        this.refreshActiveViewData();
    }

    refreshActiveViewData() {
        if (this.activeView === 'home') {
            this.renderDashboard();
        } else if (this.activeView === 'transactions') {
            this.renderTransactionsList();
        } else if (this.activeView === 'analytics') {
            this.populateAnalyticsMonths();
            this.renderAnalytics();
        } else if (this.activeView === 'settings') {
            this.renderSettings();
        }
    }

    /* ----------------------------------------------------
       DASHBOARD POPULATORS
    ---------------------------------------------------- */
    renderDashboard() {
        const currentMonthStr = new Date().toISOString().substring(0, 7); // 'YYYY-MM'
        const stats = window.store.getOverallSummary(currentMonthStr);
        const symbol = window.store.settings.currency;

        // Privacy eye icon state selector
        if (this.balanceVisibilityBtn) {
            const eyeIcon = this.balanceVisibilityBtn.querySelector('.material-symbols-outlined');
            if (eyeIcon) {
                eyeIcon.textContent = window.store.settings.privacyMode ? 'visibility_off' : 'visibility';
            }
        }

        // Header and Balance Panel
        document.getElementById('header-username').textContent = window.store.settings.username;
        document.getElementById('header-avatar').textContent = window.store.settings.username.substring(0,2).toUpperCase();
        
        const balanceEl = document.getElementById('dash-balance');
        balanceEl.textContent = this.formatAmount(Math.abs(stats.balance), stats.balance < 0, '-');
        document.getElementById('dash-income').textContent = this.formatAmount(stats.totalIncome, true, '+');
        document.getElementById('dash-expense').textContent = this.formatAmount(stats.totalExpense, true, '-');
        if (this.dashInvestments) {
            this.dashInvestments.textContent = this.formatAmount(stats.totalInvestments);
        }
        
        // Savings Progress
        const pct = Math.min(100, Math.max(0, Math.round(stats.savingsRate)));
        document.getElementById('dash-savings-pct').textContent = `${pct}%`;
        document.getElementById('dash-savings-bar').style.width = `${pct}%`;
        
        // Daily average & Main spend mode
        document.getElementById('dash-daily-avg').textContent = this.formatAmount(stats.dailyAvg);
        document.getElementById('dash-main-mode').textContent = stats.mainMode;

        // Recent items list
        const recentList = document.getElementById('dash-recent-list');
        const recent = window.store.getRecentTransactions(5);
        
        if (recent.length === 0) {
            recentList.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-outlined empty-icon">receipt_long</span>
                    <p>No transactions recorded yet.</p>
                    <button class="btn btn-tonal ripple" onclick="window.ui.openAddDialog('expense')">Add Transaction</button>
                </div>
            `;
            return;
        }

        recentList.innerHTML = '';
        recent.forEach(t => {
            recentList.appendChild(this.createTransactionTile(t));
        });
    }

    createTransactionTile(t) {
        const categoryObj = window.store.getCategoryById(t.category, t.type);

        const tile = document.createElement('div');
        tile.className = 'transaction-tile ripple';
        
        // Tap-to-view details overlay
        tile.addEventListener('click', () => {
            this.openDetailsDialog(t.id);
        });
        
        // Format Date
        const dateObj = new Date(t.date);
        const day = dateObj.getDate();
        const month = dateObj.toLocaleDateString('en-US', { month: 'short' });

        // Card name visual modifier
        let modeDisplay = t.mode || 'Cash';
        if (t.type === 'expense' && t.mode === 'Card' && t.cardName) {
            modeDisplay = `Card (${t.cardName})`;
        }
        
        // Determine vector icon
        const iconName = t.mode === 'Card' ? 'credit_card' 
            : t.mode === 'UPI' ? 'qr_code_2' 
            : t.mode === 'Bank' ? 'account_balance' 
            : t.mode === 'Amazon Pay' ? 'shopping_bag' 
            : t.mode === 'Voucher' ? 'card_giftcard' 
            : 'payments';
            
        // Show investment badge if marked
        let investmentBadge = '';
        if (t.isInvestment) {
            investmentBadge = `<span class="tile-investment-badge"><span class="material-symbols-outlined" style="font-size: 10px; vertical-align: middle; margin-right: 2px;">trending_up</span>Invest</span>`;
        }
        
        tile.innerHTML = `
            <div class="tile-left">
                <div class="tile-icon-box ${t.type}" style="background-color: ${categoryObj.color}25; color: ${categoryObj.color}">
                    <span class="material-symbols-outlined tile-icon">${categoryObj.icon}</span>
                </div>
                <div class="tile-info">
                    <span class="tile-title" style="display: flex; align-items: center; gap: 4px;">
                        ${t.note || categoryObj.name}
                        ${investmentBadge}
                    </span>
                    <span class="tile-sub">
                        <span class="material-symbols-outlined" style="font-size:12px;">calendar_today</span> ${day} ${month}
                        &bull; <span class="material-symbols-outlined" style="font-size:12px;">${iconName}</span> ${modeDisplay}
                    </span>
                </div>
            </div>
            <div class="tile-right">
                <span class="tile-amount ${t.type}">
                    ${this.formatAmount(t.amount, true, t.type === 'income' ? '+' : '-')}
                </span>
                <button class="icon-btn delete-tile-btn ripple" title="Delete record" onclick="event.stopPropagation(); window.ui.triggerDelete('${t.id}')">
                    <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
                </button>
            </div>
        `;
        return tile;
    }

    openDetailsDialog(id) {
        const tx = window.store.transactions.find(t => t.id === id);
        if (!tx) return;

        this.selectedDetailsId = tx.id;
        
        // Populating text
        this.detailsType.textContent = tx.type.toUpperCase();
        this.detailsType.className = `details-type-lbl ${tx.type}`;
        
        this.detailsAmount.textContent = this.formatAmount(tx.amount, true, tx.type === 'income' ? '+' : '-');
        this.detailsAmount.className = `details-amount ${tx.type}`;
        
        const dateObj = new Date(tx.date);
        this.detailsDate.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        
        const categoryObj = window.store.getCategoryById(tx.category, tx.type);
        this.detailsCategory.textContent = categoryObj.name;
        this.detailsCatIcon.textContent = categoryObj.icon;
        this.detailsCatIcon.style.color = categoryObj.color;
        this.detailsCatIcon.style.backgroundColor = `${categoryObj.color}15`;

        if (tx.type === 'expense') {
            this.detailsModeItem.style.display = 'flex';
            let modeDisplay = tx.mode || 'Cash';
            if (tx.mode === 'Card' && tx.cardName) {
                modeDisplay = `Card (${tx.cardName})`;
            }
            this.detailsMode.textContent = modeDisplay;
            
            const iconName = tx.mode === 'Card' ? 'credit_card' 
                : tx.mode === 'UPI' ? 'qr_code_2' 
                : tx.mode === 'Bank' ? 'account_balance' 
                : tx.mode === 'Amazon Pay' ? 'shopping_bag' 
                : tx.mode === 'Voucher' ? 'card_giftcard' 
                : 'payments';
            this.detailsModeIcon.textContent = iconName;
        } else {
            this.detailsModeItem.style.display = 'none';
        }

        if (tx.note && tx.note.trim()) {
            this.detailsNotesItem.style.display = 'flex';
            this.detailsNotes.textContent = tx.note;
        } else {
            this.detailsNotesItem.style.display = 'none';
        }

        if (tx.isInvestment) {
            this.detailsInvestmentBadgeItem.style.display = 'flex';
        } else {
            this.detailsInvestmentBadgeItem.style.display = 'none';
        }

        this.detailsSheet.classList.add('open');
    }

    closeDetailsDialog() {
        if (this.detailsSheet) {
            this.detailsSheet.classList.remove('open');
        }
        this.selectedDetailsId = null;
    }

    triggerDelete(id) {
        const deleted = window.store.deleteTransaction(id);
        if (deleted) {
            this.refreshActiveViewData();
            
            // Undo Snackbar capability
            this.undoStack = deleted;
            this.showSnackbar(`Transaction deleted`, "Undo", () => {
                if (this.undoStack) {
                    window.store.addTransaction(this.undoStack);
                    this.undoStack = null;
                    this.refreshActiveViewData();
                    this.showSnackbar(`Restored deleted entry`);
                }
            });
        }
    }

    /* ----------------------------------------------------
       TRANSACTIONS FILTER & SEARCH ENGINE
    ---------------------------------------------------- */
    renderTransactionsList() {
        const filterChips = document.querySelectorAll('.filters-scroll .filter-chip');
        filterChips.forEach(chip => {
            if (chip.getAttribute('data-filter') === this.activeFilter) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });

        const searchQuery = document.getElementById('tx-search-input').value;
        const listEl = document.getElementById('tx-full-list');
        const list = window.store.getAllTransactionsFiltered(this.activeFilter, searchQuery);

        const clearBtn = document.getElementById('tx-search-clear');
        clearBtn.style.display = searchQuery ? 'flex' : 'none';

        if (list.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-outlined empty-icon">search_off</span>
                    <p>No records found matching filters.</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = '';
        
        // Group by Date for high premium chronological visual mapping
        let lastDateHeader = '';
        const todayStr = new Date().toISOString().substring(0, 10);
        const yesterdayObj = new Date();
        yesterdayObj.setDate(yesterdayObj.getDate() - 1);
        const yesterdayStr = yesterdayObj.toISOString().substring(0, 10);

        list.forEach(t => {
            if (t.date !== lastDateHeader) {
                lastDateHeader = t.date;
                const header = document.createElement('div');
                header.className = 'list-group-header';
                
                if (t.date === todayStr) {
                    header.textContent = 'Today';
                } else if (t.date === yesterdayStr) {
                    header.textContent = 'Yesterday';
                } else {
                    const dateObj = new Date(t.date);
                    header.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
                }
                listEl.appendChild(header);
            }
            listEl.appendChild(this.createTransactionTile(t));
        });
    }

    /* ----------------------------------------------------
       ANALYTICS POPULATORS
    ---------------------------------------------------- */
    populateAnalyticsMonths() {
        const select = document.getElementById('analytics-month-select');
        const months = window.store.getAvailableMonths();
        
        // If months haven't changed, skip rebuild to preserve selection
        const existingVal = select.value;
        select.innerHTML = '';
        
        months.forEach(m => {
            const date = new Date(m + '-02'); // Add buffer to avoid local time zone shifts
            const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = label;
            select.appendChild(opt);
        });

        // Try restoring selection
        if (existingVal && months.includes(existingVal)) {
            select.value = existingVal;
        } else {
            select.value = months[0];
        }
        
        this.activeAnalyticsMonth = select.value;
    }

    renderAnalytics() {
        const monthVal = this.activeAnalyticsMonth;
        if (!monthVal) return;

        const data = window.store.getMonthSummary(monthVal);

        // Statistics sheet updates
        document.getElementById('analytics-budget-val').textContent = this.formatAmount(window.store.settings.budget);
        
        const leftValEl = document.getElementById('analytics-left-val');
        leftValEl.textContent = this.formatAmount(data.remainingBudget);
        if (data.remainingBudget <= 0) {
            leftValEl.style.color = 'var(--md-sys-color-error)';
        } else {
            leftValEl.style.color = 'inherit';
        }

        // 1. Weekly Chart Rendering
        window.charts.renderWeeklyChart('weeklySpendsChart', data.weeklySpends);
        const weeklyDetailsList = document.getElementById('weekly-details-list');
        weeklyDetailsList.innerHTML = '';
        
        const weeks = ['Week 1 (1-7)', 'Week 2 (8-14)', 'Week 3 (15-21)', 'Week 4 (22+)'];
        data.weeklySpends.forEach((val, idx) => {
            const tile = document.createElement('div');
            tile.className = 'weekly-bar-tile';
            tile.innerHTML = `
                <div class="weekly-tile-left">
                    <span class="material-symbols-outlined" style="font-size: 16px; color: var(--md-sys-color-primary);">calendar_view_week</span>
                    <span>${weeks[idx]}</span>
                </div>
                <div class="weekly-tile-right">${this.formatAmount(val)}</div>
            `;
            weeklyDetailsList.appendChild(tile);
        });

        // 2. Category Pie Chart & Custom Legend
        window.charts.renderCategoryChart('categorySpendsChart', data.categorySpends);
        const catLegendList = document.getElementById('category-legend-list');
        catLegendList.innerHTML = '';
        
        if (data.categorySpends.length === 0) {
            catLegendList.innerHTML = '<p style="grid-column: 1/-1; text-align:center; font-size:11px; opacity:0.6;">No expenses recorded.</p>';
        } else {
            data.categorySpends.forEach(c => {
                const item = document.createElement('div');
                item.className = 'legend-item';
                item.innerHTML = `
                    <div class="legend-dot" style="background-color: ${c.color}"></div>
                    <div class="legend-txt">
                        <span class="legend-lbl">${c.name}</span>
                        <span class="legend-val">${this.formatAmount(c.amount)}</span>
                    </div>
                `;
                catLegendList.appendChild(item);
            });
        }

        // 3. Payment Mode Chart & Legend
        window.charts.renderModeChart('modeSpendsChart', data.modeSpends);
        const modeLegendList = document.getElementById('mode-legend-list');
        modeLegendList.innerHTML = '';
        
        if (data.modeSpends.length === 0) {
            modeLegendList.innerHTML = '<p style="grid-column: 1/-1; text-align:center; font-size:11px; opacity:0.6;">No transactions.</p>';
        } else {
            data.modeSpends.forEach(m => {
                const item = document.createElement('div');
                item.className = 'legend-item';
                item.innerHTML = `
                    <div class="legend-dot" style="background-color: ${m.color}"></div>
                    <div class="legend-txt">
                        <span class="legend-lbl">${m.name}</span>
                        <span class="legend-val">${this.formatAmount(m.amount)}</span>
                    </div>
                `;
                modeLegendList.appendChild(item);
            });
        }
    }

    /* ----------------------------------------------------
       SETTINGS RENDERERS
    ---------------------------------------------------- */
    renderSettings() {
        const symbol = window.store.settings.currency;
        document.getElementById('settings-username-desc').textContent = window.store.settings.username;
        document.getElementById('settings-currency-desc').textContent = `${symbol} (${window.store.settings.currencyName})`;
        document.getElementById('settings-budget-desc').textContent = `${symbol}${window.store.settings.budget.toFixed(2)}`;

        // Set theme active chip
        this.themeChips.forEach(chip => {
            if (chip.getAttribute('data-theme') === window.store.settings.theme) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
    }

    /* ----------------------------------------------------
       BOTTOM SHEET CREATOR DRAWER
    ---------------------------------------------------- */
    openAddDialog(type = 'expense') {
        this.editingTransactionId = null;
        this.activeFormType = type;
        this.selectedMode = 'Cash';
        
        // Reset Inputs
        this.entryAmount.value = '';
        this.entryNote.value = '';
        this.entryCardName.value = '';
        this.cardNameGroup.style.display = 'none';
        this.entryCustomCategory.value = '';
        this.customCategoryGroup.style.display = 'none';
        if (this.entryIsInvestment) {
            this.entryIsInvestment.checked = false;
        }
        
        // Set standard today date
        const today = new Date().toISOString().substring(0, 10);
        this.entryDate.value = today;

        // Toggle labels
        if (type === 'expense') {
            this.sheetTitle.textContent = 'Add Expense';
            this.toggleExpense.classList.add('active');
            this.toggleIncome.classList.remove('active');
            this.formModeGroup.style.display = 'flex'; // Show pay modes
        } else {
            this.sheetTitle.textContent = 'Add Income';
            this.toggleExpense.classList.remove('active');
            this.toggleIncome.classList.add('active');
            this.formModeGroup.style.display = 'none'; // Hide pay modes for income
        }

        // Set currency label
        document.getElementById('form-currency-symbol').textContent = window.store.settings.currency;

        this.renderCategoryChips();
        this.renderModeChips();
        
        // Change Action button back to standard
        const submitBtn = document.getElementById('entry-submit-btn');
        submitBtn.innerHTML = `<span class="material-symbols-outlined">check</span> Save Transaction`;
        
        // Open
        this.addSheet.classList.add('open');
        setTimeout(() => this.entryAmount.focus(), 150);
    }

    closeAddDialog() {
        this.addSheet.classList.remove('open');
        // Unfocus active inputs to prevent keyboard popups on mobile
        document.activeElement.blur();
    }

    openEditDialog(id) {
        const tx = window.store.transactions.find(t => t.id === id);
        if (!tx) return;

        this.closeDetailsDialog(); // Close details pane when opening editor

        this.editingTransactionId = tx.id;
        this.activeFormType = tx.type;
        this.selectedMode = tx.mode || 'Cash';
        
        // Form pre-populating
        this.entryAmount.value = tx.amount;
        this.entryNote.value = tx.note || '';
        this.entryDate.value = tx.date;
        if (this.entryIsInvestment) {
            this.entryIsInvestment.checked = !!tx.isInvestment;
        }

        // Toggle Sheet UI elements
        if (tx.type === 'expense') {
            this.sheetTitle.textContent = 'Edit Expense';
            this.toggleExpense.classList.add('active');
            this.toggleIncome.classList.remove('active');
            this.formModeGroup.style.display = 'flex';
            
            // Handle Card name visibility
            if (tx.mode === 'Card') {
                this.cardNameGroup.style.display = 'flex';
                this.entryCardName.value = tx.cardName || '';
            } else {
                this.cardNameGroup.style.display = 'none';
                this.entryCardName.value = '';
            }
        } else {
            this.sheetTitle.textContent = 'Edit Income';
            this.toggleExpense.classList.remove('active');
            this.toggleIncome.classList.add('active');
            this.formModeGroup.style.display = 'none';
            this.cardNameGroup.style.display = 'none';
            this.entryCardName.value = '';
        }

        // Form Currency Symbol
        document.getElementById('form-currency-symbol').textContent = window.store.settings.currency;

        // Load Category Chips and select the current one
        this.renderCategoryChips();
        
        // If category chip matches custom / dynamic addition:
        const hasChip = window.store.categories[tx.type].some(c => c.id === tx.category);
        if (hasChip) {
            this.selectedCategory = tx.category;
            // Re-select active chip
            setTimeout(() => {
                document.querySelectorAll('.category-chips .cat-chip').forEach(ch => {
                    if (ch.getAttribute('data-id') === tx.category) {
                        ch.classList.add('active');
                    } else {
                        ch.classList.remove('active');
                    }
                });
            }, 10);
            this.customCategoryGroup.style.display = 'none';
            this.entryCustomCategory.value = '';
        } else {
            // It's a custom category name that doesn't have a direct chip or was dynamic
            this.selectedCategory = 'custom';
            setTimeout(() => {
                document.querySelectorAll('.category-chips .cat-chip').forEach(ch => ch.classList.remove('active'));
            }, 10);
            this.customCategoryGroup.style.display = 'flex';
            const catObj = window.store.getCategoryById(tx.category, tx.type);
            this.entryCustomCategory.value = catObj.name;
        }

        this.renderModeChips();

        // Change Action submit button text
        const submitBtn = document.getElementById('entry-submit-btn');
        submitBtn.innerHTML = `<span class="material-symbols-outlined">edit</span> Update Transaction`;

        // Open Sheet
        this.addSheet.classList.add('open');
        setTimeout(() => this.entryAmount.focus(), 150);
    }

    renderCategoryChips() {
        const list = window.store.categories[this.activeFormType];
        this.formCategoryChips.innerHTML = '';
        
        // Select first item by default
        this.selectedCategory = list[0].id;

        list.forEach(c => {
            const chip = document.createElement('div');
            chip.className = `cat-chip ${this.selectedCategory === c.id ? 'active' : ''}`;
            chip.setAttribute('data-id', c.id);
            chip.innerHTML = `
                <span class="material-symbols-outlined" style="color: ${c.color}">${c.icon}</span>
                <span>${c.name}</span>
            `;
            
            chip.addEventListener('click', () => {
                document.querySelectorAll('.category-chips .cat-chip').forEach(ch => ch.classList.remove('active'));
                chip.classList.add('active');
                
                if (c.id === 'custom') {
                    // Automatically trigger custom free-text category input
                    this.selectedCategory = 'custom';
                    this.customCategoryGroup.style.display = 'flex';
                    setTimeout(() => this.entryCustomCategory.focus(), 150);
                } else {
                    this.selectedCategory = c.id;
                    this.customCategoryGroup.style.display = 'none';
                    this.entryCustomCategory.value = '';
                }
            });

            this.formCategoryChips.appendChild(chip);
        });
    }

    renderModeChips() {
        document.querySelectorAll('.mode-chips .mode-chip').forEach(chip => {
            if (chip.getAttribute('data-mode') === this.selectedMode) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
    }

    /* ----------------------------------------------------
       INPUTS & TOAST FEEDBACK MODALS
    ---------------------------------------------------- */
    showGenericInputDialog(title, description, defaultValue, callback) {
        document.getElementById('dialog-title').textContent = title;
        document.getElementById('dialog-desc').textContent = description;
        const input = document.getElementById('dialog-input');
        input.value = defaultValue;
        
        this.genericDialog.classList.add('open');
        setTimeout(() => input.focus(), 150);

        const handleConfirm = () => {
            const finalVal = input.value.trim();
            if (finalVal) {
                callback(finalVal);
                cleanup();
            }
        };

        const handleCancel = () => {
            cleanup();
        };

        const cleanup = () => {
            this.genericDialog.classList.remove('open');
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        const confirmBtn = document.getElementById('dialog-confirm-btn');
        const cancelBtn = document.getElementById('dialog-cancel-btn');

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
    }

    showConfirmationDialog(title, description, callback) {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-desc').textContent = description;
        
        this.confirmDialog.classList.add('open');

        const handleConfirm = () => {
            callback();
            cleanup();
        };

        const handleCancel = () => {
            cleanup();
        };

        const cleanup = () => {
            this.confirmDialog.classList.remove('open');
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        const confirmBtn = document.getElementById('confirm-confirm-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
    }

    showSnackbar(text, actionText = '', actionCallback = null) {
        document.getElementById('snackbar-msg').textContent = text;
        const actionBtn = document.getElementById('snackbar-action');
        
        if (actionText && actionCallback) {
            actionBtn.textContent = actionText;
            actionBtn.style.display = 'block';
            
            // Single use click listener
            const clickHandler = () => {
                actionCallback();
                actionBtn.removeEventListener('click', clickHandler);
                this.snackbar.classList.remove('show');
            };
            actionBtn.addEventListener('click', clickHandler);
        } else {
            actionBtn.style.display = 'none';
        }

        this.snackbar.classList.add('show');

        // Clear existing timer if any
        if (this.snackbarTimer) clearTimeout(this.snackbarTimer);
        
        this.snackbarTimer = setTimeout(() => {
            this.snackbar.classList.remove('show');
        }, 4000);
    }

    /* ----------------------------------------------------
       EVENT LISTENERS ATTACHMENT
    ---------------------------------------------------- */
    bindEvents() {
        // Tab Nav clicks
        this.navItems.forEach(item => {
            item.addEventListener('click', () => {
                const target = item.getAttribute('data-target');
                this.switchToView(target);
            });
        });

        // FAB Click
        this.mainFab.addEventListener('click', () => {
            this.openAddDialog('expense');
        });

        // Close Sheet clicks
        this.closeSheetBtn.addEventListener('click', () => this.closeAddDialog());
        this.sheetBackdrop.addEventListener('click', () => this.closeAddDialog());
        
        // Close details sheet
        if (this.closeDetailsBtn) {
            this.closeDetailsBtn.addEventListener('click', () => this.closeDetailsDialog());
        }
        if (this.detailsBackdrop) {
            this.detailsBackdrop.addEventListener('click', () => this.closeDetailsDialog());
        }

        // Details panel action buttons
        if (this.detailsDeleteBtn) {
            this.detailsDeleteBtn.addEventListener('click', () => {
                if (this.selectedDetailsId) {
                    const idToDelete = this.selectedDetailsId;
                    this.closeDetailsDialog();
                    this.triggerDelete(idToDelete);
                }
            });
        }
        if (this.detailsEditBtn) {
            this.detailsEditBtn.addEventListener('click', () => {
                if (this.selectedDetailsId) {
                    this.openEditDialog(this.selectedDetailsId);
                }
            });
        }
        if (this.detailsDuplicateBtn) {
            this.detailsDuplicateBtn.addEventListener('click', () => {
                if (this.selectedDetailsId) {
                    const duplicated = window.store.duplicateTransaction(this.selectedDetailsId);
                    this.closeDetailsDialog();
                    if (duplicated) {
                        this.refreshActiveViewData();
                        this.showSnackbar('Transaction duplicated to today');
                    }
                }
            });
        }

        // Sheet Toggles (Income vs Expense)
        this.toggleExpense.addEventListener('click', () => {
            if (this.activeFormType !== 'expense') {
                this.activeFormType = 'expense';
                this.toggleExpense.classList.add('active');
                this.toggleIncome.classList.remove('active');
                this.sheetTitle.textContent = 'Add Expense';
                this.formModeGroup.style.display = 'flex';
                this.renderCategoryChips();
            }
        });
        
        this.toggleIncome.addEventListener('click', () => {
            if (this.activeFormType !== 'income') {
                this.activeFormType = 'income';
                this.toggleExpense.classList.remove('active');
                this.toggleIncome.classList.add('active');
                this.sheetTitle.textContent = 'Add Income';
                this.formModeGroup.style.display = 'none'; // Incomes usually don't have pay mode splits
                this.renderCategoryChips();
            }
        });

        // Mode Chip clicks inside creation sheet
        document.querySelectorAll('.mode-chips .mode-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                this.selectedMode = chip.getAttribute('data-mode');
                this.renderModeChips();
                
                // Dynamically display Card Name free-text input
                if (this.selectedMode === 'Card') {
                    this.cardNameGroup.style.display = 'flex';
                    setTimeout(() => this.entryCardName.focus(), 150);
                } else {
                    this.cardNameGroup.style.display = 'none';
                }
            });
        });

        // Custom Category Creation inside sheet (Toggles dynamic inline free-text)
        this.addCustomCatBtn.addEventListener('click', () => {
            if (this.customCategoryGroup.style.display === 'none') {
                this.customCategoryGroup.style.display = 'flex';
                // Remove highlight from standard chips so visual focus goes inline
                document.querySelectorAll('.category-chips .cat-chip').forEach(ch => ch.classList.remove('active'));
                this.selectedCategory = 'custom';
                setTimeout(() => this.entryCustomCategory.focus(), 150);
            } else {
                this.customCategoryGroup.style.display = 'none';
                this.entryCustomCategory.value = '';
                const defaultList = window.store.categories[this.activeFormType];
                this.selectedCategory = defaultList[0].id;
                this.renderCategoryChips();
            }
        });

        // Form Submit
        this.entryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const amount = parseFloat(this.entryAmount.value);
            if (isNaN(amount) || amount <= 0) {
                this.showSnackbar('Please enter a valid amount.');
                return;
            }

            let categoryId = this.selectedCategory;

            // Check dynamic custom free-text category selection
            if (categoryId === 'custom') {
                const typedName = this.entryCustomCategory.value.trim();
                if (!typedName) {
                    this.showSnackbar('Please enter a custom category name.');
                    return;
                }

                // Check if category already matches an existing list item
                const existing = window.store.categories[this.activeFormType].find(
                    c => c.name.toLowerCase() === typedName.toLowerCase()
                );

                if (existing) {
                    categoryId = existing.id;
                } else {
                    // Create in store dynamically
                    const newCat = window.store.addCustomCategory(this.activeFormType, typedName);
                    categoryId = newCat ? newCat.id : window.store.categories[this.activeFormType][0].id;
                }
            }

            const tx = {
                type: this.activeFormType,
                amount: amount,
                category: categoryId,
                date: this.entryDate.value,
                mode: this.activeFormType === 'expense' ? this.selectedMode : 'Bank',
                cardName: this.activeFormType === 'expense' && this.selectedMode === 'Card' ? this.entryCardName.value.trim() : '',
                note: this.entryNote.value.trim(),
                isInvestment: this.entryIsInvestment ? this.entryIsInvestment.checked : false
            };

            // Form handler - Update or insertion switch
            if (this.editingTransactionId) {
                window.store.updateTransaction(this.editingTransactionId, tx);
                this.editingTransactionId = null;
                this.showSnackbar('Transaction updated');
            } else {
                window.store.addTransaction(tx);
                this.showSnackbar('Transaction saved');
            }
            
            this.closeAddDialog();
            this.refreshActiveViewData();
        });

        // Filtering Transactions View
        document.querySelectorAll('.filters-scroll .filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                this.activeFilter = chip.getAttribute('data-filter');
                this.renderTransactionsList();
            });
        });

        // Search Transactions View
        const searchInput = document.getElementById('tx-search-input');
        searchInput.addEventListener('input', () => {
            this.renderTransactionsList();
        });

        document.getElementById('tx-search-clear').addEventListener('click', () => {
            searchInput.value = '';
            this.renderTransactionsList();
        });

        // Month Selector Analytics
        document.getElementById('analytics-month-select').addEventListener('change', (e) => {
            this.activeAnalyticsMonth = e.target.value;
            this.renderAnalytics();
        });

        // Export Monthly Report Excel/CSV
        if (this.exportExcelBtn) {
            this.exportExcelBtn.addEventListener('click', () => {
                if (this.activeAnalyticsMonth) {
                    window.store.exportMonthlyReportExcel(this.activeAnalyticsMonth);
                    this.showSnackbar('Monthly report exported as Excel CSV');
                } else {
                    this.showSnackbar('No month selected.');
                }
            });
        }

        // USER ACCOUNT SETTINGS ITEMS
        
        // 1. Change Display Name
        document.getElementById('set-profile-item').addEventListener('click', () => {
            this.showGenericInputDialog('Change Username', 'Enter a new nickname to customize the app interface.', window.store.settings.username, (val) => {
                window.store.settings.username = val;
                window.store.saveSettings();
                this.renderSettings();
                this.showSnackbar('Username saved successfully');
            });
        });

        // 2. Change Currency
        document.getElementById('set-currency-item').addEventListener('click', () => {
            this.showGenericInputDialog('Base Currency Symbol', 'Enter a custom financial currency glyph (e.g. ₹, $, €, £).', window.store.settings.currency, (val) => {
                window.store.settings.currency = val;
                window.store.saveSettings();
                this.renderSettings();
                this.showSnackbar(`Currency updated to ${val}`);
            });
        });

        // 3. Edit Spend Budget
        document.getElementById('set-budget-item').addEventListener('click', () => {
            this.showGenericInputDialog('Monthly Spending Limit', 'Set a monthly cap to compute active alert rates.', window.store.settings.budget.toString(), (val) => {
                const num = parseFloat(val);
                if (!isNaN(num) && num > 0) {
                    window.store.settings.budget = num;
                    window.store.saveSettings();
                    this.renderSettings();
                    this.showSnackbar('Spend limits updated');
                } else {
                    this.showSnackbar('Please enter a valid numeric limit.');
                }
            });
        });

        // 4. Custom Categories management item
        document.getElementById('set-categories-item').addEventListener('click', () => {
            const desc = 'To append categories, click the "+ Custom" buttons directly inside the creation sheets when logging a transaction.';
            this.showGenericInputDialog('Manage Categories', desc, 'Use "+ Custom" in the form sheet', () => {});
        });

        // DATA CONTROLLERS ITEMS
        
        // Generate PWA PNG Icons
        if (this.pwaIconsBtn) {
            this.pwaIconsBtn.addEventListener('click', () => {
                this.generatePWAPNGIcons();
            });
        }

        // Balance Privacy Toggle
        if (this.balanceVisibilityBtn) {
            this.balanceVisibilityBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.store.settings.privacyMode = !window.store.settings.privacyMode;
                window.store.saveSettings();
                this.refreshActiveViewData();
                this.showSnackbar(window.store.settings.privacyMode ? 'Privacy Mode enabled' : 'Privacy Mode disabled');
            });
        }

        // Export Backup
        document.getElementById('settings-export-btn').addEventListener('click', () => {
            window.store.exportBackup();
            this.showSnackbar('Backup downloaded successfully');
        });

        // Import Backup
        const fileInput = document.getElementById('import-file-input');
        document.getElementById('settings-import-btn').addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const success = window.store.importBackup(event.target.result);
                if (success) {
                    this.refreshActiveViewData();
                    this.showSnackbar('Database restored successfully');
                }
            };
            reader.readAsText(file);
            // Reset input value so it triggers on double imports
            fileInput.value = '';
        });

        // Reset Database
        document.getElementById('settings-reset-btn').addEventListener('click', () => {
            this.showConfirmationDialog('Erase Database?', 'This deletes all logged records and custom setups. This cannot be undone. Restoring from samples...', () => {
                window.store.resetAllData();
                this.switchToView('home');
                this.showSnackbar('Database fully reset to samples');
            });
        });

        // Theme Pickers inside settings
        this.themeChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const mode = chip.getAttribute('data-theme');
                window.store.settings.theme = mode;
                window.store.saveSettings();
                this.applySystemTheme();
                this.renderSettings();
                this.showSnackbar(`Theme preference saved`);
            });
        });

        // Header Quick Theme button
        this.headerThemeBtn.addEventListener('click', () => {
            const currentMode = document.documentElement.getAttribute('data-theme-mode');
            const targetMode = currentMode === 'dark' ? 'light' : 'dark';
            
            window.store.settings.theme = targetMode;
            window.store.saveSettings();
            this.applySystemTheme();
            this.renderSettings();
            this.showSnackbar(`Switched to ${targetMode} theme`);
        });
    }

    applySystemTheme() {
        const pref = window.store.settings.theme;
        let mode = 'light';
        
        if (pref === 'auto') {
            const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            mode = systemDark ? 'dark' : 'light';
        } else {
            mode = pref;
        }

        document.documentElement.setAttribute('data-theme-mode', mode);
        
        // Update header theme icon details
        const headerIcon = this.headerThemeBtn.querySelector('.material-symbols-outlined');
        if (headerIcon) {
            headerIcon.textContent = mode === 'dark' ? 'light_mode' : 'dark_mode';
        }

        // Re-draw active charts to sync colors if they exist and we are viewing them
        if (this.activeView === 'analytics') {
            this.renderAnalytics();
        }
    }

    generatePWAPNGIcons() {
        const svgUrl = 'icon.svg';
        
        const triggerDownload = (blob, filename) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        };

        const generateSize = (size) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d');
                    
                    // Draw a white background (maskable icons benefit from padding, but we'll draw #FEF7FF to match background color)
                    ctx.fillStyle = '#FEF7FF';
                    ctx.fillRect(0, 0, size, size);
                    
                    // Draw SVG image
                    ctx.drawImage(img, 0, 0, size, size);
                    
                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, 'image/png');
                };
                img.onerror = (e) => reject(e);
                img.src = svgUrl;
            });
        };

        this.showSnackbar('Generating PWA PNG icons...');
        
        Promise.all([generateSize(192), generateSize(512)])
            .then(([blob192, blob512]) => {
                triggerDownload(blob192, 'icon-192.png');
                setTimeout(() => {
                    triggerDownload(blob512, 'icon-512.png');
                    this.showSnackbar('PWA PNG Icons downloaded! Put them in your workspace folder.');
                }, 800);
            })
            .catch(err => {
                console.error(err);
                this.showSnackbar('Icon generation failed. Check browser logs.');
            });
    }
}
window.ui = new AppUI();
