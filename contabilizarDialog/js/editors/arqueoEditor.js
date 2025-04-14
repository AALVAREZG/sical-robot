/**
 * PartidasManager - Component to reliably manage partida items in ArqueoEditor
 */
class PartidasManager {
    /**
     * Constructor
     * @param {HTMLElement} container - Container element to render partidas
     * @param {Array} initialPartidas - Initial partidas data
     * @param {Function} onUpdate - Callback when partidas are updated
     */
    constructor(container, initialPartidas = [], onUpdate = null) {
        this.container = container;
        this.partidas = Array.isArray(initialPartidas) ? [...initialPartidas] : [];
        this.onUpdate = onUpdate;
        
        // Ensure we have at least one empty partida
        if (this.partidas.length === 0) {
            this.partidas.push({ partida: '', IMPORTE_PARTIDA: 0 });
        }
        
        // Generate unique IDs for each partida
        this.partidas = this.partidas.map(partida => ({
            ...partida,
            _id: this._generateUniqueId()
        }));
        
        // Debug
        console.log('PartidasManager initialized with:', this.partidas);
        
        // Initialize the UI
        this.render();
    }
    
    /**
     * Generate a unique ID for partida items
     * @returns {string} Unique ID
     */
    _generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }
    
    /**
     * Render all partidas
     */
    render() {
        // Clear the container
        this.container.innerHTML = '';
        
        // Add header
        const headerContainer = document.createElement('div');
        headerContainer.className = 'partidas-header';
        headerContainer.innerHTML = `
            <div class="partidas-row header">
                <div class="partida-col">Partida</div>
                <div class="importe-col">Importe</div>
                <div class="actions-col">Acciones</div>
            </div>
        `;
        this.container.appendChild(headerContainer);
        
        // Add each partida
        const partidasContainer = document.createElement('div');
        partidasContainer.className = 'partidas-items-container';
        this.partidas.forEach((partida, index) => {
            partidasContainer.appendChild(this._renderPartidaItem(partida, index));
        });
        this.container.appendChild(partidasContainer);
        
        // Add "add new" button
        const addButtonContainer = document.createElement('div');
        addButtonContainer.className = 'partidas-add-button-container';
        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'add-partida-btn';
        addButton.innerHTML = '<i class="fas fa-plus"></i> Añadir Partida';
        addButton.addEventListener('click', () => this.addPartida());
        addButtonContainer.appendChild(addButton);
        this.container.appendChild(addButtonContainer);
        
        // Add total display
        const totalContainer = document.createElement('div');
        totalContainer.className = 'partidas-total-container';
        totalContainer.innerHTML = `
            <div class="partidas-total">
                <span class="total-label">Total:</span>
                <span class="total-value" id="partidas-total-value">${this._calculateTotal().toFixed(2)} €</span>
            </div>
        `;
        this.container.appendChild(totalContainer);
        
        // Apply styles
        this._applyStyles();
    }
    
    /**
     * Apply additional styles for the component
     */
    _applyStyles() {
        // Check if styles already exist
        if (document.getElementById('partidas-manager-styles')) {
            return;
        }
        
        // Create and add style element
        const styleElement = document.createElement('style');
        styleElement.id = 'partidas-manager-styles';
        styleElement.textContent = `
            .partidas-header {
                margin-bottom: 10px;
            }
            
            .partidas-row {
                display: grid;
                grid-template-columns: 1fr 1fr auto;
                gap: 10px;
                margin-bottom: 10px;
                align-items: center;
            }
            
            .partidas-row.header {
                font-weight: bold;
                border-bottom: 1px solid #ddd;
                padding-bottom: 5px;
            }
            
            .partida-item {
                background-color: #f9f9f9;
                border: 1px solid #eee;
                border-radius: 4px;
                padding: 10px;
            }
            
            .partida-col, .importe-col, .actions-col {
                padding: 5px;
            }
            
            .partida-input, .importe-input {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
            }
            
            .importe-input {
                text-align: right;
            }
            
            .partida-actions {
                display: flex;
                gap: 5px;
            }
            
            .add-partida-btn {
                background-color: #4CAF50;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 10px;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .delete-partida-btn {
                background-color: #f44336;
                color: white;
                border: none;
                border-radius: 4px;
                width: 32px;
                height: 32px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .move-partida-btn {
                background-color: #2196F3;
                color: white;
                border: none;
                border-radius: 4px;
                width: 32px;
                height: 32px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .partidas-total-container {
                margin-top: 15px;
                text-align: right;
                font-weight: bold;
                padding: 10px;
                background-color: #f0f0f0;
                border-radius: 4px;
            }
            
            .total-value {
                margin-left: 10px;
                font-size: 1.1em;
            }
            
            .partida-item.error {
                border-color: #f44336;
                background-color: #ffebee;
            }
        `;
        document.head.appendChild(styleElement);
    }
    
    /**
     * Render a single partida item
     * @param {Object} partida - Partida data object
     * @param {number} index - Index in the array
     * @returns {HTMLElement} The rendered partida item
     */
    _renderPartidaItem(partida, index) {
        const itemContainer = document.createElement('div');
        itemContainer.className = 'partida-item';
        itemContainer.dataset.id = partida._id;
        itemContainer.dataset.index = index;
        
        const row = document.createElement('div');
        row.className = 'partidas-row';
        
        // Partida input
        const partidaCol = document.createElement('div');
        partidaCol.className = 'partida-col';
        const partidaInput = document.createElement('input');
        partidaInput.type = 'text';
        partidaInput.className = 'partida-input';
        partidaInput.value = partida.partida || '';
        partidaInput.placeholder = 'Código partida';
        partidaInput.id = `partida-${partida._id}`;
        partidaInput.addEventListener('change', (e) => {
            this.updatePartida(partida._id, { partida: e.target.value });
        });
        partidaCol.appendChild(partidaInput);
        
        // Importe input
        const importeCol = document.createElement('div');
        importeCol.className = 'importe-col';
        const importeInput = document.createElement('input');
        importeInput.type = 'number';
        importeInput.className = 'importe-input';
        importeInput.value = partida.IMPORTE_PARTIDA || 0;
        importeInput.placeholder = '0.00';
        importeInput.id = `importe-${partida._id}`;
        importeInput.step = '0.01';
        importeInput.addEventListener('change', (e) => {
            const value = parseFloat(e.target.value) || 0;
            this.updatePartida(partida._id, { IMPORTE_PARTIDA: value });
        });
        importeCol.appendChild(importeInput);
        
        // Action buttons
        const actionsCol = document.createElement('div');
        actionsCol.className = 'actions-col';
        const actionButtons = document.createElement('div');
        actionButtons.className = 'partida-actions';
        
        // Move up button
        if (index > 0) {
            const moveUpBtn = document.createElement('button');
            moveUpBtn.type = 'button';
            moveUpBtn.className = 'move-partida-btn';
            moveUpBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
            moveUpBtn.title = 'Mover arriba';
            moveUpBtn.addEventListener('click', () => this.movePartida(partida._id, 'up'));
            actionButtons.appendChild(moveUpBtn);
        }
        
        // Move down button
        if (index < this.partidas.length - 1) {
            const moveDownBtn = document.createElement('button');
            moveDownBtn.type = 'button';
            moveDownBtn.className = 'move-partida-btn';
            moveDownBtn.innerHTML = '<i class="fas fa-arrow-down"></i>';
            moveDownBtn.title = 'Mover abajo';
            moveDownBtn.addEventListener('click', () => this.movePartida(partida._id, 'down'));
            actionButtons.appendChild(moveDownBtn);
        }
        
        // Delete button (only show if more than one partida)
        if (this.partidas.length > 1) {
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'delete-partida-btn';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.title = 'Eliminar';
            deleteBtn.addEventListener('click', () => this.removePartida(partida._id));
            actionButtons.appendChild(deleteBtn);
        }
        
        actionsCol.appendChild(actionButtons);
        
        // Assemble row
        row.appendChild(partidaCol);
        row.appendChild(importeCol);
        row.appendChild(actionsCol);
        itemContainer.appendChild(row);
        
        return itemContainer;
    }
    
    /**
     * Add a new empty partida
     */
    addPartida() {
        const newPartida = {
            partida: '',
            IMPORTE_PARTIDA: 0,
            _id: this._generateUniqueId()
        };
        
        this.partidas.push(newPartida);
        this.render();
        
        // Focus the newly added partida field
        setTimeout(() => {
            const newPartidaInput = document.getElementById(`partida-${newPartida._id}`);
            if (newPartidaInput) {
                newPartidaInput.focus();
            }
        }, 0);
        
        if (this.onUpdate) {
            this.onUpdate(this.getCleanPartidas());
        }
    }
    
    /**
     * Remove a partida by ID
     * @param {string} id - Partida ID
     */
    removePartida(id) {
        if (this.partidas.length <= 1) {
            alert('Debe mantener al menos una partida.');
            return;
        }
        
        this.partidas = this.partidas.filter(p => p._id !== id);
        this.render();
        
        if (this.onUpdate) {
            this.onUpdate(this.getCleanPartidas());
        }
    }
    
    /**
     * Update a partida by ID
     * @param {string} id - Partida ID
     * @param {Object} newData - New partida data to merge
     */
    updatePartida(id, newData) {
        const index = this.partidas.findIndex(p => p._id === id);
        if (index === -1) return;
        
        this.partidas[index] = {
            ...this.partidas[index],
            ...newData
        };
        
        // Update the total display without re-rendering the whole component
        const totalElement = document.getElementById('partidas-total-value');
        if (totalElement) {
            totalElement.textContent = `${this._calculateTotal().toFixed(2)} €`;
        }
        
        if (this.onUpdate) {
            this.onUpdate(this.getCleanPartidas());
        }
    }
    
    /**
     * Move a partida up or down
     * @param {string} id - Partida ID
     * @param {string} direction - 'up' or 'down'
     */
    movePartida(id, direction) {
        const index = this.partidas.findIndex(p => p._id === id);
        if (index === -1) return;
        
        if (direction === 'up' && index > 0) {
            // Swap with previous item
            [this.partidas[index], this.partidas[index - 1]] = 
            [this.partidas[index - 1], this.partidas[index]];
        } else if (direction === 'down' && index < this.partidas.length - 1) {
            // Swap with next item
            [this.partidas[index], this.partidas[index + 1]] = 
            [this.partidas[index + 1], this.partidas[index]];
        }
        
        this.render();
        
        if (this.onUpdate) {
            this.onUpdate(this.getCleanPartidas());
        }
    }
    
    /**
     * Calculate the total of all partidas
     * @returns {number} Total amount
     */
    _calculateTotal() {
        return this.partidas.reduce((sum, partida) => {
            const amount = parseFloat(partida.IMPORTE_PARTIDA) || 0;
            return sum + amount;
        }, 0);
    }
    
    /**
     * Get partidas without internal IDs
     * @returns {Array} Clean partidas array
     */
    getCleanPartidas() {
        return this.partidas.map(({ partida, IMPORTE_PARTIDA }) => ({
            partida,
            IMPORTE_PARTIDA
        }));
    }
    
    /**
     * Validate all partida entries
     * @returns {boolean} True if all valid
     */
    validate() {
        let isValid = true;
        
        // Remove any existing error classes
        document.querySelectorAll('.partida-item').forEach(item => {
            item.classList.remove('error');
        });
        
        // Check each partida
        this.partidas.forEach((partida) => {
            const partidaItem = document.querySelector(`.partida-item[data-id="${partida._id}"]`);
            if (!partidaItem) return;
            
            // Check if partida code is provided
            if (!partida.partida) {
                partidaItem.classList.add('error');
                isValid = false;
            }
            
            // Check if importe is valid
            if (typeof partida.IMPORTE_PARTIDA !== 'number' || isNaN(partida.IMPORTE_PARTIDA)) {
                partidaItem.classList.add('error');
                isValid = false;
            }
        });
        
        return isValid;
    }
}

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
        
        // Create tercero field with search button
        const terceroContainer = document.createElement('div');
        terceroContainer.className = 'form-field tercero-field';
        
        const terceroLabel = document.createElement('label');
        terceroLabel.htmlFor = 'tercero';
        terceroLabel.textContent = 'Tercero';
        
        const terceroInputContainer = document.createElement('div');
        terceroInputContainer.className = 'tercero-input-container';
        terceroInputContainer.style.display = 'flex';
        
        const terceroInput = document.createElement('input');
        terceroInput.type = 'text';
        terceroInput.id = 'tercero';
        terceroInput.name = 'tercero';
        terceroInput.value = this.task.detalle.tercero || '';
        terceroInput.style.flexGrow = '1';
        
        const searchButton = document.createElement('button');
        searchButton.type = 'button';
        searchButton.className = 'search-tercero-btn';
        searchButton.textContent = 'Buscar';
        searchButton.style.marginLeft = '5px';
        searchButton.style.padding = '5px 10px';
        searchButton.addEventListener('click', () => this._showTerceroSearchDialog());
        
        terceroInputContainer.appendChild(terceroInput);
        terceroInputContainer.appendChild(searchButton);
        
        terceroContainer.appendChild(terceroLabel);
        terceroContainer.appendChild(terceroInputContainer);
        
        grid.appendChild(terceroContainer);
        
        grid.appendChild(this._createFormField('naturaleza', 'Naturaleza', this.task.detalle.naturaleza || '', 'text'));
        
        section.appendChild(grid);
        return section;
    }
    
    
    _createPartidasSection() {
        const section = document.createElement('div');
        section.className = 'editor-section';
        
        // Create section header with heading only
        const headerContainer = document.createElement('div');
        headerContainer.className = 'section-header';
        
        const heading = document.createElement('h3');
        heading.textContent = 'Partidas';
        heading.className = 'section-heading';
        
        headerContainer.appendChild(heading);
        section.appendChild(headerContainer);
        
        // Container for the partidas manager
        const partidasContainer = document.createElement('div');
        partidasContainer.className = 'partidas-container';
        partidasContainer.id = 'partidasContainer';
        section.appendChild(partidasContainer);
        
        // Initialize the partidas manager with the partidas from task data
        const partidas = this.task.detalle.final && this.task.detalle.final.length > 0 ? 
            this.task.detalle.final : [{ partida: '', IMPORTE_PARTIDA: 0 }];
        
        // Create partidas manager instance
        this.partidasManager = new PartidasManager(
            partidasContainer, 
            partidas,
            (updatedPartidas) => {
                console.log('Partidas updated:', updatedPartidas);
                // If needed, update task data directly
                // this.task.detalle.final = updatedPartidas;
            }
        );
        
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
        
        // Ensure we're getting a number value
        let importeValue = partida.IMPORTE_PARTIDA;
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
        console.log(`Setting importe_partida_${index} value:`, {
            originalValue: partida.IMPORTE_PARTIDA,
            parsedValue: importeValue,
            inputValue: importeInput.value
        });
        
        importeInput.addEventListener('blur', (e) => {
            // Format the display when field loses focus
            const value = parseFloat(e.target.value) || 0;
            e.target.value = value;
            console.log(`importe_partida_${index} blur event:`, {
                rawValue: e.target.value,
                formattedValue: value
            });
        });
        
        importeInput.step = '0.01';
        
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
     * Create texto SICAL section with a single text field
     */
    _createTextoSicalSection() {
        const section = document.createElement('div');
        section.className = 'editor-section';
        
        // Create section header
        const headerContainer = document.createElement('div');
        headerContainer.className = 'section-header';
        
        const heading = document.createElement('h3');
        heading.textContent = 'Texto SICAL';
        heading.className = 'section-heading';
        
        headerContainer.appendChild(heading);
        section.appendChild(headerContainer);
        
        // Create a single texto input field
        const textoContainer = document.createElement('div');
        textoContainer.className = 'texto-container';
        textoContainer.id = 'textoContainer';
        
        // Get the first texto item or create an empty one
        const textoSical = this.task.detalle.texto_sical && this.task.detalle.texto_sical.length > 0 ? 
            this.task.detalle.texto_sical[0] : { tcargo: '', ado: '' };
        
        // Create a single form field for tcargo
        const tcargoField = document.createElement('div');
        tcargoField.className = 'form-field';
        
        const tcargoLabel = document.createElement('label');
        tcargoLabel.htmlFor = 'tcargo';
        tcargoLabel.textContent = 'Texto SICAL';
        
        const tcargoInput = document.createElement('textarea');
        tcargoInput.id = 'tcargo';
        tcargoInput.name = 'tcargo';
        tcargoInput.value = textoSical.tcargo || '';
        tcargoInput.rows = 3;
        tcargoInput.placeholder = 'Introduzca el texto SICAL';
        
        tcargoField.appendChild(tcargoLabel);
        tcargoField.appendChild(tcargoInput);
        
        textoContainer.appendChild(tcargoField);
        section.appendChild(textoContainer);
        
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

    
    getData() {
        // Get date from input and properly convert it
        const dateInput = document.getElementById('fecha');
        const rawDateValue = dateInput.value;
        const formattedDate = formatDateForStorage(rawDateValue);
        
        const task = {
            tipo: 'arqueo',
            detalle: {
                fecha: formattedDate,
                caja: document.getElementById('caja').value,
                tercero: document.getElementById('tercero').value,
                naturaleza: document.getElementById('naturaleza').value,
                final: [],
                texto_sical: [
                    {
                      tcargo: document.getElementById('tcargo').value,
                      ado: "" // We keep this field but don't let users modify it
                    }
                ]
            }
        };
        
        // Get partidas from the manager
        if (this.partidasManager) {
            task.detalle.final = this.partidasManager.getCleanPartidas();
        }
        
        return task;
    }
    
    /**
     * Update the validate method:
     */
    validate() {
        // Basic validation
        const requiredFields = ['fecha', 'caja', 'tcargo', 'naturaleza', 'tercero'];
        for (const field of requiredFields) {
            const element = document.getElementById(field);
            if (!element || !element.value.trim()) {
                alert(`El campo ${element?.labels[0]?.textContent || field} es obligatorio.`);
                element?.focus();
                return false;
            }
        }
        
        // Validate partidas using the manager
        if (this.partidasManager && !this.partidasManager.validate()) {
            alert('Por favor complete todos los campos de partidas correctamente.');
            return false;
        }
        
        
        
        return true;
    }

    _showTerceroSearchDialog() {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'search-modal-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = '2000';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        
        // Create modal content
        const modal = document.createElement('div');
        modal.className = 'search-modal';
        modal.style.backgroundColor = 'white';
        modal.style.padding = '20px';
        modal.style.borderRadius = '8px';
        modal.style.width = '500px';
        modal.style.maxWidth = '90%';
        modal.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        
        // Add search heading
        const heading = document.createElement('h3');
        heading.textContent = 'Buscar Tercero';
        heading.style.marginTop = '0';
        
        // Add search input
        const searchContainer = document.createElement('div');
        searchContainer.style.display = 'flex';
        searchContainer.style.marginBottom = '15px';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Nombre del tercero...';
        searchInput.style.flexGrow = '1';
        searchInput.style.padding = '8px';
        searchInput.style.border = '1px solid #ddd';
        searchInput.style.borderRadius = '4px';
        
        const searchButton = document.createElement('button');
        searchButton.textContent = 'Buscar';
        searchButton.style.marginLeft = '10px';
        searchButton.style.padding = '8px 15px';
        searchButton.style.backgroundColor = '#4285F4';
        searchButton.style.color = 'white';
        searchButton.style.border = 'none';
        searchButton.style.borderRadius = '4px';
        searchButton.style.cursor = 'pointer';
        
        searchContainer.appendChild(searchInput);
        searchContainer.appendChild(searchButton);
        
        // Add results container
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'search-results';
        resultsContainer.style.maxHeight = '300px';
        resultsContainer.style.overflowY = 'auto';
        resultsContainer.style.border = '1px solid #eee';
        resultsContainer.style.padding = '10px';
        resultsContainer.style.borderRadius = '4px';
        resultsContainer.style.marginBottom = '15px';
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Cerrar';
        closeButton.style.padding = '8px 15px';
        closeButton.style.backgroundColor = '#f1f1f1';
        closeButton.style.color = '#333';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '4px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.marginRight = '10px';
        
        // Buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.textAlign = 'right';
        buttonsContainer.appendChild(closeButton);
        
        // Assemble modal
        modal.appendChild(heading);
        modal.appendChild(searchContainer);
        modal.appendChild(resultsContainer);
        modal.appendChild(buttonsContainer);
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Focus the search input
        setTimeout(() => searchInput.focus(), 100);
        
        // Event handlers
        closeButton.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        const performSearch = async () => {
            const searchTerm = searchInput.value.trim();
            if (!searchTerm) return;
            
            resultsContainer.innerHTML = '<p>Buscando...</p>';
            
            try {
                // Use the IPC renderer to call the main process
                const { ipcRenderer } = require('electron');
                const result = await ipcRenderer.invoke('search-tercero', searchTerm);
                
                if (result && result.length > 0) {
                    resultsContainer.innerHTML = '';
                    
                    result.forEach(item => {
                        const resultItem = document.createElement('div');
                        resultItem.className = 'search-result-item';
                        resultItem.style.padding = '8px';
                        resultItem.style.cursor = 'pointer';
                        resultItem.style.borderBottom = '1px solid #eee';
                        
                        resultItem.innerHTML = `
                            <div><strong>${item.id}</strong></div>
                            <div>${item.name}</div>
                        `;
                        
                        resultItem.addEventListener('click', () => {
                            // Set the tercero value
                            document.getElementById('tercero').value = item.id;
                            document.body.removeChild(overlay);
                        });
                        
                        resultItem.addEventListener('mouseover', () => {
                            resultItem.style.backgroundColor = '#f5f5f5';
                        });
                        
                        resultItem.addEventListener('mouseout', () => {
                            resultItem.style.backgroundColor = 'transparent';
                        });
                        
                        resultsContainer.appendChild(resultItem);
                    });
                } else {
                    resultsContainer.innerHTML = '<p>No se encontraron resultados</p>';
                }
            } catch (error) {
                console.error('Error searching tercero:', error);
                resultsContainer.innerHTML = `<p>Error: ${error.message}</p>`;
            }
        };
        
        searchButton.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }
}
// Export module
module.exports = ArqueoEditor;
