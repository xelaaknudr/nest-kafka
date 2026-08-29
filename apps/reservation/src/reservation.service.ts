import { Inject, Injectable, Logger } from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationRepository } from './reservation.repository';
import { PAYMENTS_SERVICE, UserEntity } from '@app/common';
import { ClientProxy } from '@nestjs/microservices';
import { ReservationEntity } from './models/reservation.entity';
import { map } from 'rxjs';

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
    this.logger.log(
      `Initiating reservation creation for user ${userId} (${email})`,
    );

    return this.paymentsService
      .send('create_charge', {
        ...createReservationDto.charge,
        email,
      })
      .pipe(
        map((res) => {
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
    this.logger.log('Retrieving all reservations');
    return this.reservationRepository.find({});
  }

  async findOne(id: number) {
    this.logger.log(`Retrieving reservation with id: ${id}`);
    return this.reservationRepository.findOneOrThrow({ id });
  }

  async update(id: number, updateReservationDto: UpdateReservationDto) {
    this.logger.log(`Updating reservation with id: ${id}`);
    return this.reservationRepository.findOneAndUpdate(
      { id },
      updateReservationDto,
    );
  }

  async remove(id: number) {
    this.logger.log(`Removing reservation with id: ${id}`);
    return this.reservationRepository.findOneAndDelete({ id });
  }
}
