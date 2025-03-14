
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded");
    loadCajas();
    setupTabButtons();
    setupSelectFileButton();
    setupFilters(); 
});

async function loadCajas_old() {
    console.log("loadCajas function called");
    try {
        const result = await window.electronAPI.getCajas();
        console.log("get-cajas result:", result);
        const cajasDiv = document.getElementById('cajas');
        result.data.forEach(caja => {
            const button = document.createElement('button');
            button.textContent = caja.caja;
            button.onclick = () => loadRecordsForCaja(caja.caja);
            cajasDiv.appendChild(button);
        });
    } catch (error) {
        console.error("Error in loadCajas:", error);
    }
}

async function loadCajas() {
    console.log("loadCajas function called");
    try {
        const result = await window.electronAPI.getCajas();
        console.log("get-cajas result:", result);
        const cajasDiv = document.getElementById('cajas');
        cajasDiv.innerHTML = ''; // Clear existing buttons
        
        result.data.forEach(caja => {
            const button = document.createElement('button');
            button.textContent = caja.caja;
            button.onclick = () => {
                // Remove active class from all buttons
                document.querySelectorAll('.cajas-container button').forEach(btn => {
                    btn.classList.remove('active');
                });
                // Add active class to clicked button
                button.classList.add('active');
                loadRecordsForCaja(caja.caja);
            };
            cajasDiv.appendChild(button);
        });
    } catch (error) {
        console.error("Error in loadCajas:", error);
    }
}

async function loadRecordsForCaja(caja) {
    try {
        const tableContainer = document.querySelector('.table-container');
        showLoading(tableContainer);
        
        const result = await window.electronAPI.getLast100Records(caja);
        currentRecords = result.data;
        
        applyFilters(); // This will filter and display the records
        hideLoading(tableContainer);
    } catch (error) {
        console.error("Error loading records:", error);
        hideLoading(tableContainer);
        showError("Error loading records");
    }
}


// Replace the existing displayRecords function
//window.displayRecords = displayGroupedRecords;

