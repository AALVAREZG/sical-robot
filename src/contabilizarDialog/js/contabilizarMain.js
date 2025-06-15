/**
 * Main application script for contabilizarDialog
 */


// Get the electron modules
const { ipcRenderer } = require('electron');


// Require the modules instead of including them via script tags
const DebugConsole = require('./js/utils/debugConsole');
const TaskRenderers = require('./js/taskRenderers');
const EditorFactory = require('./js/editors/editorFactory');
const ArqueoEditor = require('./js/editors/arqueoEditor');
const AdoEditor = require('./js/editors/adoEditor');

// Global variables
let bankData = [];
let originalTasksData = null;
let tasksData = {
    id_task: 'temp',
    num_operaciones: 0,
    liquido_operaciones: 0,
    operaciones: []
};

// Current editor instance
let currentEditor = null;

// DOM elements
const taskContainer = document.getElementById('taskContainer');
const bankBox = document.getElementById('bankBox');
const bankDate = document.getElementById('bankDate');
const bankConcept = document.getElementById('bankConcept');
const bankAmount = document.getElementById('bankAmount');
const bankBalance = document.getElementById('bankBalance');
const aiSuggestionCount = document.getElementById('aiSuggestionCount');
const selectedPattern = document.getElementById('selectedPattern');

// Modal elements
const taskModal = document.getElementById('taskModal');
const modalTitle = document.getElementById('modalTitle');
const taskType = document.getElementById('taskType');
const dynamicFormFields = document.getElementById('dynamicFormFields');
const modalHeader = document.querySelector('.modal-header') || document.createElement('div');
const closeModalBtn = document.querySelector('.close');
const saveModalBtn = document.getElementById('saveModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');

// Buttons
const addTaskBtn = document.getElementById('addTaskBtn');
const confirmBtn = document.getElementById('confirmBtn');
const cancelBtn = document.getElementById('cancelBtn');
const acceptAllBtn = document.getElementById('acceptAllBtn');
const rejectAllBtn = document.getElementById('rejectAllBtn');
const trainAIBtn = document.getElementById('trainAIBtn');
const saveBtn = document.getElementById('saveBtn');

/**
 * Initialize the application
 */
async function init() {
    console.log('Initializing application...');
    
    // Initialize debug console
    DebugConsole.init();
    
    // Get data from main process
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const operationId = urlParams.get('id');
        
        console.log('Operation ID:', operationId);
        
        // Get bank operation data
        bankData = await ipcRenderer.invoke('get-bank-operation', operationId);
        console.log('Bank data received:', bankData);
        
        // Display bank operation details
        displayBankOperation(bankData);

        // Setup pattern selector
        setupPatternSelector();
        
        // Get AI suggestion
        console.log('Requesting AI translation...');
        const aiSuggestion = await ipcRenderer.invoke('translate-operation', bankData);
        console.log('AI suggestion received:', aiSuggestion);
        
        // Store original data for comparison
        originalTasksData = JSON.parse(JSON.stringify(aiSuggestion)); 
        
        // Store AI suggestion
        tasksData = aiSuggestion.data;
        
        // Display AI suggestion count
        updateAISuggestionInfo(aiSuggestion);

        // Update the pattern display if available in the response
        if (aiSuggestion.description) {
            updateSelectedPattern(aiSuggestion.description);
            // Update current pattern ID if available
            if (aiSuggestion.patternId) {
                currentPatternId = aiSuggestion.patternId;
            }
        }
        
        // Render tasks
        renderTasks();
        
        console.log('Initialization complete');
    } catch (error) {
        console.error('Error initializing:', error);
        showErrorMessage('Error al cargar los datos: ' + error.message);
    }
}

/**
 * Display bank operation details
 */
function displayBankOperation(data) {
    console.log('Displaying bank operation:', data);
    
    const [caja, fecha, concepto, importe, saldo] = data;
    bankBox.textContent = caja;
    bankDate.textContent = fecha;
    bankConcept.textContent = concepto;
    
    // Format currency values
    bankAmount.textContent = formatCurrency(importe);
    bankAmount.classList.add('currency-value');
    
    bankBalance.textContent = formatCurrency(saldo);
    bankBalance.classList.add('currency-value');
}

