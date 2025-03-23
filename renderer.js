document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded");
    loadCajas();
    setupEventListeners();
    initializeUI();
});

// Global variables
let currentRecords = [];
let filteredRecords = [];
let currentPage = 1;
let pageSize = 25;
let currentCaja = '';
let expandedRowId = null;
let isActionMenuOpen = false;
let actionMenuTarget = null;

/**
 * Initialize UI elements
 */
function initializeUI() {
    setupPagination(0);
    setupTableSorting();
    setupSearch();
    
    // Update status bar with initial values
    updateStatusBar(0, 0, 'None');
}

/**
 * Load bank accounts (cajas) from the database
 */
async function loadCajas() {
    console.log("loadCajas function called");
    try {
        const result = await window.electronAPI.getCajas();
        console.log("get-cajas result:", result);
        const cajasDiv = document.getElementById('cajas');
        cajasDiv.innerHTML = ''; // Clear existing buttons
        
        result.data.forEach(caja => {
            const accountCard = createAccountCard(caja);
            cajasDiv.appendChild(accountCard);
        });
    } catch (error) {
        console.error("Error in loadCajas:", error);
        showToast("Error loading accounts", true);
    }
}

/**
 * Create an account card element
 */
function createAccountCard(caja) {
    const cajaName = caja.caja;
    const card = document.createElement('div');
    card.className = 'account-card';
    card.innerHTML = `<div class="account-name">${cajaName}</div>`;
    
    card.addEventListener('click', () => {
        // Remove active class from all cards
        document.querySelectorAll('.account-card').forEach(card => {
            card.classList.remove('active');
        });
        
        // Add active class to clicked card
        card.classList.add('active');
        
        // Load records for this account
        loadRecordsForCaja(cajaName);
    });
    
    return card;
}

/**
 * Load records for the selected bank account
 */
async function loadRecordsForCaja(caja) {
    try {
        showLoading(true);
        currentCaja = caja;
        
        // Update UI to show currently selected caja
        document.getElementById('currentCajaTitle').textContent = caja;
        document.getElementById('accountName').textContent = caja;
        document.getElementById('statusCaja').textContent = caja;
        
        const result = await window.electronAPI.getLast100Records(caja);
        currentRecords = result.data;
        currentPage = 1;
        
        applyFilters();
        showLoading(false);
        
        // Update the status bar
        updateStatusBar(currentRecords.length, filteredRecords.length, caja);
    } catch (error) {
        console.error("Error loading records:", error);
        showLoading(false);
        showToast("Error loading records", true);
    }
}

/**
 * Apply search filters to the current records
 */
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filterField = document.getElementById('filterField').value;
    
    filteredRecords = currentRecords.filter(record => {
        if (!searchTerm) return true; // No search term, show all
        
        if (filterField === 'all') {
            // Search in all text fields
            return Object.entries(record).some(([key, value]) => {
                // Only search in string fields and exclude id fields
                if (typeof value === 'string' && !key.includes('id')) {
                    return value.toLowerCase().includes(searchTerm);
                }
                // Also search in numeric fields converted to string
                if (typeof value === 'number') {
                    return value.toString().includes(searchTerm);
                }
                return false;
            });
        } else {
            // Search in specific field
            const value = record[filterField];
            if (typeof value === 'string') {
                return value.toLowerCase().includes(searchTerm);
            } else if (typeof value === 'number') {
                return value.toString().includes(searchTerm);
            }
            return false;
        }
    });
    
    // Update pagination
    setupPagination(filteredRecords.length);
    
    // Display the current page
    displayCurrentPage();
    
    // Update status bar
    updateStatusBar(currentRecords.length, filteredRecords.length, currentCaja);
}

/**
 * Display the current page of records
 */
function displayCurrentPage() {
    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, filteredRecords.length);
    const recordsToDisplay = filteredRecords.slice(start, end);
    
    displayRecords(recordsToDisplay);
    
    // Update pagination info
    document.getElementById('pageStart').textContent = start + 1;
    document.getElementById('pageEnd').textContent = end;
    document.getElementById('totalRecords').textContent = filteredRecords.length;
}

