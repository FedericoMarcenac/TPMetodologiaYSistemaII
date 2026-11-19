# Turnito

**Integrantes del Proyecto:**
- Ulises Fossati
- Ignacio Alvarado
- Federico Marcenac

Plataforma web para **reservar canchas deportivas y organizar partidos entre jugadores**. Permite gestionar complejos deportivos, canchas de fútbol, básquet y pádel, y reservas por turno. Además, cualquier reserva puede publicarse como **partido abierto** para que otros usuarios se sumen y completen los equipos.

> **Estado:** en desarrollo. Hoy están funcionando el entorno con Docker, la base de datos completa, la base de la API y la pantalla inicial del frontend.

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
├── docker-compose.yml ── Levanta la base y el frontend con un comando
│
├── db/
│   ├── 01-schema.sql ── Las 6 tablas, restricciones y triggers
│   └── 02-seed.sql ── Datos de ejemplo (2 complejos, 6 canchas, 4 usuarios)
│
├── docs/
│   └── decisiones-diseño.md ── Análisis de diseño del Taller II
│
├── web/ ── React + Vite + Chakra, pantalla inicial
│   ├── Dockerfile
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       └── App.jsx
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
    └── test/
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

Corren contra la base de Docker. Las pruebas que escriben en la base lo hacen dentro de una transacción que se deshace al final, así que no ensucian los datos de ejemplo.

## Base de datos

Implementa las 6 entidades del documento del proyecto: `complejo_deportivo`, `usuario`, `cancha`, `reserva`, `partido` y `participante_partido`.

### Decisiones de diseño

> El análisis completo (diagnóstico, alternativas, decisión y trade-offs) está en [`docs/decisiones-diseño.md`](docs/decisiones-diseño.md).

- **La contraseña se guarda hasheada** con bcrypt, nunca en texto plano. Por eso la columna se llama `password_hash`.
- **`reserva` guarda un rango `inicio`–`fin` de tipo `TIMESTAMPTZ`** en lugar de tres columnas sueltas. Los atributos `fecha`, `hora_inicio` y `hora_fin` del documento existen igual, pero como **columnas generadas**: se calculan solas y no pueden quedar desincronizadas.
- **`precio_total` queda congelado en la reserva.** Si el complejo cambia la tarifa, las reservas ya hechas conservan el precio que se cobró.
- **`usuario.complejo_id`** se agregó al modelo original para saber de qué complejo es administrador un usuario. Sin eso, cualquier admin podría editar las canchas de cualquier complejo.
- **Cinco triggers** cuidan los datos derivados y las reglas de los partidos: uno completa `deporte`, `fecha` y `hora` del partido desde su reserva; otro anota al creador como primer participante; el tercero recalcula `jugadores_actuales` y el estado cada vez que alguien se suma o se baja; el cuarto cancela el partido cuando se cancela su reserva; y el quinto bloquea el partido antes de anotar a alguien, para que no se pase del cupo.

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
- [x] **Autenticación**: registro, login con JWT y middleware de sesión
- [ ] **Reservas**: grilla de disponibilidad por día y alta de reservas
- [ ] **Partidos**: listado de partidos abiertos y sumarse a uno
- [ ] **Panel de administración**: gestión de las canchas del complejo propio (la API ya está; falta la pantalla)

## Notas

- Las credenciales de PostgreSQL (`turnito` / `turnito`) son valores de desarrollo.
- Todos los turnos duran **una hora y empiezan en hora en punto**. Esa decisión permite generar la grilla de horarios a partir del horario de apertura y cierre del complejo, sin necesidad de una tabla de disponibilidad.
- Los horarios se manejan en la zona `America/Argentina/Buenos_Aires`, configurada en el contenedor de PostgreSQL.
- Proyecto desarrollado en el marco de la materia Metodología de Sistemas 2.
