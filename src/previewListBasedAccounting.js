// src/previewListBasedAccounting.js
document.addEventListener('DOMContentLoaded', () => {
    const listContainers = document.getElementById('listContainers');
    const allRecordsTable = document.querySelector('#allRecordsTable tbody');
    const unmatchedTable = document.querySelector('#unmatchedTable tbody');
    const importButton = document.getElementById('importRecords');
    const cancelButton = document.getElementById('cancelImport');
    const summaryInfo = document.getElementById('summaryInfo');
    const tabButtons = document.querySelectorAll('.tab-button');
    
    let accountingData = null;
    
    // Handle tab navigation
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Deactivate all tabs
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Activate the clicked tab
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    window.electronAPI.onListBasedAccountingPreviewData((data) => {
        console.log('Received list-based accounting preview data:', data);
        accountingData = data;
        
        // Update summary information
        updateSummary(accountingData);
        
        // Display lists in the first tab
        displayLists(accountingData);
        
        // Display all records in the second tab
        displayAllRecords(accountingData.records);
        
        // Display unmatched records in the third tab
        displayUnmatchedRecords(accountingData);
    });

    function updateSummary(data) {
        if (!summaryInfo) return;
        
        // Calculate totals
        const totalRecords = data.records.length;
        const totalLists = data.listInfo.totalLists;
        const matchedRecords = totalRecords - data.listInfo.unmatchedRecords;
        
        const totalAmount = data.records.reduce((sum, r) => sum + r.amount, 0);
        
        // Format amount
        const formatCurrency = (value) => {
            return new Intl.NumberFormat('es-ES', { 
                style: 'currency', 
                currency: 'EUR'
            }).format(value);
        };
        
        // Update the summary element
        summaryInfo.className = 'status-container status-ok';
        summaryInfo.innerHTML = `
            <span class="status-icon">✓</span>
            <span>
                <strong>${totalRecords} accounting records processed</strong> |
                Lists: ${totalLists} |
                Matched: ${matchedRecords} |
                Unmatched: ${data.listInfo.unmatchedRecords} |
                Total Amount: ${formatCurrency(totalAmount)}
            </span>
        `;
    }

    function displayLists(data) {
        if (!listContainers) return;
        
        listContainers.innerHTML = '';
        
        // For each list, create a list section
        for (const listNumber in data.listInfo.lists) {
            const list = data.listInfo.lists[listNumber];
            const matchedRecords = data.listInfo.matchedRecords[listNumber]?.accountingRecords || [];
            
            const listSection = document.createElement('div');
            listSection.className = 'list-section';
            
            // Create list header
            const listHeader = document.createElement('div');
            listHeader.className = 'list-header';
            
            listHeader.innerHTML = `
                <div class="list-title">
                    <span class="list-number-badge">List ${listNumber}</span>
                    ${list.date ? `<span>Date: ${list.date}</span>` : ''}
                </div>
                <div class="list-stats">
                    Operations: ${list.operations.length} | 
                    Matched Records: ${matchedRecords.length} |
                    Total Amount: ${formatCurrency(list.totalAmount)}
                </div>
            `;
            
            listSection.appendChild(listHeader);
            
            // Create table for matched records
            const recordsTable = document.createElement('table');
            recordsTable.className = 'records-list';
            
            // Table header
            recordsTable.innerHTML = `
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Descripción</th>
                        <th>Referencia</th>
                        <th>Importe</th>
                        <th>Tercero</th>
                        <th>D/C</th>
                        <th>Importar</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            
            const tbody = recordsTable.querySelector('tbody');
            
            // Add matched records to the table
            matchedRecords.forEach(record => {
                const tr = document.createElement('tr');
                tr.classList.add(record.debitCredit === '+' ? 'positive-amount' : 'negative-amount');
                
                tr.innerHTML = `
                    <td>${record.transactionDate}</td>
                    <td>${record.description}</td>
                    <td>${record.reference}</td>
                    <td class="currency-column">${formatCurrency(record.amount)}</td>
                    <td>${record.entityName}</td>
                    <td>${record.debitCredit}</td>
                    <td class="text-center">
                        <input type="checkbox" checked data-id="${record.id}" data-list="${listNumber}">
                    </td>
                `;
                
                tbody.appendChild(tr);
            });
            
            listSection.appendChild(recordsTable);
            listContainers.appendChild(listSection);
        }
        
        updateImportButton();
    }

    function displayAllRecords(records) {
        if (!allRecordsTable) return;
        
        allRecordsTable.innerHTML = '';
        
        records.forEach(record => {
            const tr = document.createElement('tr');
            tr.classList.add(record.debitCredit === '+' ? 'positive-amount' : 'negative-amount');
            
            tr.innerHTML = `
                <td>${record.listNumber ? `<span class="list-number-badge">${record.listNumber}</span>` : '-'}</td>
                <td>${record.transactionDate}</td>
                <td><small>${record.valueDate}</small></td>
                <td>${record.description}</td>
                <td>${record.reference}</td>
                <td class="currency-column">${formatCurrency(record.amount)}</td>
                <td>${record.entityId}</td>
                <td>${record.entityName}</td>
                <td>${record.debitCredit}</td>
                <td class="text-center">
                    <input type="checkbox" checked data-id="${record.id}" data-list="${record.listNumber || ''}">
                </td>
            `;
            
            allRecordsTable.appendChild(tr);
        });
    }

    function displayUnmatchedRecords(data) {
        if (!unmatchedTable) return;
        
        unmatchedTable.innerHTML = '';
        
        // Get all records that don't have a listNumber
        const unmatched = data.records.filter(record => !record.listNumber);
        
        unmatched.forEach(record => {
            const tr = document.createElement('tr');
            tr.classList.add(record.debitCredit === '+' ? 'positive-amount' : 'negative-amount');
            
            tr.innerHTML = `
                <td>${record.transactionDate}</td>
                <td><small>${record.valueDate}</small></td>
                <td>${record.description}</td>
                <td>${record.reference}</td>
                <td class="currency-column">${formatCurrency(record.amount)}</td>
                <td>${record.entityId}</td>
                <td>${record.entityName}</td>
                <td>${record.debitCredit}</td>
                <td class="text-center">
                    <input type="checkbox" checked data-id="${record.id}">
                </td>
            `;
            
            unmatchedTable.appendChild(tr);
        });
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat('es-ES', { 
            style: 'currency', 
            currency: 'EUR'
        }).format(value);
    }

    function updateImportButton() {
        const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
        const checkedCount = document.querySelectorAll('input[type="checkbox"]:checked').length;
        
        importButton.textContent = `Import Selected (${checkedCount})`;
        importButton.disabled = checkedCount === 0;
    }

    // Add event listeners for checkboxes (delegate to container elements)
    document.addEventListener('change', (event) => {
        if (event.target.type === 'checkbox') {
            updateImportButton();
        }
    });

    importButton.addEventListener('click', async () => {
        // Collect all selected records
        const selectedIds = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.dataset.id);
        
        if (selectedIds.length > 0 && accountingData) {
            // Filter records to only include selected ones
            const selectedRecords = accountingData.records.filter(record => 
                selectedIds.includes(record.id));
            
            try {
                await window.electronAPI.importAccountingRecords(selectedRecords);
                window.close();
            } catch (error) {
                console.error('Error:', error);
                alert('Error: ' + error.message);
            }
        }
    });

    cancelButton.addEventListener('click', () => {
        window.close();
    });
});