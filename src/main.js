const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('./database.js');
const { dialog } = require('electron');
const XLSX = require('xlsx');
//const fs = require('fs');
const fs = require('fs').promises; //added in moment to  create pattern manager
const { spawn } = require('child_process');
const BalanceConsistencyValidator = require('./BalanceConsistencyValidator');
// Import the accounting import service
const { processAccountingFile } = require('./services/accountingImport');

// Path to the executable relative to the Electron app
const pythonServicePath = path.join(__dirname, 'data', 'sender', 'senderToRabbitMQ.exe');
// Pattern file path
const PATTERNS_FILE_PATH = path.join(__dirname, 'data', 'transaction-patterns.json');

// Import the simplified bank translator module
const bankTranslator = require('./bank-translator');
const { json } = require('stream/consumers');
const fileImportService = require('./services/fileImport');

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


let transactionPatterns = [];
let mainWindow;
const db = new Database('./src/data/db/prueba05.sqlite');

// Function to load patterns
async function loadPatternsFromFile() {
  try {
    const data = await fs.readFile(PATTERNS_FILE_PATH, 'utf-8');
    transactionPatterns = JSON.parse(data);
    console.log(`Loaded ${transactionPatterns.length} patterns from file`);
    return transactionPatterns;
  } catch (error) {
    console.error('Error loading patterns:', error);
    return [];
  }
}

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

  mainWindow.loadFile('src/index.html');
}

app.whenReady().then(createWindow);
// Initialize when the app starts
app.whenReady().then(async () => {
  // Your existing code...
  console.log("async loads and initializations .....")
  // Load the simplified model (no TensorFlow)
  // Load patterns on startup
  await loadPatternsFromFile();
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

// In main.js, add this with your other IPC handlers
ipcMain.handle('reload-patterns', async () => {
  return await loadPatternsFromFile();
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
   try {
       return await fileImportService.processFile(filePath, db);
     } catch (error) {
       console.error('Error processing file:', error);
       return [];
     }
  });
  


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
  
  previewWindow.loadFile('./src/previewBankMovements.html');
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
  // contabilizarWindow.webContents.openDevTools({ mode: 'detach' });

  return new Promise(async (resolve) => {
    // Use a unique channel name based on operationId to avoid conflicts
    const responseChannel = `submit-tasks-response-${operationId}`;
    console.log('Created response channel:', responseChannel);
    
    // Set up a one-time listener for this specific window
    const submitListener = async (event, data) => {
      console.log('Received data on channel:', responseChannel);
      if (event.sender.id === contabilizarWindow.webContents.id) {
        // Here's where you can process the data
        const taskDataJson = JSON.stringify(data, null, 2);
        console.log("Task Data to pass to RABBIT", data)
        
        //const csvPath = path.join(__dirname, 'data', 'records', 'terceros.csv');
        //const filePath = path.join(app.getPath('userData'), 'taskData.json');
        const filePath = path.join(__dirname, 'data', 'sender', 'input', 'pending_files', `task-${data.id_task}.json`);
        try {
          fs.writeFile(filePath, taskDataJson)
            console.log('JSON file created successfully at:', filePath);
          } catch (error) {
            console.error('Error writing JSON file:', err);
        }
       
        try {
          const result = await runPythonService();
          console.log("Result of contabilizar: ", result)
        } catch (error) {
          console.error('Error running Python service:', error);
        }
       
        resolve(result);
        ipcMain.removeListener(responseChannel, submitListener);
        };
      }
    
    
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



// Show save dialog and save translation
ipcMain.handle('show-save-dialog-and-save', async (event, translation) => {
  try {
    console.log('Showing save dialog for translation ...', translation);
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

// Now in main.js, use the bank-translator function:
// Add this IPC handler that leverages the existing bank-translator function
ipcMain.handle('search-tercero', async (event, searchTerm) => {
  try {
      console.log('Searching tercero with term:', searchTerm);
      
      // Use the function from bank-translator.js
      const matchingTerceros = await bankTranslator.findMatchingTerceros(searchTerm);
      
      console.log(`Found ${matchingTerceros.length} matching terceros`);
      return matchingTerceros;
  } catch (error) {
      console.error('Error searching tercero:', error);
      throw error;
  }
});

function runPythonService() {
  return new Promise((resolve, reject) => {
    // Make sure pythonServicePath is defined and accessible
    try {
      const pythonProcess = spawn(pythonServicePath);
      let dataString = '';
      let errorString = '';
      
      // Set a timeout to prevent hanging
      const timeout = setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('Python service execution timed out'));
      }, 30000); // 30 seconds timeout
      
      pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorString += data.toString();
        console.error(`Python Service Error: ${data}`);
      });
      
      pythonProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
      
      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(new Error(`Python service exited with code ${code}: ${errorString}`));
        } else {
          resolve(dataString);
        }
      });
    } catch (error) {
      reject(new Error(`Exception while starting Python process: ${error.message}`));
    }
  });
}



