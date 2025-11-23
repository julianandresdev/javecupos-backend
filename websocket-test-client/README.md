# JaveCupos — Test Client (Completo)

Cliente de pruebas interactivo y completo para la API de JaveCupos. Permite probar todos los endpoints, casos de prueba preconfigurados, y validar el funcionamiento completo del sistema.

## 🚀 Características

- ✅ **Autenticación Completa**: Login, registro, verificación de email, recuperación de contraseña, perfil
- 💾 **Persistencia**: JWT y datos de usuario en `localStorage` (se restauran al recargar)
- 🔄 **Refresh Token**: Renovación automática de JWT expirado
- 🚗 **Cupos Completo**: Crear, listar, buscar, actualizar, cancelar, eliminar
- 📅 **Reservas Completo**: Crear, listar, confirmar, rechazar, cancelar
- 👥 **Usuarios Completo**: Listar, buscar, crear, actualizar, eliminar
- 🔔 **Notificaciones Completo**: Ver, marcar como leídas, eliminar, crear manualmente
- ⚡ **WebSocket**: Escuchar notificaciones en tiempo real
- 🧪 **Test Cases**: Casos de prueba preconfigurados del plan de testing
- 🌐 **Tester Genérico**: Enviar peticiones HTTP personalizadas
- 🎨 **UI Mejorada**: Tabs organizados, códigos de estado HTTP, indicadores visuales

## 📁 Estructura

```
websocket-test-client/
├── index.html        # UI principal con tabs organizados
├── app.js            # Lógica completa (todos los endpoints)
├── styles.css        # Estilos mejorados
└── README.md         # Esta documentación
```

## 🎯 Cómo usar

### 1. Levanta el backend

```bash
cd javecupos-backend
npm run start:dev
# Opcional: npm run seed (para datos de prueba)
```

### 2. Abre el cliente

- Doble clic en `websocket-test-client/index.html` o
- Arrastra el archivo al navegador o
- Abre desde VS Code con "Live Server" extension

### 3. Configura la URL del backend

Por defecto: `http://localhost:3000`

Si tu API corre en otro puerto:
1. Cambia "Backend URL" en la cabecera
2. Haz clic en "Guardar"

## 📋 Guía de Uso por Tabs

### 🔐 Tab: Auth (Autenticación)

#### Login
1. Ingresa email y contraseña
2. Haz clic en "Iniciar sesión"
3. El JWT se guarda automáticamente
4. Se muestra tu información de usuario
5. WebSocket se conecta automáticamente

#### Registro
1. Completa todos los campos (nombre, email, contraseña, teléfono, edad, rol)
2. Haz clic en "Registrar"
3. Recibirás un mensaje de confirmación
4. **Importante**: Debes verificar tu email antes de poder iniciar sesión

#### Gestión de Cuenta
- **Verificar Email**: Ingresa el token recibido por email
- **Reenviar Verificación**: Reenvía el email de verificación
- **Recuperar Contraseña**: Solicita un token de recuperación
- **Restablecer Contraseña**: Cambia tu contraseña con el token
- **Obtener Perfil**: Ver tu información de usuario actual

### 🚗 Tab: Cupos

#### Crear Cupo
1. Selecciona destino (barrio)
2. Ingresa punto de encuentro
3. Opcional: descripción y teléfono de contacto
4. Ingresa asientos totales (1-8)
5. Selecciona fecha y hora de salida (debe ser futura)
6. Ingresa precio
7. Haz clic en "Crear Cupo"
8. **Requisito**: Debes estar autenticado como `conductor` o `administrador`

#### Listar Cupos
- **Listar Todos**: Muestra todos los cupos activos (público)
- **Mis Cupos**: Muestra solo tus cupos como conductor
- **Ver Detalles**: Ver información completa de un cupo por ID

#### Búsqueda Avanzada
Filtra cupos por:
- Destino (barrio)
- Fecha de salida
- Asientos mínimos
- Rango de precios (mínimo y máximo)
- Estado (Disponible, En curso, Completado, Cancelado)

#### Gestionar Cupo
- **Actualizar Cupo**: Modifica punto de encuentro, descripción, asientos disponibles, precio
  - Solo puedes actualizar tus propios cupos
