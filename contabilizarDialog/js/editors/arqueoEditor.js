/**
 * ArqueoEditor - Specialized editor for Arqueo task type
 */
class ArqueoEditor {
    constructor(container, task = null) {
        this.container = container;
        this.task = task || {
            tipo: 'arqueo',
            detalle: {
                fecha: '',
                caja: '',
                tercero: '',
                naturaleza: '',
                final: [{
                    partida: '',
                    IMPORTE_PARTIDA: 0
                }],
                texto_sical: [{
                    tcargo: '',
                    ado: ''
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
        
        // Partidas section
        form.appendChild(this._createPartidasSection());
        
        // Texto SICAL section
        form.appendChild(this._createTextoSicalSection());
        
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
        
        // Add basic fields
        grid.appendChild(this._createFormField('fecha', 'Fecha', this.task.detalle.fecha || '', 'date'));
        grid.appendChild(this._createFormField('caja', 'Caja', this.task.detalle.caja || '', 'text'));
        grid.appendChild(this._createFormField('tercero', 'Tercero', this.task.detalle.tercero || '', 'text'));
        grid.appendChild(this._createFormField('naturaleza', 'Naturaleza', this.task.detalle.naturaleza || '', 'text'));
        
        section.appendChild(grid);
        return section;
    }
    
    /**
     * Create partidas section with dynamic add/remove
     */
    _createPartidasSection() {
        const section = document.createElement('div');
        section.className = 'editor-section';
        
        // Create section header with add button
        const headerContainer = document.createElement('div');
        headerContainer.className = 'section-header';
        
        const heading = document.createElement('h3');
        heading.textContent = 'Partidas';
        heading.className = 'section-heading';
        
        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'add-item-btn';
        addButton.innerHTML = '<i class="fas fa-plus"></i> Añadir Partida';
        addButton.addEventListener('click', () => this._addPartida());
        
        headerContainer.appendChild(heading);
        headerContainer.appendChild(addButton);
        section.appendChild(headerContainer);
        
        // Container for partida items
        const partidasContainer = document.createElement('div');
        partidasContainer.className = 'partidas-container';
        partidasContainer.id = 'partidasContainer';
        section.appendChild(partidasContainer);
        
        // Add existing partidas or at least one empty one
        const partidas = this.task.detalle.final && this.task.detalle.final.length > 0 ? 
            this.task.detalle.final : [{ partida: '', IMPORTE_PARTIDA: 0 }];
            
        partidas.forEach((partida, index) => {
            this._renderPartidaItem(partidasContainer, partida, index);
        });
        
        return section;
    }
    
    /**
     * Render a single partida item
     */
    _renderPartidaItem(container, partida, index) {
        const partidaRow = document.createElement('div');
        partidaRow.className = 'item-row partida-row';
        partidaRow.dataset.index = index;
        
        // Partida code field
        const partidaField = document.createElement('div');
        partidaField.className = 'form-field';
        
        const partidaLabel = document.createElement('label');
        partidaLabel.htmlFor = `partida_${index}`;
        partidaLabel.textContent = 'Partida';
        
        const partidaInput = document.createElement('input');
        partidaInput.type = 'text';
        partidaInput.id = `partida_${index}`;
        partidaInput.name = `partida_${index}`;
        partidaInput.value = partida.partida || '';
        
        partidaField.appendChild(partidaLabel);
        partidaField.appendChild(partidaInput);
        
        // Importe field
        const importeField = document.createElement('div');
        importeField.className = 'form-field';
        
        const importeLabel = document.createElement('label');
        importeLabel.htmlFor = `importe_partida_${index}`;
        importeLabel.textContent = 'Importe';
        
        const importeInput = document.createElement('input');
        importeInput.type = 'number';
        importeInput.id = `importe_partida_${index}`;
        importeInput.name = `importe_partida_${index}`;
        importeInput.value = partida.IMPORTE_PARTIDA || '';
        importeInput.setAttribute('data-original-value', partida.IMPORTE_PARTIDA || '');
        importeInput.addEventListener('blur', (e) => {
            // Format the display when field loses focus
            const value = parseFloat(e.target.value) || 0;
            e.target.value = formatCurrency(value, false); // No € symbol in input
        });
        importeInput.step = '1.00';
        
        importeField.appendChild(importeLabel);
        importeField.appendChild(importeInput);
        
        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'delete-item-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.addEventListener('click', () => this._removePartida(index));
        
        // Assemble row
        partidaRow.appendChild(partidaField);
        partidaRow.appendChild(importeField);
        partidaRow.appendChild(deleteBtn);
        
        container.appendChild(partidaRow);
    }
    
    /**
     * Add a new partida item
     */
    _addPartida() {
        const container = document.getElementById('partidasContainer');
        const index = container.children.length;
        
        this._renderPartidaItem(container, { partida: '', IMPORTE_PARTIDA: 0 }, index);
    }
    
    /**
     * Remove a partida item
     */
    _removePartida(index) {
        const container = document.getElementById('partidasContainer');
        
        // Don't remove the last partida
        if (container.children.length <= 1) {
            alert('Debe mantener al menos una partida.');
            return;
        }
        
        // Find the row with the matching index and remove it
        for (let i = 0; i < container.children.length; i++) {
            if (parseInt(container.children[i].dataset.index) === index) {
                container.removeChild(container.children[i]);
                break;
            }
        }
        
        // Renumber remaining partidas for correct collection
        this._renumberItems(container, 'partida-row');
    }
    
    /**
     * Create texto SICAL section with dynamic add/remove
     */
    _createTextoSicalSection() {
        const section = document.createElement('div');
        section.className = 'editor-section';
        
        // Create section header with add button
        const headerContainer = document.createElement('div');
        headerContainer.className = 'section-header';
        
        const heading = document.createElement('h3');
        heading.textContent = 'Texto SICAL';
        heading.className = 'section-heading';
        
        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'add-item-btn';
        addButton.innerHTML = '<i class="fas fa-plus"></i> Añadir Texto';
        addButton.addEventListener('click', () => this._addTextoSical());
        
        headerContainer.appendChild(heading);
        headerContainer.appendChild(addButton);
        section.appendChild(headerContainer);
        
        // Container for texto items
        const textoContainer = document.createElement('div');
        textoContainer.className = 'texto-container';
        textoContainer.id = 'textoContainer';
        section.appendChild(textoContainer);
        
        // Add existing textos or at least one empty one
        const textos = this.task.detalle.texto_sical && this.task.detalle.texto_sical.length > 0 ? 
            this.task.detalle.texto_sical : [{ tcargo: '', ado: '' }];
            
        textos.forEach((texto, index) => {
            this._renderTextoSicalItem(textoContainer, texto, index);
        });
        
        return section;
    }
    
    /**
     * Render a single texto SICAL item
     */
    _renderTextoSicalItem(container, texto, index) {
        const textoRow = document.createElement('div');
        textoRow.className = 'item-row texto-row';
        textoRow.dataset.index = index;
        
        // TCargo field
        const tcargoField = document.createElement('div');
        tcargoField.className = 'form-field';
        
        const tcargoLabel = document.createElement('label');
        tcargoLabel.htmlFor = `tcargo_${index}`;
        tcargoLabel.textContent = 'T.Cargo';
        
        const tcargoInput = document.createElement('input');
        tcargoInput.type = 'text';
        tcargoInput.id = `tcargo_${index}`;
        tcargoInput.name = `tcargo_${index}`;
        tcargoInput.value = texto.tcargo || '';
        
        tcargoField.appendChild(tcargoLabel);
        tcargoField.appendChild(tcargoInput);
        
        // ADO field
        const adoField = document.createElement('div');
        adoField.className = 'form-field';
        
        const adoLabel = document.createElement('label');
        adoLabel.htmlFor = `ado_${index}`;
        adoLabel.textContent = 'ADO';
        
        const adoInput = document.createElement('input');
        adoInput.type = 'text';
        adoInput.id = `ado_${index}`;
        adoInput.name = `ado_${index}`;
        adoInput.value = texto.ado || '';
        
        adoField.appendChild(adoLabel);
        adoField.appendChild(adoInput);
        
        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'delete-item-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.addEventListener('click', () => this._removeTextoSical(index));
        
        // Assemble row
        textoRow.appendChild(tcargoField);
        textoRow.appendChild(adoField);
        textoRow.appendChild(deleteBtn);
        
        container.appendChild(textoRow);
    }
    
    /**
     * Add a new texto SICAL item
     */
    _addTextoSical() {
        const container = document.getElementById('textoContainer');
        const index = container.children.length;
        
        this._renderTextoSicalItem(container, { tcargo: '', ado: '' }, index);
    }
    
    /**
     * Remove a texto SICAL item
     */
    _removeTextoSical(index) {
        const container = document.getElementById('textoContainer');
        
        // Don't remove the last texto
        if (container.children.length <= 1) {
            alert('Debe mantener al menos un texto SICAL.');
            return;
        }
        
        // Find the row with the matching index and remove it
        for (let i = 0; i < container.children.length; i++) {
            if (parseInt(container.children[i].dataset.index) === index) {
                container.removeChild(container.children[i]);
                break;
            }
        }
        
        // Renumber remaining textos for correct collection
        this._renumberItems(container, 'texto-row');
    }
    
    /**
     * Renumber items in a container after deletion
     */
    _renumberItems(container, rowClass) {
        const items = container.querySelectorAll(`.${rowClass}`);
        
        items.forEach((item, newIndex) => {
            item.dataset.index = newIndex;
            
            // Update IDs and names of all inputs in this row
            const inputs = item.querySelectorAll('input, select');
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
         // Handle date fields specially
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
            tipo: 'arqueo',
            detalle: {
                fecha: formattedDate,
                caja: document.getElementById('caja').value,
                tercero: document.getElementById('tercero').value,
                naturaleza: document.getElementById('naturaleza').value,
                final: [],
                texto_sical: []
            }
        };
        
        // Collect partidas
        const partidaRows = document.querySelectorAll('.partida-row');
        partidaRows.forEach((row, index) => {
            task.detalle.final.push({
                partida: document.getElementById(`partida_${index}`).value,
                IMPORTE_PARTIDA: parseFloat(document.getElementById(`importe_partida_${index}`).value) || 0
            });
        });
        
        // Collect texto_sical
        const textoRows = document.querySelectorAll('.texto-row');
        textoRows.forEach((row, index) => {
            task.detalle.texto_sical.push({
                tcargo: document.getElementById(`tcargo_${index}`).value,
                ado: document.getElementById(`ado_${index}`).value
            });
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
        
        // Validate partidas
        const partidaRows = document.querySelectorAll('.partida-row');
        for (let i = 0; i < partidaRows.length; i++) {
            const partidaInput = document.getElementById(`partida_${i}`);
            const importeInput = document.getElementById(`importe_partida_${i}`);
            
            if (!partidaInput.value.trim()) {
                alert(`El campo Partida ${i+1} es obligatorio.`);
                partidaInput.focus();
                return false;
            }
            
            if (isNaN(parseFloat(importeInput.value)) || parseFloat(importeInput.value) === 0) {
                alert(`El importe de la Partida ${i+1} debe ser un número válido y diferente de cero.`);
                importeInput.focus();
                return false;
            }
        }
        
        return true;
    }
}

// Export module
module.exports = ArqueoEditor;
