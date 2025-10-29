// ===============================================
// STEP 1: CREATE treasuryDatabase.js
// ===============================================
// Save this as: src/treasuryDatabase.js

const sqlite3 = require('sqlite3');
const path = require('path');

class TreasuryDatabase {
  constructor(dbFilePath = './src/data/db/treasuryForecast.sqlite') {
    this.dbPath = dbFilePath;
    
    // Ensure directory exists
    const dir = path.dirname(dbFilePath);
    const fs = require('fs');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new sqlite3.Database(dbFilePath, (err) => {
      if (err) {
        console.error('Could not connect to treasury database', err);
      } else {
        console.log('✅ Connected to treasury database:', dbFilePath);
        this.initializeTables();
      }
    });
  }

  async initializeTables() {
    console.log('🔧 Initializing treasury tables...');
    
    const tables = [
      // Treasury configuration
      `CREATE TABLE IF NOT EXISTS treasury_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        period_type TEXT DEFAULT 'monthly',
        forecast_months INTEGER DEFAULT 6,
        safety_reserve_days INTEGER DEFAULT 30,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1
      )`,

      // Monthly periods (metro stations)
      `CREATE TABLE IF NOT EXISTS treasury_periods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_id INTEGER REFERENCES treasury_config(id),
        period_date TEXT NOT NULL,
        period_display TEXT NOT NULL,
        is_current INTEGER DEFAULT 0,
        is_forecast INTEGER DEFAULT 1,
        starting_balance REAL DEFAULT 0,
        ending_balance REAL DEFAULT 0,
        net_flow REAL DEFAULT 0,
        health_indicator TEXT DEFAULT 'neutral',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(config_id, period_date)
      )`,

      // Income categories
      `CREATE TABLE IF NOT EXISTS income_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_name TEXT NOT NULL UNIQUE,
        category_code TEXT UNIQUE,
        description TEXT,
        icon TEXT DEFAULT '💰',
        color TEXT DEFAULT '#00875A',
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0
      )`,

      // Expense categories  
      `CREATE TABLE IF NOT EXISTS expense_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_name TEXT NOT NULL UNIQUE,
        category_code TEXT UNIQUE,
        description TEXT,
        icon TEXT DEFAULT '💸',
        color TEXT DEFAULT '#DE350B',
        is_fixed INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0
      )`,

      // Income forecasts
      `CREATE TABLE IF NOT EXISTS income_forecasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period_id INTEGER REFERENCES treasury_periods(id),
        category_id INTEGER REFERENCES income_categories(id),
        forecasted_amount REAL NOT NULL DEFAULT 0,
        actual_amount REAL DEFAULT 0,
        confidence_level INTEGER DEFAULT 80,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(period_id, category_id)
      )`,

      // Expense forecasts
      `CREATE TABLE IF NOT EXISTS expense_forecasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period_id INTEGER REFERENCES treasury_periods(id),
        category_id INTEGER REFERENCES expense_categories(id),
        forecasted_amount REAL NOT NULL DEFAULT 0,
        actual_amount REAL DEFAULT 0,
        confidence_level INTEGER DEFAULT 80,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(period_id, category_id)
      )`,

      // Reserve tracking
      `CREATE TABLE IF NOT EXISTS treasury_reserves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period_id INTEGER REFERENCES treasury_periods(id),
        reserve_type TEXT NOT NULL,
        target_amount REAL NOT NULL DEFAULT 0,
        current_amount REAL DEFAULT 0,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(period_id, reserve_type)
      )`
    ];

    // Create all tables
    for (const tableSQL of tables) {
      await this.run(tableSQL);
    }

    // Create indexes
    await this.run('CREATE INDEX IF NOT EXISTS idx_periods_date ON treasury_periods(period_date)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_periods_current ON treasury_periods(is_current)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_income_period ON income_forecasts(period_id)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_expense_period ON expense_forecasts(period_id)');

    console.log('✅ Treasury tables initialized successfully');
    
    // Insert default data
    // await this.insertDefaultData();
  }

