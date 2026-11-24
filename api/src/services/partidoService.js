import { HttpError } from '../errores.js';
import * as partidoRepository from '../repositories/partidoRepository.js';

const DEPORTES = ['futbol', 'basquet', 'padel'];
const ID_MAXIMO = 2147483647; // el mayor INTEGER de PostgreSQL

// Devuelve el numero si es un id valido y 0 si no, asi un id roto termina en 404 y no en un error de la base.
function entero(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 && numero <= ID_MAXIMO ? numero : 0;
}

function filtroEntero(valor, nombre) {
  if (valor === undefined) return null;
  const numero = entero(valor);
  if (!numero) throw new HttpError(400, `${nombre} no es válido`);
  return numero;
}

async function buscarOFallar(id) {
  const partido = await partidoRepository.buscarPorId(entero(id));
  if (!partido) throw new HttpError(404, 'No existe ese partido');
  return partido;
}

export function abiertos(query) {
  if (query.deporte !== undefined && !DEPORTES.includes(query.deporte)) {
    throw new HttpError(400, `El deporte tiene que ser ${DEPORTES.join(', ')}`);
  }
  return partidoRepository.listarAbiertos({
    deporte: query.deporte ?? null,
    canchaId: filtroEntero(query.cancha_id, 'cancha_id'),
    complejoId: filtroEntero(query.complejo_id, 'complejo_id'),
  });
}

export async function detalle(id) {
  const partido = await buscarOFallar(id);
  return { ...partido, participantes: await partidoRepository.listarParticipantes(partido.id) };
}
