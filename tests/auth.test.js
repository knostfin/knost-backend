const request = require('supertest');
const app = require('../src/app');

describe('Auth routes', () => {
  test('GET /api/auth/verify without token returns 401', async () => {
    const res = await request(app).get('/api/auth/verify');
    expect(res.statusCode).toBe(401);
  });
});