- **Cancelar Cupo**: Cancela un cupo (solo el conductor dueño)
- **Eliminar Cupo**: Eliminación permanente (solo administradores)

### 📅 Tab: Reservas

#### Crear Reserva
1. Ingresa el ID del cupo
2. Ingresa cantidad de asientos a reservar
3. Haz clic en "Reservar"
4. **Validaciones**:
   - El cupo debe estar disponible y activo
   - Debe haber asientos suficientes
   - No puedes reservar tu propio cupo
   - No puedes tener múltiples reservas activas para el mismo cupo

#### Mis Reservas
- **Ver Mis Reservas**: Todas tus reservas como usuario
- **Todas (Admin/Driver)**: Ver todas las reservas activas (requiere permisos)
- **Reservas del Cupo**: Ver reservas de un cupo específico (solo el conductor del cupo)

#### Gestionar Reserva
- **Confirmar (Conductor)**: Confirma una reserva pendiente
  - Solo el conductor del cupo puede confirmar
  - Los asientos ya están restados (no se vuelven a restar)
- **Rechazar (Conductor)**: Rechaza una reserva pendiente
  - Solo el conductor del cupo puede rechazar
  - Los asientos se devuelven al cupo
- **Cancelar (Usuario)**: Cancela tu propia reserva
  - Solo puedes cancelar tus propias reservas
  - Los asientos se devuelven al cupo

### 👥 Tab: Usuarios

#### Listar Usuarios
- **Listar Todos**: Muestra todos los usuarios activos
- **Ver Usuario**: Ver detalles de un usuario por ID

#### Búsqueda
Filtra usuarios por:
- Nombre
- Email
- Rol (usuario, conductor, administrador)

#### Gestionar Usuario
- **Actualizar Usuario**: Modifica nombre, teléfono, edad
- **Eliminar Usuario**: Elimina un usuario permanentemente

#### Crear Usuario
Crea un nuevo usuario manualmente (útil para testing)

### 🔔 Tab: Notificaciones

#### Ver Notificaciones
- **Mi Bandeja**: Todas tus notificaciones
- **Pendientes**: Solo las no leídas
- **Conteo Sin Leer**: Número de notificaciones pendientes

#### Gestionar Notificación
- **Marcar como Leída**: Marca una notificación específica como leída
- **Marcar Todas Leídas**: Marca todas tus notificaciones como leídas
- **Eliminar**: Elimina una notificación

#### Crear Notificación
Crea una notificación manualmente (útil para testing)

### 🧪 Tab: Test Cases

Casos de prueba preconfigurados del plan de testing:

#### Flujos Completos
1. **Registro → Verificación → Login**: Flujo completo de registro
2. **Crear Cupo → Reservar → Confirmar**: Flujo completo de reserva
3. **Crear Reserva → Rechazar**: Flujo de rechazo
4. **Crear Cupo → Cancelar**: Flujo de cancelación

#### Casos de Error
- Email Duplicado
- Credenciales Inválidas
- Sin Autenticación
- Sin Permisos
- Fecha Pasada
- Asientos Insuficientes
- Reserva Duplicada
- Reservar Propio Cupo

#### Validaciones
- Permisos Actualizar Cupo
- Permisos Confirmar Reserva
- Estados de Reserva
- Cálculo de Asientos

**Nota**: Algunos tests son manuales y requieren interacción. Los resultados se muestran en el panel de resultados.

### 🌐 Tab: Generic API

Tester genérico para cualquier endpoint:

1. Selecciona método HTTP: GET, POST, PUT, PATCH, DELETE
2. Ingresa la ruta: `/auth/profile`, `/cupos/1`, etc.
3. Si es POST/PUT/PATCH, ingresa el body JSON
4. Haz clic en "Enviar"
5. Verás la respuesta con código de estado HTTP

**Ejemplo**:
- Método: `GET`
- Ruta: `/auth/profile`
- Body: (vacío)
- Resultado: Tu perfil JSON con código 200

### ⚡ Tab: WebSocket

#### Conectar
1. Haz clic en "Conectar WS"
2. Se conecta automáticamente al namespace `/notifications`
3. Requiere estar autenticado

#### Funciones
- **Pedir notificaciones**: Solicita todas tus notificaciones
- **Marcar todas leídas**: Marca todas como leídas vía WebSocket

