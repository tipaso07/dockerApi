const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Usuario = require('./models/Usuario');
const Producto = require('./models/Producto');
const Post = require('./models/Post');
const PostLike = require('./models/PostLike');
const Comment = require('./models/Comment');
const Follow = require('./models/Follow');
const Notificacion = require('./models/Notificacion');
const Pedido = require('./models/Pedido');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27019/mongodb-datos';

const usuariosData = [
  { nombre: 'Admin Tienda', email: 'admin@delivery.com', password: '123456', rol: 'Admin', bio: 'Administrador de la tienda', avatar: '' },
  { nombre: 'Pedro Ramirez', email: 'pedro@mail.com', password: '123456', rol: 'Repartidor', bio: 'Delivery rápido y seguro', avatar: '' },
  { nombre: 'Ana Torres', email: 'ana@mail.com', password: '123456', rol: 'Repartidor', bio: 'Tu pedido en minutos', avatar: '' },
  { nombre: 'Juan Perez', email: 'juan@mail.com', password: '123456', rol: 'Cliente', bio: 'Amante de la buena comida', avatar: '' },
  { nombre: 'Maria Lopez', email: 'maria@mail.com', password: '123456', rol: 'Cliente', bio: 'Cocino en casa pero pido delivery', avatar: '' },
  { nombre: 'Carlos Ruiz', email: 'carlos@mail.com', password: '123456', rol: 'Cliente', bio: 'Siempre probando nuevos platos', avatar: '' },
  { nombre: 'Lucia Fernandez', email: 'lucia@mail.com', password: '123456', rol: 'Cliente', bio: 'Comida saludable siempre', avatar: '' },
  { nombre: 'Diego Mendoza', email: 'diego@mail.com', password: '123456', rol: 'Cliente', bio: 'Antojado permanente', avatar: '' },
  { nombre: 'Valentina Rios', email: 'valentina@mail.com', password: '123456', rol: 'Cliente', bio: 'Skin care lover', avatar: '' },
  { nombre: 'Fernando Vega', email: 'fernando@mail.com', password: '123456', rol: 'Cliente', bio: 'Pizza los viernes es ley', avatar: '' },
  { nombre: 'Camila Soto', email: 'camila@mail.com', password: '123456', rol: 'Cliente', bio: 'Productos naturales por favor', avatar: '' },
  { nombre: 'Miguel Torres', email: 'miguel@mail.com', password: '123456', rol: 'Cliente', bio: 'Delivery frecuente', avatar: '' },
  { nombre: 'Gabriela Paz', email: 'gabriela@mail.com', password: '123456', rol: 'Cliente', bio: 'Cuidado personal es prioridad', avatar: '' },
  { nombre: 'Rodrigo Chavez', email: 'rodrigo@mail.com', password: '123456', rol: 'Cliente', bio: 'Hamburguesas son mi debilidad', avatar: '' },
  { nombre: 'Sofia Castillo', email: 'sofia@mail.com', password: '123456', rol: 'Cliente', bio: 'Postres y más postres', avatar: '' },
];

