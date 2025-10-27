import { Module } from '@nestjs/common';
import { BookingsService } from './service/bookings.service';
import { BookingsController } from './controllers/bookings.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingEntity } from './entities/booking.entity';
import { CuposModule } from 'src/cupos/cupos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BookingEntity]),
    CuposModule
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
