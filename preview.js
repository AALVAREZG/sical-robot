document.addEventListener('DOMContentLoaded', () => {
    const previewTable = document.querySelector('#previewTable tbody');
    const importButton = document.getElementById('importRecords');
    const cancelButton = document.getElementById('cancelImport');

    let recordsData = [];

    // Listen for data from main process
    window.electronAPI.onPreviewData((data) => {
        recordsData = data;
        displayRecords(data);
    });

    function displayRecords(records) {
        previewTable.innerHTML = '';
        records.forEach(record => {
            const tr = document.createElement('tr');
            tr.classList.add(record.importe >= 0 ? 'positive-amount' : 'negative-amount');
            
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
                <td>${record.concepto}</td>
                <td class="currency">${formattedImporte}</td>
                <td class="currency">${formattedSaldo}</td>
                <td class="text-center">
                    <input type="checkbox" ${record.alreadyInDatabase ? 'checked disabled' : ''}>
                    ${record.alreadyInDatabase ? '✓' : ''}
                </td>
            `;
            previewTable.appendChild(tr);
        });
    }

    function formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    importButton.addEventListener('click', async () => {
        const selectedRows = Array.from(previewTable.querySelectorAll('tr'))
            .filter(row => {
                const checkbox = row.querySelector('input[type="checkbox"]');
                return checkbox && !checkbox.disabled && checkbox.checked;
            })
            .map(row => {
                const index = row.rowIndex - 1; // Adjust for header row
                return recordsData[index];
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

    cancelButton.addEventListener('click', () => {
        window.close();
    });

    function showError(message) {
        const errorToast = document.createElement('div');
        errorToast.className = 'error-toast';
        errorToast.textContent = message;
        document.body.appendChild(errorToast);
        setTimeout(() => errorToast.remove(), 3000);
    }
});