const productosData = [
  { nombre: 'Hamburguesa Clásica', precio: 15.90, stock: 50, categoria: 'Alimentos', valoracion: 4.5, descripcion: 'Carne de res, lechuga, tomate y queso' },
  { nombre: 'Hamburguesa BBQ', precio: 18.50, stock: 40, categoria: 'Alimentos', valoracion: 4.7, descripcion: 'Carne de res con salsa BBQ y aros de cebolla' },
  { nombre: 'Hamburguesa Vegetariana', precio: 16.00, stock: 30, categoria: 'Alimentos', valoracion: 4.3, descripcion: 'Base de garbanzo con verduras frescas' },
  { nombre: 'Pizza Personal Pepperoni', precio: 22.50, stock: 35, categoria: 'Alimentos', valoracion: 4.8, descripcion: 'Pepperoni, queso mozzarella y salsa de tomate' },
  { nombre: 'Pizza Personal Margarita', precio: 20.00, stock: 30, categoria: 'Alimentos', valoracion: 4.6, descripcion: 'Queso mozzarella, albahaca y salsa de tomate' },
  { nombre: 'Pizza Personal Suprema', precio: 26.00, stock: 25, categoria: 'Alimentos', valoracion: 4.9, descripcion: 'Pepperoni, champiñones, pimentón y aceitunas' },
  { nombre: 'Ceviche Mixto', precio: 18.00, stock: 20, categoria: 'Alimentos', valoracion: 4.8, descripcion: 'Pescado, langostinos, cebolla y camote' },
  { nombre: 'Ceviche Clásico', precio: 15.00, stock: 25, categoria: 'Alimentos', valoracion: 4.7, descripcion: 'Pescado fresco, limón, cebolla y ají' },
  { nombre: 'Lomo Saltado', precio: 20.00, stock: 30, categoria: 'Alimentos', valoracion: 4.6, descripcion: 'Lomo de res salteado con verduras y papas' },
  { nombre: 'Tallarín Saltado', precio: 17.00, stock: 30, categoria: 'Alimentos', valoracion: 4.5, descripcion: 'Tallarín salteado con verduras y carne' },
  { nombre: 'Arroz Chaufa', precio: 16.00, stock: 35, categoria: 'Alimentos', valoracion: 4.4, descripcion: 'Arroz salteado al estilo chino con pollo' },
  { nombre: 'Ensalada Caesar', precio: 12.50, stock: 25, categoria: 'Alimentos', valoracion: 4.2, descripcion: 'Lechuga, croutons, parmesano y aderezo caesar' },
  { nombre: 'Ensalada Tropical', precio: 13.00, stock: 25, categoria: 'Alimentos', valoracion: 4.3, descripcion: 'Mix de verduras con mango y vinagreta' },
  { nombre: 'Bebida Gaseosa 500ml', precio: 4.00, stock: 100, categoria: 'Alimentos', valoracion: 4.0, descripcion: 'Gaseosa fría 500ml' },
  { nombre: 'Agua Mineral 600ml', precio: 3.00, stock: 100, categoria: 'Alimentos', valoracion: 4.0, descripcion: 'Agua mineral sin gas' },
  { nombre: 'Jugo Natural surtido', precio: 7.00, stock: 40, categoria: 'Alimentos', valoracion: 4.6, descripcion: 'Jugo natural de fruta fresca' },
  { nombre: 'Papas Fritas Grandes', precio: 8.00, stock: 60, categoria: 'Alimentos', valoracion: 4.5, descripcion: 'Papas fritas crujientes con sal' },
  { nombre: 'Tequeños 6 unidades', precio: 10.00, stock: 40, categoria: 'Alimentos', valoracion: 4.7, descripcion: 'Tequeños de queso con salsa de la casa' },
  { nombre: 'Alitas BBQ 8 piezas', precio: 14.00, stock: 30, categoria: 'Alimentos', valoracion: 4.6, descripcion: 'Alitas bañadas en salsa BBQ' },
  { nombre: 'Wrap de Pollo', precio: 11.00, stock: 25, categoria: 'Alimentos', valoracion: 4.4, descripcion: 'Wrap integral con pollo y verduras frescas' },
  { nombre: 'Jabón Artesanal Avena', precio: 8.50, stock: 40, categoria: 'Cuidado Personal', valoracion: 4.5, descripcion: 'Jabón natural de avena para piel sensible' },
  { nombre: 'Jabón Artesanal Miel', precio: 9.00, stock: 40, categoria: 'Cuidado Personal', valoracion: 4.6, descripcion: 'Jabón de miel y propóleo' },
  { nombre: 'Shampoo Natural 250ml', precio: 16.00, stock: 30, categoria: 'Cuidado Personal', valoracion: 4.7, descripcion: 'Shampoo a base de sábila y coco' },
  { nombre: 'Acondicionador Natural 250ml', precio: 16.00, stock: 30, categoria: 'Cuidado Personal', valoracion: 4.6, descripcion: 'Acondicionador con keratina natural' },
  { nombre: 'Crema Hidratante Facial', precio: 22.00, stock: 25, categoria: 'Cuidado Personal', valoracion: 4.8, descripcion: 'Crema hidratante con ácido hialurónico' },
  { nombre: 'Crema Antiarrugas', precio: 28.00, stock: 20, categoria: 'Cuidado Personal', valoracion: 4.7, descripcion: 'Crema antiarrugas con colágeno' },
  { nombre: 'Protector Solar FPS50', precio: 35.00, stock: 25, categoria: 'Cuidado Personal', valoracion: 4.9, descripcion: 'Protector solar de amplio espectro FPS50' },
  { nombre: 'Desodorante Barra Natural', precio: 10.00, stock: 35, categoria: 'Cuidado Personal', valoracion: 4.4, descripcion: 'Desodorante en barra sin aluminio' },
  { nombre: 'Desodorante Spray 48h', precio: 12.00, stock: 35, categoria: 'Cuidado Personal', valoracion: 4.3, descripcion: 'Desodorante en aerosol 48 horas' },
  { nombre: 'Cepillo de Dientes Bambú', precio: 6.00, stock: 50, categoria: 'Cuidado Personal', valoracion: 4.2, descripcion: 'Cepillo ecológico de bambú' },
  { nombre: 'Pasta Dental Natural 100ml', precio: 9.00, stock: 40, categoria: 'Cuidado Personal', valoracion: 4.5, descripcion: 'Pasta dental sin flúor con menta' },
  { nombre: 'Enjuague Bucal 250ml', precio: 11.00, stock: 30, categoria: 'Cuidado Personal', valoracion: 4.3, descripcion: 'Enjuague bucal antibacterial' },
  { nombre: 'Toallas Húmedas Paquete', precio: 7.00, stock: 45, categoria: 'Cuidado Personal', valoracion: 4.1, descripcion: 'Toallas húmedas para bebé y rostro' },
  { nombre: 'Exfoliante Corporal 200g', precio: 18.00, stock: 20, categoria: 'Cuidado Personal', valoracion: 4.6, descripcion: 'Exfoliante de azúcar y aceites naturales' },
  { nombre: 'Mascarilla Facial Carbón', precio: 12.00, stock: 25, categoria: 'Cuidado Personal', valoracion: 4.5, descripcion: 'Mascarilla purificante de carbón activado' },
  { nombre: 'Aceite Corporal Coco 200ml', precio: 20.00, stock: 20, categoria: 'Cuidado Personal', valoracion: 4.7, descripcion: 'Aceite de coco orgánico para piel' },
  { nombre: 'Locion After Shave', precio: 15.00, stock: 20, categoria: 'Cuidado Personal', valoracion: 4.4, descripcion: 'Loción refrescante para después del afeitado' },
  { nombre: 'Kit de Viaje 3 piezas', precio: 24.00, stock: 15, categoria: 'Cuidado Personal', valoracion: 4.8, descripcion: 'Shampoo, acondicionador y jabón en tamaño viaje' },
  { nombre: 'Bálsamo Labial', precio: 5.00, stock: 60, categoria: 'Cuidado Personal', valoracion: 4.3, descripcion: 'Bálsamo labial hidratante con manteca de cacao' },
  { nombre: 'Gel Antibacterial 100ml', precio: 6.50, stock: 80, categoria: 'Cuidado Personal', valoracion: 4.2, descripcion: 'Gel antibacterial con alcohol 70%' },
];

