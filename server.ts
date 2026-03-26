import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Use the directory where the server script is located for the config file
  const configPath = path.join(__dirname, 'app-config.json');

  app.use(express.json({ limit: '50mb' }));
  app.use('/api/import', express.raw({ type: '*/*', limit: '50mb' }));

  let sqliteDbPath = '';
  
  const loadConfig = () => {
    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        sqliteDbPath = config.sqliteDbPath || '';
        console.log(`Configuração carregada. Base de dados em: ${sqliteDbPath || 'Não definida'}`);
      }
    } catch (e) {
      console.error('Erro ao carregar app-config.json:', e);
    }
  };

  loadConfig();

  const saveConfig = (newPath: string) => {
    sqliteDbPath = newPath;
    try {
      fs.writeFileSync(configPath, JSON.stringify({ sqliteDbPath: newPath }, null, 2));
      console.log(`Configuração guardada em: ${configPath}`);
    } catch (e) {
      console.error('Erro ao guardar configuração:', e);
    }
  };

  const readFromSqlite = (dbPath: string) => {
    if (!dbPath || !fs.existsSync(dbPath)) {
      if (dbPath) console.warn(`Aviso: Ficheiro de base de dados não encontrado em: ${dbPath}`);
      return null;
    }

    try {
      const db = new Database(dbPath, { readonly: true, timeout: 5000 });
      
      const hasRequests = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='requests'").get();
      if (!hasRequests) {
        console.warn('Aviso: Base de dados SQLite não contém a tabela "requests".');
        db.close();
        return null;
      }

      const requests = db.prepare('SELECT * FROM requests').all();
      const items = db.prepare('SELECT * FROM items').all();
      const deliveries = db.prepare('SELECT * FROM deliveries').all();
      db.close();
      return { requests, items, deliveries };
    } catch (error) {
      console.error('Erro ao ler do SQLite:', error);
      return null;
    }
  };

  const syncToSqlite = (dbPath: string, data: any) => {
    if (!dbPath) return;
    
    try {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const db = new Database(dbPath, { timeout: 10000 });
      // WAL mode is NOT supported on network filesystems (SMB/CIFS)
      // So we keep the default (DELETE) for maximum compatibility.

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

      db.transaction(() => {
        // Simple strategy: Clear and re-insert for now
        // In a network environment, we might want a more granular sync if data gets large
        db.exec('DELETE FROM deliveries; DELETE FROM items; DELETE FROM requests;');

        const insertRequest = db.prepare('INSERT INTO requests (id, date, number, uploadDate) VALUES (?, ?, ?, ?)');
        const insertItem = db.prepare('INSERT INTO items (id, requestId, section, quantity, unit, description, coneColor, observations) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        const insertDelivery = db.prepare('INSERT INTO deliveries (id, itemId, quantity, date, deliveryNote, deliveryDate, observations) VALUES (?, ?, ?, ?, ?, ?, ?)');

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
      console.error('Erro ao sincronizar para o SQLite:', error);
      throw error;
    }
  };

  // API Routes
  app.get('/api/data', (req, res) => {
    if (!sqliteDbPath) return res.json({ data: null });
    const data = readFromSqlite(sqliteDbPath);
    res.json({ data });
  });

  app.get('/api/settings', (req, res) => {
    res.json({ sqliteDbPath });
  });

  app.post('/api/settings', (req, res) => {
    const { path: newPath } = req.body;
    saveConfig(newPath);
    res.json({ success: true, sqliteDbPath });
  });

  app.post('/api/import', (req, res) => {
    try {
      const tempPath = path.join(process.cwd(), 'temp_import.sqlite');
      fs.writeFileSync(tempPath, req.body);
      const data = readFromSqlite(tempPath);
      fs.unlinkSync(tempPath);
      
      if (!data) {
        return res.status(400).json({ error: 'Ficheiro SQLite inválido ou vazio.' });
      }
      
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
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

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production (bundled), the static files are in the same folder as the server script
    // or in a 'dist' folder if running locally in production mode.
    let distPath = path.join(__dirname, 'dist');
    if (!fs.existsSync(distPath)) {
      distPath = __dirname;
    }

    console.log(`Servindo ficheiros estáticos de: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Erro: Ficheiro index.html não encontrado.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    const url = `http://localhost:${PORT}`;
    console.log(`Servidor iniciado em ${url}`);
    console.log('Pressione Ctrl+C para encerrar.');

    // Auto-open browser in production
    if (isProd) {
      const start = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
      exec(`${start} ${url}`);
    }
  });
}

startServer().catch(err => {
  console.error('Erro ao iniciar o servidor:', err);
});