#### Eventos Recibidos
- `new-notification`: Nueva notificación en tiempo real
- `notifications-list`: Lista completa de notificaciones
- `pending-notifications`: Solo notificaciones pendientes

## 📊 Códigos de Estado HTTP

El cliente muestra códigos de estado con colores:

- 🟢 **200-299 (Verde)**: Éxito
- 🟡 **300-399 (Amarillo)**: Redirección
- 🔴 **400+ (Rojo)**: Error

Los códigos comunes:
- `200`: OK
- `201`: Created
- `400`: Bad Request (validación fallida)
- `401`: Unauthorized (sin autenticación)
- `403`: Forbidden (sin permisos)
- `404`: Not Found (recurso no existe)
- `500`: Internal Server Error

## 🔐 Permisos y Roles

### Roles Disponibles
- `usuario`: Usuario regular (puede reservar)
- `conductor`: Conductor (puede crear cupos, confirmar/rechazar reservas)
- `administrador`: Administrador (acceso completo)

### Endpoints por Rol

**Públicos** (sin autenticación):
- `GET /cupos` - Listar cupos
- `GET /cupos/:id` - Ver cupo
- `POST /auth/register` - Registro
- `POST /auth/login` - Login

**Requieren Autenticación**:
- Todos los endpoints de `/bookings` (excepto algunos GET)
- `GET /cupos/my-cupos`
- `PUT /cupos/:id`
- Todos los endpoints de `/users`
- Todos los endpoints de `/notifications`

**Requieren Rol Específico**:
- `POST /cupos` - Requiere `conductor` o `administrador`
- `PUT /cupos/:id` - Requiere ser el dueño del cupo
- `PUT /bookings/:id/confirm` - Requiere ser conductor del cupo
- `PUT /bookings/:id/reject` - Requiere ser conductor del cupo
- `DELETE /cupos/:id` - Requiere `administrador`

## 🧪 Casos de Prueba Preconfigurados

### Flujos Completos

#### 1. Registro → Verificación → Login
1. Registra un nuevo usuario
2. Verifica el email con el token recibido
3. Inicia sesión con las credenciales

#### 2. Crear Cupo → Reservar → Confirmar
1. Como conductor, crea un cupo
2. Como usuario diferente, crea una reserva
3. Como conductor, confirma la reserva
4. Verifica que los asientos se restaron correctamente

#### 3. Crear Reserva → Rechazar
1. Crea una reserva
2. Como conductor, rechaza la reserva
3. Verifica que los asientos se devolvieron

### Casos de Error

Todos los casos de error validan que el sistema rechaza correctamente operaciones inválidas.

## 💾 Persistencia & Seguridad

- **JWT**: Se guarda en `localStorage['jc_jwt']`
- **Refresh Token**: Se guarda en `localStorage['jc_refresh_token']`
- **Usuario**: Se guarda en `localStorage['jc_user']`
- **Expiración**: Se verifica automáticamente; si expira, intenta renovar

**⚠️ Nota**: `localStorage` no es seguro para tokens en producción. Solo usar en desarrollo/testing.

## 🔧 Troubleshooting

### "No se conecta a WebSocket"
- Verifica que el backend corre en el puerto correcto
- WebSocket usa namespace `/notifications`
- Asegúrate de haber iniciado sesión
- Verifica CORS en el backend

### "Error 401 Unauthorized"
- El JWT expiró o no es válido
- Haz logout y vuelve a loguear
- Verifica que el token se guardó correctamente

### "Error 403 Forbidden"
- No tienes los permisos necesarios
- Verifica tu rol de usuario
- Algunos endpoints requieren ser el dueño del recurso

### "CORS error"
- Verifica que el backend tiene CORS habilitado para tu origen
- Ajusta `FRONTEND_URL` en `.env` del backend
- Verifica los orígenes permitidos en `main.ts`

### "Error al crear cupo/reserva"
- Verifica que todos los campos requeridos están completos
- Verifica que la fecha es futura
- Verifica que tienes los permisos necesarios
- Revisa la respuesta del servidor para más detalles

## 📚 Endpoints Disponibles

