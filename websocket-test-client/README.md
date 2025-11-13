# JaveCupos — Test Client (Modular)

Cliente de pruebas interactivo para la API de JaveCupos. Permite probar todos los endpoints sin escribir código.

## Características

- ✅ **Autenticación**: Login, registro, verificación de email, recuperación de contraseña
- 💾 **Persistencia**: JWT y datos de usuario en `localStorage` (se restauran al recargar)
- 🔄 **Refresh Token**: Renovación automática de JWT expirado
- 🚗 **Cupos**: Crear, listar, filtrar viajes
- 📅 **Reservas**: Crear y gestionar reservas de asientos
- 🔔 **Notificaciones**: Escuchar en tiempo real vía WebSocket, marcar como leídas
- 👥 **Usuarios**: Listar y buscar usuarios
- 🧪 **Tester genérico**: Enviar peticiones HTTP personalizadas (GET, POST, PUT, PATCH, DELETE)

## Estructura

```
websocket-test-client/
├── index.html        # UI (formularios, paneles)
├── app.js            # Lógica (eventos, API calls, WebSocket)
├── styles.css        # Estilos
└── README.md         # Este archivo
```

## Cómo usar

### 1. Levanta el backend

```powershell
cd c:\Users\julih\Documents\Projects\javecupos-backend
npm run start:dev
# Opcional: npm run seed (para datos de prueba)
```

### 2. Abre el cliente

- Doble clic en `websocket-test-client/index.html` o
- Arrastra el archivo al navegador o
- Abre desde VS Code con "Live Server" extension

### 3. Configura la URL del backend (si es necesario)

Por defecto: `http://localhost:3000`

Si tu API corre en otro puerto:
1. Cambia "Backend URL" en la cabecera
2. Haz clic en "Guardar"

### 4. Registrate y loguéate

#### Panel de Autenticación

**Registro**:
- Ingresa nombre, email, contraseña
- Haz clic en "Registrar"
- Respuesta: `{ message: "Usuario registrado..." }`

**Login**:
- Ingresa email y contraseña
- El JWT se guarda automáticamente en `localStorage`
- El usuario y rol se muestran en la sesión

**Gestión de Cuenta**:
- Verificar email (si tienes el token del email)
- Reenviar verificación
- Recuperar contraseña (envía token por email)
- Restablecer contraseña (con token + nueva contraseña)

### 5. Prueba endpoints por rol

#### Como Conductor (role: `conductor`)

**Crear Cupo**:
- Rellena: destino, punto de encuentro, asientos, hora, precio
- Haz clic en "Crear"
- Se envía: `POST /cupos` con JSON

**Listar Mis Cupos**:
- Haz clic en "🚗 Mis Cupos"
- Muestra cupos creados por ti

#### Como Usuario Común (role: `usuario`)

**Buscar Cupos**:
- Haz clic en "📋 Listar Cupos"
- Muestra cupos disponibles

**Crear Reserva**:
- Rellena: ID del cupo, cantidad de asientos
- Haz clic en "Reservar"
- Se envía: `POST /bookings`

**Ver Mis Reservas**:
- Haz clic en "📋 Mis Reservas"
- Muestra reservas confirmadas

#### Notificaciones (Todos)

**Ver Notificaciones**:
- "Mi Bandeja" → todas tus notificaciones
- "Pendientes" → solo las no leídas
- "Sin Leer" → conteo

**WebSocket en tiempo real**:
1. Haz clic en "Conectar WS"
2. Recibirás notificaciones en tiempo real
3. Puedes "Pedir notificaciones" o "Marcar todas leídas"

### 6. Tester genérico

Para probar cualquier endpoint:

1. Elige método: GET, POST, PUT, PATCH, DELETE
2. Ingresa ruta: `/auth/profile`, `/cupos/1`, etc.
3. Si es POST/PUT/PATCH, rellena el body JSON
4. Haz clic en "Enviar"

**Ejemplo**:
- Método: `GET`
- Ruta: `/auth/profile`
- Body: (vacío)
- Resultado: Tu perfil JSON