/**
 * Display records in the table
 */
function displayRecords(records) {
    const tbody = document.querySelector('#records tbody');
    tbody.innerHTML = '';
    
    records.forEach(record => {
        const row = createRecordRow(record);
        tbody.appendChild(row);
        
        // If this record is expanded, add the expanded details row
        if (expandedRowId === record.id) {
            const detailsRow = createExpandedDetailsRow(record);
            tbody.appendChild(detailsRow);
        }
    });
}

/**
 * Create a table row for a record
 */
function createRecordRow(record) {
    const tr = document.createElement('tr');
    tr.dataset.id = record.id;
    
    // Format date
    const formattedDate = formatDate(record.fecha);
    
    // Format currency
    const formattedImporte = formatCurrency(record.importe);
    const formattedSaldo = formatCurrency(record.saldo);
    
    // Set classes based on amount (positive/negative)
    const amountClass = record.importe >= 0 ? 'positive-amount' : 'negative-amount';
    
    // Check if this row is expanded
    const isExpanded = expandedRowId === record.id;
    
    tr.innerHTML = `
        <td class="date-value">${record.fecha}</td>
        <td class="concept-value">${record.concepto}</td>
        <td class="amount-value ${amountClass}">${formattedImporte}</td>
        <td class="balance-value">${formattedSaldo}</td>
        <td>
            <div class="status-indicator ${record.is_contabilized ? 'contabilized' : 'not-contabilized'}"></div>
        </td>
        <td>
            <button class="action-btn expand-btn" data-id="${record.id}">
                ${isExpanded ? '▲' : '▼'}
            </button>
            <button class="action-btn more-btn" data-id="${record.id}">⋮</button>
        </td>
    `;
    
    // Add click event for expand button
    tr.querySelector('.expand-btn').addEventListener('click', (e) => {
        toggleExpandRow(record.id);
        e.stopPropagation();
    });
    
    // Add click event for action menu button
    tr.querySelector('.more-btn').addEventListener('click', (e) => {
        toggleActionMenu(record, e.target);
        e.stopPropagation();
    });
    
    // Make entire row clickable for expansion
    tr.addEventListener('click', () => {
        toggleExpandRow(record.id);
    });
    
    return tr;
}

/**
 * Create an expanded details row
 */
function createExpandedDetailsRow(record) {
    const tr = document.createElement('tr');
    tr.className = 'expanded-row-container';
    tr.dataset.parentId = record.id;
    
    const td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'expanded-row';
    
    // Action buttons
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'expanded-actions';
    actionsDiv.innerHTML = `
        <button class="btn-primary" onclick="openContableTaskDialog('${record.id}', '${record.caja}', ${!record.is_contabilized})">Contabilizar</button>
        <button class="btn-secondary" onclick="toggleContabilizado('${record.id}', '${record.caja}', ${!record.is_contabilized})">
            ${record.is_contabilized ? 'Desmarcar Cont.' : 'Marcar Cont.'}
        </button>
        <button class="btn-secondary">Editar</button>
        <button class="btn-danger">Eliminar</button>
    `;
    
    // Details grid
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'expanded-details';
    
    // Left column
    const leftCol = document.createElement('div');
    leftCol.innerHTML = `
        <div>
            <div class="detail-label">Fecha Normalizada:</div>
            <div class="detail-value code-value">${record.normalized_date || 'N/A'}</div>
        </div>
        <div>
            <div class="detail-label">Fecha Inserción:</div>
            <div class="detail-value code-value">${record.insertion_date || 'N/A'}</div>
        </div>
        <div>
            <div class="detail-label">ID Apunte:</div>
            <div class="detail-value code-value">${record.id_apunte_banco || 'N/A'}</div>
        </div>
    `;
    
    // Right column
    const rightCol = document.createElement('div');
    rightCol.innerHTML = `
        <div>
            <div class="detail-label">Entidad:</div>
            <div class="detail-value">${extractEntity(record.concepto) || 'N/A'}</div>
        </div>
        <div>
            <div class="detail-label">Referencia:</div>
            <div class="detail-value code-value">${extractReference(record.concepto) || 'N/A'}</div>
        </div>
        <div>
            <div class="detail-label">Estado:</div>
            <div class="detail-value">
                <span class="status-badge ${record.is_contabilized ? 'status-badge-success' : 'status-badge-danger'}">
                    ${record.is_contabilized ? 'Contabilizado' : 'No Cont.'}
                </span>
            </div>
        </div>
    `;
    
    detailsDiv.appendChild(leftCol);
    detailsDiv.appendChild(rightCol);
    
    td.appendChild(actionsDiv);
    td.appendChild(detailsDiv);
    tr.appendChild(td);
    
    return tr;
}

