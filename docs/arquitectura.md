# Arquitectura

Cómo está organizado Turnito, qué patrones de diseño usa y por qué. Las reglas que viven en la base de datos (restricción de solape y triggers) están analizadas en [`decisiones-diseño.md`](decisiones-diseño.md); este documento cubre la API y el front.

## 1. Vista general

```mermaid
flowchart LR
    N[Navegador<br/>React + Chakra] -->|/api/...| V[Vite<br/>proxy]
    V -->|HTTP JSON| A[API<br/>Express]
    A -->|SQL con parámetros| B[(PostgreSQL<br/>restricciones y triggers)]
```

- El navegador nunca le habla a la API directo: llama a `/api/...` en su mismo origen y Vite lo reenvía. Así no hace falta configurar CORS.
- La API es la única que conoce la base. Valida lo que depende del pedido (quién pide, si el turno ya pasó, si la cancha es de su complejo).
- La base cuida las reglas que no se pueden romper nunca, aunque lleguen dos pedidos a la vez: que dos reservas no se superpongan y que un partido no pase su cupo.

## 2. Capas de la API

Cada pedido recorre tres capas. Cada una tiene una sola razón para cambiar.

| Capa | Carpeta | Responsabilidad | Lo que **no** hace |
|---|---|---|---|
| Rutas | [`api/src/routes/`](../api/src/routes/) | Leer el pedido y responder JSON con el código HTTP | No tiene SQL ni reglas |
| Servicios | [`api/src/services/`](../api/src/services/) | Reglas de negocio: validar, calcular, decidir quién puede hacer qué | No sabe de HTTP ni de SQL |
| Repositorios | [`api/src/repositories/`](../api/src/repositories/) | Consultas SQL, siempre con parámetros `$1`, `$2` | No decide nada |

El recorrido de un pedido real, un administrador que da de alta una cancha:

```mermaid
sequenceDiagram
    actor Admin as Administrador
    participant MW as Middlewares
    participant R as routes/administracion.js
    participant S as administracionService
    participant Repo as administracionRepository
    participant DB as PostgreSQL

    Admin->>MW: POST /api/admin/canchas + token
    MW->>MW: requireAuth: ¿token válido? (si no, 401)
    MW->>MW: requireRol: ¿es administrador? (si no, 403)
    MW->>R: req.usuario = { id, rol, complejo_id }
    R->>S: crearCancha(usuario, body)
    S->>S: valida deporte, capacidad y precio (si no, 400)
    S->>Repo: crearCancha(usuario.complejo_id, datos)
    Repo->>DB: INSERT INTO cancha ... VALUES ($1, ...)
    DB-->>Repo: fila nueva
    Repo-->>S: cancha
    S-->>R: cancha
    R-->>Admin: 201 + cancha en JSON
```

El complejo de la cancha sale del token (`usuario.complejo_id`), nunca del pedido. Aunque alguien mande `complejo_id: 2` en el body, la cancha queda en su complejo.

## 3. Patrones de diseño

### 3.1 Repository

**Problema.** Si cada ruta escribe su SQL, las consultas quedan desparramadas, repetidas y mezcladas con la lógica. Cambiar una tabla obliga a buscar en todo el código.

**Solución.** Todo el acceso a datos está en los repositorios, con funciones con nombre de negocio: `buscarPorEmailConPassword(email)`, `crearCancha(complejoId, datos)`. El resto del código no sabe que hay SQL.

**Dónde.** [`usuarioRepository.js`](../api/src/repositories/usuarioRepository.js), [`administracionRepository.js`](../api/src/repositories/administracionRepository.js).

**Por qué así.** Decidimos no usar un ORM: con 6 tablas, el SQL directo es más simple y el esquema entero se lee en un archivo. El Repository nos da la ventaja principal de un ORM, que es tener el acceso a datos en un solo lugar, sin agregar una dependencia ni comandos de migración.

### 3.2 Service Layer

**Problema.** Las reglas de negocio tienen que poder leerse y probarse sin pensar en HTTP ni en SQL.

**Solución.** Una capa de servicios entre las rutas y los repositorios. Ejemplos de reglas que viven ahí:

- El registro crea siempre un jugador, aunque el pedido diga otro rol ([`authService.js`](../api/src/services/authService.js)).
- Si el email no existe o la contraseña está mal, el mensaje es el mismo, para no revelar qué emails están registrados.
- Un administrador solo edita canchas de su complejo: 404 si la cancha no existe, 403 si es de otro ([`administracionService.js`](../api/src/services/administracionService.js)).

**Cómo corta un pedido.** Un servicio lanza `throw new HttpError(403, 'mensaje')` ([`errores.js`](../api/src/errores.js)) y el manejador central lo convierte en la respuesta. El servicio no toca `res`.

### 3.3 Chain of Responsibility

**Problema.** Antes de llegar a la ruta, un pedido tiene que pasar varios controles (que el JSON esté bien, que haya sesión, que tenga el rol), y cualquiera de ellos puede rechazarlo. Ponerlos todos adentro de cada ruta los repetiría en todos lados.

**Solución.** Cada control es un eslabón independiente (un middleware de Express). Recibe el pedido y hace una de dos cosas: lo corta con un error o lo pasa al siguiente con `next()`. El último eslabón es el manejador de errores, que atrapa lo que cualquiera de los anteriores haya lanzado.

```js
// api/src/routes/administracion.js
router.use(requireAuth, requireRol('administrador'));
```

```mermaid
flowchart LR
    P[Pedido] --> J[express.json] --> A[requireAuth] --> R[requireRol] --> Ruta[Ruta] --> Res[Respuesta]
    J -. JSON roto .-> E[manejarErrores]
    A -. sin token .-> E
    R -. sin rol .-> E
    Ruta -. error de negocio o de la base .-> E
    E --> Err[400 / 401 / 403 / 404 / 409 / 500]
```

**Dónde.** [`middlewares/auth.js`](../api/src/middlewares/auth.js), [`middlewares/errores.js`](../api/src/middlewares/errores.js), [`app.js`](../api/src/app.js) (el orden de la cadena).

**Detalle.** `requireRol('administrador')` es una función que fabrica eslabones: recibe el rol y devuelve el middleware. Con la misma función se arma un control para cualquier rol.

### 3.4 Singleton

**Problema.** Abrir una conexión nueva a PostgreSQL en cada pedido es lento y agota las conexiones de la base.

**Solución.** Un solo `Pool` de conexiones para toda la API, creado una vez en [`db.js`](../api/src/db.js). Todos los repositorios lo importan.

**Cómo garantiza que haya uno solo.** No tiene el `getInstance()` del libro: lo garantiza el sistema de módulos de Node, que ejecuta `db.js` la primera vez que alguien lo importa y a todos los demás les devuelve el mismo objeto. El efecto es el mismo que el del patrón: una única instancia, con un punto de acceso global.

### 3.5 Facade (front)

**Problema.** Cada llamada a la API con `fetch` necesita la URL, los encabezados, el token, convertir a JSON, leer el error y manejar la sesión vencida. Repetido en cada pantalla, son unas 15 líneas por llamada.

**Solución.** [`web/src/api.js`](../web/src/api.js) ofrece una interfaz simple que esconde todo eso:

```js
const canchas = await api.get('/canchas');
await api.post('/reservas', { cancha_id: 1, fecha: '2026-11-25', hora: '19:00' });
```

Si la API responde con error, lanza `ErrorApi` con el `status` y el mensaje, así la pantalla puede mostrar un 409 ("Ese turno ya está reservado") sin conocer `fetch`.

### 3.6 Observer (front)

**Problema.** Varias partes de la pantalla dependen de si hay sesión: la barra de navegación, las rutas protegidas, el perfil. Cuando alguien entra o sale, todas tienen que actualizarse.

**Solución.** La sesión es el sujeto observado ([`web/src/sesion.jsx`](../web/src/sesion.jsx)). Cada componente que llama a `useSesion()` queda suscripto, y React lo vuelve a dibujar cuando la sesión cambia. Quien cambia la sesión no conoce a los suscriptores.

El mismo mecanismo conecta `api.js` con la sesión: si la API responde 401, `api.js` emite el evento `sesion-vencida` y la sesión, que lo escucha, se cierra. `api.js` no depende de React.

### 3.7 Proxy de protección (front)

**Problema.** Algunas pantallas solo se pueden ver con sesión, y `/admin` solo con rol de administrador. El control no tiene que estar repetido adentro de cada pantalla.

