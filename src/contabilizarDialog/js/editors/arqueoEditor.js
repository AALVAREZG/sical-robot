// Get ipcRenderer for IPC communication
const { ipcRenderer } = require('electron');

/**
 * Modified PartidasManager to support contraido field for naturaleza type 5
 */
class PartidasManager {
    /**
 * Constructor with improved handling of contraido field
 * @param {HTMLElement} container - Container element to render partidas
 * @param {Array} initialPartidas - Initial partidas data
 * @param {Function} onUpdate - Callback when partidas are updated
 * @param {String} naturaleza - The naturaleza value from the parent form
 */
constructor(container, initialPartidas = [], onUpdate = null, naturaleza = "") {
    this.container = container;
    this.partidas = Array.isArray(initialPartidas) ? [...initialPartidas] : [];
    this.onUpdate = onUpdate;
    this.naturaleza = naturaleza;
    
    // Ensure we have at least one empty partida
    if (this.partidas.length === 0) {
        this.partidas.push({ partida: '', IMPORTE_PARTIDA: 0 });
    }
    
        // Process partidas to handle contraido field correctly
        this.partidas = this.partidas.map(partida => {
            const newPartida = {
                ...partida,
                _id: this._generateUniqueId()
            };
            
            // Handle contraido field based on naturaleza
            if (this.naturaleza === "5") {
                // Ensure contraido exists with correct format if naturaleza is 5
                if (newPartida.contraido === undefined) {
                    newPartida.contraido = false;
                } else if (newPartida.contraido === "True" || newPartida.contraido === "true") {
                    // Convert string boolean to actual boolean
                    newPartida.contraido = true;
                }
                // Other cases (false, string values, etc.) are left as-is
            } else {
                // If naturaleza is not 5, we can remove contraido if it exists
                // but we'll keep it in the data model for now in case naturaleza changes
            }
            
            return newPartida;
        });
        
        // Debug
        console.log('PartidasManager initialized with naturaleza:', this.naturaleza);
        console.log('Processed partidas:', this.partidas);
        
        // Initialize the UI
        this.render();
    }
    
    /**
     * Set the naturaleza value and update the UI if needed
     * @param {String} naturaleza - The new naturaleza value
     */
    setNaturaleza(naturaleza) {
        if (this.naturaleza !== naturaleza) {
            this.naturaleza = naturaleza;
            this.render(); // Re-render to reflect changes
        }
    }
    
