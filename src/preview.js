document.addEventListener('DOMContentLoaded', () => {
    const previewTable = document.querySelector('#previewTable tbody');
    const importButton = document.getElementById('importRecords');
    const cancelButton = document.getElementById('cancelImport');
    const balanceStatusElement = document.getElementById('balanceStatus');

    let processedRecords = []; /// Array of records to be displayed in the preview table. Contains both grouped and non-grouped records.
    let sortedRecords = []; /// Array of records to be displayed in the preview table. Contains both grouped and non-grouped records.
    let balanceValidationResult = { isValid: true, issues: [] };

    window.electronAPI.onPreviewData(async (data) => {
        //console.log('Preview data:', data);
        processedRecords = await processGroupedRecords(data);
        //console.log('Processed records:', [...processedRecords]);
        // Validate balance consistency
        // First, ewe need to sort the records, because if exist a grouped record it will be in the last position 
        // and the balance validation will fail.
        // Sort records by date (descending) and by idx (ascending) to maintain stable order
        sortedRecords = [...processedRecords].sort((a, b) => {
            // First compare by date (descending)
            const dateComparison = b.normalized_date.localeCompare(a.normalized_date);
            if (dateComparison !== 0) return dateComparison;
            
            // If dates are the same, use idx to maintain stable order
            return a.idx - b.idx; // Assuming smaller idx values should come first
          });
        balanceValidationResult = await window.electronAPI.validateBalances(sortedRecords);
        
        // Update UI to show balance consistency status
        updateBalanceStatus(balanceValidationResult);


        // Sort all records by date
        //processedRecords.sort((a, b) => b.normalized_date.localeCompare(a.normalized_date));
        displayRecords(sortedRecords);
    });

    function updateBalanceStatus(result) {
        if (!balanceStatusElement) return;
        
        // First check if the records are in descending date order
        if (!result.isDescendingOrder) {
            balanceStatusElement.className = 'status-error';
            balanceStatusElement.innerHTML = `
                <span class="status-icon">⚠️</span>
                <span>
                    <strong>Incorrect date order!</strong>
                    <p>Transactions must be in descending date order (newest to oldest).</p>
                    <p>Please download a properly ordered file from your bank portal or use sorting software to arrange the records before importing.</p>
                </span>
            `;
            importButton.disabled = true;
            return;
        }
        
        // Then check balance consistency
        if (result.isValid) {
            balanceStatusElement.className = 'status-ok';
            balanceStatusElement.innerHTML = `
                <span class="status-icon">✓</span>
                <span>Balance consistency check passed. Records are in the correct descending date order.</span>
            `;
            importButton.disabled = false;
        } else {
            balanceStatusElement.className = 'status-error';
            
            // Create detailed message about issues
            const issuesList = result.issues.map(issue => 
                `<li>Record on ${issue.date}: Expected balance ${issue.expectedBalance.toFixed(2)}, 
                 but found ${issue.actualBalance.toFixed(2)} (diff: ${issue.difference.toFixed(2)})</li>`
            ).join('');
            
            balanceStatusElement.innerHTML = `
                <span class="status-icon">⚠️</span>
                <span>
                    <strong>Balance consistency issues detected!</strong>
                    <p>There may be missing transactions or incorrect balances.</p>
                    <details>
                        <summary>View ${result.issues.length} issues</summary>
                        <ul>${issuesList}</ul>
                    </details>
                </span>
            `;
            
            // Disable import button if there are consistency issues
            importButton.disabled = true;
        }
    }

    async function processGroupedRecords(records) {
        const groups = {};
        const nonGroupedRecords = [];

        records.forEach(record => {
            const match = record.concepto.match(/TRANSFERENCIAS \| ([A-Za-z0-9]{6,9}) 41016796-E\.I\. CASAR \|/);
            
            if (match) {
                const dateKey = record.normalized_date;
                if (!groups[dateKey]) {
                    groups[dateKey] = {
                        records: [],
                        total: 0
                    };
                }
                groups[dateKey].records.push(record);
                groups[dateKey].total += record.importe;
            } else {
                nonGroupedRecords.push({
                    ...record,
                    is_grouped: false});
            }
        });

       // Create and check grouped records
    const groupedRecords = [];
    for (const [date, group] of Object.entries(groups)) {
        const [year, month] = date.split('-');
        const monthName = new Date(year, month - 1).toLocaleString('es-ES', { month: 'long' });
        const importTimestamp = new Date().toISOString();

        const groupedRecord = {
            idx: group.records[0].idx,
            caja: group.records[0].caja,
            fecha: group.records[0].fecha,
            normalized_date: date,
            concepto: `TRANSFERENCIAS 41016796-E.I. CASARICHE ${monthName.toUpperCase()} ${year} (Agrupado. Total: ${group.records.length} beneficiarios)`,
            importe: group.total,
            //saldo: group.records[group.records.length - 1].saldo,
            saldo: group.records[0].saldo,
            
            // Optional composite key for quick sorting
            sort_key: group.records[0].sort_key,
            is_grouped: true
        };

        const hash = await window.electronAPI.generateHash(groupedRecord);
        const exists = await window.electronAPI.checkRecordExists(hash);
        
        groupedRecords.push({
            ...groupedRecord,
            alreadyInDatabase: exists,
        });
    }

        return [...nonGroupedRecords, ...groupedRecords];
    }

    const checkGroupedRecordExistInDatabase = async (record) => {
        const hash = await window.electronAPI.generateHash(record);
        const exists = await window.electronAPI.checkRecordExists(hash);
        return exists;
    }

    importButton.addEventListener('click', async () => {
        
        // Strictly reject if records are not in descending date order
        if (!balanceValidationResult.isDescendingOrder) {
            alert(
                "ERROR: Records must be in descending date order (newest to oldest).\n\n" +
                "Please export your transactions in the correct order from your bank portal."
            );
            return;
        }
        
        // Check balance consistency issues
        if (!balanceValidationResult.isValid) {
            const confirmImport = confirm(
                "WARNING: Balance inconsistencies were detected in these transactions.\n\n" +
                "Importing may result in incorrect balances or missing transactions.\n\n" +
                "Do you want to proceed anyway?"
            );
            
            if (!confirmImport) {
                return;
            }
        }

        const selectedRows = Array.from(previewTable.querySelectorAll('tr'))
            .filter(row => {
                const checkbox = row.querySelector('input[type="checkbox"]');
                return checkbox && !checkbox.disabled && checkbox.checked;
            })
            .map(row => {
                const index = row.rowIndex - 1;
                const record = sortedRecords[index];
                return record;
            });
            

        if (selectedRows.length > 0) {
            try {
                await window.electronAPI.importRecords(selectedRows);
                window.close();
            } catch (error) {
                showError('Error importing records');
            }
        }
    });

    function displayRecords(records) {
        previewTable.innerHTML = '';
        records.forEach(record => {
            const tr = document.createElement('tr');
            tr.classList.add(record.importe >= 0 ? 'positive-amount' : 'negative-amount');
            
            const formattedImporte = new Intl.NumberFormat('es-ES', { 
                style: 'currency', 
                currency: 'EUR'
            }).format(record.importe);

            const formattedSaldo = new Intl.NumberFormat('es-ES', { 
                style: 'currency', 
                currency: 'EUR'
            }).format(record.saldo);

            tr.innerHTML = `
                <td>${record.caja}</td>
                <td class="date">${record.fecha}</td>
                <td class="date">${record.normalized_date}</td>
                <td>${record.concepto}</td>
                <td class="currency">${formattedImporte}</td>
                <td class="currency">${formattedSaldo}</td>
                <td class="text-center import-status">
                    <input type="checkbox" ${record.alreadyInDatabase ? 'checked disabled' : 'checked'}>
                    <span class="status-icon">
                        ${record.alreadyInDatabase ? '&check;' : '<span class="new-badge">NEW</span>'}
                    </span>
                </td>
                <td>${record.sort_key}</td>
            `;
            
            previewTable.appendChild(tr);
        });

        updateImportButton();
    }
    
    function updateImportButton() {
        const newRecordsCount = sortedRecords.filter(r => !r.alreadyInDatabase).length;
        importButton.textContent = `Import Selected (${newRecordsCount} new)`;
        importButton.disabled = newRecordsCount === 0;
    }

    cancelButton.addEventListener('click', () => {
        window.close();
    });

});