**Solución.** [`RutaProtegida`](../web/src/componentes/RutaProtegida.jsx) se pone delante de las pantallas y controla el acceso antes de mostrarlas: sin sesión manda al login (recordando a dónde quería ir), y sin el rol manda al inicio. Las pantallas no saben que están protegidas. Es la idea del Proxy de protección: un intermediario con la misma "interfaz" (una ruta) que decide si deja pasar.

```jsx
<Route element={<RutaProtegida rol="administrador" />}>
  <Route path="admin" element={<Administracion />} />
</Route>
```

### 3.8 En la base de datos

Las reglas de la base (restricción de exclusión contra reservas superpuestas, triggers con una sola responsabilidad que reaccionan a eventos, bloqueo de la fila del partido para el cupo) están analizadas en [`decisiones-diseño.md`](decisiones-diseño.md).

## 4. Diagrama de clases

En JavaScript estos componentes son módulos con funciones y no clases, pero cumplen el mismo rol. El diagrama muestra cada módulo como una clase con sus operaciones públicas.

```mermaid
classDiagram
    direction LR

    class Pool {
        <<Singleton>>
        +query(sql, parametros)
        +connect()
    }
    class HttpError {
        +status
        +message
    }

    class usuarioRepository {
        <<Repository>>
        +buscarPorEmailConPassword(email)
        +buscarPorId(id)
        +crear(datos)
    }
    class administracionRepository {
        <<Repository>>
        +buscarComplejo(id)
        +listarCanchas(complejoId)
        +buscarCancha(id)
        +crearCancha(complejoId, datos)
        +actualizarCancha(id, datos)
        +listarReservasDelDia(complejoId, fecha)
    }

    class authService {
        <<Service>>
        +registrar(datos)
        +login(datos)
        +verificarToken(token)
        +perfil(id)
    }
    class administracionService {
        <<Service>>
        +complejo(usuario)
        +canchas(usuario)
        +crearCancha(usuario, datos)
        +editarCancha(usuario, id, datos)
        +reservasDelDia(usuario, fecha)
    }

    class requireAuth {
        <<Middleware>>
    }
    class requireRol {
        <<Middleware>>
        +requireRol(rol)
    }
    class manejarErrores {
        <<Middleware>>
        +traducirErrorPg(err)
    }

    class rutasAuth {
        POST /api/auth/registrar
        POST /api/auth/login
        GET /api/auth/yo
    }
    class rutasAdministracion {
        GET /api/admin/canchas
        POST /api/admin/canchas
        PUT /api/admin/canchas/:id
        GET /api/admin/reservas
    }

    rutasAuth --> authService
    rutasAuth ..> requireAuth
    rutasAdministracion --> administracionService
    rutasAdministracion ..> requireAuth
    rutasAdministracion ..> requireRol
    requireAuth --> authService : verificarToken
    authService --> usuarioRepository
    administracionService --> administracionRepository
    usuarioRepository --> Pool
    administracionRepository --> Pool
    authService ..> HttpError
    administracionService ..> HttpError
    manejarErrores ..> HttpError
```

Y del lado del front:

```mermaid
classDiagram
    direction LR

    class api {
        <<Facade>>
        +get(ruta)
        +post(ruta, datos)
        +put(ruta, datos)
        +patch(ruta, datos)
        +delete(ruta)
    }
    class ErrorApi {
        +status
        +message
    }
    class SesionProvider {
        <<Observer: sujeto>>
        +usuario
        +entrar(token, usuario)
        +salir()
    }
    class RutaProtegida {
        <<Proxy de protección>>
        +rol
    }
    class Pantalla {
        <<paginas/*.jsx>>
    }

    Pantalla --> api : llama
    Pantalla ..> SesionProvider : useSesion()
    RutaProtegida ..> SesionProvider : useSesion()
    RutaProtegida --> Pantalla : protege
    api ..> ErrorApi : lanza
    api ..> SesionProvider : evento sesion-vencida
```

## 5. Manejo de errores

Todos los errores salen de un solo lugar ([`middlewares/errores.js`](../api/src/middlewares/errores.js)) con el mismo formato: `{ "error": "mensaje" }`.