    /**
     * Generate a unique ID for partida items
     * @returns {string} Unique ID
     */
    _generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }
    
    render() {
        // Clear the container
        this.container.innerHTML = '';

        // Add each partida (no header - cleaner UI)
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
        addButton.className = 'btn-add-partida';
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
     * Check if contraido field is required based on naturaleza
     * @returns {boolean} True if contraido is required
     */
    _isContraidoRequired() {
        return this.naturaleza === "5";
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
            
            .partidas-row.with-contraido {
                grid-template-columns: 1fr 1fr 1fr auto;
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
            
            .partida-col, .importe-col, .contraido-col, .actions-col {
                padding: 5px;
            }
            
            .partida-input, .importe-input, .contraido-input, .contraido-select {
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
            
            .contraido-toggle-container {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .contraido-toggle {
                position: relative;
                display: inline-block;
                width: 40px;
                height: 20px;
            }
            
            .contraido-toggle input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            
            .slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #ccc;
                -webkit-transition: .4s;
                transition: .4s;
                border-radius: 20px;
            }
            
            .slider:before {
                position: absolute;
                content: "";
                height: 16px;
                width: 16px;
                left: 2px;
                bottom: 2px;
                background-color: white;
                -webkit-transition: .4s;
                transition: .4s;
                border-radius: 50%;
            }
            
            input:checked + .slider {
                background-color: #2196F3;
            }
            
            input:focus + .slider {
                box-shadow: 0 0 1px #2196F3;
            }
            
            input:checked + .slider:before {
                -webkit-transform: translateX(20px);
                -ms-transform: translateX(20px);
                transform: translateX(20px);
            }
            
            .contraido-mode-container {
                margin-top: 5px;
                display: none;
            }
            
            .contraido-mode-container.visible {
                display: block;
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
        row.className = this._isContraidoRequired() ? 'partidas-row with-contraido' : 'partidas-row';
        
        // Partida input
        const partidaCol = document.createElement('div');
        partidaCol.className = 'partida-col';
        const partidaInput = document.createElement('input');
        partidaInput.type = 'text';
        partidaInput.className = 'partida-input';
        partidaInput.value = partida.partida || '';
        partidaInput.placeholder = 'Código partida';
        partidaInput.id = `partida-${partida._id}`;
        // Add partida description display
        const partidaDescDisplay = document.createElement('div');
        partidaDescDisplay.className = 'partida-description';
        partidaDescDisplay.id = `partida-desc-${partida._id}`;
        partidaCol.appendChild(partidaDescDisplay);

        partidaInput.addEventListener('change', async (e) => {
            this.updatePartida(partida._id, { partida: e.target.value });
            // Update description - pass element directly!
            await this._updatePartidaDescriptionDirectly(e.target.value, partidaDescDisplay);
        });
        partidaCol.appendChild(partidaInput);

        // Load initial description if partida exists
        if (partida.partida) {
            this._updatePartidaDescriptionDirectly(partida.partida, partidaDescDisplay);
        }
        
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
        
        // Contraido field (only if naturaleza is 5)
        if (this._isContraidoRequired()) {
            const contraidoCol = document.createElement('div');
            contraidoCol.className = 'contraido-col';
            
            // Create toggle container
            const contraidoToggleContainer = document.createElement('div');
            contraidoToggleContainer.className = 'contraido-toggle-container';
            
            // Create the toggle switch
            const contraidoToggle = document.createElement('label');
            contraidoToggle.className = 'contraido-toggle';
            
            const contraidoCheckbox = document.createElement('input');
            contraidoCheckbox.type = 'checkbox';
            contraidoCheckbox.id = `contraido-toggle-${partida._id}`;
            
            // Determine if contraido has a value
            let contraidoValue = partida.contraido;
            let isBoolean = typeof contraidoValue === 'boolean';
            let isTrue = contraidoValue === true || contraidoValue === "True" || contraidoValue === "true";
            
            // Handle the case where contraido wasn't explicitly set but should be included
            if (contraidoValue === undefined && this._isContraidoRequired()) {
                contraidoValue = false;
                partida.contraido = false;
                isBoolean = true;
            }
            
            // Set initial state
            contraidoCheckbox.checked = isTrue;
            
            // Create the slider
            const slider = document.createElement('span');
            slider.className = 'slider';
            
            contraidoToggle.appendChild(contraidoCheckbox);
            contraidoToggle.appendChild(slider);
            
            // Create the label
            const contraidoLabel = document.createElement('span');
            contraidoLabel.textContent = 'Contraído';
            
            contraidoToggleContainer.appendChild(contraidoToggle);
            contraidoToggleContainer.appendChild(contraidoLabel);
            
            // Create the input field for contraido number (visible when custom)
            const contraidoModeContainer = document.createElement('div');
            contraidoModeContainer.className = 'contraido-mode-container';
            contraidoModeContainer.id = `contraido-mode-container-${partida._id}`;
            
            // If it's a non-boolean value, show the text field
            if (contraidoValue && !isBoolean) {
                contraidoModeContainer.classList.add('visible');
                contraidoCheckbox.checked = true;
            }
            
            const contraidoInput = document.createElement('input');
            contraidoInput.type = 'text';
            contraidoInput.className = 'contraido-input';
            contraidoInput.id = `contraido-value-${partida._id}`;
            contraidoInput.placeholder = 'Valor específico (ej: 2500046)';
            
            // Set the value if it's non-boolean
            if (contraidoValue && !isBoolean) {
                contraidoInput.value = contraidoValue;
            }
            
            contraidoModeContainer.appendChild(contraidoInput);
            
            // Event listener for the checkbox
            contraidoCheckbox.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                contraidoModeContainer.classList.toggle('visible', isChecked);
                
                // Update the partida
                if (isChecked) {
                    // If there's a value in the input field, use it; otherwise, use boolean
                    const inputValue = contraidoInput.value.trim();
                    this.updatePartida(partida._id, { 
                        contraido: inputValue ? inputValue : true 
                    });
                } else {
                    this.updatePartida(partida._id, { contraido: false });
                }
            });
            
            // Event listener for the input field
            contraidoInput.addEventListener('change', (e) => {
                const value = e.target.value.trim();
                this.updatePartida(partida._id, { 
                    contraido: value || true 
                });
            });
            
            contraidoCol.appendChild(contraidoToggleContainer);
            contraidoCol.appendChild(contraidoModeContainer);
            
            row.appendChild(contraidoCol);
        }
        
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
        
        // Add contraido property if needed
        if (this._isContraidoRequired()) {
            newPartida.contraido = false;
        }
        
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
        
        // If this is a contraido update, update the UI
        if ('contraido' in newData) {
            const contraidoValue = newData.contraido;
            const contraidoCheckbox = document.getElementById(`contraido-toggle-${id}`);
            const contraidoInput = document.getElementById(`contraido-value-${id}`);
            const contraidoContainer = document.getElementById(`contraido-mode-container-${id}`);
            
            if (contraidoCheckbox && contraidoValue !== undefined) {
                const isTrue = contraidoValue === true || contraidoValue === "True" || contraidoValue === "true";
                contraidoCheckbox.checked = isTrue || (contraidoValue && typeof contraidoValue !== 'boolean');
                
                if (contraidoContainer) {
                    contraidoContainer.classList.toggle('visible', contraidoCheckbox.checked);
                }
                
                if (contraidoInput && typeof contraidoValue !== 'boolean' && contraidoValue !== true) {
                    contraidoInput.value = contraidoValue;
                }
            }
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
        return this.partidas.map(partida => {
            // Create a base partida object
            const cleanPartida = {
                partida: partida.partida,
                IMPORTE_PARTIDA: partida.IMPORTE_PARTIDA
            };
            
            // Add contraido if it exists and naturaleza is 5
            if (this._isContraidoRequired() && partida.contraido !== undefined) {
                cleanPartida.contraido = partida.contraido;
            }
            
            // Include any other properties that might exist (like 'proyecto')
            Object.keys(partida).forEach(key => {
                if (!['_id', 'partida', 'IMPORTE_PARTIDA', 'contraido'].includes(key) && partida[key] !== undefined) {
                    cleanPartida[key] = partida[key];
                }
            });
            
            return cleanPartida;
        });
    }
    
    /**
     * Update partida description directly into provided element
     * @param {string} partidaCode - The partida code to lookup
     * @param {HTMLElement} displayElement - The element to update
     */
    async _updatePartidaDescriptionDirectly(partidaCode, displayElement) {
        if (!displayElement) {
            console.log('[PartidasManager] description element not provided!');
            return;
        }

        console.log('[PartidasManager] Loading partida description for:', partidaCode);

        if (!partidaCode || partidaCode.trim() === '') {
            displayElement.textContent = '';
            return;
        }

        try {
            // Try 'ingreso' first, then 'gasto', then 'no_presupuestaria' as fallback
            let mappingInfo = await ipcRenderer.invoke('get-mapping-info', 'ingreso', partidaCode.trim());
            let partidaData = mappingInfo.success ? mappingInfo.data : null;

            if (!partidaData || !partidaData.found) {
                mappingInfo = await ipcRenderer.invoke('get-mapping-info', 'gasto', partidaCode.trim());
                partidaData = mappingInfo.success ? mappingInfo.data : null;
            }

            if (!partidaData || !partidaData.found) {
                mappingInfo = await ipcRenderer.invoke('get-mapping-info', 'no_presupuestaria', partidaCode.trim());
                partidaData = mappingInfo.success ? mappingInfo.data : null;
            }

            if (partidaData && partidaData.found && partidaData.description) {
                displayElement.textContent = partidaData.description;
                console.log('[PartidasManager] ✅ Set partida description:', partidaData.description);
            } else {
                displayElement.textContent = 'Sin descripción';
            }
        } catch (error) {
            console.error('[PartidasManager] Error loading partida description:', error);
            displayElement.textContent = '';
        }
    }

    /**
     * Update partida description display (OLD METHOD using getElementById)
     * @param {string} partidaId - The partida unique ID
     * @param {string} partidaCode - The partida code to lookup
     */
    async _updatePartidaDescription(partidaId, partidaCode) {
        const displayElement = document.getElementById(`partida-desc-${partidaId}`);
        if (!displayElement) return;

        if (!partidaCode || partidaCode.trim() === '') {
            displayElement.textContent = '';
            return;
        }

        try {
            // Try 'ingreso' first, then 'gasto', then 'no_presupuestaria' as fallback
            let mappingInfo = await ipcRenderer.invoke('get-mapping-info', 'ingreso', partidaCode.trim());
            let partidaData = mappingInfo.success ? mappingInfo.data : null;

            if (!partidaData || !partidaData.found) {
                mappingInfo = await ipcRenderer.invoke('get-mapping-info', 'gasto', partidaCode.trim());
                partidaData = mappingInfo.success ? mappingInfo.data : null;
            }

            if (!partidaData || !partidaData.found) {
                mappingInfo = await ipcRenderer.invoke('get-mapping-info', 'no_presupuestaria', partidaCode.trim());
                partidaData = mappingInfo.success ? mappingInfo.data : null;
            }

            if (partidaData && partidaData.found && partidaData.description) {
                displayElement.textContent = partidaData.description;
            } else {
                displayElement.textContent = 'Sin descripción';
            }
        } catch (error) {
            console.error('Error loading partida description:', error);
            displayElement.textContent = '';
        }
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
            
            // Check contraido field if required
            if (this._isContraidoRequired()) {
                const contraidoCheckbox = document.getElementById(`contraido-toggle-${partida._id}`);
                const contraidoInput = document.getElementById(`contraido-value-${partida._id}`);
                
                if (contraidoCheckbox && contraidoCheckbox.checked && contraidoInput) {
                    // If checkbox is checked but input is empty, it's just a boolean true
                    if (contraidoInput.value.trim() === '') {
                        partida.contraido = true;
                    } else {
                        partida.contraido = contraidoInput.value.trim();
                    }
                } else if (contraidoCheckbox) {
                    partida.contraido = contraidoCheckbox.checked;
                }
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
     * Render the editor form with special handling of contraido field
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
        
        // Set naturaleza event handler to update partidas when naturaleza changes
        const naturalezaSelect = document.getElementById('naturaleza');
        if (naturalezaSelect) {
            naturalezaSelect.addEventListener('change', (e) => {
                this.naturaleza = e.target.value;

                if (this.partidasManager) {
                    console.log('Updating PartidaManager naturaleza to:', this.naturaleza);
                    this.partidasManager.setNaturaleza(this.naturaleza);
                }
            });
        }

        // CRITICAL FIX: Force focus on first input to enable keyboard input
        // This fixes the issue where keyboard is blocked when editing existing tasks
        setTimeout(() => {
            const firstInput = this.container.querySelector('input, textarea, select');
            if (firstInput) {
                firstInput.focus();
                console.log('ArqueoEditor: Focused first input');
            }
        }, 150);
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

        // Create caja field with name display
        const cajaContainer = document.createElement('div');
        cajaContainer.className = 'form-field caja-field';

        const cajaLabel = document.createElement('label');
        cajaLabel.htmlFor = 'caja';
        cajaLabel.textContent = 'Caja';

        const cajaInput = document.createElement('input');
        cajaInput.type = 'text';
        cajaInput.id = 'caja';
        cajaInput.name = 'caja';
        cajaInput.value = this.task.detalle.caja || '';
        cajaInput.title = 'Código de caja'; // Tooltip

        cajaContainer.appendChild(cajaLabel);
        cajaContainer.appendChild(cajaInput);

        // Add caja name display BELOW input (like ADO editor)
        const cajaNameDisplay = document.createElement('div');
        cajaNameDisplay.className = 'caja-name-display';
        cajaNameDisplay.id = 'caja-name-arqueo';
        cajaContainer.appendChild(cajaNameDisplay);

        grid.appendChild(cajaContainer);

        // Load caja name immediately - pass the display element directly!
        if (this.task.detalle.caja) {
            this._loadCajaNameDirectly(this.task.detalle.caja, cajaNameDisplay);
        }

        // Add event listener to update name when caja changes
        cajaInput.addEventListener('blur', (e) => {
            this._loadCajaNameDirectly(e.target.value, cajaNameDisplay);
        });
        
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

        

        // Add tercero denomination display
        const terceroDenomDisplay = document.createElement('div');
        terceroDenomDisplay.className = 'tercero-denomination-display';
        terceroDenomDisplay.id = 'tercero-denomination';

        terceroContainer.appendChild(terceroLabel);
        terceroContainer.appendChild(terceroInputContainer);
        terceroContainer.appendChild(terceroDenomDisplay);

        grid.appendChild(terceroContainer);

        // Load tercero denomination - pass element directly!
        if (this.task.detalle.tercero) {
            this._loadTerceroDenominationDirectly(this.task.detalle.tercero, terceroDenomDisplay);
        }

        // Add event listener to update denomination when tercero changes
        terceroInput.addEventListener('blur', (e) => {
            this._loadTerceroDenominationDirectly(e.target.value, terceroDenomDisplay);
        });
        
        grid.appendChild(this._createFormField('naturaleza', 'Naturaleza', this.task.detalle.naturaleza || '', 'text'));
        
        section.appendChild(grid);
        return section;
    }
    
    
    /**
     * Modified _createPartidasSection method to properly handle contraido field in task data
     */
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
        
        // Get naturaleza from current task
        this.naturaleza = this.task.detalle.naturaleza || '';
        
        // Initialize the partidas manager with the partidas from task data
        let partidas = [];
        
        if (this.task.detalle.final && this.task.detalle.final.length > 0) {
            // Copy the partidas with proper type conversion for contraido
            partidas = this.task.detalle.final.map(p => {
                const partida = { ...p };
                
                // Handle contraido value if it exists
                if (partida.contraido !== undefined) {
                    // Convert string boolean values to actual booleans
                    if (partida.contraido === "True" || partida.contraido === "true") {
                        partida.contraido = true;
                    } else if (partida.contraido === "False" || partida.contraido === "false") {
                        partida.contraido = false;
                    }
                    // Other values (like specific strings) are kept as-is
                }
                
                return partida;
            });
        } else {
            // Create a default partida
            partidas = [{ partida: '', IMPORTE_PARTIDA: 0 }];
            
            // Add contraido if naturaleza is 5
            if (this.naturaleza === "5") {
                partidas[0].contraido = false;
            }
        }
        
        console.log('Creating PartidaManager with partidas:', partidas);
        console.log('Current naturaleza:', this.naturaleza);
        
        // Create partidas manager instance with naturaleza and processed partidas
        this.partidasManager = new PartidasManager(
            partidasContainer, 
            partidas,
            (updatedPartidas) => {
                console.log('Partidas updated:', updatedPartidas);
            },
            this.naturaleza  // Pass the naturaleza value
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
        
        // Create container for button + textarea
        const inputContainer = document.createElement('div');
        inputContainer.style.display = 'flex';
        inputContainer.style.gap = '8px';
        inputContainer.style.alignItems = 'flex-start';

        // Create _FIN button
        const finButton = document.createElement('button');
        finButton.type = 'button';
        finButton.textContent = '_FIN';
        finButton.className = 'btn-add-fin';
        finButton.style.padding = '8px 12px';
        finButton.style.backgroundColor = '#FF9800';
        finButton.style.color = 'white';
        finButton.style.border = 'none';
        finButton.style.borderRadius = '4px';
        finButton.style.cursor = 'pointer';
        finButton.style.fontWeight = 'bold';
        finButton.style.fontSize = '0.85em';
        finButton.style.whiteSpace = 'nowrap';
        finButton.style.height = 'fit-content';

        const tcargoInput = document.createElement('textarea');
        tcargoInput.id = 'tcargo';
        tcargoInput.name = 'tcargo';
        tcargoInput.value = textoSical.tcargo || '';
        tcargoInput.rows = 3;
        tcargoInput.placeholder = 'Introduzca el texto SICAL';
        tcargoInput.style.textTransform = 'uppercase';
        tcargoInput.style.flexGrow = '1';

        // Force uppercase on input
        tcargoInput.addEventListener('input', (e) => {
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            e.target.value = e.target.value.toUpperCase();
            e.target.setSelectionRange(start, end);
        });

        // Add _FIN to the end of the text
        finButton.addEventListener('click', () => {
            const currentValue = tcargoInput.value.trim();
            if (!currentValue.endsWith('_FIN')) {
                tcargoInput.value = currentValue + ' _FIN';
            }
        });

        inputContainer.appendChild(finButton);
        inputContainer.appendChild(tcargoInput);

        tcargoField.appendChild(tcargoLabel);
        tcargoField.appendChild(inputContainer);
        
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

    /**
     * Load and display tercero denomination directly into provided element
     * @param {string} terceroCode - The tercero code to lookup
     * @param {HTMLElement} displayElement - The element to update
     */
    async _loadTerceroDenominationDirectly(terceroCode, displayElement) {
        if (!displayElement) {
            console.log('[ArqueoEditor] tercero display element not provided!');
            return;
        }

        console.log('[ArqueoEditor] Loading tercero denomination for:', terceroCode);

        if (!terceroCode || terceroCode.trim() === '') {
            displayElement.textContent = '';
            return;
        }

        try {
            const result = await ipcRenderer.invoke('get-tercero-denomination', terceroCode.trim());
            if (result.success && result.denomination && result.denomination !== 'Unknown') {
                displayElement.textContent = result.denomination;
                console.log('[ArqueoEditor] ✅ Set tercero denomination:', result.denomination);
            } else {
                displayElement.textContent = 'Tercero no encontrado';
            }
        } catch (error) {
            console.error('[ArqueoEditor] Error loading tercero denomination:', error);
            displayElement.textContent = '';
        }
    }

    /**
     * Load and display tercero denomination (OLD METHOD using getElementById)
     * @param {string} terceroCode - The tercero code to lookup
     */
    async _loadTerceroDenomination(terceroCode) {
        console.log('[ArqueoEditor] _loadTerceroDenomination called with:', terceroCode);
        const displayElement = document.getElementById('tercero-denomination');
        console.log('[ArqueoEditor] Display element found:', !!displayElement);
        if (!displayElement) return;

        if (!terceroCode || terceroCode.trim() === '') {
            displayElement.textContent = '';
            return;
        }

        try {
            console.log('[ArqueoEditor] Invoking get-tercero-denomination for:', terceroCode.trim());
            const result = await ipcRenderer.invoke('get-tercero-denomination', terceroCode.trim());
            console.log('[ArqueoEditor] Result:', result);
            if (result.success && result.denomination && result.denomination !== 'Unknown') {
                displayElement.textContent = result.denomination;
                console.log('[ArqueoEditor] Set denomination:', result.denomination);
            } else {
                displayElement.textContent = 'Tercero no encontrado';
                console.log('[ArqueoEditor] Tercero not found');
            }
        } catch (error) {
            console.error('[ArqueoEditor] Error loading tercero denomination:', error);
            displayElement.textContent = '';
        }
    }

    /**
     * Load and display caja name directly into provided span element
     * @param {string} cajaCode - The caja code to lookup
     * @param {HTMLElement} spanElement - The span element to update
     */
    async _loadCajaNameDirectly(cajaCode, displayElement) {
        if (!displayElement) {
            console.log('[ArqueoEditor] display element not provided!');
            return;
        }

        console.log('[ArqueoEditor] Loading caja name for:', cajaCode);

        if (!cajaCode || cajaCode.trim() === '') {
            displayElement.textContent = '';
            return;
        }

        try {
            const result = await ipcRenderer.invoke('get-all-cajas');
            if (result.status === 'success' && result.data) {
                const matchingCaja = result.data.find(c => {
                    const cajaField = c.caja || '';
                    return cajaField === cajaCode || cajaField.includes(cajaCode);
                });

                if (matchingCaja && matchingCaja.caja) {
                    displayElement.textContent = matchingCaja.caja;
                    console.log('[ArqueoEditor] ✅ Set caja name:', matchingCaja.caja);
                } else {
                    displayElement.textContent = 'Caja no encontrada';
                }
            } else {
                displayElement.textContent = '';
            }
        } catch (error) {
            console.error('[ArqueoEditor] Error loading caja name:', error);
            displayElement.textContent = '';
        }
    }

    /**
     * Load and display caja name in label span (OLD METHOD using getElementById)
     * @param {string} cajaCode - The caja code to lookup
     */
    async _loadCajaNameToLabel(cajaCode) {
        const labelSpan = document.getElementById('caja-name-label');
        if (!labelSpan) {
            console.log('[ArqueoEditor] caja-name-label span NOT FOUND!');
            return;
        }

        console.log('[ArqueoEditor] caja-name-label span FOUND!');

        if (!cajaCode || cajaCode.trim() === '') {
            labelSpan.textContent = '';
            return;
        }

        try {
            const result = await ipcRenderer.invoke('get-all-cajas');
            if (result.status === 'success' && result.data) {
                const matchingCaja = result.data.find(c => {
                    const cajaField = c.caja || '';
                    return cajaField === cajaCode || cajaField.includes(cajaCode);
                });

                if (matchingCaja && matchingCaja.caja) {
                    if (matchingCaja.caja !== cajaCode && matchingCaja.caja.includes('_')) {
                        labelSpan.textContent = `(${matchingCaja.caja})`;
                        console.log('[ArqueoEditor] Set caja name to label:', matchingCaja.caja);
                    } else {
                        labelSpan.textContent = '';
                    }
                } else {
                    labelSpan.textContent = '';
                }
            }
        } catch (error) {
            console.error('[ArqueoEditor] Error loading caja name:', error);
            labelSpan.textContent = '';
        }
    }

    /**
     * Load and display caja name (OLD METHOD - kept for compatibility)
     * @param {string} cajaCode - The caja code to lookup
     */
    async _loadCajaName(cajaCode) {
        const displayElement = document.getElementById('caja-name');
        if (!displayElement) return;

        if (!cajaCode || cajaCode.trim() === '') {
            displayElement.textContent = '';
            return;
        }

        try {
            // Get all cajas to find the matching one
            const result = await ipcRenderer.invoke('get-all-cajas');
            if (result.status === 'success' && result.data) {
                // Find caja that matches the code
                const matchingCaja = result.data.find(c => {
                    const cajaField = c.caja || '';
                    // Check if it's an exact match or if the code is part of the caja name
                    return cajaField === cajaCode || cajaField.includes(cajaCode);
                });

                if (matchingCaja && matchingCaja.caja) {
                    // If the caja already contains the full name, show it
                    if (matchingCaja.caja !== cajaCode && matchingCaja.caja.includes('_')) {
                        displayElement.textContent = matchingCaja.caja;
                    } else {
                        displayElement.textContent = '';
                    }
                } else {
                    displayElement.textContent = '';
                }
            }
        } catch (error) {
            console.error('Error loading caja name:', error);
            displayElement.textContent = '';
        }
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
