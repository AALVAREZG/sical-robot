// Tab navigation functionality for filtering movements
// Add this to your existing renderer.js or create a separate file

let currentTabFilter = 'all'; // Current active tab filter

/**
 * Initialize tab navigation functionality
 */
function initializeTabNavigation() {
    const tabItems = document.querySelectorAll('.tab-item');
    
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
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Add active class to clicked tab
    clickedTab.classList.add('active');
    
    // Get filter type from data attribute
    currentTabFilter = clickedTab.dataset.filter || 'all';
    console.log(`Tab clicked: ${clickedTab.textContent.trim()}, Filter: ${currentTabFilter}`);
    
    // Apply the new filter
    applyTabFilter();
}

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
    
    // Update filtered records (this should integrate with existing search filters)
    filteredRecords = applySearchFilter(tabFilteredRecords);
    
    // Update pagination and display
    setupPagination(filteredRecords.length);
    displayCurrentPage();
    updateStatusBar(currentRecords.length, filteredRecords.length);
    updateTabCounters();
}

/**
 * Apply search filter to tab-filtered records
 */
function applySearchFilter(records) {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const filterField = document.getElementById('filterField')?.value || 'all';
    
    if (!searchTerm) return records;
    
    return records.filter(record => {
        if (filterField === 'all') {
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
            const value = record[filterField];
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
    console.log('First record:', currentRecords[0]);
    console.log('Total records:', currentRecords.length);
    // Count records based on their 'is_contabilized' status
    
    const contabilizedCount = currentRecords.filter(record => 
        record.is_contabilized === 1 || record.is_contabilized === true
    ).length;
    
    const notContabilizedCount = currentRecords.filter(record => 
        record.is_contabilized === 0 || record.is_contabilized === false || !record.is_contabilized
    ).length;
    
    const totalCount = currentRecords.length;
    
    // Update tab text with counters based on data attributes
    const tabs = document.querySelectorAll('.tab-item');
    tabs.forEach(tab => {
        const filter = tab.dataset.filter;
        const baseText = tab.dataset.baseText || tab.textContent.replace(/\s*\(\d+\)/, '').trim();
        
        // Store base text for future updates
        if (!tab.dataset.baseText) {
            tab.dataset.baseText = baseText;
        }
        
        let count = 0;
        switch(filter) {
            case 'all':
                count = totalCount;
                break;
            case 'contabilized':
                count = contabilizedCount;
                break;
            case 'not_contabilized':
                count = notContabilizedCount;
                break;
        }
        
        tab.innerHTML = `${baseText} <span class="tab-counter">(${count})</span>`;
    });
}



/**
 * Reset tab filter to "All"
 */
function resetTabFilter() {
    currentTabFilter = 'all';
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.classList.remove('active');
        if (tab.textContent.trim().includes('All')) {
            tab.classList.add('active');
        }
    });
    applyTabFilter();
}

// Initialize tab navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeTabNavigation();
});

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeTabNavigation,
        handleTabClick,
        applyTabFilter,
        resetTabFilter,
        updateTabCounters
    };
}