### Autenticación
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/auth/register` | Registrar usuario | No |
| POST | `/auth/login` | Iniciar sesión | No |
| GET | `/auth/profile` | Perfil del usuario | Sí |
| POST | `/auth/logout` | Cerrar sesión | Sí |
| GET | `/auth/verify-email?token=...` | Verificar email | No |
| POST | `/auth/resend-verification` | Reenviar verificación | No |
| POST | `/auth/forgot-password` | Solicitar recuperación | No |
| POST | `/auth/reset-password` | Restablecer contraseña | No |

### Cupos
| Método | Ruta | Descripción | Auth | Rol |
|--------|------|-------------|------|-----|
| POST | `/cupos` | Crear cupo | Sí | Driver/Admin |
| GET | `/cupos` | Listar cupos | No | - |
| GET | `/cupos/my-cupos` | Mis cupos | Sí | - |
| GET | `/cupos/:id` | Ver cupo | No | - |
| PUT | `/cupos/:id` | Actualizar cupo | Sí | Owner |
| PUT | `/cupos/:id/cancel` | Cancelar cupo | Sí | Owner |
| DELETE | `/cupos/:id` | Eliminar cupo | Sí | Admin |

### Reservas
| Método | Ruta | Descripción | Auth | Rol |
|--------|------|-------------|------|-----|
| POST | `/bookings` | Crear reserva | Sí | - |
| GET | `/bookings/mine` | Mis reservas | Sí | - |
| GET | `/bookings` | Todas las reservas | Sí | Admin/Driver |
| GET | `/bookings?cupoId=:id` | Reservas del cupo | Sí | Owner |
| PUT | `/bookings/:id/confirm` | Confirmar reserva | Sí | Driver (Owner) |
| PUT | `/bookings/:id/reject` | Rechazar reserva | Sí | Driver (Owner) |
| PUT | `/bookings/:id/cancel` | Cancelar reserva | Sí | User (Owner) |

### Usuarios
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/users` | Listar usuarios | Sí |
| GET | `/users/search` | Buscar usuarios | Sí |
| GET | `/users/:id` | Ver usuario | Sí |
| POST | `/users` | Crear usuario | Sí |
| PUT | `/users/:id` | Actualizar usuario | Sí |
| DELETE | `/users/:id` | Eliminar usuario | Sí |

### Notificaciones
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/notifications` | Todas las notificaciones | Sí |
| GET | `/notifications/pending` | Pendientes | Sí |
| GET | `/notifications/unread-count` | Conteo sin leer | Sí |
| PATCH | `/notifications/:id/read` | Marcar como leída | Sí |
| PATCH | `/notifications/mark-all-read` | Marcar todas leídas | Sí |
| DELETE | `/notifications/:id` | Eliminar notificación | Sí |
| POST | `/notifications` | Crear notificación | Sí |

## ⚡ WebSocket Events

### Escucha
- `new-notification` → Nueva notificación en tiempo real
- `notifications-list` → Lista completa de notificaciones
- `pending-notifications` → Solo notificaciones pendientes
- `connect` → Conexión establecida
- `disconnect` → Desconexión
- `connect_error` → Error de conexión

### Emite
- `get-notifications` → Pedir lista completa
- `mark-all-read` → Marcar todas como leídas

## 🎨 Mejoras Implementadas

### UI/UX
- ✅ Tabs organizados por funcionalidad
- ✅ Códigos de estado HTTP con colores
- ✅ Indicadores visuales de éxito/error
- ✅ Formularios organizados y claros
- ✅ Responsive design

### Funcionalidades
- ✅ Todos los endpoints implementados
- ✅ Casos de prueba preconfigurados
- ✅ Validaciones en tiempo real
- ✅ Manejo de errores mejorado
- ✅ Persistencia de sesión
- ✅ WebSocket automático

### Testing
- ✅ Test cases del plan de testing
- ✅ Flujos completos de negocio
- ✅ Casos de error
- ✅ Validaciones de permisos

## 📝 Notas de Desarrollo

Si quieres agregar más funcionalidades:

1. **Nuevo Endpoint**: Agrega el handler en la sección correspondiente de `app.js`
2. **Nuevo Test Case**: Agrega el caso en `initTestCasesHandlers()` y crea la función de test
3. **Nueva UI**: Agrega el HTML en el tab correspondiente y el handler en `app.js`

## 📄 Licencia

Parte del proyecto JaveCupos.
