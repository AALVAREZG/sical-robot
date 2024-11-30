const OperacionBase = require('./OperacionBase');

class Arqueo extends OperacionBase {
    constructor() {
        super();
        this.tipo = 'arqueo';
        this.caja = '';
        this.tercero = '';
        this.naturaleza = '';
        this.texto = '';
        this.aplicaciones = {};  // Changed from array to object
        this.totalImporte = 0;
    }

    validate() {
        super.validate();
        if (!this.caja) throw new Error('Caja es requerida');
        if (!this.tercero) throw new Error('Tercero es requerido');
        if (!this.naturaleza) throw new Error('Naturaleza es requerida');
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
            caja: this.caja,
            tercero: this.tercero,
            naturaleza: this.naturaleza,
            texto: this.texto,
            aplicaciones: this.aplicaciones,
            totalImporte: this.totalImporte
        };
    }

    fromJSON(json) {
        super.fromJSON(json);
        this.caja = json.caja;
        this.tercero = json.tercero;
        this.naturaleza = json.naturaleza;
        this.texto = json.texto;
        this.aplicaciones = json.aplicaciones || {};
        this.totalImporte = json.totalImporte || 0;
    }

    addAplicacion(id, partida, importe) {
        this.aplicaciones[id] = { partida, importe };
        this.recalculateTotal();
    }

    removeAplicacion(id) {
        delete this.aplicaciones[id];
        this.recalculateTotal();
    }

    updateAplicacion(id, partida, importe) {
        if (this.aplicaciones[id]) {
            this.aplicaciones[id] = { partida, importe };
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

module.exports = Arqueo;