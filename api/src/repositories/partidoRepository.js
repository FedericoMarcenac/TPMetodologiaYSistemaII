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

// La reserva con lo que hace falta para decidir si se puede publicar un partido.
export async function buscarReserva(id) {
  const { rows } = await pool.query(
    `SELECT r.id, r.usuario_id, r.estado, r.inicio > now() AS es_futura, c.capacidad
       FROM reserva r
       JOIN cancha c ON c.id = r.cancha_id
      WHERE r.id = $1`,
    [id],
  );
  return rows[0];
}

// Solo devuelve el id: el RETURNING sale antes de que el trigger anote al creador,
// asi que jugadores_actuales vendria en 0. El servicio lee el partido despues.
export async function crear({ reservaId, creadorId, jugadoresNecesarios }) {
  const { rows } = await pool.query(
    `INSERT INTO partido (jugadores_necesarios, reserva_id, creador_id)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [jugadoresNecesarios, reservaId, creadorId],
  );
  return rows[0].id;
}

export async function agregarParticipante(partidoId, usuarioId) {
  await pool.query('INSERT INTO participante_partido (usuario_id, partido_id) VALUES ($1, $2)', [usuarioId, partidoId]);
}

// Devuelve cuantas filas borro: 0 si el usuario no estaba anotado.
export async function quitarParticipante(partidoId, usuarioId) {
  const { rowCount } = await pool.query(
    'DELETE FROM participante_partido WHERE partido_id = $1 AND usuario_id = $2',
    [partidoId, usuarioId],
  );
  return rowCount;
}