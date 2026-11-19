import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { pool } from '../src/db.js';

after(() => pool.end());

test('GET /api/salud responde ok con la base conectada', async () => {
  const res = await request(app).get('/api/salud');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { estado: 'ok' });
});

test('una ruta que no existe devuelve 404 con { error }', async () => {
  const res = await request(app).get('/api/no-existe');
  assert.equal(res.status, 404);
  assert.equal(res.body.error, 'No existe esa ruta');
});

test('un JSON mal formado devuelve 400', async () => {
  const res = await request(app)
    .post('/api/salud')
    .set('Content-Type', 'application/json')
    .send('{ roto');
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'El cuerpo del pedido no es un JSON válido');
});