/**
 * Toggle expanded state of a row
 */
function toggleExpandRow(recordId) {
    if (expandedRowId === recordId) {
        // Collapse the row
        expandedRowId = null;
    } else {
        // Expand this row
        expandedRowId = recordId;
    }
    
    // Refresh the display
    displayCurrentPage();
}

/**
 * Toggle action menu for a record
 */
function toggleActionMenu(record, buttonElement) {
    // Close any open menu
    closeActionMenu();
    
    // Don't open another menu if we just closed this one
    if (actionMenuTarget === buttonElement) {
        actionMenuTarget = null;
        return;
    }
    
    // Create and position the menu
    const menu = document.createElement('div');
    menu.className = 'action-menu';
    menu.id = 'actionMenu';
    
    menu.innerHTML = `
        <div class="action-menu-item" onclick="openContableTaskDialog('${record.id}', '${record.caja}', ${!record.is_contabilized})">Contabilizar</div>
        <div class="action-menu-item" onclick="toggleContabilizado('${record.id}', '${record.caja}', ${!record.is_contabilized})">
            ${record.is_contabilized ? 'Desmarcar Cont.' : 'Marcar Cont.'}
        </div>
        <div class="action-menu-item">Editar</div>
        <div class="action-menu-divider"></div>
        <div class="action-menu-item" style="color: var(--danger)">Eliminar</div>
    `;
    
    document.body.appendChild(menu);
    
    // Position the menu near the button
    const buttonRect = buttonElement.getBoundingClientRect();
    menu.style.top = `${buttonRect.bottom + 5}px`;
    menu.style.right = `${window.innerWidth - buttonRect.right}px`;
    
    isActionMenuOpen = true;
    actionMenuTarget = buttonElement;
    
    // Add a click handler to close the menu when clicking outside
    setTimeout(() => {
        document.addEventListener('click', closeActionMenuOnOutsideClick);
    }, 0);
}

/**
 * Close the action menu
 */
function closeActionMenu() {
    const menu = document.getElementById('actionMenu');
    if (menu) {
        menu.remove();
    }
    
    isActionMenuOpen = false;
    document.removeEventListener('click', closeActionMenuOnOutsideClick);
}

/**
 * Close action menu when clicking outside
 */
function closeActionMenuOnOutsideClick(event) {
    const menu = document.getElementById('actionMenu');
    if (menu && !menu.contains(event.target) && event.target !== actionMenuTarget) {
        closeActionMenu();
    }
}

/**
 * Extract entity name from concept text
 */
function extractEntity(concept) {
    // This is a simplified example - customize based on your data pattern
    const parts = concept.split('|');
    if (parts.length > 1) {
        return parts[1].trim();
    }
    
    return '';
}

/**
 * Extract reference number from concept text
 */
function extractReference(concept) {
    // This is a simplified example - customize based on your data pattern
    // Look for patterns like "REF: 123456" or similar
    const refMatch = concept.match(/REF[:\s]+([A-Z0-9]+)/i);
    if (refMatch && refMatch[1]) {
        return refMatch[1];
    }
    
    // Fallback to a generated reference based on date if available
    if (concept.includes('TRF') || concept.includes('TRANSF')) {
        const dateMatch = concept.match(/\d{2}\/\d{2}\/\d{4}/);
        if (dateMatch) {
            return `TRF/${dateMatch[0].replace(/\//g, '')}`;
        }
    }
    
    return '';
}

/**
 * Set up pagination controls
 */