function displayRecords(records) {
    const tbody = document.querySelector('#records tbody');
    tbody.innerHTML = '';
    
    records.forEach(record => {
        const tr = document.createElement('tr');
        
        // Add classes for styling
        tr.classList.add(record.importe >= 0 ? 'positive-amount' : 'negative-amount');
        tr.classList.add(record.is_contabilized ? 'contabilized' : 'uncontabilized');
        
        // Format date
        const formattedDate = formatDate(record.fecha);
        const date = new Date(formattedDate);
        
        // Format currency
        const formattedImporte = new Intl.NumberFormat('es-ES', { 
            style: 'currency', 
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(record.importe);
        
        const formattedSaldo = new Intl.NumberFormat('es-ES', { 
            style: 'currency', 
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(record.saldo);

        

        tr.innerHTML = `
            <td>${record.caja}</td>
            <td class="date">${record.fecha}</td>
            <td>${record.concepto}</td>
            <td class="currency">${formattedImporte}</td>
            <td class="currency">${formattedSaldo}</td>
            <td class="text-center">${record.alreadyInDatabase ? '✓' : '✗'}</td>
            <td class="text-center">
                <span class="status-indicator ${record.is_contabilized ? 'contabilized' : 'uncontabilized'}"></span>
                ${record.is_contabilized ? '✓' : '✗'}
            </td>
            <td>
                <button onclick="toggleContabilizado('${record.id}', '${record.caja}', ${!record.is_contabilized})">
                    ${record.is_contabilized ? 'Desmarcar' : 'Marcar'} Contabilizado
                </button>
                <button onclick="openContableTaskDialog('${record.id}', '${record.caja}', ${!record.is_contabilized})">   
                    ${record.is_contabilized ? '' : 'Contabilizar'}
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function formatDate(date) {
    if (!date) return '';
    if (typeof date === 'string') {
        date = parseEnglishDate(date);
        if (!date) return '';
    }
    
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: '2-digit'
    });
}

function parseEnglishDate(dateStr) {
    console.log("parseEnglishDate function called: ", dateStr);
    if (!dateStr) return null;
    
    // Handle different separators
    const cleanDate = dateStr.replace(/[.-]/g, '/');
    
    // Split the date parts
    const parts = cleanDate.split('/');
    if (parts.length !== 3) return null;
    
    // Parse parts (handle single and double digit days/months)
    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[0], 10) - 1; // JS months are 0-based
    const year = parseInt(parts[2], 10);
    
    // Validate values
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31) return null;
    if (month < 0 || month > 11) return null;
    if (year < 1900 || year > 2100) return null;
    
    const date = new Date(year, month, day);
    
    // Verify valid date (handles months with less than 31 days)
    if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
        return null;
    }
    
    return date;
}

function parseSpanishDate(dateStr) {
    if (!dateStr) return null;
    
    // Handle different separators
    const cleanDate = dateStr.replace(/[.-]/g, '/');
    
    // Split the date parts
    const parts = cleanDate.split('/');
    if (parts.length !== 3) return null;
    
    // Parse parts (handle single and double digit days/months)
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS months are 0-based
    const year = parseInt(parts[2], 10);
    
    // Validate values
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31) return null;
    if (month < 0 || month > 11) return null;
    if (year < 1900 || year > 2100) return null;
    
    const date = new Date(year, month, day);
    
    // Verify valid date (handles months with less than 31 days)
    if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
        return null;
    }
    
    return date;
}




async function editarOpciones(id, caja) {
    // Implement the logic for "Editar Opciones" here
    console.log(`Editing options for record ${id} in caja ${caja}`);
    // You might want to open a modal or a new window for editing options
}


function setupTabButtons() {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            activateTab(tabName);
        });
    });
}

function activateTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`.tab-button[data-tab="${tabName}"]`).classList.add('active');
}

function setupSelectFileButton() {
    const selectFileButton = document.getElementById('selectFile');
    selectFileButton.addEventListener('click', () => {
        // Implement file selection logic here
        // You may need to use Electron's dialog API for this
    });
}

async function toggleContabilizado(id, caja, newState) {
    const confirmMessage = newState ? 'Are you sure?' : 'Are you sure you want to unmark this record as contabilized?';
    if (confirm(confirmMessage)) {
        try {
            const result = await window.electronAPI.toggleContabilizado({operationId: id, operationCaja: caja, newState: newState });
            displayRecords(result.data);
        } catch (error) {
            console.error("Error toggling contabilizado:", error);
        }
    }
}

async function openContableTaskDialog(id, caja, new_state) {
    console.log(`Contabilizar for record ${id} in caja ${caja}`);
    try {
        await window.electronAPI.openContableTaskDialog({operationId: id, operationCaja: caja, newState: new_state});
        
    } catch (error) {
        console.error("Error opening contable task dialog:", error);
    }
}

window.electronAPI.onTaskSaved((result) => {
    if (result.success) {
        console.log('Task saved successfully');
        // Refresh the records or update UI as needed
        loadRecordsForCaja(caja);  // Assuming this function exists to reload data
    }
});

const information = document.getElementById('info')
information.innerText = `👋 This app is using Chrome (v${versions.chrome()}), Node.js (v${versions.node()}), and Electron (v${versions.electron()})`


let currentPage = 1;
const pageSize = 25;
let sortColumn = null;
let sortDirection = 'asc';
let searchTerm = '';

function showLoading(element) {
  element.classList.add('loading');
}

function hideLoading(element) {
  element.classList.remove('loading');
}

function updateStatusBar(totalRecords) {
  const statusBar = document.querySelector('.status-bar');
  statusBar.textContent = `Total records: ${totalRecords} | Page ${currentPage}`;
}

function setupSearch() {
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search records...';
  searchInput.addEventListener('input', debounce((e) => {
    searchTerm = e.target.value;
    loadRecordsForCaja(currentCaja);
  }, 300));
  
  document.querySelector('.search-bar').appendChild(searchInput);
}

function setupPagination(totalRecords) {
  const totalPages = Math.ceil(totalRecords / pageSize);
  const pagination = document.querySelector('.pagination');
  pagination.innerHTML = `
    <button ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">Previous</button>
    <span>Page ${currentPage} of ${totalPages}</span>
    <button ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">Next</button>
  `;
}

function setupTableSorting() {
  document.querySelectorAll('th').forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      const column = th.textContent.toLowerCase();
      if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortColumn = column;
        sortDirection = 'asc';
      }
      loadRecordsForCaja(currentCaja);
    });
  });
}

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'r') {
    e.preventDefault();
    loadRecordsForCaja(currentCaja);
  }
});

let currentRecords = [];
let filteredRecords = [];

function setupFilters() {
    const searchInput = document.getElementById('searchInput');
    const filterField = document.getElementById('filterField');

    searchInput.addEventListener('input', applyFilters);
    filterField.addEventListener('change', applyFilters);
}

// Update applyFilters function
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filterField = document.getElementById('filterField').value;
    
    filteredRecords = currentRecords.filter(record => {
        if (filterField === 'all') {
            return Object.values(record).some(value => 
                String(value).toLowerCase().includes(searchTerm)
            );
        }
        return String(record[filterField]).toLowerCase().includes(searchTerm);
    });

    displayRecords(filteredRecords);
    statusBar.updateStatus({ filteredRecords: filteredRecords.length });
}

class StatusBar {
    constructor() {
        this.totalRecords = 0;
        this.filteredRecords = 0;
        this.currentCaja = '';
        this.lastUpdate = new Date();
        this.isLoading = false;
    }

    updateStatus({ totalRecords, filteredRecords, currentCaja }) {
        if (totalRecords !== undefined) this.totalRecords = totalRecords;
        if (filteredRecords !== undefined) this.filteredRecords = filteredRecords;
        if (currentCaja !== undefined) this.currentCaja = currentCaja;
        this.lastUpdate = new Date();
        this.render();
    }

    setLoading(isLoading) {
        this.isLoading = isLoading;
        this.render();
    }

    render() {
        const statusBar = document.querySelector('.status-bar');
        statusBar.innerHTML = `
            <div class="status-item">
                <span class="status-icon">📊</span>
                Total: ${this.totalRecords} | Filtered: ${this.filteredRecords}
            </div>
            <div class="status-item">
                <span class="status-icon">📁</span>
                Caja: ${this.currentCaja || 'None'}
            </div>
            <div class="status-item">
                <span class="status-icon">⏱️</span>
                Updated: ${this.lastUpdate.toLocaleTimeString()}
            </div>
            ${this.isLoading ? '<div class="status-item">⌛ Loading...</div>' : ''}
        `;
    }
}

// Initialize status bar
const statusBar = new StatusBar();

// Update loadRecordsForCaja function
async function loadRecordsForCaja(caja) {
    try {
        statusBar.setLoading(true);
        statusBar.updateStatus({ currentCaja: caja });
        
        const result = await window.electronAPI.getLast100Records(caja);
        currentRecords = result.data;
        
        applyFilters();
        statusBar.setLoading(false);
        statusBar.updateStatus({
            totalRecords: currentRecords.length,
            filteredRecords: filteredRecords.length
        });
    } catch (error) {
        console.error("Error loading records:", error);
        statusBar.setLoading(false);
        showError("Error loading records");
    }
}




async function setupSelectFileButton() {
    const selectFileButton = document.getElementById('selectFile');
    selectFileButton.addEventListener('click', async () => {
        try {
            const filePath = await window.electronAPI.selectFile();
            if (filePath) {
                const records = await window.electronAPI.processFile(filePath);
                await window.electronAPI.showPreviewDialog(records);
                loadCajas();
            }
        } catch (error) {
            console.error('Error processing file:', error);
            showError('Error processing file');
        }
    });
}

window.electronAPI.onRecordsImported((caja) => {
    loadRecordsForCaja(caja);
    statusBar.updateStatus({ currentCaja: caja });
});


window.electronAPI.onPreviewData(async (data) => {
    //console.log('Preview data:', data);
    processedRecords = await processGroupedRecords(data);
    //console.log('Processed records:', processedRecords);
    // Sort all records by date
    processedRecords.sort((a, b) => b.normalized_date.localeCompare(a.normalized_date));
    displayRecords(processedRecords);
});

function showError(message) {
    const errorToast = document.getElementById('errorToast');
    errorToast.textContent = message;
    errorToast.style.display = 'block';
    setTimeout(() => {
        errorToast.style.display = 'none';
    }, 3000);
}


// Show toast message
function showToast(message, isError = false) {
    const toast = document.getElementById('errorToast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.style.backgroundColor = isError ? 'var(--danger)' : 'var(--accent)';
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Update status bar
function updateStatusBar(total, filtered, cajaName, timestamp = null) {
    const statusTotal = document.getElementById('statusTotal');
    const statusCaja = document.getElementById('statusCaja');
    const statusTime = document.getElementById('statusTime');
    
    if (statusTotal) {
        statusTotal.textContent = `Total: ${total} | Filtered: ${filtered}`;
    }
    
    if (statusCaja) {
        statusCaja.textContent = `Caja: ${cajaName || 'None'}`;
    }
    
    if (statusTime) {
        const time = timestamp || new Date().toLocaleTimeString();
        statusTime.textContent = `Updated: ${time}`;
    }
}

