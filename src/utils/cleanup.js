// src/utils/cleanup.js
class CleanupManager {
    constructor() {
        this.listeners = [];
        this.timers = [];
        this.resources = [];
    }

    addListener(element, event, handler, options = {}) {
        element.addEventListener(event, handler, options);
        this.listeners.push({ element, event, handler, options });
        return () => this.removeListener(element, event, handler);
    }

    removeListener(element, event, handler) {
        element.removeEventListener(event, handler);
        this.listeners = this.listeners.filter(
            listener => !(listener.element === element && 
                         listener.event === event && 
                         listener.handler === handler)
        );
    }

    addTimer(timerId) {
        this.timers.push(timerId);
        return timerId;
    }

    addResource(resource) {
        this.resources.push(resource);
    }

    cleanup() {
        // Clear all event listeners
        this.listeners.forEach(({ element, event, handler }) => {
            try {
                element.removeEventListener(event, handler);
            } catch (e) {
                console.warn('Error removing listener:', e);
            }
        });

        // Clear all timers
        this.timers.forEach(timerId => {
            clearTimeout(timerId);
            clearInterval(timerId);
        });

        // Cleanup resources
        this.resources.forEach(resource => {
            try {
                if (resource && typeof resource.dispose === 'function') {
                    resource.dispose();
                } else if (resource && typeof resource.destroy === 'function') {
                    resource.destroy();
                } else if (resource && typeof resource.cleanup === 'function') {
                    resource.cleanup();
                }
            } catch (e) {
                console.warn('Error cleaning up resource:', e);
            }
        });

        // Reset arrays
        this.listeners = [];
        this.timers = [];
        this.resources = [];
    }
}

// Global cleanup manager
window.globalCleanup = new CleanupManager();

// Focus management utilities
class FocusManager {
    static trapFocus(event, container) {
        const focusableElements = container.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (!firstElement) return;
        
        if (event.key === 'Tab') {
            if (event.shiftKey && document.activeElement === firstElement) {
                lastElement.focus();
                event.preventDefault();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
                firstElement.focus();
                event.preventDefault();
            }
        }
    }

    static restoreFocus(previouslyFocused) {
        if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
            try {
                previouslyFocused.focus();
            } catch (e) {
                // Fallback to document.body if element is no longer focusable
                document.body.focus();
            }
        }
    }

    static clearAllFocus() {
        if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
        }
    }
}

module.exports = { CleanupManager, FocusManager };