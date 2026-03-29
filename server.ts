import express from 'express';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

async function startServer() {
  console.log('--- Iniciando Servidor Gestão de Fios ---');
  const isPkg = !!(process as any).pkg;
  console.log(`Ambiente: ${isPkg ? 'Executável (pkg)' : 'Desenvolvimento'}`);
  console.log(`Diretório Atual: ${process.cwd()}`);
  
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use('/api/import', express.raw({ type: '*/*', limit: '50mb' }));

  // In-memory store for the SQLite path
  let sqliteDbPath = '';
  
  // Quando corre no pkg, o process.cwd() é onde o .exe está
  const configPath = path.join(process.cwd(), 'app-config.json');
  console.log(`Caminho do Config: ${configPath}`);
  
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      sqliteDbPath = config.sqliteDbPath || '';
      console.log(`Base de dados configurada: ${sqliteDbPath}`);
    }
  } catch (e) {
    console.error('Erro ao carregar config:', e);
  }

  const saveConfig = (newPath: string) => {
    sqliteDbPath = newPath;
    fs.writeFileSync(configPath, JSON.stringify({ sqliteDbPath: newPath }));
  };

  const readFromSqlite = (dbPath: string) => {
    if (!dbPath || !fs.existsSync(dbPath)) {
      console.log(`Ficheiro não encontrado: ${dbPath}`);
      return null;
    }
    try {
      const db = new Database(dbPath, { readonly: true });
      
      const hasRequests = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='requests'").get();
      if (!hasRequests) {
        db.close();
        return null;
      }

      const requests = db.prepare('SELECT * FROM requests').all();
      const items = db.prepare('SELECT * FROM items').all();
      const deliveries = db.prepare('SELECT * FROM deliveries').all();
      db.close();
      return { requests, items, deliveries };
    } catch (error) {
      console.error('Erro ao ler SQLite:', error);
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

      const db = new Database(dbPath);

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

      db.exec('DELETE FROM deliveries; DELETE FROM items; DELETE FROM requests;');

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
      console.error('Erro ao sincronizar SQLite:', error);
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

  app.get('/api/browse', async (req, res) => {
    if (!isPkg) {
      return res.status(400).json({ error: 'Funcionalidade disponível apenas no executável.' });
    }
    
    try {
      const { exec } = require('child_process');
      // PowerShell command to open a file dialog and return the path
      const cmd = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.OpenFileDialog; $f.Filter = 'SQLite Files (*.sqlite)|*.sqlite|All Files (*.*)|*.*'; $f.Title = 'Selecionar Base de Dados SQLite'; $f.ShowDialog() | Out-Null; $f.FileName"`;
      
      exec(cmd, (error: any, stdout: string) => {
        if (error) {
          return res.status(500).json({ error: 'Erro ao abrir seletor' });
        }
        const filePath = stdout.trim();
        res.json({ path: filePath });
      });
    } catch (error) {
      res.status(500).json({ error: 'Falha ao abrir seletor de ficheiros' });
    }
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
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production' && !process.env.PKG_BUILD && !isPkg) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.log('Vite não disponível, ignorando middleware de dev.');
    }
  } else {
    // No pkg, os ficheiros estão dentro de um sistema virtual /snapshot/
    // Tentamos localizar a pasta dist de forma absoluta dentro do pacote
    const distPath = isPkg 
      ? path.resolve(__dirname, '..', 'dist')
      : path.join(process.cwd(), 'dist');
    
    console.log(`Tentando servir interface de: ${distPath}`);
    
    // Debug: Listar ficheiros se estivermos no executável
    if (isPkg) {
      try {
        const files = fs.readdirSync(distPath);
        console.log('Ficheiros encontrados na pasta dist:', files.join(', '));
      } catch (e) {
        console.error('AVISO: Não foi possível listar a pasta dist. Pode estar vazia ou inacessível.');
      }
    }
    
    // Servir ficheiros estáticos com fallback explícito para index.html
    app.use(express.static(distPath));
    
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`Erro ao servir index.html de ${indexPath}:`, err);
          res.status(404).send('Interface não encontrada. Certifique-se de que correu "npm run build" antes de gerar o EXE.');
        }
      });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor pronto em http://localhost:${PORT}`);
    
    // Abrir o browser apenas se estivermos no executável e NÃO no Electron
    const isElectron = !!process.versions.electron;
    if (isPkg && !isElectron) {
      const { exec } = require('child_process');
      exec(`start http://localhost:${PORT}`);
    }
  });
}

startServer().catch(err => {
  console.error('ERRO FATAL NO ARRANQUE:');
  console.error(err);
  // Manter a janela aberta se houver erro fatal
  setTimeout(() => {}, 1000000);
});
