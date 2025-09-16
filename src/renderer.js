/**
 * Main renderer script for the Electron application
 * Handles UI logic, data display, and user interactions
 */

// Global variables
let currentRecords = [];
let filteredRecords = [];
let currentPage = 1;
let pageSize = 25;
let currentCaja = '';
let expandedRowId = null;
let isActionMenuOpen = false;
let actionMenuTarget = null;
let currentTabFilter = 'all';

// Accounting import variables
let accountingFilePath = null;
let listFilePath = null;

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded");
    loadCajas();
    setupEventListeners();
    initializeUI();
    initializeTabNavigation();

    // Reload patterns when the page loads
    window.electronAPI.reloadPatterns().then(() => {
        console.log("Patterns reloaded for transaction matching");
    }).catch(error => {
        console.error("Error reloading patterns:", error);
    });

    // Replace existing treasury initialization with:
    if (typeof initializeTreasuryModule === 'function') {
        initializeTreasuryModule();
    }
    
    // Setup clear search button
    setupClearSearchButton();
});



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
        
        if (!cajasDiv) {
            console.error("Element 'cajas' not found");
            return;
        }
        
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
        
        // Update UI to show currently selected caja (with safety checks)
        const currentCajaTitleEl = document.getElementById('currentCajaTitle');
        if (currentCajaTitleEl) {
            currentCajaTitleEl.textContent = caja;
        }
        
        const statusCajaEl = document.getElementById('statusCaja');
        if (statusCajaEl) {
            statusCajaEl.textContent = caja;
        }
        
        const result = await window.electronAPI.getLast100Records(caja);
        currentRecords = result.data;
        currentPage = 1;
        
        applyFilters();
        showLoading(false);
        
        // Update the status bar
        updateStatusBar(currentRecords.length, filteredRecords.length, caja);
        updateTabCounters();
    } catch (error) {
        console.error("Error loading records:", error);
        showLoading(false);
        showToast("Error loading records", true);
    }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Setup main tab navigation
    const mainTabItems = document.querySelectorAll('.tab-navigation .tab-item');
    mainTabItems.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabId = e.target.getAttribute('data-tab');
            switchToTab(tabId);
        });
    });
    
    // Setup search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            applyFilters();
        }, 300));
    }
    
    // Setup filter field selection
    const filterField = document.getElementById('filterField');
    if (filterField) {
        filterField.addEventListener('change', () => {
            applyFilters();
        });
    }
    
    // Handle file selection
    const selectFileButton = document.getElementById('selectFile');
    if (selectFileButton) {
        selectFileButton.addEventListener('click', selectFile);
    }
    
    // Setup clear filters
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            const searchInput = document.getElementById('searchInput');
            const filterField = document.getElementById('filterField');
            if (searchInput) searchInput.value = '';
            if (filterField) filterField.value = 'all';
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
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.focus();
            }
        }
    });
    
    // Register for import events
    if (window.electronAPI && window.electronAPI.onRecordsImported) {
        window.electronAPI.onRecordsImported((caja) => {
            loadRecordsForCaja(caja);
        });
    }

    // Pattern manager button
    const patternManagerBtn = document.getElementById('patternManagerBtn');
    if (patternManagerBtn) {
        patternManagerBtn.addEventListener('click', openPatternManager);
    }

    // Accounting import handling
    const selectAccountingFileBtn = document.getElementById('selectAccountingFile');
    if (selectAccountingFileBtn) {
        selectAccountingFileBtn.addEventListener('click', toggleAccountingImportPanel);
    }
    
    const bankAccountSelect = document.getElementById('bankAccountSelect');
    if (bankAccountSelect) {
        bankAccountSelect.addEventListener('change', handleAccountSelection);
    }
    
    const selectAccountingFileBtnInner = document.getElementById('selectAccountingFileBtn');
    if (selectAccountingFileBtnInner) {
        selectAccountingFileBtnInner.addEventListener('click', selectAccountingFile);
    }
    
    const selectListFileBtn = document.getElementById('selectListFileBtn');
    if (selectListFileBtn) {
        selectListFileBtn.addEventListener('click', selectListFile);
    }
    
    const processAccountingFileBtn = document.getElementById('processAccountingFileBtn');
    if (processAccountingFileBtn) {
        processAccountingFileBtn.addEventListener('click', processAccountingFile);
    }
    
    const cancelAccountingImportBtn = document.getElementById('cancelAccountingImportBtn');
    if (cancelAccountingImportBtn) {
        cancelAccountingImportBtn.addEventListener('click', toggleAccountingImportPanel);
    }

    // Import accounting button
    const importAccountingBtn = document.getElementById('importAccountingBtn');
    if (importAccountingBtn) {
        importAccountingBtn.addEventListener('click', () => {
            window.electronAPI.openAccountingImport();
        });
    }
}