/**
 * Update AI suggestion information
 */
function updateAISuggestionInfo(aiSuggestion) {
    // Update count
    if (aiSuggestionCount) {
        aiSuggestionCount.textContent = `TasksId: ${tasksData.id_task} la IA ha sugerido ${tasksData.num_operaciones} operaciones contables para esta transacción bancaria.`;
    }
    
    // Update pattern if available
    if (aiSuggestion.description && selectedPattern) {
        selectedPattern.textContent = aiSuggestion.description || 'Ninguno';
    }
}

/**
 * Render all tasks
 */
function renderTasks() {
    console.log('Rendering tasks:', tasksData.operaciones.length);
    
    // Clear the container
    taskContainer.innerHTML = '';
    
    // Render each task
    tasksData.operaciones.forEach((task, index) => {
        const taskCard = TaskRenderers.renderTaskCard(task, index, openEditModal, deleteTask);
        taskContainer.appendChild(taskCard);
    });
}

/**
 * Open modal to edit a task
 */
function openEditModal(index) {
    console.log('Opening edit modal for task index:', index);
    
    // Set modal title
    const isEditMode = index >= 0;
    modalTitle.textContent = isEditMode ? 'Editar Tarea' : 'Añadir Tarea';
    
    // Get current task or create a default one
    const currentTask = isEditMode ? 
        tasksData.operaciones[index] : 
        { tipo: taskType.value, detalle: {} };
    
    // Store the task index for saving
    saveModalBtn.dataset.taskIndex = index;
    
    // Create the appropriate editor
    currentEditor = EditorFactory.createEditor(
        currentTask.tipo, 
        dynamicFormFields,
        currentTask
    );
    
    // Set the task type dropdown
    taskType.value = currentTask.tipo;
    
    // Render the editor
    currentEditor.render();
    
    // Add task type change event
    taskType.onchange = function() {
        // Create a new editor with the selected type
        currentEditor = EditorFactory.createEditor(
            taskType.value,
            dynamicFormFields,
            { tipo: taskType.value, detalle: {} }
        );
        currentEditor.render();
    };
    
    // Show the modal
    taskModal.style.display = 'block';
}

/**
 * Save task from modal
 */
function saveTaskFromModal() {
    console.log('Saving task from modal');
    
    // Validate form data
    if (!currentEditor || !currentEditor.validate()) {
        return;
    }
    
    // Get task data from editor
    const task = currentEditor.getData();
    console.log('Task data:', task);
    
    // Get task index
    const index = parseInt(saveModalBtn.dataset.taskIndex);
    
    // Add or update task
    if (index >= 0) {
        tasksData.operaciones[index] = task;
    } else {
        tasksData.operaciones.push(task);
    }
    
    // Update task count
    tasksData.num_operaciones = tasksData.operaciones.length;
    
    // Recalculate total amount
    calculateTotalAmount();
    
    // Close modal and re-render
    closeModal();
    renderTasks();
}

/**
 * Delete a task
 */
function deleteTask(index) {
    console.log('Attempting to delete task at index:', index);
    
    if (confirm('¿Está seguro de que desea eliminar esta tarea?')) {
        tasksData.operaciones.splice(index, 1);
        tasksData.num_operaciones = tasksData.operaciones.length;
        console.log('Task deleted, remaining tasks:', tasksData.operaciones.length);
        
        // Recalculate total amount
        calculateTotalAmount();
        
        // Re-render tasks
        renderTasks();
    }
}

/**
 * Calculate total amount from all tasks
 */
function calculateTotalAmount() {
    let total = 0;
    
    tasksData.operaciones.forEach(task => {
        if (task.tipo === 'arqueo') {
            task.detalle.final.forEach(partida => {
                if (partida.partida !== 'Total') {
                    total += parseFloat(partida.IMPORTE_PARTIDA) || 0;
                }
            });
        } else if (task.tipo === 'ado220') {
            task.detalle.aplicaciones.forEach(aplicacion => {
                total += parseFloat(aplicacion.importe) || 0;
            });
        }
    });
    
    tasksData.liquido_operaciones = total;
    console.log('Total amount calculated:', total);
}

/**
 * Format a number as currency in EUR format
 * @param {number} value - The value to format
 * @param {boolean} showSymbol - Whether to show the € symbol
 * @return {string} Formatted currency string
 */