function setupPagination(totalRecords) {
    const totalPages = Math.ceil(totalRecords / pageSize) || 1;
    const paginationControls = document.getElementById('paginationControls');
    paginationControls.innerHTML = '';
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.textContent = '←';
    prevButton.className = 'page-btn';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayCurrentPage();
            setupPagination(totalRecords);
        }
    });
    paginationControls.appendChild(prevButton);
    
    // Page number buttons (show max 5 pages)
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(startPage + 4, totalPages);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.className = 'page-btn';
        if (i === currentPage) {
            pageButton.classList.add('active');
        }
        
        pageButton.addEventListener('click', () => {
            currentPage = i;
            displayCurrentPage();
            setupPagination(totalRecords);
        });
        
        paginationControls.appendChild(pageButton);
    }
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.textContent = '→';
    nextButton.className = 'page-btn';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayCurrentPage();
            setupPagination(totalRecords);
        }
    });
    paginationControls.appendChild(nextButton);
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Setup search input
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', debounce(() => {
        applyFilters();
    }, 300));
    
    // Setup filter field selection
    const filterField = document.getElementById('filterField');
    filterField.addEventListener('change', () => {
        applyFilters();
    });
    
    // Handle file selection
    const selectFileButton = document.getElementById('selectFile');
    selectFileButton.addEventListener('click', selectFile);
    
    // Setup clear filters
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            document.getElementById('filterField').value = 'all';
            applyFilters();
        });
    }
    
    // Close action menu when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (isActionMenuOpen && e.target !== actionMenuTarget) {
            closeActionMenu();
        }
    });
    
    // Add keyboard shortcut for search (Ctrl+F)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            searchInput.focus();
        }
    });
    
    // Register for import events
    window.electronAPI.onRecordsImported((caja) => {
        loadRecordsForCaja(caja);
    });
}

/**
 * Setup table sorting
 */
function setupTableSorting() {
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => {
            const column = th.getAttribute('data-sort');
            sortRecords(column);
        });
    });
}

/**
 * Sort records by column
 */
function sortRecords(column) {
    // Get current sort direction
    const currentDir = th.getAttribute('data-direction') || 'asc';
    const newDir = currentDir === 'asc' ? 'desc' : 'asc';
    
    // Reset all columns
    document.querySelectorAll('th[data-sort]').forEach(header => {
        header.removeAttribute('data-direction');
        header.textContent = header.textContent.replace(' ↑', '').replace(' ↓', '');
    });
    
    // Set the new direction
    th.setAttribute('data-direction', newDir);
    th.textContent += newDir === 'asc' ? ' ↑' : ' ↓';
    
    // Sort the records
    filteredRecords.sort((a, b) => {
        let valA = a[column];
        let valB = b[column];
        
        // Handle different data types
        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }
        
        if (valA < valB) return newDir === 'asc' ? -1 : 1;
        if (valA > valB) return newDir === 'asc' ? 1 : -1;
        return 0;
    });
    
    // Refresh the display
    displayCurrentPage();
}

/**
 * Setup search functionality
 */
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const filterField = document.getElementById('filterField');
    
    // Add keyboard shortcut (Ctrl+F)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            searchInput.focus();
        }
    });
}

/**
 * Select file to import
 */
async function selectFile() {
    try {
        const filePath = await window.electronAPI.selectFile();
        if (filePath) {
            showLoading(true);
            const records = await window.electronAPI.processFile(filePath);
            showLoading(false);
            
            if (records && records.length > 0) {
                await window.electronAPI.showPreviewDialog(records);
            } else {
                showToast('No records found in file', true);
            }
        }
    } catch (error) {
        console.error('Error processing file:', error);
        showLoading(false);
        showToast('Error processing file', true);
    }
}

/**
 * Format currency value
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('es-ES', { 
        style: 'currency', 
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

/**
 * Format date
 */
