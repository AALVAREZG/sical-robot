// database.mjs
//import sqlite3 from 'sqlite3';
//import crypto from 'crypto';

const sqlite3 = require('sqlite3');
const crypto = require('crypto');

class Database {
  constructor(dbFilePath) {
    this.db = new sqlite3.Database(dbFilePath, (err) => {
      if (err) {
        console.error('Could not connect to database', err);
      } else {
        console.log('Connected to database');
      }
    });
    console.log('CALLING init database.......');
    this.init();
  }
// Update the database init function
init() {
  console.log('CREATE TABLE IF NOT EXISTS movimientos_bancarios');
  this.db.run(`CREATE TABLE IF NOT EXISTS movimientos_bancarios (
    id TEXT PRIMARY KEY,
    caja TEXT,
    fecha TEXT,
    normalized_date TEXT,
    concepto TEXT,
    importe REAL,
    saldo REAL,
    id_apunte_banco TEXT,
    insertion_date TEXT,
    is_contabilized INTEGER,
    id_apunte_contable TEXT,
    sort_key TEXT
  )`);
  
  // Create index for the sort_key if it doesn't exist
  this.db.run(`CREATE INDEX IF NOT EXISTS idx_sort_key ON movimientos_bancarios(sort_key)`);

  // Create accounting entries table
  // is_credit 1 for credit (+), 0 for debit (-)
  console.log('CREATE TABLE IF NOT EXISTS accounting_entries');
  this.db.run(`CREATE TABLE IF NOT EXISTS accounting_entries (
    id TEXT PRIMARY KEY,
    record_type TEXT,
    account_code TEXT,
    transaction_type TEXT,
    entry_date TEXT,
    value_date TEXT,
    description TEXT,
    reference_number TEXT,
    amount REAL,
    entity_code TEXT,
    entity_name TEXT,
    is_credit INTEGER,  
    insertion_date TEXT,
    processed INTEGER DEFAULT 0
  )`);
  
  // Create mapping table for bank-accounting relationship
  // is_credit 1 for credit (+), 0 for debit (-)
  console.log('CREATE TABLE IF NOT EXISTS bank_accounting_mapping');
  this.db.run(`CREATE TABLE IF NOT EXISTS bank_accounting_mapping (
    bank_movement_id TEXT,
    accounting_entry_id TEXT,
    match_confidence REAL,
    is_confirmed INTEGER DEFAULT 0,
    match_date TEXT,
    PRIMARY KEY (bank_movement_id, accounting_entry_id)
  )`);

  // Create accounting tasks table
console.log('CREATE TABLE IF NOT EXISTS accounting_tasks');
this.db.run(`CREATE TABLE IF NOT EXISTS accounting_tasks (
  id TEXT PRIMARY KEY,
  bank_movement_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  task_data TEXT NOT NULL,
  creation_date TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  processed_date TEXT,
  FOREIGN KEY (bank_movement_id) REFERENCES movimientos_bancarios(id)
)`);

  // Create indexes for accounting tasks
  this.db.run(`CREATE INDEX IF NOT EXISTS idx_accounting_tasks_bank_movement ON accounting_tasks(bank_movement_id)`);
  this.db.run(`CREATE INDEX IF NOT EXISTS idx_accounting_tasks_task_id ON accounting_tasks(task_id)`);
  this.db.run(`CREATE INDEX IF NOT EXISTS idx_accounting_tasks_status ON accounting_tasks(status)`);
  
  // Create needed indexes
  this.db.run(`CREATE INDEX IF NOT EXISTS idx_accounting_account ON accounting_entries(account_code)`);
  this.db.run(`CREATE INDEX IF NOT EXISTS idx_accounting_date ON accounting_entries(entry_date)`);
  this.db.run(`CREATE INDEX IF NOT EXISTS idx_accounting_amount ON accounting_entries(amount)`);

}

  generateHash(record) {
    const dataToHash = `${record.caja}${record.fecha}${record.concepto.slice(0,100)}${record.importe}${record.saldo}`;
    return crypto.createHash('sha256').update(dataToHash).digest('hex');
  }

