import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import {
  RMQ_EXCHANGES,
  RMQ_ROUTING_KEYS,
  RMQ_QUEUES,
} from '@app/common';
import { SagaOrchestratorService } from './saga-orchestrator.service';

@Injectable()
export class SagaEventsConsumer {
  private readonly logger = new Logger(SagaEventsConsumer.name);

  constructor(private readonly sagaOrchestrator: SagaOrchestratorService) {}

  @RabbitSubscribe({
    exchange: RMQ_EXCHANGES.DEFAULT,
    routingKey: [
      RMQ_ROUTING_KEYS.SAGA.EVENT_PAYMENT_SUCCESS,
      RMQ_ROUTING_KEYS.SAGA.EVENT_PAYMENT_FAILED,
      RMQ_ROUTING_KEYS.SAGA.EVENT_PAYMENT_REFUNDED,
      RMQ_ROUTING_KEYS.SAGA.EVENT_NOTIFY_SUCCESS,
      RMQ_ROUTING_KEYS.SAGA.EVENT_NOTIFY_FAILED,
    ],
    queue: RMQ_QUEUES.SAGA_ORCHESTRATOR_EVENTS,
  })
  async handleSagaEvents(data: any, amqpMsg: any) {
    const routingKey = amqpMsg?.fields?.routingKey;

    switch (routingKey) {
      case RMQ_ROUTING_KEYS.SAGA.EVENT_PAYMENT_SUCCESS:
        await this.sagaOrchestrator.handlePaymentSuccess(data);
        break;

      case RMQ_ROUTING_KEYS.SAGA.EVENT_PAYMENT_FAILED:
        await this.sagaOrchestrator.handlePaymentFailed(data);
        break;

      case RMQ_ROUTING_KEYS.SAGA.EVENT_NOTIFY_SUCCESS:
        await this.sagaOrchestrator.handleNotifySuccess(data);
        break;

      case RMQ_ROUTING_KEYS.SAGA.EVENT_NOTIFY_FAILED:
        await this.sagaOrchestrator.handleNotifyFailed(data);
        break;

      case RMQ_ROUTING_KEYS.SAGA.EVENT_PAYMENT_REFUNDED:
        await this.sagaOrchestrator.handlePaymentRefunded(data);
        break;

      default:
        this.logger.warn(`Неизвестное событие саги с routingKey: ${routingKey}`);
    }
  }
}
