import { pool } from '../db.js';

const PUBLICOS = 'id, nombre, apellido, email, telefono, rol, fecha_registro, complejo_id';

export async function buscarPorEmailConPassword(email) {
  const { rows } = await pool.query(`SELECT ${PUBLICOS}, password_hash FROM usuario WHERE email = $1`, [email]);
  return rows[0];
}

export async function buscarPorId(id) {
  const { rows } = await pool.query(`SELECT ${PUBLICOS} FROM usuario WHERE id = $1`, [id]);
  return rows[0];
}

export async function crear({ nombre, apellido, email, passwordHash, telefono }) {
  const { rows } = await pool.query(
    `INSERT INTO usuario (nombre, apellido, email, password_hash, telefono)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${PUBLICOS}`,
    [nombre, apellido, email, passwordHash, telefono ?? null],
  );
  return rows[0];
}
