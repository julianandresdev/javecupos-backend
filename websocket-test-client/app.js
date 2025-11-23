// ============================================
// CONFIGURACIÓN Y UTILIDADES
// ============================================

const savedUrl = localStorage.getItem('jc_backend_url') || 'http://localhost:3000';
const backendInput = document.getElementById('backend-url');
backendInput.value = savedUrl;

let BACKEND_URL = savedUrl;
function getBase() { return (document.getElementById('backend-url').value || BACKEND_URL).trim(); }

// Lista de destinos (barrios) para selects
const DESTINOS = [
  'Terrón Colorado', 'Vista Hermosa', 'Aguacatal', 'Santa Rita', 'Santa Teresita',
  'Arboledas', 'Normandía', 'Juanambú', 'Centenario', 'Granada', 'Versalles',
  'San Vicente', 'Santa Mónica', 'Prados del Norte', 'La Flora', 'La Campiña',
  'La Paz', 'El Bosque', 'Menga', 'Chipichape', 'Centro', 'San Antonio'
];

// Inicializar selects de destinos
function initDestinoSelects() {
  const selects = ['cupo-destino', 'search-destino'];
  selects.forEach(id => {
    const select = document.getElementById(id);
    if (select) {
      DESTINOS.forEach(destino => {
        const option = document.createElement('option');
        option.value = destino;
        option.textContent = destino;
        select.appendChild(option);
      });
    }
  });
}

// ============================================
// GESTIÓN DE RESPUESTAS Y UI
// ============================================

function addResponse(text, status = null) {
  const responseEl = document.getElementById('response');
  const statusEl = document.getElementById('response-status');
  
  if (status) {
    statusEl.textContent = status;
    statusEl.className = 'status-badge ' + (status >= 200 && status < 300 ? 'success' : status >= 400 ? 'error' : 'warning');
  } else {
    statusEl.textContent = '';
    statusEl.className = 'status-badge';
  }
  
  responseEl.textContent = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
  responseEl.className = status && status >= 400 ? 'error-response' : '';
}

function addWsLog(msg) {
  const area = document.getElementById('ws-log-area');
  const d = document.createElement('div');
  d.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  area.appendChild(d);
  area.scrollTop = area.scrollHeight;
}

function addTestResult(testName, success, message, details = null) {
  const resultsEl = document.getElementById('test-results');
  const result = document.createElement('div');
  result.className = `test-result ${success ? 'success' : 'error'}`;
  result.innerHTML = `
    <h4>${success ? '✅' : '❌'} ${testName}</h4>
    <p>${message}</p>
    ${details ? `<pre>${JSON.stringify(details, null, 2)}</pre>` : ''}
  `;
  resultsEl.insertBefore(result, resultsEl.firstChild);
}

// ============================================
// GESTIÓN DE SESIÓN
// ============================================

function saveSession(token, user, refreshToken = null) {
  if (token) localStorage.setItem('jc_jwt', token);
  if (refreshToken) localStorage.setItem('jc_refresh_token', refreshToken);
  if (user) localStorage.setItem('jc_user', JSON.stringify(user));
  if (token) {
    const decoded = jwt_decode(token);
    localStorage.setItem('jc_token_exp', decoded.exp);
  }
  document.getElementById('token-storage').value = token || '';
  updateUserInfo(user);
}

function clearSession() {
  localStorage.removeItem('jc_jwt');
  localStorage.removeItem('jc_refresh_token');
  localStorage.removeItem('jc_user');
  localStorage.removeItem('jc_token_exp');
  document.getElementById('token-storage').value = '';
  document.getElementById('user-info').classList.add('hidden');
  document.getElementById('user-info-header').classList.add('hidden');
}

function updateUserInfo(user) {
  if (user) {
    document.getElementById('user-info').classList.remove('hidden');
    document.getElementById('user-info-header').classList.remove('hidden');
    document.getElementById('user-name').textContent = user.name || user.email || `ID: ${user.id}`;
    document.getElementById('user-role').textContent = user.role || '';
    document.getElementById('user-name-header').textContent = user.name || user.email || '';
    document.getElementById('user-role-header').textContent = user.role || '';
  }
}

function isTokenExpired() {
  const exp = localStorage.getItem('jc_token_exp');
  if (!exp) return false;
  return Math.floor(Date.now() / 1000) >= parseInt(exp);
}

// ============================================
// API CALLS
// ============================================

async function apiCall(path, method = 'GET', body = null, extraHeaders = {}) {
  const base = getBase();
  let token = localStorage.getItem('jc_jwt');
  
  if (isTokenExpired()) {
    await refreshAccessToken();
    token = localStorage.getItem('jc_jwt');
  }
  
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) opts.body = JSON.stringify(body);
  
  try {
    const res = await fetch(`${base}${path}`, opts);
    const txt = await res.text();
    let data;
    try {
      data = JSON.parse(txt);
    } catch (e) {
      data = txt;
    }
    addResponse(data, res.status);
    return { data, status: res.status, ok: res.ok };
  } catch (error) {
    addResponse({ error: error.message }, 0);
    throw error;
  }
}