  formatNumber(number) {
    return number.toString().padStart(3, '0'); // format idx as 000
  }


 

// Update the storeProcessedRecords2 function
async storeProcessedRecords2(processedRecords) {
  console.log('Starting storeProcessedRecords2 with first processedRecords:', processedRecords[0,1]);
  const insertSql = `
    INSERT OR IGNORE INTO movimientos_bancarios 
    (id, caja, fecha, normalized_date, concepto, importe, saldo, id_apunte_banco, 
     insertion_date, is_contabilized, id_apunte_contable, sort_key)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const selectSql = `SELECT * FROM movimientos_bancarios WHERE id = ? ORDER BY insertion_date`;

  const currentDate = new Date().toISOString();
  
  let newRecordsCount = 0;
  const results = [];

  const runAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  };

  const getAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  };

  try {
    await runAsync('BEGIN TRANSACTION');

    for (const record of processedRecords) {
      const id = this.generateHash(record);
      const idx = currentDate + this.formatNumber(record.idx);
      let is_contabilized_var = 0;
      let id_apunte_contable_var = null;
      const params = [
        id, record.caja, record.fecha, record.normalized_date, record.concepto,
        record.importe, record.saldo, record.num_apunte, idx, 
        is_contabilized_var,
        id_apunte_contable_var,
        record.sort_key // Add the sort_key to the params
      ];

      const runResult = await runAsync(insertSql, params);
      const row = await getAsync(selectSql, [id]);

      if (runResult.changes > 0) newRecordsCount++;
      results.push({
        ...row,
        alreadyInDatabase: runResult.changes === 0
      });
    }

    await runAsync('COMMIT');
    console.log(`Inserted ${newRecordsCount} new records`);
    return results;
  } catch (err) {
    console.error('Error in transaction:', err);
    await runAsync('ROLLBACK');
    throw err;
  }
}

async getLast100RecordsByCaja(caja, page = 1, pageSize = 100) {
  console.log(`Starting getLast100RecordsByCaja with caja: ${caja}, page: ${page}, pageSize: ${pageSize}`);
  const offset = (page - 1) * pageSize;
  
  // Use CASE expression in ORDER BY to handle NULL sort_key values
  const selectSql = `
    SELECT * FROM movimientos_bancarios 
    WHERE caja = ? 
    ORDER BY sort_key DESC
    LIMIT ? OFFSET ?
  `;

  return new Promise((resolve, reject) => {
    this.db.all(selectSql, [caja, pageSize, offset], (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        reject(err);
      } else {
        const flagAddedRows = rows ? rows.map(row => ({
          ...row,
          alreadyInDatabase: true
        })) : [];
        console.log(`Retrieved: ${rows ? rows.length : 0} records`);
        resolve({
          status: 'success',
          message: `Retrieved ${rows ? rows.length : 0} records for caja ${caja}`,
          total_records: rows ? rows.length : 0,
          page: page,
          pageSize: pageSize,
          data: flagAddedRows || []
        });
      }
    });
  });
}
  async getExistingCajas() {
    console.log('Starting in database getExistingCajas:');
    const selectSql = `SELECT DISTINCT caja FROM movimientos_bancarios ORDER BY caja;`;
  
    return new Promise((resolve, reject) => {
      this.db.all(selectSql, (err, rows) => {
        if (err) {
          console.error('Database error:', err);
          reject(err);
        } else {
            resolve({
            status: 'success',
            message: `Retrieved ${rows ? rows.length : 0} records `,
            total_records: rows ? rows.length : 0,
            data: rows || []
          });
        }
      });
    });
  }

  async setContabilizedStatus(id, isContabilized) {
    const updateSql = `
      UPDATE movimientos_bancarios 
      SET is_contabilized = ?
      WHERE id = ?
    `;
  
    const runAsync = (sql, params = []) => {
      return new Promise((resolve, reject) => {
        this.db.run(sql, params, function (err) {
          if (err) reject(err);
          else resolve(this);
        });
      });
    };
  
    try {
      const result = await runAsync(updateSql, [isContabilized ? 1 : 0, id]);
      if (result.changes > 0) {
        console.log(`Record with id ${id} updated successfully`);
        return { success: true };
      } else {
        console.log(`No record found with id ${id}`);
        return { success: false, message: 'No record found with the provided id' };
      }
    } catch (err) {
      console.error('Error updating record:', err);
      throw err;
    }
  }
  

  
  async checkRecordExists(hash) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT COUNT(*) as count FROM movimientos_bancarios WHERE id = ?';
        this.db.get(sql, [hash], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row.count > 0);
            }
        });
    });
  }
  
  async getRecord(hash) {
    return new Promise((resolve, reject) => {
        //const sql = 'SELECT COUNT(*) as count FROM movimientos_bancarios WHERE id = ?';
        const selectSql = `
          SELECT * FROM movimientos_bancarios 
          WHERE id = ? 
          `;
        this.db.get(selectSql, [hash], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve({
                  status: 'success',
                  message: `Retrieved ${rows ? rows.length : 0} records `,
                  total_records: rows ? rows.length : 0,
                  data: rows || []
                });
            }
        });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
          reject(err);
        } else {
          console.log('Database connection closed');
          resolve();
        }
    }); // ddbb close end
    }); // Promise end
    } // close end
    


// Add these methods to the Database class in database.js

/**
 * Check if an accounting entry exists
 * @param {string} id - Entry ID
 * @returns {Promise<boolean>}
 */
async checkAccountingEntryExists(id) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT COUNT(*) as count FROM accounting_entries WHERE id = ?';
    this.db.get(sql, [id], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row.count > 0);
      }
    });
  });
}

/**
 * Store accounting entries in the database
 * @param {Array} entries - Accounting entries to store
 * @returns {Promise<Object>} Result with success status and counts
 */
async storeAccountingEntries(entries) {
  const insertSql = `
    INSERT OR IGNORE INTO accounting_entries 
    (id, record_type, account_code, transaction_type, entry_date, value_date, 
     description, reference_number, amount, entity_code, entity_name, 
     is_credit, insertion_date, processed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  let newEntriesCount = 0;
  
  const runAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  };
  
  try {
    await runAsync('BEGIN TRANSACTION');
    
    for (const entry of entries) {
      const params = [
        entry.id, entry.record_type, entry.account_code, entry.transaction_type,
        entry.entry_date, entry.value_date, entry.description, entry.reference_number,
        entry.amount, entry.entity_code, entry.entity_name, entry.is_credit,
        entry.insertion_date, entry.processed
      ];
      
      const result = await runAsync(insertSql, params);
      if (result.changes > 0) newEntriesCount++;
    }
    
    await runAsync('COMMIT');
    console.log(`Inserted ${newEntriesCount} new accounting entries`);
    
    return {
      success: true,
      total: entries.length,
      new: newEntriesCount
    };
  } catch (err) {
    console.error('Error storing accounting entries:', err);
    await runAsync('ROLLBACK');
    throw err;
  }
}

/**
 * Get accounting entries for a specific account
 * @param {string} accountCode - Account code
 * @returns {Promise<Array>} Accounting entries
 */
async getAccountingEntriesByAccount(accountCode) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT * FROM accounting_entries 
      WHERE account_code = ? 
      ORDER BY entry_date DESC, value_date DESC
    `;
    
    this.db.all(sql, [accountCode], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

/**
 * Find potential matches between accounting entries and bank movements
 * @param {string} accountCode - Account code to match
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Potential matches
 */
async findPotentialMatches(accountCode, startDate, endDate) {
  // Map account code to bank account (caja)
  const bankAccount = mapAccountCodeToBankAccount(accountCode);
  
  return new Promise((resolve, reject) => {
    // First, get relevant accounting entries
    const entrySql = `
      SELECT * FROM accounting_entries 
      WHERE account_code = ? 
        AND entry_date BETWEEN ? AND ?
        AND processed = 0
    `;
    
    this.db.all(entrySql, [accountCode, startDate, endDate], (err, entries) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Then, get bank movements for the same period
      const movementSql = `
        SELECT * FROM movimientos_bancarios 
        WHERE caja LIKE ? 
          AND normalized_date BETWEEN ? AND ?
      `;
      
      this.db.all(movementSql, [`${bankAccount}%`, startDate, endDate], (err, movements) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Find potential matches
        const matches = [];
        
        for (const entry of entries) {
          for (const movement of movements) {
            // Calculate match confidence based on amount, date, and description
            const confidence = calculateMatchConfidence(entry, movement);
            
            if (confidence > 0.5) { // Threshold for considering a match
              matches.push({
                accounting_entry: entry,
                bank_movement: movement,
                confidence: confidence
              });
            }
          }
        }
        
        resolve(matches);
      });
    });
  });
}

// Add this method to the Database class in database.js
async storeAccountingRecords(records) {
  console.log('Starting storeAccountingRecords with', records.length, 'records');
  const insertSql = `
    INSERT OR IGNORE INTO accounting_entries 
    (id, account_code, transaction_type, entry_date, value_date, 
     description, reference_number, amount, entity_code, entity_name, 
     is_credit, insertion_date, processed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const currentDate = new Date().toISOString();
  let newRecordsCount = 0;

  const runAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  };

