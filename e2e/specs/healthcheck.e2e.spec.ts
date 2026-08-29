describe('Health check', () => {
  test('Reservations service healthcheck should return 200', async () => {
    const response = await fetch('http://reservations:3000');
    expect(response.ok).toBe(true);
  });

  test('Auth service healthcheck should return 200', async () => {
    const response = await fetch('http://auth:3001');
    expect(response.ok).toBe(true);
  });
});
