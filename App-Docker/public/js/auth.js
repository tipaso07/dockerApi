const API = '/api';

let token = localStorage.getItem('token');
let usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

function guardarSesion(tok, user) {
  token = tok;
  usuario = user;
  localStorage.setItem('token', tok);
  localStorage.setItem('usuario', JSON.stringify(user));
}

function cerrarSesion() {
  token = null;
  usuario = null;
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = '/';
}

async function apiFetch(url, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API + url, { ...options, headers });
  if (res.status === 401) {
    cerrarSesion();
    throw new Error('Sesión expirada');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error del servidor');
  return data;
}

async function cargarNoLeidas() {
  if (!token || !usuario) return;
  try {
    const data = await apiFetch('/notificaciones');
    const badge = document.getElementById('notif-badge');
    if (badge) {
      if (data.noLeidas > 0) {
        badge.textContent = data.noLeidas;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  } catch (_) {}
}

document.addEventListener('DOMContentLoaded', () => {
  const isAuthPage = ['admin.html', 'cliente.html', 'repartidor.html'].some(p => window.location.pathname.endsWith(p));
  if (isAuthPage) {
    if (!token) return window.location.href = '/';
    document.getElementById('sidebar-user').textContent = `${usuario.nombre} (${usuario.rol})`;
    document.getElementById('btn-logout')?.addEventListener('click', cerrarSesion);
    return;
  }
  if (!document.getElementById('auth-form')) return;

  let isRegister = false;
  const form = document.getElementById('auth-form');
  const title = document.getElementById('form-title');
  const btn = document.getElementById('auth-btn');
  const toggle = document.getElementById('toggle-auth');
  const nameField = document.getElementById('name-field');
  const errorMsg = document.getElementById('error-msg');

  toggle.addEventListener('click', () => {
    isRegister = !isRegister;
    title.textContent = isRegister ? 'Crear Cuenta' : 'Iniciar Sesión';
    btn.textContent = isRegister ? 'Registrarse' : 'Ingresar';
    toggle.textContent = isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate';
    nameField.classList.toggle('hidden', !isRegister);
    errorMsg.classList.add('hidden');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.classList.add('hidden');
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    try {
      if (isRegister) {
        const nombre = document.getElementById('reg-nombre').value;
        const data = await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ nombre, email, password, rol: 'Cliente' })
        });
        guardarSesion(data.token, data.usuario);
      } else {
        const data = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        guardarSesion(data.token, data.usuario);
      }
      redirigirSegunRol();
    } catch (err) {
      errorMsg.textContent = err.message;
      errorMsg.classList.remove('hidden');
    }
  });

  if (token) redirigirSegunRol();
});

function reproducirSonido() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.value = 523;
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc1.start(now);
    osc1.stop(now + 0.25);
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 659;
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0, now + 0.15);
    gain2.gain.linearRampToValueAtTime(0.25, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.5);
  } catch (_) {}
}

function redirigirSegunRol() {
  if (usuario.rol === 'Admin') {
    window.location.href = '/admin.html';
  } else if (usuario.rol === 'Repartidor') {
    window.location.href = '/repartidor.html';
  } else {
    window.location.href = '/cliente.html';
  }
}
