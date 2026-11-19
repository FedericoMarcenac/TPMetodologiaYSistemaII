import { pool } from '../db.js';

export async function listar() {
  const { rows } = await pool.query(
    `SELECT id, nombre, direccion, telefono, descripcion,
            to_char(horario_apertura, 'HH24:MI') AS horario_apertura,
            to_char(horario_cierre, 'HH24:MI') AS horario_cierre
       FROM complejo_deportivo
      ORDER BY id`,
  );
  return rows;
}
