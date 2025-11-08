import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { UserSeeder } from './user.seeder';

async function runSeed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const userSeeder = app.get(UserSeeder);

  console.log('🌱 Running database seeders...');

  try {
    await userSeeder.run();
    console.log('✅ Seeding completed successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }

  await app.close();
  process.exit(0);
}

runSeed();