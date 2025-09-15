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

// Fixed: Initialize with real data instead of mock
function initializeTreasuryModule() {
    console.log('🏦 Initializing Treasury Module...');
    console.log('🔍 Checking electronAPI availability:', typeof window.electronAPI);
    console.log('🔍 Checking treasury methods:', {
        getMetroTreasuryData: typeof window.electronAPI?.getMetroTreasuryData,
        getCurrentBalance: typeof window.electronAPI?.getCurrentBalance
    });
    
    // Setup treasury tab event handlers
    setupTreasuryEventHandlers();
    
    // Load real data instead of mock data
    loadRealTreasuryData();
    
    console.log('✅ Treasury Module initialized');
}



// Fixed: Load real data with proper error handling
async function loadRealTreasuryData() {
    try {
        console.log('🔄 Loading real treasury data...');
        
        if (typeof window.electronAPI !== 'undefined' && window.electronAPI.getMetroTreasuryData) {
            const response = await window.electronAPI.getMetroTreasuryData();
            if (response.success && response.data && response.data.length > 0) {
                currentTreasuryData = response.data;
                
                // Update current balance from main database
                await updateTreasuryCurrentBalance();
                
                renderTreasuryStations();
                renderTreasurySummaryCards();
                console.log('✅ Real treasury data loaded:', currentTreasuryData.length, 'periods');
            } else {
                console.error('❌ No treasury data available:', response.error);
                currentTreasuryData = [];
                showTreasuryError('No treasury data found. Database may need initialization.');
            }
        } else {
            console.log('⚠️ Treasury API not available');
            currentTreasuryData = [];
            showTreasuryError('Treasury API not available. Please check backend connection.');
        }
    } catch (error) {
        console.error('❌ Error loading real treasury data:', error);
        currentTreasuryData = [];
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

function renderTreasuryStations() {
    console.log('🎨 Rendering treasury stations...');
    console.log('📊 Current treasury data:', {
        length: currentTreasuryData.length,
        firstPeriod: currentTreasuryData[0] ? {
            id: currentTreasuryData[0].id,
            starting_balance: currentTreasuryData[0].starting_balance,
            ending_balance: currentTreasuryData[0].ending_balance,
            net_flow: currentTreasuryData[0].net_flow
        } : 'No data'
    });
    
    const container = document.getElementById('metroStations');
    if (!container) {
        console.error('❌ Metro stations container not found');
        return;
    }
       
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

// Fixed: Refresh calls real API instead of mock data
async function refreshTreasuryData() {
    const refreshBtn = document.getElementById('treasuryRefreshBtn');
    const spinner = document.getElementById('treasuryLoadingSpinner');
    
    if (!refreshBtn || !spinner) return;
    
    // Show loading state
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Refreshing...';
    spinner.style.display = 'block';
    
    try {
        console.log('🔄 Refreshing treasury data...');
        
        // FIXED: Call real API instead of mock data
        if (typeof window.electronAPI !== 'undefined' && window.electronAPI.getMetroTreasuryData) {
            const response = await window.electronAPI.getMetroTreasuryData();
            if (response.success && response.data) {
                currentTreasuryData = response.data;
                
                // Update current balance from main database
                await updateTreasuryCurrentBalanceExact();
                
                // Re-render with updated data
                renderTreasuryStations();
                renderTreasurySummaryCards();
                
                console.log('✅ Treasury data refreshed successfully');
            } else {
                console.error('❌ Failed to refresh treasury data:', response.error);
                showTreasuryError('Failed to refresh treasury data from database.');
            }
        } else {
            console.log('⚠️ Treasury API not available');
            showTreasuryError('Treasury API not available. Please check backend connection.');
        }
        
    } catch (error) {
        console.error('❌ Error refreshing treasury data:', error);
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

// ===============================================
// UPDATED BALANCE TEST FUNCTIONS
// Add these to treasuryForecastRenderer.js for testing the new SQL logic
// ===============================================

// Enhanced test function to verify the exact SQL balance calculation
window.testExactBalanceCalculation = async function() {
  console.log('🧪 Testing exact balance calculation with sort_key ordering...');
  
  try {
    // Test the main current balance calculation
    console.log('1️⃣ Testing main current balance calculation...');
    const simpleBalance = await window.electronAPI.getCurrentBalance();
    console.log('📊 Simple balance result:', simpleBalance);
    
    // Test detailed current balance with breakdown
    console.log('2️⃣ Testing detailed current balance with account breakdown...');
    const detailedBalance = await window.electronAPI.getCurrentBalanceDetailed();
    console.log('📊 Detailed balance result:', detailedBalance);
    
    if (detailedBalance.success) {
      console.log('📋 Account breakdown:');
      detailedBalance.data.accounts.forEach(account => {
        console.log(`  - ${account.caja}: ${account.balance} (sort_key: ${account.sort_key}, date: ${account.last_date})`);
      });
      console.log(`💰 Grand Total: ${detailedBalance.data.balance} from ${detailedBalance.data.total_accounts} accounts`);
      console.log(`📅 Latest update: ${detailedBalance.data.last_update} (sort_key: ${detailedBalance.data.latest_sort_key})`);
    }
    
    // Test account balances summary
    console.log('3️⃣ Testing account balances summary...');
    const accountBalances = await window.electronAPI.getAccountBalances();
    console.log('📊 Account balances summary:', accountBalances);
    
    if (accountBalances.success) {
      console.log('🔍 Verification:');
      let manualSum = 0;
      accountBalances.data.accounts.forEach(account => {
        manualSum += account.balance;
        console.log(`  - ${account.account}: ${account.balance} (${account.total_movements} movements)`);
      });
      console.log(`✓ Manual sum: ${manualSum}`);
      console.log(`✓ Database total: ${accountBalances.data.total_balance}`);
      console.log(`✓ Match: ${manualSum === accountBalances.data.total_balance ? '✅ YES' : '❌ NO'}`);
    }
    
    return {
      simple: simpleBalance,
      detailed: detailedBalance,
      accounts: accountBalances,
      verification: 'Check console for detailed breakdown'
    };
    
  } catch (error) {
    console.error('❌ Balance test failed:', error);
    return { error: error.message };
  }
};

// Test function to debug the step-by-step calculation
window.testBalanceCalculationSteps = async function() {
  console.log('🔍 Testing balance calculation step by step...');
  
  try {
    // This requires adding the debug handler to main.js
    const debugResult = await window.electronAPI.getBalanceCalculationDebug();
    
    if (debugResult.success) {
      console.log('📊 Step-by-step balance calculation:');
      
      console.log('🔸 Step 1: All movements with ranking:');
      debugResult.data.step1_all_movements.slice(0, 10).forEach(mov => {
        console.log(`  ${mov.caja} | ${mov.saldo} | ${mov.sort_key} | rn:${mov.rn} | ${mov.fecha}`);
      });
      console.log(`  ... (showing first 10 of ${debugResult.data.step1_all_movements.length} total)`);
      
      console.log('🔸 Step 2: Latest movement per account (rn=1):');
      debugResult.data.step2_latest_per_account.forEach(acc => {
        console.log(`  ${acc.caja}: ${acc.saldo}`);
      });
      
      console.log('🔸 Step 3: Sum per account:');
      debugResult.data.step3_sum_per_account.forEach(acc => {
        console.log(`  ${acc.caja}: ${acc.total_saldo}`);
      });
      
      console.log(`🔸 Final Total: ${debugResult.data.final_total}`);
    }
    
    return debugResult;
  } catch (error) {
    console.error('❌ Debug test failed:', error);
    return { error: error.message };
  }
};

// Test specific account with sort_key details
window.testAccountBalanceWithSortKey = async function(accountName) {
  console.log(`🧪 Testing balance for account: ${accountName} with sort_key details`);
  
  try {
    const result = await window.electronAPI.getCurrentBalanceForAccount(accountName);
    console.log(`📊 Balance for ${accountName}:`, result);
    
    if (result.success) {
      console.log(`💰 Balance: ${result.data.balance}`);
      console.log(`📅 Date: ${result.data.date}`);
      console.log(`🔑 Sort Key: ${result.data.sort_key}`);
      console.log(`📝 Concept: ${result.data.concept}`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Error testing balance for ${accountName}:`, error);
    return { error: error.message };
  }
};

// Enhanced treasury balance update with exact SQL logic
async function updateTreasuryCurrentBalanceExact() {
    try {
        console.log('🏦 Updating treasury with exact SQL balance calculation...');
        
        if (typeof window.electronAPI !== 'undefined' && window.electronAPI.getCurrentBalanceDetailed) {
            const response = await window.electronAPI.getCurrentBalanceDetailed();
            if (response.success) {
                const totalBalance = response.data.balance;
                console.log('🏦 Exact balance data:', {
                    total: totalBalance,
                    accounts: response.data.accounts.length,
                    latest_sort_key: response.data.latest_sort_key,
                    last_update: response.data.last_update,
                    breakdown: response.data.accounts.map(acc => `${acc.caja}: ${acc.balance}`)
                });
                
                // Update the first period's starting balance
                if (currentTreasuryData.length > 0) {
                    const firstPeriod = currentTreasuryData[0];
                    const oldBalance = firstPeriod.starting_balance;
                    firstPeriod.starting_balance = totalBalance;
                    
                    // Recalculate ending balance based on net flow
                    firstPeriod.ending_balance = totalBalance + (firstPeriod.net_flow || 0);
                    
                    // Update subsequent periods in cascade
                    for (let i = 1; i < currentTreasuryData.length; i++) {
                        const prevPeriod = currentTreasuryData[i - 1];
                        const currentPeriod = currentTreasuryData[i];
                        
                        currentPeriod.starting_balance = prevPeriod.ending_balance;
                        currentPeriod.ending_balance = currentPeriod.starting_balance + (currentPeriod.net_flow || 0);
                    }
                    
                    console.log(`✅ Balance updated from ${oldBalance} to ${totalBalance}`);
                    console.log(`📊 First period ending: ${firstPeriod.ending_balance}`);
                    console.log(`📊 Account details: ${response.data.accounts.length} accounts contributing to total`);
                }
            } else {
                console.error('❌ Failed to get exact current balance:', response.error);
            }
        }
    } catch (error) {
        console.error('❌ Error updating exact current balance:', error);
    }
}

// Usage examples:
console.log(`
🧪 Available test functions:
- testExactBalanceCalculation()           // Main test with verification
- testAccountBalanceWithSortKey('ACCOUNT_NAME')  // Test specific account
- testBalanceCalculationSteps()           // Debug step-by-step (requires debug handler)
- updateTreasuryCurrentBalanceExact()     // Update treasury with exact calculation

Example:
testExactBalanceCalculation()
`);

window.TreasuryModule = {
    initialize: initializeTreasuryModule,
    switchToTab: switchToTreasuryTab,
    refresh: refreshTreasuryData,
    loadRealData: loadRealTreasuryData,
    updateCurrentBalance: updateTreasuryCurrentBalanceExact
};