/**
 * Switch between main application tabs
 */
function switchToTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.tab-navigation .tab-item').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-tab') === tabId) {
            tab.classList.add('active');
        }
    });

    // Update tab content visibility
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });

    const activeContent = document.getElementById(tabId + '-content');
    if (activeContent) {
        activeContent.classList.add('active');
        activeContent.style.display = 'block';
    }

    // Handle specific tab initialization
    if (tabId === 'treasury') {
        // Initialize treasury forecast if needed
        if (typeof initializeTreasuryForecast === 'function') {
            initializeTreasuryForecast();
        }
    }
}

/**
 * Initialize tab navigation functionality
 */
function initializeTabNavigation() {
    const tabItems = document.querySelectorAll('.movement-tabs .tab-item');
    
    tabItems.forEach(tab => {
        tab.addEventListener('click', (e) => {
            handleTabClick(e.target);
        });
    });
}

/**
 * Handle tab click events
 */
function handleTabClick(clickedTab) {
    // Remove active class from all tabs
    document.querySelectorAll('.movement-tabs .tab-item').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Add active class to clicked tab
    clickedTab.classList.add('active');
    
    // Get filter type from data attribute
    currentTabFilter = clickedTab.dataset.filter || 'all';
    console.log(`Tab clicked: ${clickedTab.textContent.trim()}, Filter: ${currentTabFilter}`);
    
    // Apply the new filter
    applyFilters();
}

/**
 * Set up pagination controls
 */
function setupPagination(totalRecords) {
    const totalPages = Math.ceil(totalRecords / pageSize) || 1;
    const paginationControls = document.getElementById('paginationControls');
    
    if (!paginationControls) return;
    
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
 * Setup table sorting
 */
function setupTableSorting() {
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => {
            const column = th.getAttribute('data-sort');
            sortRecords(column, th);
        });
    });
}

/**
 * Sort records by column
 */
function sortRecords(column, thElement) {
    // Get current sort direction
    const currentDir = thElement.getAttribute('data-direction') || 'asc';
    const newDir = currentDir === 'asc' ? 'desc' : 'asc';
    
    // Reset all columns
    document.querySelectorAll('th[data-sort]').forEach(header => {
        header.removeAttribute('data-direction');
        header.textContent = header.textContent.replace(' ↑', '').replace(' ↓', '');
    });
    
    // Set the new direction
    thElement.setAttribute('data-direction', newDir);
    thElement.textContent += newDir === 'asc' ? ' ↑' : ' ↓';
    
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
            if (searchInput) {
                searchInput.focus();
            }
        }
    });
}

/**
 * Setup clear search button functionality
 */
function setupClearSearchButton() {
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    
    if (clearSearch && searchInput) {
        clearSearch.addEventListener('click', () => {
            searchInput.value = '';
            searchInput.focus();
            // Trigger search event to refresh results
            searchInput.dispatchEvent(new Event('input'));
        });
    }
}

/**
 * Apply filters (combines tab and search filtering)
 */
function applyFilters() {
    // First apply tab filter
    applyTabFilter();
}

/**
 * Apply tab filter
 */
function applyTabFilter() {
    let tabFilteredRecords;
    
    switch(currentTabFilter) {
        case 'contabilized':
            tabFilteredRecords = currentRecords.filter(record => 
                record.is_contabilized === 1 || record.is_contabilized === true
            );
            break;
        case 'not_contabilized':
            tabFilteredRecords = currentRecords.filter(record => 
                record.is_contabilized === 0 || record.is_contabilized === false || !record.is_contabilized
            );
            break;
        case 'all':
        default:
            tabFilteredRecords = currentRecords;
            break;
    }
    
    // Apply search filter to tab-filtered records
    filteredRecords = applySearchFilter(tabFilteredRecords);
    
    // Update pagination and display
    setupPagination(filteredRecords.length);
    displayCurrentPage();
    updateStatusBar(currentRecords.length, filteredRecords.length, currentCaja);
    updateTabCounters();
}

/**
 * Apply search filter to records
 */
