import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { DatabaseModule, UserEntity } from '@app/common';

@Module({
  imports: [
    DatabaseModule.forRoot({ schema: 'auth' }),
    DatabaseModule.forFeature([UserEntity]),
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
