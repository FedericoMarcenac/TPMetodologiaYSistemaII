# TPMetodologiaYSistemas2

# Turnito

*Integrantes del Proyecto:*
- Ulises Fossati
- Ignacio Alvarado
- Federico Marcenac

Plataforma web para *reservar canchas deportivas y organizar partidos entre jugadores. Permite gestionar complejos deportivos, canchas de fútbol, básquet y pádel, y reservas por turno. Además, cualquier reserva puede publicarse como **partido abierto* para que otros usuarios se sumen y completen los equipos.

> *Estado:* en desarrollo. Hoy están funcionando el entorno con Docker, la base de datos completa y la pantalla inicial del frontend. La API todavía no existe.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite + Chakra UI v3 |
| Backend | Node.js + Express (pendiente) |
| Base de datos | PostgreSQL 16 |
| Autenticación | JWT + bcrypt (pendiente) |
| Contenedores | Docker / Docker Compose |

## Cómo levantarlo

Único requisito: *Docker Desktop* instalado. No hace falta instalar Node ni PostgreSQL.

bash
git clone https://github.com/FedericoMarcenac/TPMetodologiaYSistemas2
cd TPMetodologiaYSistemas2
docker compose up


Y abrir *http://localhost:5173*.

| Servicio | Puerto | Descripción |
|---|---|---|
| web | 5173 | Frontend React (Vite) |
| db | 5434 | PostgreSQL, con el esquema y los datos de ejemplo ya cargados |

### Otros comandos

bash
docker compose up -d      # levantar en segundo plano
docker compose down       # bajar
docker compose down -v    # bajar y BORRAR la base (para recrearla desde cero)


> La base solo ejecuta db/01-schema.sql y db/02-seed.sql *la primera vez* que se crea. Si modificás alguno de esos archivos, hay que correr docker compose down -v && docker compose up para que se vuelvan a aplicar.

### Consultar la base a mano

bash
docker compose exec db psql -U turnito -d turnito


### Si el puerto está ocupado

Si al levantar aparece port is already allocated, hay otro programa usando ese puerto. Se cambia el número de la *izquierda* en docker-compose.yml (por ejemplo "5175:5173") y listo.

## Qué hay hecho


TPMetodologiaYSistemas2/
├── docker-compose.yml      - Levanta la base y el frontend con un comando
├── db/
│   ├── 01-schema.sql       - Las 6 tablas, restricciones y triggers
│   └── 02-seed.sql         - Datos de ejemplo (2 complejos, 6 canchas, 4 usuarios)
├── web/                    - React + Vite + Chakra, pantalla inicial
│   ├── Dockerfile
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       └── App.jsx
└── api/                     Todavía no existe


### Usuarios de ejemplo

Todos con la contraseña turnito123:

| Email | Rol |
|---|---|
| admin@turnito.com | administrador |
| jugador@turnito.com | jugador |
| fede@turnito.com | jugador |
| lucia@turnito.com | jugador |

## Base de datos

Implementa las 6 entidades del documento del proyecto: *complejo_deportivo, **usuario, **cancha, **reserva, **partido* y *participante_partido*.

### Decisiones de diseño

- *La contraseña se guarda hasheada* con bcrypt, nunca en texto plano. Por eso la columna se llama password_hash.
- *reserva guarda un rango inicio–fin de tipo TIMESTAMPTZ* en lugar de tres columnas sueltas. Los atributos fecha, hora_inicio y hora_fin del documento existen igual, pero como *columnas generadas*: se calculan solas y no pueden quedar desincronizadas.
- *precio_total queda congelado en la reserva.* Si el complejo cambia la tarifa, las reservas ya hechas conservan el precio que se cobró.
- *usuario.complejo_id* se agregó al modelo original para saber de qué complejo es administrador un usuario. Sin eso, cualquier admin podría editar las canchas de cualquier complejo.
- *Tres triggers* mantienen sincronizados los datos derivados: uno completa deporte, fecha y hora del partido desde su reserva; otro anota al creador como primer participante; y el tercero recalcula jugadores_actuales y el estado cada vez que alguien se suma o se baja.

### Reservas sin superposición

Evitar que dos personas reserven la misma cancha en el mismo horario *no se puede resolver consultando antes de insertar*: entre la consulta que verifica que el turno está libre y el INSERT que lo ocupa, otro pedido puede meterse. El resultado serían dos reservas confirmadas sobre el mismo turno.

La solución está en el esquema, con una restricción de exclusión de PostgreSQL:

sql
CONSTRAINT reserva_sin_solape EXCLUDE USING gist (
  cancha_id                    WITH =,
  tstzrange(inicio, fin, '[)') WITH &&
) WHERE (estado <> 'cancelada')


No pueden coexistir dos filas con *la misma cancha* y cuyos *rangos horarios se superpongan*, salvo que la reserva esté cancelada. La base rechaza el insert con el código 23P01, sin importar cuántos pedidos lleguen a la vez.

Comportamiento verificado:

| Caso | Resultado |
|---|---|
| Mismo turno exacto | Rechazado |
| Solape parcial (19:30–20:30 sobre 19:00–20:00) | Rechazado |
| Turno pegado (21:00–22:00 después de 20:00–21:00) | Aceptado |
| Mismo horario en otra cancha | Aceptado |
| Turno liberado tras cancelar | Aceptado |

## Próximos pasos

- [ ] *API*: proyecto Express con conexión a la base y GET /api/canchas
- [ ] *Autenticación*: registro, login con JWT y middleware de sesión
- [ ] *Reservas*: grilla de disponibilidad por día y alta de reservas
- [ ] *Partidos*: listado de partidos abiertos y sumarse a uno
- [ ] *Panel de administración*: gestión de las canchas del complejo propio

## Notas

- Las credenciales de PostgreSQL (turnito / turnito) son valores de desarrollo.
- Todos los turnos duran *una hora y empiezan en hora en punto*. Esa decisión permite generar la grilla de horarios a partir del horario de apertura y cierre del complejo, sin necesidad de una tabla de disponibilidad.
- Los horarios se manejan en la zona America/Argentina/Buenos_Aires, configurada en el contenedor de PostgreSQL.
- Proyecto desarrollado en el marco de la materia Metodología de Sistemas 2.
