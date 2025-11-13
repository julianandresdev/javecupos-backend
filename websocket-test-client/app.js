const savedUrl = localStorage.getItem('jc_backend_url') || 'http://localhost:3000';
const backendInput = document.getElementById('backend-url');
backendInput.value = savedUrl;

const saveBtn = document.getElementById('save-backend');
saveBtn.addEventListener('click', () => {
  const v = document.getElementById('backend-url').value.trim();
  if (!v) return alert('Proporciona BACKEND URL');
  localStorage.setItem('jc_backend_url', v);
  addResponse(`Backend guardado: ${v}`);
});

let BACKEND_URL = savedUrl;
function getBase() { return (document.getElementById('backend-url').value || BACKEND_URL).trim(); }

// Utils
function addResponse(text) {
  document.getElementById('response').textContent = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
}

function addWsLog(msg) {
  const area = document.getElementById('ws-log-area');
  const d = document.createElement('div'); d.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  area.appendChild(d); area.scrollTop = area.scrollHeight;
}

function saveSession(token, user, refreshToken = null) {
  if (token) localStorage.setItem('jc_jwt', token);
  if (refreshToken) localStorage.setItem('jc_refresh_token', refreshToken);
  if (user) localStorage.setItem('jc_user', JSON.stringify(user));
  if (token) {
    const decoded = jwt_decode(token);
    localStorage.setItem('jc_token_exp', decoded.exp);
  }
  document.getElementById('token-storage').value = token || '';
}

function clearSession() {
  localStorage.removeItem('jc_jwt');
  localStorage.removeItem('jc_refresh_token');
  localStorage.removeItem('jc_user');
  localStorage.removeItem('jc_token_exp');
  document.getElementById('token-storage').value = '';
  document.getElementById('user-info').classList.add('hidden');
}

function isTokenExpired() {
  const exp = localStorage.getItem('jc_token_exp');
  if (!exp) return false;
  return Math.floor(Date.now() / 1000) >= parseInt(exp);
}

async function apiCall(path, method='GET', body=null, extraHeaders={}){
  const base = getBase();
  let token = localStorage.getItem('jc_jwt');
  
  // Intenta renovar el token si está expirado
  if (isTokenExpired()) {
    await refreshAccessToken();
    token = localStorage.getItem('jc_jwt');
  }
  
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body && (method==='POST' || method==='PUT' || method==='PATCH')) opts.body = JSON.stringify(body);
  const res = await fetch(`${base}${path}`, opts);
  const txt = await res.text();
  try { return JSON.parse(txt); } catch(e){ return txt; }
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

// Auth handlers
document.getElementById('btn-login').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if(!email||!password) return alert('Email y contraseña son requeridos');
  try{
    const base = getBase();
    const res = await fetch(`${base}/auth/login`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email,password}) });
    if(!res.ok){ const e = await res.json().catch(()=>({message:res.statusText})); throw new Error(e.message||'Login failed'); }
    const data = await res.json();
    const token = data.access_token || data.token || data.accessToken;
    if(!token) throw new Error('No se recibió token en la respuesta');
    const decoded = jwt_decode(token);
    saveSession(token, decoded);
    addResponse({ message: 'Login OK', decoded });
    await loadProfile();
  }catch(err){ addResponse({error:err.message}); }
});

