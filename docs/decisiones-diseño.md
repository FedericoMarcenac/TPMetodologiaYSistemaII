# Decisiones de diseño

Caso analizado: dónde viven las reglas de negocio de reservas y partidos.
¿En la base de datos o en la API?

## 1. Código analizado

Todo el caso está en [`db/01-schema.sql`](../db/01-schema.sql). Es el único código del proyecto con lógica de negocio: la API todavía no existe. Los links a las líneas apuntan al commit `0199511`, el estado del esquema antes de este análisis.

| # | Regla | Dónde vive | Código | Estado al analizarla |
|---|---|---|---|---|
| 1 | Dos reservas de la misma cancha no se superponen | Base: restricción `reserva_sin_solape` | [L104-L107](https://github.com/FedericoMarcenac/TPMetodologiaYSistemaII/blob/01995111f646b008257babe1252766a2d6a822b6/db/01-schema.sql#L104-L107) | Se cumple |
| 2 | `fecha`, `hora_inicio` y `hora_fin` coinciden siempre con el rango de la reserva | Base: columnas generadas | [L87-L92](https://github.com/FedericoMarcenac/TPMetodologiaYSistemaII/blob/01995111f646b008257babe1252766a2d6a822b6/db/01-schema.sql#L87-L92) | Se cumple |
| 3 | El partido copia deporte, fecha y hora de su reserva | Base: `trg_partido_datos` | [L156-L171](https://github.com/FedericoMarcenac/TPMetodologiaYSistemaII/blob/01995111f646b008257babe1252766a2d6a822b6/db/01-schema.sql#L156-L171) | Se cumple |
| 4 | El creador queda anotado en su partido | Base: `trg_partido_creador` | [L174-L186](https://github.com/FedericoMarcenac/TPMetodologiaYSistemaII/blob/01995111f646b008257babe1252766a2d6a822b6/db/01-schema.sql#L174-L186) | Se cumple, pero el `RETURNING` del `INSERT` devuelve `jugadores_actuales = 0` |
| 5 | `jugadores_actuales` cuenta a los anotados y el partido pasa a `completo` al llenarse | Base: `trg_participante_cambio` | [L189-L216](https://github.com/FedericoMarcenac/TPMetodologiaYSistemaII/blob/01995111f646b008257babe1252766a2d6a822b6/db/01-schema.sql#L189-L216) | Falla si dos personas se suman a la vez |
| 6 | No se anota más gente que `jugadores_necesarios` | En ningún lado | — | No se controla |
| 7 | Si se cancela la reserva, se cancela el partido | En ningún lado | — | No se controla |

Las reglas 1 a 5 las cuida la base. La 6 y la 7 no las cuida nadie: el plan era que la API controlara el cupo, pero la API todavía no existe.

## 2. Diagnóstico

### 2.1 Reservas

(Fede: reglas 1, 2 y 7)

### 2.2 Partidos

(Nacho: reglas 3 a 6)

### 2.3 Conceptos aplicados

Las secciones 2.1 y 2.2 analizan cada regla. Acá va lo que atraviesa a las dos.

**El problema de fondo: no había un criterio.** La regla 1 está resuelta en la base y la 6 se iba a resolver en la API. Ninguna decisión escrita explicaba por qué una sí y la otra no.

**Acoplamiento temporal oculto** (*Hidden Temporal Coupling*, Clean Code). El trigger de la regla 5 cuenta bien solo si quien inserta bloqueó antes la fila del partido con `SELECT ... FOR UPDATE`. Esa condición no figura en ningún lado del esquema: la tendría que recordar cada endpoint que anote gente.

**Verificar y después actuar** (condición de carrera). Es el mismo problema en las reglas 1 y 6: consultar si hay lugar y después insertar deja una ventana en la que entra otro pedido. En la regla 1 se resolvió en la base; en la 6, no.

**Datos derivados duplicados.** `partido.deporte`, `fecha`, `hora` y `jugadores_actuales` se pueden calcular desde `reserva`, `cancha` y `participante_partido`. Se guardan porque el documento del proyecto los pide, y eso obliga a mantenerlos sincronizados. Si cada endpoint los actualizara a mano sería *Shotgun Surgery*: un cambio en cómo se anota la gente obligaría a tocar varios lugares. Por eso los mantienen triggers.

**Lo que está bien hecho.** Cada trigger tiene una sola responsabilidad (SRP) y funciona como un *Observer*: reacciona a un `INSERT` o un `UPDATE` sin que quien lo dispara lo sepa. Esa forma permite sumar reglas nuevas sin tocar las que ya existen (OCP), y es lo que aprovecha la decisión.

**Smells que detectamos y decidimos no cambiar:**

| Smell | Dónde | Por qué se mantiene |
|---|---|---|
| *Primitive Obsession* | El rol y los estados son `TEXT` con `CHECK` ([L47](https://github.com/FedericoMarcenac/TPMetodologiaYSistemaII/blob/01995111f646b008257babe1252766a2d6a822b6/db/01-schema.sql#L47), [L64](https://github.com/FedericoMarcenac/TPMetodologiaYSistemaII/blob/01995111f646b008257babe1252766a2d6a822b6/db/01-schema.sql#L64), [L96](https://github.com/FedericoMarcenac/TPMetodologiaYSistemaII/blob/01995111f646b008257babe1252766a2d6a822b6/db/01-schema.sql#L96), [L129](https://github.com/FedericoMarcenac/TPMetodologiaYSistemaII/blob/01995111f646b008257babe1252766a2d6a822b6/db/01-schema.sql#L129)) | Un `ENUM` de PostgreSQL no deja borrar valores; un `CHECK` se cambia con un `ALTER TABLE`. Con dos o tres valores por columna, el `CHECK` es más simple. |
| *Duplicated Code* (cadena mágica) | `'America/Argentina/Buenos_Aires'` tres veces en [L88-L92](https://github.com/FedericoMarcenac/TPMetodologiaYSistemaII/blob/01995111f646b008257babe1252766a2d6a822b6/db/01-schema.sql#L88-L92) y dos en [`docker-compose.yml`](https://github.com/FedericoMarcenac/TPMetodologiaYSistemaII/blob/01995111f646b008257babe1252766a2d6a822b6/docker-compose.yml#L8-L9) | Son tres usos seguidos en la misma tabla. Sacarlo a una función obligaría a declararla `IMMUTABLE` para poder usarla en columnas generadas, y agrega más de lo que ahorra. |

## 3. Alternativas

Para las reglas 5, 6 y 7 consideramos cuatro opciones.

### A. Dejarlo como está

Documentar que la API tiene que bloquear la fila del partido antes de anotar a alguien.

- **A favor:** no hay que cambiar nada.
- **En contra:** la regla depende de que cada endpoint se acuerde. Cualquier `INSERT` hecho por fuera de la API (el seed, psql, un endpoint futuro) la rompe; la prueba de 5.2 lo muestra. Y la regla 7 sigue sin resolverse.

### B. Pasar todas las reglas a la API

Una capa de servicios en JavaScript con toda la lógica; la base solo guarda datos.

- **A favor:** la lógica queda a la vista, se puede probar con tests unitarios sin levantar una base, y principios como SRP o DIP se aplican de forma más natural en módulos de código.
- **En contra:** la regla 1 habría que reimplementarla con bloqueos y, sin la restricción, la base acepta cualquier dato que le llegue. Es reescribir lo que ya funciona, para una API que todavía no existe.

### C. Un criterio explícito

Lo que tiene que ser cierto siempre (los invariantes de los datos) lo cuida la base. Lo que depende del pedido lo valida la API: quién lo hace, qué datos mandó, si el turno empieza en hora en punto y cae dentro del horario del complejo.

- **A favor:** las reglas valen sin importar quién escriba en la base, y la API queda con menos responsabilidades.
- **En contra:** la lógica queda repartida en dos lenguajes y hay que leer el esquema para entenderla.

### D. Calcular en vez de guardar

Aplicar *Replace Derived Variable with Query* (Fowler): borrar `jugadores_actuales` y calcularlo con una vista.

- **A favor:** elimina el contador y, con él, la condición de carrera de la regla 5.
- **En contra:** es el cambio más grande, el documento del proyecto pide el atributo, y la regla 6 necesita el bloqueo igual. No resuelve el problema principal.

### Comparación

| | A | B | C | D |
|---|---|---|---|---|
| La regla vale aunque se escriba por fuera de la API | No | No | Sí | Solo la 5 |
| Resuelve las reglas 5, 6 y 7 | No | Sí, mientras todo pase por la API | Sí | Solo la 5 |
| Qué hay que cambiar | Nada | Reimplementar la regla 1 y crear la capa de servicios | Agregar dos triggers | Crear una vista y sacar una columna |
| Se prueba sin levantar una base | No | Sí | No | No |

## 4. Decisión

Elegimos **C**, con este criterio: **si una regla tiene que cumplirse siempre, la cuida la base; si depende del pedido, la valida la API.**

Aplicado a las 7 reglas:

- **Se mantienen** `reserva_sin_solape`, las columnas generadas y los tres triggers existentes. Cumplen el criterio y funcionan.
- **Se agregan dos triggers:**
  - `trg_reserva_cancelada`, para la regla 7. Ver 2.1 y 5.1.
  - `trg_participante_cupo`, para la regla 6, que además corrige la 5: antes de anotar a alguien bloquea la fila del partido y rechaza el pedido si el partido no está abierto. Ver 2.2 y 5.2.
- **Se mantiene el `RETURNING` que devuelve 0** (regla 4). Es como funcionan los triggers `AFTER`: corren después de que el `INSERT` ya armó su resultado. Quien necesite el valor real lo lee con un `SELECT` después de insertar.
- **No se toca la API**, que todavía no existe. Cuando se haga, valida lo que depende del pedido y traduce los errores de la base a HTTP 409: `23P01` (turno ocupado), `23505` (registro repetido) y `23514` (partido sin lugar).

Descartamos A porque la prueba de 5.2 muestra que la regla se rompe en cuanto alguien no bloquea. B, porque reescribe lo que ya funciona y deja la base sin defensas. D, porque es el cambio más grande y no resuelve el cupo.

Habría que revisar esta decisión si se cambia de motor de base de datos, o si la API crece al punto de necesitar tests unitarios de estas reglas.

## 5. Evidencia y trade-offs

### 5.1 Pruebas de reservas

(Fede: antes y después de la cancelación)

### 5.2 Pruebas de partidos

(Nacho: antes y después de los dos a la vez)

### 5.3 Beneficios y costos

**Beneficios**

- Las reglas se cumplen para cualquier cliente: la API, el seed, una consola psql o un endpoint que todavía no existe.
- La API va a tener menos responsabilidades: sumarse a un partido se reduce a un `INSERT` y a traducir el error.
- Las reglas nuevas se agregaron sin modificar las existentes (OCP): los dos triggers nuevos no cambian ninguna línea de los tres anteriores.

**Costos**

- La lógica se ve menos: para saber qué pasa al anotar a alguien hay que leer el esquema, no la API. Lo compensamos con un comentario por trigger y con este documento.
- Quedamos atados a PostgreSQL: `btree_gist`, `EXCLUDE` y PL/pgSQL no existen igual en otros motores. Es depender de un detalle concreto y no de una abstracción, lo contrario de lo que pide DIP. Lo aceptamos porque no hay planes de cambiar de motor.
- Un trigger no se puede probar sin una base levantada. La evidencia de 5.1 y 5.2 son pruebas en psql, no tests automáticos.

**Sobre el refactoring.** Los dos triggers no son un refactoring: refactorizar es cambiar la estructura sin cambiar el comportamiento, y estos cambian el comportamiento porque corrigen fallas. La alternativa D sí lo hubiera sido. Lo más parecido a un refactoring que tiene el proyecto es el rango de la reserva: cambió cómo se guardan la fecha y la hora, y los tres atributos del documento siguen estando, como columnas generadas.
