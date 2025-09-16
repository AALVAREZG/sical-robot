// ===============================================
// TREASURY COMPACT RENDERER
// Simplified compact-only treasury visualization
// ===============================================

let treasuryData = [];
let currentPeriodId = null;

// ===============================================
// MAIN INITIALIZATION
// ===============================================

function initializeTreasuryModule() {
    console.log('🏦 Initializing Treasury Compact Module...');
    
    const treasuryContent = document.getElementById('treasury-content');
    if (!treasuryContent) {
        console.error('Treasury content container not found');
        return;
    }

    // Create compact layout
    createCompactTreasuryLayout(treasuryContent);
    
    // Load data
    loadTreasuryData();
    
    // Setup event listeners
    setupTreasuryEventListeners();
    
    console.log('✅ Treasury Compact Module initialized');
}

// ===============================================
// COMPACT LAYOUT CREATION
// ===============================================

function createCompactTreasuryLayout(container) {
    container.innerHTML = `
        <div class="treasury-compact-container">
            <!-- Compact Header -->
            <div class="treasury-compact-header">
                <div class="header-main">
                    <h2 class="treasury-title">Treasury Forecast</h2>
                    <div class="header-actions">
                        <select class="period-selector" id="periodSelector">
                            <option value="">Loading periods...</option>
                        </select>
                        <button class="action-btn refresh" id="refreshBtn">🔄</button>
                        <button class="action-btn save" id="saveBtn">💾</button>
                    </div>
                </div>
                
                <div class="summary-bar">
                    <div class="summary-item">
                        <span class="label">Current</span>
                        <span class="value current" id="currentBalance">€0</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Next Month</span>
                        <span class="value forecast" id="nextBalance">€0</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Net Flow</span>
                        <span class="value flow" id="netFlow">€0</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Trend</span>
                        <span class="value trend" id="trendIcon">📈</span>
                    </div>
                </div>
            </div>

            <!-- Metro Line (Simplified) -->
            <div class="metro-line-compact">
                <div class="metro-track"></div>
                <div class="metro-stations" id="metroStations">
                    <!-- Stations populated by JS -->
                </div>
            </div>

            <!-- Compact Data Input -->
            <div class="data-input-compact">
                <div class="input-sections">
                    <div class="input-section income">
                        <div class="section-header">
                            <h3>💰 Income</h3>
                            <span class="total" id="incomeTotal">€0</span>
                        </div>
                        <div class="input-items" id="incomeItems">
                            <!-- Income items populated by JS -->
                        </div>
                    </div>
                    
                    <div class="input-section expenses">
                        <div class="section-header">
                            <h3>💸 Expenses</h3>
                            <span class="total" id="expenseTotal">€0</span>
                        </div>
                        <div class="input-items" id="expenseItems">
                            <!-- Expense items populated by JS -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ===============================================
// DATA LOADING AND MANAGEMENT
// ===============================================

async function loadTreasuryData() {
    try {
        if (window.electronAPI && window.electronAPI.getTreasuryMetroData) {
            const response = await window.electronAPI.getTreasuryMetroData();
            if (response.success) {
                treasuryData = response.data;
                renderMetroLine();
                loadCategories();
                updateSummaryBar();
            } else {
                console.warn('Using mock data');
                loadMockData();
            }
        } else {
            console.warn('Treasury API not available, using mock data');
            loadMockData();
        }
    } catch (error) {
        console.error('Error loading treasury data:', error);
        loadMockData();
    }
}

function loadMockData() {
    treasuryData = [
        {
            id: 1,
            period_display: 'Sep 2025',
            is_current: true,
            ending_balance: 973248,
            net_flow: 2235
        },
        {
            id: 2,
            period_display: 'Oct 2025',
            ending_balance: 975483,
            net_flow: 2235
        },
        {
            id: 3,
            period_display: 'Nov 2025',
            ending_balance: 977133,
            net_flow: 1650
        },
        {
            id: 4,
            period_display: 'Dec 2025',
            ending_balance: 979713,
            net_flow: 2580
        },
        {
            id: 5,
            period_display: 'Jan 2026',
            ending_balance: 982443,
            net_flow: 2730
        },
        {
            id: 6,
            period_display: 'Feb 2026',
            ending_balance: 983283,
            net_flow: 840
        }
    ];
    
    renderMetroLine();
    loadMockCategories();
    updateSummaryBar();
}

// ===============================================
// METRO LINE RENDERING (SIMPLIFIED)
// ===============================================

function renderMetroLine() {
    const container = document.getElementById('metroStations');
    if (!container) return;

    container.innerHTML = treasuryData.map((period, index) => `
        <div class="metro-station ${period.is_current ? 'current' : ''} ${period.net_flow < 0 ? 'negative' : 'positive'}"
             data-period-id="${period.id}">
            <div class="station-circle">
                ${period.is_current ? '●' : index + 1}
            </div>
            <div class="station-info">
                <div class="period">${period.period_display}</div>
                <div class="balance">€${formatNumber(period.ending_balance)}</div>
            </div>
        </div>
    `).join('');

    // Update period selector
    const periodSelector = document.getElementById('periodSelector');
    if (periodSelector) {
        periodSelector.innerHTML = treasuryData.map(period => 
            `<option value="${period.id}" ${period.is_current ? 'selected' : ''}>
                ${period.period_display}
            </option>`
        ).join('');
    }
}

// ===============================================
// CATEGORIES AND INPUT MANAGEMENT
// ===============================================

async function loadCategories() {
    try {
        if (window.electronAPI && window.electronAPI.getTreasuryCategories) {
            const response = await window.electronAPI.getTreasuryCategories();
            if (response.success) {
                renderInputItems(response.data.income, 'income');
                renderInputItems(response.data.expenses, 'expenses');
            } else {
                loadMockCategories();
            }
        } else {
            loadMockCategories();
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        loadMockCategories();
    }
}

function loadMockCategories() {
    const mockIncome = [
        { id: 1, name: 'Primary Salary', icon: '💼', forecasted_amount: 3500, confidence_level: 100 },
        { id: 2, name: 'Consulting', icon: '🔧', forecasted_amount: 1200, confidence_level: 80 }
    ];
    
    const mockExpenses = [
        { id: 1, name: 'Housing', icon: '🏠', forecasted_amount: 1200, confidence_level: 95 },
        { id: 2, name: 'Utilities', icon: '⚡', forecasted_amount: 350, confidence_level: 90 },
        { id: 3, name: 'Food', icon: '🍽️', forecasted_amount: 600, confidence_level: 85 }
    ];
    
    renderInputItems(mockIncome, 'income');
    renderInputItems(mockExpenses, 'expenses');
}

function renderInputItems(items, type) {
    const container = document.getElementById(`${type}Items`);
    if (!container) return;

    container.innerHTML = items.map(item => `
        <div class="input-item" data-category-id="${item.id}" data-type="${type}">
            <div class="item-info">
                <span class="icon">${item.icon}</span>
                <span class="name">${item.name}</span>
            </div>
            <div class="item-controls">
                <input type="number" 
                       class="amount-input" 
                       value="${item.forecasted_amount || ''}"
                       placeholder="0">
                <span class="confidence ${getConfidenceClass(item.confidence_level)}"
                      title="Confidence: ${item.confidence_level || 80}%">
                    ${getConfidenceIcon(item.confidence_level || 80)}
                </span>
            </div>
        </div>
    `).join('');

    updateSectionTotal(type);
}

// ===============================================
// EVENT LISTENERS
// ===============================================

function setupTreasuryEventListeners() {
    // Period selector
    const periodSelector = document.getElementById('periodSelector');
    if (periodSelector) {
        periodSelector.addEventListener('change', handlePeriodChange);
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadTreasuryData);
    }

    // Save button
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveAllChanges);
    }

    // Input changes
    document.addEventListener('input', handleInputChange);

    // Metro station clicks
    document.addEventListener('click', handleStationClick);
}

function handlePeriodChange(e) {
    currentPeriodId = parseInt(e.target.value);
    // Reload data for selected period
    console.log('Period changed to:', currentPeriodId);
}

function handleInputChange(e) {
    if (!e.target.classList.contains('amount-input')) return;

    const item = e.target.closest('.input-item');
    if (!item) return;

    const type = item.dataset.type;
    updateSectionTotal(type);

    // Debounced save
    clearTimeout(window.saveTimeout);
    window.saveTimeout = setTimeout(() => {
        saveInputChange(item, e.target.value);
    }, 500);
}

function handleStationClick(e) {
    const station = e.target.closest('.metro-station');
    if (!station) return;

    // Remove active class from all stations
    document.querySelectorAll('.metro-station').forEach(s => 
        s.classList.remove('active'));
    
    // Add active class to clicked station
    station.classList.add('active');
    
    // Update period selector
    const periodId = station.dataset.periodId;
    const periodSelector = document.getElementById('periodSelector');
    if (periodSelector) {
        periodSelector.value = periodId;
        currentPeriodId = parseInt(periodId);
    }
}

// ===============================================
// DATA PROCESSING
// ===============================================

function updateSectionTotal(type) {
    const container = document.getElementById(`${type}Items`);
    const totalElement = document.getElementById(`${type}Total`);
    
    if (!container || !totalElement) return;

    const inputs = container.querySelectorAll('.amount-input');
    let total = 0;
    
    inputs.forEach(input => {
        const value = parseFloat(input.value) || 0;
        total += value;
    });

    totalElement.textContent = `€${formatNumber(total)}`;
}

function updateSummaryBar() {
    if (treasuryData.length === 0) return;

    const current = treasuryData.find(p => p.is_current) || treasuryData[0];
    const next = treasuryData[1] || treasuryData[0];
    
    const currentBalance = document.getElementById('currentBalance');
    const nextBalance = document.getElementById('nextBalance');
    const netFlow = document.getElementById('netFlow');
    const trendIcon = document.getElementById('trendIcon');

    if (currentBalance) currentBalance.textContent = `€${formatNumber(current.ending_balance)}`;
    if (nextBalance) nextBalance.textContent = `€${formatNumber(next.ending_balance)}`;
    if (netFlow) {
        const flow = next.ending_balance - current.ending_balance;
        netFlow.textContent = `€${formatNumber(flow)}`;
        netFlow.className = `value flow ${flow >= 0 ? 'positive' : 'negative'}`;
    }
    if (trendIcon) {
        trendIcon.textContent = next.ending_balance > current.ending_balance ? '📈' : '📉';
    }
}

async function saveInputChange(item, value) {
    const categoryId = item.dataset.categoryId;
    const type = item.dataset.type;
    const amount = parseFloat(value) || 0;

    try {
        if (window.electronAPI && window.electronAPI.updateTreasuryForecast) {
            await window.electronAPI.updateTreasuryForecast(
                currentPeriodId,
                type,
                categoryId,
                amount
            );
            console.log(`Saved ${type} category ${categoryId}: €${amount}`);
        }
    } catch (error) {
        console.error('Error saving input:', error);
    }
}

async function saveAllChanges() {
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.textContent = '💾 Saving...';
        saveBtn.disabled = true;
    }

    try {
        // Save all input changes
        const inputs = document.querySelectorAll('.amount-input');
        for (const input of inputs) {
            const item = input.closest('.input-item');
            if (item && input.value) {
                await saveInputChange(item, input.value);
            }
        }
        
        // Show success
        showNotification('Changes saved successfully', 'success');
        
    } catch (error) {
        console.error('Error saving all changes:', error);
        showNotification('Error saving changes', 'error');
    } finally {
        if (saveBtn) {
            saveBtn.textContent = '💾';
            saveBtn.disabled = false;
        }
    }
}

// ===============================================
// UTILITY FUNCTIONS
// ===============================================

function formatNumber(num) {
    return new Intl.NumberFormat('de-DE').format(num);
}

function getConfidenceClass(level) {
    if (level >= 90) return 'high';
    if (level >= 70) return 'medium';
    return 'low';
}

function getConfidenceIcon(level) {
    if (level >= 90) return '🟢';
    if (level >= 70) return '🟡';
    return '🔴';
}

function showNotification(message, type) {
    console.log(`${type === 'success' ? '✅' : '❌'} ${message}`);
}

// ===============================================
// EXPORTS
// ===============================================

window.initializeTreasuryModule = initializeTreasuryModule;