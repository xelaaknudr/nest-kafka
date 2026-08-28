import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Standalone UserEntity for TypeORM CLI (migrations, seeds).
 * Uses only relative imports — no @app/common path alias needed.
 * The NestJS app imports UserEntity from @app/common instead.
 */
@Entity({ schema: 'auth' })
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;
}
