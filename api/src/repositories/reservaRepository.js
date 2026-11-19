import { pool } from '../db.js';

const COLUMNAS = `r.id, r.inicio, r.fin, r.fecha,
                  to_char(r.hora_inicio, 'HH24:MI') AS hora_inicio,
                  to_char(r.hora_fin, 'HH24:MI') AS hora_fin,
                  r.precio_total, r.estado, r.usuario_id, r.cancha_id`;

export async function horasOcupadas(canchaId, fecha) {
  const { rows } = await pool.query(
    `SELECT to_char(hora_inicio, 'HH24:MI') AS hora
       FROM reserva
      WHERE cancha_id = $1 AND fecha = $2::date AND estado <> 'cancelada'`,
    [canchaId, fecha],
  );
  return rows.map((fila) => fila.hora);
}

// Si el turno ya esta ocupado, la restriccion de exclusion de la base tira 23P01
// y el manejador de errores lo convierte en 409.
export async function crear({ usuarioId, canchaId, inicio, fin, precioTotal }) {
  const { rows } = await pool.query(
    `INSERT INTO reserva AS r (usuario_id, cancha_id, inicio, fin, precio_total)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLUMNAS}`,
    [usuarioId, canchaId, inicio, fin, precioTotal],
  );
  return rows[0];
}

export async function buscarPorId(id) {
  const { rows } = await pool.query(`SELECT ${COLUMNAS} FROM reserva r WHERE r.id = $1`, [id]);
  return rows[0];
}

export async function listarDeUsuario(usuarioId) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS},
            c.nombre AS cancha, c.deporte, cd.nombre AS complejo,
            p.id AS partido_id
       FROM reserva r
       JOIN cancha c ON c.id = r.cancha_id
       JOIN complejo_deportivo cd ON cd.id = c.complejo_id
       LEFT JOIN partido p ON p.reserva_id = r.id
      WHERE r.usuario_id = $1
      ORDER BY r.inicio`,
    [usuarioId],
  );
  return rows;
}

// El trigger de la base cancela el partido de esta reserva, si lo tiene.
export async function cancelar(id) {
  const { rows } = await pool.query(
    `UPDATE reserva AS r SET estado = 'cancelada'
      WHERE r.id = $1
      RETURNING ${COLUMNAS}`,
    [id],
  );
  return rows[0];
}
