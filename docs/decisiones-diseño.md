# Decisiones de diseño

Caso analizado: dónde viven las reglas de negocio de reservas y partidos.
¿En la base de datos o en la API?

## 1. Código analizado

(Ulises: la tabla de las 7 reglas, con archivo y líneas)

## 2. Diagnóstico

### 2.1 Reservas

(Fede: reglas 1, 2 y 7)

### 2.2 Partidos

Cubre las reglas 3 a 6: el partido copia deporte, fecha y hora de su reserva, el creador queda anotado, se cuentan los jugadores y se pasa a completo, y no se anota más gente que el cupo.

Una cosa por trigger (SRP). Cada trigger tiene una sola razón para cambiar:

Trigger	Evento	Qué hace	Código
trg_partido_datos	BEFORE INSERT en partido	Copia deporte, fecha y hora desde la reserva	db/01-schema.sql:156-171
trg_partido_creador	AFTER INSERT en partido	Anota al creador como primer participante	db/01-schema.sql:174-186
trg_participante_cambio	AFTER INSERT o DELETE en participante_partido	Recalcula jugadores_actuales y el estado	db/01-schema.sql:189-216
trg_participante_cupo (nuevo)	BEFORE INSERT en participante_partido	Rechaza la inscripción si el partido no está abierto	final de db/01-schema.sql

Parecido a Observer. Quien inserta un partido o un participante no sabe que hay triggers: la base reacciona sola al evento. Es una analogía y no el patrón literal del GoF (no hay una lista de observadores registrados), pero la idea es la misma: algo reacciona a un evento sin que quien lo dispara lo conozca.

La carrera del contador. trg_participante_cambio cuenta los participantes y después actualiza el partido. Son dos pasos, y entre uno y otro otra transacción puede meterse. Con el partido 1 en 3 anotados y dos personas (A y B) sumándose a la vez:

A inserta su fila y el trigger cuenta: ve 4 (los 3 más el suyo). Todavía no confirmó.
B inserta la suya y el trigger cuenta: también ve 4, porque la fila de A no está confirmada y no la ve.
A actualiza jugadores_actuales = 4 y confirma. B esperaba por el bloqueo de la fila; cuando se libera, escribe también 4.
Resultado: 5 anotados y el contador en 4.

Es el mismo problema de "verificar y después actuar" que ya resolvimos para las reservas con EXCLUDE, pero sin resolver para el cupo.

Sobrecupo. Nada impedía anotar a alguien en un partido ya completo. El UNIQUE (partido_id, usuario_id) solo evita anotarse dos veces. Se podía llegar, por ejemplo, a 5 anotados en un partido de pádel de 4 lugares.

El RETURNING devuelve 0. Al publicar un partido, el INSERT ... RETURNING informa jugadores_actuales = 0, porque el trigger que anota al creador es AFTER y corre después de que se arma el RETURNING. Es un efecto secundario que no se ve donde ocurre (Clean Code). No lo cambiamos: queda documentado, y la API tendrá que hacer un SELECT aparte, que ya da 1.

Qué hicimos. Agregamos trg_participante_cupo, que toma un SELECT ... FOR UPDATE sobre la fila del partido antes de insertar al participante. El bloqueo serializa las inscripciones: la segunda espera a que termine la primera y recién entonces ve si el partido sigue abierto. Es BEFORE y no AFTER porque tiene que bloquear y rechazar antes de que la fila exista; así, cuando corre trg_participante_cambio (AFTER), la inscripción ya fue aceptada y la fila del partido ya está bloqueada por nosotros. Se suma sin tocar los tres triggers anteriores (OCP).

### 2.3 Conceptos aplicados

(Ulises)

## 3. Alternativas

(Ulises: A, B, C y D)

## 4. Decisión

(Ulises: el criterio y qué se cambió)

## 5. Evidencia y trade-offs

### 5.1 Pruebas de reservas

(Fede: antes y después de la cancelación)

### 5.2 Pruebas de partidos

Se corrieron sobre una base recién creada (docker compose down -v && docker compose up -d), con dos terminales de psql. Primero sin trg_participante_cupo y después con él.

Prueba 1: dos personas se suman al partido 1 a la vez. Con un usuario extra (id 5):

sql
-- Terminal 1: un usuario mas para la prueba
INSERT INTO usuario (nombre, apellido, email, password_hash)
VALUES ('Prueba', 'Uno', 'prueba@turnito.com', 'x');

-- Terminal 1: se suma el usuario 1 y NO confirma todavia
BEGIN;
INSERT INTO participante_partido (usuario_id, partido_id) VALUES (1, 1);

-- Terminal 2: se suma el usuario 5 al mismo partido (se queda esperando)
INSERT INTO participante_partido (usuario_id, partido_id) VALUES (5, 1);

-- Terminal 1: confirmar
COMMIT;

-- Cualquiera de las dos:
SELECT jugadores_actuales,
       (SELECT count(*) FROM participante_partido WHERE partido_id = 1) AS anotados
  FROM partido WHERE id = 1;

Prueba 2: sumar a un quinto en el partido de pádel (4 lugares). El partido 3 arranca con 2 anotados. Se suman los usuarios 1 y 2 (queda completo, 4 de 4) y se intenta sumar al usuario 5. Para medir el caso sin el trigger, sin recrear la base, se hizo dentro de una transacción y se deshizo:

sql
BEGIN;
DROP TRIGGER trg_participante_cupo ON participante_partido;
INSERT INTO participante_partido (usuario_id, partido_id) VALUES (5, 3);
SELECT id, estado, jugadores_necesarios, jugadores_actuales FROM partido WHERE id = 3;
ROLLBACK;  -- el trigger vuelve a existir
Prueba	Sin trg_participante_cupo	Con trg_participante_cupo
Dos personas se suman al partido 1 a la vez	jugadores_actuales = 4, anotados = 5	jugadores_actuales = 5, anotados = 5
Sumar un quinto en el pádel (4 lugares)	Entra: queda 5 de 4, estado completo	Rechazado: "El partido ya no tiene lugar" (check_violation, 23514)

Costos. La regla ahora vive en la base y se lee en el esquema, no en el código de la API. Un trigger no se puede probar sin una base levantada, por eso la evidencia son estas pruebas en psql. Cuando exista la API, tendrá que traducir el error 23514 a un 409 con el mismo mensaje.

### 5.3 Beneficios y costos

(Ulises)
