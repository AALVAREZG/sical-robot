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
init() {
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
      id_apunte_contable TEXT
    )`);
  }

  generateHash(record) {
    const dataToHash = `${record.caja}${record.fecha}${record.concepto.slice(0,100)}${record.importe}${record.saldo}`;
    return crypto.createHash('sha256').update(dataToHash).digest('hex');
  }

  formatNumber(number) {
    return number.toString().padStart(3, '0'); // format idx as 000
  }


  async storeProcessedRecords2(processedRecords) {
    /* Processed records may be passed in argument in a list of records with next fields:
      record.caja, record.fecha, record.normalized_date, record.concepto,
      record.importe, record.saldo, record.num_apunte
    */
    console.log('Starting storeProcessedRecords2 with first processedRecords:', processedRecords[0,1]);
    const insertSql = `
      INSERT OR IGNORE INTO movimientos_bancarios 
      (id, caja, fecha, normalized_date, concepto, importe, saldo, id_apunte_banco, insertion_date, is_contabilized, id_apunte_contable)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        const idx = currentDate + this.formatNumber(record.idx)
        let is_contabilized_var = 0
        let id_apunte_contable_var = null
        const params = [
          id, record.caja, record.fecha, record.normalized_date, record.concepto,
          record.importe, record.saldo, record.num_apunte, idx, //idx = hash of current date and index of this row in processed file
          is_contabilized_var, //1 for true, 0 for false
          id_apunte_contable_var // initialized with null value
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
    const selectSql = `
      SELECT * FROM movimientos_bancarios 
      WHERE caja = ? 
      ORDER BY normalized_date DESC 
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
    
}
module.exports = Database;


