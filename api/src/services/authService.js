import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { HttpError } from '../errores.js';
import { requerir } from '../validar.js';
import * as usuarioRepository from '../repositories/usuarioRepository.js';

const SECRETO = process.env.JWT_SECRET;
if (!SECRETO) {
  throw new Error('Falta la variable de entorno JWT_SECRET');
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generarToken(usuario) {
  const token = jwt.sign(
    { id: usuario.id, rol: usuario.rol, complejo_id: usuario.complejo_id },
    SECRETO,
    { expiresIn: '7d' },
  );
  return { token, usuario };
}

export async function registrar(datos) {
  requerir(datos, ['nombre', 'apellido', 'email', 'password']);
  const email = datos.email.trim().toLowerCase();
  if (!EMAIL.test(email)) throw new HttpError(400, 'El email no es válido');
  if (datos.password.length < 6) throw new HttpError(400, 'La contraseña tiene que tener al menos 6 caracteres');

  // El rol no se toma del pedido: desde el registro solo se crean jugadores.
  const usuario = await usuarioRepository.crear({
    nombre: datos.nombre.trim(),
    apellido: datos.apellido.trim(),
    email,
    passwordHash: await bcrypt.hash(datos.password, 10),
    telefono: datos.telefono?.trim() || null,
  });
  return generarToken(usuario);
}

export async function login(datos) {
  requerir(datos, ['email', 'password']);
  const encontrado = await usuarioRepository.buscarPorEmailConPassword(datos.email.trim().toLowerCase());
  // Mismo mensaje si el email no existe o la contraseña no coincide: no se revela qué emails están registrados.
  if (!encontrado || !(await bcrypt.compare(datos.password, encontrado.password_hash))) {
    throw new HttpError(401, 'Email o contraseña incorrectos');
  }
  const { password_hash, ...usuario } = encontrado;
  return generarToken(usuario);
}

export function verificarToken(token) {
  try {
    const { id, rol, complejo_id } = jwt.verify(token, SECRETO);
    return { id, rol, complejo_id };
  } catch {
    throw new HttpError(401, 'La sesión no es válida o venció. Volvé a entrar');
  }
}

export async function perfil(id) {
  const usuario = await usuarioRepository.buscarPorId(id);
  if (!usuario) throw new HttpError(401, 'La sesión no es válida o venció. Volvé a entrar');
  return usuario;
}
