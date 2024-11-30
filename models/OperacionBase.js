class OperacionBase {
    constructor() {
        this.tipo = '';
        this.fecha = '';
        this.importe = 0;
    }

    validate() {
        if (!this.tipo) throw new Error('Tipo es requerido');
        if (!this.fecha) throw new Error('Fecha es requerida');
        if (!this.importe) throw new Error('Importe es requerido');
    }

    toJSON() {
        return {
            tipo: this.tipo,
            fecha: this.fecha,
            importe: this.importe
        };
    }

    fromJSON(json) {
        this.tipo = json.tipo;
        this.fecha = json.fecha;
        this.importe = json.importe;
    }
}

module.exports = OperacionBase;