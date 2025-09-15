// ===============================================
// TREASURY RENDERER - Metro Line UI Logic
// src/treasuryRenderer.js
// ===============================================

// Mock data for initial testing
const MOCK_METRO_DATA = [
    {
        id: 1,
        period_display: 'Oct 2024',
        is_current: true,
        is_forecast: false,
        ending_balance: 47285,
        net_flow: 2285,
        health_indicator: 'positive',
        days_covered: 45,
        breakdown: {
            income: {
                total: 5150,
                items: [
                    { name: 'Primary Salary', icon: '💼', amount: 3500, confidence_level: 100 },
                    { name: 'Consulting/Projects', icon: '🔧', amount: 1200, confidence_level: 95 },
                    { name: 'Investments', icon: '📈', amount: 450, confidence_level: 80 }
                ]
            },
            expenses: {
                total: 2865,
                items: [
                    { name: 'Housing', icon: '🏠', amount: 1200, confidence_level: 100 },
                    { name: 'Utilities', icon: '⚡', amount: 350, confidence_level: 95 },
                    { name: 'Food & Living', icon: '🍽️', amount: 600, confidence_level: 85 },
                    { name: 'Transportation', icon: '🚗', amount: 290, confidence_level: 80 },
                    { name: 'Personal', icon: '👤', amount: 425, confidence_level: 75 }
                ]
            },
            reserves: {
                total: 12000,
                items: [
                    { name: 'Emergency Fund', current_amount: 8500, target_amount: 15000 },
                    { name: 'Tax Savings', current_amount: 2500, target_amount: 5000 },
                    { name: 'Investment Buffer', current_amount: 1000, target_amount: 3000 }
                ]
            }
        }
    },
    {
        id: 2,
        period_display: 'Nov 2024',
        is_current: false,
        is_forecast: true,
        ending_balance: 49100,
        net_flow: 1815,
        health_indicator: 'positive',
        days_covered: 47,
        breakdown: {
            income: {
                total: 5850,
                items: [
                    { name: 'Primary Salary', icon: '💼', amount: 3500, confidence_level: 100 },
                    { name: 'Project Payment', icon: '🔧', amount: 2200, confidence_level: 85 },
                    { name: 'Dividend', icon: '📈', amount: 150, confidence_level: 70 }
                ]
            },
            expenses: {
                total: 4035,
                items: [
                    { name: 'Fixed Costs', icon: '🏠', amount: 2100, confidence_level: 95 },
                    { name: 'Variable Costs', icon: '🛒', amount: 1200, confidence_level: 80 },
                    { name: 'Tax Payment', icon: '💸', amount: 635, confidence_level: 90 },
                    { name: 'Insurance', icon: '🛡️', amount: 100, confidence_level: 100 }
                ]
            },
            reserves: {
                total: 12500,
                items: [
                    { name: 'Emergency Fund', current_amount: 9000, target_amount: 15000 },
                    { name: 'Tax Savings', current_amount: 2500, target_amount: 5000 },
                    { name: 'Investment Buffer', current_amount: 1000, target_amount: 3000 }
                ]
            }
        }
    },
    {
        id: 3,
        period_display: 'Dec 2024',
        is_current: false,
        is_forecast: true,
        ending_balance: 51250,
        net_flow: 2150,
        health_indicator: 'positive',
        days_covered: 52,
        breakdown: {
            income: {
                total: 6250,
                items: [
                    { name: 'Primary Salary', icon: '💼', amount: 3500, confidence_level: 100 },
                    { name: 'Year-end Bonus', icon: '🎉', amount: 1800, confidence_level: 90 },
                    { name: 'Client Payment', icon: '💰', amount: 950, confidence_level: 85 }
                ]
            },
            expenses: {
                total: 4100,
                items: [
                    { name: 'Regular Costs', icon: '🏠', amount: 2100, confidence_level: 95 },
                    { name: 'Holiday Expenses', icon: '🎄', amount: 1500, confidence_level: 75 },
                    { name: 'Annual Insurance', icon: '🛡️', amount: 500, confidence_level: 100 }
                ]
            },
            reserves: {
                total: 13200,
                items: [
                    { name: 'Emergency Fund', current_amount: 9500, target_amount: 15000 },
                    { name: 'Tax Savings', current_amount: 2700, target_amount: 5000 },
                    { name: 'Investment Buffer', current_amount: 1000, target_amount: 3000 }
                ]
            }
        }
    },
    {
        id: 4,
        period_display: 'Jan 2025',
        is_current: false,
        is_forecast: true,
        ending_balance: 48900,
        net_flow: -2350,
        health_indicator: 'warning',
        days_covered: 42,
        breakdown: {
            income: {
                total: 4300,
                items: [
                    { name: 'Primary Salary', icon: '💼', amount: 3500, confidence_level: 100 },
                    { name: 'Freelance', icon: '🔧', amount: 800, confidence_level: 70 }
                ]
            },
            expenses: {
                total: 6650,
                items: [
                    { name: 'Regular Costs', icon: '🏠', amount: 2100, confidence_level: 95 },
                    { name: 'Annual Fees', icon: '💳', amount: 2500, confidence_level: 100 },
                    { name: 'Tax Payment', icon: '💸', amount: 1200, confidence_level: 90 },
                    { name: 'Equipment', icon: '💻', amount: 850, confidence_level: 80 }
                ]
            },
            reserves: {
                total: 11900,
                items: [
                    { name: 'Emergency Fund', current_amount: 8700, target_amount: 15000 },
                    { name: 'Tax Savings', current_amount: 2200, target_amount: 5000 },
                    { name: 'Investment Buffer', current_amount: 1000, target_amount: 3000 }
                ]
            }
        }
    },
    {
        id: 5,
        period_display: 'Feb 2025',
        is_current: false,
        is_forecast: true,
        ending_balance: 51150,
        net_flow: 2250,
        health_indicator: 'positive',
        days_covered: 48,
        breakdown: {
            income: {
                total: 5750,
                items: [
                    { name: 'Primary Salary', icon: '💼', amount: 3500, confidence_level: 100 },
                    { name: 'New Project', icon: '🚀', amount: 1800, confidence_level: 75 },
                    { name: 'Investments', icon: '📈', amount: 450, confidence_level: 65 }
                ]
            },
            expenses: {
                total: 3500,
                items: [
                    { name: 'Regular Costs', icon: '🏠', amount: 2100, confidence_level: 95 },
                    { name: 'Variable Costs', icon: '🛒', amount: 900, confidence_level: 80 },
                    { name: 'Personal', icon: '👤', amount: 500, confidence_level: 75 }
                ]
            },
            reserves: {
                total: 12400,
                items: [
                    { name: 'Emergency Fund', current_amount: 9200, target_amount: 15000 },
                    { name: 'Tax Savings', current_amount: 2200, target_amount: 5000 },
                    { name: 'Investment Buffer', current_amount: 1000, target_amount: 3000 }
                ]
            }
        }
    }
];

