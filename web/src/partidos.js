export const DEPORTES = { futbol: 'Fútbol', basquet: 'Básquet', padel: 'Pádel' };

function diaLocal(fecha) {
  // Al mediodia para que ninguna zona horaria lo corra al dia anterior.
  return new Date(`${fecha}T12:00:00`);
}

// '2026-11-21' -> 'Hoy', 'Mañana' o 'sáb 21 nov'
export function fechaCorta(fecha) {
  const dia = diaLocal(fecha);
  const hoy = new Date();
  hoy.setHours(12, 0, 0, 0);
  const diferencia = Math.round((dia - hoy) / 86400000);
  if (diferencia === 0) return 'Hoy';
  if (diferencia === 1) return 'Mañana';
  return dia.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
}

// '2026-11-21' -> 'sábado 21 de noviembre'
export function fechaLarga(fecha) {
  return diaLocal(fecha).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function lugaresLibres(partido) {
  return Math.max(partido.jugadores_necesarios - partido.jugadores_actuales, 0);
}

export function textoFaltan(cantidad) {
  return cantidad === 1 ? 'Falta 1' : `Faltan ${cantidad}`;
}
