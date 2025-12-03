import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { RatingsService } from '../services/ratings.service';
import { CreateRatingDto } from '../dto/create-rating.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RatingEntity } from '../entities/rating.entity';

@Controller('ratings')
@UseGuards(JwtAuthGuard)
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  async create(@Body() createRatingDto: CreateRatingDto, @Request() req) {
    return this.ratingsService.create(createRatingDto, req.user.id);
  }

  @Get('user/:userId')
  async getRatingsByUser(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<RatingEntity[]> {
    return this.ratingsService.getRatingsByUser(userId);
  }

  @Get('received')
  async getMyReceivedRatings(@Request() req): Promise<RatingEntity[]> {
    return this.ratingsService.getMyReceivedRatings(req.user.id);
  }

  @Get('booking/:bookingId')
  async getRatingByBooking(
    @Param('bookingId', ParseIntPipe) bookingId: number,
  ): Promise<RatingEntity[]> {
    return this.ratingsService.getRatingByBooking(bookingId);
  }
}
