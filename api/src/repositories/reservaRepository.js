import { pool } from '../db.js';

export async function horasOcupadas(canchaId, fecha) {
  const { rows } = await pool.query(
    `SELECT to_char(hora_inicio, 'HH24:MI') AS hora
       FROM reserva
      WHERE cancha_id = $1 AND fecha = $2::date AND estado <> 'cancelada'`,
    [canchaId, fecha],
  );
  return rows.map((fila) => fila.hora);
}
