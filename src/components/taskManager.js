import { TaskList } from './taskList.js';
import { TaskForm } from './taskForm.js';

class TaskManager {
    constructor() {
        this.currentTasks = null;
        this.selectedTask = null;
        this.init();
    }

    async init() {
        await this.loadTasks();
        this.render();
        this.setupEventListeners();
    }

    async loadTasks() {
        try {
            this.currentTasks = await window.electronAPI.readTasks();
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.currentTasks = { num_operaciones: 0, liquido_operaciones: 0, operaciones: [] };
        }
    }

    setupEventListeners() {
        document.addEventListener('taskUpdated', () => this.render());
        // Other global event listeners
    }

    render() {
        const mainContainer = new TaskList(this.currentTasks, {
            onEdit: task => new TaskForm(task).show(),
            onDelete: task => this.deleteTask(task),
            onAdd: () => new TaskForm().show()
        }).render();

        document.getElementById('root').innerHTML = '';
        document.getElementById('root').appendChild(mainContainer);
    }
}


export { TaskManager };  // Option 2