function formatCurrency(value, showSymbol = true) {
    if (value === null || value === undefined || isNaN(value)) {
        return showSymbol ? '0,00 €' : '0,00';
    }
    
    // Convert to number if it's a string
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    // Format with Spanish locale (dot for thousands, comma for decimals)
    const formatted = numValue.toLocaleString('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    return showSymbol ? `${formatted} €` : formatted;
}
    /**
     * Convert date from UI format to storage format (ddmmaaaa)
     * @param {string} dateStr - Date in format YYYY-MM-DD
     * @return {string} Date in format ddmmaaaa
     */
    function formatDateForStorage(dateStr) {
        if (!dateStr) return '';
        
        // Handle ISO format (YYYY-MM-DD)
        if (dateStr.includes('-')) {
            const [year, month, day] = dateStr.split('-');
            return day + month + year;
        }
        
        // Handle already formatted date (assume it's already correct)
        if (dateStr.length === 8 && !dateStr.includes('/') && !dateStr.includes('-')) {
            return dateStr;
        }
        
        // Handle Spanish format (DD/MM/YYYY)
        if (dateStr.includes('/')) {
            const [day, month, year] = dateStr.split('/');
            return day.padStart(2, '0') + month.padStart(2, '0') + year;
        }
        
        // Return original if format is unknown
        return dateStr;
    }

/**
 * Convert date from storage format (ddmmaaaa) to UI format (YYYY-MM-DD)
 * @param {string} dateStr - Date in format ddmmaaaa
 * @return {string} Date in format YYYY-MM-DD for input[type="date"]
 */
    function formatDateForDisplay(dateStr) {
        if (!dateStr) return '';
        
        // Only process if it's in the expected format
        if (dateStr.length === 8 && !dateStr.includes('/') && !dateStr.includes('-')) {
            const day = dateStr.substring(0, 2);
            const month = dateStr.substring(2, 4);
            const year = dateStr.substring(4, 8);
            return `${year}-${month}-${day}`;
        }
        
        // If it already has separators, try to parse and standardize
        if (dateStr.includes('/') || dateStr.includes('-')) {
            const separator = dateStr.includes('/') ? '/' : '-';
            const parts = dateStr.split(separator);
            
            // Guess format based on parts
            let year, month, day;
            if (parts[0].length === 4) {
                // Assume YYYY-MM-DD
                [year, month, day] = parts;
            } else {
                // Assume DD/MM/YYYY or MM/DD/YYYY (default to DD/MM/YYYY for European format)
                [day, month, year] = parts;
            }
            
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        return dateStr;
    }
    function logFormData(formElement) {
        console.log('Form data being submitted:');
        const dateValue = document.getElementById('fecha').value;
        console.log('Raw date value:', dateValue);
        console.log('Converted date value:', formatDateForStorage(dateValue));
    }

/**
 * Close the modal
 */
function closeModal() {
    console.log('Closing modal');
    
    // Reset current editor
    currentEditor = null;
    
    // Hide the modal
    taskModal.style.display = 'none';
}

/**
 * Accept all AI suggestions
 */
function acceptAllSuggestions() {
    console.log('Accepting all AI suggestions');
    // AI suggestions are already loaded in tasksData
    renderTasks();
}

/**
 * Reject all AI suggestions
 */
function rejectAllSuggestions() {
    console.log('Rejecting all AI suggestions');
    
    // Ask for confirmation
    if (confirm('¿Está seguro de que desea rechazar todas las sugerencias de la IA?')) {
        // Clear all AI suggestions
        tasksData.id_task = 'temp';
        tasksData.operaciones = [];
        tasksData.num_operaciones = 0;
        tasksData.liquido_operaciones = 0;
        renderTasks();
    }
}

/**
 * Save translation to file
 */
async function saveTranslation() {
    try {
        console.log('Saving translation to file. Translation: ', tasksData);
        
        // Use ipcRenderer to communicate with main process
        const result = await ipcRenderer.invoke('show-save-dialog-and-save', tasksData);
        
        if (result.success) {
            showSuccessMessage('Traducción guardada correctamente');
        } else {
            showErrorMessage('Error al guardar la traducción: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error saving translation:', error);
        showErrorMessage('Error al guardar la traducción: ' + error.message);
    }
}

/**
 * Submit tasks and close dialog
 */
function submitAndClose() {
    console.log('Submitting tasks and closing dialog');
    
    // Send data back to main process
    if (window.responseChannel) {
        console.log('Using response channel:', window.responseChannel);
        ipcRenderer.send(window.responseChannel, tasksData);
        window.close(); 
        
    } else {
        // Fallback to the original method if responseChannel is not set
        console.warn('Response channel not set, using fallback method');
        ipcRenderer.invoke('submit-tasks', tasksData)
            .then(() => {
                window.close(); 
                
            })
            .catch(error => {
                console.error('Error submitting tasks:', error);
                showErrorMessage('Error al enviar las tareas: ' + error.message);
            });
    }
}

/**
 * Show error message
 */
function showErrorMessage(message) {
    alert(message);
}

/**
 * Show success message
 */
function showSuccessMessage(message) {
    alert(message);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    console.log('Setting up event listeners');
    
    // Modal events
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    
    if (cancelModalBtn) {
        cancelModalBtn.addEventListener('click', closeModal);
    }
    
    if (saveModalBtn) {
        saveModalBtn.addEventListener('click', saveTaskFromModal);
    }
    
    // Button events
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => openEditModal(-1));
    }
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', submitAndClose);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => window.close());
    }
    
    if (acceptAllBtn) {
        acceptAllBtn.addEventListener('click', acceptAllSuggestions);
    }
    
    if (rejectAllBtn) {
        rejectAllBtn.addEventListener('click', rejectAllSuggestions);
    }
    
    if (trainAIBtn) {
        trainAIBtn.addEventListener('click', () => {
            console.log('Train AI button clicked');
            // Implement AI training logic
        });
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveTranslation);
    }
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target === taskModal) {
            closeModal();
        }
    };
}