function applySearchFilter(records) {
    const searchInput = document.getElementById('searchInput');
    const filterField = document.getElementById('filterField');
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const filterFieldValue = filterField ? filterField.value : 'all';
    
    if (!searchTerm) return records;
    
    return records.filter(record => {
        if (filterFieldValue === 'all') {
            return Object.entries(record).some(([key, value]) => {
                if (typeof value === 'string' && !key.includes('id')) {
                    return value.toLowerCase().includes(searchTerm);
                }
                if (typeof value === 'number') {
                    return value.toString().includes(searchTerm);
                }
                return false;
            });
        } else {
            const value = record[filterFieldValue];
            if (typeof value === 'string') {
                return value.toLowerCase().includes(searchTerm);
            } else if (typeof value === 'number') {
                return value.toString().includes(searchTerm);
            }
            return false;
        }
    });
}

/**
 * Update tab counters with current record counts
 */
function updateTabCounters() {
    if (!currentRecords) return;
    
    const contabilizedCount = currentRecords.filter(record => 
        record.is_contabilized === 1 || record.is_contabilized === true
    ).length;
    
    const notContabilizedCount = currentRecords.filter(record => 
        record.is_contabilized === 0 || record.is_contabilized === false || !record.is_contabilized
    ).length;
    
    const totalCount = currentRecords.length;
    
    // Update tab counters in the UI
    const allTab = document.querySelector('.tab-item[data-filter="all"] .tab-counter');
    const contabilizedTab = document.querySelector('.tab-item[data-filter="contabilized"] .tab-counter');
    const notContabilizedTab = document.querySelector('.tab-item[data-filter="not_contabilized"] .tab-counter');
    
    if (allTab) allTab.textContent = totalCount;
    if (contabilizedTab) contabilizedTab.textContent = contabilizedCount;
    if (notContabilizedTab) notContabilizedTab.textContent = notContabilizedCount;
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
    const pageStartEl = document.getElementById('pageStart');
    const pageEndEl = document.getElementById('pageEnd');
    const totalRecordsEl = document.getElementById('totalRecords');
    
    if (pageStartEl) pageStartEl.textContent = start + 1;
    if (pageEndEl) pageEndEl.textContent = end;
    if (totalRecordsEl) totalRecordsEl.textContent = filteredRecords.length;
}

/**
 * Display records in the table
 */
function displayRecords(records) {
    const tbody = document.querySelector('#records tbody');
    if (!tbody) return;
    
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
        <div class="action-menu-item">
        ${record.is_contabilized 
            ? `<span class="status-badge status-badge-success">Contabilizado</span>`
            : `<span class="status-badge status-badge-danger">No Cont.</span>`
        }
        </div>
        ${!record.is_contabilized 
            ? `<button class="btn-secondary" onclick="openContableTaskDialog('${record.id}', '${record.caja}', true)">
                Contabilizar
            </button>`
            : ''
        }
        <button class="btn-secondary" onclick="toggleContabilizado('${record.id}', '${record.caja}', ${!record.is_contabilized})">
            ${record.is_contabilized ? 'Desmarcar Cont.' : 'Marcar Cont.'}
        </button>
    `;
    
    // Details information
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'expanded-details';
    
    const leftCol = document.createElement('div');
    leftCol.className = 'details-column';
    leftCol.innerHTML = `
        <div class="detail-item">
            <span class="detail-label">ID:</span>
            <span class="detail-value">${record.id}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Entidad:</span>
            <span class="detail-value">${extractEntity(record.concepto)}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Referencia:</span>
            <span class="detail-value">${extractReference(record.concepto)}</span>
        </div>
    `;
    
    const rightCol = document.createElement('div');
    rightCol.className = 'details-column';
    rightCol.innerHTML = `
        <div class="detail-item">
            <span class="detail-label">Caja:</span>
            <span class="detail-value">${record.caja}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Fecha Valor:</span>
            <span class="detail-value">${record.fecha_valor || 'N/A'}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Estado:</span>
            <div class="detail-value">
                <span class="status-badge ${record.is_contabilized ? 
                    'status-badge-success' : 'status-badge-danger'}">
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
    <div class="action-menu-item">
        ${record.is_contabilized 
            ? `<span class="status-badge status-badge-success">Contabilizado</span>`
            : `<span class="status-badge status-badge-danger">No Cont.</span>`
        }
    </div>
    ${!record.is_contabilized 
        ? `<div class="action-menu-item" onclick="openContableTaskDialog('${record.id}', '${record.caja}', true)">
             Contabilizar
           </div>`
        : ''
    }
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
    actionMenuTarget = null;
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
    if (!statusBar) return;
    
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
    const totalEl = document.getElementById('statusTotal');
    const filteredEl = document.getElementById('statusFiltered');
    const cajaEl = document.getElementById('statusCaja');
    const timeEl = document.getElementById('statusTime');
    
    if (totalEl) totalEl.textContent = total;
    if (filteredEl) filteredEl.textContent = filtered;
    if (cajaEl) cajaEl.textContent = cajaName || 'None';
    if (timeEl) timeEl.textContent = timestamp || new Date().toLocaleTimeString('es-ES');
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

