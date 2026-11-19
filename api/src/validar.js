import { HttpError } from './errores.js';

export function requerir(datos, campos) {
  const faltan = campos.filter((campo) => {
    const valor = datos?.[campo];
    return valor === undefined || valor === null || String(valor).trim() === '';
  });
  if (faltan.length) {
    throw new HttpError(400, `Faltan datos: ${faltan.join(', ')}`);
  }
}
