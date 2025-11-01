/**
 * TASK MONITOR - Phase 3 Implementation
 *
 * This module provides the UI and functionality for monitoring accounting tasks
 * sent to RabbitMQ via the Python service (senderToRabbitMQ.exe).
 *
 * Features:
 * - Real-time task status display (Pending/Completed/Failed/Partial)
 * - Operation-level breakdown for each task
 * - Task detail modal with bank movement context
 * - Retry functionality for failed tasks
 * - Statistics dashboard with filtering
 */

// ========================================
// STATE MANAGEMENT
// ========================================

let taskMonitorState = {
    tasks: [],
    filteredTasks: [],
    currentFilter: 'all',
    currentPage: 1,
    tasksPerPage: 25,
    searchQuery: '',
    isLoading: false,
    statistics: {
        pending: 0,
        completed: 0,
        failed: 0,
        partial: 0,
        total: 0
    }
};

// ========================================
// INITIALIZATION
// ========================================

/**
 * Initialize Task Monitor when tab is activated
 */
function initTaskMonitor() {
    console.log('[TaskMonitor] Initializing Task Monitor...');

    // Set up event listeners
    setupTaskMonitorEventListeners();

    // Load initial data
    refreshTaskMonitor();
}

/**
 * Set up all event listeners for Task Monitor
 */
function setupTaskMonitorEventListeners() {
    // Filter tabs
    const filterTabs = document.querySelectorAll('.task-filter-tabs .filter-tab');
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const filter = tab.getAttribute('data-filter');
            handleFilterChange(filter);
        });
    });

    // Refresh button
    const refreshBtn = document.getElementById('btnRefreshTasks');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshTaskMonitor();
        });
    }

    // Search input with debouncing
    const searchInput = document.getElementById('taskSearchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                handleSearchChange(e.target.value);
            }, 300);
        });
    }

    // Retry All buttons
    const retryPendingBtn = document.getElementById('btnRetryAllPending');
    if (retryPendingBtn) {
        retryPendingBtn.addEventListener('click', () => {
            handleRetryAll('pending');
        });
    }

    const retryFailedBtn = document.getElementById('btnRetryAllFailed');
    if (retryFailedBtn) {
        retryFailedBtn.addEventListener('click', () => {
            handleRetryAll('failed');
        });
    }

    console.log('[TaskMonitor] Event listeners set up');
}

// ========================================
// DATA LOADING
// ========================================

/**
 * Refresh all task data from database
 */
async function refreshTaskMonitor() {
    if (taskMonitorState.isLoading) {
        console.log('[TaskMonitor] Already loading, skipping refresh');
        return;
    }

    console.log('[TaskMonitor] Refreshing task data...');
    taskMonitorState.isLoading = true;

    showLoadingState();

    try {
        // Fetch all tasks with statistics
        const result = await window.api.invoke('get-tasks-list', {
            filters: {}
        });

        if (result.success) {
            taskMonitorState.tasks = result.tasks || [];
            console.log(`[TaskMonitor] Loaded ${taskMonitorState.tasks.length} tasks`);

            // Calculate statistics
            updateStatistics();

            // Apply current filter
            applyFilter();

            // Render tasks
            renderTaskList();

            // Update pagination
            updatePagination();
        } else {
            console.error('[TaskMonitor] Failed to load tasks:', result.error);
            showErrorState('Failed to load tasks: ' + result.error);
        }
    } catch (error) {
        console.error('[TaskMonitor] Error refreshing tasks:', error);
        showErrorState('Error loading tasks: ' + error.message);
    } finally {
        taskMonitorState.isLoading = false;
    }
}

// ========================================
// STATISTICS
// ========================================

/**
 * Calculate statistics from current tasks
 */
function updateStatistics() {
    const stats = {
        pending: 0,
        completed: 0,
        failed: 0,
        partial: 0,
        total: taskMonitorState.tasks.length
    };

    taskMonitorState.tasks.forEach(task => {
        const status = (task.overall_status || 'pending').toLowerCase();
        if (stats[status] !== undefined) {
            stats[status]++;
        }
    });

    taskMonitorState.statistics = stats;
    renderStatistics();
}

/**
 * Render statistics cards
 */