| Origen | Ejemplo | Respuesta |
|---|---|---|
| Un servicio lanza `HttpError` | Cancha de otro complejo | El código que eligió el servicio (403) |
| JSON mal formado | `{ roto` | 400 |
| Restricción de solape (`23P01`) | Dos reservas en el mismo turno | 409 "Ese turno ya está reservado" |
| Dato único repetido (`23505`) | Email ya registrado | 409 con un mensaje según la restricción |
| Trigger de cupo (`23514` sin restricción) | Partido lleno | 409 "El partido ya no tiene lugar" |
| `CHECK` de una tabla (`23514` con restricción) | Capacidad 0 | 400 |
| Cualquier otro | Error de programación | 500, y se registra en la consola de la API |

Que la base rechace y la API traduzca es lo que hace seguras las reglas aunque lleguen dos pedidos al mismo tiempo: la API no tiene que consultar antes de escribir, que es justo donde aparecen las condiciones de carrera.

## 6. Reservas

Una reserva ocupa una cancha durante una hora, y la hace un jugador con sesión iniciada. Las reglas se reparten así:

| Regla | Dónde vive | Por qué ahí |
|---|---|---|
| Fecha y hora bien escritas, hora en punto, dentro del horario del complejo, cancha disponible y turno futuro | [`reservaService.js`](../api/src/services/reservaService.js) | Dependen del pedido y de la hora actual |
| El fin (+1 hora) y el precio los calcula el servidor, y el precio queda congelado en la reserva | `reservaService.js` | El cliente no puede decidir cuánto paga ni cuánto dura |
| Solo cancela quien reservó, y solo si el turno no empezó | `reservaService.js` | Depende de quién pide y de la hora actual |
| Dos reservas de la misma cancha no se superponen | `reserva_sin_solape` (restricción de exclusión) | Tiene que valer aunque lleguen dos pedidos iguales a la vez |
| Al cancelar la reserva, su partido pasa a `cancelado` | `trg_reserva_cancelada` | Pasa siempre que se cancele una reserva, sin importar quién lo haga |

### 6.1 Reservar un turno

El recorrido de `POST /api/reservas` por las capas, hasta la base:

```mermaid
sequenceDiagram
    actor Jugador as Jugador (React)
    participant Auth as requireAuth
    participant Ruta as routes/reservas.js
    participant Serv as reservaService
    participant RepC as canchaRepository
    participant RepR as reservaRepository
    participant BD as PostgreSQL
    participant Err as manejarErrores

    Jugador->>Auth: POST /api/reservas con cancha_id, fecha, hora y el token
    alt token ausente o inválido
        Auth-->>Jugador: 401
    end
    Auth->>Ruta: req.usuario
    Ruta->>Serv: reservar(usuario, body)
    Serv->>Serv: valida fecha y hora en punto
    Serv->>RepC: buscarPorId(cancha_id)
    RepC->>BD: SELECT de la cancha y el horario del complejo
    BD-->>RepC: cancha
    Serv->>Serv: cancha disponible, dentro del horario, turno futuro
    Serv->>Serv: calcula el fin (+1 hora) y congela el precio
    Serv->>RepR: crear(usuarioId, canchaId, inicio, fin, precioTotal)
    RepR->>BD: INSERT INTO reserva
    alt turno libre
        BD-->>RepR: fila nueva
        RepR-->>Serv: reserva
        Serv-->>Ruta: reserva
        Ruta-->>Jugador: 201 con la reserva
    else turno ocupado
        BD-->>RepR: error 23P01 de reserva_sin_solape
        RepR-->>Err: el error sube sin que nadie lo atrape
        Err-->>Jugador: 409 Ese turno ya está reservado
    end
```

El servicio no pregunta "¿está libre?" antes de insertar. Esa consulta dejaría un hueco: entre el `SELECT` y el `INSERT` otro pedido puede quedarse con el turno. Por eso el servicio solo valida lo que depende del pedido, intenta insertar, y si la base rechaza por superposición el error sube hasta `manejarErrores`, que lo traduce a un 409. Los códigos que el servicio decide por su cuenta son 400 (datos inválidos, fuera de horario, turno pasado), 404 (la cancha no existe) y 409 (cancha en mantenimiento).

### 6.2 Dos pedidos por el mismo turno

Ana y Beto aprietan "Reservar" a las 19:00 al mismo tiempo. Cada pedido usa una conexión distinta del pool, así que llegan a la base como dos transacciones en paralelo:

