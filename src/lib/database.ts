import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { get, set } from 'idb-keyval';

let db: Database | null = null;
let SQL: SqlJsStatic | null = null;
let fileHandle: FileSystemFileHandle | null = null;

const SQL_WASM_URL = '/sql-wasm.wasm';

const getSQL = async () => {
  if (SQL) return SQL;
  SQL = await initSqlJs({
    locateFile: () => SQL_WASM_URL,
  });
  return SQL;
};

export const initDatabase = async () => {
  const sqlInstance = await getSQL();

  // Try to recover file handle from IndexedDB
  const storedHandle = await get('sqlite_file_handle');
  if (storedHandle) {
    try {
      // Check if we still have permission
      const status = await storedHandle.queryPermission({ mode: 'readwrite' });
      if (status === 'granted') {
        fileHandle = storedHandle;
        const file = await fileHandle.getFile();
        const buffer = await file.arrayBuffer();
        db = new sqlInstance.Database(new Uint8Array(buffer));
        db.run('PRAGMA foreign_keys = ON;');
        return true;
      }
    } catch (e) {
      console.error('Failed to restore file handle', e);
    }
  }
  return false;
};

export const selectFile = async () => {
  const [handle] = await window.showOpenFilePicker({
    types: [
      {
        description: 'SQLite Database',
        accept: { 'application/x-sqlite3': ['.db', '.sqlite', '.sqlite3'] },
      },
    ],
  });

  fileHandle = handle;
  await set('sqlite_file_handle', handle);

  const sqlInstance = await getSQL();

  const file = await fileHandle.getFile();
  const buffer = await file.arrayBuffer();
  db = new sqlInstance.Database(new Uint8Array(buffer));
  db.run('PRAGMA foreign_keys = ON;');

  // Ensure tables exist
  createTables();
  await saveDatabase();
  return true;
};

const createTables = () => {
  if (!db) return;

  db.run(`
    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      date TEXT,
      number TEXT,
      uploadDate TEXT
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      requestId TEXT,
      section TEXT,
      quantity REAL,
      description TEXT,
      coneColor TEXT,
      observations TEXT,
      FOREIGN KEY(requestId) REFERENCES requests(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY,
      itemId TEXT,
      quantity REAL,
      date TEXT,
      deliveryNote TEXT,
      deliveryDate TEXT,
      observations TEXT,
      FOREIGN KEY(itemId) REFERENCES items(id) ON DELETE CASCADE
    );
  `);
};

export const saveDatabase = async () => {
  if (!db || !fileHandle) return;

  const data = db.export();
  const writable = await fileHandle.createWritable();
  await writable.write(data);
  await writable.close();
};

export const query = (sql: string, params?: any[]) => {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params || []);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
};

export const execute = async (sql: string, params?: any[]) => {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params || []);
  await saveDatabase();
};

export const isConnected = () => !!db;

export const reloadDatabase = async () => {
  if (!fileHandle) return false;

  const sqlInstance = await getSQL();

  const file = await fileHandle.getFile();
  const buffer = await file.arrayBuffer();

  // Close existing DB to free memory
  if (db) {
    db.close();
  }

  db = new sqlInstance.Database(new Uint8Array(buffer));
  db.run('PRAGMA foreign_keys = ON;');
  return true;
};
