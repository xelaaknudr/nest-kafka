describe('Reservations', () => {
  const user = {
    email: 'test@roze.com',
    password: 'Password12345!',
  };

  let jwt: string;

  beforeAll(async () => {
    await fetch('http://auth:3001/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });

    const response = await fetch('http://auth:3001/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });

    jwt = await response.text();
    console.log('JWT --------------: ', jwt);
  });

  test('Create reservation', async () => {
    const resp = await fetch('http://reservations:3000/reservation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `Authentication=${jwt}`,
      },

      body: JSON.stringify({
        startDate: '2023-01-02T00:00:00.000Z',
        endDate: '2023-01-05T00:00:00.000Z',
        charge: {
          token: 'tok_visa',
          amount: 13,
        },
      }),
    });

    expect(resp.status).toBe(201);
    const reservation = await resp.json();
    expect(reservation).toHaveProperty('id');
  });
});