// Add IPC handler
ipcMain.handle('run-sender', async (event, args) => {
  try {
    const result = await runPythonService(args);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
});


// Handler to get all available patterns from the bank-translator module
ipcMain.handle('get-available-patterns', async () => {
  console.log('Getting available patterns');
  try {
    // This function should return all available patterns from your patterns storage
    const patterns = []; // Initialize empty array
    
    // Load patterns from bank-translator module
    const bankTranslator = require('./bank-translator');
    const loadedPatterns = await bankTranslator.getAvailablePatterns();
    
    return loadedPatterns.map(pattern => ({
      id: pattern.id,
      name: pattern.description || `Pattern ${pattern.id}`,
      description: pattern.matcherFunction.toString().slice(0, 50) + '...' // Short preview of the matcher function
    }));
  } catch (error) {
    console.error('Error getting patterns:', error);
    return [];
  }
});

// Handler to apply a specific pattern
ipcMain.handle('apply-pattern', async (event, { patternId, bankData }) => {
  console.log(`Applying pattern ${patternId} to bank data:`, bankData);
  try {
    // Get the specified pattern
    const bankTranslator = require('./bank-translator');
    
    // Apply the pattern to generate the result
    const result = await bankTranslator.applySpecificPattern(patternId, bankData);
    
    if (result) {
      return {
        success: true,
        data: result.data,
        description: result.description,
        patternId: patternId
      };
    } else {
      return {
        success: false,
        error: 'Pattern could not be applied'
      };
    }
  } catch (error) {
    console.error('Error applying pattern:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Update translate-operation to include pattern information
ipcMain.handle('translate-operation', async (event, data) => {
  console.log('IPC: Translating bank operation:', data);
  const result = translateBankOperation(data);
  
  // Extract and include pattern information
  return {
    data: result.data,
    description: result.description,
    patternId: result.patternId // Make sure your translateBankOperation function returns this
  };
});

// Get all patterns //FUNCTIONS USED IN PATTERNS MANAGER 
ipcMain.handle('get-patterns', async () => {
  try {
      // Check if file exists
      try {
          await fs.access(PATTERNS_FILE_PATH);
      } catch (error) {
          console.log(`Error: ${error} - ${PATTERNS_FILE_PATH}`);		
          return [];
      }
      
      // Read and parse the file
      const data = await fs.readFile(PATTERNS_FILE_PATH, 'utf-8');
      return JSON.parse(data);
  } catch (error) {
      console.error('Error loading patterns:', error);
      throw error;
  }
});

// Save patterns
ipcMain.handle('save-patterns', async (event, patterns) => {
  try {
      // Ensure the directory exists
      const dir = path.dirname(PATTERNS_FILE_PATH);
      await fs.mkdir(dir, { recursive: true });
      
      // Write to file
      await fs.writeFile(
          PATTERNS_FILE_PATH, 
          JSON.stringify(patterns, null, 2)
      );
      
      console.log('Patterns saved successfully');
      return true;
  } catch (error) {
      console.error('Error saving patterns:', error);
      throw error;
  }
});

// Test a pattern
ipcMain.handle('test-pattern', async (event, { matcherFunction, generatorFunction, testData }) => {
  try {
      // Create new function objects from the stored strings
      const matcherFn = new Function('return ' + matcherFunction)();
      const generatorFn = new Function('return ' + generatorFunction)();
      
      // Execute the matcher function
      const matchResult = matcherFn(testData);
      
      // If matched, execute the generator function
      let generatorResult = null;
      if (matchResult === true) {
          generatorResult = generatorFn(testData);
      }
      
      return {
          matchResult,
          generatorResult
      };
  } catch (error) {
      console.error('Error testing pattern:', error);
      throw error;
  }
});

function stringifyRecords(records) {
  return JSON.stringify(records.map(r => ({
    date: r.normalized_date, 
    concepto: r.concepto.substring(0, 30),
    is_grouped: r.is_grouped
 })))
};



// Add new handler for balance validation
ipcMain.handle('validateBalances', async (event, records) => {
  //console.log('Records received in main process:', stringifyRecords(records));
    
  try {
    console.log('Validating transaction order and balance consistency of', records.length, 'records');
    const result = BalanceConsistencyValidator.validate(records);
    
    // First check date order
    if (!result.isDescendingOrder) {
      console.warn('Transaction records are not in descending date order!');
      return result;
    }
    
    // Then check balance consistency
    if (!result.isValid) {
      console.warn('Balance consistency issues found:', result.issues);
    } else {
      console.log('Balance check passed. Transactions are in descending date order.');
    }
    
    return result;
  } catch (error) {
    console.error('Error validating transactions:', error);
    // Return a safe result if validation fails
    return { 
      isValid: false, 
      isDescendingOrder: false,
      issues: [{ 
        description: `Error during validation: ${error.message}` 
      }],
      message: `Error during validation: ${error.message}`
    };
  }
});

// Add these IPC handlers in main.js
ipcMain.handle('select-accounting-file', async () => {
  const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
          { name: 'Text Files', extensions: ['txt'] },
          { name: 'All Files', extensions: ['*'] }
      ],
      title: 'Select Accounting File'
  });
  
  if (!result.canceled) {
      console.log(`Selecting for import accounts record: `, result.filePaths[0]);
      return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('import-accounting-records', async (event, records) => {
  try {
      console.log(`Importing ${records.length} accounting records...`);
      
      // Implement the actual storage functionality
      const results = await db.storeAccountingRecords(records);
      
      // Notify any open windows about the import
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('accounting-records-imported', {
          count: records.length
        });
      });
      
      return { success: true, count: records.length };
  } catch (error) {
      console.error('Error importing accounting records:', error);
      return { success: false, error: error.message };
  }
});

// Modify the existing createAccountingPreviewDialog function if needed
function createAccountingPreviewDialog(records) {
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
  
  previewWindow.loadFile('./src/previewAccounting.html');
  previewWindow.webContents.on('did-finish-load', () => {
      previewWindow.webContents.send('accounting-preview-data', records);
  });
}