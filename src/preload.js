const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getCajas: () => ipcRenderer.invoke('get-cajas'),
    getLast100Records: (caja) => ipcRenderer.invoke('get-last-100-records', caja),
    checkRecordExists: (hash) => ipcRenderer.invoke('check-record-exists', hash),
    contabilizar_old: (data) => ipcRenderer.invoke('contabilizar', data),
    toggleContabilizado: (data) => ipcRenderer.invoke('toggleContabilizado', data),
    openContableTaskDialog: (data) => ipcRenderer.invoke('open-contabilizar-dialog', data ),
    editarOpciones: (data) => ipcRenderer.invoke('editar-opciones', data),
    uploadFile: (filePath) => ipcRenderer.invoke('upload-file', filePath),
    onTaskSaved: (callback) => ipcRenderer.on('task-saved', (_, result) => callback(result)),
    exportOperacionesToAPI: (operaciones) => ipcRenderer.invoke('export-operaciones-api', operaciones),
    selectFile: () => ipcRenderer.invoke('select-file'),
    processFile: (filePath) => ipcRenderer.invoke('process-file', filePath),
    showPreviewDialog: (records) => ipcRenderer.invoke('show-preview-dialog', records),
    onPreviewData: (callback) => ipcRenderer.on('preview-data', (_, data) => callback(data)),
    importRecords: (records) => ipcRenderer.invoke('import-records', records),
    onRecordsImported: (callback) => ipcRenderer.on('records-imported', (_, caja) => callback(caja)),
    generateHash: (record) => ipcRenderer.invoke('generate-hash', record),
    // Add these lines to your existing contextBridge.exposeInMainWorld() in preload.js
    getPatterns: () => ipcRenderer.invoke('get-patterns'),
    savePatterns: (patterns) => ipcRenderer.invoke('save-patterns', patterns),
    testPattern: (data) => ipcRenderer.invoke('test-pattern', data),
    reloadPatterns: () => ipcRenderer.invoke('reload-patterns'),

    validateBalances: (records) => ipcRenderer.invoke('validateBalances', records),
    openAccountingImport: () => ipcRenderer.invoke('open-accounting-import'),
  
    // New functions for accounting records
    selectAccountingFile: () => ipcRenderer.invoke('select-accounting-file'),
    
    // After (updated):
    processAccountingFile: (filePath, options = {}) => 
        ipcRenderer.invoke('process-accounting-file', { 
            filePath, 
            bankAccount: options.bankAccount,
            listFilePath: options.listFilePath 
    }),
    importAccountingRecords: (records) => ipcRenderer.invoke('import-accounting-records', records),
    // Add this to contextBridge.exposeInMainWorld() in preload.js
    onAccountingPreviewData: (callback) => 
        ipcRenderer.on('accounting-preview-data', (_, data) => callback(data)),
    onListBasedAccountingPreviewData: (callback) => 
        ipcRenderer.on('list-based-accounting-preview-data', (_, data) => callback(data)),
    
    saveAccountingTasks: (bankMovementId, tasksData) => ipcRenderer.invoke('save-accounting-tasks', { bankMovementId, tasksData }),
    getAccountingTasks: (bankMovementId) => ipcRenderer.invoke('get-accounting-tasks', bankMovementId),
    hasAccountingTasks: (bankMovementId) => ipcRenderer.invoke('has-accounting-tasks', bankMovementId),
    deleteAccountingTasks: (bankMovementId) => ipcRenderer.invoke('delete-accounting-tasks', bankMovementId),

    // Treasury methods (NEW)
    getMetroTreasuryData: () => ipcRenderer.invoke('get-metro-treasury-data'),
    updateTreasuryForecast: (data) => ipcRenderer.invoke('update-treasury-forecast', data),
    getTreasuryCategories: () => ipcRenderer.invoke('get-treasury-categories'),
    getCurrentBalance: () => ipcRenderer.invoke('get-current-balance'),
});

contextBridge.exposeInMainWorld('versions', {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron
    // we can also expose variables, not just functions
  })


