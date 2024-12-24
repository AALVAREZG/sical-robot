
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded");
    loadCajas();
    setupTabButtons();
    setupSelectFileButton();
    setupFilters(); 
});

async function loadCajas() {
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



function displayRecords(records) {
    const tbody = document.querySelector('#records tbody');
    tbody.innerHTML = '';
    
    records.sort((a, b) => new Date(b.insertion_date) - new Date(a.insertion_date));
    
    records.forEach(record => {
        const tr = document.createElement('tr');
        const formattedImporte = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(record.importe);
        const formattedSaldo = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(record.saldo);
        tr.innerHTML = `
            <td>${record.caja}</td>
            <td>${record.fecha}</td>
            <td>${record.concepto}</td>
            <td>${formattedImporte}</td>
            <td>${formattedSaldo}</td>
            <td>${record.insertion_date}</td>
            <td>${record.alreadyInDatabase ? 'Yes' : 'No'} </td>
            <td>${record.is_contabilized ? 'Yes' : 'No'} </td>
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
    updateStatusBar(filteredRecords.length);
}
