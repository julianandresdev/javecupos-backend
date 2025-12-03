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
import { CupoEntity } from '../../cupos/entities/cupo.entity';

@Entity('favorites')
@Unique(['userId', 'cupoId']) // Evitar duplicados
export class FavoriteEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  cupoId: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @ManyToOne(() => CupoEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cupoId' })
  cupo: CupoEntity;
}