/**
 * Open pattern manager
 */
function openPatternManager() {
    window.location.href = 'patternManager.html';
}

// =====================================================
// ACCOUNTING IMPORT FUNCTIONS
// =====================================================

/**
 * Toggle accounting import panel
 */
function toggleAccountingImportPanel() {
    const panel = document.getElementById('accountingImportPanel');
    if (panel) {
        if (panel.style.display === 'none' || panel.style.display === '') {
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
            // Reset state
            accountingFilePath = null;
            listFilePath = null;
            const accountingFilePathEl = document.getElementById('accountingFilePath');
            const selectedListFileEl = document.getElementById('selectedListFile');
            const processAccountingFileBtnEl = document.getElementById('processAccountingFileBtn');
            
            if (accountingFilePathEl) accountingFilePathEl.textContent = 'No file selected';
            if (selectedListFileEl) selectedListFileEl.textContent = 'No file selected';
            if (processAccountingFileBtnEl) processAccountingFileBtnEl.disabled = true;
        }
    }
}

/**
 * Handle account selection for import
 */
function handleAccountSelection() {
    const bankAccountSelect = document.getElementById('bankAccountSelect');
    const account207Options = document.getElementById('account207Options');
    
    if (bankAccountSelect && bankAccountSelect.value === '207') {
        if (account207Options) account207Options.style.display = 'block';
    } else {
        if (account207Options) account207Options.style.display = 'none';
    }
}

/**
 * Select accounting file
 */
async function selectAccountingFile() {
    try {
        const filePath = await window.electronAPI.selectFile();
        if (filePath) {
            accountingFilePath = filePath;
            const accountingFilePathEl = document.getElementById('accountingFilePath');
            if (accountingFilePathEl) {
                accountingFilePathEl.textContent = filePath.split('/').pop() || filePath.split('\\').pop();
            }
            updateProcessButtonState();
        }
    } catch (error) {
        console.error('Error selecting accounting file:', error);
        showToast('Error selecting file', true);
    }
}

/**
 * Select list file
 */
async function selectListFile() {
    try {
        const filePath = await window.electronAPI.selectFile();
        if (filePath) {
            listFilePath = filePath;
            const selectedListFileEl = document.getElementById('selectedListFile');
            if (selectedListFileEl) {
                selectedListFileEl.textContent = filePath.split('/').pop() || filePath.split('\\').pop();
            }
            updateProcessButtonState();
        }
    } catch (error) {
        console.error('Error selecting list file:', error);
        showToast('Error selecting file', true);
    }
}

/**
 * Update process button state
 */
function updateProcessButtonState() {
    const processBtn = document.getElementById('processAccountingFileBtn');
    if (processBtn) {
        processBtn.disabled = !accountingFilePath || !listFilePath;
    }
}

/**
 * Process accounting file
 */
async function processAccountingFile() {
    if (!accountingFilePath || !listFilePath) {
        showToast('Please select both files', true);
        return;
    }
    
    try {
        showLoading(true);
        
        const bankAccountSelect = document.getElementById('bankAccountSelect');
        const accountNumber = bankAccountSelect ? bankAccountSelect.value : '';
        
        const result = await window.electronAPI.processAccountingFile({
            accountingFilePath,
            listFilePath,
            accountNumber
        });
        
        showLoading(false);
        
        if (result.success) {
            showToast('Accounting file processed successfully');
            toggleAccountingImportPanel();
            // Refresh current data if needed
            if (currentCaja) {
                loadRecordsForCaja(currentCaja);
            }
        } else {
            showToast('Error processing accounting file', true);
        }
    } catch (error) {
        console.error('Error processing accounting file:', error);
        showLoading(false);
        showToast('Error processing accounting file', true);
    }
}