import { Module } from '@nestjs/common';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';
import { DatabaseModule, ConfigModule } from '@app/common';
import { ReservationRepository } from './reservation.repository';
import { ReservationDocument, ReservationSchema } from './models/reservation.schema';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule.register('MONGODB'),
    DatabaseModule.forFeature([{ name: ReservationDocument.name, schema: ReservationSchema }])
  ],
  controllers: [ReservationController],
  providers: [ReservationService, ReservationRepository],
})
export class ReservationModule { }
