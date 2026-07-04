const mongoose = require('mongoose');

const PedidoSchema = new mongoose.Schema({
    clienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    metodoPago: { type: String, required: true },
    estado: { type: String, default: 'Pendiente' },
    fecha: { type: Date, default: Date.now },

    boleta: {
        numeroBoleta: { type: String, required: true, unique: true },
        rucTienda: { type: String, default: '20123456789' },
        productos: [
            {
                productoId: { type: String, required: true },
                nombre: { type: String, required: true },
                precioUnitario: { type: Number, required: true },
                cantidad: { type: Number, required: true },
                subtotal: { type: Number, required: true }
            }
        ],
        montoGrabado: { type: Number, required: true },
        igv: { type: Number, required: true },
        montoTotal: { type: Number, required: true }
    },

    repartidorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null, index: true },
    direccionEntrega: { type: String, required: true },
    zonaEntrega: {
        type: String,
        enum: ['', 'Norte', 'Sur', 'Este', 'Oeste', 'Centro'],
        default: ''
    }
});

PedidoSchema.index({ clienteId: 1 });
PedidoSchema.index({ estado: 1 });

module.exports = mongoose.model('Pedido', PedidoSchema);
