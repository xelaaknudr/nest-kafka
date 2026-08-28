import { Column, Entity } from 'typeorm';
import { AbstractEntity } from '../database/abstract.entity';

@Entity({ schema: 'auth' })
export class UserEntity extends AbstractEntity<UserEntity> {
  @Column({ unique: true })
  email: string;

  @Column()
  password: string;
}
