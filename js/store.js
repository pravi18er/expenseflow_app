/* 
   ExpenseFlow State & Storage Controller (store.js)
   Handles LocalStorage synchronization, transaction CRUD, category models, and statistical queries.
*/

const DEFAULT_CATEGORIES = {
    expense: [
        { id: 'food', name: 'Food', icon: 'restaurant', color: '#FF7043' },
        { id: 'transport', name: 'Transport', icon: 'directions_car', color: '#29B6F6' },
        { id: 'shopping', name: 'Shopping', icon: 'shopping_bag', color: '#AB47BC' },
        { id: 'bills', name: 'Bills', icon: 'receipt', color: '#26A69A' },
        { id: 'entertainment', name: 'Entertainment', icon: 'sports_esports', color: '#EC407A' },
        { id: 'health', name: 'Health', icon: 'medical_services', color: '#66BB6A' },
        { id: 'education', name: 'Education', icon: 'school', color: '#FFCA28' },
        { id: 'others_exp', name: 'Others', icon: 'more_horiz', color: '#78909C' }
    ],
    income: [
        { id: 'salary', name: 'Salary', icon: 'work', color: '#42A5F5' },
        { id: 'freelance', name: 'Freelance', icon: 'laptop_mac', color: '#26A69A' },
        { id: 'investments', name: 'Investments', icon: 'trending_up', color: '#66BB6A' },
        { id: 'gifts', name: 'Gifts', icon: 'featured_seasonal_and_gifts', color: '#FF7043' },
        { id: 'others_inc', name: 'Others', icon: 'payments', color: '#78909C' }
    ]
};

const SAMPLE_TRANSACTIONS = [
    { id: 't1', type: 'income', amount: 3500.00, category: 'salary', date: '2026-05-01', mode: 'Bank', note: 'Monthly Job Salary' },
    { id: 't2', type: 'income', amount: 450.00, category: 'freelance', date: '2026-05-15', mode: 'UPI', note: 'Logo Design Project' },
    { id: 't3', type: 'expense', amount: 65.40, category: 'food', date: '2026-05-02', mode: 'Card', note: 'Weekly Groceries' },
    { id: 't4', type: 'expense', amount: 120.00, category: 'bills', date: '2026-05-05', mode: 'Bank', note: 'Electricity Bill' },
    { id: 't5', type: 'expense', amount: 15.00, category: 'transport', date: '2026-05-06', mode: 'Cash', note: 'Cab ride to office' },
    { id: 't6', type: 'expense', amount: 80.00, category: 'shopping', date: '2026-05-12', mode: 'Card', note: 'Summer Jacket' },
    { id: 't7', type: 'expense', amount: 42.50, category: 'food', date: '2026-05-14', mode: 'UPI', note: 'Dinner with colleagues' },
    { id: 't8', type: 'expense', amount: 12.00, category: 'entertainment', date: '2026-05-20', mode: 'Cash', note: 'Movie ticket' },
    { id: 't9', type: 'expense', amount: 35.00, category: 'health', date: '2026-05-22', mode: 'Card', note: 'Multivitamins' },
    { id: 't10', type: 'expense', amount: 18.20, category: 'transport', date: '2026-05-24', mode: 'UPI', note: 'Gas refill' },
    { id: 't11', type: 'expense', amount: 110.00, category: 'shopping', date: '2026-05-26', mode: 'Card', note: 'Mechanical Keyboard' }
];

class ExpenseStore {
    constructor() {
        this.transactions = [];
        this.categories = { ...DEFAULT_CATEGORIES };
        this.settings = {
            username: 'Alex Mercer',
            currency: '₹',
            currencyName: 'INR',
            budget: 15000.00,
            theme: 'auto'
        };
        this.loadFromStorage();
    }

