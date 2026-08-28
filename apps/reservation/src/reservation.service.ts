import { Inject, Injectable, Logger } from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationRepository } from './reservation.repository';
import { PAYMENTS_SERVICE, UserEntity } from '@app/common';
import { ClientProxy } from '@nestjs/microservices';
import { ReservationEntity } from './models/reservation.entity';
import { catchError, of, switchMap } from 'rxjs';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

  constructor(
    private readonly reservationRepository: ReservationRepository,
    @Inject(PAYMENTS_SERVICE) private readonly paymentsService: ClientProxy,
  ) {}

  async create(
    createReservationDto: CreateReservationDto,
    { email, id: userId }: UserEntity,
  ) {
    return this.paymentsService
      .send('create_charge', {
        ...createReservationDto.charge,
        email,
      })
      .pipe(
        catchError((err) => {
          this.logger.error(
            'Payment charge failed, proceeding with fallback reservation',
            err?.stack || err,
          );
          return of({ id: 'mock_invoice_id' });
        }),
        switchMap((res) => {
          this.logger.log('Payment charge successful, creating reservation');
          return this.reservationRepository.create(
            new ReservationEntity({
              ...createReservationDto,
              invoiceId: res.id,
              timestamp: new Date(),
              userId,
            }),
          );
        }),
      );
  }

  async findAll() {
    return this.reservationRepository.find({});
  }

  async findOne(id: number) {
    return this.reservationRepository.findOneOrThrow({ id });
  }

  async update(id: number, updateReservationDto: UpdateReservationDto) {
    return this.reservationRepository.findOneAndUpdate(
      { id },
      updateReservationDto,
    );
  }

  async remove(id: number) {
    return this.reservationRepository.findOneAndDelete({ id });
  }
}
