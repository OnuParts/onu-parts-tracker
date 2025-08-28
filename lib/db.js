// Simple file-based database for Vercel deployment
// No external services required - runs entirely on Vercel
const fs = require('fs');
const path = require('path');

const DATA_DIR = '/tmp';
const DB_FILE = path.join(DATA_DIR, 'onu-parts-db.json');

// Initialize database structure
const defaultDb = {
  users: [
    { id: 1, username: 'admin', password: 'password123', name: 'System Administrator', role: 'admin', department: 'IT' }
  ],
  parts: [],
  buildings: [
    { id: 1, name: 'Main Building', description: 'Primary administrative building', active: true },
    { id: 2, name: 'Engineering Building', description: 'Engineering and technical departments', active: true },
    { id: 3, name: 'Science Building', description: 'Science laboratories and classrooms', active: true }
  ],
  costCenters: [
    { id: 1, code: '11000-12760', name: 'Maintenance Operations', description: 'General maintenance and operations', active: true },
    { id: 2, code: '11000-12761', name: 'Engineering Services', description: 'Engineering department operations', active: true },
    { id: 3, code: '11000-12762', name: 'Facilities Management', description: 'Facilities and grounds management', active: true }
  ],
  staffMembers: [],
  partsIssuance: [],
  partsDelivery: [],
  storageLocations: [
    { id: 1, name: 'Stockroom A', description: 'Main parts stockroom', active: true },
    { id: 2, name: 'Warehouse B', description: 'Secondary storage warehouse', active: true },
    { id: 3, name: 'Mobile Unit', description: 'Mobile storage for field work', active: true }
  ],
  shelves: [],
  tools: [],
  toolSignouts: [],
  partsPickup: [],
  partsToCount: [],
  deliveryRequests: [],
  deliveryRequestItems: [],
  sessions: {}
};

class SimpleDB {
  constructor() {
    this.data = this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        return { ...defaultDb, ...data };
      }
    } catch (error) {
      console.log('Creating new database file');
    }
    return { ...defaultDb };
  }

  saveData() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving database:', error);
    }
  }

  // Generic CRUD operations
  getAll(table) {
    return this.data[table] || [];
  }

  getById(table, id) {
    const items = this.data[table] || [];
    return items.find(item => item.id == id);
  }

  insert(table, item) {
    if (!this.data[table]) this.data[table] = [];
    
    // Auto-generate ID if not provided
    if (!item.id) {
      const maxId = this.data[table].length > 0 
        ? Math.max(...this.data[table].map(i => i.id || 0))
        : 0;
      item.id = maxId + 1;
    }

    this.data[table].push(item);
    this.saveData();
    return item;
  }

  update(table, id, updates) {
    const items = this.data[table] || [];
    const index = items.findIndex(item => item.id == id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      this.saveData();
      return items[index];
    }
    return null;
  }

  delete(table, id) {
    if (!this.data[table]) return false;
    const index = this.data[table].findIndex(item => item.id == id);
    if (index !== -1) {
      this.data[table].splice(index, 1);
      this.saveData();
      return true;
    }
    return false;
  }

  query(table, conditions = {}) {
    const items = this.data[table] || [];
    return items.filter(item => {
      return Object.entries(conditions).every(([key, value]) => {
        if (typeof value === 'string' && value.includes('%')) {
          const searchTerm = value.replace(/%/g, '');
          return item[key] && item[key].toString().toLowerCase().includes(searchTerm.toLowerCase());
        }
        return item[key] == value;
      });
    });
  }

  // Session management
  getSession(sessionId) {
    return this.data.sessions[sessionId];
  }

  setSession(sessionId, sessionData) {
    this.data.sessions[sessionId] = sessionData;
    this.saveData();
  }

  deleteSession(sessionId) {
    delete this.data.sessions[sessionId];
    this.saveData();
  }
}

const db = new SimpleDB();
module.exports = db;