    loadFromStorage() {
        try {
            // Load Transactions
            const txData = localStorage.getItem('ef_transactions');
            if (txData) {
                this.transactions = JSON.parse(txData);
            } else {
                // Seed database with samples if completely fresh
                this.transactions = [...SAMPLE_TRANSACTIONS];
                this.saveTransactions();
            }

            // Load Categories
            const catData = localStorage.getItem('ef_categories');
            if (catData) {
                this.categories = JSON.parse(catData);
            } else {
                this.saveCategories();
            }

            // Load Settings
            const settingsData = localStorage.getItem('ef_settings');
            if (settingsData) {
                this.settings = { ...this.settings, ...JSON.parse(settingsData) };
                // Smart Migration to INR (₹) from old sessions
                if (this.settings.currency === '$') {
                    this.settings.currency = '₹';
                    this.settings.currencyName = 'INR';
                    if (this.settings.budget === 1200.00) {
                        this.settings.budget = 15000.00;
                    }
                    this.saveSettings();
                }
            } else {
                this.saveSettings();
            }
        } catch (e) {
            console.error('Error loading data from localStorage', e);
            // Recovery fallback
            this.transactions = [...SAMPLE_TRANSACTIONS];
            this.categories = { ...DEFAULT_CATEGORIES };
        }
    }

    saveTransactions() {
        localStorage.setItem('ef_transactions', JSON.stringify(this.transactions));
    }

    saveCategories() {
        localStorage.setItem('ef_categories', JSON.stringify(this.categories));
    }

    saveSettings() {
        localStorage.setItem('ef_settings', JSON.stringify(this.settings));
    }

    /* ----------------------------------------------------
       TRANSACTION OPERATIONS (CRUD)
    ---------------------------------------------------- */
    addTransaction(tx) {
        const newTx = {
            id: 'tx_' + Date.now() + Math.random().toString(36).substring(2, 5),
            type: tx.type, // 'income' | 'expense'
            amount: parseFloat(tx.amount),
            category: tx.category,
            date: tx.date, // 'YYYY-MM-DD'
            mode: tx.mode || 'Cash', // 'Cash' | 'Card' | 'UPI' | 'Bank'
            cardName: tx.type === 'expense' && tx.mode === 'Card' ? (tx.cardName || '') : '',
            note: tx.note || ''
        };
        
        this.transactions.unshift(newTx); // Add to beginning of array
        this.saveTransactions();
        return newTx;
    }

    deleteTransaction(id) {
        const index = this.transactions.findIndex(t => t.id === id);
        if (index > -1) {
            const deleted = this.transactions.splice(index, 1)[0];
            this.saveTransactions();
            return deleted;
        }
        return null;
    }

    getRecentTransactions(limit = 5) {
        return this.transactions.slice(0, limit);
    }

    getAllTransactionsFiltered(filter = 'all', query = '') {
        let results = [...this.transactions];
        
        // Date sorting (newest first)
        results.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Filter Type/Mode
        if (filter !== 'all') {
            if (filter === 'income' || filter === 'expense') {
                results = results.filter(t => t.type === filter);
            } else {
                results = results.filter(t => t.mode === filter);
            }
        }

        // Text query matching notes or category name
        if (query.trim()) {
            const lowercaseQuery = query.toLowerCase().trim();
            results = results.filter(t => {
                const noteMatch = t.note.toLowerCase().includes(lowercaseQuery);
                const categoryObj = this.getCategoryById(t.category, t.type);
                const catNameMatch = categoryObj ? categoryObj.name.toLowerCase().includes(lowercaseQuery) : false;
                return noteMatch || catNameMatch;
            });
        }

        return results;
    }

    /* ----------------------------------------------------
       CATEGORY CUSTOMIZATIONS
    ---------------------------------------------------- */
    getCategoryById(id, type) {
        const list = this.categories[type] || [];
        return list.find(c => c.id === id) || { id: 'unknown', name: 'Other', icon: 'help_outline', color: '#9E9E9E' };
    }

    addCustomCategory(type, name, icon = 'stars', color = '#9C27B0') {
        const list = this.categories[type];
        // Check duplication
        const exists = list.some(c => c.name.toLowerCase() === name.toLowerCase());
        if (exists) return false;

        const newCat = {
            id: 'custom_' + type + '_' + Date.now(),
            name: name,
            icon: icon,
            color: color
        };

        // Insert just before the default "Others" chip
        const othersIndex = list.findIndex(c => c.id.startsWith('others_'));
        if (othersIndex > -1) {
            list.splice(othersIndex, 0, newCat);
        } else {
            list.push(newCat);
        }
        
        this.saveCategories();
        return newCat;
    }

