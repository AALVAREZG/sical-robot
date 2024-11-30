const OperacionBase = require('./OperacionBase');

class Gasto extends OperacionBase {
    constructor() {
        super();
        this.tipo = 'gasto';
        this.expediente = '';
        this.fpago = '';
        this.tpago = '';
        this.texto = '';
        this.aplicaciones = {};  // Changed from array to object
        this.totalImporte = 0;
    }

    validate() {
        super.validate();
        if (!this.expediente) throw new Error('Expediente es requerido');
        if (!this.fpago) throw new Error('Forma de pago es requerida');
        if (!this.tpago) throw new Error('Tipo de pago es requerido');
        if (Object.keys(this.aplicaciones).length === 0) {
            throw new Error('Debe añadir al menos una aplicación');
        }
        if (this.totalImporte !== this.importe) {
            throw new Error('La suma de importes de aplicaciones debe coincidir con el importe total');
        }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            expediente: this.expediente,
            fpago: this.fpago,
            tpago: this.tpago,
            texto: this.texto,
            aplicaciones: this.aplicaciones,
            totalImporte: this.totalImporte
        };
    }

    fromJSON(json) {
        super.fromJSON(json);
        this.expediente = json.expediente;
        this.fpago = json.fpago;
        this.tpago = json.tpago;
        this.texto = json.texto;
        this.aplicaciones = json.aplicaciones || {};
        this.totalImporte = json.totalImporte || 0;
    }

    addAplicacion(id, funcional, economica, importe) {
        this.aplicaciones[id] = { funcional, economica, importe };
        this.recalculateTotal();
    }

    removeAplicacion(id) {
        delete this.aplicaciones[id];
        this.recalculateTotal();
    }

    updateAplicacion(id, funcional, economica, importe) {
        if (this.aplicaciones[id]) {
            this.aplicaciones[id] = { funcional, economica, importe };
            this.recalculateTotal();
        }
    }

    recalculateTotal() {
        this.totalImporte = Object.values(this.aplicaciones)
            .reduce((sum, { importe }) => sum + parseFloat(importe), 0);
    }

    getAplicaciones() {
        return this.aplicaciones;
    }
}

module.exports = Gasto;