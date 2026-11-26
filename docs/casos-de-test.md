# Casos de test

Qué prueban los tests automáticos de la API, de qué tipo es cada caso y por qué lo elegimos.

## Cómo se corren

```bash
docker compose up -d
docker compose exec api npm test
```

Los tests usan `node:test` y `supertest`, y le pegan a la base real del contenedor (la del seed). Los que escriben datos los borran al terminar, o trabajan dentro de una transacción que se deshace.

## Cómo elegimos los casos

No intentamos probar todo. Elegimos tres tipos de caso por cada funcionalidad:

- **Normal:** el camino principal, lo que hace el usuario el 90 % de las veces. Si falla, la app no sirve.
- **Límite:** el borde de una regla (el último lugar de un partido, un turno pegado a otro, un día que ya pasó). Es donde más se rompen las cosas.
- **Error:** lo que la API tiene que rechazar, con el código HTTP correcto y un mensaje claro: datos inválidos, falta de sesión o de permiso, conflictos.

Priorizamos las reglas que no se pueden romper (que no haya dos reservas en el mismo turno, que un partido no pase su cupo) y los permisos (que nadie toque lo que no es suyo).

## Base de la API y errores (`app.test.js`, `errores.test.js`) · Ulises

| Caso | Tipo | Por qué |
|---|---|---|
| `GET /api/salud` responde ok con la base conectada | Normal | Si la API no llega a la base, no funciona nada más. Es lo primero que conviene ver cuando algo falla. |
| Una ruta que no existe devuelve 404 con `{ error }` | Error | Todos los errores tienen que tener la misma forma para que el front los muestre igual. |
| Un JSON mal formado devuelve 400 | Error | Un pedido roto del cliente no puede terminar en un 500. |
| Turno superpuesto: 409 | Límite | Es la regla central del sistema. La frena la restricción `EXCLUDE` de la base y la API la tiene que traducir a un 409 entendible. |
| Email repetido: 409 | Error | Lo frena el `UNIQUE` de la base, no un `SELECT` previo. |
| Reserva que ya tiene partido: 409 | Error | Cada reserva admite un solo partido (`reserva_id UNIQUE`). |
| Sumarse dos veces al mismo partido: 409 | Error | Lo frena la clave primaria de `participante_partido`. |
| Partido sin lugar (trigger de cupo): 409 | Límite | Se completa el partido y se intenta un jugador más. Comprueba que el trigger frena y que el mensaje llega al usuario. |
| `CHECK` de una tabla: 400, no 409 | Error | Un dato inválido no es un conflicto. Si los mezclamos, el front muestra un mensaje equivocado. |
| Un error que no es de negocio no se traduce | Error | Un bug de verdad tiene que dar 500 y quedar en el log, no disfrazarse de error del usuario. |
| Los precios llegan como número y las fechas como texto | Normal | `pg` devuelve `NUMERIC` como texto: sin la conversión, sumar precios concatena strings. |

Estos tests provocan el error real en la base (dentro de una transacción que se deshace), así prueban la regla de la base y la traducción de la API juntas.

## Autenticación (`auth.test.js`) · Ulises

| Caso | Tipo | Por qué |
|---|---|---|
| Login con un usuario del seed devuelve token y usuario, sin la contraseña | Normal | Es el camino principal, y además comprueba que el hash nunca sale de la API. |
| Login ignora mayúsculas y espacios en el email | Límite | La gente escribe el email como sale, sobre todo en el celular. |
| Contraseña incorrecta y email inexistente dan el mismo 401 | Error | Si el mensaje fuera distinto, se podría averiguar qué emails están registrados. |
| Registrar crea un jugador aunque el pedido diga otro rol, y puede entrar | Error | Nadie se puede registrar como administrador mandando `rol` en el pedido. |
| Registrar un email que ya existe: 409 | Error | Conflicto con un dato existente, no un dato inválido. |
| Registrar con datos faltantes o inválidos: 400 | Error | Validación en el borde de la API: email mal escrito, contraseña corta, campos vacíos. |
| `GET /api/auth/yo` con token devuelve el usuario | Normal | Es lo que usa el front para refrescar la sesión al abrir la app. |
| `GET /api/auth/yo` sin token o con un token falso: 401 | Error | Un token inventado o adulterado no puede pasar. |
| `requireRol` deja pasar al administrador y frena al jugador con 403 | Normal y error | Es el eslabón de la cadena que protege todo el panel de administración. |

## Administración (`administracion.test.js`) · Ulises

| Caso | Tipo | Por qué |
|---|---|---|
| Sin sesión 401, y un jugador recibe 403 | Error | Distingue "no estás logueado" (401) de "no tenés permiso" (403). |
| El administrador ve su complejo y solo sus canchas | Normal | Cada administrador ve únicamente su complejo. |
| Crear una cancha la asigna a su complejo aunque el pedido diga otro | Error | El complejo sale del token, nunca del pedido: no se puede crear canchas en un complejo ajeno. |
| Editar una cancha propia | Normal | Camino principal del panel. |
| Editar una cancha de otro complejo: 403; una que no existe: 404 | Error | No se puede tocar lo de otro, y un id inexistente no puede romper la API. |
| Datos inválidos de la cancha: 400 con un mensaje claro | Límite | Capacidad 0, precio negativo, deporte o estado que no existen: los bordes de cada campo. |
| Reservas del día: las del seed, con quién reservó | Normal | Es la agenda que usa el complejo para saber a quién espera. |
| Reservas con una fecha mal escrita: 400 | Error | Una fecha rota no puede llegar a la consulta. |

## Complejos, canchas y disponibilidad (`disponibilidad.test.js`) · Fede

| Caso | Tipo | Por qué |
|---|---|---|
| Los complejos vienen con su horario | Normal | La grilla de turnos se arma con el horario de apertura y cierre. |
| Canchas: sin filtro vienen todas, con el nombre del complejo | Normal | Listado principal de la pantalla de canchas. |
| Canchas: filtros por deporte y por complejo | Normal | Es como busca el usuario. |
| Canchas: filtros inválidos dan 400 | Error | Un deporte que no existe no puede devolver una lista vacía como si nada. |
| Disponibilidad: el turno reservado figura ocupado y los demás libres | Normal | Es el corazón de la grilla. |
| Disponibilidad: un día pasado queda todo como pasado | Límite | No se puede ofrecer un turno que ya pasó. |
| Disponibilidad: una cancha en mantenimiento no ofrece turnos libres | Límite | El estado de la cancha manda sobre el horario. |
| Disponibilidad: fecha mal escrita o inexistente 400, cancha inexistente 404 | Error | Entradas rotas con el código correcto. |

## Reservas (F8, #25) · Fede

Pendiente. Casos previstos en el issue, para completar con su tipo y su porqué cuando se suban los tests:

- Reservar un turno libre: 201.
- Reservar un turno ocupado: 409.
- Dos pedidos al mismo turno a la vez: entra uno solo.
- Cancelar libera el turno.

## Partidos (N8, #34) · Nacho

Pendiente. Casos previstos en el issue, para completar con su tipo y su porqué cuando se suban los tests:

- Publicar desde una reserva propia: 201; desde una ajena: 403.
- Sumarse dos veces: 409.
- Dos personas por el último lugar a la vez: entra una sola.
- Bajarse reabre el partido.