async function refreshAccessToken() {
  const base = getBase();
  const refreshToken = localStorage.getItem('jc_refresh_token');
  if (!refreshToken) return;
  
  try {
    const res = await fetch(`${base}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.access_token) saveSession(data.access_token, null, refreshToken);
    }
  } catch (e) { /* ignore */ }
}

// ============================================
// TABS NAVIGATION
// ============================================

function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      
      // Remove active from all
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active to clicked
      btn.classList.add('active');
      document.getElementById(`tab-${targetTab}`).classList.add('active');
    });
  });
}

// ============================================
// AUTH HANDLERS
// ============================================

function initAuthHandlers() {
  // Save backend URL
  document.getElementById('save-backend').addEventListener('click', () => {
    const v = document.getElementById('backend-url').value.trim();
    if (!v) return alert('Proporciona BACKEND URL');
    localStorage.setItem('jc_backend_url', v);
    BACKEND_URL = v;
    addResponse(`Backend guardado: ${v}`);
  });

  // Login
  document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!email || !password) return alert('Email y contraseña son requeridos');
    try {
      const base = getBase();
      const res = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(e.message || 'Login failed');
      }
      const data = await res.json();
      const token = data.access_token || data.token || data.accessToken;
      if (!token) throw new Error('No se recibió token en la respuesta');
      const decoded = jwt_decode(token);
      saveSession(token, decoded);
      addResponse({ message: 'Login OK', decoded }, res.status);
      await loadProfile();
    } catch (err) {
      addResponse({ error: err.message }, 401);
    }
  });

  // Register
  document.getElementById('btn-register').addEventListener('click', async () => {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const phone = document.getElementById('reg-phone').value.trim();
    const age = parseInt(document.getElementById('reg-age').value);
    const role = document.getElementById('reg-role').value;
    
    if (!email || !password || !name || !phone || !age || !role) {
      return alert('Todos los campos son requeridos');
    }
    try {
      const result = await apiCall('/auth/register', 'POST', { name, email, password, phone, age, role });
      if (result.ok) {
        addResponse({ message: 'Registro enviado. Verifica tu email.', response: result.data }, result.status);
        // Clear form
        ['reg-name', 'reg-email', 'reg-password', 'reg-phone', 'reg-age', 'reg-role'].forEach(id => {
          document.getElementById(id).value = '';
        });
      }
    } catch (err) {
      addResponse({ error: err.message }, 400);
    }
  });

  // Verify Email
  document.getElementById('btn-verify-email').addEventListener('click', async () => {
    const token = document.getElementById('verify-token').value.trim();
    if (!token) return alert('Token requerido');
    try {
      const result = await apiCall(`/auth/verify-email?token=${encodeURIComponent(token)}`, 'GET');
      if (result.ok) {
        addResponse({ message: 'Email verificado', response: result.data }, result.status);
      }
    } catch (err) {
      addResponse({ error: err.message }, 400);
    }
  });

  // Resend Verification
  document.getElementById('btn-resend-verification').addEventListener('click', async () => {
    const email = document.getElementById('resend-email').value.trim();
    if (!email) return alert('Email requerido');
    try {
      const result = await apiCall('/auth/resend-verification', 'POST', { email });
      addResponse({ message: 'Email de verificación reenviado', response: result.data }, result.status);
    } catch (err) {
      addResponse({ error: err.message }, 400);
    }
  });

  // Forgot Password
  document.getElementById('btn-forgot-password').addEventListener('click', async () => {
    const email = document.getElementById('forgot-email').value.trim();
    if (!email) return alert('Email requerido');
    try {
      const result = await apiCall('/auth/forgot-password', 'POST', { email });
      addResponse({ message: 'Correo de recuperación enviado', response: result.data }, result.status);
    } catch (err) {
      addResponse({ error: err.message }, 400);
    }
  });

  // Reset Password
  document.getElementById('btn-reset-password').addEventListener('click', async () => {
    const token = document.getElementById('reset-token').value.trim();
    const newPassword = document.getElementById('reset-password').value;
    if (!token || !newPassword) return alert('Token y contraseña requeridos');
    try {
      const result = await apiCall('/auth/reset-password', 'POST', { token, newPassword });
      if (result.ok) {
        addResponse({ message: 'Contraseña actualizada', response: result.data }, result.status);
        clearSession();
      }
    } catch (err) {
      addResponse({ error: err.message }, 400);
    }
  });

  // Get Profile
  document.getElementById('btn-get-profile').addEventListener('click', async () => {
    try {
      const result = await apiCall('/auth/profile', 'GET');
      if (result.ok) {
        saveSession(localStorage.getItem('jc_jwt'), result.data);
      }
    } catch (err) {
      addResponse({ error: err.message }, 401);
    }
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', async () => {
    try {
      await apiCall('/auth/logout', 'POST');
    } catch (e) { /* ignore */ }
    disconnectWebSocket();
    clearSession();
    addResponse('Session cleared');
  });

  document.getElementById('btn-logout-header').addEventListener('click', async () => {
    try {
      await apiCall('/auth/logout', 'POST');
    } catch (e) { /* ignore */ }
    disconnectWebSocket();
    clearSession();
    addResponse('Session cleared');
  });
}

async function loadProfile() {
  try {
    const result = await apiCall('/auth/profile', 'GET');
    if (result.ok) {
      updateUserInfo(result.data);
      saveSession(localStorage.getItem('jc_jwt'), result.data);
      connectWebSocket();
    }
  } catch (err) {
    addResponse({ error: err.message }, 401);
  }
}

// ============================================
// CUPOS HANDLERS
// ============================================

function initCuposHandlers() {
  // Create Cupo
  document.getElementById('btn-create-cupo').addEventListener('click', async () => {
    const destino = document.getElementById('cupo-destino').value.trim();
    const puntoEncuentro = document.getElementById('cupo-punto').value.trim();
    const descripcion = document.getElementById('cupo-descripcion').value.trim();
    const asientosTotales = parseInt(document.getElementById('cupo-asientos').value);
    const horaSalida = document.getElementById('cupo-hora').value;
    const precio = parseFloat(document.getElementById('cupo-precio').value);
    const telefonoContacto = document.getElementById('cupo-telefono').value.trim();
    
    if (!destino || !puntoEncuentro || !asientosTotales || !horaSalida || !precio) {
      return alert('Completa todos los campos requeridos');
    }
    try {
      const body = {
        destino,
        puntoEncuentro,
        asientosTotales,
        asientosDisponibles: asientosTotales,
        horaSalida: new Date(horaSalida).toISOString(),
        precio
      };
      if (descripcion) body.descripcion = descripcion;
      if (telefonoContacto) body.telefonoContacto = telefonoContacto;
      
      const result = await apiCall('/cupos', 'POST', body);
      if (result.ok) {
        // Clear form
        ['cupo-destino', 'cupo-punto', 'cupo-descripcion', 'cupo-asientos', 'cupo-hora', 'cupo-precio', 'cupo-telefono'].forEach(id => {
          document.getElementById(id).value = '';
        });
      }
    } catch (err) {
      addResponse({ error: err.message }, 400);
    }
  });

  // List Cupos
  document.getElementById('btn-list-cupos').addEventListener('click', async () => {
    try {
      const result = await apiCall('/cupos', 'GET');
    } catch (err) {
      addResponse({ error: err.message }, 400);
    }
  });

  // My Cupos
  document.getElementById('btn-my-cupos').addEventListener('click', async () => {
    try {
      const result = await apiCall('/cupos/my-cupos', 'GET');
    } catch (err) {
      addResponse({ error: err.message }, 401);
    }
  });

  // Cupo Details
  document.getElementById('btn-cupo-details').addEventListener('click', async () => {
    const id = document.getElementById('cupo-id-details').value.trim();
    if (!id) return alert('ID del cupo requerido');
    try {
      const result = await apiCall(`/cupos/${id}`, 'GET');
    } catch (err) {
      addResponse({ error: err.message }, 404);
    }
  });

  // Search Cupos
  document.getElementById('btn-search-cupos').addEventListener('click', async () => {
    const params = new URLSearchParams();
    const destino = document.getElementById('search-destino').value;
    const fecha = document.getElementById('search-fecha').value;
    const asientosMin = document.getElementById('search-asientos-min').value;
    const precioMin = document.getElementById('search-precio-min').value;
    const precioMax = document.getElementById('search-precio-max').value;
    const estado = document.getElementById('search-estado').value;
    
    if (destino) params.append('destino', destino);
    if (fecha) params.append('fechaSalida', new Date(fecha).toISOString());
    if (asientosMin) params.append('asientosMinimos', asientosMin);
    if (precioMin) params.append('precioMinimo', precioMin);
    if (precioMax) params.append('precioMaximo', precioMax);
    if (estado) params.append('estado', estado);
    
    try {
      const query = params.toString();
      const result = await apiCall(`/cupos${query ? '?' + query : ''}`, 'GET');
    } catch (err) {
      addResponse({ error: err.message }, 400);
    }
  });

  // Update Cupo
  document.getElementById('btn-update-cupo').addEventListener('click', async () => {
    const id = document.getElementById('cupo-id-update').value.trim();
    if (!id) return alert('ID del cupo requerido');
    
    const body = {};
    const punto = document.getElementById('cupo-update-punto').value.trim();
    const descripcion = document.getElementById('cupo-update-descripcion').value.trim();
    const asientos = document.getElementById('cupo-update-asientos').value;
    const precio = document.getElementById('cupo-update-precio').value;
    
    if (punto) body.puntoEncuentro = punto;
    if (descripcion) body.descripcion = descripcion;
    if (asientos) body.asientosDisponibles = parseInt(asientos);
    if (precio) body.precio = parseFloat(precio);
    
    if (Object.keys(body).length === 0) return alert('Ingresa al menos un campo a actualizar');
    
    try {
      const result = await apiCall(`/cupos/${id}`, 'PUT', body);
      if (result.ok) {
        // Clear form
        ['cupo-id-update', 'cupo-update-punto', 'cupo-update-descripcion', 'cupo-update-asientos', 'cupo-update-precio'].forEach(id => {
          document.getElementById(id).value = '';
        });
      }
    } catch (err) {
      addResponse({ error: err.message }, 400);
    }
  });

  // Cancel Cupo
  document.getElementById('btn-cancel-cupo').addEventListener('click', async () => {
    const id = document.getElementById('cupo-id-update').value.trim();
    if (!id) return alert('ID del cupo requerido');
    try {
      const result = await apiCall(`/cupos/${id}/cancel`, 'PUT');
    } catch (err) {
      addResponse({ error: err.message }, 400);
    }
  });

  // Delete Cupo
  document.getElementById('btn-delete-cupo').addEventListener('click', async () => {
    const id = document.getElementById('cupo-id-update').value.trim();
    if (!id) return alert('ID del cupo requerido');
    if (!confirm('¿Estás seguro de eliminar este cupo?')) return;
    try {
      const result = await apiCall(`/cupos/${id}`, 'DELETE');
    } catch (err) {
      addResponse({ error: err.message }, 400);
    }
  });
}

// ============================================
// BOOKINGS HANDLERS
// ============================================

function initBookingsHandlers() {
  // Create Booking
  document.getElementById('btn-create-booking').addEventListener('click', async () => {
    const cupoId = parseInt(document.getElementById('booking-cupo-id').value);
    const asientosReservados = parseInt(document.getElementById('booking-asientos').value);
    if (!cupoId || !asientosReservados) return alert('Completa todos los campos');
    try {
      const result = await apiCall('/bookings', 'POST', { cupoId, asientosReservados });
      if (result.ok) {
        document.getElementById('booking-cupo-id').value = '';
        document.getElementById('booking-asientos').value = '1';
      }
    } catch (err) {
      addResponse({ error: err.message }, 400);
    }
  });

  // My Bookings
  document.getElementById('btn-my-bookings').addEventListener('click', async () => {
    try {
      const result = await apiCall('/bookings/mine', 'GET');
    } catch (err) {
      addResponse({ error: err.message }, 401);
    }
  });

  // All Bookings
  document.getElementById('btn-all-bookings').addEventListener('click', async () => {
    try {
      const result = await apiCall('/bookings', 'GET');
    } catch (err) {
      addResponse({ error: err.message }, 403);
    }
  });

  // Bookings by Cupo
  document.getElementById('btn-bookings-by-cupo').addEventListener('click', async () => {
    const cupoId = document.getElementById('booking-cupo-filter').value.trim();
    if (!cupoId) return alert('ID del cupo requerido');
    try {
      const result = await apiCall(`/bookings?cupoId=${cupoId}`, 'GET');
    } catch (err) {
      addResponse({ error: err.message }, 400);
    }
  });

  // Confirm Booking
  document.getElementById('btn-confirm-booking').addEventListener('click', async () => {
    const id = document.getElementById('booking-id-manage').value.trim();
    if (!id) return alert('ID de la reserva requerido');
    try {
      const result = await apiCall(`/bookings/${id}/confirm`, 'PUT');
    } catch (err) {
      addResponse({ error: err.message }, 400);
    }
  });

  // Reject Booking
  document.getElementById('btn-reject-booking').addEventListener('click', async () => {
    const id = document.getElementById('booking-id-manage').value.trim();
    if (!id) return alert('ID de la reserva requerido');
    try {
      const result = await apiCall(`/bookings/${id}/reject`, 'PUT');
    } catch (err) {
      addResponse({ error: err.message }, 400);
    }
  });

  // Cancel Booking
  document.getElementById('btn-cancel-booking').addEventListener('click', async () => {
    const id = document.getElementById('booking-id-manage').value.trim();
    if (!id) return alert('ID de la reserva requerido');
    try {
      const result = await apiCall(`/bookings/${id}/cancel`, 'PUT');
    } catch (err) {
      addResponse({ error: err.message }, 400);
    }
  });
}

// ============================================
// USERS HANDLERS
// ============================================

function initUsersHandlers() {
  // All Users
  document.getElementById('btn-all-users').addEventListener('click', async () => {
    try {
      const result = await apiCall('/users', 'GET');
    } catch (err) {
      addResponse({ error: err.message }, 401);
    }
  });

  // User Details
  document.getElementById('btn-user-details').addEventListener('click', async () => {
    const id = document.getElementById('user-id-details').value.trim();
    if (!id) return alert('ID del usuario requerido');
    try {
      const result = await apiCall(`/users/${id}`, 'GET');
    } catch (err) {
      addResponse({ error: err.message }, 404);
    }
  });

  // Search Users
  document.getElementById('btn-search-users').addEventListener('click', async () => {
    const params = new URLSearchParams();
    const name = document.getElementById('search-user-name').value.trim();
    const email = document.getElementById('search-user-email').value.trim();
    const role = document.getElementById('search-user-role').value;
    
    if (name) params.append('name', name);
    if (email) params.append('email', email);
    if (role) params.append('role', role);
    
    try {
      const query = params.toString();
      const result = await apiCall(`/users/search${query ? '?' + query : ''}`, 'GET');
    } catch (err) {
      addResponse({ error: err.message }, 400);
    }
  });

  // Update User
  document.getElementById('btn-update-user').addEventListener('click', async () => {
    const id = document.getElementById('user-id-manage').value.trim();
    if (!id) return alert('ID del usuario requerido');
    
    const body = {};
    const name = document.getElementById('user-update-name').value.trim();
    const phone = document.getElementById('user-update-phone').value.trim();
    const age = document.getElementById('user-update-age').value;
    
    if (name) body.name = name;
    if (phone) body.phone = phone;
    if (age) body.age = parseInt(age);
    
    if (Object.keys(body).length === 0) return alert('Ingresa al menos un campo a actualizar');
    
    try {
      const result = await apiCall(`/users/${id}`, 'PUT', body);
      if (result.ok) {
        ['user-id-manage', 'user-update-name', 'user-update-phone', 'user-update-age'].forEach(id => {
          document.getElementById(id).value = '';
        });
      }
    } catch (err) {
      addResponse({ error: err.message }, 400);
    }
  });

  // Delete User
  document.getElementById('btn-delete-user').addEventListener('click', async () => {
    const id = document.getElementById('user-id-manage').value.trim();
    if (!id) return alert('ID del usuario requerido');
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      const result = await apiCall(`/users/${id}`, 'DELETE');
    } catch (err) {
      addResponse({ error: err.message }, 400);
    }
  });

  // Create User
  document.getElementById('btn-create-user').addEventListener('click', async () => {
    const name = document.getElementById('create-user-name').value.trim();
    const email = document.getElementById('create-user-email').value.trim();
    const password = document.getElementById('create-user-password').value;
    const phone = document.getElementById('create-user-phone').value.trim();
    const age = parseInt(document.getElementById('create-user-age').value);
    const role = document.getElementById('create-user-role').value;
    
    if (!name || !email || !password || !phone || !age) {
      return alert('Todos los campos son requeridos');
    }
    try {
      const result = await apiCall('/users', 'POST', { name, email, password, phone, age, role });
      if (result.ok) {
        ['create-user-name', 'create-user-email', 'create-user-password', 'create-user-phone', 'create-user-age'].forEach(id => {
          document.getElementById(id).value = '';
        });
      }
    } catch (err) {
      addResponse({ error: err.message }, 400);
    }
  });
}

// ============================================
// NOTIFICATIONS HANDLERS
// ============================================

// Variable global para almacenar notificaciones y reservas pendientes
let currentNotifications = [];
let pendingBookings = [];

async function loadNotificationsList() {
  try {
    const result = await apiCall('/notifications', 'GET');
    if (result.ok && Array.isArray(result.data)) {
      currentNotifications = result.data;
      displayNotificationsList(result.data);
      // Cargar reservas pendientes si el usuario es conductor
      await loadPendingBookings();
    }
  } catch (err) {
    console.error('Error cargando notificaciones:', err);
  }
}

async function loadPendingBookings() {
  try {
    const user = JSON.parse(localStorage.getItem('jc_user') || '{}');
    if (user.role === 'conductor' || user.role === 'administrador') {
      const result = await apiCall('/bookings', 'GET');
      if (result.ok && Array.isArray(result.data)) {
        // Filtrar solo reservas pendientes
        pendingBookings = result.data.filter(b => b.estado === 'PENDIENTE');
        
        // Si las reservas no tienen la relación cupo cargada, cargarla
        for (let booking of pendingBookings) {
          if (booking.cupoId && (!booking.cupo || !booking.cupo.destino)) {
            try {
              const cupoResult = await apiCall(`/cupos/${booking.cupoId}`, 'GET');
              if (cupoResult.ok && cupoResult.data) {
                booking.cupo = cupoResult.data;
              }
            } catch (err) {
              // Silenciar error, simplemente no tendrá la relación
            }
          }
        }
      }
    } else {
      pendingBookings = [];
    }
  } catch (err) {
    console.error('Error cargando reservas:', err);
    pendingBookings = [];
  }
}

function findBookingIdForNotification(notification) {
  // Si es una notificación de "Reserva creada" para conductor, buscar reservas pendientes
  if (notification.type === 'Reserva creada' && 
      (notification.message.includes('nueva reserva') || 
       notification.message.includes('confirma o rechaza'))) {
    
    if (pendingBookings.length === 0) return null;
    
    // Extraer el destino del mensaje si es posible
    // Ejemplo: "Tienes una nueva reserva en el cupo con destino a Centro, confirma o rechaza."
    const message = notification.message || '';
    let extractedDestino = null;
    
    // Buscar patrón "destino a X" o "destino X"
    const destinoMatch = message.match(/destino a?\s+([^,]+)/i);
    if (destinoMatch) {
      extractedDestino = destinoMatch[1].trim();
    }
    
    // Ordenar reservas por fecha de creación (más reciente primero)
    const sorted = [...pendingBookings].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });
    
    // Si se extrajo un destino, buscar reserva que coincida
    if (extractedDestino) {
      const matchingByDestino = sorted.find(b => {
        if (b.cupo && b.cupo.destino) {
          return b.cupo.destino.toLowerCase().includes(extractedDestino.toLowerCase()) ||
                 extractedDestino.toLowerCase().includes(b.cupo.destino.toLowerCase());
        }
        return false;
      });
      if (matchingByDestino) return matchingByDestino.id;
    }
    
    // Si no se encontró por destino, buscar por fecha (rango de 5 minutos)
    const notifDate = new Date(notification.createdAt);
    const matchingByDate = sorted.find(b => {
      const bookingDate = new Date(b.createdAt);
      const diff = Math.abs(notifDate - bookingDate);
      return diff < 5 * 60 * 1000; // 5 minutos
    });
    
    // Retornar la más reciente si no hay coincidencia exacta
    return matchingByDate ? matchingByDate.id : sorted[0].id;
  }
  
  return null;
}

function displayNotificationsList(notifications) {
  const listEl = document.getElementById('notifications-list');
  if (!listEl) return;
  
  if (!notifications || notifications.length === 0) {
    listEl.innerHTML = '<p class="text-muted">No hay notificaciones</p>';
    return;
  }
  
  // Ordenar por fecha (más recientes primero)
  const sorted = [...notifications].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0);
    const dateB = new Date(b.createdAt || 0);
    return dateB - dateA;
  });
  
  listEl.innerHTML = '';
  
  sorted.forEach(notification => {
    const item = createNotificationItem(notification);
    listEl.appendChild(item);
  });
  
  // Actualizar conteo
  updateUnreadCount(notifications);
}

function createNotificationItem(notification) {
  const item = document.createElement('div');
  const isRead = notification.isRead === 'Leida' || notification.isRead === 'SENT' || notification.isRead === 'DELIVERED';
  const isPending = notification.isRead === 'Pendiente' || notification.isRead === 'PENDING';
  
  item.className = `notification-item-card ${isPending ? 'unread' : ''}`;
  
  const title = notification.type || 'Notificación';
  const message = notification.message || 'Sin mensaje';
  const time = notification.createdAt 
    ? new Date(notification.createdAt).toLocaleString('es-CO', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    : new Date().toLocaleString('es-CO');
  
  // Determinar si es una notificación de reserva que requiere acción
  const isBookingAction = notification.type === 'Reserva creada' && 
                          (notification.message.includes('nueva reserva') || 
                           notification.message.includes('confirma o rechaza'));
  
  // Intentar encontrar el bookingId
  let bookingId = null;
  if (isBookingAction) {
    bookingId = findBookingIdForNotification(notification);
  }
  
  item.innerHTML = `
    <div class="notification-header">
      <div class="notification-title-section">
        <h4>${title}</h4>
        ${isPending ? '<span class="badge-unread">Nueva</span>' : ''}
      </div>
      <div class="notification-time">${time}</div>
    </div>
    <div class="notification-message">${message}</div>
    <div class="notification-actions">
      ${!isRead ? `
        <button class="btn-action btn-mark-read" data-notif-id="${notification.id}">
          ✓ Marcar como leída
        </button>
      ` : ''}
      ${isBookingAction && bookingId ? `
        <button class="btn-action btn-confirm-booking" data-booking-id="${bookingId}">
          ✅ Confirmar Reserva
        </button>
        <button class="btn-action btn-reject-booking" data-booking-id="${bookingId}">
          ❌ Rechazar Reserva
        </button>
      ` : ''}
      <button class="btn-action btn-delete-notif" data-notif-id="${notification.id}">
        🗑️ Eliminar
      </button>
    </div>
  `;
  
  // Agregar event listeners
  const markReadBtn = item.querySelector('.btn-mark-read');
  if (markReadBtn) {
    markReadBtn.addEventListener('click', async () => {
      await markNotificationAsRead(notification.id);
    });
  }
  
  const confirmBtn = item.querySelector('.btn-confirm-booking');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      const bookingId = confirmBtn.dataset.bookingId;
      await confirmBookingFromNotification(bookingId, notification.id);
    });
  }
  
  const rejectBtn = item.querySelector('.btn-reject-booking');
  if (rejectBtn) {
    rejectBtn.addEventListener('click', async () => {
      const bookingId = rejectBtn.dataset.bookingId;
      await rejectBookingFromNotification(bookingId, notification.id);
    });
  }
  
  const deleteBtn = item.querySelector('.btn-delete-notif');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      await deleteNotification(notification.id);
    });
  }
  
  return item;
}

async function markNotificationAsRead(notifId) {
  try {
    const result = await apiCall(`/notifications/${notifId}/read`, 'PATCH');
    if (result.ok) {
      await loadNotificationsList();
    }
  } catch (err) {
    addResponse({ error: err.message }, 400);
  }
}

async function confirmBookingFromNotification(bookingId, notifId) {
  if (!bookingId) {
    alert('No se pudo identificar la reserva. Usa el panel de Reservas para confirmarla.');
    return;
  }
  try {
    const result = await apiCall(`/bookings/${bookingId}/confirm`, 'PUT');
    if (result.ok) {
      // Marcar notificación como leída
      await markNotificationAsRead(notifId);
      await loadNotificationsList();
      addResponse({ message: 'Reserva confirmada exitosamente', response: result.data }, result.status);
    }
  } catch (err) {
    addResponse({ error: err.message }, 400);
  }
}

async function rejectBookingFromNotification(bookingId, notifId) {
  if (!bookingId) {
    alert('No se pudo identificar la reserva. Usa el panel de Reservas para rechazarla.');
    return;
  }
  try {
    const result = await apiCall(`/bookings/${bookingId}/reject`, 'PUT');
    if (result.ok) {
      // Marcar notificación como leída
      await markNotificationAsRead(notifId);
      await loadNotificationsList();
      addResponse({ message: 'Reserva rechazada exitosamente', response: result.data }, result.status);
    }
  } catch (err) {
    addResponse({ error: err.message }, 400);
  }
}

async function deleteNotification(notifId) {
  if (!confirm('¿Eliminar esta notificación?')) return;
  try {
    const result = await apiCall(`/notifications/${notifId}`, 'DELETE');
    if (result.ok) {
      await loadNotificationsList();
    }
  } catch (err) {
    addResponse({ error: err.message }, 400);
  }
}

function addNotificationToList(notification) {
  // Agregar al inicio de la lista
  currentNotifications.unshift(notification);
  displayNotificationsList(currentNotifications);
}

function updateUnreadCount(notifications) {
  const unreadCount = notifications.filter(n => 
    n.isRead === 'Pendiente' || n.isRead === 'PENDING'
  ).length;
  
  const countEl = document.getElementById('unread-count-display');
  if (countEl) {
    if (unreadCount > 0) {
      countEl.textContent = `📬 ${unreadCount} notificación${unreadCount > 1 ? 'es' : ''} sin leer`;
      countEl.className = 'unread-count-display has-unread';
    } else {
      countEl.textContent = '✓ Todas las notificaciones leídas';
      countEl.className = 'unread-count-display all-read';
    }
  }
}

function initNotificationsHandlers() {
  // My Notifications
  document.getElementById('btn-my-notifications').addEventListener('click', async () => {
    await loadNotificationsList();
  });

  // Pending Notifications
  document.getElementById('btn-pending-notifs').addEventListener('click', async () => {
    try {
      const result = await apiCall('/notifications/pending', 'GET');
      if (result.ok && Array.isArray(result.data)) {
        displayNotificationsList(result.data);
      }
    } catch (err) {
      addResponse({ error: err.message }, 401);
    }
  });

  // Unread Count
  document.getElementById('btn-unread-count').addEventListener('click', async () => {
    try {
      const result = await apiCall('/notifications/unread-count', 'GET');
      if (result.ok) {
        addResponse({ message: `Notificaciones sin leer: ${result.data.count}`, response: result.data }, result.status);
      }
    } catch (err) {
      addResponse({ error: err.message }, 401);
    }
  });

  // Mark All as Read
  document.getElementById('btn-mark-all-read').addEventListener('click', async () => {
    try {
      const result = await apiCall('/notifications/mark-all-read', 'PATCH');
      if (result.ok) {
        await loadNotificationsList();
        addResponse({ message: 'Todas las notificaciones marcadas como leídas' }, result.status);
      }
    } catch (err) {
      addResponse({ error: err.message }, 400);
    }
  });

  // Refresh Notifications
  document.getElementById('btn-refresh-notifications').addEventListener('click', async () => {
    await loadNotificationsList();
  });

  // Create Notification
  document.getElementById('btn-create-notif').addEventListener('click', async () => {
    const userId = document.getElementById('create-notif-user-id').value.trim();
    const type = document.getElementById('create-notif-type').value;
    const message = document.getElementById('create-notif-message').value.trim();
    
    if (!message) return alert('Mensaje requerido');
    
    const body = { type, message };
    if (userId) body.userId = parseInt(userId);
    
    try {
      const result = await apiCall('/notifications', 'POST', body);
      if (result.ok) {
        document.getElementById('create-notif-message').value = '';
        document.getElementById('create-notif-user-id').value = '';
        await loadNotificationsList();
      }
    } catch (err) {
      addResponse({ error: err.message }, 400);
    }
  });
}

// ============================================
// TEST CASES HANDLERS
// ============================================

function initTestCasesHandlers() {
  const testCaseBtns = document.querySelectorAll('.test-case-btn');
  testCaseBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const testType = btn.dataset.test;
      await runTestCase(testType);
    });
  });
}

async function runTestCase(testType) {
  addTestResult(`Ejecutando: ${testType}`, true, 'Iniciando...');
  
  try {
    switch (testType) {
      case 'flow-register-verify-login':
        await testFlowRegisterVerifyLogin();
        break;
      case 'flow-create-cupo-booking':
        await testFlowCreateCupoBooking();
        break;
      case 'flow-booking-reject':
        await testFlowBookingReject();
        break;
      case 'flow-cancel-cupo':
        await testFlowCancelCupo();
        break;
      case 'error-duplicate-email':
        await testErrorDuplicateEmail();
        break;
      case 'error-invalid-credentials':
        await testErrorInvalidCredentials();
        break;
      case 'error-unauthorized':
        await testErrorUnauthorized();
        break;
      case 'error-forbidden':
        await testErrorForbidden();
        break;
      case 'error-past-date':
        await testErrorPastDate();
        break;
      case 'error-insufficient-seats':
        await testErrorInsufficientSeats();
        break;
      case 'error-duplicate-booking':
        await testErrorDuplicateBooking();
        break;
      case 'error-own-cupo':
        await testErrorOwnCupo();
        break;
      case 'validate-cupo-update-permissions':
        await testValidateCupoUpdatePermissions();
        break;
      case 'validate-booking-confirm-permissions':
        await testValidateBookingConfirmPermissions();
        break;
      case 'validate-booking-state':
        await testValidateBookingState();
        break;
      case 'validate-seats-calculation':
        await testValidateSeatsCalculation();
        break;
      default:
        addTestResult(testType, false, 'Caso de prueba no implementado');
    }
  } catch (error) {
    addTestResult(testType, false, `Error: ${error.message}`);
  }
}

// Test Cases Implementation
async function testFlowRegisterVerifyLogin() {
  const email = `test_${Date.now()}@test.com`;
  const password = 'Test123!';
  
  // Register
  const registerResult = await apiCall('/auth/register', 'POST', {
    name: 'Test User',
    email,
    password,
    phone: '+57 300 0000000',
    age: 25,
    role: 'usuario'
  });
  
  if (!registerResult.ok) {
    addTestResult('Registro', false, 'Error en registro', registerResult.data);
    return;
  }
  
  addTestResult('Registro', true, 'Usuario registrado exitosamente');
  
  // Note: En un test real, necesitarías el token del email
  // Por ahora solo verificamos que el registro funcione
  addTestResult('Flujo Completo', true, 'Registro completado. Verifica email manualmente para continuar.');
}

async function testFlowCreateCupoBooking() {
  // Este test requiere estar autenticado como conductor
  const token = localStorage.getItem('jc_jwt');
  if (!token) {
    addTestResult('Flujo Cupo-Booking', false, 'Debes estar autenticado como conductor');
    return;
  }
  
  // Crear cupo
  const futureDate = new Date();
  futureDate.setHours(futureDate.getHours() + 2);
  
  const cupoResult = await apiCall('/cupos', 'POST', {
    destino: 'Centro',
    puntoEncuentro: 'Test Point',
    asientosTotales: 4,
    asientosDisponibles: 4,
    horaSalida: futureDate.toISOString(),
    precio: 5000
  });
  
  if (!cupoResult.ok) {
    addTestResult('Crear Cupo', false, 'Error al crear cupo', cupoResult.data);
    return;
  }
  
  addTestResult('Crear Cupo', true, 'Cupo creado exitosamente', cupoResult.data);
  
  // Nota: Para completar el flujo necesitarías otro usuario para reservar
  addTestResult('Flujo Completo', true, 'Cupo creado. Usa otro usuario para completar la reserva.');
}

async function testErrorDuplicateEmail() {
  const email = `duplicate_${Date.now()}@test.com`;
  
  // Primer registro
  const result1 = await apiCall('/auth/register', 'POST', {
    name: 'User 1',
    email,
    password: 'Test123!',
    phone: '+57 300 1111111',
    age: 25,
    role: 'usuario'
  });
  
  // Segundo registro con mismo email
  const result2 = await apiCall('/auth/register', 'POST', {
    name: 'User 2',
    email,
    password: 'Test123!',
    phone: '+57 300 2222222',
    age: 25,
    role: 'usuario'
  });
  
  if (result2.ok) {
    addTestResult('Email Duplicado', false, 'No se detectó email duplicado');
  } else {
    addTestResult('Email Duplicado', true, 'Error correctamente detectado', result2.data);
  }
}

async function testErrorInvalidCredentials() {
  const result = await apiCall('/auth/login', 'POST', {
    email: 'nonexistent@test.com',
    password: 'wrongpassword'
  });
  
  if (result.ok) {
    addTestResult('Credenciales Inválidas', false, 'No se rechazaron credenciales inválidas');
  } else {
    addTestResult('Credenciales Inválidas', true, 'Error correctamente detectado', result.data);
  }
}

async function testErrorUnauthorized() {
  clearSession();
  const result = await apiCall('/auth/profile', 'GET');
  
  if (result.ok) {
    addTestResult('Sin Autenticación', false, 'No se rechazó request sin token');
  } else {
    addTestResult('Sin Autenticación', true, 'Error correctamente detectado', result.data);
  }
}

async function testErrorForbidden() {
  // Intentar crear cupo como usuario regular
  const result = await apiCall('/cupos', 'POST', {
    destino: 'Centro',
    puntoEncuentro: 'Test',
    asientosTotales: 4,
    asientosDisponibles: 4,
    horaSalida: new Date().toISOString(),
    precio: 5000
  });
  
  if (result.ok) {
    addTestResult('Sin Permisos', false, 'No se rechazó operación sin permisos');
  } else {
    addTestResult('Sin Permisos', true, 'Error correctamente detectado', result.data);
  }
}

async function testErrorPastDate() {
  const pastDate = new Date();
  pastDate.setHours(pastDate.getHours() - 1);
  
  const result = await apiCall('/cupos', 'POST', {
    destino: 'Centro',
    puntoEncuentro: 'Test',
    asientosTotales: 4,
    asientosDisponibles: 4,
    horaSalida: pastDate.toISOString(),
    precio: 5000
  });
  
  if (result.ok) {
    addTestResult('Fecha Pasada', false, 'No se rechazó fecha pasada');
  } else {
    addTestResult('Fecha Pasada', true, 'Error correctamente detectado', result.data);
  }
}

async function testErrorInsufficientSeats() {
  // Este test requiere un cupo existente con pocos asientos
  addTestResult('Asientos Insuficientes', true, 'Test manual: Crea un cupo con 1 asiento e intenta reservar 2');
}

async function testErrorDuplicateBooking() {
  addTestResult('Reserva Duplicada', true, 'Test manual: Crea una reserva y luego intenta crear otra para el mismo cupo');
}

async function testErrorOwnCupo() {
  addTestResult('Reservar Propio Cupo', true, 'Test manual: Como conductor, intenta reservar tu propio cupo');
}

async function testValidateCupoUpdatePermissions() {
  addTestResult('Permisos Actualizar Cupo', true, 'Test manual: Intenta actualizar un cupo de otro conductor');
}

async function testValidateBookingConfirmPermissions() {
  addTestResult('Permisos Confirmar Reserva', true, 'Test manual: Intenta confirmar una reserva de otro conductor');
}

async function testValidateBookingState() {
  addTestResult('Estados de Reserva', true, 'Test manual: Intenta confirmar una reserva ya confirmada');
}

async function testValidateSeatsCalculation() {
  addTestResult('Cálculo de Asientos', true, 'Test manual: Crea reserva y verifica que los asientos se resten correctamente');
}

async function testFlowBookingReject() {
  addTestResult('Flujo Rechazar Reserva', true, 'Test manual: Crea reserva y recházala como conductor');
}

async function testFlowCancelCupo() {
  addTestResult('Flujo Cancelar Cupo', true, 'Test manual: Crea un cupo y cancélalo');
}

// ============================================
// GENERIC API HANDLER
// ============================================

function initGenericAPIHandler() {
  document.getElementById('btn-send').addEventListener('click', async () => {
    const method = document.getElementById('req-method').value;
    const path = document.getElementById('req-path').value.trim();
    const bodyText = document.getElementById('req-body').value.trim();
    let body = null;
    if (bodyText) {
      try {
        body = JSON.parse(bodyText);
      } catch (e) {
        return alert('JSON inválido en body');
      }
    }
    try {
      const result = await apiCall(path, method, body);
    } catch (err) {
      addResponse({ error: err.message }, 0);
    }
  });
}

// ============================================
// WEBSOCKET HANDLERS
// ============================================

let socket = null;

function connectWebSocket() {
  const token = localStorage.getItem('jc_jwt');
  if (!token) return;
  
  if (socket && socket.connected) return;
  
  const base = getBase();
  const user = JSON.parse(localStorage.getItem('jc_user') || '{}');
  addWsLog(`Conectando a ${base}/notifications`);
  
  socket = io(`${base}/notifications`, {
    auth: { token, userId: user.id },
    transports: ['websocket', 'polling']
  });
  
  socket.on('connect', () => {
    addWsLog('✅ Conectado');
    document.getElementById('ws-connect').disabled = true;
    document.getElementById('ws-disconnect').disabled = false;
    // Cargar notificaciones al conectar
    loadNotificationsList();
  });
  
  socket.on('disconnect', () => {
    addWsLog('Desconectado');
    document.getElementById('ws-connect').disabled = false;
    document.getElementById('ws-disconnect').disabled = true;
  });
  
  socket.on('new-notification', (notification) => {
    addWsLog('🔔 Nueva notificación recibida: ' + notification.type);
    // Agregar a la lista sin mostrar toast
    addNotificationToList(notification);
    // Recargar lista completa
    loadNotificationsList();
  });
  
  socket.on('notifications-list', (list) => {
    addWsLog('📋 Lista recibida: ' + list.length);
    displayNotificationsList(list);
  });
  
  socket.on('pending-notifications', (list) => {
    addWsLog('⏳ Notificaciones pendientes: ' + list.length);
    displayNotificationsList(list);
  });
  
  socket.on('connect_error', (e) => {
    addWsLog('❌ Error conexión: ' + (e.message || e));
  });
}

function disconnectWebSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    addWsLog('Desconectado manualmente');
    document.getElementById('ws-connect').disabled = false;
    document.getElementById('ws-disconnect').disabled = true;
  }
}

function initWebSocketHandlers() {
  document.getElementById('ws-connect').addEventListener('click', connectWebSocket);
  document.getElementById('ws-disconnect').addEventListener('click', disconnectWebSocket);
  document.getElementById('ws-request-notifs').addEventListener('click', async () => {
    if (!socket) return alert('Conecta WS');
    socket.emit('get-notifications');
    addWsLog('Solicitadas notificaciones');
    // También cargar desde API
    await loadNotificationsList();
  });
  document.getElementById('ws-mark-all').addEventListener('click', async () => {
    if (!socket) return alert('Conecta WS');
    socket.emit('mark-all-read');
    addWsLog('Pedido: marcar todas leídas');
    // También marcar desde API
    try {
      await apiCall('/notifications/mark-all-read', 'PATCH');
      await loadNotificationsList();
    } catch (err) {
      console.error('Error marcando todas como leídas:', err);
    }
  });
}

// Las funciones de notificaciones están ahora integradas en initNotificationsHandlers

// ============================================
// INITIALIZATION
// ============================================

window.addEventListener('load', () => {
  initDestinoSelects();
  initTabs();
  initAuthHandlers();
  initCuposHandlers();
  initBookingsHandlers();
  initUsersHandlers();
  initNotificationsHandlers();
  initTestCasesHandlers();
  initGenericAPIHandler();
  initWebSocketHandlers();
  
  // Restore session
  const token = localStorage.getItem('jc_jwt');
  const user = localStorage.getItem('jc_user');
  if (token) {
    document.getElementById('token-storage').value = token;
    if (!isTokenExpired()) {
      connectWebSocket();
      // Cargar notificaciones al iniciar si hay sesión
      loadNotificationsList();
    }
  }
  if (user) {
    try {
      const u = JSON.parse(user);
      updateUserInfo(u);
    } catch (e) { }
  }
});
