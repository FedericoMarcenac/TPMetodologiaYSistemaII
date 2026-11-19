// Argentina no usa horario de verano: el desfase es siempre -03:00.
const DESFASE = '-03:00';

export const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// Devuelve el instante exacto de un turno, o null si la fecha o la hora no existen (por ejemplo 2026-02-30).
export function instanteDelTurno(fecha, hora) {
  // Date acepta 2026-02-30 y lo corre al 2 de marzo: se vuelve a leer la fecha para detectarlo.
  const dia = new Date(`${fecha}T00:00:00Z`);
  if (Number.isNaN(dia.getTime()) || dia.toISOString().slice(0, 10) !== fecha) return null;
  const instante = new Date(`${fecha}T${hora}:00${DESFASE}`);
  return Number.isNaN(instante.getTime()) ? null : instante;
}

export function horaEntera(hora) {
  return Number(hora.slice(0, 2));
}