// Initialize application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded, initializing...');
    
    // Ensure all DOM elements are available before setting up
    setTimeout(() => {
        setupEventListeners();
        init();
    }, 100);
});


// Open pattern modal
function openPatternModal() {
    const patternModal = document.getElementById('patternModal');
    if (patternModal) {
        patternModal.style.display = 'block';
    }
}

// Close pattern modal
function closePatternModal() {
    const patternModal = document.getElementById('patternModal');
    if (patternModal) {
        patternModal.style.display = 'none';
    }
}

// Update selected pattern display
function updateSelectedPattern(patternName) {
    const selectedPatternElement = document.getElementById('selectedPattern');
    if (selectedPatternElement) {
        selectedPatternElement.textContent = patternName || 'Ninguno';
    }
}

// Variables to store patterns data
let availablePatterns = [];
let currentPatternId = null;

// Add these to your event listeners setup
function setupPatternSelector() {
    // Pattern selector button
    const changePatternBtn = document.getElementById('changePatternBtn');
    if (changePatternBtn) {
        changePatternBtn.addEventListener('click', openPatternModal);
    }
    
    // Pattern modal elements
    const patternModal = document.getElementById('patternModal');
    const closePatternBtn = patternModal.querySelector('.close');
    const cancelPatternBtn = document.getElementById('cancelPatternBtn');
    const refreshPatternsBtn = document.getElementById('refreshPatternsBtn');
    const patternSearchInput = document.getElementById('patternSearchInput');
    
    // Close modal events
    if (closePatternBtn) {
        closePatternBtn.addEventListener('click', closePatternModal);
    }
    
    if (cancelPatternBtn) {
        cancelPatternBtn.addEventListener('click', closePatternModal);
    }
    
    // Refresh patterns list
    if (refreshPatternsBtn) {
        refreshPatternsBtn.addEventListener('click', loadAvailablePatterns);
    }
    
    // Search functionality
    if (patternSearchInput) {
        patternSearchInput.addEventListener('input', filterPatterns);
        patternSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                patternSearchInput.value = '';
                filterPatterns();
                patternSearchInput.blur();
            }
        });
    }
    
    // When user clicks outside the modal, close it
    window.addEventListener('click', function(event) {
        if (event.target === patternModal) {
            closePatternModal();
        }
    });
    
    // Load available patterns on startup
    loadAvailablePatterns();
}

