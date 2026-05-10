import { NestFactory } from '@nestjs/core';
import { ReservationModule } from './reservation.module';

async function bootstrap() {
  const app = await NestFactory.create(ReservationModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