function renderStatistics() {
    const stats = taskMonitorState.statistics;

    // Update card values
    document.getElementById('statPendingCount').textContent = stats.pending;
    document.getElementById('statCompletedCount').textContent = stats.completed;
    document.getElementById('statFailedCount').textContent = stats.failed;
    document.getElementById('statPartialCount').textContent = stats.partial;
    document.getElementById('statTotalCount').textContent = stats.total;

    // Calculate success rate
    const processed = stats.completed + stats.failed + stats.partial;
    const successRate = processed > 0
        ? Math.round((stats.completed / processed) * 100)
        : 0;

    document.getElementById('statSuccessRate').textContent = `${successRate}% Success`;

    console.log('[TaskMonitor] Statistics updated:', stats);
}

// ========================================
// FILTERING & SEARCH
// ========================================

/**
 * Handle filter tab change
 */
function handleFilterChange(filter) {
    console.log(`[TaskMonitor] Filter changed to: ${filter}`);

    // Update active tab
    const filterTabs = document.querySelectorAll('.task-filter-tabs .filter-tab');
    filterTabs.forEach(tab => {
        if (tab.getAttribute('data-filter') === filter) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    taskMonitorState.currentFilter = filter;
    taskMonitorState.currentPage = 1;

    applyFilter();
    renderTaskList();
    updatePagination();
}

/**
 * Handle search input change
 */
function handleSearchChange(query) {
    console.log(`[TaskMonitor] Search query: ${query}`);
    taskMonitorState.searchQuery = query.toLowerCase();
    taskMonitorState.currentPage = 1;

    applyFilter();
    renderTaskList();
    updatePagination();
}

/**
 * Apply current filter and search to tasks
 */
function applyFilter() {
    let filtered = [...taskMonitorState.tasks];

    // Apply status filter
    if (taskMonitorState.currentFilter !== 'all') {
        filtered = filtered.filter(task => {
            const status = (task.overall_status || 'pending').toLowerCase();
            return status === taskMonitorState.currentFilter;
        });
    }

    // Apply search query
    if (taskMonitorState.searchQuery) {
        filtered = filtered.filter(task => {
            const taskId = (task.task_id || '').toLowerCase();
            const bankMovementId = (task.bank_movement_id || '').toLowerCase();
            return taskId.includes(taskMonitorState.searchQuery) ||
                   bankMovementId.includes(taskMonitorState.searchQuery);
        });
    }

    taskMonitorState.filteredTasks = filtered;
    console.log(`[TaskMonitor] Filtered: ${filtered.length} tasks`);
}

// ========================================
// TASK LIST RENDERING
// ========================================

/**
 * Render task list table
 */
function renderTaskList() {
    const tbody = document.getElementById('taskMonitorTableBody');
    if (!tbody) {
        console.error('[TaskMonitor] Table body not found');
        return;
    }

    const filtered = taskMonitorState.filteredTasks;

    // Check if empty
    if (filtered.length === 0) {
        showEmptyState();
        return;
    }

    // Calculate pagination
    const startIndex = (taskMonitorState.currentPage - 1) * taskMonitorState.tasksPerPage;
    const endIndex = startIndex + taskMonitorState.tasksPerPage;
    const pageTasks = filtered.slice(startIndex, endIndex);

    // Render rows
    tbody.innerHTML = pageTasks.map(task => renderTaskRow(task)).join('');

    // Attach event listeners to action buttons
    attachTaskActionListeners();

    console.log(`[TaskMonitor] Rendered ${pageTasks.length} tasks`);
}

/**
 * Render a single task row
 */
function renderTaskRow(task) {
    const status = (task.overall_status || 'pending').toLowerCase();
    const statusBadge = getStatusBadge(status);
    const operationsSummary = getOperationsSummary(task);
    const bankMovementInfo = getBankMovementInfo(task);
    const createdDate = formatDate(task.creation_date);

    return `
        <tr data-task-id="${task.task_id}">
            <td>
                <span style="font-family: 'Roboto Mono', monospace; font-size: 12px;">
                    ${escapeHtml(task.task_id)}
                </span>
            </td>
            <td>${statusBadge}</td>
            <td>${createdDate}</td>
            <td>${operationsSummary}</td>
            <td>${bankMovementInfo}</td>
            <td>
                <div class="task-actions">
                    <button class="btn-task-action btn-view" data-action="view" data-task-id="${task.task_id}">
                        👁️ View
                    </button>
                    ${status === 'failed' || status === 'partial' ? `
                        <button class="btn-task-action btn-retry" data-action="retry" data-task-id="${task.task_id}">
                            🔄 Retry
                        </button>
                    ` : ''}
                    <button class="btn-task-action btn-sync" data-action="sync" data-task-id="${task.task_id}">
                        ⟳ Sync
                    </button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * Get status badge HTML
 */
function getStatusBadge(status) {
    const badges = {
        pending: { icon: '⏳', text: 'Pending', class: 'status-pending' },
        completed: { icon: '✅', text: 'Completed', class: 'status-completed' },
        failed: { icon: '❌', text: 'Failed', class: 'status-failed' },
        partial: { icon: '⚠️', text: 'Partial', class: 'status-partial' }
    };

    const badge = badges[status] || badges.pending;

    return `
        <span class="task-status-badge ${badge.class}">
            <span>${badge.icon}</span>
            <span>${badge.text}</span>
        </span>
    `;
}

/**
 * Get operations summary HTML
 */
function getOperationsSummary(task) {
    const total = task.total_operations || 0;
    const succeeded = task.succeeded_count || 0;
    const failed = task.failed_count || 0;

    return `
        <div class="task-operations-summary">
            <div class="operations-count">
                <span class="op-count-item op-count-success" title="Succeeded">
                    <span class="icon">✓</span>
                    <span>${succeeded}</span>
                </span>
                <span class="op-count-item op-count-failed" title="Failed">
                    <span class="icon">✗</span>
                    <span>${failed}</span>
                </span>
                <span class="op-count-item op-count-total" title="Total">
                    <span class="icon">∑</span>
                    <span>${total}</span>
                </span>
            </div>
        </div>
    `;
}

/**
 * Get bank movement info HTML
 */
function getBankMovementInfo(task) {
    if (!task.bank_movement_id) {
        return '<span style="color: var(--text-secondary); font-size: 12px;">N/A</span>';
    }

    return `
        <div class="bank-movement-info">
            <div class="bank-movement-id">${escapeHtml(task.bank_movement_id)}</div>
        </div>
    `;
}

/**
 * Attach event listeners to task action buttons
 */
function attachTaskActionListeners() {
    const actionButtons = document.querySelectorAll('.btn-task-action');

    actionButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();

            const action = button.getAttribute('data-action');
            const taskId = button.getAttribute('data-task-id');

            console.log(`[TaskMonitor] Action: ${action}, Task: ${taskId}`);

            switch (action) {
                case 'view':
                    await showTaskDetailModal(taskId);
                    break;
                case 'retry':
                    await handleRetryTask(taskId);
                    break;
                case 'sync':
                    await handleSyncTask(taskId);
                    break;
            }
        });
    });
}

// ========================================
// TASK DETAIL MODAL
// ========================================

/**
 * Show task detail modal
 */
async function showTaskDetailModal(taskId) {
    console.log(`[TaskMonitor] Opening detail modal for task: ${taskId}`);

    try {
        // Fetch task details
        const result = await window.api.invoke('get-task-details', { taskId });

        if (!result.success) {
            console.error('[TaskMonitor] Failed to fetch task details:', result.error);
            showErrorToast('Failed to load task details: ' + result.error);
            return;
        }

        // Create modal if it doesn't exist
        let modal = document.getElementById('taskDetailModal');
        if (!modal) {
            modal = createTaskDetailModal();
            document.body.appendChild(modal);
        }

        // Populate modal with data
        populateTaskDetailModal(result.summary, result.operations);

        // Show modal
        modal.classList.add('active');

    } catch (error) {
        console.error('[TaskMonitor] Error showing task detail:', error);
        showErrorToast('Error loading task details: ' + error.message);
    }
}

/**
 * Create task detail modal element
 */
function createTaskDetailModal() {
    const modal = document.createElement('div');
    modal.id = 'taskDetailModal';
    modal.className = 'task-detail-modal';

    modal.innerHTML = `
        <div class="task-detail-content">
            <div class="task-detail-header">
                <div class="task-detail-title">
                    Detalles de Tarea
                    <span class="task-id-chip" id="modalTaskId"></span>
                </div>
                <button class="btn-close-modal" id="btnCloseTaskModal">×</button>
            </div>

            <div class="task-detail-body" id="taskDetailBody">
                <!-- Content will be populated dynamically -->
            </div>

            <div class="task-detail-footer">
                <button class="btn-modal-action btn-modal-retry" id="btnModalRetry" style="display: none;">
                    🔄 Reintentar Operaciones Fallidas
                </button>
                <button class="btn-modal-action btn-modal-close" id="btnModalClose">
                    Cerrar
                </button>
            </div>
        </div>
    `;

    // Close button handlers
    modal.querySelector('#btnCloseTaskModal').addEventListener('click', () => {
        modal.classList.remove('active');
    });

    modal.querySelector('#btnModalClose').addEventListener('click', () => {
        modal.classList.remove('active');
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    return modal;
}

/**
 * Populate task detail modal with data
 */
function populateTaskDetailModal(summary, operations) {
    // Update task ID chip
    document.getElementById('modalTaskId').textContent = summary.taskId;

    // Calculate total amounts from aplicaciones
    const totalDebit = operations.reduce((sum, op) => {
        const data = op.task_data || {};
        const detalle = data.detalle || {};

        // For ADO: sum all aplicaciones
        if (detalle.aplicaciones && Array.isArray(detalle.aplicaciones)) {
            const adoTotal = detalle.aplicaciones.reduce((appSum, app) =>
                appSum + (parseFloat(app.importe) || 0), 0);
            return sum + adoTotal;
        }

        // For ARQUEO: sum all final partidas (except Total)
        if (detalle.final && Array.isArray(detalle.final)) {
            const arqueoTotal = detalle.final
                .filter(p => p.partida !== 'Total')
                .reduce((partSum, part) =>
                    partSum + (parseFloat(part.IMPORTE_PARTIDA) || 0), 0);
            return sum + arqueoTotal;
        }

        return sum;
    }, 0);

    const totalCredit = 0; // In this accounting system, credits are managed differently
    // The balance should match the bank movement importe

    // Build body content
    const bodyHtml = `
        <!-- Task Summary Section -->
        <div class="task-summary-section">
            <div class="summary-item">
                <div class="summary-label">Estado</div>
                <div class="summary-value">${getStatusBadge(summary.overallStatus)}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Fecha Creación</div>
                <div class="summary-value">${formatDate(summary.creationDate)}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Operaciones</div>
                <div class="summary-value">${summary.totalOperations}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Completadas</div>
                <div class="summary-value" style="color: #00C853;">${summary.succeededCount}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Fallidas</div>
                <div class="summary-value" style="color: #FF3B30;">${summary.failedCount}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Total Aplicaciones</div>
                <div class="summary-value" style="color: #1976d2; font-weight: 700;">${formatCurrency(totalDebit)}</div>
            </div>
        </div>

        <!-- Bank Movement Section -->
        ${summary.bankMovement ? `
            <div class="bank-movement-section">
                <div class="section-title">
                    <span class="icon">🏦</span>
                    Movimiento Bancario
                </div>
                <div class="bank-movement-grid">
                    ${summary.bankMovement.fecha ? `
                        <div class="bank-movement-item">
                            <div class="bank-movement-label">Fecha</div>
                            <div class="bank-movement-value">${escapeHtml(summary.bankMovement.fecha)}</div>
                        </div>
                    ` : ''}
                    ${summary.bankMovement.importe ? `
                        <div class="bank-movement-item">
                            <div class="bank-movement-label">Importe</div>
                            <div class="bank-movement-value" style="font-weight: 700; color: ${parseFloat(summary.bankMovement.importe) >= 0 ? '#00C853' : '#FF3B30'};">
                                ${formatCurrency(parseFloat(summary.bankMovement.importe))}
                            </div>
                        </div>
                    ` : ''}
                    ${summary.bankMovement.caja ? `
                        <div class="bank-movement-item">
                            <div class="bank-movement-label">Caja</div>
                            <div class="bank-movement-value">${escapeHtml(summary.bankMovement.caja)}</div>
                        </div>
                    ` : ''}
                    ${summary.bankMovement.saldo ? `
                        <div class="bank-movement-item">
                            <div class="bank-movement-label">Saldo</div>
                            <div class="bank-movement-value">${formatCurrency(parseFloat(summary.bankMovement.saldo))}</div>
                        </div>
                    ` : ''}
                </div>
                ${summary.bankMovement.concepto ? `
                    <div class="bank-movement-description">
                        <div class="bank-movement-label">Concepto</div>
                        <div class="bank-movement-text">${escapeHtml(summary.bankMovement.concepto)}</div>
                    </div>
                ` : ''}
            </div>
        ` : ''}

        <!-- Operations Section -->
        <div class="operations-section">
            <div class="section-title">
                <span class="icon">⚙️</span>
                Desglose de Operaciones
            </div>
            <div class="operations-list">
                ${operations.map(op => renderOperationCard(op)).join('')}
            </div>
        </div>
    `;

    document.getElementById('taskDetailBody').innerHTML = bodyHtml;

    // Show/hide retry button
    const retryBtn = document.getElementById('btnModalRetry');
    if (summary.overallStatus === 'failed' || summary.overallStatus === 'partial') {
        retryBtn.style.display = 'block';
        retryBtn.onclick = () => handleRetryTask(summary.taskId);
    } else {
        retryBtn.style.display = 'none';
    }
}

/**
 * Render operation card
 */
function renderOperationCard(operation) {
    const status = (operation.operation_status || 'pending').toLowerCase();
    const statusClass = `op-${status}`;
    const taskData = operation.task_data || {};
    const detalle = taskData.detalle || {};
    const tipo = taskData.tipo || operation.task_type;

    // Calculate total for ADO aplicaciones
    let totalAplicaciones = 0;
    if (detalle.aplicaciones && Array.isArray(detalle.aplicaciones)) {
        totalAplicaciones = detalle.aplicaciones.reduce((sum, app) => sum + (parseFloat(app.importe) || 0), 0);
    }

    // Get texto from ADO or ARQUEO
    let textoContable = '';
    if (detalle.texto) {
        textoContable = detalle.texto;
    } else if (detalle.texto_sical && Array.isArray(detalle.texto_sical) && detalle.texto_sical[0]) {
        textoContable = detalle.texto_sical[0].tcargo || '';
    }

    return `
        <div class="operation-card ${statusClass}">
            <div class="operation-header">
                <div class="operation-title">
                    <span class="operation-index">#${operation.operation_index || 0}</span>
                    <span class="operation-type">${escapeHtml(tipo || 'Unknown').toUpperCase()}</span>
                </div>
                ${getStatusBadge(status)}
            </div>

            <div class="operation-body">
                <div class="operation-detail">
                    <div class="operation-detail-label">Estado</div>
                    <div class="operation-detail-value">${status === 'completed' ? 'COMPLETADO' : status === 'failed' ? 'FALLIDO' : 'PENDIENTE'}</div>
                </div>

                ${detalle.fecha ? `
                    <div class="operation-detail">
                        <div class="operation-detail-label">Fecha</div>
                        <div class="operation-detail-value">${escapeHtml(detalle.fecha)}</div>
                    </div>
                ` : ''}

                ${detalle.tercero ? `
                    <div class="operation-detail">
                        <div class="operation-detail-label">Tercero</div>
                        <div class="operation-detail-value">${escapeHtml(detalle.tercero)}</div>
                    </div>
                ` : ''}

                ${detalle.caja ? `
                    <div class="operation-detail">
                        <div class="operation-detail-label">Caja</div>
                        <div class="operation-detail-value">${escapeHtml(detalle.caja)}</div>
                    </div>
                ` : ''}

                ${totalAplicaciones > 0 ? `
                    <div class="operation-detail">
                        <div class="operation-detail-label">Total Aplicaciones</div>
                        <div class="operation-detail-value" style="font-weight: 700; color: #1976d2;">
                            ${formatCurrency(totalAplicaciones)}
                        </div>
                    </div>
                ` : ''}

                ${detalle.expediente ? `
                    <div class="operation-detail">
                        <div class="operation-detail-label">Expediente</div>
                        <div class="operation-detail-value">${escapeHtml(detalle.expediente)}</div>
                    </div>
                ` : ''}

                ${operation.creation_date ? `
                    <div class="operation-detail">
                        <div class="operation-detail-label">Creado</div>
                        <div class="operation-detail-value">${formatDate(operation.creation_date)}</div>
                    </div>
                ` : ''}

                ${operation.processed_date ? `
                    <div class="operation-detail">
                        <div class="operation-detail-label">Procesado</div>
                        <div class="operation-detail-value">${formatDate(operation.processed_date)}</div>
                    </div>
                ` : ''}
            </div>

            ${textoContable ? `
                <div class="operation-accounting-section">
                    <div class="operation-description-label">Texto Contable</div>
                    <div class="operation-description-text">${escapeHtml(textoContable)}</div>
                </div>
            ` : ''}

            ${detalle.aplicaciones && detalle.aplicaciones.length > 0 ? `
                <div class="aplicaciones-section">
                    <div class="aplicaciones-title">Aplicaciones (${detalle.aplicaciones.length})</div>
                    <div class="aplicaciones-list">
                        ${detalle.aplicaciones.map((app, idx) => `
                            <div class="aplicacion-item">
                                <div class="aplicacion-row">
                                    <span class="aplicacion-label">Funcional:</span>
                                    <span class="aplicacion-value">${escapeHtml(app.funcional || '-')}</span>
                                </div>
                                <div class="aplicacion-row">
                                    <span class="aplicacion-label">Económica:</span>
                                    <span class="aplicacion-value">${escapeHtml(app.economica || '-')}</span>
                                </div>
                                <div class="aplicacion-row">
                                    <span class="aplicacion-label">Importe:</span>
                                    <span class="aplicacion-value" style="font-weight: 700; color: #1976d2;">
                                        ${formatCurrency(parseFloat(app.importe) || 0)}
                                    </span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${operation.error_message ? `
                <div class="error-message-box">
                    <div class="error-message-label">Mensaje de Error</div>
                    <div class="error-message-text">${escapeHtml(operation.error_message)}</div>
                </div>
            ` : ''}

            ${operation.sical_response ? `
                <div class="sical-response-box">
                    <div class="sical-response-label">Respuesta SICAL</div>
                    <div class="sical-response-content">${formatSicalResponse(operation.sical_response)}</div>
                </div>
            ` : ''}
        </div>
    `;
}

// ========================================
// TASK ACTIONS
// ========================================

/**
 * Handle sync task action
 */
async function handleSyncTask(taskId) {
    console.log(`[TaskMonitor] Syncing task: ${taskId}`);

    try {
        const result = await window.api.invoke('sync-task-results', { taskId });

        if (result.success) {
            showSuccessToast(`Task synced: ${result.overallStatus} (${result.succeeded}/${result.total} succeeded)`);
            refreshTaskMonitor();
        } else {
            showErrorToast('Failed to sync task: ' + result.error);
        }
    } catch (error) {
        console.error('[TaskMonitor] Error syncing task:', error);
        showErrorToast('Error syncing task: ' + error.message);
    }
}

/**
 * Handle retry task action
 */
async function handleRetryTask(taskId) {
    console.log(`[TaskMonitor] Retrying task: ${taskId}`);

    // TODO: Implement retry logic
    // This would involve:
    // 1. Finding the original task JSON
    // 2. Re-processing failed operations
    // 3. Moving file back to pending_files/

    showInfoToast('Retry functionality will be implemented in Phase 4');
}

/**
 * Handle retry all tasks of a certain status
 */
async function handleRetryAll(status) {
    console.log(`[TaskMonitor] Retrying all ${status} tasks`);

    // TODO: Implement bulk retry logic
    showInfoToast(`Retry all ${status} tasks will be implemented in Phase 4`);
}

// ========================================
// PAGINATION
// ========================================

/**
 * Update pagination controls
 */
function updatePagination() {
    const totalTasks = taskMonitorState.filteredTasks.length;
    const totalPages = Math.ceil(totalTasks / taskMonitorState.tasksPerPage);
    const currentPage = taskMonitorState.currentPage;

    // Update info text
    const startIndex = (currentPage - 1) * taskMonitorState.tasksPerPage + 1;
    const endIndex = Math.min(startIndex + taskMonitorState.tasksPerPage - 1, totalTasks);

    const infoElement = document.getElementById('taskMonitorPaginationInfo');
    if (infoElement) {
        infoElement.textContent = `Showing ${startIndex}-${endIndex} of ${totalTasks} tasks`;
    }

    // Render pagination buttons
    const controlsElement = document.getElementById('taskMonitorPaginationControls');
    if (controlsElement) {
        controlsElement.innerHTML = renderPaginationButtons(currentPage, totalPages);
        attachPaginationListeners();
    }
}

/**
 * Render pagination buttons
 */
function renderPaginationButtons(currentPage, totalPages) {
    if (totalPages <= 1) {
        return '';
    }

    let buttons = [];

    // Previous button
    buttons.push(`
        <button class="pagination-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
            ‹ Prev
        </button>
    `);

    // Page number buttons
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            buttons.push(`
                <button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `);
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            buttons.push('<span class="pagination-ellipsis">...</span>');
        }
    }

    // Next button
    buttons.push(`
        <button class="pagination-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>
            Next ›
        </button>
    `);

    return buttons.join('');
}

/**
 * Attach pagination button listeners
 */
function attachPaginationListeners() {
    const buttons = document.querySelectorAll('#taskMonitorPaginationControls .pagination-btn');

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            if (button.disabled) return;

            const page = parseInt(button.getAttribute('data-page'));
            if (page >= 1 && page <= Math.ceil(taskMonitorState.filteredTasks.length / taskMonitorState.tasksPerPage)) {
                taskMonitorState.currentPage = page;
                renderTaskList();
                updatePagination();
            }
        });
    });
}

// ========================================
// UI STATES
// ========================================

/**
 * Show loading state
 */
function showLoadingState() {
    const tbody = document.getElementById('taskMonitorTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="task-monitor-loading">
                        <div class="loading-spinner"></div>
                        <div class="loading-text">Loading tasks...</div>
                    </div>
                </td>
            </tr>
        `;
    }
}

/**
 * Show empty state
 */
function showEmptyState() {
    const tbody = document.getElementById('taskMonitorTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="task-monitor-empty-state">
                        <div class="empty-state-icon">📋</div>
                        <div class="empty-state-title">No Tasks Found</div>
                        <div class="empty-state-description">
                            ${taskMonitorState.searchQuery || taskMonitorState.currentFilter !== 'all'
                                ? 'Try adjusting your filters or search query'
                                : 'No accounting tasks have been created yet'}
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }
}

/**
 * Show error state
 */
function showErrorState(message) {
    const tbody = document.getElementById('taskMonitorTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="task-monitor-empty-state">
                        <div class="empty-state-icon" style="color: #FF3B30;">❌</div>
                        <div class="empty-state-title">Error Loading Tasks</div>
                        <div class="empty-state-description">${escapeHtml(message)}</div>
                    </div>
                </td>
            </tr>
        `;
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';

    try {
        const date = new Date(dateString);
        return date.toLocaleString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    } catch (error) {
        return dateString;
    }
}

/**
 * Format currency for display
 */
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'N/A';

    try {
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numAmount);
    } catch (error) {
        return amount.toString();
    }
}

/**
 * Format SICAL response for display
 */
function formatSicalResponse(response) {
    if (typeof response === 'string') {
        try {
            const parsed = JSON.parse(response);
            return escapeHtml(JSON.stringify(parsed, null, 2));
        } catch {
            return escapeHtml(response);
        }
    }
    return escapeHtml(JSON.stringify(response, null, 2));
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show success toast
 */
function showSuccessToast(message) {
    showToast(message, 'success');
}

/**
 * Show error toast
 */
function showErrorToast(message) {
    showToast(message, 'error');
}

/**
 * Show info toast
 */
function showInfoToast(message) {
    showToast(message, 'info');
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    // Reuse existing error toast element from main app
    const toast = document.getElementById('errorToast');
    if (toast) {
        toast.textContent = message;
        toast.style.display = 'block';

        // Add type-specific styling
        if (type === 'success') {
            toast.style.background = '#00C853';
        } else if (type === 'error') {
            toast.style.background = '#FF3B30';
        } else {
            toast.style.background = '#4C9AFF';
        }

        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    } else {
        console.log(`[TaskMonitor] ${type.toUpperCase()}: ${message}`);
    }
}

// ========================================
// EXPORTS & INITIALIZATION
// ========================================

// Make functions available globally for tab navigation
window.initTaskMonitor = initTaskMonitor;
window.refreshTaskMonitor = refreshTaskMonitor;

console.log('[TaskMonitor] Module loaded');
