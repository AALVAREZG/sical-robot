const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('./database.js');

let mainWindow;
const db = new Database('./prueba03.sqlite');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,  // Add minimum window size
    minHeight: 600,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  // Add window state management
  let windowState = {
    x: undefined,
    y: undefined,
    width: 1200,
    height: 800,
  };

  mainWindow.on('resize', () => {
    const bounds = mainWindow.getBounds();
    windowState = bounds;
  });

  mainWindow.on('move', () => {
    const bounds = mainWindow.getBounds();
    windowState.x = bounds.x;
    windowState.y = bounds.y;
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('get-cajas', async () => {
  console.log("IPC: get-cajas called");
  return await db.getExistingCajas();
});

ipcMain.handle('get-last-100-records', async (event, caja) => {
  return await db.getLast100RecordsByCaja(caja);
});

ipcMain.handle('toggleContabilizado', async (event, { operation_id, operation_caja, new_state }) => {
  console.log('NOTE AS CONTABILIZADO')
  await db.setContabilizedStatus(operation_id, new_state);
  return await db.getLast100RecordsByCaja(operation_caja);
});

/*
ipcMain.handle('contabilizar', async (event, { id, caja }) => {
  // Implement the logic for "Contabilizar" here
  // This might involve updating the database
  await db.contabilizar(id);
  return await db.getLast100RecordsByCaja(caja);
});
*/

ipcMain.handle('editar-opciones', async (event, { id, caja }) => {
  // Implement the logic for "Editar Opciones" here
  // This might involve opening a new window or returning data to edit
  return await db.getRecordOptions(id);
});

function createContableTaskDialog(parentWindow) {
  let dialog = new BrowserWindow({
      parent: parentWindow,
      modal: true,
      width: 600,
      height: 800,
      webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          nodeIntegration: true,
          contextIsolation: false
      }
  });

  dialog.loadFile('contabilizarDialog.html');
  dialog.once('ready-to-show', () => {
      dialog.show();
  });
}

ipcMain.handle('openContableTaskDialog', (event) => {
  createContableTaskDialog(BrowserWindow.fromWebContents(event.sender));
});

ipcMain.handle('export-operaciones-api', async (event, operaciones) => {
  console.log('Exporting operations to API:', operaciones);
  // Here add your API export logic
  return { success: true };
});

ipcMain.on('save-contable-task-old', (event, task) => {
  console.log('Saving task:', task);
  event.reply('task-saved', { success: true });
});

