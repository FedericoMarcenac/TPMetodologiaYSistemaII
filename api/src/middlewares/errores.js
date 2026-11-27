import { HttpError, traducirErrorPg } from '../errores.js';

export function rutaInexistente(req, res) {
  res.status(404).json({ error: 'No existe esa ruta' });
}

// Ultimo eslabon de la cadena: todo error que se lance en una ruta termina aca.
// Express lo reconoce como manejador de errores porque recibe 4 parametros, aunque no use el cuarto.
export function manejarErrores(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo del pedido no es un JSON válido' });
  }
  const traducido = traducirErrorPg(err);
  if (traducido) {
    return res.status(traducido[0]).json({ error: traducido[1] });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}