## Payloads de ejemplo

### Crear Cupo

```json
{
  "destino": "Centro Comercial",
  "puntoEncuentro": "Terminal Transporte",
  "asientosTotales": 4,
  "asientosDisponibles": 4,
  "horaSalida": "2025-11-15T10:30:00.000Z",
  "precio": 5000
}
```

### Crear Reserva

```json
{
  "cupoId": 1,
  "asientosReservados": 2
}
```

### Registrar Usuario

```json
{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "password": "SecurePass123"
}
```

## Persistencia & Seguridad

- **JWT**: Se guarda en `localStorage['jc_jwt']`
- **Refresh Token**: Se guarda en `localStorage['jc_refresh_token']` (si el servidor lo devuelve)
- **Usuario**: Se guarda en `localStorage['jc_user']` (decodificado del JWT)
- **Expiración**: Se verifica automáticamente; si expira, intenta renovar

**⚠️ Nota**: `localStorage` no es seguro para tokens en producción. Solo usar en desarrollo/testing.

## Troubleshooting

### "No se conecta a WebSocket"
- Verifica que el backend corre en el puerto correcto
- WebSocket usa namespace `/notifications`
- Asegúrate de haber iniciado sesión

### "Error 401 Unauthorized"
- El JWT expiró o no es válido
- Haz logout y vuelve a loguear

### "CORS error"
- Verifica que el backend tiene CORS habilitado para `http://localhost:...`
- Ajusta `FRONTEND_URL` en `.env` del backend

## Endpoints disponibles (resumen)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/register` | Registrar usuario |
| POST | `/auth/login` | Iniciar sesión |
| GET | `/auth/profile` | Perfil del usuario |
| POST | `/auth/logout` | Cerrar sesión |
| GET | `/auth/verify-email?token=...` | Verificar email |
| POST | `/auth/resend-verification` | Reenviar verificación |
| POST | `/auth/forgot-password` | Solicitar recuperación |
| POST | `/auth/reset-password` | Restablecer contraseña |
| POST | `/cupos` | Crear cupo |
| GET | `/cupos` | Listar cupos |
| GET | `/cupos/my-cupos` | Mis cupos |
| GET | `/cupos/:id` | Detalles cupo |
| POST | `/bookings` | Crear reserva |
| GET | `/bookings/mine` | Mis reservas |
| GET | `/bookings` | Todas (admin/driver) |
| GET | `/notifications` | Todas las notificaciones |
| GET | `/notifications/pending` | No leídas |
| GET | `/users` | Listar usuarios |

## WebSocket Events

**Escucha**:
- `new-notification` → Nueva notificación en tiempo real
- `notifications-list` → Lista de notificaciones
- `pending-notifications` → Notificaciones no leídas

**Emite**:
- `get-notifications` → Pedir lista completa
- `mark-all-read` → Marcar todas como leídas
- `mark-as-read` → Marcar una como leída

## Archivos del cliente

**index.html**:
- UI con secciones por funcionalidad
- Formularios para cada operación
- Respuesta JSON en tiempo real

**app.js**:
- Manejadores de eventos
- Llamadas a API (`apiCall`)
- Lógica de WebSocket
- Persistencia en localStorage
- Renovación automática de tokens

**styles.css**:
- Diseño responsive (mobile-first)
- Grid layout para paneles
- Tema morado/azul

## Desarrollo

Si quieres agregar más endpoints:

1. En `index.html`: Agrega un botón o formulario en la sección correspondiente
2. En `app.js`: Agrega un event listener que llame a `apiCall(...)`
3. Actualiza este README

Ejemplo:

```javascript
document.getElementById('btn-delete-user').addEventListener('click', async ()=>{
  const userId = document.getElementById('user-id-input').value;
  try{
    const result = await apiCall(`/users/${userId}`, 'DELETE');
    addResponse({ message: 'Usuario eliminado', response: result });
  }catch(err){ addResponse({ error: err.message }); }
});
```

## Licencia

Parte del proyecto JaveCupos.
