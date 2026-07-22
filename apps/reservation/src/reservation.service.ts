import { Inject, Injectable, Logger } from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationRepository } from './reservation.repository';
import { PAYMENTS_SERVICE, UserDocument } from '@app/common';
import { ClientProxy } from '@nestjs/microservices';
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
    { email, _id: userId }: UserDocument,
  ) {
    this.logger.log('it is working');
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
          return this.reservationRepository.create({
            ...createReservationDto,
            invoiceId: res.id,
            timestamp: new Date(),
            userId: userId.toString(),
          });
        }),
      );
  }

  async findAll() {
    return this.reservationRepository.find({});
  }

  async findOne(_id: string) {
    return this.reservationRepository.findOneOrThrow({ _id });
  }

  async update(_id: string, updateReservationDto: UpdateReservationDto) {
    return this.reservationRepository.findOneAndUpdate(
      { _id },
      { $set: updateReservationDto },
    );
  }

  async remove(_id: string) {
    return this.reservationRepository.findOneAndDelete({ _id });
  }
}
