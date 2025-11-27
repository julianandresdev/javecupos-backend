export enum UserRole {
  /**
   * Roles disponibles para un usuario en el sistema.
   * - ADMIN: Usuario con privilegios administrativos.
   * - DRIVER: Usuario con rol de conductor.
   * - USER: Usuario estándar.
   */
  ADMIN = 'administrador',
  DRIVER = 'conductor',
  USER = 'usuario',
}

export enum UserStatus {
  /**
   * Estado de un usuario en el sistema.
   * - ACTIVE: El usuario está activo.
   * - INACTIVE: El usuario está inactivo.
   * - PENDING: El usuario tiene una acción pendiente (por ejemplo, verificación de correo).
   * - SUSPENDED: El usuario está suspendido temporalmente.
   * - BANNED: El usuario está baneado permanentemente.
   * - DELETED: El usuario ha sido eliminado.
   */

  ACTIVE = 'activo',
  INACTIVE = 'inactivo',
  PENDING = 'pendiente',
  SUSPENDED = 'suspendido',
  BANNED = 'baneado',
  DELETED = 'eliminado',
}

export interface User {
  /**
   * Interfaz que define la estructura de un usuario en el sistema.
   * La estructura se compone de los siguientes campos:
   * - id: Identificador único del usuario (número).
   * - name: Nombre completo del usuario (cadena de texto).
   * - email: Dirección de correo electrónico del usuario (cadena de texto).
   * - password: Contraseña del usuario (cadena de texto).
   * - phone: Número de teléfono del usuario (número).
   * - online: Indica si el usuario está en línea (booleano).
   * - avatar: URL del avatar del usuario (cadena de texto, opcional).
   * - age: Edad del usuario (número).
   * - role: Rol del usuario en el sistema (UserRole).
   * - status: Estado actual del usuario (UserStatus).
   * - rate: Calificacion del usuario (0-5)
   * - createdAt: Fecha y hora de creación del usuario (Date).
   * - updatedAt: Fecha y hora de la última actualización del usuario (Date).
   */
  id: number;
  name: string;
  email: string;
  password: string;
  phone: number;
  online: boolean;
  avatar?: string;
  age: number;
  role: UserRole;
  status: UserStatus;
  rate: number;
  createdAt: Date;
  updatedAt: Date;
}
