const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('./database.js');
const { dialog } = require('electron');
const XLSX = require('xlsx');
const fs = require('fs');
const CAJARURAL_FILENAME = 'CRURAL';
const CAJARURAL_EXTENSION = '.XLSX';
const CAIXABANK_FILENAME = 'CAIXABANK';
const CAIXABANK_EXTENSION = '.XLS';
const BBVA_FILENAME = 'BBVA';
const BBVA_EXTENSION = '.XLSX';

let mainWindow;
const db = new Database('./prueba05.sqlite');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
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
    width: 1920,
    height: 1080,
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
      width: 1366,
      height: 768,
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

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
          { name: 'Bank Files', extensions: ['xlsx', 'xls', 'csv'] }
      ]
  });
  
  if (!result.canceled) {
      return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('process-file', async (event, filePath) => {
  /*
    Implement the logic to process downloaded bank files.
    This involve process each bank file type (csv, xls, xlsx, etc)
    with the corresponding logic to extract the data and return it.
  */ 
  const fileExtension = path.extname(filePath).toUpperCase();
  const filename = path.parse(path.basename(filePath).toUpperCase()).name;
  let records = [];
  console.log('filename: ', filename, '    fileExtension: ' ,fileExtension)
  if (fileExtension === CAJARURAL_EXTENSION && filename.startsWith(CAJARURAL_FILENAME)) { 
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    let caja = '203_CRURAL- 0727'
    console.log('filename: ', filename)
    if (filename.endsWith('sec')) { //CUENTA SECUNDARIA
      caja = '239_CRURAL_MUR_8923';
    } 
    const rawRecords = XLSX.utils.sheet_to_json(sheet, { 
      range: 3, 
      header: ['FECHA', 'FVALOR', 'CONCEPTO', 'CONCEPTOADIC', 'IMPORTE', 'SALDO'] 
  });
  
    // Process records and check if they exist in database
    records = await checkExistingRecords(processCRuralRecords(rawRecords, caja));

  } else if (fileExtension === CAIXABANK_EXTENSION && filename.startsWith(CAIXABANK_FILENAME)) { 
    const workbook = XLSX.readFile(filePath);
    const firstSheetName  = workbook.SheetNames[0];
    const firstSheet  = workbook.Sheets[firstSheetName];
    
    let caja = '200_CAIXABNK - 2064'
    

    if (filename.endsWith('3616')) { //CUENTA SECUNDARIA
      caja = '204_CAIXABNK_REC_3616';
    }
    const rawRecords = XLSX.utils.sheet_to_json(firstSheet, { 
      range: 3, 
      header: ['FECHA', 'FVALOR', 'CONCEPTO', 'CONCEPTOADIC', 'IMPORTE', 'SALDO']  
  });
   
    // Process records and check if they exist in database
    records = await checkExistingRecords(processCaixaBnkRecords(rawRecords, caja));


  } else if (fileExtension === BBVA_EXTENSION && filename.startsWith(BBVA_FILENAME)) { 
    const workbook = XLSX.readFile(filePath, {
      cellDates: true,
      dateNF: 'dd-mm-yyyy',
      raw: false
    });
    const firstSheetName  = workbook.SheetNames[0];
    const firstSheet  = workbook.Sheets[firstSheetName];
    
    
    let caja = '207_BBVA - 0342'
    

    if (filename.endsWith('9994')) { //CUENTA SECUNDARIA
      caja = '207_BBVA_PCONTIGO_9994';
    } 
    const rawRecords = XLSX.utils.sheet_to_json(firstSheet, { 
      range: 16, 
      header: ['COL_VOID_1', 'COL_VOID_2', 'FECHA', 'FVALOR', 'CUENTA', 'CODIGO', 'CONCEPTO', 'BENEFIARIO_ORDENANTE', 'OBSERVACIONES', 'IMPORTE', 'SALDO']  
  });
    console.log('rawRecords: ', rawRecords[0])
    // Process records and check if they exist in database
    records = await checkExistingRecords(processBBVARecords(rawRecords, caja));
  }
    return records;
});

function processBBVARecords(records, caja) {
  // Here you would typically process the records, add hash identifiers, 
  // save to database, etc.
  
  // For this example, we're just adding an id to each record
  try {
    const processedXlsRecords = records.map((record, index) => (
      beneficiario = record.BENEFIARIO_ORDENANTE ? record.BENEFIARIO_ORDENANTE : 'N/D',
      {
        caja: caja,
        fecha: record.FECHA,
        normalized_date: normalizeBBVADate(record.FECHA),
        concepto: record.CONCEPTO + ' | ' + record.OBSERVACIONES + ' | ' + beneficiario,
        importe: record.IMPORTE,
        saldo: record.SALDO,
        num_apunte: 0,
        idx: index
   })).sort((a, b) => {
      const [aMonth, aDay, aYear] = a.normalized_date.split('-');
      const [bMonth, bDay, bYear] = b.normalized_date.split('-');
      const dateA = new Date(aYear, aMonth - 1, aDay);
      const dateB = new Date(bYear, bMonth - 1, bDay);
      return dateB - dateA;
    });
  
  return processedXlsRecords
  } catch (error) {
    console.error('Error storing records:', error);
    return error
  }

}

function normalizeBBVADate(date) { 
  //date is a string in format dd / mm / yyyy
  const [day, month, year] = date.split('/');
  let _s_date = `${year}-${month}-${day}`;
  const d = new Date(_s_date);
  return  d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit'
  }).replace(/\//g, '-');
}