// Add these to your event listeners setup
function setupPatternSelector_old() {
    // Pattern selector button
    const changePatternBtn = document.getElementById('changePatternBtn');
    if (changePatternBtn) {
        changePatternBtn.addEventListener('click', openPatternModal);
    }
    
    // Pattern modal elements
    const patternModal = document.getElementById('patternModal');
    const closePatternBtn = patternModal.querySelector('.close');
    const cancelPatternBtn = document.getElementById('cancelPatternBtn');
    const refreshPatternsBtn = document.getElementById('refreshPatternsBtn');
    
    // Close modal events
    if (closePatternBtn) {
        closePatternBtn.addEventListener('click', closePatternModal);
    }
    
    if (cancelPatternBtn) {
        cancelPatternBtn.addEventListener('click', closePatternModal);
    }
    
    // Refresh patterns list
    if (refreshPatternsBtn) {
        refreshPatternsBtn.addEventListener('click', loadAvailablePatterns);
    }
    
    // When user clicks outside the modal, close it
    window.addEventListener('click', function(event) {
        if (event.target === patternModal) {
            closePatternModal();
        }
    });
    
    // Load available patterns on startup
    loadAvailablePatterns();
}

// Function to load available patterns from the main process
async function loadAvailablePatterns() {
    try {
        console.log('Loading available patterns...');
        
        // Show loading state
        const patternList = document.getElementById('patternList');
        if (patternList) {
            patternList.innerHTML = '<div class="pattern-item">Cargando patrones...</div>';
        }
        
        // Request patterns from main process
        availablePatterns = await ipcRenderer.invoke('get-available-patterns');
        console.log('Patterns loaded:', availablePatterns);
        
        // Render patterns in the modal
        renderPatternList();
    } catch (error) {
        console.error('Error loading patterns:', error);
        
        // Show error in pattern list
        const patternList = document.getElementById('patternList');
        if (patternList) {
            patternList.innerHTML = '<div class="pattern-item">Error al cargar patrones: ' + error.message + '</div>';
        }
    }
}

// Function to render the patterns list
function renderPatternList() {
    const patternList = document.getElementById('patternList');
    if (!patternList) return;
    
    // Clear the list
    patternList.innerHTML = '';
    
    // Add each pattern
    if (availablePatterns && availablePatterns.length > 0) {
        availablePatterns.forEach(pattern => {
            const patternItem = document.createElement('div');
            patternItem.className = 'pattern-item';
            if (pattern.id === currentPatternId) {
                patternItem.classList.add('selected');
            }
            
            const patternInfo = document.createElement('div');
            patternInfo.className = 'pattern-info';
            
            const patternName = document.createElement('div');
            patternName.className = 'pattern-name';
            patternName.textContent = pattern.name;
            
            const patternDescription = document.createElement('div');
            patternDescription.className = 'pattern-description';
            patternDescription.textContent = pattern.description || 'Sin descripción';
            
            patternInfo.appendChild(patternName);
            patternInfo.appendChild(patternDescription);
            
            const applyButton = document.createElement('button');
            applyButton.className = 'pattern-apply-btn';
            applyButton.textContent = 'Aplicar';
            applyButton.addEventListener('click', () => applyPattern(pattern));
            
            patternItem.appendChild(patternInfo);
            patternItem.appendChild(applyButton);
            
            // Click on item also selects
            patternItem.addEventListener('click', (event) => {
                // Only handle clicks on the item itself, not on buttons
                if (event.target === patternItem || event.target === patternInfo || 
                    event.target === patternName || event.target === patternDescription) {
                    selectPattern(pattern);
                }
            });
            
            patternList.appendChild(patternItem);
        });
    } else {
        patternList.innerHTML = '<div class="pattern-item">No hay patrones disponibles</div>';
    }
}

