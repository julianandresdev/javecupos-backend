import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Put,
} from '@nestjs/common';
import { BookingsService } from '../service/bookings.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/interfaces/user.interface';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  async create(@Body() createBookingDto: CreateBookingDto, @Request() req) {
    return this.bookingsService.create(createBookingDto, req.user.id);
  }

  @Get('mine')
  async myBookings(@Request() req) {
    return this.bookingsService.myBookings(req.user.id);
  }

  @Put(':id/cancel')
  async cancel(@Param('id') id: string, @Request() req) {
    return this.bookingsService.cancel(+id, req.user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  async findAll() {
    return this.bookingsService.findAll();
  }

  @Put(':id/confirm')
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  async confirm(@Param('id') id: string) {
    return this.bookingsService.confirm(+id);
  }

  @Put(':id/reject')
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  async reject(@Param('id') id: string) {
    return this.bookingsService.reject(+id);
  }
}
