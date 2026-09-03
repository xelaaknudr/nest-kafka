import { Injectable, Logger } from '@nestjs/common';
import { AbstractRepository } from '@app/common';
import { PaymentEntity } from './models/payment.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

@Injectable()
export class PaymentsRepository extends AbstractRepository<PaymentEntity> {
  protected readonly logger = new Logger(PaymentsRepository.name);

  constructor(
    @InjectRepository(PaymentEntity)
    paymentsRepository: Repository<PaymentEntity>,
    entityManager: EntityManager,
  ) {
    super(paymentsRepository, entityManager);
  }
}
