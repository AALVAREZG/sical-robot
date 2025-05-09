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

/**
 * Store confirmed mappings between bank movements and accounting entries
 * @param {Array} mappings - Array of mapping objects
 * @returns {Promise<Object>} Result with success status
 */
async storeBankAccountingMappings(mappings) {
  const insertSql = `
    INSERT OR REPLACE INTO bank_accounting_mapping 
    (bank_movement_id, accounting_entry_id, match_confidence, is_confirmed, match_date)
    VALUES (?, ?, ?, ?, ?)
  `;
  
  const updateSql = `
    UPDATE accounting_entries 
    SET processed = 1 
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
    await runAsync('BEGIN TRANSACTION');
    
    let mappingCount = 0;
    
    for (const mapping of mappings) {
      // Store the mapping
      await runAsync(insertSql, [
        mapping.bank_movement_id,
        mapping.accounting_entry_id,
        mapping.confidence,
        1, // Confirmed
        new Date().toISOString()
      ]);
      
      // Mark the accounting entry as processed
      await runAsync(updateSql, [mapping.accounting_entry_id]);
      
      mappingCount++;
    }
    
    await runAsync('COMMIT');
    
    return {
      success: true,
      count: mappingCount
    };
  } catch (err) {
    console.error('Error storing mappings:', err);
    await runAsync('ROLLBACK');
    throw err;
  }
}


}

/**
 * Calculate match confidence between accounting entry and bank movement
 * @param {Object} entry - Accounting entry
 * @param {Object} movement - Bank movement
 * @returns {number} Confidence score (0-1)
 */
function calculateMatchConfidence(entry, movement) {
  let confidence = 0;
  
  // Exact amount match is very important
  if (Math.abs(entry.amount - movement.importe) < 0.01) {
    confidence += 0.5;
  } else {
    // If amounts don't match, it's likely not the same transaction
    return 0;
  }
  
  // Date match
  if (entry.entry_date === movement.fecha || entry.value_date === movement.fecha) {
    confidence += 0.3;
  } else {
    // Allow for 1-day difference (processing delays)
    const entryDate = new Date(entry.entry_date);
    const valueDate = new Date(entry.value_date);
    const movementDate = new Date(movement.fecha);
    
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (Math.abs(entryDate - movementDate) <= oneDayMs || 
        Math.abs(valueDate - movementDate) <= oneDayMs) {
      confidence += 0.2;
    }
  }
  
  // Description similarity
  if (entry.description && movement.concepto) {
    const entryDesc = entry.description.toLowerCase();
    const movementDesc = movement.concepto.toLowerCase();
    
    // Check if one contains the other
    if (entryDesc.includes(movementDesc) || movementDesc.includes(entryDesc)) {
      confidence += 0.2;
    } else {
      // Check for common significant words
      const entryWords = new Set(entryDesc.split(/\s+/).filter(w => w.length > 3));
      const movementWords = new Set(movementDesc.split(/\s+/).filter(w => w.length > 3));
      
      let commonWordCount = 0;
      for (const word of entryWords) {
        if (movementWords.has(word)) {
          commonWordCount++;
        }
      }
      
      if (commonWordCount > 0) {
        const wordSimilarity = commonWordCount / Math.max(entryWords.size, movementWords.size);
        confidence += 0.1 * wordSimilarity;
      }
    }
  }
  
  // Reference number match
  if (entry.reference_number && movement.concepto && 
      movement.concepto.includes(entry.reference_number)) {
    confidence += 0.2;
  }
  
  // Cap at 1.0
  return Math.min(confidence, 1.0);
}

/**
 * Map accounting account code to bank account code
 * @param {string} accountCode - Accounting account code
 * @returns {string} Bank account code
 */
function mapAccountCodeToBankAccount(accountCode) {
  // Map account codes to bank accounts
  const mapping = {
    '203': '203_CRURAL'
    // Add more mappings as needed
  };
  
  return mapping[accountCode] || accountCode;
}
module.exports = Database;


