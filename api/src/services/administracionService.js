import { HttpError } from '../errores.js';
import { requerir } from '../validar.js';
import * as administracionRepository from '../repositories/administracionRepository.js';

const DEPORTES = ['futbol', 'basquet', 'padel'];
const ESTADOS = ['disponible', 'mantenimiento', 'inactiva'];

function validarCancha(datos) {
  requerir(datos, ['nombre', 'deporte', 'capacidad', 'precio_por_hora']);
  const cancha = {
    nombre: String(datos.nombre).trim(),
    deporte: datos.deporte,
    capacidad: Number(datos.capacidad),
    precio_por_hora: Number(datos.precio_por_hora),
    estado: datos.estado ?? 'disponible',
  };
  if (!DEPORTES.includes(cancha.deporte)) throw new HttpError(400, `El deporte tiene que ser ${DEPORTES.join(', ')}`);
  if (!Number.isInteger(cancha.capacidad) || cancha.capacidad <= 0) throw new HttpError(400, 'La capacidad tiene que ser un número entero mayor a 0');
  if (!Number.isFinite(cancha.precio_por_hora) || cancha.precio_por_hora < 0) throw new HttpError(400, 'El precio por hora no es válido');
  if (!ESTADOS.includes(cancha.estado)) throw new HttpError(400, `El estado tiene que ser ${ESTADOS.join(', ')}`);
  return cancha;
}

// El complejo sale siempre del token, nunca del pedido: un administrador solo ve y toca el suyo.
export function complejo(usuario) {
  return administracionRepository.buscarComplejo(usuario.complejo_id);
}

export function canchas(usuario) {
  return administracionRepository.listarCanchas(usuario.complejo_id);
}

export function crearCancha(usuario, datos) {
  return administracionRepository.crearCancha(usuario.complejo_id, validarCancha(datos));
}

export async function editarCancha(usuario, id, datos) {
  const cancha = await administracionRepository.buscarCancha(Number(id) || 0);
  if (!cancha) throw new HttpError(404, 'No existe esa cancha');
  if (cancha.complejo_id !== usuario.complejo_id) throw new HttpError(403, 'Esa cancha es de otro complejo');
  return administracionRepository.actualizarCancha(cancha.id, validarCancha(datos));
}

export function reservasDelDia(usuario, fecha) {
  if (fecha !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new HttpError(400, 'La fecha tiene que tener el formato AAAA-MM-DD');
  }
  return administracionRepository.listarReservasDelDia(usuario.complejo_id, fecha);
}
