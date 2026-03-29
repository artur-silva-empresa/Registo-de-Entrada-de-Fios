import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fork } from 'child_process';

let mainWindow: BrowserWindow | null;
let serverProcess: any;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Gestão de Fios',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../dist/favicon.ico'), // Adjust if you have an icon
  });

  // Start the Express server as a background process
  const serverPath = path.join(__dirname, 'server.cjs');
  serverProcess = fork(serverPath, [], {
    env: { ...process.env, NODE_ENV: 'production', PORT: '3000' }
  });

  // Wait for the server to start (simple delay for now)
  setTimeout(() => {
    mainWindow?.loadURL('http://localhost:3000');
  }, 2000);

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (serverProcess) serverProcess.kill();
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  if (serverProcess) serverProcess.kill();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
