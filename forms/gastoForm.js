module.exports = {
    createGastoForm: function() {
        return `
            <h3>Gasto</h3>
            <div class="form-row">
                <div class="form-group">
                    <label for="fecha">Fecha:</label>
                    <input type="date" id="fecha" name="fecha" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="expediente">Expediente:</label>
                    <input type="text" id="expediente" name="expediente" required>
                </div>
                <div class="form-group">
                    <label for="fpago">Forma de pago:</label>
                    <input type="text" id="fpago" name="fpago" required>
                </div>
                <div class="form-group">
                    <label for="tpago">Tipo de pago:</label>
                    <input type="text" id="tpago" name="tpago" required>
                </div>
            </div>
            <div class="form-group">
                <label for="texto">Texto:</label>
                <textarea id="texto" name="texto" rows="3"></textarea>
            </div>
            <div class="aplicaciones-section">
                <h4>Aplicaciones</h4>
                <table>
                    <thead>
                        <tr>
                            <th>Funcional</th>
                            <th>Económica</th>
                            <th>Importe</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
                <button type="button" class="add-aplicacion">+ AÑADIR</button>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn-submit">Añadir Gasto a la Lista</button>
                <button type="button" class="btn-cancel">Cancelar</button>
            </div>
        `;
    },
    
    createGastoAplicacionRow: function() {
        return `
            <td><input type="text" name="funcional[]" required></td>
            <td><input type="text" name="economica[]" required></td>
            <td><input type="number" name="importe[]" required></td>
            <td><button type="button" class="remove-row">X</button></td>
        `;
    }
};