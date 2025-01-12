const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getCajas: () => ipcRenderer.invoke('get-cajas'),
    getLast100Records: (caja) => ipcRenderer.invoke('get-last-100-records', caja),
    contabilizar_old: (data) => ipcRenderer.invoke('contabilizar', data),
    toggleContabilizado: (data) => ipcRenderer.invoke('toggleContabilizado', data),
    editarOpciones: (data) => ipcRenderer.invoke('editar-opciones', data),
    uploadFile: (filePath) => ipcRenderer.invoke('upload-file', filePath),
    openContableTaskDialog: () => ipcRenderer.invoke('openContableTaskDialog'),
    onTaskSaved: (callback) => ipcRenderer.on('task-saved', (_, result) => callback(result)),
    exportOperacionesToAPI: (operaciones) => ipcRenderer.invoke('export-operaciones-api', operaciones),
    selectFile: () => ipcRenderer.invoke('select-file'),
    processFile: (filePath) => ipcRenderer.invoke('process-file', filePath),
    showPreviewDialog: (records) => ipcRenderer.invoke('show-preview-dialog', records),
    onPreviewData: (callback) => ipcRenderer.on('preview-data', (_, data) => callback(data)),
    importRecords: (records) => ipcRenderer.invoke('import-records', records),
    onRecordsImported: (callback) => ipcRenderer.on('records-imported', callback)
});

contextBridge.exposeInMainWorld('versions', {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron
    // we can also expose variables, not just functions
  })


