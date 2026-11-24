import { pool } from '../db.js';

const COLUMNAS = `p.id, p.deporte, p.fecha, to_char(p.hora, 'HH24:MI') AS hora,
       p.jugadores_necesarios, p.jugadores_actuales, p.estado, p.creador_id,
       p.jugadores_actuales >= p.jugadores_necesarios AS completo,
       c.id AS cancha_id, c.nombre AS cancha,
       k.id AS complejo_id, k.nombre AS complejo`;

const ORIGEN = `FROM partido p
       JOIN reserva r ON r.id = p.reserva_id
       JOIN cancha c ON c.id = r.cancha_id
       JOIN complejo_deportivo k ON k.id = c.complejo_id`;

export async function listarAbiertos({ deporte, canchaId, complejoId }) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS}
       ${ORIGEN}
      WHERE p.estado = 'abierto'
        AND p.jugadores_actuales < p.jugadores_necesarios
        AND r.inicio > now()
        AND ($1::text IS NULL OR p.deporte = $1)
        AND ($2::int IS NULL OR c.id = $2)
        AND ($3::int IS NULL OR k.id = $3)
      ORDER BY r.inicio, p.id`,
    [deporte, canchaId, complejoId],
  );
  return rows;
}

export async function buscarPorId(id) {
  const { rows } = await pool.query(`SELECT ${COLUMNAS} ${ORIGEN} WHERE p.id = $1`, [id]);
  return rows[0];
}

export async function listarParticipantes(partidoId) {
  const { rows } = await pool.query(
    `SELECT u.id AS usuario_id, u.nombre, u.apellido, pp.fecha_union
       FROM participante_partido pp
       JOIN usuario u ON u.id = pp.usuario_id
      WHERE pp.partido_id = $1
      ORDER BY pp.id`,
    [partidoId],
  );
  return rows;
}
