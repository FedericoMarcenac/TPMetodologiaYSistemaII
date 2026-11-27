import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { pool } from '../src/db.js';

// Todo lo de este test sale de reservas en la Cancha 2 (futbol, capacidad 10), que no tiene
// reservas en el seed. Al borrarlas se borran en cascada sus partidos y participantes.
const borrarPrueba = () => pool.query('DELETE FROM reserva WHERE cancha_id = 2');
const CAPACIDAD = 10;
const IGNACIO = 2;
const FEDE = 3;

let ignacio;
let fede;
let lucia;

before(async () => {
  await borrarPrueba();
  const entrar = async (email) =>
    `Bearer ${(await request(app).post('/api/auth/login').send({ email, password: 'turnito123' })).body.token}`;
  ignacio = await entrar('jugador@turnito.com');
  fede = await entrar('fede@turnito.com');
  lucia = await entrar('lucia@turnito.com');
});
after(async () => {
  await borrarPrueba();
  await pool.end();
});

// Crea una reserva de una hora en la Cancha 2, a `dias` de hoy (negativo = en el pasado).
// Cada reserva usa un turno distinto para no chocar con la restriccion de solapamiento.
let creadas = 0;
async function reservar(usuarioId, dias = 7) {
  const hora = 9 + (creadas % 12);
  dias += Math.floor(creadas / 12) * Math.sign(dias);
  creadas++;
  const { rows } = await pool.query(
    `INSERT INTO reserva (usuario_id, cancha_id, inicio, fin, precio_total)
     VALUES ($1, 2,
             ((CURRENT_DATE + $2::int) + make_time($3, 0, 0)) AT TIME ZONE 'America/Argentina/Buenos_Aires',
             ((CURRENT_DATE + $2::int) + make_time($3 + 1, 0, 0)) AT TIME ZONE 'America/Argentina/Buenos_Aires',
             18000)
     RETURNING id`,
    [usuarioId, dias, hora],
  );
  return rows[0].id;
}

const publicar = (token, datos) => request(app).post('/api/partidos').set('Authorization', token).send(datos);
const sumarse = (token, id) => request(app).post(`/api/partidos/${id}/participantes`).set('Authorization', token);
const bajarse = (token, id) => request(app).delete(`/api/partidos/${id}/participantes`).set('Authorization', token);
const abiertos = async () => (await request(app).get('/api/partidos')).body.map((p) => p.id);

// Publica un partido de Ignacio y devuelve su id.
async function partidoDe(jugadores) {
  const res = await publicar(ignacio, { reserva_id: await reservar(IGNACIO), jugadores_necesarios: jugadores });
  assert.equal(res.status, 201);
  return res.body.id;
}

test('publicar desde una reserva propia: 201, el creador queda anotado y aparece en la lista', async () => {
  const reserva = await reservar(IGNACIO);
  const res = await publicar(ignacio, { reserva_id: reserva, jugadores_necesarios: 6 });
  assert.equal(res.status, 201);
  assert.equal(res.body.deporte, 'futbol');
  assert.equal(res.body.cancha, 'Cancha 2');
  assert.equal(res.body.estado, 'abierto');
  assert.equal(res.body.jugadores_actuales, 1);
  assert.equal(res.body.completo, false);
  assert.deepEqual(res.body.participantes.map((p) => p.usuario_id), [IGNACIO]);
  assert.ok((await abiertos()).includes(res.body.id));
});

test('publicar desde una reserva ajena: 403', async () => {
  const res = await publicar(fede, { reserva_id: await reservar(IGNACIO), jugadores_necesarios: 6 });
  assert.equal(res.status, 403);
  assert.equal(res.body.error, 'Esa reserva no es tuya');
});

test('publicar: sin sesión 401, reserva inexistente 404, faltan datos 400', async () => {
  assert.equal((await request(app).post('/api/partidos').send({ reserva_id: 1, jugadores_necesarios: 4 })).status, 401);
  assert.equal((await publicar(ignacio, { reserva_id: 999999, jugadores_necesarios: 4 })).status, 404);
  assert.equal((await publicar(ignacio, { jugadores_necesarios: 4 })).status, 400);
});

test('publicar: jugadores fuera de rango 400; los extremos 2 y la capacidad se aceptan', async () => {
  const reserva = await reservar(IGNACIO);
  for (const jugadores of [1, CAPACIDAD + 1, 2.5, 'diez']) {
    const res = await publicar(ignacio, { reserva_id: reserva, jugadores_necesarios: jugadores });
    assert.equal(res.status, 400, String(jugadores));
  }
  assert.equal((await publicar(ignacio, { reserva_id: reserva, jugadores_necesarios: 2 })).status, 201);
  const otra = await publicar(ignacio, { reserva_id: await reservar(IGNACIO), jugadores_necesarios: CAPACIDAD });
  assert.equal(otra.status, 201);
});

