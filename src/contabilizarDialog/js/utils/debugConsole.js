/**
 * Debug Console Utility
 * Provides a visual console for debugging in the UI
 */
const DebugConsole = {
    // Original console methods
    originalConsole: {
        log: console.log,
        error: console.error,
        warn: console.warn,
        info: console.info
    },
    
    /**
     * Initialize the debug console
     */
    init() {
        const debugConsole = document.getElementById('debugConsole');
        const debugToggle = document.getElementById('debugToggle');
        
        if (!debugConsole || !debugToggle) {
            console.warn('Debug console elements not found in the DOM');
            return;
        }
        
        let isConsoleVisible = true;
        
        // Toggle console visibility
        debugToggle.addEventListener('click', () => {
            isConsoleVisible = !isConsoleVisible;
            debugConsole.className = isConsoleVisible ? 'visible' : '';
        });
        
        // Override console methods
        this.overrideConsoleMethods(debugConsole);
        
        // Add initial message
        console.info('Debug console initialized');
    },
    
    /**
     * Override console methods to capture output
     * 
     * @param {HTMLElement} debugConsole - The debug console element
     */
    overrideConsoleMethods(debugConsole) {
        // Function to add message to debug console
        const addMessage = (type, args) => {
            const line = document.createElement('div');
            line.className = 'debug-line debug-' + type;
            
            const timestamp = new Date().toLocaleTimeString();
            const message = Array.from(args).map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg);
                    } catch (e) {
                        return String(arg);
                    }
                }
                return String(arg);
            }).join(' ');
            
            line.textContent = `[${timestamp}] ${message}`;
            debugConsole.appendChild(line);
            
            // Auto-scroll to bottom
            debugConsole.scrollTop = debugConsole.scrollHeight;
            
            // Limit number of lines (keep last 100)
            const maxLines = 100;
            const lines = debugConsole.querySelectorAll('.debug-line');
            if (lines.length > maxLines) {
                for (let i = 0; i < lines.length - maxLines; i++) {
                    debugConsole.removeChild(lines[i]);
                }
            }
        };
        
        // Override console.log
        console.log = function() {
            addMessage('log', arguments);
            DebugConsole.originalConsole.log.apply(console, arguments);
        };
        
        // Override console.error
        console.error = function() {
            addMessage('error', arguments);
            DebugConsole.originalConsole.error.apply(console, arguments);
        };
        
        // Override console.warn
        console.warn = function() {
            addMessage('warn', arguments);
            DebugConsole.originalConsole.warn.apply(console, arguments);
        };
        
        // Override console.info
        console.info = function() {
            addMessage('info', arguments);
            DebugConsole.originalConsole.info.apply(console, arguments);
        };
    },
    
    /**
     * Clear the debug console
     */
    clear() {
        const debugConsole = document.getElementById('debugConsole');
        if (debugConsole) {
            debugConsole.innerHTML = '';
        }
    },
    
    /**
     * Restore original console methods
     */
    restore() {
        console.log = this.originalConsole.log;
        console.error = this.originalConsole.error;
        console.warn = this.originalConsole.warn;
        console.info = this.originalConsole.info;
    }
};

// Export the module
module.exports = DebugConsole;
