const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const productoRoutes = require('./routes/productos');
const pedidoRoutes = require('./routes/pedidos');
const usuarioRoutes = require('./routes/usuarios');
const postRoutes = require('./routes/posts');
const comentarioRoutes = require('./routes/comentarios');
const seguidorRoutes = require('./routes/seguidores');
const notificacionRoutes = require('./routes/notificaciones');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.set('io', io);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27019/mongodb-datos';

async function conectarMongoConReintentos(maxIntentos = 5) {
    for (let i = 1; i <= maxIntentos; i++) {
        try {
            await mongoose.connect(MONGO_URI);
            console.log('Capa 2 conectada con exito a MongoDB');
            return;
        } catch (err) {
            console.error(`Intento ${i}/${maxIntentos} - Error al conectar a MongoDB: ${err.message}`);
            if (i === maxIntentos) throw err;
            await new Promise(res => setTimeout(res, 3000));
        }
    }
}

conectarMongoConReintentos()
    .catch(err => {
        console.error('No se pudo conectar a MongoDB tras varios intentos:', err.message);
        process.exit(1);
    });

app.get('/api/health', (req, res) => {
    const estadoMongo = mongoose.connection.readyState === 1 ? 'conectado' : 'desconectado';
    res.json({
        status: estadoMongo === 'conectado' ? 'healthy' : 'degradado',
        mongo: estadoMongo,
        timestamp: new Date().toISOString()
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comentarios', comentarioRoutes);
app.use('/api/seguidores', seguidorRoutes);
app.use('/api/notificaciones', notificacionRoutes);

app.get('/api/prueba', (req, res) => {
    res.json({ mensaje: "API funcionando" });
});

io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);
    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

process.on('SIGTERM', async () => {
    console.log('SIGTERM recibido, cerrando conexiones...');
    await mongoose.connection.close();
    server.close(() => process.exit(0));
});
