export class HttpError extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

const UNICOS = {
  usuario_email_key: 'Ese email ya está registrado',
  partido_reserva_id_key: 'Esa reserva ya tiene un partido',
  participante_partido_partido_id_usuario_id_key: 'Ya estás anotado en este partido',
};

// Errores de PostgreSQL que son reglas de negocio rotas, no fallas del servidor.
export function traducirErrorPg(err) {
  switch (err.code) {
    case '23P01':
      return [409, 'Ese turno ya está reservado'];
    case '23505':
      return [409, UNICOS[err.constraint] ?? 'Ese dato ya existe'];
    case '23514':
      // Los CHECK de las tablas traen el nombre de la restriccion; el trigger de cupo no.
      return err.constraint ? [400, 'Datos inválidos'] : [409, err.message];
    case '23503':
      return [400, 'Hace referencia a un dato que no existe'];
    case '22P02':
    case '22007':
    case '22008':
      return [400, 'Datos con formato inválido'];
    default:
      return null;
  }
}
