# API Documentation - Docker Delivery

Base URL: `http://localhost:3000`

---

## Autenticación

La API usa JWT para autenticación. Los endpoints marcados con **Token** requieren el header:

```
Authorization: Bearer <token>
```

Roles disponibles: `Admin`, `Repartidor`, `Cliente`

### Obtener token de Admin

Haz un POST a `/api/auth/login` con las credenciales por defecto:

```json
{
  "email": "admin@delivery.com",
  "password": "123456"
}
```

Respuesta:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": {
    "id": "...",
    "nombre": "Admin",
    "email": "admin@delivery.com",
    "rol": "Admin"
  }
}
```

Usa el `token` devuelto en todas las rutas que requieran **Admin** o **Token**.

---

## Endpoints

### Health & Test

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/health` | ❌ | Health check del servidor y MongoDB |
| GET | `/api/prueba` | ❌ | Endpoint de prueba |

---

### Auth — `routes/auth.js`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/register` | ❌ | Registrar nuevo usuario |
| POST | `/api/auth/login` | ❌ | Iniciar sesión |

**POST /api/auth/register**
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "password": "123456",
  "rol": "Cliente"
}
```

**POST /api/auth/login**
```json
{
  "email": "admin@delivery.com",
  "password": "123456"
}
```

---

### Productos — `routes/productos.js`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/productos` | ❌ | Listar productos (opcional `?categoria=Bebidas`) |
| GET | `/api/productos/categorias` | ❌ | Listar categorías disponibles |
| GET | `/api/productos/:id` | ❌ | Obtener producto por ID |
| POST | `/api/productos` | Admin | Crear producto |
| PUT | `/api/productos/:id` | Admin | Actualizar producto |
| DELETE | `/api/productos/:id` | Admin | Eliminar producto |

**POST /api/productos** (Admin)
```json
{
  "nombre": "Pizza Margherita",
  "precio": 25.50,
  "categoria": "Pizzas",
  "stock": 10,
  "descripcion": "Pizza con tomate, mozzarella y albahaca",
  "imagen": "https://ejemplo.com/pizza.jpg"
}
```

---

### Pedidos — `routes/pedidos.js`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/pedidos` | Token | Listar pedidos (admin ve todos, cliente ve los suyos) |
| GET | `/api/pedidos/entregas` | Token (Repartidor) | Pedidos asignados al repartidor |
| GET | `/api/pedidos/:id` | Token | Obtener pedido por ID |
| POST | `/api/pedidos` | Token | Crear pedido |
| PUT | `/api/pedidos/:id/estado` | Admin | Cambiar estado del pedido |
| PUT | `/api/pedidos/:id/repartidor` | Admin | Asignar repartidor |
| PUT | `/api/pedidos/:id/entregar` | Token (Repartidor) | Marcar como entregado |

**POST /api/pedidos** (Token)
```json
{
  "productosCarrito": [
    { "id": "ID_PRODUCTO", "cantidad": 2 }
  ],
  "metodoPago": "Efectivo",
  "direccionEntrega": "Av. Principal 123"
}
```

**PUT /api/pedidos/:id/estado** (Admin)
```json
{
  "estado": "En Camino"
}
```

Estados disponibles: `Pendiente`, `Confirmado`, `En Camino`, `Entregado`, `Cancelado`

**PUT /api/pedidos/:id/repartidor** (Admin)
```json
{
  "repartidorId": "ID_REPARTIDOR"
}
```

---

### Usuarios — `routes/usuarios.js`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/usuarios` | ❌ (opcional) | Sin token: solo `nombre`, `avatar`, `bio`. Con token Admin: todos los campos |
| GET | `/api/usuarios/perfil` | Token | Obtener perfil propio |
| GET | `/api/usuarios/:id` | ❌ | Obtener usuario por ID (sin password) |
| PUT | `/api/usuarios/perfil` | Token | Actualizar perfil propio |
| PUT | `/api/usuarios/:id` | Admin | Actualizar cualquier usuario |
| DELETE | `/api/usuarios/:id` | Admin | Eliminar usuario |

**PUT /api/usuarios/perfil** (Token)
```json
{
  "nombre": "Nuevo Nombre",
  "bio": "Descripción",
  "avatar": "https://ejemplo.com/avatar.jpg",
  "fechaNacimiento": "1990-01-01"
}
```

**PUT /api/usuarios/:id** (Admin)
```json
{
  "nombre": "Nuevo Nombre",
  "email": "nuevo@email.com",
  "rol": "Admin",
  "password": "nuevapassword"
}
```

---

### Posts — `routes/posts.js`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/posts` | ❌ | Listar todos los posts |
| GET | `/api/posts/:id/likes` | ❌ | Usuarios que dieron like a un post |
| GET | `/api/posts/:id` | ❌ | Obtener post por ID |
| POST | `/api/posts` | Token | Crear post |
| POST | `/api/posts/:id/like` | Token | Dar o quitar like |
| DELETE | `/api/posts/:id` | Token (autor/admin) | Eliminar post |

**POST /api/posts** (Token)
```json
{
  "contenido": "Este es mi primer post"
}
```

---

### Comentarios — `routes/comentarios.js`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/comentarios` | Token | Listar todos los comentarios |
| GET | `/api/comentarios/:id` | ❌ | Obtener comentario por ID |
| GET | `/api/comentarios/post/:postId` | ❌ | Comentarios de un post específico |
| POST | `/api/comentarios` | Token | Crear comentario |
| PUT | `/api/comentarios/:id` | Token (autor/admin) | Editar comentario |
| DELETE | `/api/comentarios/:id` | Token (autor/admin) | Eliminar comentario |

**POST /api/comentarios** (Token)
```json
{
  "contenido": "Excelente publicación",
  "postId": "ID_POST"
}
```

---

### Seguidores — `routes/seguidores.js`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/seguidores/:id/seguidores` | ❌ | Listar seguidores de un usuario |
| GET | `/api/seguidores/:id/siguiendo` | ❌ | Listar usuarios que sigue |
| GET | `/api/seguidores/:id/estado` | Token | Verificar si sigo a un usuario |
| POST | `/api/seguidores/:id/seguir` | Token | Seguir o dejar de seguir |

---

### Notificaciones — `routes/notificaciones.js`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/notificaciones` | Token | Obtener mis notificaciones |
| GET | `/api/notificaciones/:id` | Token | Obtener notificación por ID |
| GET | `/api/notificaciones/usuario/:userId` | Token | Notificaciones de otro usuario |
| PUT | `/api/notificaciones/:id/leer` | Token | Marcar notificación como leída |
| PUT | `/api/notificaciones/leer-todas` | Token | Marcar todas como leídas |
| DELETE | `/api/notificaciones/:id` | Token | Eliminar notificación |

---

## Resumen de estados HTTP

| Código | Significado |
|--------|-------------|
| 200 | OK |
| 201 | Creado |
| 400 | Error de validación |
| 401 | Token requerido o inválido |
| 403 | Sin permisos |
| 404 | Recurso no encontrado |
| 500 | Error interno del servidor |
