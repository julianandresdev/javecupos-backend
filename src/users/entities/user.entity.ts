import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { UserRole, UserStatus } from '../interfaces/user.interface';

@Entity('users')
export class UserEntity {
  /**
   * Entidad que representa a un usuario en el sistema
   * Cada usuario tiene propiedades como nombre, correo, contraseña, teléfono, avatar, edad, rol y estado
   * Además, se registran las fechas de creación y actualización automáticamente
   */
  @PrimaryGeneratedColumn()
  id: number; // ID único del usuario

  @Column({ type: 'varchar', length: 100 })
  name: string; // Nombre del usuario

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string; // Correo electrónico del usuario

  @Column({ type: 'varchar', length: 255 })
  password: string; // Contraseña del usuario (debe ser almacenada de forma segura)

  @Column({ type: 'varchar' })
  phone: string; // Número de teléfono del usuario

  @Column({ type: 'boolean', default: false })
  online: boolean; // Indica si el usuario está en línea

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatar?: string; // URL del avatar del usuario (opcional)

  @Column({ type: 'int' })
  age: number; // Edad del usuario

  @Column({
    type: 'varchar',
    length: 50,
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole; // Rol del usuario (por ejemplo, 'admin', 'user', etc.)

  @Column({
    type: 'varchar',
    length: 50,
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus; // Estado actual del usuario

  @CreateDateColumn({ type: 'varchar', length: 100 })
  createdAt: Date; // Fecha de creación del usuario (se establece automáticamente)

  @UpdateDateColumn({ type: 'varchar', length: 100 })
  updatedAt: Date; // Fecha de la última actualización del usuario (se actualiza automáticamente)

  constructor(partial: Partial<UserEntity> = {}) {
    /**
     * Constructor que permite inicializar un usuario con propiedades parciales
     * Si no se proporcionan ciertos valores, se asignan valores por defecto
     * @param partial Objeto con propiedades parciales para inicializar el usuario
     */
    Object.assign(this, partial);

    this.online = this.online ?? false;
    this.role = this.role ?? UserRole.USER;
    this.status = this.status ?? UserStatus.PENDING;
    this.createdAt = this.createdAt ?? new Date();
    this.updatedAt = this.updatedAt ?? new Date();
  }

  updateTimestamp(): void {
    this.updatedAt = new Date();
    // Actualiza la fecha de la última actualización a la fecha y hora actual
  }

  actualDate(): Date {
    return new Date();
    // Retorna la fecha y hora actual
  }

  getDisplayName(): string {
    return this.name
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    // Capitaliza la primera letra de cada palabra en el nombre
  }

  activateUser(): void {
    this.status = UserStatus.ACTIVE;
    this.updateTimestamp();
    // Cambia el estado del usuario a 'activo' y actualiza la fecha de actualización
  }
  deactivateUser(): void {
    this.status = UserStatus.INACTIVE;
    this.updateTimestamp();
    // Cambia el estado del usuario a 'inactivo' y actualiza la fecha de actualización
  }
  suspendUser(): void {
    this.status = UserStatus.SUSPENDED;
    this.updateTimestamp();
    // Cambia el estado del usuario a 'suspendido' y actualiza la fecha de actualización
  }
  banUser(): void {
    this.status = UserStatus.BANNED;
    this.updateTimestamp();
    // Cambia el estado del usuario a 'baneado' y actualiza la fecha de actualización
  }

  userStatus(): string {
    return this.status;
    // Retorna el estado actual del usuario
  }
  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
    // Verifica si el usuario tiene rol de administrador
  }
  isDriver(): boolean {
    return this.role === UserRole.DRIVER;
    // Verifica si el usuario tiene rol de conductor
  }
  isUser(): boolean {
    return this.role === UserRole.USER;
    // Verifica si el usuario tiene rol de usuario estándar
  }
}