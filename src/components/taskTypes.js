// taskTypes.js
const TaskTypes = {
    ARQUEO: {
        name: 'arqueo',
        createAplicacion: () => ({ partida: '', IMPORTE_PARTIDA: 0 }),
        renderAplicacion: (app) => `
            <div class="aplicacion-row">
                <span class="aplicacion-label">Partida: ${app.partida}</span>
                <span class="aplicacion-amount">${app.IMPORTE_PARTIDA}€</span>
            </div>`
    },
    ADO220: {
        name: 'ado220',
        createAplicacion: () => ({ 
            funcional: '', 
            economica: '', 
            importe: '', 
            cuenta: '' 
        }),
        renderAplicacion: (app) => `
            <div class="aplicacion-row">
                <span class="aplicacion-label">
                    Func: ${app.funcional} | Econ: ${app.economica} | Cuenta: ${app.cuenta}
                </span>
                <span class="aplicacion-amount">${app.importe}€</span>
            </div>`
    },
    // ... other types
};
