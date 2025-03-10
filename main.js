const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('./database.js');
const { dialog } = require('electron');
const XLSX = require('xlsx');
const fs = require('fs');




// Import the simplified bank translator module
const bankTranslator = require('./bank-translator');

// Extract functions and variables from bank-translator.js
const { 
  //transactionPatterns,
  formatearFecha,
  obtenerMes,
  translateBankOperation,
  createFallbackResult,
  // New exports
  savePatterns,
  loadPatterns,
  initializePatterns,
  
} = bankTranslator;

// Your existing main.js code continues here..

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
// Initialize when the app starts
app.whenReady().then(async () => {
  // Your existing code...
  console.log("async loads and initializations .....")
  // Load the simplified model (no TensorFlow)
  
  await initializePatterns();
  
  // Continue with your app initialization...
});
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

ipcMain.handle('editar-opciones', async (event, { id, caja }) => {
  // Implement the logic for "Editar Opciones" here
  // This might involve opening a new window or returning data to edit
  return await db.getRecordOptions(id);
});


ipcMain.handle('export-operaciones-api', async (event, operaciones) => {
  console.log('Exporting operations to API:', operaciones);
  // Here add your API export logic
  return { success: true };
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
    const workbook = XLSX.readFile(filePath, {
      cellDates: true,
      dateNF: 'dd-mm-yyyy',
      raw: false
    });
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
    console.log('records: ', rawRecords[1,2])
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
      //header: ['COL_VOID_1', 'COL_VOID_2', 'FECHA', 'FVALOR', 'CUENTA', 'CODIGO', 'CONCEPTO', 'BENEFIARIO_ORDENANTE', 'OBSERVACIONES', 'IMPORTE', 'SALDO']  
      header: ['COL_VOID_1', 'COL_VOID_2', 'FECHA', 'FVALOR', 'CODIGO', 'CONCEPTO', 'BENEFIARIO_ORDENANTE', 'OBSERVACIONES', 'IMPORTE', 'SALDO']  
  });
    //console.log('rawRecords: ', rawRecords[0])
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
  return  d.toLocaleDateString('en-CA', {
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
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function normalizeCaixaBankDate_old(date) { 
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
      const caja = records[0].caja;
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('records-imported', caja);
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

ipcMain.handle('check-record-exists', async (event, hash) => {
  return await db.checkRecordExists(hash);
});

ipcMain.handle('generate-hash', async (event, record) => {
  return db.generateHash(record);
});

//
ipcMain.handle('toggleContabilizado', async (event, { operationId, operationCaja, newState }) => {
  console.log('NOTE AS CONTABILIZADO')
  await db.setContabilizedStatus(operationId, newState);
  return await db.getLast100RecordsByCaja(operationCaja);
});

// Add these handlers for the contabilizarDialog
ipcMain.handle('open-contabilizar-dialog', async (event, { operationId, operationCaja, newState }) => { 
  console.log('Opening contabilizar dialog for operation:', operationId);
  
  const contabilizarWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  contabilizarWindow.loadFile(path.join(__dirname, 'contabilizarDialog/contabilizarDialog.html'), {
    query: { id: operationId }
  });

  // For debugging
  contabilizarWindow.webContents.openDevTools({ mode: 'detach' });

  return new Promise((resolve) => {
    // Use a unique channel name based on operationId to avoid conflicts
    const responseChannel = `submit-tasks-response-${operationId}`;
    console.log('Created response channel:', responseChannel);
    
    // Set up a one-time listener for this specific window
    const submitListener = (event, data) => {
      console.log('Received data on channel:', responseChannel);
      if (event.sender.id === contabilizarWindow.webContents.id) {
        // Here's where you can process the data
        const taskDataJson = JSON.stringify(data, null, 2);
        
        // Write to a file using Electron's fs
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(app.getPath('userData'), 'taskData.json');
        
        fs.writeFile(filePath, taskDataJson, (err) => {
          if (err) {
            console.error('Error writing JSON file:', err);
          } else {
            console.log('JSON file created successfully at:', filePath);
          }
          
        resolve(data);
        ipcMain.removeListener(responseChannel, submitListener);
        });
      }
    };
    
    ipcMain.on(responseChannel, submitListener);
    
    // Set the response channel in the window so it knows which channel to use
    contabilizarWindow.webContents.executeJavaScript(`
      window.responseChannel = "${responseChannel}";
      console.log('Response channel set:', window.responseChannel);
    `);

    contabilizarWindow.on('closed', () => {
      console.log('Contabilizar dialog closed');
      ipcMain.removeListener(responseChannel, submitListener);
      resolve(null);
    });
  });
});

// Get bank operation data
ipcMain.handle('get-bank-operation', async (event, id) => {
  console.log('Getting bank operation data for ID:', id);
  const result = await db.getRecord(id);
  recordForId = result.data;
  console.log("Retrieved data for record: ", recordForId)
 
  return [recordForId.caja, recordForId.fecha, recordForId.concepto, recordForId.importe, recordForId.saldo]
});

// Expose the translateBankOperation function from bank-translator.js
ipcMain.handle('translate-operation', async (event, data) => {
  console.log('IPC: Translating bank operation:', data);
  return translateBankOperation(data);
});

// Show save dialog and save translation
ipcMain.handle('show-save-dialog-and-save', async (event, translation) => {
  try {
    console.log('Showing save dialog for translation ...');
    const now = new Date().getUTCMilliseconds();
    const filename = `./data/samples/traduction_${now}.json`;
    const { dialog } = require('electron');
    const path = await dialog.showSaveDialog({
      title: 'Guardar resultado ...',
      defaultPath: filename,
      filters: [
        { name: 'JSON', extensions: ['json'] }
      ]
    });
    
    if (!path.canceled) {
      console.log('Saving translation to:', path.filePath);
      fs.writeFileSync(path.filePath, JSON.stringify(translation, null, 2));
      return { success: true };
    } else {
      console.log('Save dialog canceled');
      return { success: false, canceled: true };
    }
  } catch (error) {
    console.error('Error saving translation:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('train-model', async (event, trainingData) => {
  try {
    console.log('Adding new pattern based on example:', trainingData);
    
    // Get the input and output data
    const input = trainingData.input;
    const output = trainingData.output;
    const description = trainingData.description || "trained: " + trainingData.input.concepto; // Get description if provided
    
    // Use the enhanced pattern creation function with description
    const newPattern = createPatternFromExample(input, output, description);
    
    // Add the pattern and save to storage
    // This is a placeholder function that doesn't exist
    // await addPattern(newPattern);
    
    return { success: true };
  } catch (error) {
    console.error('Error adding pattern:', error);
    return { success: false, error: error.message };
  }
});

