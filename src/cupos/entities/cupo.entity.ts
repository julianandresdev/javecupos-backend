import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { CupoStatus } from '../enum/cupo-status.enum';
import { CupoBarrios } from '../enum/cupo-barrios.enum';

@Entity('cupos')
export class CupoEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  conductorId: number;

  @ManyToOne(() => UserEntity, { eager: false })
  conductor: UserEntity;

  @Column({ type: 'varchar', enum: CupoBarrios })
  destino: CupoBarrios;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ name: 'asientos_totales' })
  asientosTotales: number;

  @Column({ name: 'asientos_disponibles' })
  asientosDisponibles: number;

  @Column({ name: 'hora_salida', type: 'varchar' })
  horaSalida: Date;

  @Column({ name: 'hora_llegada_estimada', type: 'varchar', nullable: true })
  horaLlegadaEstimada?: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio: number;

  @Column({
    type: 'varchar',
    enum: CupoStatus,
    default: CupoStatus.DISPONIBLE,
  })
  estado: CupoStatus;

  @Column({ default: true })
  activo: boolean;

  @Column({ name: 'punto_encuentro', length: 300 })
  puntoEncuentro: string;

  @Column({ name: 'telefono_contacto', length: 15, nullable: true })
  telefonoContacto?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
