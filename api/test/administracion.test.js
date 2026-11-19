import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { pool } from '../src/db.js';

// Las canchas que crea este test empiezan con "Prueba", asi se borran sin tocar las del seed.
const borrarPrueba = () => pool.query("DELETE FROM cancha WHERE nombre LIKE 'Prueba%'");
let admin;
let jugador;

before(async () => {
  await borrarPrueba();
  const entrar = async (email) =>
    (await request(app).post('/api/auth/login').send({ email, password: 'turnito123' })).body.token;
  admin = `Bearer ${await entrar('admin@turnito.com')}`;
  jugador = `Bearer ${await entrar('jugador@turnito.com')}`;
});
after(async () => {
  await borrarPrueba();
  await pool.end();
});

const nueva = { nombre: 'Prueba 1', deporte: 'futbol', capacidad: 10, precio_por_hora: 15000 };

test('sin sesión 401, y un jugador recibe 403', async () => {
  assert.equal((await request(app).get('/api/admin/canchas')).status, 401);
  assert.equal((await request(app).get('/api/admin/canchas').set('Authorization', jugador)).status, 403);
});

test('el administrador ve su complejo y solo sus canchas', async () => {
  const complejo = await request(app).get('/api/admin/complejo').set('Authorization', admin);
  assert.equal(complejo.body.nombre, 'Complejo Las Palmas');

  const res = await request(app).get('/api/admin/canchas').set('Authorization', admin);
  assert.equal(res.status, 200);
  assert.ok(res.body.length >= 3);
  assert.ok(res.body.every((c) => c.complejo_id === 1));
});

test('crear una cancha la asigna a su complejo aunque el pedido diga otro', async () => {
  const res = await request(app).post('/api/admin/canchas').set('Authorization', admin).send({ ...nueva, complejo_id: 2 });
  assert.equal(res.status, 201);
  assert.equal(res.body.complejo_id, 1);
  assert.equal(res.body.estado, 'disponible');
  assert.equal(res.body.precio_por_hora, 15000);
});

test('editar una cancha propia', async () => {
  const creada = (await request(app).post('/api/admin/canchas').set('Authorization', admin).send({ ...nueva, nombre: 'Prueba 2' })).body;
  const res = await request(app).put(`/api/admin/canchas/${creada.id}`).set('Authorization', admin)
    .send({ ...nueva, nombre: 'Prueba 2 techada', precio_por_hora: 20000, estado: 'mantenimiento' });
  assert.equal(res.status, 200);
  assert.equal(res.body.nombre, 'Prueba 2 techada');
  assert.equal(res.body.estado, 'mantenimiento');
});

test('editar una cancha de otro complejo: 403; una que no existe: 404', async () => {
  const otra = await request(app).put('/api/admin/canchas/4').set('Authorization', admin).send(nueva);
  assert.equal(otra.status, 403);
  const inexistente = await request(app).put('/api/admin/canchas/999999').set('Authorization', admin).send(nueva);
  assert.equal(inexistente.status, 404);
});

test('datos inválidos de la cancha: 400 con un mensaje claro', async () => {
  const casos = [
    { ...nueva, deporte: 'tenis' },
    { ...nueva, capacidad: 0 },
    { ...nueva, precio_por_hora: -1 },
    { ...nueva, estado: 'rota' },
    { deporte: 'futbol' },
  ];
  for (const datos of casos) {
    const res = await request(app).post('/api/admin/canchas').set('Authorization', admin).send(datos);
    assert.equal(res.status, 400, JSON.stringify(datos));
    assert.ok(res.body.error);
  }
});

test('reservas del día: las del seed de mañana en la Cancha 1, con quién reservó', async () => {
  const { rows } = await pool.query("SELECT (CURRENT_DATE + 1)::text AS manana");
  const res = await request(app).get(`/api/admin/reservas?fecha=${rows[0].manana}`).set('Authorization', admin);
  assert.equal(res.status, 200);
  const horas = res.body.filter((r) => r.cancha === 'Cancha 1').map((r) => r.hora_inicio);
  assert.deepEqual(horas, ['19:00', '20:00']);
  assert.ok(res.body[0].apellido);
  assert.equal(res.body.find((r) => r.hora_inicio === '19:00').partido_id, 1);
});

test('reservas con una fecha mal escrita: 400', async () => {
  const res = await request(app).get('/api/admin/reservas?fecha=mañana').set('Authorization', admin);
  assert.equal(res.status, 400);
});
