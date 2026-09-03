import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxEntity } from './outbox.entity';
import {
  OUTBOX_OPTIONS,
  OUTBOX_TRANSPORT,
  OutboxService,
} from './outbox.service';
import { IOutboxTransport, OutboxModuleOptions } from './outbox.types';
import { RabbitMqOutboxTransport } from './transports/rabbitmq-outbox.transport';
import { CommonRabbitMqModule } from '../rabbitmq/rabbitmq.module';

export interface OutboxFeatureOptions extends OutboxModuleOptions {
  transport?: Type<IOutboxTransport>;
}

@Module({})
export class OutboxModule {
  static forRoot(options: OutboxFeatureOptions = {}): DynamicModule {
    const { transport = RabbitMqOutboxTransport, ...restOptions } = options;

    const transportProvider: Provider = {
      provide: OUTBOX_TRANSPORT,
      useClass: transport,
    };

    return {
      module: OutboxModule,
      imports: [TypeOrmModule.forFeature([OutboxEntity]), CommonRabbitMqModule],
      providers: [
        {
          provide: OUTBOX_OPTIONS,
          useValue: restOptions,
        },
        transportProvider,
        OutboxService,
      ],
      exports: [OutboxService, TypeOrmModule],
    };
  }
}
