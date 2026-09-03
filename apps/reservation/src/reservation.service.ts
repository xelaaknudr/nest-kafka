import { Injectable, Logger } from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationRepository } from './reservation.repository';
import {
  UserEntity,
  RMQ_EXCHANGES,
  RMQ_ROUTING_KEYS,
  OutboxService,
} from '@app/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ReservationEntity } from './models/reservation.entity';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly amqpConnection: AmqpConnection,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * 🎓 СОЗДАНИЕ БРОНИ ЧЕРЕЗ TRANSACTIONAL OUTBOX (Чистая передача простых объектов)
   *
   * 📌 КАК ЭТО РАБОТАЕТ:
   * 1. Создаем простой объект сущности `ReservationEntity`.
   * 2. Создаем простой объект события с данными платежа.
   * 3. Передаем эти два простых объекта в метод `this.outboxService.create(reservation, eventData)`.
   * Никаких функций и колбэков в аргументах!
   */
  async createReservationWithOutbox(
    createReservationDto: Partial<CreateReservationDto>,
    user: { email: string; id: number },
  ) {
    this.logger.log(
      `[OUTBOX PATTERN] Атомарное создание брони и Outbox-события для пользователя ${user.id}`,
    );

    // 1. Простой объект бронирования
    const reservation = new ReservationEntity({
      startDate: createReservationDto.startDate || new Date(),
      endDate: createReservationDto.endDate || new Date(Date.now() + 86400000),
      timestamp: new Date(),
      userId: user.id,
      invoiceId: 'PENDING-OUTBOX-PAYMENT',
    });

    // 2. Простой объект события (обычный JSON)
    const eventData = {
      topic: RMQ_EXCHANGES.DEFAULT,
      key: RMQ_ROUTING_KEYS.PAYMENTS.CREATE_CHARGE,
      aggregateType: 'RESERVATION',
      payload: {
        amount: createReservationDto.charge?.amount || 500,
        email: user.email,
      },
    };

    // 3. Передаем два простых объекта в сервис:
    return this.outboxService.create(reservation, eventData);
  }

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