  async insertDefaultData() {
    console.log('📝 Inserting default treasury data...');

    // Default configuration
    await this.run(`
      INSERT OR IGNORE INTO treasury_config (id, name, description, forecast_months, safety_reserve_days)
      VALUES (1, 'Default Treasury', 'Main treasury forecasting configuration', 6, 30)
    `);

    // Default income categories
    const defaultIncomeCategories = [
      { name: 'Primary Salary', code: 'SALARY_PRIMARY', icon: '💼', sort_order: 1 },
      { name: 'Consulting/Projects', code: 'CONSULTING', icon: '🔧', sort_order: 2 },
      { name: 'Investments', code: 'INVESTMENTS', icon: '📈', sort_order: 3 },
      { name: 'Rental Income', code: 'RENTAL', icon: '🏠', sort_order: 4 },
      { name: 'Other Income', code: 'OTHER_INCOME', icon: '💰', sort_order: 5 }
    ];

    for (const cat of defaultIncomeCategories) {
      await this.run(`
        INSERT OR IGNORE INTO income_categories (category_name, category_code, icon, sort_order)
        VALUES (?, ?, ?, ?)
      `, [cat.name, cat.code, cat.icon, cat.sort_order]);
    }

    // Default expense categories
    const defaultExpenseCategories = [
      { name: 'Housing', code: 'HOUSING', icon: '🏠', is_fixed: 1, sort_order: 1 },
      { name: 'Utilities', code: 'UTILITIES', icon: '⚡', is_fixed: 1, sort_order: 2 },
      { name: 'Food & Living', code: 'FOOD', icon: '🍽️', is_fixed: 0, sort_order: 3 },
      { name: 'Transportation', code: 'TRANSPORT', icon: '🚗', is_fixed: 0, sort_order: 4 },
      { name: 'Insurance', code: 'INSURANCE', icon: '🛡️', is_fixed: 1, sort_order: 5 },
      { name: 'Taxes', code: 'TAXES', icon: '💸', is_fixed: 0, sort_order: 6 },
      { name: 'Personal & Entertainment', code: 'PERSONAL', icon: '👤', is_fixed: 0, sort_order: 7 }
    ];

    for (const cat of defaultExpenseCategories) {
      await this.run(`
        INSERT OR IGNORE INTO expense_categories (category_name, category_code, icon, is_fixed, sort_order)
        VALUES (?, ?, ?, ?, ?)
      `, [cat.name, cat.code, cat.icon, cat.is_fixed, cat.sort_order]);
    }

    // Generate initial periods (current + 5 forecast months)
    await this.generateInitialPeriods();

      console.log('✅ Default treasury data inserted');
    }

