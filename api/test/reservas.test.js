import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { pool } from '../src/db.js';

// Estos tests reservan siempre la Cancha 2 dentro de 30 dias: el seed no tiene reservas ahi,
// asi que se pueden borrar todas al empezar y al terminar sin tocar los datos de ejemplo.
const CANCHA = 2;
let dia;
let fede;
let lucia;

const limpiar = () => pool.query('DELETE FROM reserva WHERE cancha_id = $1', [CANCHA]);
const reservar = (token, hora, cancha = CANCHA, fecha = dia) =>
  request(app).post('/api/reservas').set('Authorization', token).send({ cancha_id: cancha, fecha, hora });

before(async () => {
  await limpiar();
  dia = (await pool.query('SELECT (CURRENT_DATE + 30)::text AS dia')).rows[0].dia;
  const entrar = async (email) =>
    `Bearer ${(await request(app).post('/api/auth/login').send({ email, password: 'turnito123' })).body.token}`;
  fede = await entrar('fede@turnito.com');
  lucia = await entrar('lucia@turnito.com');
});
after(async () => {
  await limpiar();
  await pool.end();
});

test('sin sesión no se puede reservar ni ver reservas: 401', async () => {
  assert.equal((await request(app).post('/api/reservas').send({})).status, 401);
  assert.equal((await request(app).get('/api/reservas/mias')).status, 401);
  assert.equal((await request(app).patch('/api/reservas/1/cancelar')).status, 401);
});

test('reservar un turno libre: 201, el servidor calcula el fin y congela el precio', async () => {
  const res = await reservar(fede, '19:00');
  assert.equal(res.status, 201);
  assert.equal(res.body.hora_inicio, '19:00');
  assert.equal(res.body.hora_fin, '20:00');
  assert.equal(res.body.fecha, dia);
  assert.equal(res.body.precio_total, 18000);
  assert.equal(res.body.estado, 'confirmada');
});

test('reservar un turno ocupado: 409', async () => {
  const res = await reservar(lucia, '19:00');
  assert.equal(res.status, 409);
  assert.equal(res.body.error, 'Ese turno ya está reservado');
});

test('dos pedidos al mismo turno a la vez: entra uno solo', async () => {
  const [a, b] = await Promise.all([reservar(fede, '21:00'), reservar(lucia, '21:00')]);
  assert.deepEqual([a.status, b.status].sort(), [201, 409]);
  const { rows } = await pool.query(
    "SELECT count(*)::int AS n FROM reserva WHERE cancha_id = $1 AND fecha = $2 AND hora_inicio = '21:00' AND estado <> 'cancelada'",
    [CANCHA, dia],
  );
  assert.equal(rows[0].n, 1);
});

test('turnos que no corresponden: pasado, fuera de horario, cancha en mantenimiento, datos mal', async () => {
  assert.equal((await reservar(fede, '19:00', CANCHA, '2020-01-01')).status, 400);
  assert.equal((await reservar(fede, '03:00')).status, 400);
  assert.equal((await reservar(fede, '23:00')).status, 400);
  assert.equal((await reservar(fede, '19:00', 3)).status, 409);
  assert.equal((await reservar(fede, '19:00', 999999)).status, 404);
  assert.equal((await reservar(fede, '19:30')).status, 400);
  assert.equal((await reservar(fede, '19:00', CANCHA, '2030-02-30')).status, 400);
  assert.equal((await request(app).post('/api/reservas').set('Authorization', fede).send({})).status, 400);
});

test('mis reservas: solo las propias, con cancha, complejo y partido_id', async () => {
  const res = await request(app).get('/api/reservas/mias').set('Authorization', fede);
  assert.equal(res.status, 200);
  assert.ok(res.body.every((r) => r.usuario_id === 3));
  const mia = res.body.find((r) => r.cancha_id === CANCHA && r.hora_inicio === '19:00');
  assert.equal(mia.cancha, 'Cancha 2');
  assert.equal(mia.complejo, 'Complejo Las Palmas');
  assert.equal(mia.partido_id, null);
});

test('cancelar libera el turno: otro puede reservarlo', async () => {
  const propia = (await reservar(fede, '10:00')).body;
  assert.equal((await reservar(lucia, '10:00')).status, 409);
  const cancelada = await request(app).patch(`/api/reservas/${propia.id}/cancelar`).set('Authorization', fede);
  assert.equal(cancelada.status, 200);
  assert.equal(cancelada.body.estado, 'cancelada');
  assert.equal((await reservar(lucia, '10:00')).status, 201);
});

test('cancelar una reserva ajena 403, inexistente 404, ya cancelada 409', async () => {
  const propia = (await reservar(fede, '11:00')).body;
  assert.equal((await request(app).patch(`/api/reservas/${propia.id}/cancelar`).set('Authorization', lucia)).status, 403);
  assert.equal((await request(app).patch('/api/reservas/999999/cancelar').set('Authorization', fede)).status, 404);
  await request(app).patch(`/api/reservas/${propia.id}/cancelar`).set('Authorization', fede);
  assert.equal((await request(app).patch(`/api/reservas/${propia.id}/cancelar`).set('Authorization', fede)).status, 409);
});

test('cancelar una reserva con partido cancela también el partido', async () => {
  const propia = (await reservar(fede, '12:00')).body;
  const partido = await pool.query(
    'INSERT INTO partido (jugadores_necesarios, reserva_id, creador_id) VALUES (10, $1, 3) RETURNING id',
    [propia.id],
  );
  await request(app).patch(`/api/reservas/${propia.id}/cancelar`).set('Authorization', fede);
  const { rows } = await pool.query('SELECT estado FROM partido WHERE id = $1', [partido.rows[0].id]);
  assert.equal(rows[0].estado, 'cancelado');
});

test('cancelar una reserva que ya empezó: 400', async () => {
  const { rows } = await pool.query(
    `INSERT INTO reserva (usuario_id, cancha_id, inicio, fin, precio_total)
     VALUES (3, $1, now() - interval '30 minutes', now() + interval '30 minutes', 18000) RETURNING id`,
    [CANCHA],
  );
  const res = await request(app).patch(`/api/reservas/${rows[0].id}/cancelar`).set('Authorization', fede);
  assert.equal(res.status, 400);
});
