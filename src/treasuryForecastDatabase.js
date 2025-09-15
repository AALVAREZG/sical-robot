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
    await this.insertDefaultData();
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

// Add to treasuryForecastDatabase.js
  async getStartingBalanceFromBankMovements() {
    try {
      // You'll need to pass the main database instance or create a connection
      // This is a bridge method to get current balance from main database
      const Database = require('./database.js');
      const mainDB = new Database('./src/data/db/database.sqlite');
      
      const result = await mainDB.get(`
        SELECT saldo as current_balance
        FROM movimientos_bancarios 
        ORDER BY normalized_date DESC, id DESC
        LIMIT 1
      `);
      
      return result ? result.current_balance || 0 : 0;
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

  // Get metro line data (main method for the UI)
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
            f.forecasted_amount as amount,
            f.actual_amount,
            f.confidence_level
          FROM income_forecasts f
          JOIN income_categories c ON f.category_id = c.id
          WHERE f.period_id = ? AND c.is_active = 1
          ORDER BY c.sort_order ASC
        `, [period.id]);

        // Get expense breakdown
        const expenseData = await this.all(`
          SELECT 
            c.category_name as name,
            c.icon,
            c.color,
            c.is_fixed,
            f.forecasted_amount as amount,
            f.actual_amount,
            f.confidence_level
          FROM expense_forecasts f
          JOIN expense_categories c ON f.category_id = c.id
          WHERE f.period_id = ? AND c.is_active = 1
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

        // Calculate health indicator
        const healthIndicator = this.calculateHealthIndicator(netFlow, totalReserves, totalExpenses);
        
        // Calculate days covered
        const daysCovered = totalExpenses > 0 ? Math.floor((totalReserves / totalExpenses) * 30) : 999;

        metroLineData.push({
          id: period.id,
          period_date: period.period_date,
          period_display: period.period_display,
          is_current: period.is_current === 1,
          is_forecast: period.is_forecast === 1,
          starting_balance: period.starting_balance || 0,
          ending_balance: period.ending_balance || 0,
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

// Calculate period totals
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
    
    // Get previous period ending balance (or starting balance)
    const previousBalance = await this.getPreviousPeriodBalance(periodId);
    const endingBalance = previousBalance + netFlow;
    
    // Update period
    await this.run(`
      UPDATE treasury_periods 
      SET starting_balance = ?, 
          ending_balance = ?, 
          net_flow = ?,
          health_indicator = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [previousBalance, endingBalance, netFlow, this.calculateHealthIndicator(endingBalance, netFlow), periodId]);
    
  } catch (error) {
    console.error('Error recalculating period totals:', error);
    throw error;
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

// Calculate health indicator
calculateHealthIndicator(endingBalance, netFlow) {
  if (endingBalance < 0) return 'critical';
  if (endingBalance < 1000) return 'warning';
  if (netFlow < -500) return 'negative';
  if (netFlow > 500) return 'positive';
  return 'neutral';
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

module.exports = TreasuryDatabase;