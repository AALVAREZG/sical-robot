/**
 * TaskRenderers - Handles rendering of task cards
 */
const TaskRenderers = {
    /**
     * Render a task card
     * 
     * @param {Object} task - The task data
     * @param {number} index - The task index
     * @param {Function} editCallback - Function to call when edit button is clicked
     * @param {Function} deleteCallback - Function to call when delete button is clicked
     * @returns {HTMLElement} The rendered task card
     */
    renderTaskCard(task, index, editCallback, deleteCallback) {
        const taskCard = document.createElement('div');
        taskCard.className = 'task-card';
        
        // Create task header
        const taskHeader = document.createElement('div');
        taskHeader.className = 'task-header';
        
        // Task type badge
        const taskType = document.createElement('div');
        taskType.className = 'task-type ' + task.tipo;
        taskType.textContent = task.tipo.toUpperCase();
        
        // Edit button
        const editButton = document.createElement('div');
        editButton.className = 'edit-button';
        editButton.textContent = 'Editar';
        editButton.addEventListener('click', () => editCallback(index));
        
        taskHeader.appendChild(taskType);
        taskHeader.appendChild(editButton);
        
        // Delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete';
        deleteButton.textContent = '✕';
        deleteButton.addEventListener('click', () => deleteCallback(index));
        
        // Create task details based on task type
        let taskDetails;
        
        if (task.tipo === 'arqueo') {
            taskDetails = this.renderArqueoDetails(task.detalle);
        } else if (task.tipo === 'ado220') {
            taskDetails = this.renderAdoDetails(task.detalle);
        } else {
            // Generic fallback
            taskDetails = document.createElement('div');
            taskDetails.className = 'task-details';
            taskDetails.textContent = 'Tipo de tarea desconocido';
        }
        
        // Assemble the task card
        taskCard.appendChild(taskHeader);
        taskCard.appendChild(deleteButton);
        taskCard.appendChild(taskDetails);
        
        return taskCard;
    },
    
    /**
     * Render arqueo task details
     * 
     * @param {Object} detalle - The task details
     * @returns {HTMLElement} The rendered details
     */
    renderArqueoDetails(detalle) {
        const taskDetails = document.createElement('div');
        taskDetails.className = 'task-details';
        
        // First row: Basic details
        const detailRow1 = this.createDetailRow([
            { label: 'Fecha', value: detalle.fecha || 'N/A' },
            { label: 'Caja', value: detalle.caja || 'N/A' },
            { label: 'Tercero', value: detalle.tercero || 'N/A' },
            { label: 'Naturaleza', value: detalle.naturaleza || 'N/A' }
        ]);
        
        // Second row: Partidas
        let partidasText = 'N/A';
        if (detalle.final && detalle.final.length > 0) {
            partidasText = detalle.final.map(p => 
                `${p.partida}: ${p.IMPORTE_PARTIDA} €`
            ).join(', ');
        }
        
        const detailRow2 = this.createDetailRow([
            { label: 'Partidas', value: partidasText, colspan: 4 }
        ]);
        
        // Third row: Texto SICAL
        let textoSicalText = 'N/A';
        if (detalle.texto_sical && detalle.texto_sical.length > 0) {
            textoSicalText = detalle.texto_sical.map(t => 
                t.tcargo
            ).join('\n');
        }
        
        const detailRow3 = this.createDetailRow([
            { label: 'Texto SICAL', value: textoSicalText, colspan: 4 }
        ]);
        
        // Add rows to details
        taskDetails.appendChild(detailRow1);
        taskDetails.appendChild(detailRow2);
        taskDetails.appendChild(detailRow3);
        
        return taskDetails;
    },
    
    /**
     * Render ado220 task details
     * 
     * @param {Object} detalle - The task details
     * @returns {HTMLElement} The rendered details
     */
    renderAdoDetails(detalle) {
        const taskDetails = document.createElement('div');
        taskDetails.className = 'task-details';
        
        // First row: Basic details
        const detailRow1 = this.createDetailRow([
            { label: 'Fecha', value: detalle.fecha || 'N/A' },
            { label: 'Expediente', value: detalle.expediente || 'N/A' },
            { label: 'Tercero', value: detalle.tercero || 'N/A' },
            { label: 'Caja', value: detalle.caja || 'N/A' }
        ]);
        
        // Second row: Payment details
        const detailRow2 = this.createDetailRow([
            { label: 'F. Pago', value: detalle.fpago || 'N/A' },
            { label: 'T. Pago', value: detalle.tpago || 'N/A' },
            { label: 'Texto', value: detalle.texto || 'N/A', colspan: 2 }
        ]);
        
        // Third row: Aplicaciones
        let aplicacionesText = 'N/A';
        if (detalle.aplicaciones && detalle.aplicaciones.length > 0) {
            aplicacionesText = detalle.aplicaciones.map(a => 
                `${a.funcional}-${a.economica}: ${a.importe} € (${a.cuenta})`
            ).join('\n');
        }
        
        const detailRow3 = this.createDetailRow([
            { label: 'Aplicaciones', value: aplicacionesText, colspan: 4 }
        ]);
        
        // Add rows to details
        taskDetails.appendChild(detailRow1);
        taskDetails.appendChild(detailRow2);
        taskDetails.appendChild(detailRow3);
        
        return taskDetails;
    },
    
    /**
     * Create a detail row with fields
     * 
     * @param {Array} fields - Array of field objects with label and value
     * @returns {HTMLElement} The rendered row
     */
    createDetailRow(fields) {
        const row = document.createElement('div');
        row.className = 'task-detail-row';
        
        fields.forEach(field => {
            const cell = document.createElement('div');
            if (field.colspan) {
                cell.style.gridColumn = `span ${field.colspan}`;
            }
            
            const label = document.createElement('div');
            label.className = 'field-label';
            label.textContent = field.label;
            
            const value = document.createElement('div');
            value.className = 'field-value';
            
            // Handle newlines in value
            if (field.value.includes('\n')) {
                const lines = field.value.split('\n');
                lines.forEach((line, i) => {
                    if (i > 0) {
                        value.appendChild(document.createElement('br'));
                    }
                    value.appendChild(document.createTextNode(line));
                });
            } else if (field.isCurrency) {
                    value.classList.add('currency-value');
                    value.textContent = formatCurrency(field.value);
            } else {
                    value.textContent = field.value;
                
            }
            
            cell.appendChild(label);
            cell.appendChild(value);
            row.appendChild(cell);
        });
        
        return row;
    }
};

// Export the module
module.exports = TaskRenderers;
