document.addEventListener('DOMContentLoaded', () => {
    const previewTable = document.querySelector('#previewTable tbody');
    const importButton = document.getElementById('importRecords');
    const cancelButton = document.getElementById('cancelImport');

    let processedRecords = []; /// Array of records to be displayed in the preview table. Contains both grouped and non-grouped records.

    window.electronAPI.onPreviewData(async (data) => {
        //console.log('Preview data:', data);
        processedRecords = await processGroupedRecords(data);
        //console.log('Processed records:', processedRecords);
        // Sort all records by date
        processedRecords.sort((a, b) => b.normalized_date.localeCompare(a.normalized_date));
        displayRecords(processedRecords);
    });

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
                nonGroupedRecords.push(record);
            }
        });

       // Create and check grouped records
    const groupedRecords = [];
    for (const [date, group] of Object.entries(groups)) {
        const [year, month] = date.split('-');
        const monthName = new Date(year, month - 1).toLocaleString('es-ES', { month: 'long' });
        
        const groupedRecord = {
            idx: group.records[0].idx,
            caja: group.records[0].caja,
            fecha: group.records[0].fecha,
            normalized_date: date,
            concepto: `TRANSFERENCIAS 41016796-E.I. CASARICHE ${monthName.toUpperCase()} ${year} (Agrupado. Total: ${group.records.length} beneficiarios)`,
            importe: group.total,
            saldo: group.records[group.records.length - 1].saldo,
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
        const selectedRows = Array.from(previewTable.querySelectorAll('tr'))
            .filter(row => {
                const checkbox = row.querySelector('input[type="checkbox"]');
                return checkbox && !checkbox.disabled && checkbox.checked;
            })
            .map(row => {
                const index = row.rowIndex - 1;
                const record = processedRecords[index];
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
            `;
            
            previewTable.appendChild(tr);
        });

        updateImportButton();
    }
    
    function updateImportButton() {
        const newRecordsCount = processedRecords.filter(r => !r.alreadyInDatabase).length;
        importButton.textContent = `Import Selected (${newRecordsCount} new)`;
        importButton.disabled = newRecordsCount === 0;
    }

    cancelButton.addEventListener('click', () => {
        window.close();
    });

});