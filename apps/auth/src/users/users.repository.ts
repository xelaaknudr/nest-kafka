import { Injectable, Logger } from '@nestjs/common';
import { AbstractRepository, UserEntity } from '@app/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

@Injectable()
export class UsersRepository extends AbstractRepository<UserEntity> {
  protected readonly logger = new Logger(UsersRepository.name);

  constructor(
    @InjectRepository(UserEntity) usersRepository: Repository<UserEntity>,
    entityManager: EntityManager,
  ) {
    super(usersRepository, entityManager);
  }
}
