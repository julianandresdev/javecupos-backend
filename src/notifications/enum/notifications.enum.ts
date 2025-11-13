export enum NotificationsType {
  // Eventos de Reservas/Bookings
  BOOKING_CREATED = 'Reserva creada',
  BOOKING_CONFIRMED = 'Reserva confirmada',
  BOOKING_CANCELLED = 'Reserva cancelada',
  BOOKING_MODIFIED = 'Reserva modificada',
  BOOKING_REMINDER = 'Recordatorio de reserva',

  // Eventos de Cupos/Vehículos
  CUPO_CREATED = 'Cupo creado',
  CUPO_MODIFIED = 'Cupo modificado',
  CUPO_UNAVAILABLE = 'Cupo no disponible',
  CUPO_AVAILABLE = 'Cupo disponible',
  CUPO_CANCELLED = 'Cupo cancelado',

  // Eventos de Usuario
  USER_PROFILE_UPDATED = 'Perfil de usuario actualizado',
  ROLE_CHANGED = 'Rol de usuario cambiado',
  ACCOUNT_VERIFIED = 'Cuenta verificada',

  // Eventos de Autenticación
  PASSWORD_CHANGED = 'Contraseña cambiada',
  LOGIN_FAILED = 'Inicio de sesión fallido',
  LOGIN_SUCCESS = 'Inicio de sesion aprobado',

  // Eventos del Sistema
  SYSTEM_MAINTENANCE = 'Mantenimiento del sistema',
  SYSTEM_UPDATE = 'Actualización del sistema',

  // Eventos Administrativos
  ADMIN_MESSAGE = 'Mensaje administrativo',
  POLICY_UPDATE = 'Actualización de políticas',
}

export enum NotificationStatus {
  PENDING = 'Pendiente',
  SENT = 'Enviada',
  DELIVERED = 'Entregada',
  READ = 'Leida',
  ARCHIVED = 'Archivada',
  DELETED = 'Eliminada',
  FAILED = 'Error',
}
