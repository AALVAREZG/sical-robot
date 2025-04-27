/**
 * AdoEditor - Specialized editor for ADO 220 task type
 */
class AdoEditor {
    constructor(container, task = null) {
        this.container = container;
        this.task = task || {
            tipo: 'ado220',
            detalle: {
                fecha: '',
                expediente: '',
                tercero: '',
                caja: '',
                fpago: '',
                tpago: '',
                texto: '',
                aplicaciones: [{
                    funcional: '',
                    economica: '',
                    gfa: null,
                    importe: '',
                    cuenta: ''
                }]
            }
        };
    }

    /**
     * Render the editor form
     */
    render() {
        this.container.innerHTML = '';
        
        // Create form container
        const form = document.createElement('div');
        form.className = 'editor-form';
        
        // Basic information section
        form.appendChild(this._createBasicInfoSection());
        
        // Aplicaciones section
        form.appendChild(this._createAplicacionesSection());
        
        this.container.appendChild(form);
    }
    
    /**
     * Create basic information section
     */
    _createBasicInfoSection() {
        const section = document.createElement('div');
        section.className = 'editor-section';
        
        const heading = document.createElement('h3');
        heading.textContent = 'Información Básica';
        heading.className = 'section-heading';
        section.appendChild(heading);
        
        const grid = document.createElement('div');
        grid.className = 'form-grid';
        
        // Add first row of fields
        grid.appendChild(this._createFormField('fecha', 'Fecha', this.task.detalle.fecha || '', 'date'));
        grid.appendChild(this._createFormField('expediente', 'Expediente', this.task.detalle.expediente || '', 'text'));
        grid.appendChild(this._createFormField('tercero', 'Tercero', this.task.detalle.tercero || '', 'text'));
        grid.appendChild(this._createFormField('caja', 'Caja', this.task.detalle.caja || '', 'text'));
        
        // Add second row of fields
        grid.appendChild(this._createFormField('fpago', 'Forma de Pago', this.task.detalle.fpago || '', 'text'));
        grid.appendChild(this._createFormField('tpago', 'Tipo de Pago', this.task.detalle.tpago || '', 'text'));
        
        // Texto field spans two columns
        const textoField = this._createTextareaField('texto', 'Texto', this.task.detalle.texto || '');
        textoField.style.gridColumn = 'span 2';
        grid.appendChild(textoField);
        
        section.appendChild(grid);
        return section;
    }
    
    /**
     * Create aplicaciones section with dynamic add/remove
     */
    _createAplicacionesSection() {
        const section = document.createElement('div');
        section.className = 'editor-section';
        
        // Create section header with add button
        const headerContainer = document.createElement('div');
        headerContainer.className = 'section-header';
        
        const heading = document.createElement('h3');
        heading.textContent = 'Aplicaciones';
        heading.className = 'section-heading';
        
        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'add-item-btn';
        addButton.innerHTML = '<i class="fas fa-plus"></i> Añadir Aplicación';
        addButton.addEventListener('click', () => this._addAplicacion());
        
        headerContainer.appendChild(heading);
        headerContainer.appendChild(addButton);
        section.appendChild(headerContainer);
        
        // Total amount display
        const totalContainer = document.createElement('div');
        totalContainer.className = 'total-container';
        totalContainer.innerHTML = '<span>Total Importe: </span><span id="totalImporte">0.00 €</span>';
        section.appendChild(totalContainer);
        
        // Container for aplicacion items
        const aplicacionesContainer = document.createElement('div');
        aplicacionesContainer.className = 'aplicaciones-container';
        aplicacionesContainer.id = 'aplicacionesContainer';
        section.appendChild(aplicacionesContainer);
        
        // Add existing aplicaciones or at least one empty one
        const aplicaciones = this.task.detalle.aplicaciones && this.task.detalle.aplicaciones.length > 0 ? 
            this.task.detalle.aplicaciones : [{
                funcional: '',
                economica: '',
                gfa: null,
                importe: '',
                cuenta: ''
            }];
            
        aplicaciones.forEach((aplicacion, index) => {
            this._renderAplicacionItem(aplicacionesContainer, aplicacion, index);
        });
        
        // Calculate initial total
        setTimeout(() => this._updateTotal(), 100);
        
        return section;
    }
    
