let carrito = [];

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

function abrirModal(id) {
  document.getElementById(id).classList.remove('hidden');
}
function cerrarModal(id) {
  document.getElementById(id).classList.add('hidden');
}

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
      <td class="estado-${p.estado.replace(/\s/g, '\\ ')}">${p.estado}</td>
      <td>
        <button onclick="verDetallePedido('${p._id}')">Ver</button>
      </td>
    </tr>
  `).join('');
}

function verDetallePedido(id) {
  apiFetch('/pedidos').then(pedidos => {
    const p = pedidos.find(x => x._id === id);
    if (!p) return;
    document.getElementById('detalle-boleta').textContent = `Boleta: ${p.boleta.numeroBoleta}`;
    document.getElementById('detalle-fecha').textContent = `Fecha: ${new Date(p.fecha).toLocaleString()}`;
    document.getElementById('detalle-estado').innerHTML = `<strong>Estado:</strong> <span class="estado-${p.estado.replace(/\s/g, '\\ ')}">${p.estado}</span>`;
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

const socket = io();
socket.on('estado_pedido_actualizado', (pedido) => {
  if (pedido.clienteId === usuario.id || pedido.clienteId?._id === usuario.id) {
    reproducirSonido();
    mostrarToast(`Tu pedido ${pedido.boleta.numeroBoleta} cambió a: ${pedido.estado}`, 'info');
    cargarMisPedidos();
  }
});

cargarProductos();
cargarMisPedidos();
