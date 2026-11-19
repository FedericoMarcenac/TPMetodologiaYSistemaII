export class ErrorApi extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

async function pedir(metodo, ruta, datos) {
  const token = localStorage.getItem('token');
  let respuesta;
  try {
    respuesta = await fetch(`/api${ruta}`, {
      method: metodo,
      headers: {
        ...(datos !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: datos === undefined ? undefined : JSON.stringify(datos),
    });
  } catch {
    throw new ErrorApi(0, 'No se pudo conectar con el servidor');
  }

  const cuerpo = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    // Token vencido o invalido: se borra la sesion y se avisa a SesionProvider.
    if (respuesta.status === 401 && token) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.dispatchEvent(new Event('sesion-vencida'));
    }
    throw new ErrorApi(respuesta.status, cuerpo?.error ?? 'Algo salió mal. Probá de nuevo');
  }
  return cuerpo;
}

export const api = {
  get: (ruta) => pedir('GET', ruta),
  post: (ruta, datos = {}) => pedir('POST', ruta, datos),
  put: (ruta, datos = {}) => pedir('PUT', ruta, datos),
  patch: (ruta, datos = {}) => pedir('PATCH', ruta, datos),
  delete: (ruta) => pedir('DELETE', ruta),
};
