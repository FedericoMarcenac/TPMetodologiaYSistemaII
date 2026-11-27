# Turnito

**Integrantes del Proyecto:**
- Ulises Fossati
- Ignacio Alvarado
- Federico Marcenac

Plataforma web para **reservar canchas deportivas y organizar partidos entre jugadores**. Permite gestionar complejos deportivos, canchas de fútbol, básquet y pádel, y reservas por turno. Además, cualquier reserva puede publicarse como **partido abierto** para que otros usuarios se sumen y completen los equipos.

> **Estado (27/11/2026):** la API está completa (autenticación, complejos, canchas, disponibilidad, reservas, partidos y administración) y tiene 48 tests automáticos. En el front funcionan el registro y el login, el inicio, los partidos (ver, publicar, sumarse y bajarse), el perfil y el panel de administración. Faltan las pantallas de reservas y los tests de reservas: ver [Próximos pasos](#próximos-pasos).

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite + Chakra UI v3 |
| Backend | Node.js + Express 5 + `pg` (sin ORM) |
| Base de datos | PostgreSQL 16 |
| Autenticación | JWT + bcryptjs |
| Contenedores | Docker / Docker Compose |

## Cómo levantarlo

Único requisito: **Docker Desktop** instalado. No hace falta instalar Node ni PostgreSQL.

```bash
git clone https://github.com/FedericoMarcenac/TPMetodologiaYSistemaII
cd TPMetodologiaYSistemaII
docker compose up
```

Y abrir **http://localhost:5173**.

| Servicio | Puerto | Descripción |
|---|---|---|
| `web` | 5173 | Frontend React (Vite) |
| `api` | 3000 | API REST (Express). `GET /api/salud` confirma que está conectada a la base |
| `db` | 5434 | PostgreSQL, con el esquema y los datos de ejemplo ya cargados |

### Otros comandos

```bash
docker compose up -d      # levantar en segundo plano
docker compose down       # bajar
docker compose down -v    # bajar y BORRAR la base (para recrearla desde cero)
```

> La base solo ejecuta `db/01-schema.sql` y `db/02-seed.sql` **la primera vez** que se crea. Si modificás alguno de esos archivos, hay que correr `docker compose down -v && docker compose up` para que se vuelvan a aplicar.

### Consultar la base a mano

```bash
docker compose exec db psql -U turnito -d turnito
```

### Si el puerto está ocupado

Si al levantar aparece `port is already allocated`, hay otro programa usando ese puerto. Se cambia el número de la **izquierda** en `docker-compose.yml` (por ejemplo `"5175:5173"`) y listo.

## Qué hay hecho

```text
TPMetodologiaYSistemaII/
├── docker-compose.yml ── Levanta la base, la API y el frontend con un comando
│
├── db/
│   ├── 01-schema.sql ── Las 6 tablas, restricciones y triggers
│   └── 02-seed.sql ── Datos de ejemplo (2 complejos, 6 canchas, 4 usuarios)
│
├── docs/
│   ├── decisiones-diseño.md ── Análisis de diseño del Taller II (reglas en la base)
│   ├── arquitectura.md ── Capas, patrones de diseño y diagramas de la API y el front
│   ├── casos-de-test.md ── Qué prueba cada test y por qué se eligió
│   └── calidad.md ── Revisión con ESLint: qué encontró y qué se cambió
│
├── web/ ── React + Vite + Chakra
│   ├── Dockerfile
│   ├── vite.config.js ── Proxy de /api hacia la API
│   └── src/
│       ├── main.jsx
│       ├── App.jsx ── Todas las rutas de la aplicación
│       ├── api.js ── Cliente de la API (manda el token)
│       ├── sesion.jsx ── Usuario logueado: useSesion()
│       ├── useCarga.js ── Pide datos y devuelve cargando, error y datos
│       ├── tema.js ── Colores, tipografías y modo oscuro
│       ├── componentes/ ── Layout, RutaProtegida, estados de carga, confirmaciones y formularios
│       └── paginas/ ── Una pantalla por archivo
│
└── api/ ── API REST con Express
    ├── Dockerfile
    ├── src/
    │   ├── index.js ── Levanta el servidor
    │   ├── app.js ── Arma la cadena de middlewares y rutas
    │   ├── db.js ── Pool de conexiones a PostgreSQL (uno solo)
    │   ├── errores.js ── HttpError y traducción de errores de la base
    │   ├── validar.js ── Chequeo de datos obligatorios
    │   ├── middlewares/ ── Sesión, rol y manejo central de errores
    │   ├── routes/ ── Reciben el pedido y responden JSON
    │   ├── services/ ── Reglas de negocio
    │   └── repositories/ ── Todo el SQL
    └── test/ ── Tests automáticos (node:test + supertest)
```

### Usuarios de ejemplo

Todos con la contraseña `turnito123`:

| Email | Rol |
|---|---|
| `admin@turnito.com` | administrador |
| `jugador@turnito.com` | jugador |
| `fede@turnito.com` | jugador |
| `lucia@turnito.com` | jugador |

## API

Todas las rutas empiezan con `/api` y responden JSON. Los errores vuelven siempre como `{ "error": "mensaje" }`.

> Los patrones de diseño (Repository, Service Layer, Chain of Responsibility, Singleton, Facade, Observer y Proxy de protección), con su porqué y los diagramas, están en [`docs/arquitectura.md`](docs/arquitectura.md).

### Capas

Cada pedido recorre tres capas, y cada una tiene una sola tarea:

| Capa | Carpeta | Qué hace |
|---|---|---|
| Rutas | `src/routes/` | Leen el pedido (`req.params`, `req.body`) y responden JSON. No tienen SQL ni reglas |
| Servicios | `src/services/` | Las reglas de negocio: validar, calcular, decidir quién puede hacer qué |
| Repositorios | `src/repositories/` | Todo el SQL, siempre con parámetros `$1`, `$2` |

Para agregar un endpoint, por ejemplo las canchas:

```js
// src/repositories/canchaRepository.js
import { pool } from '../db.js';

export async function buscarPorId(id) {
  const { rows } = await pool.query('SELECT * FROM cancha WHERE id = $1', [id]);
  return rows[0];
}

// src/services/canchaService.js
import { HttpError } from '../errores.js';
import * as canchaRepository from '../repositories/canchaRepository.js';

export async function obtener(id) {
  const cancha = await canchaRepository.buscarPorId(id);
  if (!cancha) throw new HttpError(404, 'No existe esa cancha');
  return cancha;
}

// src/routes/canchas.js
import { Router } from 'express';
import * as canchaService from '../services/canchaService.js';

const router = Router();
router.get('/:id', async (req, res) => res.json(await canchaService.obtener(req.params.id)));
export default router;

// src/app.js
app.use('/api/canchas', canchas);
```

No hace falta `try/catch` en las rutas: Express 5 manda cualquier error al manejador central (`src/middlewares/errores.js`).

### Autenticación

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| `POST` | `/api/auth/registrar` | libre | Body `{ nombre, apellido, email, password, telefono? }`. Crea siempre un jugador y devuelve `{ token, usuario }` |
| `POST` | `/api/auth/login` | libre | Body `{ email, password }`. Devuelve `{ token, usuario }` |
| `GET` | `/api/auth/yo` | sesión | El usuario logueado |

El token se manda en cada pedido como `Authorization: Bearer <token>` y dura 7 días. Para proteger una ruta:

```js
import { requireAuth, requireRol } from '../middlewares/auth.js';

router.post('/', requireAuth, async (req, res) => { /* req.usuario = { id, rol, complejo_id } */ });
router.put('/:id', requireAuth, requireRol('administrador'), async (req, res) => { /* ... */ });
```

Cada middleware puede cortar el pedido (401 sin sesión, 403 sin el rol) antes de que llegue a la ruta.

### Administración

Todas piden sesión de **administrador**. El complejo sale del token, nunca del pedido: cada administrador ve y edita solo el suyo.

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/admin/complejo` | Datos del complejo propio |
| `GET` | `/api/admin/canchas` | Canchas del complejo |
| `POST` | `/api/admin/canchas` | Body `{ nombre, deporte, capacidad, precio_por_hora, estado? }`. `estado` arranca en `disponible` |
| `PUT` | `/api/admin/canchas/:id` | Mismo body. 403 si la cancha es de otro complejo |
| `GET` | `/api/admin/reservas?fecha=AAAA-MM-DD` | Reservas del día (hoy si no se manda fecha), con quién reservó y si tienen partido |

### Complejos, canchas y disponibilidad

Todas libres, sin sesión.

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/complejos` | Complejos con su horario de apertura y cierre |
| `GET` | `/api/canchas?deporte=&complejo_id=` | Canchas con el nombre del complejo. Los filtros son opcionales; uno inválido da 400 |
| `GET` | `/api/canchas/:id/disponibilidad?fecha=AAAA-MM-DD` | Turnos de una hora del día, desde la apertura hasta el cierre: `[{ hora: "19:00", estado: "libre" }]`. El estado es `libre`, `ocupado` o `pasado`; una cancha en mantenimiento no ofrece turnos libres |

### Reservas

Todas piden sesión.

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/api/reservas` | Body `{ cancha_id, fecha, hora }`, con la hora en punto. El fin (una hora después) y el precio los pone la API. 409 si el turno ya está ocupado o la cancha no está disponible; 400 si el turno ya pasó o está fuera del horario del complejo |
| `GET` | `/api/reservas/mias` | Mis reservas, con la cancha, el complejo y el `partido_id` si tienen partido |
| `PATCH` | `/api/reservas/:id/cancelar` | Cancela una reserva propia que todavía no empezó. Si tenía partido, el trigger de la base lo cancela también |

Que dos reservas no se superpongan lo garantiza la base con la restricción `EXCLUDE`, no un `SELECT` previo: ver [Reservas sin superposición](#reservas-sin-superposición).

### Partidos

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| `GET` | `/api/partidos?deporte=&cancha_id=&complejo_id=` | libre | Partidos abiertos, con lugar y que todavía no empezaron, ordenados por horario. Los filtros son opcionales |
| `GET` | `/api/partidos/:id` | libre | Un partido con sus `participantes` (nombre y apellido) |
| `POST` | `/api/partidos` | sesión | Body `{ reserva_id, jugadores_necesarios }`. Publica una reserva propia, confirmada y futura. Los jugadores van de 2 a la capacidad de la cancha. El creador queda anotado solo |
| `POST` | `/api/partidos/:id/participantes` | sesión | Sumarse. 409 si ya estás anotado o si no queda lugar |
| `DELETE` | `/api/partidos/:id/participantes` | sesión | Bajarse. El creador no puede (403): tiene que cancelar la reserva |

Cada partido trae `completo`, calculado como `jugadores_actuales >= jugadores_necesarios`. Los que publican, se suman o se bajan devuelven el partido actualizado, con los participantes.

El cupo no se controla en el código: el trigger de la base bloquea la fila del partido antes de anotar a alguien, así que si dos personas piden el último lugar a la vez, entra una sola.

### Errores

El manejador central traduce los errores de la base que son reglas de negocio:

| Código de PostgreSQL | Cuándo pasa | Respuesta |
|---|---|---|
| `23P01` | Dos reservas de la misma cancha se superponen | 409 |
| `23505` | Email repetido, reserva que ya tiene partido, alguien que se suma dos veces | 409 |
| `23514` sin restricción | El trigger de cupo: el partido ya no tiene lugar | 409 |
| `23514` con restricción | Un `CHECK` de una tabla (por ejemplo, capacidad 0) | 400 |
| `23503` | Referencia a algo que no existe | 400 |

Para cortar un pedido desde un servicio: `throw new HttpError(404, 'mensaje')`. Cualquier otro error devuelve 500.

`db.js` ya convierte los `NUMERIC` (precios) a número y deja las fechas `DATE` como texto `YYYY-MM-DD`.

### Tests

```bash
docker compose exec api npm test
```

Corren contra la base de Docker. Las pruebas que escriben en la base lo hacen dentro de una transacción que se deshace al final, o crean sus propios datos y los borran al terminar, así que no ensucian los datos de ejemplo.

Las reservas del seed se ubican en días relativos al día en que se creó la base. Si la base tiene más de un día, algunos tests fallan por las fechas: recreala con `docker compose down -v` y `docker compose up -d` antes de correrlos. Qué prueba cada test y por qué está en [`docs/casos-de-test.md`](docs/casos-de-test.md).

### Lint

```bash
docker compose exec api npm run lint
docker compose exec web npm run lint
```

ESLint con las reglas recomendadas (y las de hooks de React en el front). Qué encontró la primera pasada y qué se cambió: [`docs/calidad.md`](docs/calidad.md).

## Frontend

Las pantallas viven en `web/src/paginas/`, una por archivo, y están todas conectadas en `App.jsx`. Faltan `Canchas.jsx`, `Cancha.jsx` y `MisReservas.jsx` (tickets F5, F6 y F7), que todavía muestran "Pantalla en construcción".

| Ruta | Archivo | Acceso |
|---|---|---|
| `/` | `Inicio.jsx` | libre |
| `/login`, `/registro` | `Login.jsx`, `Registro.jsx` | libre |
| `/canchas`, `/canchas/:id` | `Canchas.jsx`, `Cancha.jsx` | libre |
| `/partidos`, `/partidos/:id` | `Partidos.jsx`, `Partido.jsx` | libre |
| `/mis-reservas`, `/partidos/nuevo`, `/perfil` | `MisReservas.jsx`, `PublicarPartido.jsx`, `Perfil.jsx` | sesión |
| `/admin` | `Administracion.jsx` | administrador |

Sin sesión, las rutas protegidas mandan al login; un jugador que entra a `/admin` vuelve al inicio.

### Diseño

- **Colores:** verde de cancha (`colorPalette="brand"`, el de todos los componentes por defecto) para las acciones, y naranja de pelota (`colorPalette="pelota"`) para lo que pide atención, como los lugares que faltan en un partido. El fondo queda neutro. Están definidos en `web/src/tema.js`.
- **Tipografía:** Barlow Condensed para títulos y Barlow para el resto.
- **Modo oscuro:** sigue al sistema y se puede cambiar con el botón de la luna; queda guardado.
- **Celular primero:** en pantallas chicas la navegación es una barra de pestañas abajo.

Componentes que usa cada pantalla, con ejemplos en vivo en **http://localhost:5173/componentes**:

| Componente | Archivo | Para qué |
|---|---|---|
| `Encabezado` | `componentes/estados.jsx` | Título de la pantalla, con descripción y un botón opcional |
| `Cargando` | `componentes/estados.jsx` | Mientras llegan los datos |
| `ErrorCarga` | `componentes/estados.jsx` | Si falló la carga, con botón para reintentar |
| `ListaVacia` | `componentes/estados.jsx` | Cuando no hay resultados: explica qué hacer |
| `ConfirmarAccion` | `componentes/ConfirmarAccion.jsx` | Antes de cancelar o borrar algo; muestra el error de la API si falla |
| `avisar()` | `componentes/avisos.jsx` | Aviso corto después de una acción ("Reserva confirmada") |
| `useCarga()` | `useCarga.js` | Pide los datos y devuelve `{ datos, cargando, error, recargar }` |

Una pantalla típica:

```jsx
export default function MisReservas() {
  const { datos, cargando, error, recargar } = useCarga(() => api.get('/reservas/mias'), []);
  return (
    <>
      <Encabezado titulo="Mis reservas" />
      {cargando && <Cargando />}
      {error && <ErrorCarga error={error} onReintentar={recargar} />}
      {datos?.length === 0 && <ListaVacia titulo="Todavía no reservaste" />}
      {datos?.map((r) => /* ... */)}
    </>
  );
}
```

Los íconos son de [Lucide](https://lucide.dev/icons): `import { CalendarX } from 'lucide-react'`.

### Llamar a la API

```jsx
import { api, ErrorApi } from '../api.js';
import { useSesion } from '../sesion.jsx';

const canchas = await api.get('/canchas?deporte=futbol');
await api.post('/reservas', { cancha_id: 1, fecha: '2026-11-25', hora: '19:00' });

try {
  await api.post(`/partidos/${id}/participantes`);
} catch (e) {
  if (e instanceof ErrorApi && e.status === 409) {
    // e.message trae el texto de la API, por ejemplo "El partido ya no tiene lugar"
  }
}

const { usuario, entrar, salir } = useSesion();   // usuario es null si no hay sesión
```

`api.js` agrega el token solo y, si la API responde 401 porque la sesión venció, la cierra. Las rutas van sin `/api` adelante: Vite reenvía `/api` a la API, así que no hay problemas de CORS.

> Si alguien agrega una librería al front o a la API, los demás tienen que levantar con `docker compose up --build -V`. El `-V` reinstala `node_modules` dentro del contenedor; sin él queda la versión vieja y aparece `Failed to resolve import`.

## Base de datos

Implementa las 6 entidades del documento del proyecto: `complejo_deportivo`, `usuario`, `cancha`, `reserva`, `partido` y `participante_partido`.

### Decisiones de diseño

> El análisis completo (diagnóstico, alternativas, decisión y trade-offs) está en [`docs/decisiones-diseño.md`](docs/decisiones-diseño.md).

- **La contraseña se guarda hasheada** con bcrypt, nunca en texto plano. Por eso la columna se llama `password_hash`.
- **`reserva` guarda un rango `inicio`–`fin` de tipo `TIMESTAMPTZ`** en lugar de tres columnas sueltas. Los atributos `fecha`, `hora_inicio` y `hora_fin` del documento existen igual, pero como **columnas generadas**: se calculan solas y no pueden quedar desincronizadas.
- **`precio_total` queda congelado en la reserva.** Si el complejo cambia la tarifa, las reservas ya hechas conservan el precio que se cobró.
- **`usuario.complejo_id`** se agregó al modelo original para saber de qué complejo es administrador un usuario. Sin eso, cualquier admin podría editar las canchas de cualquier complejo.
- **Cinco triggers** cuidan los datos derivados y las reglas de los partidos: uno completa `deporte`, `fecha` y `hora` del partido desde su reserva; otro anota al creador como primer participante; el tercero recalcula `jugadores_actuales` cada vez que alguien se suma o se baja (que el partido está lleno no se guarda: se calcula comparando `jugadores_actuales` con `jugadores_necesarios`); el cuarto cancela el partido cuando se cancela su reserva; y el quinto bloquea el partido antes de anotar a alguien, para que no se pase del cupo.

### Reservas sin superposición

Evitar que dos personas reserven la misma cancha en el mismo horario **no se puede resolver consultando antes de insertar**: entre la consulta que verifica que el turno está libre y el `INSERT` que lo ocupa, otro pedido puede meterse. El resultado serían dos reservas confirmadas sobre el mismo turno.

La solución está en el esquema, con una restricción de exclusión de PostgreSQL:

```sql
CONSTRAINT reserva_sin_solape EXCLUDE USING gist (
  cancha_id                    WITH =,
  tstzrange(inicio, fin, '[)') WITH &&
) WHERE (estado <> 'cancelada')
```

No pueden coexistir dos filas con **la misma cancha** y cuyos **rangos horarios se superpongan**, salvo que la reserva esté cancelada. La base rechaza el insert con el código `23P01`, sin importar cuántos pedidos lleguen a la vez.

Comportamiento verificado:

| Caso | Resultado |
|---|---|
| Mismo turno exacto | Rechazado |
| Solape parcial (19:30–20:30 sobre 19:00–20:00) | Rechazado |
| Turno pegado (21:00–22:00 después de 20:00–21:00) | Aceptado |
| Mismo horario en otra cancha | Aceptado |
| Turno liberado tras cancelar | Aceptado |

## Próximos pasos

- [x] **API**: proyecto Express con conexión a la base y manejo de errores
- [x] **Autenticación**: registro, login con JWT y middleware de sesión, con sus pantallas
- [x] **Partidos**: API y pantallas para ver, publicar, sumarse y bajarse
- [x] **Panel de administración**: API y pantalla con la agenda del día y las canchas
- [x] **Inicio y perfil**
- [x] **Calidad**: ESLint en la API y el front ([`docs/calidad.md`](docs/calidad.md)) y casos de test justificados ([`docs/casos-de-test.md`](docs/casos-de-test.md))
- [x] **Tests de partidos** (N8)
- [x] **Documento**: sección 7 (Partidos) de [`docs/arquitectura.md`](docs/arquitectura.md) (N9)
- [ ] **Reservas**: la API está; faltan las pantallas de canchas, grilla de turnos y mis reservas (F5, F6, F7)
- [x] **Tests de reservas** (F8)
- [x] **Documento**: sección 6 (Reservas) de [`docs/arquitectura.md`](docs/arquitectura.md) (F9)

## Notas

- Las credenciales de PostgreSQL (`turnito` / `turnito`) son valores de desarrollo.
- Todos los turnos duran **una hora y empiezan en hora en punto**. Esa decisión permite generar la grilla de horarios a partir del horario de apertura y cierre del complejo, sin necesidad de una tabla de disponibilidad.
- Los horarios se manejan en la zona `America/Argentina/Buenos_Aires`, configurada en el contenedor de PostgreSQL.
- Proyecto desarrollado en el marco de la materia Metodología de Sistemas 2.
