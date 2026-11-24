import { HttpError } from '../errores.js';
import { requerir } from '../validar.js';
import * as canchaRepository from '../repositories/canchaRepository.js';
import * as reservaRepository from '../repositories/reservaRepository.js';
import { FORMATO_FECHA, instanteDelTurno, horaEntera } from './tiempo.js';

const UNA_HORA = 60 * 60 * 1000;

export async function reservar(usuario, datos) {
  requerir(datos, ['cancha_id', 'fecha', 'hora']);
  const { fecha, hora } = datos;
  if (!FORMATO_FECHA.test(fecha)) throw new HttpError(400, 'La fecha tiene que tener el formato AAAA-MM-DD');
  if (!/^\d{2}:00$/.test(hora)) throw new HttpError(400, 'La hora tiene que ser en punto, por ejemplo 19:00');
  const inicio = instanteDelTurno(fecha, hora);
  if (!inicio) throw new HttpError(400, 'La fecha o la hora no existen');

  const cancha = await canchaRepository.buscarPorId(Number(datos.cancha_id) || 0);
  if (!cancha) throw new HttpError(404, 'No existe esa cancha');
  if (cancha.estado !== 'disponible') throw new HttpError(409, 'Esa cancha no está disponible');

  const h = horaEntera(hora);
  if (h < horaEntera(cancha.horario_apertura) || h >= horaEntera(cancha.horario_cierre)) {
    throw new HttpError(400, `Ese complejo atiende de ${cancha.horario_apertura} a ${cancha.horario_cierre}`);
  }
  if (inicio <= new Date()) throw new HttpError(400, 'Ese turno ya pasó');

  // El fin y el precio los calcula el servidor: el cliente no los manda.
  // El precio queda congelado en la reserva aunque el complejo lo cambie despues.
  return reservaRepository.crear({
    usuarioId: usuario.id,
    canchaId: cancha.id,
    inicio,
    fin: new Date(inicio.getTime() + UNA_HORA),
    precioTotal: cancha.precio_por_hora,
  });
}

export function misReservas(usuario) {
  return reservaRepository.listarDeUsuario(usuario.id);
}

export async function cancelar(usuario, id) {
  const reserva = await reservaRepository.buscarPorId(Number(id) || 0);
  if (!reserva) throw new HttpError(404, 'No existe esa reserva');
  if (reserva.usuario_id !== usuario.id) throw new HttpError(403, 'Esa reserva no es tuya');
  if (reserva.estado === 'cancelada') throw new HttpError(409, 'Esa reserva ya está cancelada');
  if (reserva.inicio <= new Date()) throw new HttpError(400, 'No se puede cancelar una reserva que ya empezó');
  return reservaRepository.cancelar(reserva.id);
}
