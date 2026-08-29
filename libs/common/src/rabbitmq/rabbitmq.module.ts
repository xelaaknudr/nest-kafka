import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMQModule, RabbitMQConfig } from '@golevelup/nestjs-rabbitmq';
import { RmqLogger } from './rmq-logger.service';
import { RMQ_EXCHANGES } from './rmq.constants';

@Global()
@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): RabbitMQConfig => {
        const uri =
          configService.get<string>('RABBITMQ_URI') ||
          'amqp://rabbitmq:rabbitmq@localhost:5672';

        return {
          uri,
          connectionInitOptions: { wait: false, timeout: 50000 },
          logger: new RmqLogger(),
          prefetchCount: 10,
          exchanges: [
            {
              name: RMQ_EXCHANGES.DLX,
              type: 'topic',
            },
            {
              name: RMQ_EXCHANGES.DEFAULT,
              type: 'topic',
            },
          ],
        };
      },
    }),
  ],
  exports: [RabbitMQModule],
})
export class CommonRabbitMqModule {}