    // Replace the generateInitialPeriods method in treasuryForecastDatabase.js
  async generateInitialPeriods() {
    const configId = 1;
    const currentDate = new Date();
    
    // First period represents "end of current month" as a forecast
    const currentPeriodDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
    const currentPeriodDisplay = this.formatPeriodDisplay(currentDate) + ' (End)';
    
    await this.run(`
      INSERT OR IGNORE INTO treasury_periods 
      (config_id, period_date, period_display, is_current, is_forecast)
      VALUES (?, ?, ?, 0, 1)
    `, [configId, currentPeriodDate, currentPeriodDisplay]);

    // Generate 5 additional forecast periods
    for (let i = 1; i <= 5; i++) {
      const forecastDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const forecastPeriodDate = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}-01`;
      const forecastPeriodDisplay = this.formatPeriodDisplay(forecastDate);
      
      await this.run(`
        INSERT OR IGNORE INTO treasury_periods 
        (config_id, period_date, period_display, is_current, is_forecast)
        VALUES (?, ?, ?, 0, 1)
      `, [configId, forecastPeriodDate, forecastPeriodDisplay]);
    }

    await this.insertSampleForecasts();
  }

// Fixed: Remove database connection issue
async getStartingBalanceFromBankMovements() {
  try {
    // This method will be called from main.js where both databases are available
    // Return 0 here and handle balance update through IPC
    console.log('⚠️ Starting balance will be updated via IPC from main database');
    return 0;
  } catch (error) {
    console.error('Error getting starting balance:', error);
    return 0;
  }
}

  async insertSampleForecasts() {
    console.log('📊 Inserting sample forecast data...');

    // Get all periods
    const periods = await this.all('SELECT * FROM treasury_periods ORDER BY period_date');
    
    // Get categories
    const incomeCategories = await this.all('SELECT * FROM income_categories ORDER BY sort_order');
    const expenseCategories = await this.all('SELECT * FROM expense_categories ORDER BY sort_order');

    // Sample data for each period
    const sampleIncomeData = {
      'SALARY_PRIMARY': [3500, 3500, 3500, 3500, 3500, 3500],
      'CONSULTING': [1200, 2200, 950, 1800, 1100, 1500],
      'INVESTMENTS': [450, 150, 350, 280, 400, 320],
      'RENTAL': [0, 0, 500, 500, 500, 500],
      'OTHER_INCOME': [0, 100, 0, 200, 150, 80]
    };

    const sampleExpenseData = {
      'HOUSING': [1200, 1200, 1200, 1200, 1200, 1200],
      'UTILITIES': [350, 380, 420, 300, 330, 360],
      'FOOD': [600, 650, 580, 620, 590, 610],
      'TRANSPORT': [290, 250, 320, 280, 300, 270],
      'INSURANCE': [200, 100, 750, 100, 100, 900],
      'TAXES': [0, 635, 0, 750, 0, 1200],
      'PERSONAL': [425, 500, 380, 450, 400, 520]
    };

    // Insert income forecasts
    for (let i = 0; i < periods.length && i < 6; i++) {
      const period = periods[i];
      
      for (const category of incomeCategories) {
        const amount = sampleIncomeData[category.category_code]?.[i] || 0;
        const confidence = period.is_current ? 100 : (85 - i * 5); // Decreasing confidence over time
        
        await this.run(`
          INSERT OR IGNORE INTO income_forecasts 
          (period_id, category_id, forecasted_amount, confidence_level)
          VALUES (?, ?, ?, ?)
        `, [period.id, category.id, amount, confidence]);
      }

      for (const category of expenseCategories) {
        const amount = sampleExpenseData[category.category_code]?.[i] || 0;
        const confidence = category.is_fixed ? 95 : (80 - i * 3);
        
        await this.run(`
          INSERT OR IGNORE INTO expense_forecasts 
          (period_id, category_id, forecasted_amount, confidence_level)
          VALUES (?, ?, ?, ?)
        `, [period.id, category.id, amount, confidence]);
      }

      // Insert sample reserves
      const reserveTypes = [
        { type: 'emergency', target: 15000, current: 8500 + (i * 500) },
        { type: 'tax', target: 5000, current: 2500 + (i * 200) },
        { type: 'investment', target: 3000, current: 1000 + (i * 150) }
      ];

      for (const reserve of reserveTypes) {
        await this.run(`
          INSERT OR IGNORE INTO treasury_reserves 
          (period_id, reserve_type, target_amount, current_amount)
          VALUES (?, ?, ?, ?)
        `, [period.id, reserve.type, reserve.target, reserve.current]);
      }
    }

    console.log('✅ Sample forecast data inserted');
  }

  // Core database methods
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('Treasury DB Run Error:', err.message);
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('Treasury DB Get Error:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Treasury DB All Error:', err.message);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  // Fixed: Metro line data with proper starting balances
async getMetroLineData() {
  try {
    console.log('🚇 Getting metro line data...');
    
    const periods = await this.all(`
      SELECT * FROM treasury_periods 
      WHERE config_id = 1
      ORDER BY period_date ASC
    `);

    const metroLineData = [];

    for (const period of periods) {
      // Get income breakdown
      const incomeData = await this.all(`
        SELECT 
          c.category_name as name,
          c.icon,
          c.color,
          COALESCE(f.forecasted_amount, 0) as amount,
          f.actual_amount,
          COALESCE(f.confidence_level, 85) as confidence_level
        FROM income_categories c
        LEFT JOIN income_forecasts f ON (f.category_id = c.id AND f.period_id = ?)
        WHERE c.is_active = 1
        ORDER BY c.sort_order ASC
      `, [period.id]);

      // Get expense breakdown
      const expenseData = await this.all(`
        SELECT 
          c.category_name as name,
          c.icon,
          c.color,
          c.is_fixed,
          COALESCE(f.forecasted_amount, 0) as amount,
          f.actual_amount,
          COALESCE(f.confidence_level, 85) as confidence_level
        FROM expense_categories c
        LEFT JOIN expense_forecasts f ON (f.category_id = c.id AND f.period_id = ?)
        WHERE c.is_active = 1
        ORDER BY c.sort_order ASC
      `, [period.id]);

      // Get reserve breakdown
      const reserveData = await this.all(`
        SELECT 
          reserve_type as name,
          target_amount,
          current_amount,
          description
        FROM treasury_reserves
        WHERE period_id = ?
      `, [period.id]);

      // Calculate totals
      const totalIncome = incomeData.reduce((sum, item) => sum + (item.amount || 0), 0);
      const totalExpenses = expenseData.reduce((sum, item) => sum + (item.amount || 0), 0);
      const totalReserves = reserveData.reduce((sum, item) => sum + (item.current_amount || 0), 0);
      const netFlow = totalIncome - totalExpenses;

      // Starting balance will be 0 initially, updated via IPC
      const startingBalance = period.starting_balance || 0;
      const endingBalance = startingBalance + netFlow;

      // Calculate health indicator
      const healthIndicator = this.calculateHealthIndicator(netFlow, endingBalance, totalExpenses);
      
      // Calculate days covered
      const daysCovered = totalExpenses > 0 ? Math.floor((endingBalance / totalExpenses) * 30) : 999;
      
      metroLineData.push({
        id: period.id,
        period_date: period.period_date,
        period_display: period.period_display,
        is_current: period.is_current === 1,
        is_forecast: period.is_forecast === 1,
        starting_balance: startingBalance,
        ending_balance: endingBalance,
        net_flow: netFlow,
        breakdown: {
          income: {
            total: totalIncome,
            items: incomeData
          },
          expenses: {
            total: totalExpenses,
            items: expenseData
          },
          reserves: {
            total: totalReserves,
            items: reserveData
          }
        },
        health_indicator: healthIndicator,
        days_covered: daysCovered
      });
    }

    console.log(`✅ Retrieved ${metroLineData.length} periods for metro line`);
    return metroLineData;
    
  } catch (error) {
    console.error('Error getting metro line data:', error);
    throw error;
  }
}

  // Helper methods
  formatPeriodDisplay(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  calculateHealthIndicator(netFlow, reserves, expenses) {
    const reserveRatio = expenses > 0 ? reserves / expenses : 1;
    
    if (netFlow > 0 && reserveRatio >= 1) return 'positive';
    if (netFlow >= 0 && reserveRatio >= 0.5) return 'warning';
    return 'negative';
  }

    

// Add these methods to treasuryForecastDatabase.js

// Get categories for the UI
async getCategories() {
  try {
    const income = await this.all('SELECT * FROM income_categories WHERE is_active = 1 ORDER BY sort_order');
    const expenses = await this.all('SELECT * FROM expense_categories WHERE is_active = 1 ORDER BY sort_order');
    
    return {
      income: income,
      expenses: expenses
    };
  } catch (error) {
    console.error('Error getting categories:', error);
    return { income: [], expenses: [] };
  }
}

// Update forecast amount
async updateForecast(periodId, categoryType, categoryId, amount, notes = null) {
  try {
    const table = categoryType === 'income' ? 'income_forecasts' : 'expense_forecasts';
    
    await this.run(`
      INSERT OR REPLACE INTO ${table}
      (period_id, category_id, forecasted_amount, notes, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [periodId, categoryId, amount, notes]);
    
    // Recalculate period totals
    await this.recalculatePeriodTotals(periodId);
    
    return true;
  } catch (error) {
    console.error('Error updating forecast:', error);
    throw error;
  }
}

