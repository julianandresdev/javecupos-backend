import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { BookingEntity } from '../../bookings/entities/booking.entity';

@Entity('ratings')
@Unique(['bookingId', 'calificadorId']) // Un usuario solo puede calificar una vez por reserva
export class RatingEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  bookingId: number;

  @Column()
  calificadorId: number; // Quién califica

  @Column()
  calificadoId: number; // A quién califican

  @Column()
  puntuacion: number; // 1-5

  @Column({ nullable: true })
  comentario: string;

  // Criterios específicos (opcionales)
  @Column({ nullable: true })
  puntualidad: number;

  @Column({ nullable: true })
  conduccion: number;

  @Column({ nullable: true })
  vehiculo: number;

  @Column({ nullable: true })
  trato: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => BookingEntity)
  @JoinColumn({ name: 'bookingId' })
  booking: BookingEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'calificadorId' })
  calificador: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'calificadoId' })
  calificado: UserEntity;
}
