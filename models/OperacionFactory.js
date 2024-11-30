const Arqueo = require('./Arqueo');
const Gasto = require('./Gasto');

class OperacionFactory {
    static createOperacion(tipo) {
        switch (tipo) {
            case 'arqueo':
                return new Arqueo();
            case 'gasto':
                return new Gasto();
            default:
                throw new Error(`Tipo de operación desconocido: ${tipo}`);
        }
    }

    static fromJSON(json) {
        const operacion = this.createOperacion(json.tipo);
        operacion.fromJSON(json);
        return operacion;
    }
}

module.exports = OperacionFactory;