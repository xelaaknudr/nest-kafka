import { Test, TestingModule } from '@nestjs/testing';
import {
  ReservationController,
  ReservationPingResponse,
} from './reservation.controller';
import { ReservationService } from './reservation.service';
import { AmqpConnection } from '@app/common';
import { SagaOrchestratorService } from './saga/saga-orchestrator.service';

describe('ReservationController', () => {
  let controller: ReservationController;

  const mockReservationService = {};
  const mockAmqpConnection = {
    publish: jest.fn(),
    request: jest.fn(),
  };
  const mockSagaOrchestratorService = {
    startBookingSaga: jest.fn(),
    getSaga: jest.fn(),
    getAllSagas: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationController],
      providers: [
        {
          provide: ReservationService,
          useValue: mockReservationService,
        },
        {
          provide: AmqpConnection,
          useValue: mockAmqpConnection,
        },
        {
          provide: SagaOrchestratorService,
          useValue: mockSagaOrchestratorService,
        },
      ],
    }).compile();

    controller = module.get<ReservationController>(ReservationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('ping', () => {
    it('should return health status ok, non-negative uptime, and valid timestamp close to now', () => {
      const before = Date.now();
      const response: ReservationPingResponse = controller.ping();
      const after = Date.now();

      expect(response).toEqual({
        status: 'ok',
        uptime: expect.any(Number),
        timestamp: expect.any(String),
      });

      expect(response.uptime).toBeGreaterThanOrEqual(0);

      const parsedTimestamp = new Date(response.timestamp).getTime();
      expect(Number.isNaN(parsedTimestamp)).toBe(false);
      expect(parsedTimestamp).toBeGreaterThanOrEqual(before - 1000);
      expect(parsedTimestamp).toBeLessThanOrEqual(after + 1000);
    });
  });
});
