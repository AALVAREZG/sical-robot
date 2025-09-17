// ===============================================
// treasuryForecastRenderer.js - Complete Refactored Implementation
// ===============================================

class TreasuryForecastManager {
    constructor() {
        this.treasuryData = [];
        this.categories = { income: [], expenses: [], reserves: [] };
        this.currentPeriodId = null;
        this.isDirty = false;
        this.autoSaveTimer = null;
        
        // Dynamic category management
        this.dynamicCategories = new Map();
        this.fixedCategoryIds = new Set();
    }

    // ===============================================
    // INITIALIZATION
    // ===============================================
    
    async initialize() {
        console.log('🏦 Initializing Treasury Forecast Module...');
        
        const container = document.getElementById('treasury-content');
        if (!container) {
            console.error('Treasury content container not found');
            return;
        }

        this.createCompactLayout(container);
        await this.loadInitialData();
        this.setupEventListeners();
        this.startAutoSave();
        
        console.log('✅ Treasury module initialized');
    }

    // ===============================================
    // LAYOUT CREATION
    // ===============================================
    
    createCompactLayout(container) {
        container.innerHTML = `
            <div class="treasury-compact-container">
                <!-- Header Section -->
                <div class="treasury-compact-header">
                    <div class="header-main">
                        <h2 class="treasury-title">Treasury Forecast</h2>
                        <div class="header-actions">
                            <select class="period-selector" id="periodSelector">
                                <option value="">Loading...</option>
                            </select>
                            <button class="action-btn add-category" id="addCategoryBtn" title="Add Category">➕</button>
                            <button class="action-btn refresh" id="refreshBtn" title="Refresh">🔄</button>
                            <button class="action-btn save" id="saveBtn" title="Save">💾</button>
                            <button class="action-btn config" id="configBtn" title="Settings">⚙️</button>
                        </div>
                    </div>
                    
                    <!-- Summary Bar -->
                    <div class="summary-bar">
                        <div class="summary-item">
                            <span class="label">Current Balance</span>
                            <span class="value current" id="currentBalance">€0</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Projected</span>
                            <span class="value forecast" id="projectedBalance">€0</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Net Flow</span>
                            <span class="value flow" id="netFlow">€0</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Health</span>
                            <span class="value health" id="healthStatus">
                                <span class="health-indicator"></span>
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Metro Visualization -->
                <div class="metro-line-compact">
                    <div class="metro-track"></div>
                    <div class="metro-stations" id="metroStations"></div>
                    <div class="metro-navigation">
                        <button class="nav-btn prev" id="metroPrev">‹</button>
                        <button class="nav-btn next" id="metroNext">›</button>
                    </div>
                </div>

                <!-- Data Input Sections -->
                <div class="data-input-compact">
                    <!-- Income Section -->
                    <div class="input-section income-section">
                        <div class="section-header collapsible" data-section="income">
                            <h3>
                                <span class="toggle-icon">▼</span>
                                Income
                                <span class="total" id="incomeTotal">€0</span>
                            </h3>
                            <button class="add-item-btn" data-type="income">+</button>
                        </div>
                        <div class="section-content" id="incomeContent">
                            <div class="input-items" id="incomeItems"></div>
                        </div>
                    </div>

                    <!-- Expenses Section -->
                    <div class="input-section expense-section">
                        <div class="section-header collapsible" data-section="expenses">
                            <h3>
                                <span class="toggle-icon">▼</span>
                                Expenses
                                <span class="total" id="expensesTotal">€0</span>
                            </h3>
                            <button class="add-item-btn" data-type="expenses">+</button>
                        </div>
                        <div class="section-content" id="expensesContent">
                            <div class="input-items" id="expensesItems"></div>
                        </div>
                    </div>

                    <!-- Reserves Section -->
                    <div class="input-section reserves-section">
                        <div class="section-header collapsible" data-section="reserves">
                            <h3>
                                <span class="toggle-icon">▼</span>
                                Reserves & Goals
                                <span class="total" id="reservesTotal">€0</span>
                            </h3>
                            <button class="add-item-btn" data-type="reserves">+</button>
                        </div>
                        <div class="section-content" id="reservesContent">
                            <div class="input-items" id="reservesItems"></div>
                        </div>
                    </div>
                </div>

                <!-- Quick Insights -->
                <div class="quick-insights">
                    <div class="insight-card">
                        <span class="insight-icon">📊</span>
                        <div class="insight-content">
                            <span class="insight-label">Burn Rate</span>
                            <span class="insight-value" id="burnRate">€0/day</span>
                        </div>
                    </div>
                    <div class="insight-card">
                        <span class="insight-icon">📅</span>
                        <div class="insight-content">
                            <span class="insight-label">Runway</span>
                            <span class="insight-value" id="runway">0 months</span>
                        </div>
                    </div>
                    <div class="insight-card">
                        <span class="insight-icon">💰</span>
                        <div class="insight-content">
                            <span class="insight-label">Reserve Coverage</span>
                            <span class="insight-value" id="reserveCoverage">0%</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Category Modal -->
            <div class="modal" id="categoryModal" style="display: none;">
                <div class="modal-content">
                    <h3>Add/Edit Category</h3>
                    <form id="categoryForm">
                        <input type="hidden" id="categoryId">
                        <select id="categoryType" required>
                            <option value="income">Income</option>
                            <option value="expenses">Expense</option>
                            <option value="reserves">Reserve</option>
                        </select>
                        <input type="text" id="categoryName" placeholder="Category Name" required>
                        <input type="text" id="categoryIcon" placeholder="Icon (emoji)" maxlength="2">
                        <input type="color" id="categoryColor" value="#4A90E2">
                        <label>
                            <input type="checkbox" id="categoryFixed">
                            Fixed Amount
                        </label>
                        <div class="modal-actions">
                            <button type="submit">Save</button>
                            <button type="button" onclick="closeModal()">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    // ===============================================
    // DATA LOADING
    // ===============================================
    
    async loadInitialData() {
        try {
            // Check if API is available
            if (!window.electronAPI || !window.electronAPI.getMetroTreasuryData) {
                console.warn('Treasury API not available, using mock data');
                this.loadMockData();
                return;
            }
            
            // Load treasury periods and data
            const result = await window.electronAPI.getMetroTreasuryData();
            if (result && result.success) {
                this.treasuryData = result.data;
                await this.processBalances();
            } else {
                console.warn('No treasury data returned, using mock data');
                this.loadMockData();
                return;
            }

            // Load categories
            const categoriesResult = await window.electronAPI.getTreasuryCategories();
            if (categoriesResult && categoriesResult.success) {
                this.processCategories(categoriesResult.data);
            }

            // Render initial view
            this.renderMetroLine();
            this.renderPeriodSelector();
            
            if (this.treasuryData.length > 0) {
                this.selectPeriod(this.treasuryData[0].id);
            }

        } catch (error) {
            console.error('Error loading initial data:', error);
            console.log('Falling back to mock data');
            this.loadMockData();
        }
    }
    
    loadMockData() {
        console.log('Loading mock data for development');
        
        // Mock treasury data
        this.treasuryData = [
            {
                id: 1,
                period_display: 'Sep 2025',
                is_current: true,
                starting_balance: 45000,
                ending_balance: 47285,
                net_flow: 2285,
                health_indicator: 'good',
                breakdown: {
                    income: {
                        total: 5150,
                        items: [
                            { id: 1, name: 'Primary Salary', icon: '💼', amount: 3500, confidence_level: 100 },
                            { id: 2, name: 'Freelance', icon: '🔧', amount: 1200, confidence_level: 85 },
                            { id: 3, name: 'Investments', icon: '📈', amount: 450, confidence_level: 70 }
                        ]
                    },
                    expenses: {
                        total: 2865,
                        items: [
                            { id: 1, name: 'Housing', icon: '🏠', amount: 1200, confidence_level: 100, is_fixed: true },
                            { id: 2, name: 'Utilities', icon: '⚡', amount: 350, confidence_level: 95, is_fixed: true },
                            { id: 3, name: 'Food', icon: '🍽️', amount: 600, confidence_level: 85 },
                            { id: 4, name: 'Transport', icon: '🚗', amount: 290, confidence_level: 80 },
                            { id: 5, name: 'Personal', icon: '👤', amount: 425, confidence_level: 75 }
                        ]
                    },
                    reserves: {
                        total: 12000,
                        items: [
                            { name: 'Emergency Fund', current_amount: 8500, target_amount: 15000 },
                            { name: 'Tax Reserve', current_amount: 2500, target_amount: 5000 },
                            { name: 'Investment', current_amount: 1000, target_amount: 3000 }
                        ]
                    }
                }
            },
            {
                id: 2,
                period_display: 'Oct 2025',
                is_forecast: true,
                starting_balance: 47285,
                ending_balance: 49100,
                net_flow: 1815,
                health_indicator: 'good',
                breakdown: {
                    income: {
                        total: 5950,
                        items: [
                            { id: 1, name: 'Primary Salary', icon: '💼', amount: 3500, confidence_level: 100 },
                            { id: 2, name: 'Project Payment', icon: '🔧', amount: 2200, confidence_level: 85 },
                            { id: 3, name: 'Dividends', icon: '📈', amount: 150, confidence_level: 70 },
                            { id: 4, name: 'Other', icon: '💰', amount: 100, confidence_level: 60 }
                        ]
                    },
                    expenses: {
                        total: 4135,
                        items: [
                            { id: 1, name: 'Housing', icon: '🏠', amount: 1200, confidence_level: 100, is_fixed: true },
                            { id: 2, name: 'Utilities', icon: '⚡', amount: 380, confidence_level: 95, is_fixed: true },
                            { id: 3, name: 'Food', icon: '🍽️', amount: 650, confidence_level: 80 },
                            { id: 4, name: 'Transport', icon: '🚗', amount: 250, confidence_level: 75 },
                            { id: 5, name: 'Tax Payment', icon: '💸', amount: 635, confidence_level: 90 },
                            { id: 6, name: 'Insurance', icon: '🛡️', amount: 200, confidence_level: 100, is_fixed: true },
                            { id: 7, name: 'Personal', icon: '👤', amount: 820, confidence_level: 70 }
                        ]
                    },
                    reserves: {
                        total: 12500,
                        items: [
                            { name: 'Emergency Fund', current_amount: 9000, target_amount: 15000 },
                            { name: 'Tax Reserve', current_amount: 2500, target_amount: 5000 },
                            { name: 'Investment', current_amount: 1000, target_amount: 3000 }
                        ]
                    }
                }
            }
        ];
        
        // Mock categories
        this.categories = {
            income: [
                { id: 1, category_name: 'Primary Salary', icon: '💼', is_fixed: true },
                { id: 2, category_name: 'Freelance', icon: '🔧', is_fixed: false },
                { id: 3, category_name: 'Investments', icon: '📈', is_fixed: false }
            ],
            expenses: [
                { id: 1, category_name: 'Housing', icon: '🏠', is_fixed: true },
                { id: 2, category_name: 'Utilities', icon: '⚡', is_fixed: true },
                { id: 3, category_name: 'Food', icon: '🍽️', is_fixed: false },
                { id: 4, category_name: 'Transport', icon: '🚗', is_fixed: false },
                { id: 5, category_name: 'Personal', icon: '👤', is_fixed: false }
            ]
        };
        
        // Process categories to identify fixed ones
        this.processCategories(this.categories);
        
        // Render the UI
        this.renderMetroLine();
        this.renderPeriodSelector();
        
        if (this.treasuryData.length > 0) {
            this.selectPeriod(this.treasuryData[0].id);
        }
    }

    processCategories(data) {
        // Identify fixed categories
        this.fixedCategoryIds.clear();
        
        if (data.income) {
            data.income.forEach(cat => {
                if (cat.is_fixed) this.fixedCategoryIds.add(`income-${cat.id}`);
            });
        }
        
        if (data.expenses) {
            data.expenses.forEach(cat => {
                if (cat.is_fixed) this.fixedCategoryIds.add(`expenses-${cat.id}`);
            });
        }
        
        this.categories = data;
    }

    async processBalances() {
        // Calculate cumulative balances
        let runningBalance = 0;
        
        // Try to get current balance from bank movements
        if (window.electronAPI && window.electronAPI.getCurrentBalance) {
            try {
                const balanceResult = await window.electronAPI.getCurrentBalance();
                if (balanceResult && balanceResult.success) {
                    runningBalance = balanceResult.balance;
                }
            } catch (error) {
                console.warn('Could not get current balance from API:', error);
            }
        }
        
        // If no balance from API, use the first period's starting balance
        if (runningBalance === 0 && this.treasuryData.length > 0) {
            runningBalance = this.treasuryData[0].starting_balance || 45000;
        }

        // Update balances for each period
        this.treasuryData.forEach((period, index) => {
            if (index === 0) {
                period.starting_balance = runningBalance;
            } else {
                period.starting_balance = this.treasuryData[index - 1].ending_balance;
            }
            
            const netFlow = this.calculateNetFlow(period);
            period.net_flow = netFlow;
            period.ending_balance = period.starting_balance + netFlow;
            period.health_indicator = this.calculateHealthIndicator(period);
        });
    }

    calculateNetFlow(period) {
        if (!period.breakdown) return 0;
        
        const income = period.breakdown.income?.total || 0;
        const expenses = period.breakdown.expenses?.total || 0;
        
        return income - expenses;
    }

    calculateHealthIndicator(period) {
        const balance = period.ending_balance;
        const expenses = period.breakdown?.expenses?.total || 1;
        const coverage = balance / expenses;
        
        if (coverage >= 6) return 'excellent';
        if (coverage >= 3) return 'good';
        if (coverage >= 1) return 'warning';
        return 'critical';
    }

    // ===============================================
    // RENDERING
    // ===============================================
    
    renderMetroLine() {
        const container = document.getElementById('metroStations');
        if (!container) return;

        container.innerHTML = this.treasuryData.map((period, index) => {
            const healthClass = this.getHealthClass(period.health_indicator);
            const isSelected = period.id === this.currentPeriodId;
            
            return `
                <div class="metro-station ${healthClass} ${isSelected ? 'selected' : ''}" 
                     data-period-id="${period.id}"
                     onclick="treasuryManager.selectPeriod(${period.id})">
                    <div class="station-circle">
                        ${period.is_current ? '●' : index + 1}
                    </div>
                    <div class="station-info">
                        <div class="period">${period.period_display}</div>
                        <div class="balance">${this.formatCurrency(period.ending_balance)}</div>
                        <div class="flow ${period.net_flow >= 0 ? 'positive' : 'negative'}">
                            ${period.net_flow >= 0 ? '+' : ''}${this.formatCurrency(period.net_flow)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderPeriodSelector() {
        const selector = document.getElementById('periodSelector');
        if (!selector) return;

        selector.innerHTML = this.treasuryData.map(period => 
            `<option value="${period.id}">${period.period_display}</option>`
        ).join('');
    }

    selectPeriod(periodId) {
        this.currentPeriodId = periodId;
        const period = this.treasuryData.find(p => p.id === periodId);
        
        if (!period) return;

        // Update selector
        const selector = document.getElementById('periodSelector');
        if (selector) selector.value = periodId;

        // Update metro line selection
        document.querySelectorAll('.metro-station').forEach(station => {
            station.classList.toggle('selected', 
                station.dataset.periodId === String(periodId));
        });

        // Render period data
        this.renderPeriodData(period);
        this.updateSummary(period);
        this.updateInsights(period);
    }

    renderPeriodData(period) {
        // Render income items
        this.renderCategoryItems(period, 'income');
        
        // Render expense items
        this.renderCategoryItems(period, 'expenses');
        
        // Render reserves
        this.renderReserves(period);
    }

    renderCategoryItems(period, type) {
        const container = document.getElementById(`${type}Items`);
        if (!container) return;

        const items = period.breakdown?.[type]?.items || [];
        const dynamicItems = this.getDynamicItemsForPeriod(period.id, type);
        const allItems = [...items, ...dynamicItems];

        container.innerHTML = allItems.map(item => {
            const isFixed = this.fixedCategoryIds.has(`${type}-${item.id}`);
            const isDynamic = !item.id;
            
            return `
                <div class="input-item ${isFixed ? 'fixed' : ''} ${isDynamic ? 'dynamic' : ''}" 
                     data-item-id="${item.id || 'new'}"
                     data-type="${type}">
                    <div class="item-info">
                        <span class="icon">${item.icon || '💰'}</span>
                        ${isDynamic ? 
                            `<input type="text" class="item-name-input" value="${item.name}" 
                                    placeholder="Category name">` :
                            `<span class="name">${item.name}</span>`
                        }
                        ${isFixed ? '<span class="fixed-badge">Fixed</span>' : ''}
                    </div>
                    <div class="item-controls">
                        <input type="number" 
                               class="amount-input" 
                               value="${item.amount || ''}"
                               placeholder="0"
                               onchange="treasuryManager.updateAmount('${type}', '${item.id}', this.value)">
                        <span class="confidence ${this.getConfidenceClass(item.confidence_level)}"
                              title="Confidence: ${item.confidence_level || 80}%">
                            ${this.getConfidenceIcon(item.confidence_level || 80)}
                        </span>
                        ${!isFixed && !isDynamic ? 
                            `<button class="remove-btn" onclick="treasuryManager.removeItem('${type}', '${item.id}')">×</button>` 
                            : ''}
                    </div>
                </div>
            `;
        }).join('');

        this.updateSectionTotal(type);
    }

    renderReserves(period) {
        const container = document.getElementById('reservesItems');
        if (!container) return;

        const reserves = period.breakdown?.reserves?.items || [];

        container.innerHTML = reserves.map(reserve => `
            <div class="reserve-item" data-reserve="${reserve.name}">
                <div class="reserve-info">
                    <span class="name">${reserve.name}</span>
                    <div class="progress-bar">
                        <div class="progress-fill" 
                             style="width: ${(reserve.current_amount / reserve.target_amount) * 100}%"></div>
                    </div>
                </div>
                <div class="reserve-amounts">
                    <input type="number" 
                           class="current-input" 
                           value="${reserve.current_amount}"
                           onchange="treasuryManager.updateReserve('${reserve.name}', 'current', this.value)">
                    <span class="separator">/</span>
                    <input type="number" 
                           class="target-input" 
                           value="${reserve.target_amount}"
                           onchange="treasuryManager.updateReserve('${reserve.name}', 'target', this.value)">
                </div>
            </div>
        `).join('');

        this.updateReservesTotal();
    }

    getDynamicItemsForPeriod(periodId, type) {
        const key = `${periodId}-${type}`;
        return this.dynamicCategories.get(key) || [];
    }

    // ===============================================
    // DATA UPDATES
    // ===============================================
    
    async updateAmount(type, itemId, value) {
        const amount = parseFloat(value) || 0;
        
        // Mark as dirty for auto-save
        this.isDirty = true;
        
        // Update local data
        const period = this.treasuryData.find(p => p.id === this.currentPeriodId);
        if (period && period.breakdown[type]) {
            const item = period.breakdown[type].items.find(i => i.id === itemId);
            if (item) {
                item.amount = amount;
            }
        }

        // Recalculate totals
        this.updateSectionTotal(type);
        this.processBalances();
        this.renderMetroLine();
        this.updateSummary(period);
    }

    async updateReserve(name, field, value) {
        const amount = parseFloat(value) || 0;
        this.isDirty = true;
        
        const period = this.treasuryData.find(p => p.id === this.currentPeriodId);
        if (period && period.breakdown.reserves) {
            const reserve = period.breakdown.reserves.items.find(r => r.name === name);
            if (reserve) {
                if (field === 'current') {
                    reserve.current_amount = amount;
                } else {
                    reserve.target_amount = amount;
                }
            }
        }

        this.updateReservesTotal();
    }

    addDynamicCategory(type) {
        const key = `${this.currentPeriodId}-${type}`;
        const items = this.dynamicCategories.get(key) || [];
        
        items.push({
            name: '',
            icon: type === 'income' ? '💵' : '💳',
            amount: 0,
            confidence_level: 75,
            isDynamic: true,
            tempId: `temp-${Date.now()}`
        });
        
        this.dynamicCategories.set(key, items);
        
        const period = this.treasuryData.find(p => p.id === this.currentPeriodId);
        this.renderCategoryItems(period, type);
    }

    removeItem(type, itemId) {
        if (!confirm('Remove this item?')) return;
        
        const period = this.treasuryData.find(p => p.id === this.currentPeriodId);
        if (period && period.breakdown[type]) {
            period.breakdown[type].items = period.breakdown[type].items.filter(i => i.id !== itemId);
            this.renderCategoryItems(period, type);
            this.isDirty = true;
        }
    }

    // ===============================================
    // CALCULATIONS
    // ===============================================
    
    updateSectionTotal(type) {
        const container = document.getElementById(`${type}Items`);
        const totalElement = document.getElementById(`${type}Total`);
        
        if (!container || !totalElement) return;

        const inputs = container.querySelectorAll('.amount-input');
        let total = 0;
        
        inputs.forEach(input => {
            total += parseFloat(input.value) || 0;
        });

        totalElement.textContent = this.formatCurrency(total);
    }

    updateReservesTotal() {
        const container = document.getElementById('reservesItems');
        const totalElement = document.getElementById('reservesTotal');
        
        if (!container || !totalElement) return;

        const inputs = container.querySelectorAll('.current-input');
        let total = 0;
        
        inputs.forEach(input => {
            total += parseFloat(input.value) || 0;
        });

        totalElement.textContent = this.formatCurrency(total);
    }

    updateSummary(period) {
        if (!period) return;

        // Current Balance
        const currentBalance = document.getElementById('currentBalance');
        if (currentBalance) {
            currentBalance.textContent = this.formatCurrency(period.starting_balance);
        }

        // Projected Balance
        const projectedBalance = document.getElementById('projectedBalance');
        if (projectedBalance) {
            projectedBalance.textContent = this.formatCurrency(period.ending_balance);
        }

        // Net Flow
        const netFlow = document.getElementById('netFlow');
        if (netFlow) {
            netFlow.textContent = this.formatCurrency(period.net_flow);
            netFlow.className = `value flow ${period.net_flow >= 0 ? 'positive' : 'negative'}`;
        }

        // Health Status
        const healthStatus = document.getElementById('healthStatus');
        if (healthStatus) {
            const indicator = healthStatus.querySelector('.health-indicator');
            indicator.className = `health-indicator ${period.health_indicator}`;
            indicator.textContent = this.getHealthEmoji(period.health_indicator);
        }
    }

    updateInsights(period) {
        if (!period || !period.breakdown) return;

        const expenses = period.breakdown.expenses?.total || 0;
        const reserves = period.breakdown.reserves?.total || 0;
        const balance = period.ending_balance;

        // Burn Rate
        const burnRate = document.getElementById('burnRate');
        if (burnRate) {
            const dailyBurn = expenses / 30;
            burnRate.textContent = this.formatCurrency(dailyBurn) + '/day';
        }

        // Runway
        const runway = document.getElementById('runway');
        if (runway) {
            const months = expenses > 0 ? Math.floor(balance / expenses) : 999;
            runway.textContent = months > 12 ? '12+ months' : `${months} months`;
        }

        // Reserve Coverage
        const coverage = document.getElementById('reserveCoverage');
        if (coverage) {
            const coveragePercent = expenses > 0 ? Math.round((reserves / (expenses * 3)) * 100) : 0;
            coverage.textContent = `${coveragePercent}%`;
        }
    }

    // ===============================================
    // SAVE FUNCTIONALITY
    // ===============================================
    
    async saveData() {
        if (!this.isDirty) return;

        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.textContent = '⏳';
            saveBtn.disabled = true;
        }

        try {
            const period = this.treasuryData.find(p => p.id === this.currentPeriodId);
            if (!period) return;

            // Save income items
            for (const item of period.breakdown.income?.items || []) {
                await window.electronAPI.updateTreasuryForecast({
                    periodId: this.currentPeriodId,
                    categoryType: 'income',
                    categoryId: item.id,
                    amount: item.amount || 0,
                    notes: item.notes
                });
            }

            // Save expense items
            for (const item of period.breakdown.expenses?.items || []) {
                await window.electronAPI.updateTreasuryForecast({
                    periodId: this.currentPeriodId,
                    categoryType: 'expenses',
                    categoryId: item.id,
                    amount: item.amount || 0,
                    notes: item.notes
                });
            }

            this.isDirty = false;
            this.showSuccess('Data saved successfully');

        } catch (error) {
            console.error('Error saving data:', error);
            this.showError('Failed to save data');
        } finally {
            if (saveBtn) {
                saveBtn.textContent = '💾';
                saveBtn.disabled = false;
            }
        }
    }

    startAutoSave() {
        setInterval(() => {
            if (this.isDirty) {
                this.saveData();
            }
        }, 30000); // Auto-save every 30 seconds
    }

    // ===============================================
    // EVENT LISTENERS
    // ===============================================
    
    setupEventListeners() {
        // Period selector
        const periodSelector = document.getElementById('periodSelector');
        if (periodSelector) {
            periodSelector.addEventListener('change', (e) => {
                this.selectPeriod(parseInt(e.target.value));
            });
        }

        // Save button
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveData());
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadInitialData());
        }

        // Add category buttons
        document.querySelectorAll('.add-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                this.addDynamicCategory(type);
            });
        });

        // Collapsible sections
        document.querySelectorAll('.section-header.collapsible').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.closest('.add-item-btn')) return;
                
                const section = e.target.closest('.input-section');
                const content = section.querySelector('.section-content');
                const icon = header.querySelector('.toggle-icon');
                
                section.classList.toggle('collapsed');
                content.style.display = section.classList.contains('collapsed') ? 'none' : 'block';
                icon.textContent = section.classList.contains('collapsed') ? '▶' : '▼';
            });
        });

        // Metro navigation
        const metroPrev = document.getElementById('metroPrev');
        if (metroPrev) {
            metroPrev.addEventListener('click', () => this.navigateMetro(-1));
        }

        const metroNext = document.getElementById('metroNext');
        if (metroNext) {
            metroNext.addEventListener('click', () => this.navigateMetro(1));
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 's') {
                    e.preventDefault();
                    this.saveData();
                }
            }
        });
    }

    navigateMetro(direction) {
        const currentIndex = this.treasuryData.findIndex(p => p.id === this.currentPeriodId);
        const newIndex = Math.max(0, Math.min(this.treasuryData.length - 1, currentIndex + direction));
        
        if (newIndex !== currentIndex) {
            this.selectPeriod(this.treasuryData[newIndex].id);
        }
    }

    // ===============================================
    // UTILITY FUNCTIONS
    // ===============================================
    
    formatCurrency(amount) {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    }

    getHealthClass(indicator) {
        const classes = {
            excellent: 'health-excellent',
            good: 'health-good',
            warning: 'health-warning',
            critical: 'health-critical'
        };
        return classes[indicator] || 'health-neutral';
    }

    getHealthEmoji(indicator) {
        const emojis = {
            excellent: '💚',
            good: '🟢',
            warning: '🟡',
            critical: '🔴'
        };
        return emojis[indicator] || '⚪';
    }

    getConfidenceClass(level) {
        if (level >= 90) return 'confidence-high';
        if (level >= 70) return 'confidence-medium';
        return 'confidence-low';
    }

    getConfidenceIcon(level) {
        if (level >= 90) return '◉';
        if (level >= 70) return '◐';
        return '○';
    }

    showError(message) {
        console.error(message);
        // Implement toast notification
    }

    showSuccess(message) {
        console.log(message);
        // Implement toast notification
    }
}

// ===============================================
// INITIALIZATION
// ===============================================

let treasuryManager;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTreasury);
} else {
    initializeTreasury();
}

function initializeTreasury() {
    // Check if we're in the treasury tab
    const treasuryContent = document.getElementById('treasury-content');
    if (treasuryContent) {
        console.log('Initializing Treasury Manager...');
        treasuryManager = new TreasuryForecastManager();
        treasuryManager.initialize();
        
        // Export for global access
        window.treasuryManager = treasuryManager;
    }
}

// Alternative initialization function that can be called from other scripts
window.initializeTreasuryModule = function() {
    if (!treasuryManager) {
        treasuryManager = new TreasuryForecastManager();
        treasuryManager.initialize();
        window.treasuryManager = treasuryManager;
    }
};