    /* ----------------------------------------------------
       ANALYTICAL CALCULATIONS
    ---------------------------------------------------- */
    // Gets active months from database to populate selects
    getAvailableMonths() {
        const months = new Set();
        this.transactions.forEach(t => {
            if (t.date) {
                // Get 'YYYY-MM'
                months.add(t.date.substring(0, 7));
            }
        });
        
        // If empty, return current month
        if (months.size === 0) {
            months.add(new Date().toISOString().substring(0, 7));
        }

        // Sort months descending
        return Array.from(months).sort((a, b) => b.localeCompare(a));
    }

    // Calculates overall dashboard metrics (Current rolling balances)
    getOverallSummary() {
        let totalIncome = 0;
        let totalExpense = 0;

        this.transactions.forEach(t => {
            if (t.type === 'income') totalIncome += t.amount;
            else totalExpense += t.amount;
        });

        const balance = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
        
        // Daily average spend of the CURRENT month
        const now = new Date();
        const currentMonthStr = now.toISOString().substring(0, 7); // 'YYYY-MM'
        const currentMonthTxs = this.transactions.filter(t => t.date.startsWith(currentMonthStr) && t.type === 'expense');
        const dayOfMonth = now.getDate();
        
        let currentMonthSpend = 0;
        currentMonthTxs.forEach(t => currentMonthSpend += t.amount);
        const dailyAvg = dayOfMonth > 0 ? (currentMonthSpend / dayOfMonth) : 0;

        // Main payment mode
        const modeCounts = {};
        this.transactions.filter(t => t.type === 'expense').forEach(t => {
            modeCounts[t.mode] = (modeCounts[t.mode] || 0) + 1;
        });
        let mainMode = 'None';
        let maxCount = 0;
        for (const mode in modeCounts) {
            if (modeCounts[mode] > maxCount) {
                maxCount = modeCounts[mode];
                mainMode = mode;
            }
        }

        return {
            balance,
            totalIncome,
            totalExpense,
            savingsRate: Math.max(0, savingsRate), // don't show negative savings rate
            dailyAvg,
            mainMode
        };
    }

    // Comprehensive monthly analytics data
    getMonthSummary(monthYearStr) { // 'YYYY-MM'
        const filteredTxs = this.transactions.filter(t => t.date.startsWith(monthYearStr));
        
        let totalIncome = 0;
        let totalExpense = 0;

        filteredTxs.forEach(t => {
            if (t.type === 'income') totalIncome += t.amount;
            else totalExpense += t.amount;
        });

        // Split spend by category
        const categoryTotals = {};
        const modeTotals = {};

        // Prepare lists with initial 0 totals to ensure all show up on visualization if desired
        this.categories.expense.forEach(c => categoryTotals[c.id] = 0);
        
        filteredTxs.forEach(t => {
            if (t.type === 'expense') {
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
                modeTotals[t.mode] = (modeTotals[t.mode] || 0) + t.amount;
            }
        });

        // Filter out categories with 0 spends to keep the chart clean, but sort DESC
        const sortedCategories = Object.keys(categoryTotals)
            .map(id => {
                const catObj = this.getCategoryById(id, 'expense');
                return {
                    id,
                    name: catObj.name,
                    color: catObj.color,
                    icon: catObj.icon,
                    amount: categoryTotals[id]
                };
            })
            .filter(item => item.amount > 0)
            .sort((a, b) => b.amount - a.amount);

        // Standard modes map
        const modeSummary = ['Cash', 'Card', 'UPI', 'Bank'].map(mode => ({
            name: mode,
            amount: modeTotals[mode] || 0,
            color: mode === 'Cash' ? '#FFCA28' : mode === 'Card' ? '#EC407A' : mode === 'UPI' ? '#26A69A' : '#42A5F5'
        })).filter(m => m.amount > 0);

        // Weekly splits: Divide into 4 standard chunks
        // Week 1: 1-7, Week 2: 8-14, Week 3: 15-21, Week 4: 22-end
        const weeklySpends = [0, 0, 0, 0];
        filteredTxs.forEach(t => {
            if (t.type === 'expense') {
                const day = parseInt(t.date.split('-')[2]);
                if (day <= 7) weeklySpends[0] += t.amount;
                else if (day <= 14) weeklySpends[1] += t.amount;
                else if (day <= 21) weeklySpends[2] += t.amount;
                else weeklySpends[3] += t.amount;
            }
        });

        return {
            totalIncome,
            totalExpense,
            remainingBudget: Math.max(0, this.settings.budget - totalExpense),
            categorySpends: sortedCategories,
            modeSpends: modeSummary,
            weeklySpends
        };
    }

