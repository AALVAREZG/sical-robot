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
const TreasuryForecastDatabase = require('./treasuryForecastDatabase.js');
const ContabilidadMappingsService = require('./services/contabilidadMappings.js');

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
let db; // Main database instance
//const db = new Database('./src/data/db/prueba05.sqlite');
// Add treasury database initialization
let treasuryDB;
let contabilidadMappings; // Contabilidad mappings service
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

// Improved: Treasury database initialization with proper waiting
app.whenReady().then(async () => {
  createWindow();
  
  // Initialize main database first
  try {
    db = new Database('./src/data/db/prueba05.sqlite');
    console.log('✅ Main database initialized');
  } catch (error) {
    console.error('❌ Error initializing main database:', error);
  }
  
  // Initialize treasury database with better error handling
  try {
    treasuryDB = new TreasuryForecastDatabase('./src/data/db/treasuryForecast.sqlite');
    
    // Wait for proper initialization
    await new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max
      
      const checkInit = () => {
        attempts++;
        if (treasuryDB && treasuryDB.db) {
          console.log('✅ Treasury database initialized successfully');
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('Treasury database initialization timeout'));
        } else {
          setTimeout(checkInit, 100);
        }
      };
      
      checkInit();
    });
    
  } catch (error) {
    console.error('❌ Error initializing treasury database:', error);
    treasuryDB = null; // Set to null to indicate failure
  }

  // Initialize contabilidad mappings service
  try {
    contabilidadMappings = new ContabilidadMappingsService(db);
    await contabilidadMappings.initialize();
    console.log('✅ Contabilidad mappings service initialized');
  } catch (error) {
    console.error('❌ Error initializing contabilidad mappings:', error);
    contabilidadMappings = null;
  }

  // Load patterns and other initializations
  await loadPatternsFromFile();
  await initializePatterns();

  console.log('🚀 Application initialization complete');
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
      enableRemoteModule: true,
      cache: false  // Disable caching for development
    }
  });

  contabilizarWindow.loadFile(path.join(__dirname, 'contabilizarDialog/contabilizarDialog.html'), {
    query: { id: operationId }
  });

  // CRITICAL FIX: Force window focus when content is loaded to enable keyboard input
  contabilizarWindow.webContents.on('did-finish-load', () => {
    contabilizarWindow.focus();
    contabilizarWindow.webContents.focus();
    console.log('Contabilizar window focused');
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
          result = "Error running Python service: "
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
      }, 60000); // 60 seconds timeout for complete
      
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
ipcMain.handle('get-ai-translation', async (event, data) => {
  console.log('IPC: AI Translating bank operation:', data);
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

function createListBasedAccountingPreviewDialog(data) {
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
  
  previewWindow.loadFile('./src/previewListBasedAccounting.html');
  previewWindow.webContents.on('did-finish-load', () => {
      previewWindow.webContents.send('list-based-accounting-preview-data', data);
  });
}

ipcMain.handle('process-accounting-file', async (event, params) => {
  try {
    const { filePath, bankAccount, listFilePath } = params;
    console.log(`Processing accounting file for account ${bankAccount}:`, filePath);
    
    let result;
    
    // Special handling for account 207 with list-based processing
    if (bankAccount === '207' && listFilePath) {
      // Process the file with list-based approach
      result = await processAccountingFile(filePath, { bankAccount, listFilePath });
      
      // Show list-based preview dialog
      createListBasedAccountingPreviewDialog(result);
    } else {
      // Process regular accounting file
      result = await processAccountingFile(filePath, { bankAccount });
      
      // Show standard preview dialog
      createAccountingPreviewDialog(result);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error processing accounting file:', error);
    return { success: false, error: error.message };
  }
});

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

// Save accounting tasks to database
ipcMain.handle('save-accounting-tasks', async (event, { bankMovementId, tasksData }) => {
  try {
    console.log('Saving accounting tasks for bank movement:', bankMovementId);
    const result = await db.saveAccountingTasks(bankMovementId, tasksData);
    
    // Still save to JSON file for Python service if needed
    const taskDataJson = JSON.stringify(tasksData, null, 2);
    const filePath = path.join(__dirname, 'data', 'sender', 'input', 'pending_files', `task-${tasksData.id_task}.json`);
    
    try {
      await fs.writeFile(filePath, taskDataJson);
      console.log('JSON file created successfully at:', filePath);
      
      // Run Python service
      const pythonResult = await runPythonService();
      console.log("Result of contabilizar:", pythonResult);
      
    } catch (fileError) {
      console.error('Error writing JSON file:', fileError);
    }
    
    return result;
  } catch (error) {
    console.error('Error saving accounting tasks:', error);
    return { success: false, error: error.message };
  }
});

// Get accounting tasks for a bank movement
ipcMain.handle('get-accounting-tasks', async (event, bankMovementId) => {
  try {
    const tasks = await db.getAccountingTasksByBankMovement(bankMovementId);
    return { success: true, tasks: tasks };
  } catch (error) {
    console.error('Error getting accounting tasks:', error);
    return { success: false, error: error.message, tasks: [] };
  }
});

// Check if accounting tasks exist
ipcMain.handle('has-accounting-tasks', async (event, bankMovementId) => {
  try {
    const exists = await db.hasAccountingTasks(bankMovementId);
    return { success: true, exists: exists };
  } catch (error) {
    console.error('Error checking accounting tasks:', error);
    return { success: false, exists: false, error: error.message };
  }
});

// Delete accounting tasks
ipcMain.handle('delete-accounting-tasks', async (event, bankMovementId) => {
  try {
    const result = await db.deleteAccountingTasks(bankMovementId);
    return result;
  } catch (error) {
    console.error('Error deleting accounting tasks:', error);
    return { success: false, error: error.message };
  }
});

// Get all cajas for lookup
ipcMain.handle('get-all-cajas', async () => {
  try {
    const result = await db.getExistingCajas();
    return result;
  } catch (error) {
    console.error('Error getting cajas:', error);
    return { success: false, error: error.message };
  }
});

// Get tercero denomination from CSV
ipcMain.handle('get-tercero-denomination', async (event, terceroCode) => {
  try {
    const csvPath = path.join(__dirname, 'data', 'records', 'terceros.csv');
    const fileContent = await fs.readFile(csvPath, 'latin1'); // Use latin1 encoding for special characters
    const lines = fileContent.split('\n');

    // Skip header and find the tercero
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const columns = line.split(',');
      const code = columns[1]?.trim(); // Column 2: PROVEEDOR code
      const denomination = columns[3]?.trim(); // Column 4: DENOMINACIÓN (corrected from column 5)

      if (code === terceroCode) {
        return { success: true, denomination: denomination || 'Unknown' };
      }
    }

    return { success: true, denomination: 'Unknown' };
  } catch (error) {
    console.error('Error reading terceros CSV:', error);
    return { success: false, error: error.message, denomination: 'Unknown' };
  }
});

// ===============================================
// CONTABILIDAD MAPPINGS IPC HANDLERS
// ===============================================

// Get mapping info (partida/económica/funcional/proyecto)
ipcMain.handle('get-mapping-info', async (event, mappingType, code) => {
  try {
    if (!contabilidadMappings) {
      return { success: false, error: 'Mappings service not available' };
    }

    const info = await contabilidadMappings.getMappingInfo(mappingType, code);
    return { success: true, data: info };
  } catch (error) {
    console.error('Error getting mapping info:', error);
    return { success: false, error: error.message };
  }
});

// Search mappings by partial code or description
ipcMain.handle('search-mappings', async (event, mappingType, searchTerm) => {
  try {
    if (!contabilidadMappings) {
      return { success: false, error: 'Mappings service not available' };
    }

    const results = await contabilidadMappings.searchMappings(mappingType, searchTerm);
    return { success: true, data: results };
  } catch (error) {
    console.error('Error searching mappings:', error);
    return { success: false, error: error.message };
  }
});

// Add or update a mapping
ipcMain.handle('upsert-mapping', async (event, mappingType, code, cuentaPGP, description) => {
  try {
    if (!contabilidadMappings) {
      return { success: false, error: 'Mappings service not available' };
    }

    const result = await contabilidadMappings.upsertMapping(mappingType, code, cuentaPGP, description);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error upserting mapping:', error);
    return { success: false, error: error.message };
  }
});

// Get all mappings by type
ipcMain.handle('get-mappings-by-type', async (event, mappingType) => {
  try {
    if (!contabilidadMappings) {
      return { success: false, error: 'Mappings service not available' };
    }

    const mappings = await contabilidadMappings.getMappingsByType(mappingType);
    return { success: true, data: mappings };
  } catch (error) {
    console.error('Error getting mappings:', error);
    return { success: false, error: error.message };
  }
});

// Get most used mappings (for autocomplete suggestions)
ipcMain.handle('get-most-used-mappings', async (event, mappingType, limit = 10) => {
  try {
    if (!contabilidadMappings) {
      return { success: false, error: 'Mappings service not available' };
    }

    const mappings = await contabilidadMappings.getMostUsed(mappingType, limit);
    return { success: true, data: mappings };
  } catch (error) {
    console.error('Error getting most used mappings:', error);
    return { success: false, error: error.message };
  }
});

// Export mappings to JSON (for backup)
ipcMain.handle('export-mappings', async (event, mappingType) => {
  try {
    if (!contabilidadMappings) {
      return { success: false, error: 'Mappings service not available' };
    }

    const json = await contabilidadMappings.exportToJSON(mappingType);
    return { success: true, data: json };
  } catch (error) {
    console.error('Error exporting mappings:', error);
    return { success: false, error: error.message };
  }
});


// ===============================================
// UPDATED IPC HANDLERS FOR BALANCE CALCULATION
// Replace these handlers in main.js
// ===============================================

// Current total balance (sum of all accounts)
ipcMain.handle('get-current-balance', async () => {
  try {
    if (!db) {
      console.error('❌ Main database not available');
      return { success: false, error: 'Database not available' };
    }
    
    const result = await db.getCurrentBalance();
    
    if (result.success) {
      // Return just the balance number for treasury compatibility
      console.log(`💰 Total current balance: ${result.data.balance} (from ${result.data.total_accounts} accounts)`);
      return { success: true, data: result.data.balance };
    } else {
      return result;
    }
  } catch (error) {
    console.error('❌ Error in get-current-balance handler:', error);
    return { success: false, error: error.message };
  }
});

// Detailed current balance with account breakdown
ipcMain.handle('get-current-balance-detailed', async () => {
  try {
    if (!db) {
      return { success: false, error: 'Database not available' };
    }
    
    return await db.getCurrentBalance();
  } catch (error) {
    console.error('❌ Error getting detailed current balance:', error);
    return { success: false, error: error.message };
  }
});

// Current balance for specific account
ipcMain.handle('get-current-balance-for-account', async (event, caja) => {
  try {
    if (!db) {
      return { success: false, error: 'Database not available' };
    }
    
    if (!caja) {
      return { success: false, error: 'Account name required' };
    }
    
    return await db.getCurrentBalanceForAccount(caja);
  } catch (error) {
    console.error('❌ Error getting balance for account:', error);
    return { success: false, error: error.message };
  }
});

// All account balances with summary
ipcMain.handle('get-account-balances', async () => {
  try {
    if (!db) {
      return { success: false, error: 'Database not available' };
    }
    
    return await db.getAccountBalances();
  } catch (error) {
    console.error('❌ Error getting account balances:', error);
    return { success: false, error: error.message };
  }
});

// Balance progression over time
ipcMain.handle('get-balance-progression', async (event, days = 30) => {
  try {
    if (!db) {
      return { success: false, error: 'Database not available' };
    }
    
    return await db.getBalanceProgression(days);
  } catch (error) {
    console.error('❌ Error getting balance progression:', error);
    return { success: false, error: error.message };
  }
});

// Enhanced treasury data handler that uses correct balance calculation
ipcMain.handle('get-metro-treasury-data', async () => {
  try {
    if (!treasuryDB) {
      console.error('❌ Treasury database not initialized');
      return { success: false, error: 'Treasury database not initialized' };
    }
    
    console.log('🔄 Getting metro treasury data...');
    
    // Get treasury data
    const metroData = await treasuryDB.getMetroLineData();
    
    if (!metroData || metroData.length === 0) {
      console.log('⚠️ No treasury data found, may need initialization');
      return { success: false, error: 'No treasury data found. Database may need initialization.' };
    }
    
    // Get current total balance from main database
    const currentBalanceResult = await db.getCurrentBalance();
    
    if (currentBalanceResult.success && metroData.length > 0) {
      // Update the first period with the real current balance
      const currentTotalBalance = currentBalanceResult.data.balance;
      const firstPeriod = metroData[0];
      
      console.log(`🔄 Updating first period starting balance from ${firstPeriod.starting_balance} to ${currentTotalBalance}`);
      
      firstPeriod.starting_balance = currentTotalBalance;
      firstPeriod.ending_balance = currentTotalBalance + firstPeriod.net_flow;
      
      // Cascade the balance update through subsequent periods
      for (let i = 1; i < metroData.length; i++) {
        const prevPeriod = metroData[i - 1];
        const currentPeriod = metroData[i];
        
        currentPeriod.starting_balance = prevPeriod.ending_balance;
        currentPeriod.ending_balance = currentPeriod.starting_balance + currentPeriod.net_flow;
      }
    }
    
    console.log(`✅ Retrieved ${metroData.length} treasury periods with updated balances`);
    return { success: true, data: metroData };
  } catch (error) {
    console.error('❌ Error getting metro treasury data:', error);
    return { success: false, error: error.message };
  }
});
// Treasury forecast update handler
ipcMain.handle('update-treasury-forecast', async (event, { periodId, categoryType, categoryId, amount, notes }) => {
  try {
    if (!treasuryDB) {
      return { success: false, error: 'Treasury database not available' };
    }
    
    // Validate inputs
    if (!periodId || !categoryType || !categoryId || amount === undefined) {
      return { success: false, error: 'Invalid parameters' };
    }
    
    console.log(`🔄 Updating treasury forecast: Period ${periodId}, ${categoryType}, Amount ${amount}`);
    
    await treasuryDB.updateForecast(periodId, categoryType, categoryId, amount, notes);
    
    console.log('✅ Treasury forecast updated successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating treasury forecast:', error);
    return { success: false, error: error.message };
  }
});

// Treasury categories handler
ipcMain.handle('get-treasury-categories', async () => {
  try {
    if (!treasuryDB) {
      return { success: false, error: 'Treasury database not available' };
    }
    
    const categories = await treasuryDB.getCategories();
    return { success: true, data: categories };
  } catch (error) {
    console.error('❌ Error getting treasury categories:', error);
    return { success: false, error: error.message };
  }
});

// Debug handler for balance calculation step-by-step analysis
ipcMain.handle('get-balance-calculation-debug', async () => {
  try {
    if (!db) {
      return { success: false, error: 'Database not available' };
    }
    
    console.log('🔍 Running balance calculation debug analysis...');
    return await db.getBalanceCalculationDebug();
  } catch (error) {
    console.error('❌ Error in balance calculation debug:', error);
    return { success: false, error: error.message };
  }
});

// ===============================================
// INTEGRATION WITH MAIN.JS
// Add these IPC handlers to main.js
// ===============================================

// Dynamic category management
ipcMain.handle('add-treasury-category', async (event, { type, name, icon, periodIds }) => {
    try {
        if (!treasuryDB) {
            return { success: false, error: 'Treasury database not available' };
        }
        
        return await treasuryDB.addDynamicCategory(type, name, icon, periodIds);
    } catch (error) {
        console.error('Error adding treasury category:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('update-category-name', async (event, { type, categoryId, newName }) => {
    try {
        if (!treasuryDB) {
            return { success: false, error: 'Treasury database not available' };
        }
        
        return await treasuryDB.updateCategoryName(type, categoryId, newName);
    } catch (error) {
        console.error('Error updating category name:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('toggle-category-fixed', async (event, { categoryId, isFixed }) => {
    try {
        if (!treasuryDB) {
            return { success: false, error: 'Treasury database not available' };
        }
        
        return await treasuryDB.toggleCategoryFixed(categoryId, isFixed);
    } catch (error) {
        console.error('Error toggling category fixed status:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-period-categories', async (event, periodId) => {
    try {
        if (!treasuryDB) {
            return { success: false, error: 'Treasury database not available' };
        }
        
        return await treasuryDB.getPeriodCategories(periodId);
    } catch (error) {
        console.error('Error getting period categories:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('batch-update-forecasts', async (event, updates) => {
    try {
        if (!treasuryDB) {
            return { success: false, error: 'Treasury database not available' };
        }
        
        return await treasuryDB.batchUpdateForecasts(updates);
    } catch (error) {
        console.error('Error batch updating forecasts:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('update-reserve', async (event, { periodId, reserveType, currentAmount, targetAmount }) => {
    try {
        if (!treasuryDB) {
            return { success: false, error: 'Treasury database not available' };
        }
        
        return await treasuryDB.updateReserve(periodId, reserveType, currentAmount, targetAmount);
    } catch (error) {
        console.error('Error updating reserve:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-financial-insights', async (event, periodId) => {
    try {
        if (!treasuryDB) {
            return { success: false, error: 'Treasury database not available' };
        }
        
        return await treasuryDB.getFinancialInsights(periodId);
    } catch (error) {
        console.error('Error getting financial insights:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('export-treasury-data', async () => {
    try {
        if (!treasuryDB) {
            return { success: false, error: 'Treasury database not available' };
        }
        
        return await treasuryDB.exportTreasuryData();
    } catch (error) {
        console.error('Error exporting treasury data:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('import-treasury-data', async (event, { data, overwrite }) => {
    try {
        if (!treasuryDB) {
            return { success: false, error: 'Treasury database not available' };
        }
        
        return await treasuryDB.importTreasuryData(data, overwrite);
    } catch (error) {
        console.error('Error importing treasury data:', error);
        return { success: false, error: error.message };
    }
});