// Fixed: Proper period balance calculation
async recalculatePeriodTotals(periodId) {
  try {
    // Get total income
    const incomeResult = await this.get(`
      SELECT COALESCE(SUM(forecasted_amount), 0) as total
      FROM income_forecasts 
      WHERE period_id = ?
    `, [periodId]);
    
    // Get total expenses
    const expenseResult = await this.get(`
      SELECT COALESCE(SUM(forecasted_amount), 0) as total
      FROM expense_forecasts 
      WHERE period_id = ?
    `, [periodId]);
    
    const totalIncome = incomeResult?.total || 0;
    const totalExpenses = expenseResult?.total || 0;
    const netFlow = totalIncome - totalExpenses;
    
    // Get previous period ending balance OR starting balance for first period
    let previousBalance;
    const isFirstPeriod = await this.isFirstPeriod(periodId);
    
    if (isFirstPeriod) {
      // For the first period, starting balance will be updated via IPC
      // For now, use 0 and it will be corrected by the renderer
      previousBalance = 0;
    } else {
      previousBalance = await this.getPreviousPeriodBalance(periodId);
    }
    
    const endingBalance = previousBalance + netFlow;
    
    // Calculate health indicator with correct parameters
    const healthIndicator = this.calculateHealthIndicator(netFlow, endingBalance, totalExpenses);
    
    // Update period with correct values
    await this.run(`
      UPDATE treasury_periods 
      SET starting_balance = ?, 
          ending_balance = ?, 
          net_flow = ?,
          health_indicator = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [previousBalance, endingBalance, netFlow, healthIndicator, periodId]);
    
    console.log(`✅ Period ${periodId} totals recalculated: Income ${totalIncome}, Expenses ${totalExpenses}, Net ${netFlow}`);
    
  } catch (error) {
    console.error('Error recalculating period totals:', error);
    throw error;
  }
}

// New: Check if period is first
async isFirstPeriod(periodId) {
  try {
    const result = await this.get(`
      SELECT COUNT(*) as count 
      FROM treasury_periods 
      WHERE config_id = 1 AND period_date < (
        SELECT period_date FROM treasury_periods WHERE id = ?
      )
    `, [periodId]);
    
    return (result?.count || 0) === 0;
  } catch (error) {
    console.error('Error checking if first period:', error);
    return false;
  }
}

// Get previous period balance
async getPreviousPeriodBalance(periodId) {
  try {
    const currentPeriod = await this.get('SELECT period_date FROM treasury_periods WHERE id = ?', [periodId]);
    if (!currentPeriod) return 0;
    
    const previousPeriod = await this.get(`
      SELECT ending_balance FROM treasury_periods 
      WHERE period_date < ? AND config_id = 1
      ORDER BY period_date DESC 
      LIMIT 1
    `, [currentPeriod.period_date]);
    
    return previousPeriod?.ending_balance || await this.getStartingBalanceFromBankMovements();
  } catch (error) {
    console.error('Error getting previous period balance:', error);
    return 0;
  }
}

// Fixed: Correct health indicator calculation
calculateHealthIndicator(netFlow, currentBalance, totalExpenses) {
  // Calculate reserve ratio based on current balance vs monthly expenses
  const reserveRatio = totalExpenses > 0 ? currentBalance / totalExpenses : 1;
  
  // Positive net flow and good reserves
  if (netFlow > 0 && reserveRatio >= 1) return 'positive';
  
  // Neutral or slightly positive with adequate reserves
  if (netFlow >= 0 && reserveRatio >= 0.5) return 'warning';
  
  // Negative flow or low reserves
  return 'negative';
}

  // Close database connection
  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing treasury database:', err.message);
          reject(err);
        } else {
          console.log('✅ Treasury database connection closed');
          resolve();
        }
      });
    });
  }
}
// ===============================================
// ADD THESE METHODS TO treasuryForecastDatabase.js
// ===============================================

class TreasuryDatabaseExtensions {
    
    // Dynamic category management
    async addDynamicCategory(type, name, icon = null, periodIds = null) {
        try {
            const table = type === 'income' ? 'income_categories' : 'expense_categories';
            const code = this.generateCategoryCode(name);
            const defaultIcon = type === 'income' ? '💵' : '💳';
            
            // Insert new category
            const result = await this.run(`
                INSERT INTO ${table} 
                (category_name, category_code, icon, is_active, sort_order)
                VALUES (?, ?, ?, 1, 
                    (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM ${table})
                )
            `, [name, code, icon || defaultIcon]);
            
            const categoryId = result.lastID;
            
            // If periodIds provided, create forecasts for those periods
            if (periodIds && periodIds.length > 0) {
                const forecastTable = type === 'income' ? 'income_forecasts' : 'expense_forecasts';
                
                for (const periodId of periodIds) {
                    await this.run(`
                        INSERT OR IGNORE INTO ${forecastTable}
                        (period_id, category_id, forecasted_amount, confidence_level)
                        VALUES (?, ?, 0, 75)
                    `, [periodId, categoryId]);
                }
            }
            
            return { success: true, categoryId };
            
        } catch (error) {
            console.error('Error adding dynamic category:', error);
            return { success: false, error: error.message };
        }
    }
    
    async updateCategoryName(type, categoryId, newName) {
        try {
            const table = type === 'income' ? 'income_categories' : 'expense_categories';
            
            await this.run(`
                UPDATE ${table}
                SET category_name = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [newName, categoryId]);
            
            return { success: true };
            
        } catch (error) {
            console.error('Error updating category name:', error);
            return { success: false, error: error.message };
        }
    }
    
    async toggleCategoryFixed(categoryId, isFixed) {
        try {
            await this.run(`
                UPDATE expense_categories
                SET is_fixed = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [isFixed ? 1 : 0, categoryId]);
            
            return { success: true };
            
        } catch (error) {
            console.error('Error toggling category fixed status:', error);
            return { success: false, error: error.message };
        }
    }
    
    async deactivateCategory(type, categoryId) {
        try {
            const table = type === 'income' ? 'income_categories' : 'expense_categories';
            
            await this.run(`
                UPDATE ${table}
                SET is_active = 0, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [categoryId]);
            
            return { success: true };
            
        } catch (error) {
            console.error('Error deactivating category:', error);
            return { success: false, error: error.message };
        }
    }
    
    async getCategoryUsage(type, categoryId) {
        try {
            const table = type === 'income' ? 'income_forecasts' : 'expense_forecasts';
            
            const usage = await this.all(`
                SELECT 
                    p.period_display,
                    f.forecasted_amount,
                    f.actual_amount
                FROM ${table} f
                JOIN treasury_periods p ON f.period_id = p.id
                WHERE f.category_id = ?
                ORDER BY p.period_date DESC
                LIMIT 12
            `, [categoryId]);
            
            return { success: true, data: usage };
            
        } catch (error) {
            console.error('Error getting category usage:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Period-specific category management
    async getPeriodCategories(periodId) {
        try {
            // Get active income categories for period
            const incomeCategories = await this.all(`
                SELECT 
                    c.*,
                    f.forecasted_amount,
                    f.actual_amount,
                    f.confidence_level,
                    f.notes
                FROM income_categories c
                LEFT JOIN income_forecasts f ON (
                    f.category_id = c.id AND f.period_id = ?
                )
                WHERE c.is_active = 1
                ORDER BY c.sort_order
            `, [periodId]);
            
            // Get active expense categories for period
            const expenseCategories = await this.all(`
                SELECT 
                    c.*,
                    f.forecasted_amount,
                    f.actual_amount,
                    f.confidence_level,
                    f.notes
                FROM expense_categories c
                LEFT JOIN expense_forecasts f ON (
                    f.category_id = c.id AND f.period_id = ?
                )
                WHERE c.is_active = 1
                ORDER BY c.sort_order
            `, [periodId]);
            
            return {
                success: true,
                data: {
                    income: incomeCategories,
                    expenses: expenseCategories
                }
            };
            
        } catch (error) {
            console.error('Error getting period categories:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Batch update for multiple categories
    async batchUpdateForecasts(updates) {
        try {
            await this.run('BEGIN TRANSACTION');
            
            for (const update of updates) {
                const table = update.type === 'income' ? 'income_forecasts' : 'expense_forecasts';
                
                await this.run(`
                    INSERT OR REPLACE INTO ${table}
                    (period_id, category_id, forecasted_amount, confidence_level, notes, updated_at)
                    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `, [
                    update.periodId,
                    update.categoryId,
                    update.amount,
                    update.confidence || 80,
                    update.notes || null
                ]);
            }
            
            await this.run('COMMIT');
            
            // Recalculate period totals
            const periodIds = [...new Set(updates.map(u => u.periodId))];
            for (const periodId of periodIds) {
                await this.recalculatePeriodTotals(periodId);
            }
            
            return { success: true };
            
        } catch (error) {
            await this.run('ROLLBACK');
            console.error('Error batch updating forecasts:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Reserve management
    async updateReserve(periodId, reserveType, currentAmount, targetAmount) {
        try {
            await this.run(`
                INSERT OR REPLACE INTO treasury_reserves
                (period_id, reserve_type, current_amount, target_amount, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [periodId, reserveType, currentAmount, targetAmount]);
            
            return { success: true };
            
        } catch (error) {
            console.error('Error updating reserve:', error);
            return { success: false, error: error.message };
        }
    }
    
    async addReserveType(name, description, initialTarget) {
        try {
            // Add reserve type to all existing periods
            const periods = await this.all('SELECT id FROM treasury_periods');
            
            for (const period of periods) {
                await this.run(`
                    INSERT OR IGNORE INTO treasury_reserves
                    (period_id, reserve_type, target_amount, current_amount, description)
                    VALUES (?, ?, ?, 0, ?)
                `, [period.id, name, initialTarget, description]);
            }
            
            return { success: true };
            
        } catch (error) {
            console.error('Error adding reserve type:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Analytics and insights
    async getFinancialInsights(periodId) {
        try {
            const period = await this.get('SELECT * FROM treasury_periods WHERE id = ?', [periodId]);
            if (!period) throw new Error('Period not found');
            
            // Get historical data for trends
            const history = await this.all(`
                SELECT 
                    period_date,
                    ending_balance,
                    net_flow
                FROM treasury_periods
                WHERE period_date <= ?
                ORDER BY period_date DESC
                LIMIT 6
            `, [period.period_date]);
            
            // Calculate burn rate (average daily expense)
            const expenseTotal = await this.get(`
                SELECT COALESCE(SUM(forecasted_amount), 0) as total
                FROM expense_forecasts
                WHERE period_id = ?
            `, [periodId]);
            
            const burnRate = expenseTotal.total / 30;
            
            // Calculate runway (months of expenses covered)
            const runway = expenseTotal.total > 0 
                ? Math.floor(period.ending_balance / expenseTotal.total)
                : 999;
            
            // Calculate reserve coverage
            const reserves = await this.get(`
                SELECT COALESCE(SUM(current_amount), 0) as total
                FROM treasury_reserves
                WHERE period_id = ?
            `, [periodId]);
            
            const targetReserve = expenseTotal.total * 3; // 3 months target
            const reserveCoverage = targetReserve > 0 
                ? Math.round((reserves.total / targetReserve) * 100)
                : 0;
            
            // Trend analysis
            const trend = this.analyzeTrend(history);
            
            return {
                success: true,
                insights: {
                    burnRate,
                    runway,
                    reserveCoverage,
                    trend,
                    healthScore: this.calculateHealthScore(period, burnRate, runway, reserveCoverage)
                }
            };
            
        } catch (error) {
            console.error('Error getting financial insights:', error);
            return { success: false, error: error.message };
        }
    }
    
    analyzeTrend(history) {
        if (history.length < 2) return 'neutral';
        
        const recent = history.slice(0, 3);
        const avgNetFlow = recent.reduce((sum, p) => sum + p.net_flow, 0) / recent.length;
        
        if (avgNetFlow > 1000) return 'strong_growth';
        if (avgNetFlow > 0) return 'growth';
        if (avgNetFlow > -500) return 'stable';
        return 'decline';
    }
    
    calculateHealthScore(period, burnRate, runway, reserveCoverage) {
        let score = 0;
        
        // Balance factor (40%)
        if (period.ending_balance > 50000) score += 40;
        else if (period.ending_balance > 20000) score += 30;
        else if (period.ending_balance > 10000) score += 20;
        else if (period.ending_balance > 5000) score += 10;
        
        // Runway factor (30%)
        if (runway > 12) score += 30;
        else if (runway > 6) score += 25;
        else if (runway > 3) score += 15;
        else if (runway > 1) score += 5;
        
        // Reserve coverage factor (20%)
        score += Math.min(20, reserveCoverage * 0.2);
        
        // Net flow factor (10%)
        if (period.net_flow > 2000) score += 10;
        else if (period.net_flow > 0) score += 7;
        else if (period.net_flow > -1000) score += 3;
        
        return Math.round(score);
    }
    
    // Helper methods
    generateCategoryCode(name) {
        return name
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '_')
            .substring(0, 20);
    }
    
    // Export/Import functionality
    async exportTreasuryData() {
        try {
            const data = {
                config: await this.get('SELECT * FROM treasury_config WHERE id = 1'),
                periods: await this.all('SELECT * FROM treasury_periods ORDER BY period_date'),
                incomeCategories: await this.all('SELECT * FROM income_categories'),
                expenseCategories: await this.all('SELECT * FROM expense_categories'),
                incomeForecasts: await this.all('SELECT * FROM income_forecasts'),
                expenseForecasts: await this.all('SELECT * FROM expense_forecasts'),
                reserves: await this.all('SELECT * FROM treasury_reserves'),
                exportDate: new Date().toISOString()
            };
            
            return { success: true, data };
            
        } catch (error) {
            console.error('Error exporting treasury data:', error);
            return { success: false, error: error.message };
        }
    }
    
    async importTreasuryData(data, overwrite = false) {
        try {
            await this.run('BEGIN TRANSACTION');
            
            if (overwrite) {
                // Clear existing data
                await this.run('DELETE FROM income_forecasts');
                await this.run('DELETE FROM expense_forecasts');
                await this.run('DELETE FROM treasury_reserves');
                await this.run('DELETE FROM treasury_periods');
                await this.run('DELETE FROM income_categories');
                await this.run('DELETE FROM expense_categories');
            }
            
            // Import categories
            for (const cat of data.incomeCategories || []) {
                await this.run(`
                    INSERT OR REPLACE INTO income_categories
                    (id, category_name, category_code, icon, color, is_active, sort_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [cat.id, cat.category_name, cat.category_code, cat.icon, 
                    cat.color, cat.is_active, cat.sort_order]);
            }
            
            for (const cat of data.expenseCategories || []) {
                await this.run(`
                    INSERT OR REPLACE INTO expense_categories
                    (id, category_name, category_code, icon, color, is_fixed, is_active, sort_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [cat.id, cat.category_name, cat.category_code, cat.icon, 
                    cat.color, cat.is_fixed, cat.is_active, cat.sort_order]);
            }
            
            // Import periods
            for (const period of data.periods || []) {
                await this.run(`
                    INSERT OR REPLACE INTO treasury_periods
                    (id, config_id, period_date, period_display, is_current, is_forecast,
                     starting_balance, ending_balance, net_flow, health_indicator)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [period.id, period.config_id, period.period_date, period.period_display,
                    period.is_current, period.is_forecast, period.starting_balance,
                    period.ending_balance, period.net_flow, period.health_indicator]);
            }
            
            // Import forecasts
            for (const forecast of data.incomeForecasts || []) {
                await this.run(`
                    INSERT OR REPLACE INTO income_forecasts
                    (period_id, category_id, forecasted_amount, actual_amount, confidence_level, notes)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [forecast.period_id, forecast.category_id, forecast.forecasted_amount,
                    forecast.actual_amount, forecast.confidence_level, forecast.notes]);
            }
            
            for (const forecast of data.expenseForecasts || []) {
                await this.run(`
                    INSERT OR REPLACE INTO expense_forecasts
                    (period_id, category_id, forecasted_amount, actual_amount, confidence_level, notes)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [forecast.period_id, forecast.category_id, forecast.forecasted_amount,
                    forecast.actual_amount, forecast.confidence_level, forecast.notes]);
            }
            
            // Import reserves
            for (const reserve of data.reserves || []) {
                await this.run(`
                    INSERT OR REPLACE INTO treasury_reserves
                    (period_id, reserve_type, target_amount, current_amount, description)
                    VALUES (?, ?, ?, ?, ?)
                `, [reserve.period_id, reserve.reserve_type, reserve.target_amount,
                    reserve.current_amount, reserve.description]);
            }
            
            await this.run('COMMIT');
            
            return { success: true };
            
        } catch (error) {
            await this.run('ROLLBACK');
            console.error('Error importing treasury data:', error);
            return { success: false, error: error.message };
        }
    }

}

module.exports = TreasuryDatabase;