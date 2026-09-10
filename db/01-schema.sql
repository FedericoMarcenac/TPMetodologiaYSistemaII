-- ============================================================
-- Turnito - esquema de la base de datos
--
-- Implementa las 6 entidades definidas en el documento del
-- proyecto, con todos sus atributos.
--
-- Este archivo lo ejecuta PostgreSQL automaticamente la primera
-- vez que se crea el volumen. No hay que correr migraciones.
-- ============================================================

-- Necesaria para la restriccion de exclusion de reserva (ver mas abajo).
CREATE EXTENSION IF NOT EXISTS btree_gist;
-- Para hashear con bcrypt las contrasenias de los datos de ejemplo.
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 2. ComplejoDeportivo
-- ============================================================
CREATE TABLE complejo_deportivo (
  id               SERIAL PRIMARY KEY,
  nombre           TEXT NOT NULL,
  direccion        TEXT NOT NULL,
  telefono         TEXT,
  descripcion      TEXT,
  horario_apertura TIME NOT NULL DEFAULT '09:00',
  horario_cierre   TIME NOT NULL DEFAULT '23:00',
  CHECK (horario_cierre > horario_apertura)
);


-- ============================================================
-- 1. Usuario
--
-- La contrasenia se guarda hasheada con bcrypt, nunca en texto
-- plano; por eso la columna se llama password_hash.
--
-- complejo_id NO esta en el documento original: se agrego para
-- saber de que complejo es administrador un usuario con rol
-- 'administrador'. Sin esto, cualquier admin podria editar las
-- canchas de cualquier complejo. Para los jugadores queda NULL.
-- ============================================================
CREATE TABLE usuario (
  id             SERIAL PRIMARY KEY,
  nombre         TEXT NOT NULL,
  apellido       TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  telefono       TEXT,
  rol            TEXT NOT NULL DEFAULT 'jugador'
                 CHECK (rol IN ('jugador', 'administrador')),
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now(),
  complejo_id    INT REFERENCES complejo_deportivo(id) ON DELETE SET NULL,
  CHECK (rol = 'jugador' OR complejo_id IS NOT NULL)
);


-- ============================================================
-- 3. Cancha
-- ============================================================
CREATE TABLE cancha (
  id              SERIAL PRIMARY KEY,
  nombre          TEXT NOT NULL,
  deporte         TEXT NOT NULL CHECK (deporte IN ('futbol', 'basquet', 'padel')),
  capacidad       INT  NOT NULL CHECK (capacidad > 0),
  precio_por_hora NUMERIC(10,2) NOT NULL CHECK (precio_por_hora >= 0),
  estado          TEXT NOT NULL DEFAULT 'disponible'
                  CHECK (estado IN ('disponible', 'mantenimiento', 'inactiva')),
  complejo_id     INT NOT NULL REFERENCES complejo_deportivo(id) ON DELETE CASCADE
);

CREATE INDEX idx_cancha_complejo ON cancha (complejo_id);


-- ============================================================
-- 4. Reserva
--
-- El documento pide fecha, horaInicio y horaFin. Guardarlos como
-- tres columnas sueltas complica las consultas de superposicion y
-- se rompe con turnos que cruzan la medianoche. Entonces se guarda
-- un unico rango (inicio, fin) de tipo TIMESTAMPTZ, y los tres
-- atributos del documento existen como COLUMNAS GENERADAS: se
-- calculan solas y no pueden quedar desincronizadas.
--
-- precio_total es una copia congelada del precio al momento de
-- reservar: si el complejo cambia la tarifa, las reservas ya
-- hechas conservan el precio que se cobro.
--
-- reserva_sin_solape es la restriccion central del sistema:
-- impide fisicamente que dos reservas se pisen sobre la misma
-- cancha, sin importar cuantos pedidos lleguen a la vez.
-- ============================================================
CREATE TABLE reserva (
  id           SERIAL PRIMARY KEY,
  inicio       TIMESTAMPTZ NOT NULL,
  fin          TIMESTAMPTZ NOT NULL,

  fecha        DATE GENERATED ALWAYS AS
                 ((inicio AT TIME ZONE 'America/Argentina/Buenos_Aires')::date) STORED,
  hora_inicio  TIME GENERATED ALWAYS AS
                 ((inicio AT TIME ZONE 'America/Argentina/Buenos_Aires')::time) STORED,
  hora_fin     TIME GENERATED ALWAYS AS
                 ((fin    AT TIME ZONE 'America/Argentina/Buenos_Aires')::time) STORED,

  precio_total NUMERIC(10,2) NOT NULL,
  estado       TEXT NOT NULL DEFAULT 'confirmada'
               CHECK (estado IN ('confirmada', 'cancelada')),
  creada_en    TIMESTAMPTZ NOT NULL DEFAULT now(),

  usuario_id   INT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  cancha_id    INT NOT NULL REFERENCES cancha(id)  ON DELETE CASCADE,

  CHECK (fin > inicio),

  CONSTRAINT reserva_sin_solape EXCLUDE USING gist (
    cancha_id                    WITH =,
    tstzrange(inicio, fin, '[)') WITH &&
  ) WHERE (estado <> 'cancelada')
);

