-- ============================================================
-- Turnito - datos de ejemplo
-- Se cargan solos junto con el esquema, para que la aplicacion
-- tenga contenido desde el primer arranque.
-- ============================================================

-- ---------- Complejos ----------
INSERT INTO complejo_deportivo (nombre, direccion, telefono, descripcion, horario_apertura, horario_cierre) VALUES
  ('Complejo Las Palmas', 'Av. Colon 1234, Bahia Blanca', '291-4567890',
   'Tres canchas de futbol 5 con cesped sintetico e iluminacion LED.', '09:00', '23:00'),
  ('Club Norte',          'Zelarrayan 850, Bahia Blanca',  '291-4112233',
   'Complejo con canchas de basquet y padel techadas.',                '10:00', '22:00');

-- ---------- Usuarios ----------
-- Contrasenia de todos: turnito123  (hasheada con bcrypt via pgcrypto)
INSERT INTO usuario (nombre, apellido, email, password_hash, telefono, rol, complejo_id) VALUES
  ('Ulises',   'Fossati',  'admin@turnito.com',    crypt('turnito123', gen_salt('bf', 10)), '291-5551111', 'administrador', 1),
  ('Ignacio',  'Alvarado', 'jugador@turnito.com',  crypt('turnito123', gen_salt('bf', 10)), '291-5552222', 'jugador',       NULL),
  ('Federico', 'Marcenac', 'fede@turnito.com',     crypt('turnito123', gen_salt('bf', 10)), '291-5553333', 'jugador',       NULL),
  ('Lucia',    'Gomez',    'lucia@turnito.com',    crypt('turnito123', gen_salt('bf', 10)), '291-5554444', 'jugador',       NULL);

-- ---------- Canchas ----------
INSERT INTO cancha (nombre, deporte, capacidad, precio_por_hora, estado, complejo_id) VALUES
  ('Cancha 1',        'futbol',  10, 18000.00, 'disponible',    1),
  ('Cancha 2',        'futbol',  10, 18000.00, 'disponible',    1),
  ('Cancha 3',        'futbol',  14, 24000.00, 'mantenimiento', 1),
  ('Padel A',         'padel',    4, 12000.00, 'disponible',    2),
  ('Padel B',         'padel',    4, 12000.00, 'disponible',    2),
  ('Basquet Central', 'basquet', 10, 20000.00, 'disponible',    2);

-- ---------- Reservas ----------
-- Se ubican en dias relativos a hoy para que la grilla siempre
-- muestre turnos ocupados, sin importar cuando se levante la base.
INSERT INTO reserva (inicio, fin, precio_total, usuario_id, cancha_id) VALUES
  (date_trunc('day', now()) + interval '1 day 19 hour',
   date_trunc('day', now()) + interval '1 day 20 hour', 18000.00, 2, 1),
  (date_trunc('day', now()) + interval '1 day 20 hour',
   date_trunc('day', now()) + interval '1 day 21 hour', 18000.00, 3, 1),
  (date_trunc('day', now()) + interval '2 day 21 hour',
   date_trunc('day', now()) + interval '2 day 22 hour', 12000.00, 4, 4),
  (date_trunc('day', now()) + interval '3 day 20 hour',
   date_trunc('day', now()) + interval '3 day 21 hour', 20000.00, 2, 6);

-- ---------- Partidos ----------
-- deporte, fecha y hora los completa el trigger desde la reserva.
-- El creador queda anotado automaticamente como participante.
INSERT INTO partido (jugadores_necesarios, reserva_id, creador_id) VALUES
  (10, 1, 2),   -- futbol: faltan jugadores
  (10, 4, 2),   -- basquet
  (4,  3, 4);   -- padel

-- Algunos jugadores ya sumados
INSERT INTO participante_partido (usuario_id, partido_id) VALUES
  (3, 1),
  (4, 1),
  (3, 3);
