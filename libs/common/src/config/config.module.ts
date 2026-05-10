import { Module } from '@nestjs/common';
import { ConfigService } from './config.service';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  providers: [ConfigService],
  imports: [NestConfigModule.forRoot({
    isGlobal: true,
    validationSchema: Joi.object({
      MONGODB_HOST: Joi.string().required(),
      MONGODB_PORT: Joi.number().required(),
      MONGODB_DATABASE: Joi.string().required(),
    })
  })
  ],
  exports: [ConfigService]
})
export class ConfigModule { }