// Global treasury state
let currentTreasuryData = [];
let activeTreasuryStationId = null;

// Replace the initialization in treasuryForecastRenderer.js
function initializeTreasuryModule() {
    console.log('🏦 Initializing Treasury Module...');
    
    // Setup treasury tab event handlers
    setupTreasuryEventHandlers();
    
    // Load real data instead of mock data
    loadRealTreasuryData();
    
    console.log('✅ Treasury Module initialized');
}

// Update the load function to use real API
async function loadRealTreasuryData() {
    try {
        console.log('🔄 Loading real treasury data...');
        
        if (typeof window.electronAPI !== 'undefined' && window.electronAPI.getMetroTreasuryData) {
            const response = await window.electronAPI.getMetroTreasuryData();
            if (response.success) {
                currentTreasuryData = response.data;
                renderTreasuryStations();
                renderTreasurySummaryCards();
                console.log('✅ Real treasury data loaded');
            } else {
                console.error('❌ Failed to load treasury data:', response.error);
                showTreasuryError('Failed to load treasury data from database.');
            }
        } else {
            console.log('⚠️ Treasury API not available, using mock data');
            currentTreasuryData = MOCK_METRO_DATA; // Fallback
        }
    } catch (error) {
        console.error('❌ Error loading real treasury data:', error);
        showTreasuryError('Error connecting to treasury database.');
    }
}

