
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

// Lodash is available globally as '_' from CDN
function displayGroupedRecords(records) {
    const tbody = document.querySelector('#records tbody');
    tbody.innerHTML = '';

    // Separate matching and non-matching records
    const groupedData = {};
    const nonMatchingRecords = [];
    
    records.forEach(record => {
        const match = record.concepto.match(/TRANSFERENCIAS \| ([A-Za-z0-9]{6,9}) 41016796-E\.I\. CASAR \| Junta de Andalucia/);
        
        if (match) {
            const dateKey = record.normalized_date;
            if (!groupedData[dateKey]) {
                groupedData[dateKey] = {
                    records: [],
                    total: 0
                };
            }
            groupedData[dateKey].records.push(record);
            groupedData[dateKey].total += record.importe;
        } else {
            nonMatchingRecords.push(record);
        }
    });

    // Combine all records in date order
    const allRecords = [...nonMatchingRecords];

    // Add group summary records
    Object.entries(groupedData).forEach(([date, group]) => {
        const [month, day, year] = date.split('-');
        const monthName = new Date(year, month - 1).toLocaleString('es-ES', { month: 'long' });
        
        // Create summary record
        const summaryRecord = {
            id: `group-${date}`,
            caja: group.records[0].caja,
            fecha: group.records[0].fecha,
            normalized_date: date,
            concepto: `TRANSFERENCIAS 41016796-E.I. CASARICHE ${monthName.toUpperCase()} ${year}`,
            importe: group.total,
            saldo: group.records[group.records.length - 1].saldo,
            insertion_date: group.records[0].insertion_date,
            alreadyInDatabase: true,
            is_contabilized: group.records.every(r => r.is_contabilized),
            isGroup: true,
            groupRecords: group.records
        };
        
        allRecords.push(summaryRecord);
    });

    // Sort all records by date
    allRecords.sort((a, b) => b.normalized_date.localeCompare(a.normalized_date));

    // Display all records
    allRecords.forEach(record => {
        const tr = createRecordRow(record);
        tbody.appendChild(tr);
        
        // If it's a group record, add hidden detail rows
        if (record.isGroup) {
            const detailsContainer = document.createElement('tbody');
            detailsContainer.className = 'group-details';
            detailsContainer.style.display = 'none';
            
            record.groupRecords.forEach(detail => {
                const detailRow = createRecordRow(detail);
                detailRow.classList.add('group-detail-row');
                detailsContainer.appendChild(detailRow);
            });
            
            tbody.appendChild(detailsContainer);
            
            // Add click handler to group row
            tr.classList.add('group-row');
            tr.addEventListener('click', () => {
                detailsContainer.style.display = detailsContainer.style.display === 'none' ? '' : 'none';
                tr.classList.toggle('expanded');
            });
        }
    });
}

function createRecordRow(record) {
    const tr = document.createElement('tr');
    tr.classList.add(record.importe >= 0 ? 'positive-amount' : 'negative-amount');
    tr.classList.add(record.is_contabilized ? 'contabilized' : 'uncontabilized');
    if (record.isGroup) tr.classList.add('group-summary');
    
    const formattedImporte = new Intl.NumberFormat('es-ES', { 
        style: 'currency', 
        currency: 'EUR',
        minimumFractionDigits: 2
    }).format(record.importe);
    
    const formattedSaldo = new Intl.NumberFormat('es-ES', { 
        style: 'currency', 
        currency: 'EUR',
        minimumFractionDigits: 2
    }).format(record.saldo);

    tr.innerHTML = `
        <td>${record.caja}</td>
        <td class="date">${record.fecha}</td>
        <td class="date">${record.normalized_date}</td>
        <td>${record.concepto}${record.isGroup ? ' ▼' : ''}</td>
        <td class="currency">${formattedImporte}</td>
        <td class="currency">${formattedSaldo}</td>
        <td class="long-date">${record.insertion_date}</td>
        <td class="text-center">${record.alreadyInDatabase ? '✓' : '✗'}</td>
        <td class="text-center">
            <span class="status-indicator ${record.is_contabilized ? 'contabilized' : 'uncontabilized'}"></span>
        </td>
        <td>
            ${!record.isGroup ? `
                <button onclick="toggleContabilizado('${record.id}', '${record.caja}', ${!record.is_contabilized})">
                    ${record.is_contabilized ? 'Desmarcar' : 'Marcar'}
                </button>
                <button onclick="contabilizar('${record.id}', '${record.caja}')">Contabilizar</button>
            ` : ''}
        </td>
    `;
    return tr;
}

// Add to your existing styles
const additionalStyles = `
    .group-summary {
        background-color: #2d2d2d !important;
        cursor: pointer;
    }
    
    .group-summary:hover {
        background-color: #3d3d3d !important;
    }
    
    .group-detail-row {
        background-color: #1a1a1a !important;
    }
    
    .group-summary.expanded td:nth-child(4)::after {
        content: ' ▲';
    }
`;




// Replace the existing displayRecords function
window.displayRecords = displayGroupedRecords;

function displayRecords_old(records) {
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
            <td class="date">${formatDate(record.normalized_date)}</td>
            <td>${record.concepto}</td>
            <td class="currency">${formattedImporte}</td>
            <td class="currency">${formattedSaldo}</td>
            <td class="long-date">${record.insertion_date}</td>
            <td class="text-center">${record.alreadyInDatabase ? '✓' : '✗'}</td>
            <td class="text-center">
                <span class="status-indicator ${record.is_contabilized ? 'contabilized' : 'uncontabilized'}"></span>
                ${record.is_contabilized ? '✓' : '✗'}
            </td>
            <td>
                <button onclick="toggleContabilizado('${record.id}', '${record.caja}', ${!record.is_contabilized})">
                    ${record.is_contabilized ? 'Desmarcar' : 'Marcar'} Contabilizado
                </button>
                <button onclick="contabilizar('${record.id}', '${record.caja}', ${!record.is_contabilized})">   
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

async function toggleContabilizado(id, caja, newState) {
    const confirmMessage = newState ? 'Are you sure?' : 'Are you sure you want to unmark this record as contabilized?';
    if (confirm(confirmMessage)) {
        try {
            const result = await window.electronAPI.toggleContabilizado({ operation_id: id, operation_caja: caja, new_state: newState });
            displayRecords(result.data);
        } catch (error) {
            console.error("Error toggling contabilizado:", error);
        }
    }
}

async function contabilizar_old(id, caja) {
    // Implement the logic for "Editar Opciones" here
    console.log(`Contabilize options for record ${id} in caja ${caja}`);
    // You might want to open a modal or a new window for editing options
    try {
        const result = await window.electronAPI.contabilizar({ operation_id: id, operation_caja: caja});
        displayRecords(result.data);
    } catch (error) {
        console.error("Error contabilizando:", error);
    }
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

async function contabilizar(id, caja) {
    console.log(`Contabilizar for record ${id} in caja ${caja}`);
    try {
        await window.electronAPI.openContableTaskDialog();
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

window.electronAPI.onRecordsImported(() => {
    loadCajas();
    const activeCajaButton = document.querySelector('.cajas-container button.active');
    if (activeCajaButton) {
        loadRecordsForCaja(activeCajaButton.textContent);
    }
});

function showError(message) {
    const errorToast = document.getElementById('errorToast');
    errorToast.textContent = message;
    errorToast.style.display = 'block';
    setTimeout(() => {
        errorToast.style.display = 'none';
    }, 3000);
}