```mermaid
sequenceDiagram
    participant A as INSERT de Ana
    participant BD as reserva_sin_solape
    participant B as INSERT de Beto

    A->>BD: INSERT de la cancha 2 a las 19:00
    B->>BD: INSERT de la cancha 2 a las 19:00
    Note over B,BD: Beto espera: el turno de Ana todavía no terminó
    BD-->>A: COMMIT, el turno queda de Ana
    BD-->>B: 23P01, se superpone con la reserva de Ana
    Note over A,B: Ana recibe 201 y Beto 409
```

Esto lo comprueba el test "dos pedidos al mismo turno a la vez: entra uno solo" en [`api/test/reservas.test.js`](../api/test/reservas.test.js): los dos pedidos salen juntos, uno recibe 201, el otro 409, y en la base queda una sola reserva.

### 6.3 Cancelar

`PATCH /api/reservas/:id/cancelar` busca la reserva y valida en el servicio, en este orden:

| Caso | Respuesta |
|---|---|
| La reserva no existe | 404 |
| Es de otra persona | 403 |
| Ya estaba cancelada | 409 |
| El turno ya empezó | 400 |

Si pasa todas las validaciones, el repositorio cambia el `estado` a `cancelada`. Dos cosas ocurren sin que el servicio las programe:

- **El turno queda libre.** La restricción `reserva_sin_solape` solo mira reservas no canceladas, así que otro jugador puede reservar el mismo turno enseguida.
- **El partido se cancela.** Si la reserva tenía un partido, `trg_reserva_cancelada` lo pasa a `cancelado` y desde ese momento nadie puede sumarse (ver 7.3).


## 7. Partidos

Un partido nace de una reserva: quien reservó la cancha lo publica y dice cuántos jugadores necesita, y los demás se suman hasta llenarlo. Las reglas se reparten así:

| Regla | Dónde vive | Por qué ahí |
|---|---|---|
| Solo se publica desde una reserva propia, confirmada y futura, para 2 jugadores como mínimo y la capacidad de la cancha como máximo | [`partidoService.js`](../api/src/services/partidoService.js) | Depende de quién pide y de la hora actual |
| El creador no se puede bajar (tiene que cancelar la reserva) | `partidoService.js` | Depende de quién pide |
| Una reserva genera un solo partido, y nadie se anota dos veces | `UNIQUE` de la base | Tiene que valer aunque lleguen dos pedidos iguales a la vez |
| Deporte, fecha y hora salen de la reserva, y el creador queda anotado | `trg_partido_datos` y `trg_partido_creador` | Así no pueden quedar distintos de la reserva |
| No se pasa del cupo, y no se suma nadie a un partido cancelado | `trg_participante_cupo` | Es la regla que se rompe con dos pedidos simultáneos (ver 7.2) |
| `jugadores_actuales` cuenta a los anotados | `trg_participante_cambio` | Se recalcula en cada alta y en cada baja, sin depender de la API |

"Completo" no es un estado guardado: es `jugadores_actuales >= jugadores_necesarios`, calculado en cada consulta. Sumarse o bajarse nunca cambia el `estado` del partido, que solo puede ser `abierto` o `cancelado` (la decisión está en [`decisiones-diseño.md`](decisiones-diseño.md), 4.1).

### 7.1 Sumarse a un partido

```mermaid
sequenceDiagram
    actor J as Jugador
    participant MW as requireAuth
    participant R as routes/partidos.js
    participant S as partidoService
    participant Repo as partidoRepository
    participant DB as PostgreSQL
    participant E as manejarErrores

    J->>MW: POST /api/partidos/3/participantes + token
    MW->>MW: ¿token válido? (si no, 401)
    MW->>R: req.usuario
    R->>S: sumarse(usuario, '3')
    S->>Repo: buscarPorId(3)
    Repo->>DB: SELECT ... FROM partido
    DB-->>S: partido (si no existe, 404)
    S->>Repo: agregarParticipante(3, usuario.id)
    Repo->>DB: INSERT INTO participante_partido
    Note over DB: BEFORE INSERT: trg_participante_cupo<br/>SELECT * FROM partido WHERE id = 3 FOR UPDATE<br/>(bloquea la fila del partido hasta el COMMIT)
    alt cancelado, o jugadores_actuales >= jugadores_necesarios
        DB-->>E: 23514 "El partido ya no tiene lugar"
        E-->>J: 409
    else ya estaba anotado
        DB-->>E: 23505 en el UNIQUE (partido_id, usuario_id)
        E-->>J: 409 "Ya estás anotado en este partido"
    else hay lugar
        Note over DB: se inserta la fila<br/>AFTER INSERT: trg_participante_cambio<br/>UPDATE partido SET jugadores_actuales = count(*)<br/>COMMIT: se libera el bloqueo
        DB-->>S: ok
        S->>Repo: buscarPorId(3) y listarParticipantes(3)
        Repo-->>S: partido actualizado, con completo calculado
        S-->>R: partido
        R-->>J: 201 + partido en JSON
    end
```