  try {
    await runAsync('BEGIN TRANSACTION');

    for (const record of records) {
      // Process the debit/credit indicator
      const isCredit = record.debitCredit === '+' ? 1 : 0;
      
      const params = [
        record.id,
        record.accountCode,
        record.transactionType,
        record.transactionDate,
        record.valueDate,
        record.description,
        record.reference,
        record.amount,
        record.entityId,
        record.entityName,
        isCredit,
        record.insertionDate || currentDate,
        0 // Not processed by default
      ];

      const runResult = await runAsync(insertSql, params);
      if (runResult.changes > 0) newRecordsCount++;
    }

    await runAsync('COMMIT');
    console.log(`Inserted ${newRecordsCount} new accounting records`);
    return { success: true, newRecords: newRecordsCount };
  } catch (err) {
    console.error('Error in transaction:', err);
    await runAsync('ROLLBACK');
    throw err;
  }
}

// Add these methods to your Database class in database.js

/**
 * Save accounting tasks to database
 * @param {string} bankMovementId - Bank movement ID
 * @param {Object} tasksData - Complete tasks data object
 * @returns {Promise<Object>} Result with success status
 */
async saveAccountingTasks(bankMovementId, tasksData) {
  const insertSql = `
    INSERT OR REPLACE INTO accounting_tasks 
    (id, bank_movement_id, task_id, task_type, task_data, creation_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const runAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  };

  try {
    await runAsync('BEGIN TRANSACTION');
    
    let savedCount = 0;
    const currentDate = new Date().toISOString();
    
    // Save each task operation
    for (const [index, operacion] of tasksData.operaciones.entries()) {
      const taskId = `${tasksData.id_task}_${index}`;
      const uniqueId = `${bankMovementId}_${taskId}`;
      
      const params = [
        uniqueId,
        bankMovementId,
        taskId,
        operacion.tipo,
        JSON.stringify(operacion),
        currentDate,
        'pending'
      ];
      
      const result = await runAsync(insertSql, params);
      if (result.changes > 0) savedCount++;
    }
    
    // Also save the complete tasks data as a summary
    const summaryId = `${bankMovementId}_summary`;
    const summaryParams = [
      summaryId,
      bankMovementId,
      tasksData.id_task,
      'summary',
      JSON.stringify(tasksData),
      currentDate,
      'pending'
    ];
    
    await runAsync(insertSql, summaryParams);
    
    // Update bank movement as contabilized
    const updateBankSql = `
      UPDATE movimientos_bancarios 
      SET is_contabilized = 1, id_apunte_contable = ?
      WHERE id = ?
    `;
    
    await runAsync(updateBankSql, [tasksData.id_task, bankMovementId]);
    
    await runAsync('COMMIT');
    
    console.log(`Saved ${savedCount} accounting tasks for bank movement ${bankMovementId}`);
    
    return {
      success: true,
      savedTasks: savedCount, // add +1 for summary
      bankMovementId: bankMovementId,
      taskId: tasksData.id_task
    };
    
  } catch (err) {
    console.error('Error saving accounting tasks:', err);
    await runAsync('ROLLBACK');
    throw err;
  }
}

/**
 * Get accounting tasks for a bank movement
 * @param {string} bankMovementId - Bank movement ID
 * @returns {Promise<Array>} Array of accounting tasks
 */
async getAccountingTasksByBankMovement(bankMovementId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT * FROM accounting_tasks 
      WHERE bank_movement_id = ? 
      ORDER BY creation_date DESC
    `;
    
    this.db.all(sql, [bankMovementId], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const tasks = (rows || []).map(row => ({
          ...row,
          task_data: JSON.parse(row.task_data)
        }));
        resolve(tasks);
      }
    });
  });
}

