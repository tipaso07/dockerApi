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

let todosPedidos = [];

async function cargarPedidos() {
  todosPedidos = await apiFetch('/pedidos');
  const tbody = document.getElementById('pedidos-tbody');
  tbody.innerHTML = todosPedidos.map(p => {
    let btnAccion = '';
    if (p.estado === 'Pendiente') {
      btnAccion = `<button class="btn-accion-estado" data-id="${p._id}" data-estado="En Camino">→ En Camino</button>`;
    } else if (p.estado === 'En Camino') {
      btnAccion = `<button class="btn-accion-estado" data-id="${p._id}" data-estado="Entregado">→ Entregado</button>`;
    } else if (p.estado === 'Entregado') {
      btnAccion = `<button class="btn-accion-estado" disabled>✓ Entregado</button>`;
    } else {
      btnAccion = `<span class="estado-${p.estado}">${p.estado}</span>`;
    }
    return `
      <tr>
        <td>${p.boleta.numeroBoleta}</td>
        <td>${p.clienteId?.nombre || 'N/A'}</td>
        <td>${p.repartidorId?.nombre || 'Sin asignar'}</td>
        <td>S/. ${p.boleta.montoTotal.toFixed(2)}</td>
        <td>${p.metodoPago}</td>
        <td>${new Date(p.fecha).toLocaleDateString()}</td>
        <td class="estado-${p.estado.replace(/\s/g, '\\ ')}">${p.estado}</td>
        <td>${btnAccion} <button onclick='abrirEditarPedido("${p._id}")'>Editar</button></td>
      </tr>
    `;
  }).join('');

  document.querySelectorAll('.btn-accion-estado').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const estado = btn.dataset.estado;
      await apiFetch(`/pedidos/${id}/estado`, {
        method: 'PUT',
        body: JSON.stringify({ estado })
      });
      cargarPedidos();
    });
  });
}

async function abrirEditarPedido(id) {
  const pedido = todosPedidos.find(p => p._id === id);
  if (!pedido) return;

  document.getElementById('edit-pedido-id').value = id;
  document.getElementById('edit-pedido-titulo').textContent = `Pedido: ${pedido.boleta.numeroBoleta}`;
  document.getElementById('edit-pedido-boleta').textContent = `Cliente: ${pedido.clienteId?.nombre || 'N/A'} | ${pedido.direccionEntrega} | ${pedido.metodoPago}`;
  document.getElementById('edit-pedido-productos').innerHTML = pedido.boleta.productos.map(pr => `
    <tr><td>${pr.nombre}</td><td>${pr.cantidad}</td><td>S/. ${pr.precioUnitario.toFixed(2)}</td><td>S/. ${pr.subtotal.toFixed(2)}</td></tr>
  `).join('');
  document.getElementById('edit-pedido-subtotal').textContent = pedido.boleta.montoGrabado.toFixed(2);
  document.getElementById('edit-pedido-igv').textContent = pedido.boleta.igv.toFixed(2);
  document.getElementById('edit-pedido-total').textContent = pedido.boleta.montoTotal.toFixed(2);
  document.getElementById('edit-pedido-estado').value = pedido.estado;

  const repSelect = document.getElementById('edit-pedido-repartidor');
  const usuarios = await apiFetch('/usuarios');
  const repartidores = usuarios.filter(u => u.rol === 'Repartidor');
  repSelect.innerHTML = '<option value="">Sin asignar</option>' +
    repartidores.map(r => `<option value="${r._id}">${r.nombre}</option>`).join('');
  repSelect.value = pedido.repartidorId?._id || '';

  abrirModal('modal-editar-pedido');
}

document.getElementById('edit-pedido-estado').addEventListener('change', function () {
  if (this.value === 'En Camino') {
    const repSelect = document.getElementById('edit-pedido-repartidor');
    if (!repSelect.value && repSelect.options.length > 1) {
      repSelect.value = repSelect.options[1].value;
    }
  }
});

document.getElementById('btn-guardar-pedido').addEventListener('click', async () => {
  const id = document.getElementById('edit-pedido-id').value;
  const estado = document.getElementById('edit-pedido-estado').value;
  const repartidorId = document.getElementById('edit-pedido-repartidor').value;

  await apiFetch(`/pedidos/${id}/estado`, {
    method: 'PUT',
    body: JSON.stringify({ estado })
  });

  if (repartidorId) {
    await apiFetch(`/pedidos/${id}/repartidor`, {
      method: 'PUT',
      body: JSON.stringify({ repartidorId })
    });
  }

  cerrarModal('modal-editar-pedido');
  mostrarToast('Pedido actualizado', 'success');
  cargarPedidos();
});