Lo que conviene notar:

- **El servicio no cuenta lugares.** No hace un `SELECT` para ver si queda cupo antes de insertar: entre esa consulta y el `INSERT` podría entrar otra persona. Inserta directo, y si no hay lugar la base lo rechaza y [`manejarErrores`](../api/src/middlewares/errores.js) lo traduce a 409 (sección 5).
- **El bloqueo dura una sola sentencia.** `agregarParticipante` es un único `INSERT` y PostgreSQL lo ejecuta en su propia transacción. El `FOR UPDATE` del trigger toma la fila del partido, el `AFTER INSERT` actualiza el contador, y el `COMMIT` del final libera la fila. Así el bloqueo dura milisegundos.
- **Al llenarse no cambia ningún estado.** El partido sigue `abierto`. Deja de aparecer en `GET /api/partidos` porque esa consulta pide `jugadores_actuales < jugadores_necesarios`, y el detalle lo muestra con `completo: true`.

### 7.2 Dos personas por el último lugar

El caso que justifica el `FOR UPDATE`: un partido para 4 con 3 anotados, y Ana y Beto aprietan "Sumarme" al mismo tiempo. Cada pedido usa una conexión distinta del pool, así que llegan a la base como dos transacciones en paralelo.

```mermaid
sequenceDiagram
    participant A as INSERT de Ana
    participant DB as Fila del partido (3 de 4)
    participant B as INSERT de Beto

    A->>DB: trg_participante_cupo: SELECT ... FOR UPDATE
    DB-->>A: bloqueada para Ana, ve 3 de 4: hay lugar
    B->>DB: trg_participante_cupo: SELECT ... FOR UPDATE
    Note over B,DB: Beto espera: la fila está bloqueada
    A->>DB: inserta, trg_participante_cambio deja 4 de 4
    A->>DB: COMMIT (libera la fila)
    DB-->>B: ahora sí, lee la fila actualizada: 4 de 4
    B-->>B: RAISE 'El partido ya no tiene lugar' (23514)
    Note over A,B: Ana recibe 201 y Beto 409
```

Sin el bloqueo, las dos lecturas ven 3 de 4 al mismo tiempo, las dos insertan y el partido queda 5 de 4. Esa prueba está hecha a mano en psql en [`decisiones-diseño.md`](decisiones-diseño.md) (5.2). Además quedó como test automático en [`api/test/partidos.test.js`](../api/test/partidos.test.js): los dos pedidos salen juntos y siempre entra uno solo.

### 7.3 Publicar y bajarse

- **Publicar** (`POST /api/partidos`): el servicio valida la reserva y la cantidad de jugadores, y el repositorio hace un solo `INSERT INTO partido`. Los triggers completan deporte, fecha y hora desde la reserva (`trg_partido_datos`), y anotan al creador (`trg_partido_creador`), con lo que el contador queda en 1. Como el `RETURNING` sale antes de que se anote el creador, el servicio vuelve a leer el partido antes de responder.
- **Bajarse** (`DELETE /api/partidos/:id/participantes`): el servicio rechaza al creador (403) y borra la fila. Si no había fila que borrar, responde 404. `trg_participante_cambio` recalcula el contador. Si el partido estaba lleno, vuelve a tener lugar y reaparece en la lista sin que nadie toque su estado.
- **Cancelar la reserva**: `trg_reserva_cancelada` pasa el partido a `cancelado`. Desde ese momento `trg_participante_cupo` rechaza a cualquiera que quiera sumarse.
