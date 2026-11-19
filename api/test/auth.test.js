import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import app from '../src/app.js';
import { pool } from '../src/db.js';
import { requireAuth, requireRol } from '../src/middlewares/auth.js';
import { manejarErrores } from '../src/middlewares/errores.js';

// Los usuarios que crea este test usan este dominio, asi se borran sin tocar los del seed.
const borrarPrueba = () => pool.query("DELETE FROM usuario WHERE email LIKE '%@prueba.test'");
before(borrarPrueba);
after(async () => {
  await borrarPrueba();
  await pool.end();
});

const login = (email, password = 'turnito123') => request(app).post('/api/auth/login').send({ email, password });

test('login con un usuario del seed devuelve token y usuario sin la contraseña', async () => {
  const res = await login('jugador@turnito.com');
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.equal(res.body.usuario.email, 'jugador@turnito.com');
  assert.equal(res.body.usuario.password_hash, undefined);
});

test('login ignora mayúsculas y espacios en el email', async () => {
  const res = await login('  Jugador@Turnito.com ');
  assert.equal(res.status, 200);
});

test('contraseña incorrecta y email inexistente dan el mismo 401', async () => {
  const mala = await login('jugador@turnito.com', 'otra');
  const inexistente = await login('nadie@turnito.com');
  assert.equal(mala.status, 401);
  assert.equal(inexistente.status, 401);
  assert.equal(mala.body.error, inexistente.body.error);
});

test('registrar crea un jugador aunque pida otro rol, y puede entrar', async () => {
  const res = await request(app).post('/api/auth/registrar').send({
    nombre: 'Ana', apellido: 'Paz', email: 'ana@prueba.test', password: 'secreta1', rol: 'administrador',
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.usuario.rol, 'jugador');
  assert.ok(res.body.token);
  assert.equal((await login('ana@prueba.test', 'secreta1')).status, 200);
});

test('registrar un email que ya existe: 409', async () => {
  const res = await request(app).post('/api/auth/registrar').send({
    nombre: 'Otro', apellido: 'Jugador', email: 'jugador@turnito.com', password: 'secreta1',
  });
  assert.equal(res.status, 409);
  assert.equal(res.body.error, 'Ese email ya está registrado');
});

test('registrar con datos faltantes o inválidos: 400', async () => {
  const sinDatos = await request(app).post('/api/auth/registrar').send({ email: 'x@prueba.test' });
  assert.equal(sinDatos.status, 400);
  assert.match(sinDatos.body.error, /nombre, apellido, password/);

  const emailMalo = await request(app).post('/api/auth/registrar').send({ nombre: 'A', apellido: 'B', email: 'sin-arroba', password: 'secreta1' });
  assert.equal(emailMalo.status, 400);

  const corta = await request(app).post('/api/auth/registrar').send({ nombre: 'A', apellido: 'B', email: 'c@prueba.test', password: '123' });
  assert.equal(corta.status, 400);
});

test('GET /api/auth/yo con token devuelve el usuario', async () => {
  const { body } = await login('admin@turnito.com');
  const res = await request(app).get('/api/auth/yo').set('Authorization', `Bearer ${body.token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.rol, 'administrador');
  assert.equal(res.body.complejo_id, 1);
});

test('GET /api/auth/yo sin token o con un token falso: 401', async () => {
  assert.equal((await request(app).get('/api/auth/yo')).status, 401);
  const falso = await request(app).get('/api/auth/yo').set('Authorization', 'Bearer abc.def.ghi');
  assert.equal(falso.status, 401);
});

test('requireRol deja pasar al administrador y frena al jugador con 403', async () => {
  const prueba = express();
  prueba.get('/solo-admin', requireAuth, requireRol('administrador'), (req, res) => res.json(req.usuario));
  prueba.use(manejarErrores);

  const admin = (await login('admin@turnito.com')).body.token;
  const jugador = (await login('jugador@turnito.com')).body.token;

  const ok = await request(prueba).get('/solo-admin').set('Authorization', `Bearer ${admin}`);
  assert.equal(ok.status, 200);
  assert.deepEqual(Object.keys(ok.body).sort(), ['complejo_id', 'id', 'rol']);

  const no = await request(prueba).get('/solo-admin').set('Authorization', `Bearer ${jugador}`);
  assert.equal(no.status, 403);
});