// Setup event handlers for treasury
function setupTreasuryEventHandlers() {
    // Treasury tab click
    const treasuryTab = document.getElementById('treasuryTab');
    if (treasuryTab) {
        treasuryTab.addEventListener('click', function() {
            switchToTreasuryTab();
        });
    }

    // Treasury refresh button
    const refreshBtn = document.getElementById('treasuryRefreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshTreasuryData);
    }

    // Tab navigation
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchToTab(tabId);
        });
    });

    // Close popups when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.metro-station')) {
            closeTreasuryAllPopups();
        }
    });
}

// Switch to treasury tab
function switchToTreasuryTab() {
    switchToTab('treasury');
    
    // Render treasury data if not already rendered
    if (document.getElementById('metroStations').children.length === 0) {
        renderTreasuryStations();
        renderTreasurySummaryCards();
    }
}

// Generic tab switcher
function switchToTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-tab') === tabId) {
            tab.classList.add('active');
        }
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });

    const activeContent = document.getElementById(tabId + '-content');
    if (activeContent) {
        activeContent.classList.add('active');
        activeContent.style.display = 'block';
    }

    // Update page title
    const titleMap = {
        'movimientos': 'Movimientos',
        'treasury': 'Treasury Forecast',
        'reports': 'Reports'
    };
    
    const pageTitle = document.querySelector('.page-title');
    if (pageTitle && titleMap[tabId]) {
        pageTitle.innerHTML = titleMap[tabId];
    }
}

// Render treasury stations
function renderTreasuryStations() {
    const container = document.getElementById('metroStations');
    if (!container) return;
    
    container.innerHTML = '';

    currentTreasuryData.forEach((period, index) => {
        const station = createTreasuryStationElement(period, index);
        container.appendChild(station);
    });
}

// Create individual treasury station element
function createTreasuryStationElement(period, index) {
    const station = document.createElement('div');
    station.className = 'metro-station';
    station.setAttribute('data-period-id', period.id);

    // Determine circle class
    let circleClass = 'metro-circle';
    if (period.is_current) circleClass += ' current';
    else if (period.is_forecast) circleClass += ' forecast';
    if (period.health_indicator === 'negative') circleClass += ' negative';

    // Determine change class
    let changeClass = 'metro-change';
    if (period.net_flow > 0) changeClass += ' change-positive';
    else if (period.net_flow < 0) changeClass += ' change-negative';
    else changeClass += ' change-neutral';

    // Format amounts
    const balance = formatTreasuryAmount(period.ending_balance);
    const change = period.net_flow >= 0 ? 
        `+${formatTreasuryAmount(period.net_flow)}` : 
        formatTreasuryAmount(period.net_flow);

    station.innerHTML = `
        <div class="${circleClass}">
            ${period.is_current ? 'NOW' : (index + 1)}
        </div>
        
        <div class="metro-info">
            <div class="metro-month">${period.period_display}</div>
            <div class="metro-balance">${balance}</div>
            <div class="${changeClass}">${change}</div>
        </div>

        <div class="metro-popup">
            <div class="popup-header">
                <div class="popup-title">${period.period_display} - Details</div>
                <button class="popup-close">×</button>
            </div>
            
            <div class="breakdown-section">
                <div class="breakdown-title">💰 Income</div>
                <div class="breakdown-total income-total">${formatTreasuryAmount(period.breakdown.income.total)}</div>
                <div class="breakdown-items">
                    ${period.breakdown.income.items.map(item => `
                        <div class="breakdown-item">
                            <div class="item-left">
                                <span class="item-icon">${item.icon}</span>
                                <span class="item-name">${item.name}</span>
                            </div>
                            <span class="item-amount">${formatTreasuryAmount(item.amount)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="breakdown-section">
                <div class="breakdown-title">💸 Expenses</div>
                <div class="breakdown-total expense-total">${formatTreasuryAmount(period.breakdown.expenses.total)}</div>
                <div class="breakdown-items">
                    ${period.breakdown.expenses.items.map(item => `
                        <div class="breakdown-item">
                            <div class="item-left">
                                <span class="item-icon">${item.icon}</span>
                                <span class="item-name">${item.name}</span>
                            </div>
                            <span class="item-amount">${formatTreasuryAmount(item.amount)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="breakdown-section">
                <div class="breakdown-title">🛡️ Reserves</div>
                <div class="breakdown-total reserve-total">${formatTreasuryAmount(period.breakdown.reserves.total)}</div>
                <div class="breakdown-items">
                    ${period.breakdown.reserves.items.map(item => `
                        <div class="breakdown-item">
                            <div class="item-left">
                                <span class="item-icon">💰</span>
                                <span class="item-name">${item.name}</span>
                            </div>
                            <span class="item-amount">${formatTreasuryAmount(item.current_amount)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    // Add click handler
    station.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleTreasuryStationPopup(period.id);
    });

    // Add close button handler
    const closeBtn = station.querySelector('.popup-close');
    closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        closeTreasuryStationPopup(period.id);
    });

    return station;
}

