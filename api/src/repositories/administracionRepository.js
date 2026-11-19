import { pool } from '../db.js';

export async function buscarComplejo(id) {
  const { rows } = await pool.query('SELECT * FROM complejo_deportivo WHERE id = $1', [id]);
  return rows[0];
}

export async function listarCanchas(complejoId) {
  const { rows } = await pool.query('SELECT * FROM cancha WHERE complejo_id = $1 ORDER BY id', [complejoId]);
  return rows;
}

export async function buscarCancha(id) {
  const { rows } = await pool.query('SELECT * FROM cancha WHERE id = $1', [id]);
  return rows[0];
}

export async function crearCancha(complejoId, { nombre, deporte, capacidad, precio_por_hora, estado }) {
  const { rows } = await pool.query(
    `INSERT INTO cancha (nombre, deporte, capacidad, precio_por_hora, estado, complejo_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [nombre, deporte, capacidad, precio_por_hora, estado, complejoId],
  );
  return rows[0];
}

export async function actualizarCancha(id, { nombre, deporte, capacidad, precio_por_hora, estado }) {
  const { rows } = await pool.query(
    `UPDATE cancha
        SET nombre = $1, deporte = $2, capacidad = $3, precio_por_hora = $4, estado = $5
      WHERE id = $6
      RETURNING *`,
    [nombre, deporte, capacidad, precio_por_hora, estado, id],
  );
  return rows[0];
}

export async function listarReservasDelDia(complejoId, fecha) {
  const { rows } = await pool.query(
    `SELECT r.id, r.fecha, to_char(r.hora_inicio, 'HH24:MI') AS hora_inicio,
            to_char(r.hora_fin, 'HH24:MI') AS hora_fin, r.precio_total, r.estado,
            c.id AS cancha_id, c.nombre AS cancha,
            u.nombre, u.apellido, u.telefono,
            p.id AS partido_id
       FROM reserva r
       JOIN cancha  c ON c.id = r.cancha_id
       JOIN usuario u ON u.id = r.usuario_id
       LEFT JOIN partido p ON p.reserva_id = r.id
      WHERE c.complejo_id = $1
        AND r.fecha = COALESCE($2::date, CURRENT_DATE)
      ORDER BY r.inicio, c.nombre`,
    [complejoId, fecha ?? null],
  );
  return rows;
}