const contenidosPosts = [
  '¡Nuevo menú ejecutivo disponible! Lomo saltado con papas y arroz a solo S/20',
  'Protector solar FPS50 llegó a la tienda. Cuida tu piel este verano',
  'Nuestras hamburguesas artesanales son las mejores de la ciudad. Pide la tuya',
  '¿Sabías que tenemos jabones artesanales? 100% naturales y para todo tipo de piel',
  'Promoción especial: 2x1 en pizzas personales todos los martes',
  'Nuevo ceviche mixto con langostinos. El favorito de nuestros clientes',
  'Shampoo natural de sábila y coco. Sin químicos agresivos',
  'Alitas BBQ 8 piezas con papas. La combinación perfecta para el finde',
  'Crema hidratante facial con ácido hialurónico. Tu piel lo agradecerá',
  'Tequeños de queso 6 unidades. El antojo salvador de media tarde',
  'Ensalada Caesar fresca. Para los que quieren comer ligero pero rico',
  'Desodorante natural sin aluminio. Cuida tu salud y el planeta',
  '¿Ya probaste nuestra hamburguesa BBQ? Carne de res con salsa ahumada',
  'Cuidado personal: kit de viaje 3 piezas. Perfecto para tus vacaciones',
  'Jugo natural de fruta fresca. Sin azúcar añadida, pura fruta',
  'Mascarilla facial de carbón activado. Limpieza profunda garantizada',
  'Tallarín saltado con carne. Un clásico que nunca falla',
  'Bálsamo labial hidratante. Lleva uno en cada bolsillo',
  'Pizza suprema con todos los ingredientes. La más pedida de la semana',
  'Exfoliante corporal de azúcar. Tu piel más suave desde la primera aplicación',
  'Arroz chaufa de pollo. El chino-peruano que todos aman',
  'Gel antibacterial 100ml. Llévalo siempre contigo',
  'Wrap de pollo con verduras frescas. Comida rápida pero saludable',
  'Nuevos cepillos de bambú ecológicos. Cuida tus dientes y el planeta',
  'Ceviche clásico peruano. El sabor del mar en tu mesa',
  'Aceite corporal de coco orgánico. Hidratación natural',
  'Hamburguesa vegetariana. Tan rica que no extrañarás la carne',
  'Pasta dental natural con menta. Frescura sin químicos',
  'Ensalada tropical con mango. Un viaje de sabores',
  'Loción after shave refrescante. Para después del afeitado perfecto',
  'Bebidas frías: gaseosa, agua y jugos. Refréscate con nosotros',
  'Crema antiarrugas con colágeno. La belleza no tiene edad',
  'Agua mineral 600ml. Hidratación pura',
  'Enjuague bucal antibacterial. Protección completa',
  'Papas fritas grandes crujientes. El acompañante perfecto',
  'Acondicionador natural con keratina. Cabello sedoso y brillante',
  'Hamburguesa clásica con queso. Simple pero perfecta',
  'Toallas húmedas para toda la familia. Suaves y efectivas',
  'Pizza margarita. La reina de las pizzas clásicas',
  'Jabón artesanal de miel. Piel suave y naturalmente perfumada',
];