function formatDate(date) {
    if (!date) return '';
    
    // Handle different date formats
    try {
        if (typeof date === 'string') {
            // Try to parse the date
            const parsedDate = parseDate(date);
            if (parsedDate) {
                return parsedDate.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
            }
        }
        
        // Return original if parsing fails
        return date;
    } catch (e) {
        console.error('Error formatting date:', e);
        return date;
    }
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr) {
    if (!dateStr) return null;
    
    // Try different date formats
    const formats = [
        // DD/MM/YYYY
        str => {
            const parts = str.split('/');
            if (parts.length === 3) {
                return new Date(parts[2], parts[1] - 1, parts[0]);
            }
            return null;
        },
        // YYYY-MM-DD
        str => {
            const parts = str.split('-');
            if (parts.length === 3) {
                return new Date(parts[0], parts[1] - 1, parts[2]);
            }
            return null;
        },
        // MM/DD/YYYY (US format)
        str => {
            const parts = str.split('/');
            if (parts.length === 3) {
                return new Date(parts[2], parts[0] - 1, parts[1]);
            }
            return null;
        }
    ];
    
    // Try each format
    for (const format of formats) {
        const date = format(dateStr);
        if (date && !isNaN(date.getTime())) {
            return date;
        }
    }
    
    return null;
}

/**
 * Toggle contabilizado status
 */
async function toggleContabilizado(id, caja, newState) {
    const confirmMessage = newState 
        ? 'Are you sure you want to mark this record as contabilized?' 
        : 'Are you sure you want to unmark this record as contabilized?';
    
    if (confirm(confirmMessage)) {
        try {
            showLoading(true);
            const result = await window.electronAPI.toggleContabilizado({
                operationId: id, 
                operationCaja: caja, 
                newState: newState 
            });
            
            showLoading(false);
            
            // Refresh the data
            currentRecords = result.data;
            applyFilters();
            
            showToast(`Record ${newState ? 'marked' : 'unmarked'} as contabilized`);
        } catch (error) {
            console.error("Error toggling contabilizado:", error);
            showLoading(false);
            showToast("Error updating record status", true);
        }
    }
}

/**
 * Open contabilizar dialog
 */
async function openContableTaskDialog(id, caja, newState) {
    try {
        showLoading(true);
        await window.electronAPI.openContableTaskDialog({
            operationId: id, 
            operationCaja: caja, 
            newState: newState
        });
        
        showLoading(false);
        
        // Refresh data after dialog closes
        loadRecordsForCaja(caja);
    } catch (error) {
        console.error("Error opening contable task dialog:", error);
        showLoading(false);
        showToast("Error opening contabilizar dialog", true);
    }
}

/**
 * Show/hide loading indicator
 */
function showLoading(isLoading) {
    // Update status bar loading indicator
    const statusBar = document.querySelector('.status-bar');
    
    if (isLoading) {
        statusBar.innerHTML += '<div class="status-item loading-indicator">⌛ Loading...</div>';
        document.body.classList.add('loading');
    } else {
        const loadingIndicator = document.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
        document.body.classList.remove('loading');
    }
}

/**
 * Update status bar information
 */
function updateStatusBar(total, filtered, cajaName, timestamp = null) {
    document.getElementById('statusTotal').textContent = total;
    document.getElementById('statusFiltered').textContent = filtered;
    document.getElementById('statusCaja').textContent = cajaName || 'None';
    document.getElementById('statusTime').textContent = timestamp || new Date().toLocaleTimeString('es-ES');
}

/**
 * Show toast message
 */
function showToast(message, isError = false) {
    const toast = document.getElementById('errorToast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.style.backgroundColor = isError ? 'var(--danger)' : 'var(--primary)';
    toast.style.display = 'block';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

/**
 * Debounce function (for search input)
 */
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

/* Add a small JavaScript snippet to handle the clear button */
/* Add this to your renderer.js file */
document.addEventListener('DOMContentLoaded', () => {
    const srchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    
    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            searchInput.value = '';
            searchInput.focus();
            // Trigger search event to refresh results
            searchInput.dispatchEvent(new Event('input'));
        });
    }
});

// Add event handlers to window object for HTML access
window.toggleContabilizado = toggleContabilizado;
window.openContableTaskDialog = openContableTaskDialog;
window.toggleExpandRow = toggleExpandRow;