import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/db.js';
import { traducirErrorPg } from '../src/errores.js';

after(() => pool.end());

// Provoca el error real en la base, dentro de una transaccion que se deshace, y devuelve como lo traduce la API.
async function traducir(sql) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(sql);
    assert.fail('La base tendria que haber rechazado la consulta');
  } catch (err) {
    if (err instanceof assert.AssertionError) throw err;
    return traducirErrorPg(err);
  } finally {
    await cliente.query('ROLLBACK');
    cliente.release();
  }
}

test('turno superpuesto: 409', async () => {
  const r = await traducir(`
    INSERT INTO reserva (inicio, fin, precio_total, usuario_id, cancha_id)
    SELECT inicio, fin, precio_total, 3, cancha_id FROM reserva WHERE id = 1`);
  assert.deepEqual(r, [409, 'Ese turno ya está reservado']);
});

test('email repetido: 409', async () => {
  const r = await traducir(`
    INSERT INTO usuario (nombre, apellido, email, password_hash)
    VALUES ('Otro', 'Usuario', 'jugador@turnito.com', 'x')`);
  assert.deepEqual(r, [409, 'Ese email ya está registrado']);
});

test('reserva que ya tiene partido: 409', async () => {
  const r = await traducir('INSERT INTO partido (jugadores_necesarios, reserva_id, creador_id) VALUES (10, 1, 2)');
  assert.deepEqual(r, [409, 'Esa reserva ya tiene un partido']);
});

test('sumarse dos veces al mismo partido: 409', async () => {
  const r = await traducir('INSERT INTO participante_partido (usuario_id, partido_id) VALUES (3, 1)');
  assert.deepEqual(r, [409, 'Ya estás anotado en este partido']);
});

test('partido sin lugar (trigger de cupo): 409 con el mensaje del trigger', async () => {
  // El partido 3 es de padel para 4 y tiene 2 anotados: se completa y despues se intenta un quinto.
  const r = await traducir(`
    INSERT INTO usuario (id, nombre, apellido, email, password_hash)
    VALUES (901, 'A', 'A', 'a@prueba.test', 'x'), (902, 'B', 'B', 'b@prueba.test', 'x'), (903, 'C', 'C', 'c@prueba.test', 'x');
    INSERT INTO participante_partido (usuario_id, partido_id) VALUES (901, 3), (902, 3);
    INSERT INTO participante_partido (usuario_id, partido_id) VALUES (903, 3);`);
  assert.deepEqual(r, [409, 'El partido ya no tiene lugar']);
});

test('CHECK de una tabla: 400, no 409', async () => {
  const r = await traducir("INSERT INTO cancha (nombre, deporte, capacidad, precio_por_hora, complejo_id) VALUES ('X', 'futbol', 0, 1000, 1)");
  assert.deepEqual(r, [400, 'Datos inválidos']);
});

test('error que no es de negocio: no se traduce', () => {
  assert.equal(traducirErrorPg({ code: '42P01' }), null);
});

test('los precios llegan como numero y las fechas como texto', async () => {
  const { rows } = await pool.query('SELECT precio_total, fecha FROM reserva WHERE id = 1');
  assert.equal(typeof rows[0].precio_total, 'number');
  assert.match(rows[0].fecha, /^\d{4}-\d{2}-\d{2}$/);
});