const textosComentarios = [
  'Se ve delicioso, ya quiero probarlo',
  'Lo pedí ayer y llegó súper rápido',
  'Excelente producto, lo recomiendo',
  'La mejor opción para el antojo',
  'Siempre pido aquí, nunca defrauda',
  'Buena calidad a buen precio',
  'El delivery fue muy rápido',
  'Me encantó, volveré a pedir',
  'Perfecto para compartir en familia',
  'Llegó bien empaquetado y fresco',
  'Mi producto favorito de la tienda',
  'Voy a pedir de nuevo esta semana',
  'Superó mis expectativas',
  'Riquísimo, todos en casa felices',
  'Lo recomiendo a mis amigos',
  'Justo lo que necesitaba',
  'Buen servicio, volveré a comprar',
  'El sabor es increíble',
  'Me llegó antes del tiempo estimado',
  'Pedido perfecto, sin errores',
  'La atención al cliente es excelente',
  'Gran variedad de productos',
  'Los precios son justos',
  'Me encanta la calidad de los ingredientes',
  'Ya es mi tienda favorita',
  'Probando cosas nuevas y todo rico',
  'El empaque ecológico me gustó mucho',
  'Mi tercera vez comprando aquí',
  'Sabor casero de verdad',
  'Ideales para un antojo nocturno',
  'Me encantaron los tequeños',
  'La hamburguesa estaba en su punto',
  'Gran experiencia de compra',
  'Todo fresco y bien preparado',
  'Súper recomendado',
  'Ya quiero probar el resto del menú',
  'El jugo natural es lo mejor',
  'Volví a pedir porque es confiable',
  'El producto de cuidado personal es excelente',
  'Puntualidad y calidad, eso busco',
];

const direccionesEntrega = [
  'Av. Principal 123, Miraflores', 'Jr. Las Flores 456, San Isidro', 'Calle Los Olivos 789, Surco',
  'Av. La Marina 321, San Miguel', 'Jr. Union 654, Jesus Maria', 'Calle Real 987, Pueblo Libre',
  'Av. Arequipa 147, Lince', 'Jr. Amazonas 258, Magdalena', 'Calle Sol 369, Barranco',
  'Av. Primavera 741, Santiago', 'Jr. Luna 852, Los Olivos', 'Calle Estrella 963, Comas',
  'Av. Central 159, San Borja', 'Jr. Norte 753, Rimac', 'Calle Sur 456, Chorrillos',
  'Av. Tupac 951, San Juan de Miraflores', 'Jr. Los Pinos 357, Villa El Salvador', 'Calle Las Palmeras 654, La Molina',
  'Av. Grau 852, Breña', 'Jr. Uno 147, Surquillo', 'Calle Dos 258, San Martin',
  'Av. Tres 369, San Luis', 'Jr. Cuatro 741, Ate', 'Calle Cinco 963, Santa Anita',
  'Av. Seis 159, El Agustino', 'Jr. Siete 753, Independencia', 'Calle Ocho 456, San Juan de Lurigancho',
  'Av. Nueve 951, Carabayllo', 'Jr. Diez 357, Puente Piedra', 'Calle Once 654, Ventanilla',
  'Av. Doce 852, Villa Maria del Triunfo', 'Jr. Trece 147, Chosica', 'Calle Catorce 258, Cieneguilla',
  'Av. Quince 369, Pachacamac', 'Jr. Dieciseis 741, Lurigancho', 'Calle Diecisiete 963, Ancon',
  'Av. Dieciocho 159, Santa Rosa', 'Jr. Diecinueve 753, San Bartolo', 'Calle Veinte 456, Punta Hermosa',
  'Av. Veintiuno 951, Punta Negra',
];