document.getElementById('btn-register').addEventListener('click', async ()=>{
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  if(!email||!password||!name) return alert('Nombre, email y contraseña requeridos');
  try{
    const base = getBase();
    const res = await fetch(`${base}/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name,email,password}) });
    const body = await res.json();
    if(!res.ok) throw new Error(body.message || JSON.stringify(body));
    addResponse({ message: 'Registro enviado. Verifica tu email.', response: body });
    document.getElementById('reg-name').value = '';
    document.getElementById('reg-email').value = '';
    document.getElementById('reg-password').value = '';
  }catch(err){ addResponse({ error: err.message }); }
});

// Extra auth endpoints
document.getElementById('btn-verify-email').addEventListener('click', async ()=>{
  const token = document.getElementById('verify-token').value.trim();
  if(!token) return alert('Token requerido');
  try{
    const base = getBase();
    const res = await fetch(`${base}/auth/verify-email?token=${encodeURIComponent(token)}`);
    const data = await res.json();
    if(!res.ok) throw new Error(data.message || JSON.stringify(data));
    addResponse({ message: 'Email verificado', response: data });
  }catch(err){ addResponse({ error: err.message }); }
});

document.getElementById('btn-resend-verification').addEventListener('click', async ()=>{
  const email = document.getElementById('resend-email').value.trim();
  if(!email) return alert('Email requerido');
  try{
    const base = getBase();
    const res = await fetch(`${base}/auth/resend-verification`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email}) });
    const data = await res.json();
    if(!res.ok) throw new Error(data.message || JSON.stringify(data));
    addResponse({ message: 'Email de verificación reenviado', response: data });
  }catch(err){ addResponse({ error: err.message }); }
});

document.getElementById('btn-forgot-password').addEventListener('click', async ()=>{
  const email = document.getElementById('forgot-email').value.trim();
  if(!email) return alert('Email requerido');
  try{
    const base = getBase();
    const res = await fetch(`${base}/auth/forgot-password`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email}) });
    const data = await res.json();
    if(!res.ok) throw new Error(data.message || JSON.stringify(data));
    addResponse({ message: 'Correo de recuperación enviado', response: data });
  }catch(err){ addResponse({ error: err.message }); }
});

document.getElementById('btn-reset-password').addEventListener('click', async ()=>{
  const token = document.getElementById('reset-token').value.trim();
  const newPassword = document.getElementById('reset-password').value;
  if(!token || !newPassword) return alert('Token y contraseña requeridos');
  try{
    const base = getBase();
    const res = await fetch(`${base}/auth/reset-password`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({token, newPassword}) });
    const data = await res.json();
    if(!res.ok) throw new Error(data.message || JSON.stringify(data));
    addResponse({ message: 'Contraseña actualizada', response: data });
    clearSession();
  }catch(err){ addResponse({ error: err.message }); }
});

document.getElementById('btn-logout').addEventListener('click', async ()=>{
  try{
    const base = getBase();
    await apiCall('/auth/logout','POST');
  }catch(e){ /* ignore */ }
  clearSession();
  addResponse('Session cleared');
});

async function loadProfile(){
  try{
    const profile = await apiCall('/auth/profile','GET');
    document.getElementById('user-info').classList.remove('hidden');
    document.getElementById('user-name').textContent = profile.name || profile.email || ('id:'+profile.id);
    document.getElementById('user-role').textContent = profile.role || profile.roles || '';
    saveSession(localStorage.getItem('jc_jwt'), profile);
    addResponse({ profile });
  }catch(err){ addResponse({ error: err.message }); }
}

// Generic request UI
document.getElementById('btn-send').addEventListener('click', async ()=>{
  const method = document.getElementById('req-method').value;
  const path = document.getElementById('req-path').value.trim();
  const bodyText = document.getElementById('req-body').value.trim();
  let body = null;
  if(bodyText) try{ body = JSON.parse(bodyText);}catch(e){ return alert('JSON inválido en body'); }
  try{
    const result = await apiCall(path, method, body);
    addResponse(result);
  }catch(err){ addResponse({ error: err.message }); }
});

document.querySelectorAll('.prebuilt .pre').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.getElementById('req-method').value = btn.dataset.method;
    document.getElementById('req-path').value = btn.dataset.path;
    // small helper for create cupo
    if(btn.dataset.path === '/cupos' && btn.dataset.method === 'POST'){
      document.getElementById('req-body').value = JSON.stringify({ destino: 'Centro', puntoEncuentro: 'Punto A', asientosTotales: 4, asientosDisponibles:4, horaSalida: new Date().toISOString(), precio: 5000 }, null, 2);
    }
  });
});

// WebSocket
let socket = null;
document.getElementById('ws-connect').addEventListener('click', ()=>{
  const token = localStorage.getItem('jc_jwt');
  if(!token) return alert('Inicia sesión primero');
  const base = getBase();
  addWsLog(`Conectando a ${base}/notifications`);
  socket = io(`${base}/notifications`, { auth: { token, userId: JSON.parse(localStorage.getItem('jc_user') || '{}').id }, transports: ['websocket','polling'] });
  socket.on('connect', ()=>{ addWsLog('Conectado'); document.getElementById('ws-connect').disabled = true; document.getElementById('ws-disconnect').disabled = false; });
  socket.on('disconnect', ()=>{ addWsLog('Desconectado'); document.getElementById('ws-connect').disabled = false; document.getElementById('ws-disconnect').disabled = true; });
  socket.on('new-notification', n=>{ addWsLog('Nueva notificación: '+JSON.stringify(n)); });
  socket.on('notifications-list', list=>{ addWsLog('Lista recibida: '+list.length); });
  socket.on('pending-notifications', list=>{ addWsLog('Notificaciones pendientes: '+list.length); });
  socket.on('connect_error', e=>{ addWsLog('Error conexión: '+(e.message||e)); });
});

document.getElementById('ws-disconnect').addEventListener('click', ()=>{ if(socket) socket.disconnect(); socket = null; addWsLog('Desconectado manualmente'); document.getElementById('ws-connect').disabled = false; document.getElementById('ws-disconnect').disabled = true; });

document.getElementById('ws-request-notifs').addEventListener('click', ()=>{ if(!socket) return alert('Conecta WS'); socket.emit('get-notifications'); addWsLog('Solicitadas notificaciones'); });
document.getElementById('ws-mark-all').addEventListener('click', ()=>{ if(!socket) return alert('Conecta WS'); socket.emit('mark-all-read'); addWsLog('Pedido: marcar todas leídas'); });

// Cupos handlers
document.getElementById('btn-create-cupo').addEventListener('click', async ()=>{
  const destino = document.getElementById('cupo-destino').value.trim();
  const puntoEncuentro = document.getElementById('cupo-punto').value.trim();
  const asientosTotales = parseInt(document.getElementById('cupo-asientos').value);
  const horaSalida = document.getElementById('cupo-hora').value;
  const precio = parseFloat(document.getElementById('cupo-precio').value);
  
  if(!destino||!puntoEncuentro||!asientosTotales||!horaSalida||!precio) return alert('Completa todos los campos');
  try{
    const result = await apiCall('/cupos', 'POST', { destino, puntoEncuentro, asientosTotales, asientosDisponibles: asientosTotales, horaSalida: new Date(horaSalida).toISOString(), precio });
    addResponse({ message: 'Cupo creado', response: result });
    document.getElementById('cupo-destino').value = '';
    document.getElementById('cupo-punto').value = '';
    document.getElementById('cupo-asientos').value = '4';
    document.getElementById('cupo-precio').value = '';
  }catch(err){ addResponse({ error: err.message }); }
});

document.getElementById('btn-list-cupos').addEventListener('click', async ()=>{
  try{
    const result = await apiCall('/cupos', 'GET');
    addResponse({ message: 'Cupos encontrados: '+result.length, response: result });
  }catch(err){ addResponse({ error: err.message }); }
});

document.getElementById('btn-my-cupos').addEventListener('click', async ()=>{
  try{
    const result = await apiCall('/cupos/my-cupos', 'GET');
    addResponse({ message: 'Mis cupos: '+result.length, response: result });
  }catch(err){ addResponse({ error: err.message }); }
});

// Bookings handlers
document.getElementById('btn-create-booking').addEventListener('click', async ()=>{
  const cupoId = parseInt(document.getElementById('booking-cupo-id').value);
  const asientosReservados = parseInt(document.getElementById('booking-asientos').value);
  if(!cupoId||!asientosReservados) return alert('Completa todos los campos');
  try{
    const result = await apiCall('/bookings', 'POST', { cupoId, asientosReservados });
    addResponse({ message: 'Reserva creada', response: result });
    document.getElementById('booking-cupo-id').value = '';
    document.getElementById('booking-asientos').value = '1';
  }catch(err){ addResponse({ error: err.message }); }
});

document.getElementById('btn-my-bookings').addEventListener('click', async ()=>{
  try{
    const result = await apiCall('/bookings/mine', 'GET');
    addResponse({ message: 'Mis reservas: '+result.length, response: result });
  }catch(err){ addResponse({ error: err.message }); }
});

document.getElementById('btn-all-bookings').addEventListener('click', async ()=>{
  try{
    const result = await apiCall('/bookings', 'GET');
    addResponse({ message: 'Todas las reservas: '+result.length, response: result });
  }catch(err){ addResponse({ error: err.message }); }
});

// Notifications handlers
document.getElementById('btn-my-notifications').addEventListener('click', async ()=>{
  try{
    const result = await apiCall('/notifications', 'GET');
    addResponse({ message: 'Mis notificaciones: '+result.length, response: result });
  }catch(err){ addResponse({ error: err.message }); }
});

document.getElementById('btn-pending-notifs').addEventListener('click', async ()=>{
  try{
    const result = await apiCall('/notifications/pending', 'GET');
    addResponse({ message: 'Notificaciones pendientes: '+result.length, response: result });
  }catch(err){ addResponse({ error: err.message }); }
});

document.getElementById('btn-unread-count').addEventListener('click', async ()=>{
  try{
    const result = await apiCall('/notifications/unread-count', 'GET');
    addResponse({ message: 'No leídas: '+result.count, response: result });
  }catch(err){ addResponse({ error: err.message }); }
});

// Users handlers
document.getElementById('btn-all-users').addEventListener('click', async ()=>{
  try{
    const result = await apiCall('/users', 'GET');
    addResponse({ message: 'Usuarios: '+result.length, response: result });
  }catch(err){ addResponse({ error: err.message }); }
});

// Restore session on load
window.addEventListener('load', ()=>{
  const token = localStorage.getItem('jc_jwt');
  const user = localStorage.getItem('jc_user');
  if(token){ document.getElementById('token-storage').value = token; }
  if(user){ try{ const u = JSON.parse(user); document.getElementById('user-info').classList.remove('hidden'); document.getElementById('user-name').textContent = u.name || u.email; document.getElementById('user-role').textContent = u.role || ''; }catch(e){} }
});
