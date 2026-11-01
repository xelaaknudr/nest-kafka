import { Module } from '@nestjs/common';
import { PgLearnController } from './pg-learn.controller';

@Module({
  controllers: [PgLearnController],
})
export class PgLearnModule {}
