import { NestFactory } from '@nestjs/core';
import { PaymentsModule } from './payments.module';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(PaymentsModule);
  app.useLogger(app.get(Logger));

  // Since payments service has no HTTP controllers currently, we just init it
  await app.init();
  console.log('Payments service is running (RabbitMQ listener)');
}
bootstrap();