// Function to filter patterns based on search input
function filterPatterns() {
    const searchInput = document.getElementById('patternSearchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const patternItems = document.querySelectorAll('.pattern-item:not(.no-patterns-found):not(.no-results-found)');
    
    let visibleCount = 0;
    const totalCount = patternItems.length;
    
    console.log('Filtering patterns:', { searchTerm, totalCount }); // Debug log
    
    patternItems.forEach(item => {
        // Get pattern name from dataset
        const patternName = item.dataset.patternName || '';
        
        // Get pattern name and description from text content as backup
        const nameElement = item.querySelector('.pattern-name');
        const descriptionElement = item.querySelector('.pattern-description');
        const nameText = nameElement ? nameElement.textContent.toLowerCase() : '';
        const descriptionText = descriptionElement ? descriptionElement.textContent.toLowerCase() : '';
        
        // Search in name (from dataset or text) and description
        const matches = searchTerm === '' || 
                       patternName.includes(searchTerm) || 
                       nameText.includes(searchTerm) || 
                       descriptionText.includes(searchTerm);
        
        console.log('Pattern check:', { 
            patternName, 
            nameText, 
            descriptionText, 
            searchTerm, 
            matches 
        }); // Debug log
        
        if (matches) {
            item.classList.remove('hidden');
            item.style.display = 'flex'; // Ensure it's visible
            visibleCount++;
        } else {
            item.classList.add('hidden');
            item.style.display = 'none'; // Hide it
        }
    });
    
    console.log('Filter results:', { visibleCount, totalCount }); // Debug log
    
    // Update search results count
    updateSearchResults(visibleCount, totalCount);
    
    // Show "no results" message if no patterns match
    const patternList = document.getElementById('patternList');
    const existingNoResults = patternList.querySelector('.no-results-found');
    
    if (visibleCount === 0 && searchTerm !== '' && totalCount > 0) {
        if (!existingNoResults) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results-found';
            noResults.style.padding = '20px';
            noResults.style.textAlign = 'center';
            noResults.style.color = '#666';
            noResults.style.fontStyle = 'italic';
            noResults.textContent = `No se encontraron patrones que coincidan con "${searchInput.value}"`;
            patternList.appendChild(noResults);
        }
    } else if (existingNoResults) {
        existingNoResults.remove();
    }
}

// Function to update search results display
function updateSearchResults(visibleCount, totalCount) {
    const searchResults = document.getElementById('patternSearchResults');
    if (!searchResults) return;
    
    const searchInput = document.getElementById('patternSearchInput');
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    
    if (searchTerm === '') {
        searchResults.textContent = `${totalCount} patrones disponibles`;
    } else {
        searchResults.textContent = `${visibleCount} de ${totalCount} patrones`;
    }
}
// Function to select a pattern (highlight but don't apply)
function selectPattern(pattern) {
    // Update current pattern ID
    currentPatternId = pattern.id;
    
    // Update UI highlighting
    const patternItems = document.querySelectorAll('.pattern-item');
    patternItems.forEach(item => {
        item.classList.remove('selected');
        
        // Find the item that matches the pattern ID
        const itemName = item.querySelector('.pattern-name');
        if (itemName && itemName.textContent === pattern.name) {
            item.classList.add('selected');
        }
    });
}

// Function to apply the selected pattern
async function applyPattern(pattern) {
    try {
        console.log('Applying pattern:', pattern);
        
        // Update UI
        updateSelectedPattern(pattern.name);
        
        // Call main process to apply pattern
        const result = await ipcRenderer.invoke('apply-pattern', {
            patternId: pattern.id,
            bankData: bankData
        });
        
        // Update tasks data with the result
        if (result && result.success) {
            console.log('Pattern applied successfully:', result);
            
            // Store original for comparison
            originalTasksData = JSON.parse(JSON.stringify(result.data));
            
            // Update task data
            tasksData = result.data;
            
            // Update task count
            if (aiSuggestionCount) {
                aiSuggestionCount.textContent = `La IA ha sugerido ${tasksData.num_operaciones} operaciones contables para esta transacción bancaria.`;
            }
            
            // Re-render tasks
            renderTasks();
            
            // Close pattern modal
            closePatternModal();
        } else {
            console.error('Error applying pattern:', result ? result.error : 'Unknown error');
            alert('Error al aplicar patrón: ' + (result ? result.error : 'Unknown error'));
        }
    } catch (error) {
        console.error('Error applying pattern:', error);
        alert('Error al aplicar patrón: ' + error.message);
    }
}

// Export any necessary functions or variables
module.exports = {
    init,
    renderTasks,
    openEditModal,
    closeModal,
    saveTaskFromModal,
    deleteTask
};