/**
 * Check if accounting tasks exist for a bank movement
 * @param {string} bankMovementId - Bank movement ID
 * @returns {Promise<boolean>} True if tasks exist
 */
async hasAccountingTasks(bankMovementId) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT COUNT(*) as count FROM accounting_tasks WHERE bank_movement_id = ?';
    this.db.get(sql, [bankMovementId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row.count > 0);
      }
    });
  });
}

/**
 * Delete accounting tasks for a bank movement
 * @param {string} bankMovementId - Bank movement ID
 * @returns {Promise<Object>} Result with success status
 */
async deleteAccountingTasks(bankMovementId) {
  const runAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  };

  try {
    await runAsync('BEGIN TRANSACTION');
    
    const deleteSql = 'DELETE FROM accounting_tasks WHERE bank_movement_id = ?';
    const result = await runAsync(deleteSql, [bankMovementId]);
    
    // Optionally update bank movement as not contabilized
    const updateBankSql = `
      UPDATE movimientos_bancarios 
      SET is_contabilized = 0, id_apunte_contable = NULL
      WHERE id = ?
    `;
    
    await runAsync(updateBankSql, [bankMovementId]);
    
    await runAsync('COMMIT');
    
    return {
      success: true,
      deletedCount: result.changes
    };
    
  } catch (err) {
    console.error('Error deleting accounting tasks:', err);
    await runAsync('ROLLBACK');
    throw err;
  }
 }
 // ===============================================