const metodosPago = ['Efectivo', 'Tarjeta Crédito', 'Tarjeta Débito', 'Yape', 'Plin'];
const estadosPedido = ['Pendiente', 'En Camino', 'Entregado'];
const categoriasProducto = ['Alimentos', 'Cuidado Personal'];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Conectado a MongoDB');

    await Promise.all([
      Usuario.deleteMany({}), Producto.deleteMany({}), Post.deleteMany({}),
      PostLike.deleteMany({}), Comment.deleteMany({}), Follow.deleteMany({}),
      Notificacion.deleteMany({}), Pedido.deleteMany({}),
    ]);
    console.log('Colecciones limpiadas');

    const salt = await bcrypt.genSalt(10);
    const usuariosCreados = [];
    for (const u of usuariosData) {
      const hash = await bcrypt.hash(u.password, salt);
      const usuario = await Usuario.create({ ...u, password: hash, fechaRegistro: new Date(Date.now() - Math.random() * 90 * 86400000) });
      usuariosCreados.push(usuario);
    }
    console.log(`${usuariosCreados.length} usuarios creados`);

    const productosCreados = [];
    for (const p of productosData) {
      const prod = await Producto.create(p);
      productosCreados.push(prod);
    }
    console.log(`${productosCreados.length} productos creados`);

    const clientes = usuariosCreados.filter(u => u.rol === 'Cliente');
    const admin = usuariosCreados.find(u => u.rol === 'Admin');
    const repartidores = usuariosCreados.filter(u => u.rol === 'Repartidor');

    const postsCreados = [];
    for (let i = 0; i < 40; i++) {
      const autor = i < 5 ? admin : clientes[Math.floor(Math.random() * clientes.length)];
      const post = await Post.create({
        contenido: contenidosPosts[i],
        autor: autor._id,
        fecha: new Date(Date.now() - Math.random() * 60 * 86400000),
      });
      postsCreados.push(post);
    }
    console.log(`${postsCreados.length} posts creados`);

    const likesCreados = [];
    const likesSet = new Set();
    for (let i = 0; i < 30; i++) {
      let post, usuario;
      let key;
      do {
        post = postsCreados[Math.floor(Math.random() * postsCreados.length)];
        usuario = clientes[Math.floor(Math.random() * clientes.length)];
        key = `${post._id}-${usuario._id}`;
      } while (likesSet.has(key));
      likesSet.add(key);
      const like = await PostLike.create({ postId: post._id, usuarioId: usuario._id, fecha: new Date(Date.now() - Math.random() * 30 * 86400000) });
      likesCreados.push(like);
    }
    console.log(`${likesCreados.length} likes creados`);

    const comentariosCreados = [];
    for (let i = 0; i < 40; i++) {
      const post = postsCreados[Math.floor(Math.random() * postsCreados.length)];
      const autor = clientes[Math.floor(Math.random() * clientes.length)];
      const comment = await Comment.create({
        contenido: textosComentarios[i],
        autor: autor._id,
        postId: post._id,
        fecha: new Date(Date.now() - Math.random() * 30 * 86400000),
      });
      comentariosCreados.push(comment);

      if (post.autor.toString() !== autor._id.toString()) {
        await Notificacion.create({
          usuarioId: post.autor,
          tipo: 'comentario',
          mensaje: `${autor.nombre} comentó en tu publicación: "${textosComentarios[i].substring(0, 30)}..."`,
          referenciaId: post._id,
          leido: Math.random() > 0.4,
          fecha: new Date(Date.now() - Math.random() * 30 * 86400000),
        });
      }
    }
    console.log(`${comentariosCreados.length} comentarios creados`);

    const followsSet = new Set();
    let followsCreados = 0;
    for (let i = 0; i < 40; i++) {
      let seguidor, seguido, key;
      do {
        seguidor = clientes[Math.floor(Math.random() * clientes.length)];
        const targetType = Math.random();
        if (targetType < 0.2) {
          seguido = admin;
        } else if (targetType < 0.4) {
          seguido = repartidores[Math.floor(Math.random() * repartidores.length)];
        } else {
          seguido = clientes.filter(c => c._id.toString() !== seguidor._id.toString())[Math.floor(Math.random() * (clientes.length - 1))];
        }
        key = `${seguidor._id}-${seguido._id}`;
      } while (followsSet.has(key));
      followsSet.add(key);

      await Follow.create({ seguidor: seguidor._id, seguido: seguido._id, fecha: new Date(Date.now() - Math.random() * 60 * 86400000) });
      followsCreados++;

      if (seguido._id.toString() !== seguidor._id.toString()) {
        await Notificacion.create({
          usuarioId: seguido._id,
          tipo: 'seguidor',
          mensaje: `${seguidor.nombre} empezó a seguirte`,
          referenciaId: seguidor._id,
          leido: Math.random() > 0.4,
          fecha: new Date(Date.now() - Math.random() * 60 * 86400000),
        });
      }
    }
    console.log(`${followsCreados} seguidores creados`);

    for (const like of likesCreados) {
      const post = postsCreados.find(p => p._id.toString() === like.postId.toString());
      const usuario = usuariosCreados.find(u => u._id.toString() === like.usuarioId.toString());
      if (post && usuario && post.autor.toString() !== usuario._id.toString()) {
        await Notificacion.create({
          usuarioId: post.autor,
          tipo: 'like',
          mensaje: `${usuario.nombre} dio like a tu publicación`,
          referenciaId: post._id,
          leido: Math.random() > 0.4,
          fecha: new Date(Date.now() - Math.random() * 30 * 86400000),
        });
      }
    }
    console.log('Notificaciones generadas');

    const pedidosCreados = [];
    for (let i = 0; i < 40; i++) {
      const cliente = clientes[Math.floor(Math.random() * clientes.length)];
      const cantidadProductos = Math.floor(Math.random() * 4) + 1;
      const productosPedido = [];
      let montoGrabado = 0;

      const seleccionados = new Set();
      for (let j = 0; j < cantidadProductos; j++) {
        let prod;
        do {
          prod = productosCreados[Math.floor(Math.random() * productosCreados.length)];
        } while (seleccionados.has(prod._id.toString()));
        seleccionados.add(prod._id.toString());

        const cantidad = Math.floor(Math.random() * 3) + 1;
        const subtotal = Number((prod.precio * cantidad).toFixed(2));
        montoGrabado += subtotal;
        productosPedido.push({
          productoId: prod._id.toString(),
          nombre: prod.nombre,
          precioUnitario: prod.precio,
          cantidad,
          subtotal,
        });
      }

      montoGrabado = Number(montoGrabado.toFixed(2));
      const igv = Number((montoGrabado * 0.18).toFixed(2));
      const montoTotal = Number((montoGrabado + igv).toFixed(2));
      const estadosPosibles = i < 7 ? ['Pendiente'] : i < 15 ? ['Pendiente', 'En Camino'] : ['Pendiente', 'En Camino', 'Entregado'];
      const estado = estadosPosibles[Math.floor(Math.random() * estadosPosibles.length)];

      const pedidoObj = {
        clienteId: cliente._id,
        metodoPago: metodosPago[Math.floor(Math.random() * metodosPago.length)],
        estado,
        direccionEntrega: direccionesEntrega[Math.floor(Math.random() * direccionesEntrega.length)],
        fecha: new Date(Date.now() - Math.random() * 45 * 86400000),
        boleta: {
          numeroBoleta: `B001-${String(100000 + i).padStart(6, '0')}`,
          productos: productosPedido,
          montoGrabado,
          igv,
          montoTotal,
        },
      };

      if ((estado === 'En Camino' || estado === 'Entregado') && repartidores.length > 0) {
        pedidoObj.repartidorId = repartidores[Math.floor(Math.random() * repartidores.length)]._id;
      }

      const pedido = await Pedido.create(pedidoObj);
      pedidosCreados.push(pedido);

      if (cliente.historialCompras) {
        await Usuario.findByIdAndUpdate(cliente._id, { $push: { historialCompras: pedido._id } });
      }
    }
    console.log(`${pedidosCreados.length} pedidos creados`);

    console.log('Seed completado exitosamente');
    process.exit(0);
  } catch (err) {
    console.error('Error en seed:', err);
    process.exit(1);
  }
}

seed();