    /**
     * Render a single aplicacion item
     */
    _renderAplicacionItem(container, aplicacion, index) {
        const aplicacionRow = document.createElement('div');
        aplicacionRow.className = 'item-row aplicacion-row';
        aplicacionRow.dataset.index = index;
        
        // Create the fields
        const funcionalField = this._createFormField(`funcional_${index}`, 'Funcional', aplicacion.funcional || '', 'text');
        const economicaField = this._createFormField(`economica_${index}`, 'Económica', aplicacion.economica || '', 'text');
        const gfaField = this._createFormField(`gfa_${index}`, 'GFA', aplicacion.gfa || '', 'text');
        
        // Importe field with change event
        const importeField = document.createElement('div');
        importeField.className = 'form-field';
        
        const importeLabel = document.createElement('label');
        importeLabel.htmlFor = `importe_${index}`;
        importeLabel.textContent = 'Importe';
        
        const importeInput = document.createElement('input');
        importeInput.type = 'number';
        importeInput.id = `importe_${index}`;
        importeInput.name = `importe_${index}`;
        
        // Ensure we're getting a number value
        let importeValue = aplicacion.importe;
        // Convert to number if it's a string
        if (typeof importeValue === 'string') {
            importeValue = parseFloat(importeValue.replace(',', '.'));
        }
        // If it's still not a number, default to 0
        if (isNaN(importeValue)) {
            importeValue = 0;
        }
        
        importeInput.value = importeValue;
        
        // Store original value for reference
        importeInput.setAttribute('data-original-value', importeValue);
        
        // Log for debugging
        console.log(`Setting importe_${index} value:`, {
            originalValue: aplicacion.importe,
            parsedValue: importeValue,
            inputValue: importeInput.value
        });
        
        importeInput.addEventListener('blur', (e) => {
            // Format the display when field loses focus
            const value = parseFloat(e.target.value) || 0;
            e.target.value = value;
            console.log(`importe_${index} blur event:`, {
                rawValue: e.target.value,
                formattedValue: value
            });
        });
        
        importeInput.step = '0.01';
        importeInput.addEventListener('change', () => this._updateTotal());
        importeInput.addEventListener('keyup', () => this._updateTotal());
        
        importeField.appendChild(importeLabel);
        importeField.appendChild(importeInput);
        
        const cuentaField = this._createFormField(`cuenta_${index}`, 'Cuenta', aplicacion.cuenta || '', 'text');
        
        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'delete-item-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.addEventListener('click', () => this._removeAplicacion(index));
        
        // Assemble row as a grid
        aplicacionRow.appendChild(funcionalField);
        aplicacionRow.appendChild(economicaField);
        aplicacionRow.appendChild(gfaField);
        aplicacionRow.appendChild(importeField);
        aplicacionRow.appendChild(cuentaField);
        aplicacionRow.appendChild(deleteBtn);
        
        container.appendChild(aplicacionRow);
    }
    
    /**
     * Add a new aplicacion item
     */
    _addAplicacion() {
        const container = document.getElementById('aplicacionesContainer');
        const index = container.children.length;
        
        this._renderAplicacionItem(container, {
            funcional: '',
            economica: '',
            gfa: null,
            importe: '',
            cuenta: ''
        }, index);
    }
    
    /**
     * Remove an aplicacion item
     */
    _removeAplicacion(index) {
        const container = document.getElementById('aplicacionesContainer');
        
        // Don't remove the last aplicacion
        if (container.children.length <= 1) {
            alert('Debe mantener al menos una aplicación.');
            return;
        }
        
        // Find the row with the matching index and remove it
        for (let i = 0; i < container.children.length; i++) {
            if (parseInt(container.children[i].dataset.index) === index) {
                container.removeChild(container.children[i]);
                break;
            }
        }
        
        // Renumber remaining aplicaciones for correct collection
        this._renumberItems(container, 'aplicacion-row');
        
        // Update the total
        this._updateTotal();
    }
    
    /**
     * Update the total amount display
     */
    _updateTotal() {
        const totalElement = document.getElementById('totalImporte');
        if (!totalElement) return;
        
        let total = 0;
        const rows = document.querySelectorAll('.aplicacion-row');
        
        rows.forEach((row, index) => {
            const importeInput = document.getElementById(`importe_${index}`);
            if (importeInput && !isNaN(parseFloat(importeInput.value))) {
                total += parseFloat(importeInput.value);
            }
        });
        
        totalElement.textContent = `${total.toFixed(2)} €`;
    }
    
