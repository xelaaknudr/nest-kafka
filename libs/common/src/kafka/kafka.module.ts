import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaService } from './kafka.service';

@Module({
  providers: [KafkaService],
  exports: [KafkaService],
})
export class KafkaModule {
  static register(name: string): DynamicModule {
    return {
      module: KafkaModule,
      imports: [
        ClientsModule.registerAsync([
          {
            name: 'KAFKA_CLIENT',
            useFactory: (configService: ConfigService) => ({
              transport: Transport.KAFKA,
              options: {
                client: {
                  clientId: name.toLowerCase(),
                  brokers: [configService.get<string>('KAFKA_BROKERS')],
                },
                consumer: {
                  groupId: `${name.toLowerCase()}-group`,
                },
              },
            }),
            inject: [ConfigService],
          },
        ]),
      ],
      providers: [KafkaService],
      exports: [KafkaService],
    };
  }
}
