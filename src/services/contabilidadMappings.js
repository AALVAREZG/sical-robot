/**
 * Contabilidad Mappings Service
 * Manages partidas/cuentas PGP mappings with hybrid JSON + Database approach
 */

const fs = require('fs').promises;
const path = require('path');

class ContabilidadMappingsService {
  constructor(database) {
    this.db = database;
    this.cache = {
      ingresos: null,
      gastos: null,
      no_presupuestarias: null,
      funcionales: null,
      proyectos: null
    };
    this.initialized = false;
  }

  /**
   * Initialize the service by seeding database from JSON files if empty
   */
  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🚀 Initializing Contabilidad Mappings Service...');

      // Wait for database table to be created (give it time)
      await this.waitForTable();

      // Check if database is empty
      const count = await this.getMappingCount();

      if (count === 0) {
        console.log('📦 Database empty, seeding from JSON files...');
        await this.seedFromJSON();
      } else {
        console.log(`✅ Database already has ${count} mappings`);
      }

      // Load all mappings into cache
      await this.loadAllToCache();

      this.initialized = true;
      console.log('✅ Contabilidad Mappings Service initialized');
    } catch (error) {
      console.error('❌ Error initializing mappings service:', error);
      throw error;
    }
  }

  /**
   * Wait for database table to exist
   */
  async waitForTable(maxAttempts = 20) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const exists = await new Promise((resolve) => {
          this.db.db.get(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='contabilidad_mappings'",
            (err, row) => {
              resolve(row ? true : false);
            }
          );
        });

        if (exists) {
          console.log('✅ Table contabilidad_mappings exists');
          return;
        }

        // Wait 100ms before next attempt
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        // Ignore errors, keep trying
      }
    }

    console.warn('⚠️ Table creation timeout, proceeding anyway');
  }

  /**
   * Get count of mappings in database
   */
  getMappingCount() {
    return new Promise((resolve, reject) => {
      this.db.db.get(
        'SELECT COUNT(*) as count FROM contabilidad_mappings',
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });
  }

  /**
   * Seed database from JSON files
   */
  async seedFromJSON() {
    const baseDir = path.join(__dirname, '..', 'data', 'contabilidad');

    const files = [
      { file: 'partidas-ingresos.json', type: 'ingreso' },
      { file: 'partidas-gastos.json', type: 'gasto' },
      { file: 'partidas-no-presupuestarias.json', type: 'no_presupuestaria' },
      { file: 'funcionales.json', type: 'funcional' },
      { file: 'proyectos-gfa.json', type: 'proyecto' }
    ];

    for (const { file, type } of files) {
      try {
        const filePath = path.join(baseDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(content);

        console.log(`📄 Loading ${file}...`);
        await this.importJSONData(data, type);
        console.log(`✅ Loaded ${Object.keys(data).length} entries from ${file}`);
      } catch (error) {
        console.error(`❌ Error loading ${file}:`, error.message);
      }
    }
  }

  /**
   * Import JSON data into database
   */
  importJSONData(data, mappingType) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.db.prepare(`
        INSERT OR IGNORE INTO contabilidad_mappings
        (mapping_type, code, cuenta_pgp, description, source, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'json', datetime('now'), datetime('now'))
      `);

      let inserted = 0;

      for (const [code, value] of Object.entries(data)) {
        if (mappingType === 'funcional' || mappingType === 'proyecto') {
          // For funcionales and proyectos, value is just a string description
          stmt.run(mappingType, code, null, value, (err) => {
            if (err) console.error(`Error inserting ${code}:`, err);
            else inserted++;
          });
        } else {
          // For partidas, value is an object with cuenta_pgp and description
          const cuentaPGP = value.cuenta_pgp || null;
          const description = value.description || 'Sin descripción';

          stmt.run(mappingType, code, cuentaPGP, description, (err) => {
            if (err) console.error(`Error inserting ${code}:`, err);
            else inserted++;
          });
        }
      }

      stmt.finalize((err) => {
        if (err) reject(err);
        else {
          console.log(`  → Inserted ${inserted} ${mappingType} mappings`);
          resolve(inserted);
        }
      });
    });
  }

  /**
   * Load all mappings to cache
   */
  async loadAllToCache() {
    const types = ['ingreso', 'gasto', 'no_presupuestaria', 'funcional', 'proyecto'];

    for (const type of types) {
      const mappings = await this.getMappingsByType(type);
      const cacheKey = type === 'ingreso' ? 'ingresos'
                     : type === 'gasto' ? 'gastos'
                     : type === 'no_presupuestaria' ? 'no_presupuestarias'
                     : type === 'funcional' ? 'funcionales'
                     : 'proyectos';

      this.cache[cacheKey] = mappings;
    }

    console.log('📦 Cache loaded:', {
      ingresos: this.cache.ingresos?.length || 0,
      gastos: this.cache.gastos?.length || 0,
      no_presupuestarias: this.cache.no_presupuestarias?.length || 0,
      funcionales: this.cache.funcionales?.length || 0,
      proyectos: this.cache.proyectos?.length || 0
    });
  }

  /**
   * Get all mappings by type
   */
  getMappingsByType(mappingType) {
    return new Promise((resolve, reject) => {
      this.db.db.all(
        'SELECT * FROM contabilidad_mappings WHERE mapping_type = ? ORDER BY code',
        [mappingType],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  /**
   * Get mapping by type and code (with usage tracking)
   */
  getMapping(mappingType, code) {
    return new Promise((resolve, reject) => {
      this.db.db.get(
        'SELECT * FROM contabilidad_mappings WHERE mapping_type = ? AND code = ?',
        [mappingType, code],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            // Update usage statistics
            if (row) {
              this.updateUsageStats(row.id);
            }
            resolve(row);
          }
        }
      );
    });
  }

  /**
   * Update usage statistics
   */
  updateUsageStats(mappingId) {
    this.db.db.run(
      `UPDATE contabilidad_mappings
       SET usage_count = usage_count + 1,
           last_used = datetime('now')
       WHERE id = ?`,
      [mappingId],
      (err) => {
        if (err) console.error('Error updating usage stats:', err);
      }
    );
  }

  /**
   * Add or update a mapping
   */
  upsertMapping(mappingType, code, cuentaPGP, description, source = 'manual') {
    return new Promise((resolve, reject) => {
      this.db.db.run(
        `INSERT INTO contabilidad_mappings
         (mapping_type, code, cuenta_pgp, description, source, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
         ON CONFLICT(mapping_type, code)
         DO UPDATE SET
           cuenta_pgp = excluded.cuenta_pgp,
           description = excluded.description,
           updated_at = datetime('now')`,
        [mappingType, code, cuentaPGP, description, source],
        function(err) {
          if (err) reject(err);
          else {
            console.log(`✅ Upserted mapping: ${mappingType}/${code}`);
            resolve({ id: this.lastID, changes: this.changes });
          }
        }
      );
    });
  }

  /**
   * Export mappings to JSON format (for backup/sharing)
   */
  async exportToJSON(mappingType) {
    const mappings = await this.getMappingsByType(mappingType);
    const result = {};

    for (const mapping of mappings) {
      if (mappingType === 'funcional' || mappingType === 'proyecto') {
        result[mapping.code] = mapping.description;
      } else {
        result[mapping.code] = {
          cuenta_pgp: mapping.cuenta_pgp,
          description: mapping.description
        };
      }
    }

    return result;
  }

  /**
   * Get mapping info with all details (helper for UI)
   */
  async getMappingInfo(mappingType, code) {
    if (!this.initialized) {
      await this.initialize();
    }

    const mapping = await this.getMapping(mappingType, code);

    if (!mapping) {
      return {
        found: false,
        code: code,
        description: 'Desconocido',
        cuenta_pgp: null
      };
    }

    return {
      found: true,
      code: mapping.code,
      description: mapping.description,
      cuenta_pgp: mapping.cuenta_pgp,
      source: mapping.source,
      usage_count: mapping.usage_count
    };
  }

  /**
   * Search mappings by partial code or description
   */
  searchMappings(mappingType, searchTerm) {
    return new Promise((resolve, reject) => {
      this.db.db.all(
        `SELECT * FROM contabilidad_mappings
         WHERE mapping_type = ?
         AND (code LIKE ? OR description LIKE ?)
         ORDER BY usage_count DESC, code
         LIMIT 20`,
        [mappingType, `%${searchTerm}%`, `%${searchTerm}%`],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  /**
   * Get most used mappings (for suggestions)
   */
  getMostUsed(mappingType, limit = 10) {
    return new Promise((resolve, reject) => {
      this.db.db.all(
        `SELECT * FROM contabilidad_mappings
         WHERE mapping_type = ?
         ORDER BY usage_count DESC, last_used DESC
         LIMIT ?`,
        [mappingType, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }
}

module.exports = ContabilidadMappingsService;
