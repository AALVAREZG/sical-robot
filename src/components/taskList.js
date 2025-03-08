// taskList.js
class TaskList {
    constructor(taskData, handlers) {
        this.taskData = taskData;
        this.handlers = handlers;
        this.sortField = null;
        this.sortDirection = 'asc';
    }

    render() {
        const container = document.createElement('div');
        container.className = 'container';
        
        container.appendChild(this.createHeader());
        container.appendChild(this.createTaskItems());
        container.appendChild(this.createSummary());
        
        return container;
    }

    createHeader() {
        const header = document.createElement('div');
        header.className = 'header flex justify-between items-center mb-4';
        
        const titleSection = document.createElement('div');
        titleSection.innerHTML = `
            <h2 class="text-xl font-bold">Operations</h2>
            <p class="text-sm text-gray-600">
                Total: ${this.taskData.num_operaciones} | 
                Amount: ${this.taskData.liquido_operaciones.toFixed(2)}€
            </p>
        `;

        const addButton = document.createElement('button');
        addButton.className = 'btn-add p-2 bg-blue-500 text-white rounded-full';
        addButton.innerHTML = '<span>+</span>';
        addButton.addEventListener('click', () => this.handlers.onAdd());

        header.appendChild(titleSection);
        header.appendChild(addButton);
        
        return header;
    }

    

    createSelect(label, options) {
        const container = document.createElement('div');
        container.className = 'filter-group';
        
        const selectLabel = document.createElement('label');
        selectLabel.textContent = label;
        selectLabel.className = 'block text-sm font-medium mb-1';

        const select = document.createElement('select');
        select.className = 'w-full p-2 border rounded';
        
        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.toLowerCase();
            opt.textContent = option;
            select.appendChild(opt);
        });

        select.addEventListener('change', () => this.filterTasks());

        container.appendChild(selectLabel);
        container.appendChild(select);
        return container;
    }

   
    createTaskItems() {
        const taskList = document.createElement('div');
        taskList.className = 'task-list space-y-4';

        this.taskData.operaciones.forEach(operation => {
            taskList.appendChild(this.createTaskItem(operation));
        });

        return taskList;
    }

    createTaskItem(operation) {
        const item = document.createElement('div');
        item.className = 'task-item bg-white rounded-lg shadow p-4';
        
        const createAplicacionesHTML = () => {
            if (!operation.detalle.aplicaciones) return '';
            
            return operation.detalle.aplicaciones.map(app => {
                if (operation.tipo === 'arqueo') {
                    return `
                        <div class="aplicacion-row">
                            <span class="aplicacion-label">Partida: ${app.partida}</span>
                            <span class="aplicacion-amount">${app.IMPORTE_PARTIDA}€</span>
                        </div>`;
                } else if (operation.tipo === 'ado220') {
                    return `
                        <div class="aplicacion-row">
                            <span class="aplicacion-label">
                                Func: ${app.funcional} | Econ: ${app.economica} | 
                                Cuenta: ${app.cuenta}
                            </span>
                            <span class="aplicacion-amount">${app.importe}€</span>
                        </div>`;
                } else {
                    return `
                        <div class="aplicacion-row">
                            <span class="aplicacion-label">
                                Econ: ${app.economica} | Cuenta: ${app.cuenta}
                            </span>
                            <span class="aplicacion-amount">${app.importe}€</span>
                        </div>`;
                }
            }).join('');
        };

        item.innerHTML = `
            <div class="task-header flex justify-between items-center mb-2">
                <div>
                    <span class="task-type font-bold uppercase">${operation.tipo}</span>
                    <span class="task-date text-sm text-gray-500 ml-2">
                        ${operation.detalle.fecha}
                    </span>
                </div>
                <div class="task-actions space-x-2">
                    <button class="btn-edit">Edit</button>
                    <button class="btn-delete">Delete</button>
                </div>
            </div>
            <div class="task-description text-sm text-gray-600 mb-2">
                ${operation.detalle.texto || ''}
            </div>
            <div class="task-aplicaciones space-y-2">
                ${createAplicacionesHTML()}
                <div class="task-total text-right font-bold mt-2 pt-2 border-t">
                    Total: ${this.calculateTotal(operation)}€
                </div>
            </div>
        `;

        // Add event listeners
        item.querySelector('.btn-edit').addEventListener('click', () => 
            this.handlers.onEdit(operation));
        item.querySelector('.btn-delete').addEventListener('click', () => 
            this.handlers.onDelete(operation));

        return item;
    }

    createSummary() {
        const summary = document.createElement('div');
        summary.className = 'summary mt-4 p-4 bg-gray-100 rounded';
        
        const totalAmount = this.taskData.operaciones.reduce((sum, op) => 
            sum + this.calculateTotal(op), 0);
            
        summary.innerHTML = `
            <div class="grid grid-cols-3 gap-4">
                <div>
                    <span class="font-bold">Total Operations:</span>
                    <span>${this.taskData.operaciones.length}</span>
                </div>
                <div>
                    <span class="font-bold">Total Amount:</span>
                    <span>${totalAmount.toFixed(2)}€</span>
                </div>
                <div>
                    <span class="font-bold">Last Updated:</span>
                    <span>${new Date().toLocaleString()}</span>
                </div>
            </div>
        `;

        return summary;
    }

    calculateTotal(operation) {
        if (!operation.detalle.aplicaciones) return 0;
        return operation.detalle.aplicaciones.reduce((sum, app) => {
            const amount = app.IMPORTE_PARTIDA || app.importe || 0;
            return sum + parseFloat(amount);
        }, 0);
    }

    
}

export {TaskList};