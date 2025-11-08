import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { UserSeeder } from './user.seeder';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [UserSeeder],
  exports: [UserSeeder],
})
export class SeedModule {}
