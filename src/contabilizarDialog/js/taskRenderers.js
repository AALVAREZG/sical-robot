/**
 * TaskRenderers - Handles rendering of task cards
 */

// Get the electron modules
const { ipcRenderer } = require('electron');

// Cache for lookups
const lookupCache = {
    cajas: null,
    terceros: {}
};

const TaskRenderers = {
    /**
     * Initialize lookup data
     */
    async initializeLookups() {
        try {
            console.log('🚀 Initializing lookups...');

            // Load all cajas
            console.log('📡 Calling IPC: get-all-cajas');
            const cajasResult = await ipcRenderer.invoke('get-all-cajas');

            console.log('📥 IPC Response:', cajasResult);

            if (cajasResult && cajasResult.status === "success" && cajasResult.data) {
                lookupCache.cajas = cajasResult.data;
                console.log('✅ Loaded', cajasResult.data?.length || 0, 'cajas into cache');
                console.log('📦 Sample cajas:', cajasResult.data?.slice(0, 3));
            } else {
                console.error('❌ Failed to load cajas:', cajasResult);
            }
        } catch (error) {
            console.error('💥 Error initializing lookups:', error);
        }
    },

    /**
     * Get full caja name from code
     * @param {string} cajaCode - Caja code (e.g., "200" or "203")
     * @returns {string} Full caja name
     */
    async getCajaFullName(cajaCode) {
        console.log('🔍 getCajaFullName called with:', cajaCode);

        if (!lookupCache.cajas) {
            console.log('📦 Cache empty, initializing lookups...');
            await this.initializeLookups();
        }

        if (!lookupCache.cajas) {
            console.error('❌ No cajas in cache after initialization!');
            return null;
        }

        console.log('✓ Cache has', lookupCache.cajas.length, 'cajas');
        console.log('📋 First 3 cajas in cache:', lookupCache.cajas.slice(0, 3));

        // Extract first 3 digits
        const searchCode = cajaCode.toString().substring(0, 3);
        console.log('🔎 Searching for caja starting with:', searchCode + '_');

        // Find matching caja
        const matchingCaja = lookupCache.cajas.find(c => {
            const matches = c.caja && c.caja.startsWith(searchCode + '_');
            if (c.caja && c.caja.startsWith(searchCode)) {
                console.log(`  Checking: ${c.caja} -> ${matches ? '✓ MATCH' : '✗ no match'}`);
            }
            return matches;
        });

        if (matchingCaja) {
            console.log('✅ Found caja:', matchingCaja.caja);
        } else {
            console.error('❌ No matching caja found for code:', searchCode);
            console.log('Available cajas starting with', searchCode + ':',
                lookupCache.cajas.filter(c => c.caja && c.caja.startsWith(searchCode))
            );
        }

        return matchingCaja ? matchingCaja.caja : null;
    },

    /**
     * Get tercero denomination
     * @param {string} terceroCode - Tercero code
     * @returns {string} Tercero denomination
     */
    async getTerceroDenomination(terceroCode) {
        // Check cache first
        if (lookupCache.terceros[terceroCode]) {
            return lookupCache.terceros[terceroCode];
        }

        try {
            const result = await ipcRenderer.invoke('get-tercero-denomination', terceroCode);
            if (result.success) {
                lookupCache.terceros[terceroCode] = result.denomination;
                return result.denomination;
            }
        } catch (error) {
            console.error('Error getting tercero denomination:', error);
        }

        return 'Unknown';
    },

    /**
     * Render a task card
     *
     * @param {Object} task - The task data
     * @param {number} index - The task index
     * @param {Function} editCallback - Function to call when edit button is clicked
     * @param {Function} deleteCallback - Function to call when delete button is clicked
     * @returns {Promise<HTMLElement>} The rendered task card
     */
    async renderTaskCard(task, index, editCallback, deleteCallback) {
        const taskCard = document.createElement('div');
        taskCard.className = 'task-card-table';

        // Create task details based on task type
        let taskContent;

        if (task.tipo === 'arqueo') {
            taskContent = await this.renderArqueoDetailsTable(task.detalle);
        } else if (task.tipo === 'ado220') {
            taskContent = await this.renderAdoDetailsTable(task.detalle);
        } else {
            // Generic fallback
            taskContent = document.createElement('div');
            taskContent.className = 'task-details';
            taskContent.textContent = 'Tipo de tarea desconocido';
        }

        // Add header row with edit/delete buttons
        const headerRow = document.createElement('div');
        headerRow.className = 'task-card-header';
        headerRow.innerHTML = `
            <span class="task-type-badge ${task.tipo}">${task.tipo.toUpperCase()}</span>
            <div class="task-actions">
                <button class="task-btn-edit">Editar</button>
                <button class="task-btn-delete">×</button>
            </div>
        `;

        // Add event listeners
        headerRow.querySelector('.task-btn-edit').addEventListener('click', () => editCallback(index));
        headerRow.querySelector('.task-btn-delete').addEventListener('click', () => deleteCallback(index));

        // Assemble the task card
        taskCard.appendChild(headerRow);
        taskCard.appendChild(taskContent);

        return taskCard;
    },

    /**
     * Render arqueo task details in compact card format
     *
     * @param {Object} detalle - The task details
     * @returns {Promise<HTMLElement>} The rendered details
     */
    async renderArqueoDetailsTable(detalle) {
        const container = document.createElement('div');
        container.className = 'task-compact-card';

        // Get lookups
        const cajaFullName = await this.getCajaFullName(detalle.caja || '');
        const terceroDenomination = await this.getTerceroDenomination(detalle.tercero || '');

        // LINE 1: Type, Date, Tercero ID, Tercero Name, Caja ID, Caja Name
        const line1 = document.createElement('div');
        line1.className = 'task-line task-line-header';
        line1.innerHTML = `
            <span class="task-label">TAREA:</span>
            <span class="task-value"><strong>ARQUEO</strong></span>
            <span class="task-separator">•</span>
            <span class="task-label">FECHA:</span>
            <span class="task-value">${detalle.fecha || 'N/A'}</span>
            <span class="task-separator">•</span>
            <span class="task-label">TERCERO:</span>
            <span class="task-value">${detalle.tercero || 'N/A'}</span>
            <span class="task-value-secondary">(${terceroDenomination || 'Sin nombre'})</span>
            <span class="task-separator">•</span>
            <span class="task-label">CAJA:</span>
            <span class="task-value">${detalle.caja || 'N/A'}</span>
            <span class="task-value-secondary">(${cajaFullName || 'Sin nombre'})</span>
        `;
        container.appendChild(line1);

        // LINE 2: Tipo Operation (dropdown 1-5), Texto Operation
        const line2 = document.createElement('div');
        line2.className = 'task-line task-line-details';

        // Calculate naturaleza value (1-5)
        const naturalezaDisplay = detalle.naturaleza || '1';

        line2.innerHTML = `
            <span class="task-label">TIPO OPERACIÓN:</span>
            <span class="task-value naturaleza-badge naturaleza-${naturalezaDisplay}">${naturalezaDisplay}</span>
            <span class="task-separator">•</span>
            <span class="task-label">TEXTO:</span>
            <span class="task-value task-texto">${detalle.texto_sical && detalle.texto_sical.length > 0
                ? detalle.texto_sical.map(t => t.tcargo).join('; ')
                : 'Sin texto'}</span>
        `;
        container.appendChild(line2);

        // LINE 3: Aplicaciones (Partidas) - Compact format
        if (detalle.final && detalle.final.length > 0) {
            const line3 = document.createElement('div');
            line3.className = 'task-line task-line-aplicaciones';

            // Build aplicaciones list
            const aplicacionesList = document.createElement('div');
            aplicacionesList.className = 'aplicaciones-list';

            for (const p of detalle.final) {
                // Try 'ingreso' first, then 'no_presupuestaria' as fallback
                let mappingInfo = await ipcRenderer.invoke('get-mapping-info', 'ingreso', p.partida);
                let partidaData = mappingInfo.success ? mappingInfo.data : null;

                // If not found in ingreso, try no_presupuestaria
                if (!partidaData || !partidaData.found) {
                    mappingInfo = await ipcRenderer.invoke('get-mapping-info', 'no_presupuestaria', p.partida);
                    partidaData = mappingInfo.success ? mappingInfo.data : null;
                }

                // Get proyecto/GFA info if exists
                let proyectoText = '';
                if (p.proyecto) {
                    const proyResult = await ipcRenderer.invoke('get-mapping-info', 'proyecto', p.proyecto);
                    proyectoText = proyResult.success && proyResult.data.found
                        ? ` [${p.proyecto}]`
                        : ` [${p.proyecto}]`;
                }

                const aplicacionItem = document.createElement('div');
                aplicacionItem.className = 'aplicacion-item';

                const description = partidaData?.found ? partidaData.description : 'Sin descripción';
                const cuentaPGP = partidaData?.cuenta_pgp || '-';

                aplicacionItem.innerHTML = `
                    <span class="aplic-partida">${p.partida}</span>
                    <span class="aplic-desc">${description}</span>
                    <span class="aplic-arrow">→</span>
                    <span class="aplic-cuenta">${cuentaPGP}</span>
                    ${proyectoText ? `<span class="aplic-proyecto">${proyectoText}</span>` : ''}
                    <span class="aplic-importe">${p.IMPORTE_PARTIDA} €</span>
                `;

                aplicacionesList.appendChild(aplicacionItem);
            }

            const aplicacionesLabel = document.createElement('div');
            aplicacionesLabel.className = 'aplicaciones-label';
            aplicacionesLabel.innerHTML = `<strong>APLICACIÓN (PARTIDA):</strong>`;

            line3.appendChild(aplicacionesLabel);
            line3.appendChild(aplicacionesList);
            container.appendChild(line3);
        }

        return container;
    },

    /**
     * Render ado220 task details in compact card format
     *
     * @param {Object} detalle - The task details
     * @returns {Promise<HTMLElement>} The rendered details
     */
    async renderAdoDetailsTable(detalle) {
        const container = document.createElement('div');
        container.className = 'task-compact-card';

        // Get lookups
        const cajaFullName = await this.getCajaFullName(detalle.caja || '');
        const terceroDenomination = await this.getTerceroDenomination(detalle.tercero || '');

        // LINE 1: Type, Date, Tercero ID, Tercero Name, Caja ID, Caja Name
        const line1 = document.createElement('div');
        line1.className = 'task-line task-line-header';
        line1.innerHTML = `
            <span class="task-label">TAREA:</span>
            <span class="task-value"><strong>ADO</strong></span>
            <span class="task-separator">•</span>
            <span class="task-label">FECHA:</span>
            <span class="task-value">${detalle.fecha || 'N/A'}</span>
            <span class="task-separator">•</span>
            <span class="task-label">EXPEDIENTE:</span>
            <span class="task-value">${detalle.expediente || 'N/A'}</span>
            <span class="task-separator">•</span>
            <span class="task-label">TERCERO:</span>
            <span class="task-value">${detalle.tercero || 'N/A'}</span>
            <span class="task-value-secondary">(${terceroDenomination || 'Sin nombre'})</span>
            <span class="task-separator">•</span>
            <span class="task-label">CAJA:</span>
            <span class="task-value">${detalle.caja || 'N/A'}</span>
            <span class="task-value-secondary">(${cajaFullName || 'Sin nombre'})</span>
        `;
        container.appendChild(line1);

        // LINE 2: Forma de Pago, Tipo de Pago, Texto
        const line2 = document.createElement('div');
        line2.className = 'task-line task-line-details';
        line2.innerHTML = `
            <span class="task-label">F.PAGO:</span>
            <span class="task-value">${detalle.fpago || 'N/A'}</span>
            <span class="task-separator">•</span>
            <span class="task-label">T.PAGO:</span>
            <span class="task-value">${detalle.tpago || 'N/A'}</span>
            <span class="task-separator">•</span>
            <span class="task-label">TEXTO:</span>
            <span class="task-value task-texto">${detalle.texto || 'Sin texto'}</span>
        `;
        container.appendChild(line2);

        // LINE 3: Aplicaciones (Func/Econ) - Compact format
        if (detalle.aplicaciones && detalle.aplicaciones.length > 0) {
            const line3 = document.createElement('div');
            line3.className = 'task-line task-line-aplicaciones';

            // Build aplicaciones list
            const aplicacionesList = document.createElement('div');
            aplicacionesList.className = 'aplicaciones-list';

            for (const a of detalle.aplicaciones) {
                // Get funcional description
                const funcionalInfo = await ipcRenderer.invoke('get-mapping-info', 'funcional', a.funcional);
                const funcionalDesc = funcionalInfo.success && funcionalInfo.data.found
                    ? funcionalInfo.data.description
                    : '';

                // Get económica description and cuenta PGP
                const economicaInfo = await ipcRenderer.invoke('get-mapping-info', 'gasto', a.economica);
                const economicaData = economicaInfo.success ? economicaInfo.data : null;

                // Get proyecto/GFA info if exists
                let proyectoText = '';
                if (a.proyecto) {
                    const proyResult = await ipcRenderer.invoke('get-mapping-info', 'proyecto', a.proyecto);
                    proyectoText = proyResult.success && proyResult.data.found
                        ? ` [${a.proyecto}]`
                        : ` [${a.proyecto}]`;
                }

                const aplicacionItem = document.createElement('div');
                aplicacionItem.className = 'aplicacion-item';

                const economicaDescription = economicaData?.found ? economicaData.description : 'Sin descripción';
                const cuentaPGP = economicaData?.cuenta_pgp || a.cuenta || '-';

                aplicacionItem.innerHTML = `
                    <span class="aplic-funcional">${a.funcional}</span>
                    <span class="aplic-separator">/</span>
                    <span class="aplic-economica">${a.economica}</span>
                    <span class="aplic-desc">${economicaDescription}</span>
                    <span class="aplic-arrow">→</span>
                    <span class="aplic-cuenta">${cuentaPGP}</span>
                    ${proyectoText ? `<span class="aplic-proyecto">${proyectoText}</span>` : ''}
                    <span class="aplic-importe">${a.importe} €</span>
                `;

                aplicacionesList.appendChild(aplicacionItem);
            }

            const aplicacionesLabel = document.createElement('div');
            aplicacionesLabel.className = 'aplicaciones-label';
            aplicacionesLabel.innerHTML = `<strong>APLICACIÓN (FUNC/ECON):</strong>`;

            line3.appendChild(aplicacionesLabel);
            line3.appendChild(aplicacionesList);
            container.appendChild(line3);
        }

        return container;
    }
};

// Export the module
module.exports = TaskRenderers;
