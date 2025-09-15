// ===============================================
// TREASURY DATA INPUT RENDERER - Integration Module
// src/treasuryDataInputRenderer.js
// ===============================================

class TreasuryDataInputManager {
    constructor() {
        this.currentPeriodId = null;
        this.originalData = {};
        this.pendingChanges = {};
        this.categories = { income: [], expenses: [] };
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            await this.loadCategories();
            await this.loadPeriods();
            this.setupEventListeners();
            this.setupKeyboardShortcuts();
            
            // Load current period by default
            await this.loadCurrentPeriod();
            
            this.isInitialized = true;
            console.log('✅ Treasury Data Input Manager initialized');
        } catch (error) {
            console.error('❌ Error initializing Treasury Data Input:', error);
            this.showStatus('Failed to initialize data input interface', 'error');
        }
    }

    async loadCategories() {
        try {
            const result = await window.electronAPI.getTreasuryCategories();
            
            if (result.success) {
                this.categories = result.data;
                this.renderCategories();
                console.log(`✅ Loaded ${this.categories.income.length} income and ${this.categories.expenses.length} expense categories`);
            } else {
                throw new Error(result.error || 'Failed to load categories');
            }
        } catch (error) {
            console.error('❌ Error loading categories:', error);
            throw error;
        }
    }

    async loadPeriods() {
        try {
            const result = await window.electronAPI.getTreasuryMetroData();
            
            if (result.success) {
                const periods = result.data;
                this.populatePeriodSelector(periods);
                console.log(`✅ Loaded ${periods.length} treasury periods`);
            } else {
                throw new Error(result.error || 'Failed to load periods');
            }
        } catch (error) {
            console.error('❌ Error loading periods:', error);
            throw error;
        }
    }

    populatePeriodSelector(periods) {
        const periodSelect = document.getElementById('periodSelect');
        if (!periodSelect) return;

        periodSelect.innerHTML = '';
        
        periods.forEach(period => {
            const option = document.createElement('option');
            option.value = period.id;
            option.textContent = `${period.period_display}${period.is_current ? ' (Current)' : ''}`;
            periodSelect.appendChild(option);
        });
    }

    renderCategories() {
        this.renderCategorySection('incomeCategories', this.categories.income, 'income');
        this.renderCategorySection('expenseCategories', this.categories.expenses, 'expense');
    }

    renderCategorySection(containerId, categories, type) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        categories.forEach(category => {
            const categoryItem = this.createCategoryItem(category, type);
            container.appendChild(categoryItem);
        });
    }

    createCategoryItem(category, type) {
        const item = document.createElement('div');
        item.className = 'category-item';
        item.dataset.categoryId = category.id;
        item.dataset.categoryType = type;

        const defaultConfidence = category.is_fixed ? 95 : 80;
        const isFixed = category.is_fixed === 1;

        item.innerHTML = `
            <div class="category-header">
                <span class="category-icon">${category.icon || (type === 'income' ? '💰' : '💸')}</span>
                <span class="category-name">${category.category_name}</span>
                ${isFixed ? '<span class="fixed-badge">Fixed</span>' : ''}
                <button class="category-toggle" onclick="treasuryDataInput.toggleCategoryDetails(this)">
                    ⚙️
                </button>
            </div>

            <div class="amount-input-group">
                <span class="currency-symbol">€</span>
                <input 
                    type="number" 
                    class="amount-input" 
                    placeholder="0.00" 
                    step="0.01"
                    value="0"
                    onchange="treasuryDataInput.updateAmount(this)"
                    oninput="treasuryDataInput.updateAmount(this)"
                >
            </div>

            <div class="expanded-content">
                <div class="confidence-group">
                    <div class="confidence-label">
                        <span>Confidence Level</span>
                        <span class="confidence-value">${defaultConfidence}%</span>
                    </div>
                    <input 
                        type="range" 
                        class="confidence-slider" 
                        min="0" 
                        max="100" 
                        value="${defaultConfidence}"
                        onchange="treasuryDataInput.updateConfidence(this)"
                        oninput="treasuryDataInput.updateConfidence(this)"
                    >
                </div>

                <textarea 
                    class="notes-input" 
                    placeholder="Notes and comments for this forecast..."
                    onchange="treasuryDataInput.updateNotes(this)"
                ></textarea>
            </div>
        `;

        return item;
    }

    async loadCurrentPeriod() {
        try {
            const result = await window.electronAPI.getTreasuryMetroData();
            
            if (result.success) {
                const currentPeriod = result.data.find(p => p.is_current);
                if (currentPeriod) {
                    const periodSelect = document.getElementById('periodSelect');
                    if (periodSelect) {
                        periodSelect.value = currentPeriod.id;
                        await this.loadPeriodData(currentPeriod.id);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error loading current period:', error);
        }
    }

    async loadPeriodData(periodId) {
        if (!periodId) return;

        this.showLoading(true);
        this.currentPeriodId = periodId;

        try {
            const result = await window.electronAPI.getTreasuryMetroData();
            
            if (result.success) {
                const period = result.data.find(p => p.id == periodId);
                if (period && period.breakdown) {
                    this.originalData[periodId] = this.extractForecastData(period.breakdown);
                    this.populateFormData(this.originalData[periodId]);
                    this.showStatus(`Period data loaded: ${period.period_display}`, 'success');
                }
            } else {
                throw new Error(result.error || 'Failed to load period data');
            }
        } catch (error) {
            console.error('❌ Error loading period data:', error);
            this.showStatus('Error loading period data: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    extractForecastData(breakdown) {
        const data = { income: {}, expense: {} };

        // Extract income data
        if (breakdown.income && breakdown.income.items) {
            breakdown.income.items.forEach((item, index) => {
                const category = this.categories.income.find(c => c.category_name === item.name);
                if (category) {
                    data.income[category.id] = {
                        amount: item.amount || 0,
                        confidence: item.confidence_level || 80,
                        notes: item.notes || ''
                    };
                }
            });
        }

        // Extract expense data
        if (breakdown.expenses && breakdown.expenses.items) {
            breakdown.expenses.items.forEach((item, index) => {
                const category = this.categories.expenses.find(c => c.category_name === item.name);
                if (category) {
                    data.expense[category.id] = {
                        amount: item.amount || 0,
                        confidence: item.confidence_level || 80,
                        notes: item.notes || ''
                    };
                }
            });
        }

        return data;
    }

    populateFormData(data) {
        // Clear all changed marks
        document.querySelectorAll('.category-item').forEach(item => {
            this.clearChangedMark(item);
        });

        // Populate income data
        if (data.income) {
            Object.entries(data.income).forEach(([categoryId, categoryData]) => {
                this.populateCategoryData(categoryId, 'income', categoryData);
            });
        }

        // Populate expense data
        if (data.expense) {
            Object.entries(data.expense).forEach(([categoryId, categoryData]) => {
                this.populateCategoryData(categoryId, 'expense', categoryData);
            });
        }

        this.updateTotals();
    }

    populateCategoryData(categoryId, categoryType, categoryData) {
        const categoryItem = document.querySelector(`[data-category-id="${categoryId}"][data-category-type="${categoryType}"]`);
        if (!categoryItem) return;

        const amountInput = categoryItem.querySelector('.amount-input');
        const confidenceSlider = categoryItem.querySelector('.confidence-slider');
        const confidenceValue = categoryItem.querySelector('.confidence-value');
        const notesInput = categoryItem.querySelector('.notes-input');

        if (amountInput) amountInput.value = categoryData.amount || 0;
        if (confidenceSlider) {
            confidenceSlider.value = categoryData.confidence || 80;
            if (confidenceValue) confidenceValue.textContent = `${confidenceSlider.value}%`;
        }
        if (notesInput) notesInput.value = categoryData.notes || '';
    }

    toggleCategoryDetails(button) {
        const categoryItem = button.closest('.category-item');
        const expandedContent = categoryItem.querySelector('.expanded-content');
        
        expandedContent.classList.toggle('show');
        button.textContent = expandedContent.classList.contains('show') ? '🔽' : '⚙️';
    }

    updateAmount(input) {
        const value = parseFloat(input.value) || 0;
        this.recordPendingChange(input, 'amount', value);
        this.updateTotals();
        this.markAsChanged(input.closest('.category-item'));
        this.scheduleAutoSave();
    }

    updateConfidence(slider) {
        const value = parseInt(slider.value);
        const categoryItem = slider.closest('.category-item');
        const confidenceValue = categoryItem.querySelector('.confidence-value');
        
        if (confidenceValue) confidenceValue.textContent = `${value}%`;
        
        this.recordPendingChange(slider, 'confidence', value);
        this.markAsChanged(categoryItem);
        this.scheduleAutoSave();
    }

    updateNotes(textarea) {
        const value = textarea.value;
        this.recordPendingChange(textarea, 'notes', value);
        this.markAsChanged(textarea.closest('.category-item'));
        this.scheduleAutoSave();
    }

    recordPendingChange(element, field, value) {
        const categoryItem = element.closest('.category-item');
        const categoryId = categoryItem.dataset.categoryId;
        const categoryType = categoryItem.dataset.categoryType;

        if (!this.pendingChanges[this.currentPeriodId]) {
            this.pendingChanges[this.currentPeriodId] = {};
        }
        if (!this.pendingChanges[this.currentPeriodId][categoryType]) {
            this.pendingChanges[this.currentPeriodId][categoryType] = {};
        }
        if (!this.pendingChanges[this.currentPeriodId][categoryType][categoryId]) {
            this.pendingChanges[this.currentPeriodId][categoryType][categoryId] = {};
        }
        
        this.pendingChanges[this.currentPeriodId][categoryType][categoryId][field] = value;
    }

    markAsChanged(categoryItem) {
        if (!categoryItem) return;
        categoryItem.style.borderLeftColor = '#ffc107';
        categoryItem.style.borderLeftWidth = '4px';
    }

    clearChangedMark(categoryItem) {
        if (!categoryItem) return;
        categoryItem.style.borderLeftColor = '';
        categoryItem.style.borderLeftWidth = '';
    }

    updateTotals() {
        let incomeTotal = 0;
        let expenseTotal = 0;

        document.querySelectorAll('#incomeCategories .amount-input').forEach(input => {
            incomeTotal += parseFloat(input.value) || 0;
        });

        document.querySelectorAll('#expenseCategories .amount-input').forEach(input => {
            expenseTotal += parseFloat(input.value) || 0;
        });

        const incomeTotalElement = document.getElementById('incomeTotal');
        const expenseTotalElement = document.getElementById('expenseTotal');

        if (incomeTotalElement) incomeTotalElement.textContent = this.formatCurrency(incomeTotal);
        if (expenseTotalElement) expenseTotalElement.textContent = this.formatCurrency(expenseTotal);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-EU', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    }

    async saveAllChanges() {
        if (!this.currentPeriodId || !this.pendingChanges[this.currentPeriodId]) {
            this.showStatus('No changes to save', 'error');
            return;
        }

        this.showLoading(true);
        let successCount = 0;
        let errorCount = 0;

        try {
            const changes = this.pendingChanges[this.currentPeriodId];
            
            for (const [categoryType, categories] of Object.entries(changes)) {
                for (const [categoryId, data] of Object.entries(categories)) {
                    try {
                        const result = await window.electronAPI.updateTreasuryForecast({
                            periodId: this.currentPeriodId,
                            categoryType,
                            categoryId: parseInt(categoryId),
                            amount: data.amount || 0,
                            notes: data.notes || null
                        });

                        if (result.success) {
                            successCount++;
                        } else {
                            errorCount++;
                            console.error(`Failed to save ${categoryType} category ${categoryId}:`, result.error);
                        }
                    } catch (error) {
                        errorCount++;
                        console.error(`Error saving ${categoryType} category ${categoryId}:`, error);
                    }
                }
            }

            if (errorCount === 0) {
                // Clear pending changes
                delete this.pendingChanges[this.currentPeriodId];
                
                // Clear changed marks
                document.querySelectorAll('.category-item').forEach(item => {
                    this.clearChangedMark(item);
                });

                this.showStatus(`All ${successCount} changes saved successfully!`, 'success');
            } else {
                this.showStatus(`Saved ${successCount} changes, ${errorCount} failed`, 'error');
            }
        } catch (error) {
            console.error('❌ Error saving changes:', error);
            this.showStatus('Error saving changes: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    resetToOriginal() {
        if (!this.currentPeriodId || !this.originalData[this.currentPeriodId]) {
            this.showStatus('No original data to reset to', 'error');
            return;
        }

        this.populateFormData(this.originalData[this.currentPeriodId]);
        delete this.pendingChanges[this.currentPeriodId];
        this.showStatus('Form reset to original values', 'success');
    }

    async copyFromPrevious() {
        if (!this.currentPeriodId) {
            this.showStatus('Please select a period first', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const result = await window.electronAPI.getTreasuryMetroData();
            
            if (result.success) {
                const periods = result.data.sort((a, b) => new Date(a.period_date) - new Date(b.period_date));
                const currentIndex = periods.findIndex(p => p.id == this.currentPeriodId);
                
                if (currentIndex <= 0) {
                    this.showStatus('No previous period available', 'error');
                    return;
                }

                const previousPeriod = periods[currentIndex - 1];
                const previousData = this.extractForecastData(previousPeriod.breakdown);
                
                this.populateFormData(previousData);
                this.showStatus(`Data copied from ${previousPeriod.period_display}`, 'success');
            }
        } catch (error) {
            console.error('❌ Error copying previous period data:', error);
            this.showStatus('Error copying previous period data: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    setupEventListeners() {
        const loadPeriodBtn = document.getElementById('loadPeriodBtn');
        const saveAllBtn = document.getElementById('saveAllBtn');
        const resetBtn = document.getElementById('resetBtn');
        const copyFromPreviousBtn = document.getElementById('copyFromPreviousBtn');
        const periodSelect = document.getElementById('periodSelect');

        if (loadPeriodBtn) {
            loadPeriodBtn.addEventListener('click', () => {
                const periodId = periodSelect?.value;
                if (periodId) {
                    this.loadPeriodData(periodId);
                } else {
                    this.showStatus('Please select a period', 'error');
                }
            });
        }

        if (saveAllBtn) saveAllBtn.addEventListener('click', () => this.saveAllChanges());
        if (resetBtn) resetBtn.addEventListener('click', () => this.resetToOriginal());
        if (copyFromPreviousBtn) copyFromPreviousBtn.addEventListener('click', () => this.copyFromPrevious());

        if (periodSelect) {
            periodSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.loadPeriodData(e.target.value);
                }
            });
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        this.saveAllChanges();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.resetToOriginal();
                        break;
                }
            }
        });
    }

    scheduleAutoSave() {
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => {
            if (Object.keys(this.pendingChanges).length > 0) {
                console.log('🔄 Auto-save triggered...');
                // Implement auto-save logic here if needed
            }
        }, 30000); // Auto-save after 30 seconds of inactivity
    }

    showStatus(message, type) {
        const statusElement = document.getElementById('statusMessage');
        if (!statusElement) return;

        statusElement.textContent = message;
        statusElement.className = `status-message status-${type}`;
        statusElement.style.display = 'block';

        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }
}

// Global instance
const treasuryDataInput = new TreasuryDataInputManager();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => treasuryDataInput.initialize());
} else {
    treasuryDataInput.initialize();
}

// Export for use in other modules
window.treasuryDataInput = treasuryDataInput;