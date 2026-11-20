import { HttpError } from '../errores.js';
import { requerir } from '../validar.js';
import * as partidoRepository from '../repositories/partidoRepository.js';

const DEPORTES = ['futbol', 'basquet', 'padel'];
const ID_MAXIMO = 2147483647; // el mayor INTEGER de PostgreSQL
const MINIMO_JUGADORES = 2;

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

export async function publicar(usuario, datos) {
  requerir(datos, ['reserva_id', 'jugadores_necesarios']);

  const reserva = await partidoRepository.buscarReserva(entero(datos.reserva_id));
  if (!reserva) throw new HttpError(404, 'No existe esa reserva');
  if (reserva.usuario_id !== usuario.id) throw new HttpError(403, 'Esa reserva no es tuya');
  if (reserva.estado !== 'confirmada') throw new HttpError(400, 'Solo se puede publicar una reserva confirmada');
  if (!reserva.es_futura) throw new HttpError(400, 'Solo se puede publicar una reserva futura');

  const necesarios = Number(datos.jugadores_necesarios);
  if (!Number.isInteger(necesarios) || necesarios < MINIMO_JUGADORES || necesarios > reserva.capacidad) {
    throw new HttpError(400, `Los jugadores necesarios tienen que ser un número entero entre ${MINIMO_JUGADORES} y ${reserva.capacidad}`);
  }

  // Si la reserva ya tiene partido, el UNIQUE de la base lo frena y el manejador de errores lo devuelve como 409.
  const id = await partidoRepository.crear({
    reservaId: reserva.id,
    creadorId: usuario.id,
    jugadoresNecesarios: necesarios,
  });
  // SELECT aparte: el RETURNING del INSERT no trae al creador contado.
  return detalle(id);
}

export async function sumarse(usuario, id) {
  const partido = await buscarOFallar(id);
  // El cupo no se controla aca: lo frena el trigger de la base, que bloquea la fila del partido.
  await partidoRepository.agregarParticipante(partido.id, usuario.id);
  return detalle(partido.id);
}

export async function bajarse(usuario, id) {
  const partido = await buscarOFallar(id);
  if (partido.creador_id === usuario.id) {
    throw new HttpError(403, 'Sos el creador del partido: para dejarlo tenés que cancelar la reserva');
  }
  const quitados = await partidoRepository.quitarParticipante(partido.id, usuario.id);
  if (!quitados) throw new HttpError(404, 'No estás anotado en este partido');
  return detalle(partido.id);
}