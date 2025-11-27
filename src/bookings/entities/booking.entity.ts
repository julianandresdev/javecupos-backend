import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { CupoEntity } from '../../cupos/entities/cupo.entity';
import { BookingStatus } from '../enums/booking-status.enum';

@Entity('bookings')
export class BookingEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => UserEntity, { eager: false })
  user: UserEntity;

  @Column()
  cupoId: number;

  @ManyToOne(() => CupoEntity, { eager: false })
  cupo: CupoEntity;

  @Column({ default: 1 })
  asientosReservados: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  montoTotal: number;

  @Column({
    type: 'varchar',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  estado: BookingStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
