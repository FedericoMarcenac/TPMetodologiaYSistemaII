# Decisiones de diseño

Caso analizado: dónde viven las reglas de negocio de reservas y partidos.
¿En la base de datos o en la API?

## 1. Código analizado

(Ulises: la tabla de las 7 reglas, con archivo y líneas)

## 2. Diagnóstico

### 2.1 Reservas

**Regla 1: que dos reservas no se pisen.** Lo primero que se nos ocurre
es hacer un `SELECT` para ver si el turno está libre y después un
`INSERT`. El problema es que si dos personas reservan al mismo tiempo,
las dos ven el turno libre y las dos lo ocupan. Es una condición de
carrera: entre mirar y escribir, el dato cambió.

Por eso lo resolvimos en la base con una restricción `EXCLUDE`
(`reserva_sin_solape`, `db/01-schema.sql:104-107`). Compara la cancha
y el rango de tiempo en una sola operación, así que si dos reservas se
superponen, la base rechaza la segunda con el código `23P01`. Más
adelante la API va a traducir ese error a un 409. La restricción ignora
las reservas canceladas, entonces un turno cancelado queda libre.

El rango se define con `'[)'`: incluye el inicio y excluye el final.
Por eso un turno de 21 a 22 se puede reservar justo después de uno de
20 a 21, porque las 21:00 pertenecen solo al segundo.

**Regla 2: fecha y horas.** El documento del proyecto pide `fecha`,
`hora_inicio` y `hora_fin`. Si las guardáramos como tres columnas
sueltas, podrían quedar inconsistentes y se complicarían las consultas
de solape. Por eso guardamos solo `inicio` y `fin`, que siempre van
juntos (se comportan como un Value Object), y los otros tres datos son
columnas generadas (`db/01-schema.sql:87-92`): se calculan solos a
partir de esos dos, así que no se pueden desincronizar.

**Regla 7: cancelar la reserva cancela el partido.** Antes, si se
cancelaba una reserva, el partido seguía abierto sobre un turno que ya
no existía. Lo arreglamos con el trigger `trg_reserva_cancelada`. Se
ejecuta después de actualizar el estado de la reserva, y la condición
`WHEN` hace que solo actúe cuando la reserva pasa a cancelada, no en
cualquier otro cambio. El trigger hace una sola cosa (SRP) y reacciona
a un evento sin que quien cancela lo sepa (Observer).

### 2.2 Partidos

(Nacho: reglas 3 a 6)

### 2.3 Conceptos aplicados

(Ulises)

## 3. Alternativas

(Ulises: A, B, C y D)

## 4. Decisión

(Ulises: el criterio y qué se cambió)

## 5. Evidencia y trade-offs

### 5.1 Pruebas de reservas

Los primeros cinco casos ya estaban verificados en el README del repositorio. El último lo probamos en esta rama, sobre la base recién creada con el esquema y el seed.

| Caso | Resultado |
|---|---|
| Mismo turno exacto | Rechazado (23P01) |
| Solape parcial (19:30–20:30 sobre 19:00–20:00) | Rechazado (23P01) |
| Turno pegado (21:00–22:00 después de 20:00–21:00) | Aceptado |
| Mismo horario en otra cancha | Aceptado |
| Turno liberado tras cancelar | Aceptado |
| Cancelar la reserva 4 (partido 2) | Sin trigger queda `abierto`; con trigger pasa a `cancelado` |

Prueba de la cancelación:

    UPDATE reserva SET estado = 'cancelada' WHERE id = 4;
    SELECT id, estado FROM partido WHERE id = 2;

Sin el trigger, nada cambia el estado del partido cuando se cancela la reserva, así que el partido sigue abierto.

Con el trigger:

     id |  estado
    ----+-----------
      2 | cancelado

El trigger evita que quede un partido abierto sobre una reserva que ya
no existe. Es un costo mínimo: una sola función y un solo trigger.

### 5.2 Pruebas de partidos

(Nacho: antes y después de los dos a la vez)

### 5.3 Beneficios y costos

(Ulises)
