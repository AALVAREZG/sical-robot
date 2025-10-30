// Get ipcRenderer for IPC communication
const { ipcRenderer } = require('electron');

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

        // CRITICAL FIX: Force focus on first input to enable keyboard input
        // This fixes the issue where keyboard is blocked when editing existing tasks
        setTimeout(() => {
            const firstInput = this.container.querySelector('input, textarea, select');
            if (firstInput) {
                firstInput.focus();
                console.log('AdoEditor: Focused first input');
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
        
        // Add first row of fields
        grid.appendChild(this._createFormField('fecha', 'Fecha', this.task.detalle.fecha || '', 'date'));
        grid.appendChild(this._createFormField('expediente', 'Expediente', this.task.detalle.expediente || '', 'text'));

        // Create tercero field with denomination display
        const terceroContainer = document.createElement('div');
        terceroContainer.className = 'form-field tercero-field';

        const terceroLabel = document.createElement('label');
        terceroLabel.htmlFor = 'tercero';
        terceroLabel.textContent = 'Tercero';

        // Create input container with flex layout for input + button
        const terceroInputContainer = document.createElement('div');
        terceroInputContainer.className = 'tercero-input-container';
        terceroInputContainer.style.display = 'flex';
        terceroInputContainer.style.gap = '8px';

        const terceroInput = document.createElement('input');
        terceroInput.type = 'text';
        terceroInput.id = 'tercero';
        terceroInput.name = 'tercero';
        terceroInput.value = this.task.detalle.tercero || '';
        terceroInput.style.flexGrow = '1';

        // Create search button
        const searchButton = document.createElement('button');
        searchButton.type = 'button';
        searchButton.className = 'btn-tercero-search';
        searchButton.textContent = 'Buscar';
        searchButton.addEventListener('click', () => this._showTerceroSearchDialog());

        terceroInputContainer.appendChild(terceroInput);
        terceroInputContainer.appendChild(searchButton);

        terceroContainer.appendChild(terceroLabel);
        terceroContainer.appendChild(terceroInputContainer);

        // Add tercero denomination display
        const terceroDenomDisplay = document.createElement('div');
        terceroDenomDisplay.className = 'tercero-denomination-display';
        terceroDenomDisplay.id = 'tercero-denomination-ado';
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

        cajaContainer.appendChild(cajaLabel);
        cajaContainer.appendChild(cajaInput);

        // Add caja name display
        const cajaNameDisplay = document.createElement('div');
        cajaNameDisplay.className = 'caja-name-display';
        cajaNameDisplay.id = 'caja-name-ado';
        cajaContainer.appendChild(cajaNameDisplay);

        grid.appendChild(cajaContainer);

        // Load caja name - pass element directly!
        if (this.task.detalle.caja) {
            this._loadCajaNameDirectly(this.task.detalle.caja, cajaNameDisplay);
        }

        // Add event listener to update name when caja changes
        cajaInput.addEventListener('blur', (e) => {
            this._loadCajaNameDirectly(e.target.value, cajaNameDisplay);
        });
        
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
        addButton.className = 'btn-add-aplicacion';
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
        const funcionalField = this._createFormFieldWithDescription(`funcional_${index}`, 'Funcional', aplicacion.funcional || '', 'text', 'funcional');
        const economicaField = this._createFormFieldWithDescription(`economica_${index}`, 'Económica', aplicacion.economica || '', 'text', 'economica');
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
     * Create a form field with description lookup
     * @param {string} id - Field ID
     * @param {string} label - Field label
     * @param {string} value - Field value
     * @param {string} type - Input type
     * @param {string} mappingType - Type of mapping to lookup (funcional or economica)
     */
    _createFormFieldWithDescription(id, label, value, type = 'text', mappingType) {
        const field = document.createElement('div');
        field.className = 'form-field';

        const labelEl = document.createElement('label');
        labelEl.htmlFor = id;
        labelEl.textContent = label;

        const input = document.createElement('input');
        input.type = type;
        input.id = id;
        input.name = id;
        input.value = value;

        field.appendChild(labelEl);
        field.appendChild(input);

        // Add description display with professional styling
        const descDisplay = document.createElement('div');
        descDisplay.className = 'mapping-description';
        descDisplay.id = `${id}-desc`;
        field.appendChild(descDisplay);

        // Load initial description if value exists - pass element directly!
        if (value) {
            this._loadMappingDescriptionDirectly(value, mappingType, descDisplay);
        }

        // Add event listener to update description when value changes
        input.addEventListener('blur', (e) => {
            this._loadMappingDescriptionDirectly(e.target.value, mappingType, descDisplay);
        });

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

        const textarea = document.createElement('textarea');
        textarea.id = id;
        textarea.name = id;
        textarea.value = value;
        textarea.rows = 3;
        textarea.style.textTransform = 'uppercase';
        textarea.style.flexGrow = '1';

        // Force uppercase on input
        textarea.addEventListener('input', (e) => {
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            e.target.value = e.target.value.toUpperCase();
            e.target.setSelectionRange(start, end);
        });

        // Add _FIN to the end of the text
        finButton.addEventListener('click', () => {
            const currentValue = textarea.value.trim();
            if (!currentValue.endsWith('_FIN')) {
                textarea.value = currentValue + ' _FIN';
            }
        });

        inputContainer.appendChild(finButton);
        inputContainer.appendChild(textarea);

        field.appendChild(labelEl);
        field.appendChild(inputContainer);
        
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

    /**
     * Load and display tercero denomination
     * @param {string} terceroCode - The tercero code to lookup
     */
    async _loadTerceroDenomination(terceroCode) {
        const displayElement = document.getElementById('tercero-denomination-ado');
        if (!displayElement) return;

        if (!terceroCode || terceroCode.trim() === '') {
            displayElement.textContent = '';
            return;
        }

        try {
            const result = await ipcRenderer.invoke('get-tercero-denomination', terceroCode.trim());
            if (result.success && result.denomination && result.denomination !== 'Unknown') {
                displayElement.textContent = result.denomination;
            } else {
                displayElement.textContent = 'Tercero no encontrado';
            }
        } catch (error) {
            console.error('Error loading tercero denomination:', error);
            displayElement.textContent = '';
        }
    }

    /**
     * Load and display caja name
     * @param {string} cajaCode - The caja code to lookup
     */
    async _loadCajaName(cajaCode) {
        const displayElement = document.getElementById('caja-name-ado');
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

    /**
     * Load and display mapping description directly into provided element
     * @param {string} code - The code to lookup
     * @param {string} mappingType - Type of mapping (funcional or economica)
     * @param {HTMLElement} displayElement - The element to update
     */
    async _loadMappingDescriptionDirectly(code, mappingType, displayElement) {
        if (!displayElement) {
            console.log('[AdoEditor] mapping description element not provided!');
            return;
        }

        console.log(`[AdoEditor] Loading ${mappingType} description for:`, code);

        if (!code || code.trim() === '') {
            displayElement.textContent = '';
            return;
        }

        try {
            const mappingInfo = await ipcRenderer.invoke('get-mapping-info', mappingType, code.trim());
            const data = mappingInfo.success ? mappingInfo.data : null;

            if (data && data.found && data.description) {
                displayElement.textContent = data.description;
                console.log(`[AdoEditor] ✅ Set ${mappingType} description:`, data.description);
            } else {
                displayElement.textContent = 'Sin descripción';
            }
        } catch (error) {
            console.error(`[AdoEditor] Error loading ${mappingType} description:`, error);
            displayElement.textContent = '';
        }
    }

    /**
     * Load and display tercero denomination by passing element directly
     * @param {string} terceroCode - Tercero code to lookup
     * @param {HTMLElement} displayElement - The display element to update
     */
    async _loadTerceroDenominationDirectly(terceroCode, displayElement) {
        if (!displayElement) {
            console.log('[AdoEditor] tercero display element not provided!');
            return;
        }

        console.log('[AdoEditor] Loading tercero denomination for:', terceroCode);

        if (!terceroCode || terceroCode.trim() === '') {
            displayElement.textContent = '';
            return;
        }

        try {
            const result = await ipcRenderer.invoke('get-tercero-denomination', terceroCode.trim());

            if (result.success && result.denomination && result.denomination !== 'Unknown') {
                displayElement.textContent = result.denomination;
                console.log('[AdoEditor] ✅ Set tercero denomination:', result.denomination);
            } else {
                displayElement.textContent = 'Tercero no encontrado';
            }
        } catch (error) {
            console.error('[AdoEditor] Error loading tercero denomination:', error);
            displayElement.textContent = '';
        }
    }

    /**
     * Load and display caja name by passing element directly
     * @param {string} cajaCode - Caja code to lookup
     * @param {HTMLElement} displayElement - The display element to update
     */
    async _loadCajaNameDirectly(cajaCode, displayElement) {
        if (!displayElement) {
            console.log('[AdoEditor] caja display element not provided!');
            return;
        }

        console.log('[AdoEditor] Loading caja name for:', cajaCode);

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
                    console.log('[AdoEditor] ✅ Set caja name:', matchingCaja.caja);
                } else {
                    displayElement.textContent = 'Caja no encontrada';
                }
            } else {
                displayElement.textContent = '';
            }
        } catch (error) {
            console.error('[AdoEditor] Error loading caja name:', error);
            displayElement.textContent = '';
        }
    }

    /**
     * Load and display mapping description (OLD METHOD using getElementById)
     * @param {string} fieldId - The field ID
     * @param {string} code - The code to lookup
     * @param {string} mappingType - Type of mapping (funcional or economica)
     */
    async _loadMappingDescription(fieldId, code, mappingType) {
        const displayElement = document.getElementById(`${fieldId}-desc`);
        if (!displayElement) return;

        if (!code || code.trim() === '') {
            displayElement.textContent = '';
            return;
        }

        try {
            const mappingInfo = await ipcRenderer.invoke('get-mapping-info', mappingType, code.trim());
            const data = mappingInfo.success ? mappingInfo.data : null;

            if (data && data.found && data.description) {
                displayElement.textContent = data.description;
            } else {
                displayElement.textContent = 'Sin descripción';
            }
        } catch (error) {
            console.error(`Error loading ${mappingType} description:`, error);
            displayElement.textContent = '';
        }
    }

    /**
     * Show tercero search dialog (same as Arqueo editor)
     */
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
        searchButton.style.backgroundColor = '#4C9AFF';
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
                            const terceroInput = document.getElementById('tercero');
                            terceroInput.value = item.id;

                            // Trigger blur to load denomination
                            terceroInput.dispatchEvent(new Event('blur'));

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
                console.error('[AdoEditor] Error searching tercero:', error);
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
module.exports = AdoEditor;