function processCaixaBnkRecords(records, caja) {
  // Here you would typically process the records, add hash identifiers, 
  // save to database, etc.
  
  // For this example, we're just adding an id to each record
  try {
    const processedXlsRecords = records.map((record, index) => ({
        caja: caja,
        fecha: record.FECHA.toLocaleDateString('es-ES', {
          year: 'numeric',
          month: '2-digit', 
          day: '2-digit',}),
        normalized_date: normalizeCaixaBankDate(record.FECHA),
        concepto: record.CONCEPTO + ' | ' + record.CONCEPTOADIC,
        importe: record.IMPORTE,
        saldo: record.SALDO,
        num_apunte: 0,
        idx: index
   })).sort((a, b) => {
      const [aMonth, aDay, aYear] = a.normalized_date.split('-');
      const [bMonth, bDay, bYear] = b.normalized_date.split('-');
      const dateA = new Date(aYear, aMonth - 1, aDay);
      const dateB = new Date(bYear, bMonth - 1, bDay);
      return dateB - dateA;
    });
  
  return processedXlsRecords
  } catch (error) {
    console.error('Error storing records:', error);
    return error
  }

}

function normalizeCaixaBankDate(date) { 
  //date is a string in format d|dd / m|mm / yyyy
  //const [year, month, day] = date.split('-');
  //let _s_date = `${year}-${month}-${day}`;
  const d = new Date(date);
  return  d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit'
  }).replace(/\//g, '-');
}

function processCRuralRecords(records, caja) {
  // Here you would typically process the records, add hash identifiers, 
  // save to database, etc.
  
  // For this example, we're just adding an id to each record
  try {
    const processedXlsRecords = records.map((record, index) => ({
        caja: caja,
        fecha: record.FECHA,
        normalized_date: normalizeCRuralDate(record.FECHA),
        concepto: record.CONCEPTO,
        importe: record.IMPORTE,
        saldo: record.SALDO,
        num_apunte: record.NUM_APUNTE,
        idx: index
        
    })).sort((a, b) => {
      const [aMonth, aDay, aYear] = a.normalized_date.split('-');
      const [bMonth, bDay, bYear] = b.normalized_date.split('-');
      const dateA = new Date(aYear, aMonth - 1, aDay);
      const dateB = new Date(bYear, bMonth - 1, bDay);
      return dateB - dateA;
    });
  
  return processedXlsRecords
  } catch (error) {
    console.error('Error storing records:', error);
    return error
  }

}

function normalizeCRuralDate(date) { 
  //date is a string in format d|dd / m|mm / yyyy
  const [day, month, year] = date.split('/');
  let _s_date = `${year}-${month}-${day}`;
  const d = new Date(_s_date);
  return  d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit'
  }).replace(/\//g, '-');
}

async function checkExistingRecords(records) {
  // Check if records already exist in database based on hash.
  const processedRecords = [];
  
  for (const record of records) {
      // Generate hash for comparison
      const hash = db.generateHash(record);
      
      // Check if record exists
      const exists = await db.checkRecordExists(hash);
      
      processedRecords.push({
          ...record,
          alreadyInDatabase: exists
      });
  }
  
  return processedRecords;
}


function normalizeDate_OLD(date) { //date is a string in format dd/mm/yyyy
  const [day, month, year] = date.split('/');
  return `${year}-${month}-${day}`;
}

async function contabilizeCruralRecords(records) {
  // Here you would typically process the records, add hash identifiers, 
  // save to database, etc.
  
  // For this example, we're just adding an id to each record
  
  const processedXlsRecords = records.map((record, index) => ({
      caja: caja,
      fecha: record.FECHA,
      concepto: record.CONCEPTO,
      importe: record.IMPORTE,
      saldo: record.SALDO,
      num_apunte: record.NUM_APUNTE,
      idx: index
      
  }));
  try {
    const processedDDBBRecords = await db.storeProcessedRecords2(processedXlsRecords);
    console.log("Records from Caja Rural processed sucessfully")
    return processedDDBBRecords
  } catch (error) {
    console.error('Error storing records:', error);
    return error
  }

  // Don't forget to delete the uploaded file after processing
  // fs.unlinkSync(filePath);
}

ipcMain.handle('show-preview-dialog', (event, records) => {
  createPreviewDialog(records);
});

ipcMain.handle('import-records', async (event, records) => {
  try {
      const results = await db.storeProcessedRecords2(records);
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('records-imported');
    });
      return { success: true, data: results };
  } catch (error) {
      console.error('Error importing records:', error);
      return { success: false, error: error.message };
  }
});

function createPreviewDialog(records) {
  let previewWindow = new BrowserWindow({
      width: 1280,
      height: 920,
      modal: true,
      parent: mainWindow,
      webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, 'preload.js')
      }
  });
  
  previewWindow.loadFile('previewBankMovements.html');
  previewWindow.webContents.on('did-finish-load', () => {
      previewWindow.webContents.send('preview-data', records);
  });
}