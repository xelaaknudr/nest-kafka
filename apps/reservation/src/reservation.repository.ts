import { Injectable, Logger } from '@nestjs/common';
import { AbstractRepository } from '@app/common';
import { ReservationEntity } from './models/reservation.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

@Injectable()
export class ReservationRepository extends AbstractRepository<ReservationEntity> {
  protected readonly logger = new Logger(ReservationRepository.name);

  constructor(
    @InjectRepository(ReservationEntity)
    reservationRepository: Repository<ReservationEntity>,
    entityManager: EntityManager,
  ) {
    super(reservationRepository, entityManager);
  }
}