test('publicar desde una reserva pasada o cancelada: 400', async () => {
  const pasada = await publicar(ignacio, { reserva_id: await reservar(IGNACIO, -1), jugadores_necesarios: 4 });
  assert.equal(pasada.status, 400);

  const reserva = await reservar(IGNACIO);
  await pool.query("UPDATE reserva SET estado = 'cancelada' WHERE id = $1", [reserva]);
  const cancelada = await publicar(ignacio, { reserva_id: reserva, jugadores_necesarios: 4 });
  assert.equal(cancelada.status, 400);
});

test('publicar dos veces desde la misma reserva: 409', async () => {
  const reserva = await reservar(IGNACIO);
  assert.equal((await publicar(ignacio, { reserva_id: reserva, jugadores_necesarios: 4 })).status, 201);
  const otraVez = await publicar(ignacio, { reserva_id: reserva, jugadores_necesarios: 4 });
  assert.equal(otraVez.status, 409);
  assert.equal(otraVez.body.error, 'Esa reserva ya tiene un partido');
});

test('sumarse: 201 y suma un jugador; la segunda vez 409', async () => {
  const id = await partidoDe(4);
  const res = await sumarse(fede, id);
  assert.equal(res.status, 201);
  assert.equal(res.body.jugadores_actuales, 2);
  assert.deepEqual(res.body.participantes.map((p) => p.usuario_id), [IGNACIO, FEDE]);

  const otraVez = await sumarse(fede, id);
  assert.equal(otraVez.status, 409);
  assert.equal(otraVez.body.error, 'Ya estás anotado en este partido');
});

test('sumarse: sin sesión 401, partido inexistente 404', async () => {
  const id = await partidoDe(4);
  assert.equal((await request(app).post(`/api/partidos/${id}/participantes`)).status, 401);
  assert.equal((await sumarse(fede, 999999)).status, 404);
  assert.equal((await sumarse(fede, 'abc')).status, 404);
});

test('dos personas por el último lugar a la vez: entra una sola', async () => {
  const id = await partidoDe(2); // el creador ocupa uno, queda un lugar
  const respuestas = await Promise.all([sumarse(fede, id), sumarse(lucia, id)]);

  assert.deepEqual(respuestas.map((r) => r.status).sort(), [201, 409]);
  assert.equal(respuestas.find((r) => r.status === 409).body.error, 'El partido ya no tiene lugar');

  const partido = (await request(app).get(`/api/partidos/${id}`)).body;
  assert.equal(partido.jugadores_actuales, 2);
  assert.equal(partido.participantes.length, 2);
  assert.equal(partido.completo, true);
  assert.ok(!(await abiertos()).includes(id));
});

test('bajarse de un partido completo lo vuelve a abrir', async () => {
  const id = await partidoDe(2);
  assert.equal((await sumarse(fede, id)).status, 201);
  assert.ok(!(await abiertos()).includes(id));

  const res = await bajarse(fede, id);
  assert.equal(res.status, 200);
  assert.equal(res.body.jugadores_actuales, 1);
  assert.equal(res.body.completo, false);
  assert.ok((await abiertos()).includes(id));
  assert.equal((await sumarse(lucia, id)).status, 201);
});

test('bajarse: el creador 403, alguien que no estaba anotado 404', async () => {
  const id = await partidoDe(4);
  const creador = await bajarse(ignacio, id);
  assert.equal(creador.status, 403);
  const noAnotado = await bajarse(fede, id);
  assert.equal(noAnotado.status, 404);
  assert.equal(noAnotado.body.error, 'No estás anotado en este partido');
});

test('si se cancela la reserva, el partido queda cancelado y no deja sumarse', async () => {
  const reserva = await reservar(IGNACIO);
  const id = (await publicar(ignacio, { reserva_id: reserva, jugadores_necesarios: 4 })).body.id;
  await pool.query("UPDATE reserva SET estado = 'cancelada' WHERE id = $1", [reserva]);

  const partido = (await request(app).get(`/api/partidos/${id}`)).body;
  assert.equal(partido.estado, 'cancelado');
  assert.ok(!(await abiertos()).includes(id));
  assert.equal((await sumarse(fede, id)).status, 409);
});