async function cargarProductos() {
  const productos = await apiFetch('/productos');
  const tbody = document.getElementById('productos-tbody');
  tbody.innerHTML = productos.map(p => `
    <tr>
      <td>${p.nombre}</td>
      <td>${p.categoria}</td>
      <td>S/. ${p.precio.toFixed(2)}</td>
      <td>${p.stock}</td>
      <td>${p.valoracion}</td>
      <td>
        <button class="btn-editar-prod" data-id="${p._id}" data-nombre="${p.nombre}" data-precio="${p.precio}" data-stock="${p.stock}" data-categoria="${p.categoria}" data-valoracion="${p.valoracion}" data-descripcion="${p.descripcion}">Editar</button>
        <button class="btn-eliminar-prod danger" data-id="${p._id}">Eliminar</button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.btn-editar-prod').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('edit-prod-id').value = btn.dataset.id;
      document.getElementById('edit-prod-nombre').value = btn.dataset.nombre;
      document.getElementById('edit-prod-precio').value = btn.dataset.precio;
      document.getElementById('edit-prod-stock').value = btn.dataset.stock;
      document.getElementById('edit-prod-categoria').value = btn.dataset.categoria;
      document.getElementById('edit-prod-valoracion').value = btn.dataset.valoracion;
      document.getElementById('edit-prod-descripcion').value = btn.dataset.descripcion;
      abrirModal('modal-editar-producto');
    });
  });

  document.querySelectorAll('.btn-eliminar-prod').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('¿Eliminar este producto?')) {
        await apiFetch(`/productos/${btn.dataset.id}`, { method: 'DELETE' });
        cargarProductos();
      }
    });
  });
}

document.getElementById('btn-guardar-producto').addEventListener('click', async () => {
  const data = {
    nombre: document.getElementById('prod-nombre').value,
    precio: parseFloat(document.getElementById('prod-precio').value),
    stock: parseInt(document.getElementById('prod-stock').value),
    categoria: document.getElementById('prod-categoria').value,
    valoracion: parseFloat(document.getElementById('prod-valoracion').value) || 0,
    descripcion: document.getElementById('prod-descripcion').value
  };
  await apiFetch('/productos', { method: 'POST', body: JSON.stringify(data) });
  document.querySelectorAll('#producto-form input').forEach(i => i.value = '');
  cargarProductos();
});

document.getElementById('btn-guardar-editar-producto').addEventListener('click', async () => {
  const id = document.getElementById('edit-prod-id').value;
  const data = {
    nombre: document.getElementById('edit-prod-nombre').value,
    precio: parseFloat(document.getElementById('edit-prod-precio').value),
    stock: parseInt(document.getElementById('edit-prod-stock').value),
    categoria: document.getElementById('edit-prod-categoria').value,
    valoracion: parseFloat(document.getElementById('edit-prod-valoracion').value) || 0,
    descripcion: document.getElementById('edit-prod-descripcion').value
  };
  await apiFetch(`/productos/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  cerrarModal('modal-editar-producto');
  mostrarToast('Producto actualizado', 'success');
  cargarProductos();
});

async function cargarUsuarios() {
  const usuarios = await apiFetch('/usuarios');
  const tbody = document.getElementById('usuarios-tbody');
  tbody.innerHTML = usuarios.map(u => `
    <tr>
      <td>${u.nombre}</td>
      <td>${u.email}</td>
      <td>${u.rol}</td>
      <td>${new Date(u.fechaRegistro).toLocaleDateString()}</td>
      <td>
        <button class="btn-editar-user" data-id="${u._id}" data-nombre="${u.nombre}" data-email="${u.email}" data-rol="${u.rol}">Editar</button>
        <button class="btn-eliminar-user danger" data-id="${u._id}">Eliminar</button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.btn-editar-user').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('edit-user-id').value = btn.dataset.id;
      document.getElementById('edit-user-nombre').value = btn.dataset.nombre;
      document.getElementById('edit-user-email').value = btn.dataset.email;
      document.getElementById('edit-user-rol').value = btn.dataset.rol;
      document.getElementById('edit-user-password').value = '';
      abrirModal('modal-editar-usuario');
    });
  });

  document.querySelectorAll('.btn-eliminar-user').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm(`¿Eliminar a ${btn.dataset.nombre}?`)) {
        await apiFetch(`/usuarios/${btn.dataset.id}`, { method: 'DELETE' });
        cargarUsuarios();
      }
    });
  });
}

document.getElementById('btn-guardar-usuario').addEventListener('click', async () => {
  const id = document.getElementById('edit-user-id').value;
  const data = {
    nombre: document.getElementById('edit-user-nombre').value,
    email: document.getElementById('edit-user-email').value,
    rol: document.getElementById('edit-user-rol').value,
  };
  const password = document.getElementById('edit-user-password').value;
  if (password) data.password = password;

  await apiFetch(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  cerrarModal('modal-editar-usuario');
  cargarUsuarios();
});

document.getElementById('btn-guardar-nuevo-usuario').addEventListener('click', async () => {
  const nombre = document.getElementById('add-user-nombre').value;
  const email = document.getElementById('add-user-email').value;
  const password = document.getElementById('add-user-password').value;
  const rol = document.getElementById('add-user-rol').value;
  if (!nombre || !email || !password) return mostrarToast('Completa todos los campos', 'error');
  await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ nombre, email, password, rol })
  });
  cerrarModal('modal-agregar-usuario');
  document.getElementById('add-user-nombre').value = '';
  document.getElementById('add-user-email').value = '';
  document.getElementById('add-user-password').value = '';
  mostrarToast('Usuario creado', 'success');
  cargarUsuarios();
});

// ===================== MODERACIÓN DE POSTS =====================

async function cargarPostsAdmin() {
  const posts = await apiFetch('/posts');
  const tbody = document.getElementById('posts-tbody');
  tbody.innerHTML = posts.map(p => `
    <tr>
      <td>${p.autor?.nombre || 'N/A'}</td>
      <td>${p.contenido.substring(0, 80)}${p.contenido.length > 80 ? '...' : ''}</td>
      <td>${new Date(p.fecha).toLocaleDateString()}</td>
      <td>${p.likesCount || 0}</td>
      <td>
        <button class="btn-eliminar-post danger" data-id="${p._id}" data-autor="${p.autor?.nombre || ''}">Eliminar</button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.btn-eliminar-post').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm(`¿Eliminar el post de ${btn.dataset.autor}?`)) {
        await apiFetch(`/posts/${btn.dataset.id}`, { method: 'DELETE' });
        mostrarToast('Post eliminado', 'success');
        cargarPostsAdmin();
      }
    });
  });
}

cargarPedidos();
cargarProductos();
cargarUsuarios();
cargarPostsAdmin();
