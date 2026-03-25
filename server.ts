import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // In-memory store for the SQLite path (in a real app, this would be saved to a config file)
  let sqliteDbPath = '';
  const configPath = path.join(process.cwd(), 'app-config.json');
  
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      sqliteDbPath = config.sqliteDbPath || '';
    }
  } catch (e) {
    console.error('Error loading config:', e);
  }

  const saveConfig = (newPath: string) => {
    sqliteDbPath = newPath;
    fs.writeFileSync(configPath, JSON.stringify({ sqliteDbPath: newPath }));
  };

  const syncToSqlite = (dbPath: string, data: any) => {
    if (!dbPath) return;
    
    try {
      // Ensure directory exists
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const db = new Database(dbPath);

      // Create tables
      db.exec(`
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
          unit TEXT,
          description TEXT,
          coneColor TEXT,
          observations TEXT,
          FOREIGN KEY(requestId) REFERENCES requests(id)
        );
        CREATE TABLE IF NOT EXISTS deliveries (
          id TEXT PRIMARY KEY,
          itemId TEXT,
          quantity REAL,
          date TEXT,
          deliveryNote TEXT,
          deliveryDate TEXT,
          observations TEXT,
          FOREIGN KEY(itemId) REFERENCES items(id)
        );
      `);

      // Clear existing data (simple sync approach)
      db.exec('DELETE FROM deliveries; DELETE FROM items; DELETE FROM requests;');

      // Insert requests
      const insertRequest = db.prepare('INSERT INTO requests (id, date, number, uploadDate) VALUES (?, ?, ?, ?)');
      const insertItem = db.prepare('INSERT INTO items (id, requestId, section, quantity, unit, description, coneColor, observations) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      const insertDelivery = db.prepare('INSERT INTO deliveries (id, itemId, quantity, date, deliveryNote, deliveryDate, observations) VALUES (?, ?, ?, ?, ?, ?, ?)');

      db.transaction(() => {
        for (const req of data.requests || []) {
          insertRequest.run(req.id, req.date, req.number, req.uploadDate);
        }
        for (const item of data.items || []) {
          insertItem.run(item.id, item.requestId, item.section, item.quantity, item.unit || 'Kg', item.description, item.coneColor, item.observations);
        }
        for (const del of data.deliveries || []) {
          insertDelivery.run(del.id, del.itemId, del.quantity, del.date, del.deliveryNote, del.deliveryDate, del.observations);
        }
      })();

      db.close();
    } catch (error) {
      console.error('Error syncing to SQLite:', error);
      throw error;
    }
  };

  // API Routes
  app.get('/api/settings', (req, res) => {
    res.json({ sqliteDbPath });
  });

  app.post('/api/settings', (req, res) => {
    const { path: newPath } = req.body;
    saveConfig(newPath);
    res.json({ success: true, sqliteDbPath });
  });

  app.post('/api/sync', (req, res) => {
    if (!sqliteDbPath) {
      return res.status(400).json({ error: 'SQLite path not configured' });
    }
    
    try {
      syncToSqlite(sqliteDbPath, req.body);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/export', (req, res) => {
    try {
      const tempPath = path.join(process.cwd(), 'temp_export.sqlite');
      syncToSqlite(tempPath, req.body);
      
      res.download(tempPath, 'BaseDados.sqlite', (err) => {
        if (err) console.error('Error downloading file:', err);
        // Clean up temp file
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
