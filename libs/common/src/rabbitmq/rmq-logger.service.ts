import { Logger } from '@nestjs/common';

export class RmqLogger extends Logger {
  constructor() {
    super('RabbitMQ');
  }

  log(message: any, context?: string) {
    super.log(`RabbtitMQ : ${message}`, context);
  }

  error(message: any, trace?: string, context?: string) {
    super.error(`RabbtitMQ : ${message}`, trace, context);
  }

  warn(message: any, context?: string) {
    super.warn(`RabbtitMQ : ${message}`, context);
  }
}
