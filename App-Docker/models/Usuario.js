const mongoose = require('mongoose');

const UsuarioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    rol: { type: String, default: 'Cliente' },
    fechaRegistro: { type: Date, default: Date.now },

    historialCompras: [
        { type: mongoose.Schema.Types.ObjectId, ref: 'Pedido' }
    ]
});

module.exports = mongoose.model('Usuario', UsuarioSchema);