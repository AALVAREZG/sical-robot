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
});