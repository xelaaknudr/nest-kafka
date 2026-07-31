import { probe } from 'tcp-ping';

describe('Health check', () => {
  test('Reservations service healthcheck should return 200', async () => {
    const response = await fetch('http://reservations:3000');
    expect(response.ok).toBe(true);
  });

  test('Auth service healthcheck should return 200', async () => {
    const response = await fetch('http://auth:3001');
    expect(response.ok).toBe(true);
  });

  test('Payments service ping', async () => {
    const isAvailable = await new Promise<boolean>((resolve) => {
      probe('payments', 3003, (err, available) => {
        resolve(available);
      });
    });
    expect(isAvailable).toBe(true);
  });

  test('Notifications service ping', async () => {
    const isAvailable = await new Promise<boolean>((resolve) => {
      probe('notifications', 3004, (err, available) => {
        resolve(available);
      });
    });
    expect(isAvailable).toBe(true);
  });
});