// Toggle treasury station popup
function toggleTreasuryStationPopup(periodId) {
    const station = document.querySelector(`[data-period-id="${periodId}"]`);
    
    if (activeTreasuryStationId === periodId) {
        // Close if already active
        closeTreasuryStationPopup(periodId);
    } else {
        // Close all other popups and open this one
        closeTreasuryAllPopups();
        station.classList.add('active');
        activeTreasuryStationId = periodId;
    }
}

// Close specific treasury station popup
function closeTreasuryStationPopup(periodId) {
    const station = document.querySelector(`[data-period-id="${periodId}"]`);
    if (station) {
        station.classList.remove('active');
    }
    if (activeTreasuryStationId === periodId) {
        activeTreasuryStationId = null;
    }
}

// Close all treasury popups
function closeTreasuryAllPopups() {
    document.querySelectorAll('.metro-station').forEach(station => {
        station.classList.remove('active');
    });
    activeTreasuryStationId = null;
}

// Render treasury summary cards
function renderTreasurySummaryCards() {
    const container = document.getElementById('metroSummary');
    if (!container) return;
    
    if (currentTreasuryData.length === 0) {
        container.innerHTML = '<div class="metro-error">No treasury data available</div>';
        return;
    }

    // Calculate summary data
    const currentPeriod = currentTreasuryData.find(p => p.is_current) || currentTreasuryData[0];
    const lastPeriod = currentTreasuryData[currentTreasuryData.length - 1];
    const totalGrowth = lastPeriod.ending_balance - currentPeriod.ending_balance;
    const avgDaysCovered = currentTreasuryData.reduce((sum, p) => sum + p.days_covered, 0) / currentTreasuryData.length;
    
    // Find period with minimum balance
    const minBalancePeriod = currentTreasuryData.reduce((min, p) => 
        p.ending_balance < min.ending_balance ? p : min, currentTreasuryData[0]);

    const summaryCards = [
        {
            value: formatTreasuryAmount(currentPeriod.ending_balance),
            label: 'Current Balance',
            class: 'positive'
        },
        {
            value: formatTreasuryAmount(lastPeriod.ending_balance),
            label: `Projected ${lastPeriod.period_display}`,
            class: lastPeriod.ending_balance > currentPeriod.ending_balance ? 'positive' : 'negative'
        },
        {
            value: totalGrowth >= 0 ? `+${formatTreasuryAmount(totalGrowth)}` : formatTreasuryAmount(totalGrowth),
            label: 'Forecast Growth',
            class: totalGrowth >= 0 ? 'positive' : 'negative'
        },
        {
            value: `${Math.round(avgDaysCovered)} days`,
            label: 'Avg Reserve Coverage',
            class: avgDaysCovered >= 45 ? 'positive' : avgDaysCovered >= 30 ? 'warning' : 'negative'
        },
        {
            value: formatTreasuryAmount(minBalancePeriod.ending_balance),
            label: `Lowest Point (${minBalancePeriod.period_display})`,
            class: minBalancePeriod.health_indicator
        }
    ];

    container.innerHTML = summaryCards.map(card => `
        <div class="summary-card ${card.class}">
            <div class="summary-value">${card.value}</div>
            <div class="summary-label">${card.label}</div>
        </div>
    `).join('');
}

