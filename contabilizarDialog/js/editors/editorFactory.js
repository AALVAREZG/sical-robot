/**
 * EditorFactory - Creates the appropriate editor based on task type
 */
const ArqueoEditor = require('./arqueoEditor');
const AdoEditor = require('./adoEditor');

class EditorFactory {
    /**
     * Create an editor instance based on the task type
     * 
     * @param {string} taskType - The type of task ('arqueo', 'ado220', etc.)
     * @param {HTMLElement} container - The container element for the editor
     * @param {Object} task - The task data (optional)
     * @returns {Object} The appropriate editor instance
     */
    static createEditor(taskType, container, task = null) {
        console.log(`Creating editor for task type: ${taskType}`);
        
        switch (taskType) {
            case 'arqueo':
                return new ArqueoEditor(container, task);
                
            case 'ado220':
                return new AdoEditor(container, task);
                
            default:
                console.error(`Unknown task type: ${taskType}`);
                // Default to ArqueoEditor as fallback
                return new ArqueoEditor(container, task);
        }
    }
}

// Export module
module.exports = EditorFactory;
