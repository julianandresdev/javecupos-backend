import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../../users/entities/user.entity';
import { UserRole, UserStatus } from '../../users/interfaces/user.interface';
import { getBogotaDateString } from '../../common/utils/date-time.util';

@Injectable()
export class UserSeeder {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async run(): Promise<void> {
    console.log('🌱 Seeding users...');

    const hashedPassword = await bcrypt.hash('Test123!', 10);

    const users = [
      {
        name: 'Admin Test',
        email: 'admin@test.com',
        password: hashedPassword,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        phone: '+57 300 1234567',
        age: 21,
      },
      {
        name: 'Usuario Regular 1',
        email: 'user1@test.com',
        password: hashedPassword,
        role: UserRole.DRIVER,
        status: UserStatus.ACTIVE,
        phone: '+57 300 1111111',
        age: 24,
      },
      {
        name: 'Usuario Regular 2',
        email: 'user2@test.com',
        password: hashedPassword,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        phone: '+57 300 2222222',
        age: 17,
      },
      {
        name: 'Usuario Pendiente',
        email: 'pending@test.com',
        password: hashedPassword,
        role: UserRole.USER,
        status: UserStatus.PENDING,
        phone: '+57 300 3333333',
        age: 19,
      },
    ];

    for (const userData of users) {
      const existingUser = await this.userRepository.findOne({
        where: { email: userData.email },
      });

      if (!existingUser) {
        // Obtener la fecha actual formateada en zona horaria de Bogotá
        const nowString = getBogotaDateString();
        const user = this.userRepository.create({
          ...userData,
          // Guardar fechas como string formateado en zona horaria de Bogotá (compatible con varchar)
          createdAt: nowString as any,
          updatedAt: nowString as any,
        });
        await this.userRepository.save(user);
        console.log(`✅ Created user: ${user.email}`);
      } else {
        console.log(`⚠️  User already exists: ${userData.email}`);
      }
    }

    console.log('✅ User seeding completed');
  }
}
