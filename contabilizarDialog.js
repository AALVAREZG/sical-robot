const arqueoForm = require('./forms/arqueoForm.js');
const gastoForm = require('./forms/gastoForm.js');
const OperacionFactory = require('./models/OperacionFactory');

document.addEventListener('DOMContentLoaded', () => {
    const addArqueoButton = document.getElementById('addArqueo');
    const addGastoButton = document.getElementById('addGasto');
    const operacionesTable = document.getElementById('operacionesTable').getElementsByTagName('tbody')[0];
    const exportButton = document.getElementById('exportOperacionesToAPI');
    const formContainer = document.getElementById('formContainer');

    let operaciones = [];

    function showForm(type) {
        const form = createForm(type);
        formContainer.innerHTML = '';
        formContainer.appendChild(form);
        formContainer.style.display = 'block';
    }

    function createForm(type) {
        const form = document.createElement('form');
        form.id = `${type}Form`;
        
        switch(type) {
            case 'arqueo':
                form.innerHTML = arqueoForm.createArqueoForm();
                break;
            case 'gasto':
                form.innerHTML = gastoForm.createGastoForm();
                break;
            default:
                console.error('Unknown form type:', type);
                return null;
        }


        // Add form submit handler
        form.addEventListener('submit', (e) => handleFormSubmit(e, type));

        // Add cancel button handler
        form.querySelector('.btn-cancel').addEventListener('click', () => {
            formContainer.style.display = 'none';
        });

        setupAplicacionesHandlers(form, type);
        
        return form;
    }

    function setupAplicacionesHandlers(form, type) {
        const addButton = form.querySelector('.add-aplicacion');
        const tbody = form.querySelector('.aplicaciones-section tbody');

        addButton.addEventListener('click', () => {
            const row = document.createElement('tr');
            row.innerHTML = type === 'arqueo' 
                ? arqueoForm.createArqueoAplicacionRow() 
                : gastoForm.createGastoAplicacionRow();
            tbody.appendChild(row);
        });

        form.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-row')) {
                e.target.closest('tr').remove();
            }
        });
    }

   function editOperacion(index) {
        const operacion = operaciones[index];
        console.log("operacion a editar: ")
        console.log(operacion)
        showForm(operacion.tipo);
        const form = document.getElementById(`${operacion.tipo}Form`);
        populateForm(form, operacion);
        operaciones.splice(index, 1);
        operacionesTable.deleteRow(index);
    }

    function populateForm(form, operacion) {
        // Handle fecha field specifically based on operation type
        const fechaField = operacion.tipo === 'arqueo' ? 'fecha_ingreso' : 'fecha';
        form.elements[fechaField].value = operacion.fecha;

        // Fill other basic fields
        Object.keys(operacion).forEach(key => {
            const input = form.elements[key];
            if (input && !key.startsWith('aplicaciones') && key !== 'fecha') {
                input.value = operacion[key];
            }
        });

        // Handle aplicaciones
        const tbody = form.querySelector('.aplicaciones-section tbody');
        tbody.innerHTML = ''; // Clear existing rows

        if (operacion.tipo === 'arqueo') {
            Object.entries(operacion.aplicaciones).forEach(([key, aplicacion]) => {
                const row = document.createElement('tr');
                row.innerHTML = arqueoForm.createArqueoAplicacionRow();
                row.querySelector('[name^="partida"]').value = aplicacion.partida;
                row.querySelector('[name^="importe"]').value = aplicacion.importe;
                tbody.appendChild(row);
            });
        } else if (operacion.tipo === 'gasto') {
            Object.entries(operacion.aplicaciones).forEach(([key, aplicacion]) => {
                const row = document.createElement('tr');
                row.innerHTML = gastoForm.createGastoAplicacionRow();
                row.querySelector('[name^="funcional"]').value = aplicacion.funcional;
                row.querySelector('[name^="economica"]').value = aplicacion.economica;
                row.querySelector('[name^="importe"]').value = aplicacion.importe;
                tbody.appendChild(row);
            });
        }
    }

    function deleteOperacion(index) {
        operaciones.splice(index, 1);
        operacionesTable.deleteRow(index);
    }

    addArqueoButton.addEventListener('click', () => showForm('arqueo'));
    addGastoButton.addEventListener('click', () => showForm('gasto'));

            

    // Update save functionality
    exportButton.addEventListener('click', async () => {
        try {
            const operacionesJSON = operaciones.map(op => op.toJSON());
            await window.electronAPI.exportOperacionesToAPI(operacionesJSON);
            window.close();
        } catch (error) {
            console.error("Error exporting operations:", error);
            alert("Error al exportar las operaciones");
        }
    });

    function handleFormSubmit(e, type) {
        e.preventDefault();
        try {
            const formData = new FormData(e.target);
            const operacion = OperacionFactory.createOperacion(type);
            
            // Fill base data
            operacion.fecha = formData.get('fecha') || formData.get('fecha_ingreso');
            
            if (type === 'arqueo') {
                operacion.caja = formData.get('caja');
                operacion.tercero = formData.get('tercero');
                operacion.naturaleza = formData.get('naturaleza');
                operacion.texto = formData.get('texto');
                
                // Get aplicaciones
                const aplicacionesRows = e.target.querySelectorAll('.aplicaciones-section tbody tr');
                aplicacionesRows.forEach((row, index) => {
                    const partida = row.querySelector('[name^="partida"]').value;
                    const importe = parseFloat(row.querySelector('[name^="importe"]').value);
                    operacion.addAplicacion(`ap_${index}`, partida, importe);
                });
            } else if (type === 'gasto') {
                operacion.expediente = formData.get('expediente');
                operacion.fpago = formData.get('fpago');
                operacion.tpago = formData.get('tpago');
                operacion.texto = formData.get('texto');
                
                // Get aplicaciones
                const aplicacionesRows = e.target.querySelectorAll('.aplicaciones-section tbody tr');
                aplicacionesRows.forEach((row, index) => {
                    const funcional = row.querySelector('[name^="funcional"]').value;
                    const economica = row.querySelector('[name^="economica"]').value;
                    const importe = parseFloat(row.querySelector('[name^="importe"]').value);
                    operacion.addAplicacion(`ap_${index}`, funcional, economica, importe);
                });
            }

            operacion.importe = operacion.totalImporte;
            operacion.validate();
            
            addOperacion(operacion);
            formContainer.style.display = 'none';
        } catch (error) {
            alert(error.message);
        }
    }

    function addOperacion(operacion) {
        operaciones.push(operacion);
        const newRow = operacionesTable.insertRow();
        newRow.innerHTML = `
            <td>${operacion.tipo}</td>
            <td>${operacion.fecha}</td>
            <td>${operacion.importe}€</td>
            <td>
                <button onclick="editOperacion(${operaciones.length - 1})">Editar</button>
                <button onclick="deleteOperacion(${operaciones.length - 1})">Eliminar</button>
            </td>
        `;
        console.log("operaciones: ")
        console.log(operaciones)
    }

    
    // Expose functions to global scope for table buttons
    window.editOperacion = editOperacion;
    window.deleteOperacion = deleteOperacion;
});