// Refresh treasury data
async function refreshTreasuryData() {
    const refreshBtn = document.getElementById('treasuryRefreshBtn');
    const spinner = document.getElementById('treasuryLoadingSpinner');
    
    if (!refreshBtn || !spinner) return;
    
    // Show loading state
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Refreshing...';
    spinner.style.display = 'block';
    
    try {
        // TODO: Replace with actual API call when backend is ready
        console.log('🔄 Refreshing treasury data...');
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // For now, simulate data changes
        currentTreasuryData = MOCK_METRO_DATA.map(period => ({
            ...period,
            ending_balance: period.ending_balance + (Math.random() * 2000 - 1000) // Random variation for demo
        }));
        
        // Re-render
        renderTreasuryStations();
        renderTreasurySummaryCards();
        
        console.log('✅ Treasury data refreshed successfully');
        
    } catch (error) {
        console.error('❌ Error refreshing treasury data:', error);
        // Show error state
        showTreasuryError('Failed to refresh treasury data. Please try again.');
    } finally {
        // Hide loading state
        refreshBtn.disabled = false;
        refreshBtn.textContent = 'Refresh Data';
        spinner.style.display = 'none';
    }
}

// Show treasury error
function showTreasuryError(message) {
    const container = document.getElementById('metroStations');
    if (container) {
        container.innerHTML = `<div class="metro-error">⚠️ ${message}</div>`;
    }
}

// Format treasury amounts
function formatTreasuryAmount(amount) {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.abs(amount));
}

// ===============================================
// INTEGRATION FUNCTIONS (for when backend is ready)
// ===============================================

// Load real data from treasury database
async function loadRealTreasuryData() {
    try {
        console.log('🔄 Loading real treasury data...');
        
        if (typeof window.electronAPI !== 'undefined' && window.electronAPI.getMetroTreasuryData) {
            const response = await window.electronAPI.getMetroTreasuryData();
            if (response.success) {
                currentTreasuryData = response.data;
                renderTreasuryStations();
                renderTreasurySummaryCards();
                console.log('✅ Real treasury data loaded');
            } else {
                console.error('❌ Failed to load treasury data:', response.error);
                showTreasuryError('Failed to load treasury data from database.');
            }
        } else {
            console.log('⚠️ Treasury API not available, using mock data');
        }
    } catch (error) {
        console.error('❌ Error loading real treasury data:', error);
        showTreasuryError('Error connecting to treasury database.');
    }
}

// Update current balance from main database
async function updateTreasuryCurrentBalance() {
    try {
        if (typeof window.electronAPI !== 'undefined' && window.electronAPI.getCurrentBalance) {
            const response = await window.electronAPI.getCurrentBalance();
            if (response.success) {
                // Update current period with real balance
                const currentPeriod = currentTreasuryData.find(p => p.is_current);
                if (currentPeriod) {
                    currentPeriod.ending_balance = response.data;
                    renderTreasuryStations();
                    renderTreasurySummaryCards();
                    console.log('✅ Current balance updated:', response.data);
                }
            }
        }
    } catch (error) {
        console.error('❌ Error getting current balance:', error);
    }
}

// Export treasury module functions
window.TreasuryModule = {
    initialize: initializeTreasuryModule,
    switchToTab: switchToTreasuryTab,
    refresh: refreshTreasuryData,
    loadRealData: loadRealTreasuryData,
    updateCurrentBalance: updateTreasuryCurrentBalance
};