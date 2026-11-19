import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { pool } from '../src/db.js';

// Este test crea su propia reserva en Padel B (id 5), que no tiene reservas en el seed,
// asi no depende de que la base se haya creado hoy.
const borrarPrueba = () => pool.query('DELETE FROM reserva WHERE cancha_id = 5');
before(borrarPrueba);
after(async () => {
  await borrarPrueba();
  await pool.end();
});

test('los complejos vienen con su horario', async () => {
  const res = await request(app).get('/api/complejos');
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 2);
  assert.equal(res.body[0].horario_apertura, '09:00');
  assert.equal(res.body[0].horario_cierre, '23:00');
});

test('canchas: sin filtro vienen todas, con el nombre del complejo', async () => {
  const res = await request(app).get('/api/canchas');
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 6);
  assert.equal(res.body[0].complejo, 'Complejo Las Palmas');
});

test('canchas: filtros por deporte y por complejo', async () => {
  const padel = await request(app).get('/api/canchas?deporte=padel');
  assert.deepEqual(padel.body.map((c) => c.nombre), ['Padel A', 'Padel B']);
  const palmas = await request(app).get('/api/canchas?complejo_id=1');
  assert.equal(palmas.body.length, 3);
  const ambos = await request(app).get('/api/canchas?deporte=futbol&complejo_id=2');
  assert.deepEqual(ambos.body, []);
});

test('canchas: filtros inválidos dan 400', async () => {
  assert.equal((await request(app).get('/api/canchas?deporte=tenis')).status, 400);
  assert.equal((await request(app).get('/api/canchas?complejo_id=abc')).status, 400);
});

test('disponibilidad: el turno reservado figura ocupado y los demás libres', async () => {
  const { rows } = await pool.query(
    `INSERT INTO reserva (usuario_id, cancha_id, inicio, fin, precio_total)
     VALUES (3, 5,
             ((CURRENT_DATE + 7) + time '19:00') AT TIME ZONE 'America/Argentina/Buenos_Aires',
             ((CURRENT_DATE + 7) + time '20:00') AT TIME ZONE 'America/Argentina/Buenos_Aires',
             12000)
     RETURNING fecha::text AS dia`,
  );
  const res = await request(app).get(`/api/canchas/5/disponibilidad?fecha=${rows[0].dia}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 12); // Club Norte abre a las 10 y cierra a las 22: el ultimo turno es a las 21
  assert.deepEqual(res.body[0], { hora: '10:00', estado: 'libre' });
  const estado = (hora) => res.body.find((t) => t.hora === hora).estado;
  assert.equal(estado('18:00'), 'libre');
  assert.equal(estado('19:00'), 'ocupado');
  assert.equal(estado('20:00'), 'libre');
});

test('disponibilidad: un día pasado queda todo como pasado', async () => {
  const res = await request(app).get('/api/canchas/1/disponibilidad?fecha=2020-01-01');
  assert.ok(res.body.every((t) => t.estado === 'pasado'));
});

test('disponibilidad: una cancha en mantenimiento no ofrece turnos libres', async () => {
  const { rows } = await pool.query('SELECT (CURRENT_DATE + 5)::text AS dia');
  const res = await request(app).get(`/api/canchas/3/disponibilidad?fecha=${rows[0].dia}`);
  assert.ok(res.body.every((t) => t.estado === 'ocupado'));
});

test('disponibilidad: fecha mal escrita o inexistente 400, cancha inexistente 404', async () => {
  assert.equal((await request(app).get('/api/canchas/1/disponibilidad')).status, 400);
  assert.equal((await request(app).get('/api/canchas/1/disponibilidad?fecha=mañana')).status, 400);
  assert.equal((await request(app).get('/api/canchas/1/disponibilidad?fecha=2026-02-30')).status, 400);
  assert.equal((await request(app).get('/api/canchas/999999/disponibilidad?fecha=2030-01-01')).status, 404);
});
