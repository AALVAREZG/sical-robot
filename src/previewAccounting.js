document.addEventListener('DOMContentLoaded', () => {
    const previewTable = document.querySelector('#previewTable tbody');
    const importButton = document.getElementById('importRecords');
    const cancelButton = document.getElementById('cancelImport');
    const summaryInfo = document.getElementById('summaryInfo');

    let accountingRecords = [];

    window.electronAPI.onAccountingPreviewData((data) => {
        console.log('Received accounting preview data:', data.length);
        accountingRecords = data;
        
        // Update summary information
        updateSummary(accountingRecords);
        
        // Display the records in the table
        displayRecords(accountingRecords);
    });

    function updateSummary(records) {
        if (!summaryInfo) return;
        
        // Calculate totals
        const totalCount = records.length;
        const debitTotal = records
            .filter(r => r.debitCredit === '-')
            .reduce((sum, r) => sum + r.amount, 0);
        const creditTotal = records
            .filter(r => r.debitCredit === '+')
            .reduce((sum, r) => sum + r.amount, 0);
        const netTotal = creditTotal - debitTotal;
        
        // Format amounts
        const formatCurrency = (value) => {
            return new Intl.NumberFormat('es-ES', { 
                style: 'currency', 
                currency: 'EUR'
            }).format(value);
        };
        
        // Update the summary element
        summaryInfo.className = 'status-container ' + (netTotal >= 0 ? 'status-ok' : 'status-error');
        summaryInfo.innerHTML = `
            <span class="status-icon">${netTotal >= 0 ? '✓' : '⚠️'}</span>
            <span>
                <strong>${totalCount} accounting records found</strong> |
                Credits: ${formatCurrency(creditTotal)} |
                Debits: ${formatCurrency(debitTotal)} |
                Net: <span class="${netTotal >= 0 ? 'positive-amount' : 'negative-amount'}">${formatCurrency(netTotal)}</span>
            </span>
        `;
    }

    function displayRecords(records) {
        previewTable.innerHTML = '';
        records.forEach((record, index) => {
            const tr = document.createElement('tr');
            tr.classList.add(record.debitCredit === '+' ? 'positive-amount' : 'negative-amount');
            
            const formattedAmount = new Intl.NumberFormat('es-ES', { 
                style: 'currency', 
                currency: 'EUR'
            }).format(record.amount);
            tr.innerHTML = `
                <td>${record.accountCode}</td>
                <td>${record.transactionDate}</td>
                <td><small>${record.valueDate}</small></td>
                <td>${record.description}</td>
                <td><b>${record.accountTaskId}</b></td>
                <td class="currency-column">${formattedAmount}</td>
                <td>${record.entityId}</td>
                <td>${record.entityName}</td>
                <td>${record.transactionType}</td>
                <td>${record.debitCredit}</td>
                <td class="text-center">
                    <input type="checkbox" checked>
                </td>
            `;
                        
            previewTable.appendChild(tr);
        });

        updateImportButton();
    }

    function updateImportButton() {
        const selectedCount = document.querySelectorAll('#previewTable tbody input[type="checkbox"]:checked').length;
        importButton.textContent = `Import Selected (${selectedCount})`;
        importButton.disabled = selectedCount === 0;
    }

    // Add event listeners for checkboxes (to update import button)
    previewTable.addEventListener('change', (event) => {
        if (event.target.type === 'checkbox') {
            updateImportButton();
        }
    });

    // Update the import button click handler in previewAccounting.js
    importButton.addEventListener('click', async () => {
        const selectedRows = Array.from(previewTable.querySelectorAll('tr'))
            .filter(row => {
                const checkbox = row.querySelector('input[type="checkbox"]');
                return checkbox && checkbox.checked;
            })
            .map(row => {
                const index = row.rowIndex - 1;
                return accountingRecords[index];
            });

        if (selectedRows.length > 0) {
            try {
                // Call the now-implemented import function
                const result = await window.electronAPI.importAccountingRecords(selectedRows);
                
                if (result.success) {
                    alert(`Successfully imported ${result.count} accounting records`);
                    window.close();
                } else {
                    alert('Error importing records: ' + result.error);
                }
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