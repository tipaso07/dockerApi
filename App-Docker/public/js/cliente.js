let carrito = [];
let postActualId = null;

document.querySelectorAll('.sidebar a[data-section]').forEach(a => {
  a.addEventListener('click', () => {
    document.querySelectorAll('.sidebar a').forEach(x => x.classList.remove('active'));
    a.classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('sec-' + a.dataset.section).classList.add('active');
  });
});

function mostrarToast(mensaje, tipo = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.textContent = mensaje;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function abrirModal(id) { document.getElementById(id).classList.remove('hidden'); }
function cerrarModal(id) { document.getElementById(id).classList.add('hidden'); }

let todosProductos = [];

async function cargarProductos() {
  todosProductos = await apiFetch('/productos');
  const categorias = [...new Set(todosProductos.map(p => p.categoria))];
  const selectCat = document.getElementById('filtro-categoria');
  selectCat.innerHTML = '<option value="">Todas las categorías</option>' +
    categorias.map(c => `<option value="${c}">${c}</option>`).join('');
  renderizarProductos();
}

function renderizarProductos() {
  const search = document.getElementById('buscar-producto').value.toLowerCase();
  const cat = document.getElementById('filtro-categoria').value;
  const filtrados = todosProductos.filter(p =>
    (p.nombre.toLowerCase().includes(search)) &&
    (!cat || p.categoria === cat)
  );
  const grid = document.getElementById('productos-grid');
  grid.innerHTML = filtrados.map(p => `
    <div class="producto-card">
      <div class="categoria">${p.categoria}</div>
      <h3>${p.nombre}</h3>
      <div class="precio">S/. ${p.precio.toFixed(2)}</div>
      <div class="stock">Stock: ${p.stock} | ⭐ ${p.valoracion}</div>
      <div class="descripcion">${p.descripcion}</div>
      ${p.stock > 0 ? `
        <input type="number" id="cant-${p._id}" value="1" min="1" max="${p.stock}" style="width:60px;padding:6px;border:1px solid #ddd;border-radius:6px;">
        <button onclick="agregarAlCarrito('${p._id}','${p.nombre}',${p.precio},${p.stock})">Agregar</button>
      ` : '<span style="color:#e53e3e;font-weight:600;">Agotado</span>'}
    </div>
  `).join('');
}

document.getElementById('buscar-producto').addEventListener('input', renderizarProductos);
document.getElementById('filtro-categoria').addEventListener('change', renderizarProductos);

function agregarAlCarrito(id, nombre, precio, stockMax) {
  const cant = parseInt(document.getElementById(`cant-${id}`).value) || 1;
  const existente = carrito.find(i => i.id === id);
  if (existente) {
    const nuevaCant = existente.cantidad + cant;
    if (nuevaCant > stockMax) return mostrarToast('Stock insuficiente', 'error');
    existente.cantidad = nuevaCant;
  } else {
    if (cant > stockMax) return mostrarToast('Stock insuficiente', 'error');
    carrito.push({ id, nombre, precio, cantidad: cant });
  }
  actualizarCarritoUI();
  mostrarToast(`${nombre} x${cant} agregado al carrito`, 'success');
}

function actualizarCarritoUI() {
  document.getElementById('cart-count').textContent = carrito.reduce((s, i) => s + i.cantidad, 0);
  const panel = document.getElementById('cart-items');
  if (carrito.length === 0) {
    panel.innerHTML = '<p style="color:#a0aec0;">Carrito vacío</p>';
    document.getElementById('cart-total').textContent = 'Total: S/. 0.00';
    return;
  }
  panel.innerHTML = carrito.map((item, idx) => `
    <div class="cart-item">
      <span>${item.nombre} x${item.cantidad}</span>
      <span>S/. ${(item.precio * item.cantidad).toFixed(2)}
        <button onclick="eliminarDelCarrito(${idx})" style="background:none;border:none;color:#e53e3e;cursor:pointer;margin-left:8px;">✕</button>
      </span>
    </div>
  `).join('');
  const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  document.getElementById('cart-total').textContent = `Total: S/. ${total.toFixed(2)}`;
}

function eliminarDelCarrito(idx) {
  carrito.splice(idx, 1);
  actualizarCarritoUI();
}

document.getElementById('cart-fab').addEventListener('click', () => {
  document.getElementById('cart-panel').classList.remove('hidden');
});

document.getElementById('btn-cerrar-carrito').addEventListener('click', () => {
  document.getElementById('cart-panel').classList.add('hidden');
});

document.getElementById('btn-realizar-pedido').addEventListener('click', async () => {
  if (carrito.length === 0) return mostrarToast('Carrito vacío', 'error');
  const metodoPago = document.getElementById('cart-metodo-pago').value;
  const direccionEntrega = document.getElementById('cart-direccion').value;
  if (!direccionEntrega) return mostrarToast('Ingresa una dirección de entrega', 'error');

  try {
    await apiFetch('/pedidos', {
      method: 'POST',
      body: JSON.stringify({
        productosCarrito: carrito,
        metodoPago,
        direccionEntrega
      })
    });
    reproducirSonido();
    mostrarToast('¡Pedido realizado con éxito!', 'success');
    carrito = [];
    actualizarCarritoUI();
    document.getElementById('cart-panel').classList.add('hidden');
    document.getElementById('cart-direccion').value = '';
    cargarMisPedidos();
  } catch (err) {
    mostrarToast('Error: ' + err.message, 'error');
  }
});

async function cargarMisPedidos() {
  const pedidos = await apiFetch('/pedidos');
  const tbody = document.getElementById('pedidos-tbody');
  tbody.innerHTML = pedidos.map(p => `
    <tr>
      <td>${p.boleta.numeroBoleta}</td>
      <td>S/. ${p.boleta.montoTotal.toFixed(2)}</td>
      <td>${p.metodoPago}</td>
      <td>${p.direccionEntrega}</td>
      <td>${p.repartidorId?.nombre || 'Sin asignar'}</td>
      <td>${new Date(p.fecha).toLocaleDateString()}</td>
      <td class="estado-${p.estado.replace(/\s/g, '-')}">${p.estado}</td>
      <td>
        <button onclick="verDetallePedido('${p._id}')">Ver</button>
      </td>
    </tr>
  `).join('');
}

function verDetallePedido(id) {
  apiFetch('/pedidos/' + id).then(p => {
    if (!p) return;
    document.getElementById('detalle-boleta').textContent = `Boleta: ${p.boleta.numeroBoleta}`;
    document.getElementById('detalle-fecha').textContent = `Fecha: ${new Date(p.fecha).toLocaleString()}`;
    document.getElementById('detalle-estado').innerHTML = `<strong>Estado:</strong> <span class="estado-${p.estado.replace(/\s/g, '-')}">${p.estado}</span>`;
    document.getElementById('detalle-productos-tbody').innerHTML = p.boleta.productos.map(pr => `
      <tr>
        <td>${pr.nombre}</td>
        <td>${pr.cantidad}</td>
        <td>S/. ${pr.precioUnitario.toFixed(2)}</td>
        <td>S/. ${pr.subtotal.toFixed(2)}</td>
      </tr>
    `).join('');
    document.getElementById('detalle-subtotal').textContent = p.boleta.montoGrabado.toFixed(2);
    document.getElementById('detalle-igv').textContent = p.boleta.igv.toFixed(2);
    document.getElementById('detalle-total').textContent = p.boleta.montoTotal.toFixed(2);
    document.getElementById('detalle-direccion').textContent = p.direccionEntrega;
    document.getElementById('detalle-pago').textContent = p.metodoPago;
    abrirModal('modal-detalle');
  });
}

// ===================== SOCIAL - FEED =====================

document.getElementById('btn-publicar-post').addEventListener('click', async () => {
  const contenido = document.getElementById('post-contenido').value.trim();
  if (!contenido) return mostrarToast('Escribe algo para publicar', 'error');
  await apiFetch('/posts', { method: 'POST', body: JSON.stringify({ contenido }) });
  document.getElementById('post-contenido').value = '';
  mostrarToast('Post publicado', 'success');
  cargarFeed();
});

async function cargarFeed() {
  const posts = await apiFetch('/posts');
  const container = document.getElementById('feed-posts');

  const likesInfo = await Promise.all(posts.map(p =>
    apiFetch(`/posts/${p._id}/likes`).then(likes => ({ postId: p._id, likes })).catch(() => ({ postId: p._id, likes: [] }))
  ));

  container.innerHTML = posts.map(p => {
    const likeInfo = likesInfo.find(l => l.postId === p._id);
    const userLiked = likeInfo ? likeInfo.likes.some(l => l.usuarioId?._id === usuario.id) : false;
    const likesCount = likeInfo ? likeInfo.likes.length : (p.likesCount || 0);

    return `
      <div class="feed-card">
        <div class="feed-header">
          <div class="feed-avatar">${(p.autor?.nombre || 'U')[0].toUpperCase()}</div>
          <div class="feed-author">
            <strong>${p.autor?.nombre || 'Usuario'}</strong>
            <span class="feed-date">${new Date(p.fecha).toLocaleString()}</span>
          </div>
          ${p.autor?._id !== usuario.id ? `<button class="feed-ver-perfil" onclick="verPerfilUsuario('${p.autor?._id}')">Ver perfil</button>` : ''}
        </div>
        <div class="feed-content">${p.contenido}</div>
        <div class="feed-actions">
          <button class="feed-like-btn ${userLiked ? 'liked' : ''}" onclick="toggleLike('${p._id}', this)">
            ${userLiked ? '❤️' : '🤍'} <span class="likes-count">${likesCount}</span>
          </button>
          <button class="feed-comment-btn" onclick="abrirComentarios('${p._id}')">
            💬 <span class="comments-count" id="comments-count-${p._id}">0</span>
          </button>
        </div>
        <div class="feed-comments" id="feed-comments-${p._id}"></div>
      </div>
    `;
  }).join('');

  posts.forEach(p => cargarContadorComentarios(p._id));
}

async function cargarContadorComentarios(postId) {
  try {
    const comentarios = await apiFetch(`/comentarios/post/${postId}`);
    const countSpan = document.querySelector(`#comments-count-${postId}`);
    if (countSpan) countSpan.textContent = comentarios.length;
  } catch (_) {}
}

async function toggleLike(postId, btn) {
  try {
    const data = await apiFetch(`/posts/${postId}/like`, { method: 'POST' });
    const countSpan = btn.querySelector('.likes-count');
    let count = parseInt(countSpan.textContent) || 0;
    if (data.liked) {
      btn.classList.add('liked');
      btn.innerHTML = `❤️ <span class="likes-count">${count + 1}</span>`;
    } else {
      btn.classList.remove('liked');
      btn.innerHTML = `🤍 <span class="likes-count">${count - 1}</span>`;
    }
  } catch (err) {
    mostrarToast('Error: ' + err.message, 'error');
  }
}

let comentarioPostId = null;

async function abrirComentarios(postId) {
  comentarioPostId = postId;
  document.getElementById('comentario-input').value = '';
  await cargarComentariosModal(postId);
  abrirModal('modal-comentarios');
}

async function cargarComentariosModal(postId) {
  try {
    const comentarios = await apiFetch(`/comentarios/post/${postId}`);
    const lista = document.getElementById('comentarios-lista');
    if (comentarios.length === 0) {
      lista.innerHTML = '<p style="color:#a0aec0;">Sin comentarios aún</p>';
    } else {
      lista.innerHTML = comentarios.map(c => `
        <div class="comment-item">
          <strong>${c.autor?.nombre || 'Usuario'}</strong>
          <span>${c.contenido}</span>
          <span class="comment-date">${new Date(c.fecha).toLocaleString()}</span>
        </div>
      `).join('');
    }
  } catch (_) {
    document.getElementById('comentarios-lista').innerHTML = '<p style="color:#a0aec0;">Error al cargar comentarios</p>';
  }
}

document.getElementById('btn-enviar-comentario').addEventListener('click', async () => {
  const contenido = document.getElementById('comentario-input').value.trim();
  if (!contenido || !comentarioPostId) return;
  await apiFetch('/comentarios', {
    method: 'POST',
    body: JSON.stringify({ contenido, postId: comentarioPostId })
  });
  document.getElementById('comentario-input').value = '';
  await cargarComentariosModal(comentarioPostId);
  cargarContadorComentarios(comentarioPostId);
  mostrarToast('Comentario publicado', 'success');
});

// ===================== SOCIAL - PERFIL =====================

async function cargarMiPerfil() {
  const perfil = await apiFetch('/usuarios/perfil');
  const seguidores = await apiFetch(`/seguidores/${perfil._id}/seguidores`);
  const siguiendo = await apiFetch(`/seguidores/${perfil._id}/siguiendo`);

  const container = document.getElementById('perfil-propio');
  container.innerHTML = `
    <div class="profile-card">
      <div class="profile-avatar">${(perfil.nombre || 'U')[0].toUpperCase()}</div>
      <h2>${perfil.nombre}</h2>
      <p class="profile-bio">${perfil.bio || 'Sin biografía'}</p>
      <div class="profile-stats">
        <div class="stat"><strong>${seguidores.length}</strong> seguidores</div>
        <div class="stat"><strong>${siguiendo.length}</strong> siguiendo</div>
      </div>
      <p class="profile-email">${perfil.email}</p>
      <p class="profile-date">Miembro desde ${new Date(perfil.fechaRegistro).toLocaleDateString()}</p>
    </div>
    <h3 style="margin-top:24px;">Mis Posts</h3>
    <div id="perfil-posts"></div>
  `;
  const posts = await apiFetch('/posts');
  const misPosts = posts.filter(p => p.autor?._id === perfil._id);
  const postsContainer = document.getElementById('perfil-posts');
  if (misPosts.length === 0) {
    postsContainer.innerHTML = '<p style="color:#a0aec0;">No has publicado nada aún</p>';
  } else {
    postsContainer.innerHTML = misPosts.map(p => `
      <div class="feed-card" style="margin-bottom:12px;">
        <div class="feed-content">${p.contenido}</div>
        <div class="feed-date" style="margin-top:8px;">${new Date(p.fecha).toLocaleString()}</div>
      </div>
    `).join('');
  }
}

async function verPerfilUsuario(userId) {
  if (!userId) return;
  try {
    const perfil = await apiFetch(`/usuarios/${userId}`);
    const seguidores = await apiFetch(`/seguidores/${userId}/seguidores`);
    const siguiendo = await apiFetch(`/seguidores/${userId}/siguiendo`);
    let estadoFollow = { siguiendo: false };
    try {
      estadoFollow = await apiFetch(`/seguidores/${userId}/estado`);
    } catch (_) {}

    const content = document.getElementById('modal-perfil-content');
    content.innerHTML = `
      <div class="profile-card">
        <div class="profile-avatar">${(perfil.nombre || 'U')[0].toUpperCase()}</div>
        <h2>${perfil.nombre}</h2>
        <p class="profile-bio">${perfil.bio || 'Sin biografía'}</p>
        <div class="profile-stats">
          <div class="stat"><strong>${seguidores.length}</strong> seguidores</div>
          <div class="stat"><strong>${siguiendo.length}</strong> siguiendo</div>
        </div>
        <button class="follow-btn ${estadoFollow.siguiendo ? 'following' : ''}" onclick="toggleFollowUsuario('${userId}', this)">
          ${estadoFollow.siguiendo ? 'Siguiendo' : '+ Seguir'}
        </button>
      </div>
      <div class="modal-actions" style="margin-top:16px;">
        <button class="btn-secondary" onclick="cerrarModal('modal-perfil-usuario')">Cerrar</button>
      </div>
    `;
    abrirModal('modal-perfil-usuario');
  } catch (err) {
    mostrarToast('Error al cargar perfil', 'error');
  }
}

async function toggleFollowUsuario(userId, btn) {
  try {
    const data = await apiFetch(`/seguidores/${userId}/seguir`, { method: 'POST' });
    if (data.siguiendo) {
      btn.classList.add('following');
      btn.textContent = 'Siguiendo';
    } else {
      btn.classList.remove('following');
      btn.textContent = '+ Seguir';
    }
    mostrarToast(data.mensaje, 'success');
  } catch (err) {
    mostrarToast('Error: ' + err.message, 'error');
  }
}

// ===================== NOTIFICACIONES =====================

async function cargarNotificaciones() {
  try {
    const data = await apiFetch('/notificaciones');
    const badge = document.getElementById('notif-badge');
    if (data.noLeidas > 0) {
      badge.textContent = data.noLeidas;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }

    const lista = document.getElementById('notificaciones-lista');
    if (data.notificaciones.length === 0) {
      lista.innerHTML = '<p style="color:#a0aec0;">No tienes notificaciones</p>';
      return;
    }
    lista.innerHTML = data.notificaciones.map(n => `
      <div class="notif-item ${n.leido ? '' : 'notif-no-leida'}" onclick="marcarLeida('${n._id}')">
        <div class="notif-icon">${n.tipo === 'like' ? '❤️' : n.tipo === 'comentario' ? '💬' : '👤'}</div>
        <div class="notif-content">
          <p>${n.mensaje}</p>
          <span class="notif-date">${new Date(n.fecha).toLocaleString()}</span>
        </div>
        ${n.leido ? '' : '<span class="notif-dot"></span>'}
      </div>
    `).join('');
  } catch (_) {}
}

async function marcarLeida(id) {
  await apiFetch(`/notificaciones/${id}/leer`, { method: 'PUT' });
  cargarNotificaciones();
}

document.getElementById('btn-leer-todas').addEventListener('click', async () => {
  await apiFetch('/notificaciones/leer-todas', { method: 'PUT' });
  mostrarToast('Todas marcadas como leídas', 'success');
  cargarNotificaciones();
});

// ===================== SOCKET.IO =====================

const socketClient = io();
socketClient.on('estado_pedido_actualizado', (pedido) => {
  if (pedido.clienteId === usuario.id || pedido.clienteId?._id === usuario.id) {
    reproducirSonido();
    mostrarToast(`Tu pedido ${pedido.boleta.numeroBoleta} cambió a: ${pedido.estado}`, 'info');
    cargarMisPedidos();
  }
});
socketClient.on('nueva_notificacion', () => {
  cargarNotificaciones();
});

// ===================== INIT =====================

cargarProductos();
cargarMisPedidos();
cargarFeed();
cargarMiPerfil();
cargarNotificaciones();
setInterval(cargarNotificaciones, 30000);
