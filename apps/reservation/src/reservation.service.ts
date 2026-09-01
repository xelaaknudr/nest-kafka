import { Injectable, Logger } from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationRepository } from './reservation.repository';
import { UserEntity, RMQ_EXCHANGES, RMQ_ROUTING_KEYS } from '@app/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ReservationEntity } from './models/reservation.entity';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly amqpConnection: AmqpConnection,
  ) {}


  async create(
    createReservationDto: CreateReservationDto,
    { email, id: userId }: UserEntity,
  ) {
    this.logger.log(
      `Initiating reservation creation for user ${userId} (${email})`,
    );

    const res = await this.amqpConnection.request<any>({
      exchange: RMQ_EXCHANGES.DEFAULT,
      routingKey: RMQ_ROUTING_KEYS.PAYMENTS.CREATE_CHARGE,
      payload: {
        ...createReservationDto.charge,
        email,
      },
    });

    return this.reservationRepository.create(
      new ReservationEntity({
        ...createReservationDto,
        invoiceId: res.id || 'stub-id',
        timestamp: new Date(),
        userId,
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
