import { NestFactory } from '@nestjs/core';
import { NotificationsModule } from './notifications.module';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(NotificationsModule);
  app.useLogger(app.get(Logger));

  // Since notifications service has no HTTP controllers currently, we just init it
  await app.init();
  console.log('Notifications service is running (RabbitMQ listener)');
}
bootstrap();
