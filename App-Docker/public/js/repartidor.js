function mostrarToast(mensaje, tipo = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.textContent = mensaje;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

async function cargarEntregas() {
  const pedidos = await apiFetch('/pedidos/entregas');
  const tbody = document.getElementById('entregas-tbody');
  tbody.innerHTML = pedidos.map(p => {
    let btn = '';
    if (p.estado === 'En Camino') {
      btn = `<button class="btn-estado en-camino" onclick="marcarEntregado('${p._id}')">→ Marcar Entregado</button>`;
    } else if (p.estado === 'Pendiente') {
      btn = `<span style="color:#a0aec0;font-size:13px;">Esperando asignación</span>`;
    } else if (p.estado === 'Entregado') {
      btn = `<button class="btn-estado entregado" disabled>✓ Entregado</button>`;
    }
    return `
      <tr>
        <td>${p.boleta.numeroBoleta}</td>
        <td>${p.clienteId?.nombre || 'N/A'}</td>
        <td>${p.direccionEntrega}</td>
        <td>S/. ${p.boleta.montoTotal.toFixed(2)}</td>
        <td class="estado-${p.estado.replace(/\s/g, '-')}">${p.estado}</td>
        <td>${btn}</td>
      </tr>
    `;
  }).join('');
}

async function marcarEntregado(id) {
  await apiFetch(`/pedidos/${id}/entregar`, { method: 'PUT' });
  mostrarToast('Entrega marcada como completada', 'success');
  cargarEntregas();
}

const socket = io();
socket.on('alerta_nuevo_pedido', (pedido) => {
  if (pedido.repartidorId === usuario.id || pedido.repartidorId?._id === usuario.id) {
    reproducirSonido();
    mostrarToast(`Nueva entrega asignada: ${pedido.boleta.numeroBoleta}`, 'info');
    cargarEntregas();
  }
});
socket.on('estado_pedido_actualizado', (pedido) => {
  if (pedido.repartidorId === usuario.id || pedido.repartidorId?._id === usuario.id) {
    reproducirSonido();
    mostrarToast(`Pedido ${pedido.boleta.numeroBoleta} actualizado a: ${pedido.estado}`, 'info');
    cargarEntregas();
  }
});

cargarEntregas();
