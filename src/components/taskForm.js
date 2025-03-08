class TaskForm {
    constructor(task = null) {
        this.task = task;
        this.formData = this.initializeFormData();
    }

    initializeFormData() {
        return this.task?.detalle || {
            fecha: '',
            caja: '',
            tercero: '',
            naturaleza: '',
            texto: '',
            aplicaciones: []
        };
    }

    show() {
        const formElement = this.createForm();
        document.body.appendChild(formElement);
        this.setupEventListeners(formElement);
    }

    createForm() {
        // Form creation logic
    }

    setupEventListeners(formElement) {
        // Form event listeners
    }

    async handleSubmit(formData) {
        // Submit handling logic
    }
}

export { TaskForm };  // Option 2