    /**
     * Renumber items in a container after deletion
     */
    _renumberItems(container, rowClass) {
        const items = container.querySelectorAll(`.${rowClass}`);
        
        items.forEach((item, newIndex) => {
            item.dataset.index = newIndex;
            
            // Update IDs and names of all inputs in this row
            const inputs = item.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                const baseName = input.id.split('_')[0];
                input.id = `${baseName}_${newIndex}`;
                input.name = `${baseName}_${newIndex}`;
                
                // Update associated label
                const label = item.querySelector(`label[for="${input.id.replace(newIndex, item.dataset.index)}"]`);
                if (label) {
                    label.htmlFor = input.id;
                }
            });
        });
    }
    
    /**
     * Create a form field with label and input
     */
    _createFormField(id, label, value, type = 'text') {
        const field = document.createElement('div');
        field.className = 'form-field';
        
        const labelEl = document.createElement('label');
        labelEl.htmlFor = id;
        labelEl.textContent = label;
        
        const input = document.createElement('input');
        input.type = type;
        input.id = id;
        input.name = id;
        if (type === 'date') {
            // Convert from storage format to display format
            input.value = formatDateForDisplay(value);
            
            // Store original format as data attribute for reference
            input.dataset.originalFormat = value;
            
            // Add event to update the data attribute when the value changes
            input.addEventListener('change', (e) => {
                e.target.dataset.rawValue = formatDateForStorage(e.target.value);
            });
        } else {
            input.value = value;
        }
        
        field.appendChild(labelEl);
        field.appendChild(input);
        
        return field;
    }
    
    /**
     * Create a textarea field with label
     */
    _createTextareaField(id, label, value) {
        const field = document.createElement('div');
        field.className = 'form-field';
        
        const labelEl = document.createElement('label');
        labelEl.htmlFor = id;
        labelEl.textContent = label;
        
        const textarea = document.createElement('textarea');
        textarea.id = id;
        textarea.name = id;
        textarea.value = value;
        textarea.rows = 3;
        
        field.appendChild(labelEl);
        field.appendChild(textarea);
        
        return field;
    }
    
    /**
     * Collect form data and return task object
     */
    getData() {

        // Get date from input and properly convert it
        const dateInput = document.getElementById('fecha');
        const rawDateValue = dateInput.value; // This is in YYYY-MM-DD format from the date input
        const formattedDate = formatDateForStorage(rawDateValue);
        
        console.log('Date conversion:', {
            originalValue: rawDateValue,
            convertedValue: formattedDate
        });

        const task = {
            tipo: 'ado220',
            detalle: {
                fecha: formattedDate,
                expediente: document.getElementById('expediente').value,
                tercero: document.getElementById('tercero').value,
                caja: document.getElementById('caja').value,
                fpago: document.getElementById('fpago').value,
                tpago: document.getElementById('tpago').value,
                texto: document.getElementById('texto').value,
                aplicaciones: []
            }
        };
        
        // Collect aplicaciones
    const aplicacionRows = document.querySelectorAll('.aplicacion-row');
    aplicacionRows.forEach((row, index) => {
        const funcionalInput = document.getElementById(`funcional_${index}`);
        const economicaInput = document.getElementById(`economica_${index}`);
        const gfaInput = document.getElementById(`gfa_${index}`);
        const importeInput = document.getElementById(`importe_${index}`);
        const cuentaInput = document.getElementById(`cuenta_${index}`);
        
        if (funcionalInput && economicaInput && importeInput && cuentaInput) {
            const gfaValue = gfaInput ? gfaInput.value : null;
            
            task.detalle.aplicaciones.push({
                funcional: funcionalInput.value,
                economica: economicaInput.value,
                gfa: gfaValue && gfaValue.trim() !== '' ? gfaValue : null,
                importe: parseFloat(importeInput.value) || 0,
                cuenta: cuentaInput.value
            });
        }
    });
        
    return task;
    }
    
    /**
     * Validate the form data
     * @returns {boolean} True if valid, false otherwise
     */
    validate() {
        // Basic validation
        const requiredFields = ['fecha', 'caja'];
        for (const field of requiredFields) {
            const element = document.getElementById(field);
            if (!element.value.trim()) {
                alert(`El campo ${element.labels[0].textContent} es obligatorio.`);
                element.focus();
                return false;
            }
        }
        
        // Validate aplicaciones
        const aplicacionRows = document.querySelectorAll('.aplicacion-row');
        let totalImporte = 0;
        
        for (let i = 0; i < aplicacionRows.length; i++) {
            const funcionalInput = document.getElementById(`funcional_${i}`);
            const economicaInput = document.getElementById(`economica_${i}`);
            const importeInput = document.getElementById(`importe_${i}`);
            
            if (!funcionalInput.value.trim()) {
                alert(`El campo Funcional en la aplicación ${i+1} es obligatorio.`);
                funcionalInput.focus();
                return false;
            }
            
            if (!economicaInput.value.trim()) {
                alert(`El campo Económica en la aplicación ${i+1} es obligatorio.`);
                economicaInput.focus();
                return false;
            }
            
            if (!importeInput.value.trim() || isNaN(parseFloat(importeInput.value))) {
                alert(`El importe en la aplicación ${i+1} debe ser un número válido.`);
                importeInput.focus();
                return false;
            }
            
            totalImporte += parseFloat(importeInput.value);
        }
        
        // Check if total importe is valid
        if (totalImporte <= 0) {
            alert('El importe total debe ser mayor que cero.');
            return false;
        }
        
        return true;
    }
}

// Export module
module.exports = AdoEditor;
