import { pool } from '../db.js';

export async function listar({ deporte, complejoId }) {
  const { rows } = await pool.query(
    `SELECT c.id, c.nombre, c.deporte, c.capacidad, c.precio_por_hora, c.estado,
            c.complejo_id, cd.nombre AS complejo
       FROM cancha c
       JOIN complejo_deportivo cd ON cd.id = c.complejo_id
      WHERE ($1::text IS NULL OR c.deporte = $1)
        AND ($2::int  IS NULL OR c.complejo_id = $2)
      ORDER BY c.id`,
    [deporte ?? null, complejoId ?? null],
  );
  return rows;
}

// Trae tambien el horario del complejo: la grilla y las reservas lo necesitan.
export async function buscarPorId(id) {
  const { rows } = await pool.query(
    `SELECT c.id, c.nombre, c.deporte, c.capacidad, c.precio_por_hora, c.estado,
            c.complejo_id, cd.nombre AS complejo,
            to_char(cd.horario_apertura, 'HH24:MI') AS horario_apertura,
            to_char(cd.horario_cierre, 'HH24:MI') AS horario_cierre
       FROM cancha c
       JOIN complejo_deportivo cd ON cd.id = c.complejo_id
      WHERE c.id = $1`,
    [id],
  );
  return rows[0];
}