    /* ----------------------------------------------------
       DATA ADMINISTRATION (BACKUP & IMPORT)
    ---------------------------------------------------- */
    exportBackup() {
        const database = {
            transactions: this.transactions,
            categories: this.categories,
            settings: this.settings,
            version: '1.0.0',
            exportedAt: new Date().toISOString()
        };

        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(database, null, 2))}`;
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', jsonString);
        downloadAnchor.setAttribute('download', `ExpenseFlow_Backup_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }

    exportMonthlyReportExcel(monthYearStr) {
        const filteredTxs = this.transactions.filter(t => t.date.startsWith(monthYearStr));
        
        // Sort chronologically (oldest first for reports layout)
        filteredTxs.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Format month title
        const date = new Date(monthYearStr + '-02');
        const monthTitle = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        // Calculate stats
        let totalIncome = 0;
        let totalExpense = 0;
        filteredTxs.forEach(t => {
            if (t.type === 'income') totalIncome += t.amount;
            else totalExpense += t.amount;
        });
        const balance = totalIncome - totalExpense;

        // Build CSV content
        // 1. Report Metadata header
        let csvContent = `"ExpenseFlow Monthly Report - ${monthTitle}"\r\n`;
        csvContent += `"Generated At:","${new Date().toLocaleString()}"\r\n\r\n`;
        
        // 2. Summary Card blocks
        csvContent += `"SUMMARY STATS"\r\n`;
        csvContent += `"Total Incomes (INR)","₹${totalIncome.toFixed(2)}"\r\n`;
        csvContent += `"Total Expenses (INR)","₹${totalExpense.toFixed(2)}"\r\n`;
        csvContent += `"Net Savings (INR)","₹${balance.toFixed(2)}"\r\n\r\n`;

        // 3. Transactions details table
        csvContent += `"TRANSACTIONS LIST"\r\n`;
        csvContent += `"Transaction ID","Date","Type","Category","Amount (INR)","Payment Method","Card Name","Description/Notes"\r\n`;
        
        filteredTxs.forEach(t => {
            const catObj = this.getCategoryById(t.category, t.type);
            const id = t.id;
            const date = t.date;
            const type = t.type.toUpperCase();
            const category = catObj.name;
            const amount = t.amount.toFixed(2);
            const method = t.mode || 'Cash';
            const cardName = t.cardName || '';
            
            // Escape double quotes in notes
            const note = (t.note || '').replace(/"/g, '""');

            csvContent += `"${id}","${date}","${type}","${category}","${amount}","${method}","${cardName}","${note}"\r\n`;
        });

        // Trigger file download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', url);
        downloadAnchor.setAttribute('download', `ExpenseFlow_Report_${monthYearStr}.csv`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }

    importBackup(fileText) {
        try {
            const data = JSON.parse(fileText);
            
            // Basic validation
            if (!data.transactions || !Array.isArray(data.transactions)) {
                throw new Error("Missing 'transactions' array.");
            }

            // Sync values
            this.transactions = data.transactions;
            if (data.categories) this.categories = data.categories;
            if (data.settings) this.settings = { ...this.settings, ...data.settings };
            
            // Write
            this.saveTransactions();
            this.saveCategories();
            this.saveSettings();
            
            return true;
        } catch (e) {
            console.error('Failed to import file contents', e);
            alert('Import Failed: The chosen file is not a valid ExpenseFlow backup JSON.');
            return false;
        }
    }

    resetAllData() {
        localStorage.removeItem('ef_transactions');
        localStorage.removeItem('ef_categories');
        localStorage.removeItem('ef_settings');
        
        // Re-init properties
        this.transactions = [...SAMPLE_TRANSACTIONS];
        this.categories = { ...DEFAULT_CATEGORIES };
        this.settings = {
            username: 'Alex Mercer',
            currency: '₹',
            currencyName: 'INR',
            budget: 15000.00,
            theme: 'auto'
        };

        this.saveTransactions();
        this.saveCategories();
        this.saveSettings();
    }
}
window.store = new ExpenseStore();