// CORRECTED getCurrentBalance() WITH EXACT SQL
// Replace this method in database.js
// ===============================================

/**
 * Get the current total balance using the exact SQL provided
 * @returns {Promise<Object>} Result with total balance information
 */
async getCurrentBalance() {
  try {
    console.log('🏦 Calculating current total balance using sort_key ordering...');
    
    // Use the exact SQL provided for correct balance calculation
    const totalBalanceResult = await this.get(`
      SELECT SUM(total_saldo) as grand_total 
      FROM ( 
        SELECT caja, SUM(saldo) as total_saldo 
        FROM ( 
          SELECT caja, saldo, ROW_NUMBER() OVER (PARTITION BY caja ORDER BY sort_key DESC) as rn 
          FROM movimientos_bancarios 
        ) ranked 
        WHERE rn = 1 
        GROUP BY caja 
      ) totals
    `);
    
    if (!totalBalanceResult) {
      console.log('⚠️ No balance result returned from database');
      return { 
        success: true, 
        data: {
          balance: 0,
          accounts: [],
          total_accounts: 0,
          last_update: null
        }
      };
    }
    
    const totalBalance = totalBalanceResult.grand_total || 0;
    
    // Also get the breakdown by account for detailed information
    const accountBreakdown = await this.all(`
      SELECT 
        caja,
        saldo as last_balance,
        fecha as last_date,
        concepto as last_concept,
        sort_key
      FROM ( 
        SELECT 
          caja, 
          saldo, 
          fecha, 
          concepto, 
          sort_key,
          ROW_NUMBER() OVER (PARTITION BY caja ORDER BY sort_key DESC) as rn 
        FROM movimientos_bancarios 
      ) ranked 
      WHERE rn = 1 
      ORDER BY caja
    `);
    
    // Find the most recent sort_key across all accounts for last_update
    const mostRecentMovement = await this.get(`
      SELECT MAX(sort_key) as latest_sort_key, fecha as latest_date
      FROM movimientos_bancarios
      WHERE sort_key = (SELECT MAX(sort_key) FROM movimientos_bancarios)
    `);
    
    console.log(`✅ Current total balance calculated: ${totalBalance} from ${accountBreakdown.length} accounts`);
    console.log('📊 Account breakdown:', accountBreakdown.map(acc => 
      `${acc.caja}: ${acc.last_balance}`
    ).join(', '));
    
    return { 
      success: true, 
      data: {
        balance: totalBalance,
        accounts: accountBreakdown.map(acc => ({
          caja: acc.caja,
          balance: acc.last_balance,
          last_date: acc.last_date,
          last_concept: acc.last_concept,
          sort_key: acc.sort_key
        })),
        total_accounts: accountBreakdown.length,
        last_update: mostRecentMovement?.latest_date || null,
        latest_sort_key: mostRecentMovement?.latest_sort_key || null
      }
    };
  } catch (error) {
    console.error('❌ Error calculating current balance:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Get current balance for a specific account using sort_key ordering
 * @param {string} caja - Account name
 * @returns {Promise<Object>} Result with account balance
 */
async getCurrentBalanceForAccount(caja) {
  try {
    console.log(`🏦 Getting current balance for account: ${caja} using sort_key`);
    
    const balanceResult = await this.get(`
      SELECT 
        caja,
        saldo as current_balance, 
        fecha, 
        concepto,
        sort_key
      FROM ( 
        SELECT 
          caja, 
          saldo, 
          fecha, 
          concepto, 
          sort_key,
          ROW_NUMBER() OVER (PARTITION BY caja ORDER BY sort_key DESC) as rn 
        FROM movimientos_bancarios 
        WHERE caja = ?
      ) ranked 
      WHERE rn = 1
    `, [caja]);
    
    if (!balanceResult) {
      console.log(`⚠️ No movements found for account: ${caja}`);
      return { 
        success: true, 
        data: {
          balance: 0,
          date: null,
          concept: `No movements found for ${caja}`,
          account: caja,
          sort_key: null
        }
      };
    }
    
    const currentBalance = balanceResult.current_balance || 0;
    console.log(`✅ Balance for ${caja}: ${currentBalance} (from ${balanceResult.fecha}, sort_key: ${balanceResult.sort_key})`);
    
    return { 
      success: true, 
      data: {
        balance: currentBalance,
        date: balanceResult.fecha,
        concept: balanceResult.concepto,
        account: balanceResult.caja,
        sort_key: balanceResult.sort_key
      }
    };
  } catch (error) {
    console.error(`❌ Error getting balance for account ${caja}:`, error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Get account summary with latest balance per account using sort_key
 * @returns {Promise<Object>} Result with balance per account
 */
async getAccountBalances() {
  try {
    console.log('🏦 Getting balances for all accounts using sort_key ordering...');
    
    const accountBalances = await this.all(`
      SELECT 
        caja as account,
        saldo as balance,
        fecha as last_movement_date,
        concepto as last_concept,
        sort_key,
        (SELECT COUNT(*) FROM movimientos_bancarios m2 WHERE m2.caja = ranked.caja) as total_movements
      FROM ( 
        SELECT 
          caja, 
          saldo, 
          fecha, 
          concepto, 
          sort_key,
          ROW_NUMBER() OVER (PARTITION BY caja ORDER BY sort_key DESC) as rn 
        FROM movimientos_bancarios 
      ) ranked 
      WHERE rn = 1 
      ORDER BY caja
    `);
    
    // Calculate total balance using the same logic
    const totalBalanceResult = await this.get(`
      SELECT SUM(total_saldo) as grand_total 
      FROM ( 
        SELECT caja, SUM(saldo) as total_saldo 
        FROM ( 
          SELECT caja, saldo, ROW_NUMBER() OVER (PARTITION BY caja ORDER BY sort_key DESC) as rn 
          FROM movimientos_bancarios 
        ) ranked 
        WHERE rn = 1 
        GROUP BY caja 
      ) totals
    `);
    
    const totalBalance = totalBalanceResult?.grand_total || 0;
    
    console.log(`✅ Retrieved balances for ${accountBalances.length} accounts. Total: ${totalBalance}`);
    
    return { 
      success: true, 
      data: {
        accounts: accountBalances || [],
        total_balance: totalBalance,
        total_accounts: accountBalances.length
      }
    };
  } catch (error) {
    console.error('❌ Error getting account balances:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Verify the balance calculation with debug information
 * @returns {Promise<Object>} Debug information about balance calculation
 */
async getBalanceCalculationDebug() {
  try {
    console.log('🔍 Running balance calculation debug...');
    
    // Get the step-by-step breakdown
    const step1 = await this.all(`
      SELECT caja, saldo, sort_key, fecha, concepto,
             ROW_NUMBER() OVER (PARTITION BY caja ORDER BY sort_key DESC) as rn 
      FROM movimientos_bancarios 
      ORDER BY caja, sort_key DESC
    `);
    
    const step2 = await this.all(`
      SELECT caja, saldo
      FROM ( 
        SELECT caja, saldo, ROW_NUMBER() OVER (PARTITION BY caja ORDER BY sort_key DESC) as rn 
        FROM movimientos_bancarios 
      ) ranked 
      WHERE rn = 1 
      ORDER BY caja
    `);
    
    const step3 = await this.all(`
      SELECT caja, SUM(saldo) as total_saldo 
      FROM ( 
        SELECT caja, saldo, ROW_NUMBER() OVER (PARTITION BY caja ORDER BY sort_key DESC) as rn 
        FROM movimientos_bancarios 
      ) ranked 
      WHERE rn = 1 
      GROUP BY caja
    `);
    
    const finalTotal = await this.get(`
      SELECT SUM(total_saldo) as grand_total 
      FROM ( 
        SELECT caja, SUM(saldo) as total_saldo 
        FROM ( 
          SELECT caja, saldo, ROW_NUMBER() OVER (PARTITION BY caja ORDER BY sort_key DESC) as rn 
          FROM movimientos_bancarios 
        ) ranked 
        WHERE rn = 1 
        GROUP BY caja 
      ) totals
    `);
    
    return {
      success: true,
      data: {
        step1_all_movements: step1,
        step2_latest_per_account: step2,
        step3_sum_per_account: step3,
        final_total: finalTotal?.grand_total || 0
      }
    };
  } catch (error) {
    console.error('❌ Error in balance calculation debug:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}
// ===============================================
// DATABASE.JS - ESSENTIAL WRAPPER METHODS
// Add these methods to the Database class in database.js
// ===============================================

/**
 * Wrapper method for db.get() - Returns a single row
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Single row result
 */
get(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.db.get(sql, params, (err, row) => {
      if (err) {
        console.error('Database Get Error:', err.message);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

/**
 * Wrapper method for db.all() - Returns all rows
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Array of rows
 */
all(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Database All Error:', err.message);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

/**
 * Wrapper method for db.run() - Executes a query
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Result with changes info
 */
run(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.db.run(sql, params, function(err) {
      if (err) {
        console.error('Database Run Error:', err.message);
        reject(err);
      } else {
        resolve(this); // this contains lastID, changes, etc.
      }
    });
  });
}
}

module.exports = Database;


