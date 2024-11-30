module.exports = {
    createArqueoForm: function() {
        return `
            <h3>Arqueo</h3>
            <div class="form-row">
                <div class="form-group">
                    <label for="fecha_ingreso">Fecha:</label>
                    <input type="date" id="fecha_ingreso" name="fecha_ingreso" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="caja">Caja:</label>
                    <input type="text" id="caja" name="caja" required>
                    <span class="info">Banco Patiño ...</span>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="tercero">Tercero:</label>
                    <input type="text" id="tercero" name="tercero" required>
                    <span class="info">Deudores varios ...</span>
                </div>
            </div>
            <div class="form-group">
                <label for="naturaleza">Naturaleza:</label>
                <select id="naturaleza" name="naturaleza" required>
                    <option value="4">Contraído simultáneo: 4</option>
                </select>
            </div>
            <div class="form-group">
                <label for="texto">Texto operación:</label>
                <textarea id="texto" name="texto" rows="3"></textarea>
            </div>
            <div class="aplicaciones-section">
                <h4>Aplicaciones</h4>
                <table>
                    <thead>
                        <tr>
                            <th>Partida</th>
                            <th>Importe</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
                <button type="button" class="add-aplicacion">+ AÑADIR</button>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn-submit">Añadir Arqueo a la Lista</button>
                <button type="button" class="btn-cancel">Cancelar</button>
            </div>
        `;
    },
    
    createArqueoAplicacionRow: function() {
        return `
            <td><input type="text" name="partida[]" required></td>
            <td><input type="number" name="importe[]" required></td>
            <td><button type="button" class="remove-row">X</button></td>
        `;
    }
};