function mostrarToast(mensaje, tipo = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.textContent = mensaje;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

document.querySelectorAll('.sidebar a[data-section]').forEach(a => {
  a.addEventListener('click', () => {
    document.querySelectorAll('.sidebar a').forEach(x => x.classList.remove('active'));
    a.classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('sec-' + a.dataset.section).classList.add('active');
    if (a.dataset.section === 'mi-perfil') cargarMiPerfilRepartidor();
  });
});

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

// ===================== PERFIL REPARTIDOR =====================

const PERU_BOUNDS_R = [[-18.35, -81.33], [-0.03, -68.65]];
let mapaRep, markerRep;
let ubicacionRepSeleccionada = null;

async function cargarMiPerfilRepartidor() {
  const perfil = await apiFetch('/usuarios/perfil');
  document.getElementById('perfil-nombre').textContent = perfil.nombre;
  document.getElementById('perfil-email').textContent = perfil.email;
  document.getElementById('perfil-bio').textContent = perfil.bio || 'Repartidor';
  document.getElementById('perfil-avatar').textContent = (perfil.nombre || 'U')[0].toUpperCase();

  const lat = perfil.ubicacion?.lat;
  const lng = perfil.ubicacion?.lng;
  const pos = (lat != null && lng != null) ? [lat, lng] : [-12.0464, -77.0428];

  if (!mapaRep) {
    mapaRep = L.map('mapa-repartidor', {
      maxBounds: PERU_BOUNDS_R,
      maxBoundsViscosity: 1.0,
      minZoom: 5
    }).setView(pos, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapaRep);

    markerRep = L.marker(pos, { draggable: true }).addTo(mapaRep);
    ubicacionRepSeleccionada = { lat: pos[0], lng: pos[1] };
    reverseGeocodeRep(pos[0], pos[1]);

    markerRep.on('dragend', () => {
      const p = markerRep.getLatLng();
      reverseGeocodeRep(p.lat, p.lng);
    });

    mapaRep.on('click', (e) => {
      if (e.latlng.lat < PERU_BOUNDS_R[0][0] || e.latlng.lat > PERU_BOUNDS_R[1][0] ||
          e.latlng.lng < PERU_BOUNDS_R[0][1] || e.latlng.lng > PERU_BOUNDS_R[1][1]) {
        mostrarToast('La ubicación debe estar en Perú', 'error');
        return;
      }
      markerRep.setLatLng(e.latlng);
      reverseGeocodeRep(e.latlng.lat, e.latlng.lng);
    });
  } else {
    mapaRep.setView(pos, 13);
    markerRep.setLatLng(pos);
    reverseGeocodeRep(pos[0], pos[1]);
  }
}

function reverseGeocodeRep(lat, lng) {
  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=es`)
    .then(r => r.json())
    .then(data => {
      const countryCode = data.address?.country_code;
      if (countryCode !== 'pe') {
        mostrarToast('La ubicación debe estar en Perú', 'error');
        return;
      }
      ubicacionRepSeleccionada = { lat, lng };
      const direccion = data.display_name || `${lat}, ${lng}`;
      document.getElementById('repartidor-ubicacion-info').textContent = `📍 ${data.address?.city || data.address?.town || data.address?.village || data.address?.state || ''} • ${data.address?.country || ''}`;
    })
    .catch(() => {
      ubicacionRepSeleccionada = { lat, lng };
      document.getElementById('repartidor-ubicacion-info').textContent = `📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    });
}

document.getElementById('btn-guardar-ubicacion').addEventListener('click', async () => {
  if (!ubicacionRepSeleccionada) return mostrarToast('Selecciona una ubicación en el mapa', 'error');
  try {
    await apiFetch('/usuarios/ubicacion', {
      method: 'PUT',
      body: JSON.stringify(ubicacionRepSeleccionada)
    });
    mostrarToast('Ubicación guardada correctamente', 'success');
  } catch (err) {
    mostrarToast('Error: ' + err.message, 'error');
  }
});

// ===================== SOCKET =====================

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