CREATE INDEX idx_reserva_cancha_inicio ON reserva (cancha_id, inicio);
CREATE INDEX idx_reserva_usuario       ON reserva (usuario_id);


-- ============================================================
-- 5. Partido
--
-- Todo partido nace de una reserva, por eso reserva_id es
-- NOT NULL UNIQUE (una reserva genera como maximo un partido).
--
-- deporte, fecha y hora son datos que ya viven en la reserva y la
-- cancha. Se guardan igual porque el documento los pide, pero los
-- completa un trigger al insertar, para que nunca contradigan a
-- la reserva de la que salen.
--
-- jugadores_actuales tambien lo mantiene un trigger, contando la
-- tabla participante_partido.
-- ============================================================
CREATE TABLE partido (
  id                   SERIAL PRIMARY KEY,
  deporte              TEXT,
  fecha                DATE,
  hora                 TIME,
  jugadores_necesarios INT NOT NULL CHECK (jugadores_necesarios > 0),
  jugadores_actuales   INT NOT NULL DEFAULT 0,
  estado               TEXT NOT NULL DEFAULT 'abierto'
                       CHECK (estado IN ('abierto', 'completo', 'cancelado')),
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT now(),

  reserva_id           INT NOT NULL UNIQUE REFERENCES reserva(id) ON DELETE CASCADE,
  creador_id           INT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE
);


-- ============================================================
-- 6. ParticipantePartido
-- El UNIQUE impide que la misma persona se anote dos veces.
-- ============================================================
CREATE TABLE participante_partido (
  id          SERIAL PRIMARY KEY,
  usuario_id  INT NOT NULL REFERENCES usuario(id)  ON DELETE CASCADE,
  partido_id  INT NOT NULL REFERENCES partido(id)  ON DELETE CASCADE,
  fecha_union TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (partido_id, usuario_id)
);

CREATE INDEX idx_participante_partido ON participante_partido (partido_id);


-- ============================================================
-- TRIGGERS
-- ============================================================

-- Completa deporte, fecha y hora del partido a partir de su reserva.
CREATE OR REPLACE FUNCTION partido_datos_desde_reserva()
RETURNS TRIGGER AS $$
BEGIN
  SELECT c.deporte, r.fecha, r.hora_inicio
    INTO NEW.deporte, NEW.fecha, NEW.hora
    FROM reserva r
    JOIN cancha  c ON c.id = r.cancha_id
   WHERE r.id = NEW.reserva_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_partido_datos
BEFORE INSERT ON partido
FOR EACH ROW EXECUTE FUNCTION partido_datos_desde_reserva();


-- Anota automaticamente al creador como primer participante.
CREATE OR REPLACE FUNCTION partido_sumar_creador()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO participante_partido (usuario_id, partido_id)
  VALUES (NEW.creador_id, NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_partido_creador
AFTER INSERT ON partido
FOR EACH ROW EXECUTE FUNCTION partido_sumar_creador();


-- Recalcula jugadores_actuales y el estado cada vez que alguien
-- se suma o se baja de un partido.
CREATE OR REPLACE FUNCTION actualizar_jugadores_partido()
RETURNS TRIGGER AS $$
DECLARE
  v_partido_id INT := COALESCE(NEW.partido_id, OLD.partido_id);
  v_total      INT;
BEGIN
  SELECT count(*) INTO v_total
    FROM participante_partido
   WHERE partido_id = v_partido_id;

  UPDATE partido
     SET jugadores_actuales = v_total,
         estado = CASE
                    WHEN estado = 'cancelado'              THEN 'cancelado'
                    WHEN v_total >= jugadores_necesarios   THEN 'completo'
                    ELSE 'abierto'
                  END
   WHERE id = v_partido_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_participante_cambio
AFTER INSERT OR DELETE ON participante_partido
FOR EACH ROW EXECUTE FUNCTION actualizar_jugadores_partido();
