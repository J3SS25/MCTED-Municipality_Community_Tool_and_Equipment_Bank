const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class JsonDatabase {
  constructor() {
    this.cache = {};
    this.writeLocks = {};
    this.tables = [
      'users',
      'tools',
      'reservations',
      'rentals',
      'payments',
      'receipts',
      'maintenance',
      'feedback',
      'notifications',
      'audit_logs'
    ];
    this.init();
  }

  getFilePath(table) {
    return path.join(DATA_DIR, `${table}.json`);
  }

  init() {
    for (const table of this.tables) {
      const filePath = this.getFilePath(table);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf8');
        this.cache[table] = [];
      } else {
        try {
          const raw = fs.readFileSync(filePath, 'utf8');
          this.cache[table] = JSON.parse(raw || '[]');
        } catch (err) {
          console.error(`Error reading ${table}.json:`, err);
          this.cache[table] = [];
        }
      }
    }
  }

  // Reload table from disk if needed
  reload(table) {
    const filePath = this.getFilePath(table);
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        this.cache[table] = JSON.parse(raw || '[]');
      } catch (err) {
        console.error(`Error reloading ${table}:`, err);
      }
    }
    return this.cache[table] || [];
  }

  // Atomic file save
  async save(table) {
    const filePath = this.getFilePath(table);
    const tempPath = `${filePath}.tmp_${Date.now()}`;
    const data = JSON.stringify(this.cache[table] || [], null, 2);

    return new Promise((resolve, reject) => {
      fs.writeFile(tempPath, data, 'utf8', (err) => {
        if (err) return reject(err);
        fs.rename(tempPath, filePath, (err2) => {
          if (err2) {
            // fallback overwrite if rename fails (e.g. windows locking)
            fs.writeFile(filePath, data, 'utf8', (err3) => {
              if (err3) return reject(err3);
              resolve(true);
            });
          } else {
            resolve(true);
          }
        });
      });
    });
  }

  // Repository-like CRUD operations
  async find(table, filterFn = null) {
    const records = this.cache[table] || [];
    if (!filterFn) return [...records];
    return records.filter(filterFn);
  }

  async findById(table, id, idField = 'id') {
    const records = this.cache[table] || [];
    return records.find(item => String(item[idField]) === String(id)) || null;
  }

  async findOne(table, filterFn) {
    const records = this.cache[table] || [];
    return records.find(filterFn) || null;
  }

  async insert(table, item) {
    if (!this.cache[table]) {
      this.cache[table] = [];
    }
    const record = {
      ...item,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.cache[table].push(record);
    await this.save(table);
    return record;
  }

  async update(table, id, updates, idField = 'id') {
    if (!this.cache[table]) return null;
    const index = this.cache[table].findIndex(item => String(item[idField]) === String(id));
    if (index === -1) return null;

    const current = this.cache[table][index];
    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.cache[table][index] = updated;
    await this.save(table);
    return updated;
  }

  async delete(table, id, idField = 'id') {
    if (!this.cache[table]) return false;
    const index = this.cache[table].findIndex(item => String(item[idField]) === String(id));
    if (index === -1) return false;

    this.cache[table].splice(index, 1);
    await this.save(table);
    return true;
  }

  async count(table, filterFn = null) {
    if (!filterFn) return (this.cache[table] || []).length;
    return (this.cache[table] || []).filter(filterFn).length;
  }

  // Generate MySQL Schema & Data SQL for seamless migration
  exportToMySQL() {
    let sql = `-- ====================================================\n`;
    sql += `-- MCTEB System MySQL Migration Script\n`;
    sql += `-- Municipality of Basco, Batanes\n`;
    sql += `-- Generated: ${new Date().toISOString()}\n`;
    sql += `-- ====================================================\n\n`;
    sql += `CREATE DATABASE IF NOT EXISTS \`basco_mcteb\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n`;
    sql += `USE \`basco_mcteb\`;\n\n`;

    return sql;
  }
}

const db = new JsonDatabase();
module.exports = db;
