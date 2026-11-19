import { HttpError } from '../errores.js';
import { verificarToken } from '../services/authService.js';

export function requireAuth(req, res, next) {
  const [tipo, token] = (req.headers.authorization ?? '').split(' ');
  if (tipo !== 'Bearer' || !token) {
    throw new HttpError(401, 'Tenés que iniciar sesión');
  }
  req.usuario = verificarToken(token);
  next();
}

// Va siempre despues de requireAuth, que es el que carga req.usuario.
export function requireRol(rol) {
  return (req, res, next) => {
    if (req.usuario.rol !== rol) {
      throw new HttpError(403, 'No tenés permiso para hacer esto');
    }
    next();
  };
}
