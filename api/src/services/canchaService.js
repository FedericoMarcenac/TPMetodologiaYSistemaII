import { HttpError } from '../errores.js';
import * as complejoRepository from '../repositories/complejoRepository.js';
import * as canchaRepository from '../repositories/canchaRepository.js';
import * as reservaRepository from '../repositories/reservaRepository.js';
import { FORMATO_FECHA, instanteDelTurno, horaEntera } from './tiempo.js';

const DEPORTES = ['futbol', 'basquet', 'padel'];

export function listarComplejos() {
  return complejoRepository.listar();
}

export function listar({ deporte, complejo_id }) {
  if (deporte !== undefined && !DEPORTES.includes(deporte)) {
    throw new HttpError(400, `El deporte tiene que ser ${DEPORTES.join(', ')}`);
  }
  let complejoId;
  if (complejo_id !== undefined) {
    complejoId = Number(complejo_id);
    if (!Number.isInteger(complejoId)) throw new HttpError(400, 'El complejo no es válido');
  }
  return canchaRepository.listar({ deporte, complejoId });
}

export async function disponibilidad(id, fecha) {
  if (!fecha || !FORMATO_FECHA.test(fecha) || !instanteDelTurno(fecha, '00:00')) {
    throw new HttpError(400, 'La fecha tiene que tener el formato AAAA-MM-DD');
  }
  const cancha = await canchaRepository.buscarPorId(Number(id) || 0);
  if (!cancha) throw new HttpError(404, 'No existe esa cancha');

  const ocupadas = await reservaRepository.horasOcupadas(cancha.id, fecha);
  const ahora = new Date();
  const turnos = [];
  // Cada turno dura una hora: el ultimo empieza una hora antes del cierre.
  for (let h = horaEntera(cancha.horario_apertura); h < horaEntera(cancha.horario_cierre); h++) {
    const hora = `${String(h).padStart(2, '0')}:00`;
    let estado = 'libre';
    if (instanteDelTurno(fecha, hora) <= ahora) estado = 'pasado';
    else if (ocupadas.includes(hora) || cancha.estado !== 'disponible') estado = 'ocupado';
    turnos.push({ hora, estado });
  }
  return turnos;
}
