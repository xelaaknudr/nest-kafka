import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { DatabaseModule, UserEntity } from '@app/common';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    DatabaseModule.forRoot({ schema: 'auth' }),
    DatabaseModule.forFeature([UserEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
