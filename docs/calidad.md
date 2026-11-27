# Revisión de calidad con ESLint

Agregamos ESLint a la API y al front para revisar el código de forma automática. Es la misma revisión para los tres: corre con un comando y marca los problemas antes de que lleguen a `main`.

## Cómo se corre

```bash
docker compose exec api npm run lint
docker compose exec web npm run lint
```

Si no muestra nada, no encontró problemas. La primera vez después de bajar este cambio hay que reconstruir los contenedores, porque se agregaron dependencias: `docker compose up -d --build --renew-anon-volumes`.

## Qué reglas usa

- **API** (`api/eslint.config.js`): las recomendadas de ESLint (`@eslint/js`) con las variables globales de Node.
- **Front** (`web/eslint.config.js`): las recomendadas de ESLint más las de `eslint-plugin-react-hooks`, que son las reglas oficiales de React para los hooks.

Ajustamos una sola regla, `no-unused-vars`, para dos casos que son a propósito y que explicamos abajo.

## Qué encontró la primera pasada

La primera vez encontró 6 problemas: 2 en la API y 4 en el front.

| # | Dónde | Qué marcó | Qué hicimos |
|---|---|---|---|
| 1 | `api/src/middlewares/errores.js` | `next` se recibe y no se usa | **Se queda, a propósito.** Express reconoce el manejador de errores porque la función recibe 4 parámetros. Si sacamos el cuarto, Express lo trata como un middleware común y los errores dejan de llegar ahí. Lo renombramos a `_next` y configuramos la regla para que ignore los parámetros que empiezan con `_`. |
| 2 | `api/src/services/authService.js` | `password_hash` se declara y no se usa | **Se queda, a propósito.** `const { password_hash, ...usuario } = encontrado` es la forma de sacar el hash antes de devolver el usuario. Activamos `ignoreRestSiblings`, que es la opción de la regla para este patrón. |
| 3 | `web/src/paginas/PublicarPartido.jsx` | `Text` se importa y no se usa | Sacamos el import. |
| 4 | `web/src/useCarga.js` | La lista de dependencias de `useCallback` no es un arreglo escrito a mano | Reescribimos el hook (ver abajo). |
| 5 | `web/src/useCarga.js` | Se llama a `setState` directamente dentro de un `useEffect` | Reescribimos el hook (ver abajo). |
| 6 | `web/vite.config.js` | `process` no está definido | El archivo corre en Node, no en el navegador. Le indicamos a ESLint que use las globales de Node para ese archivo. |

### `useCarga`: un problema real que no se veía

`useCarga` es el hook que usan todas las pantallas para pedir datos. Las reglas de hooks marcaron dos cosas en cómo estaba escrito. Al revisarlo apareció un error que nunca habíamos visto en las pruebas:

**Si las dependencias cambiaban antes de que llegara la respuesta, una respuesta vieja podía pisar a la nueva.** Por ejemplo: en partidos tocás "Fútbol" y enseguida "Pádel". Si la respuesta de fútbol tarda más, llega última y la pantalla muestra fútbol con el filtro de pádel marcado. Lo mismo pasa al cambiar rápido de día en la agenda del panel de administración.

La versión nueva:

- Descarta la respuesta de un pedido viejo: cada efecto tiene su bandera `vigente`, que se apaga cuando cambian las dependencias.
- Calcula `cargando` en vez de guardarlo, comparando la "clave" de las dependencias actuales con la de los datos que llegaron. Así no hace falta llamar a `setState` dentro del efecto.
- Devuelve lo mismo que antes (`{ datos, cargando, error, recargar }`) y se comporta igual: mientras recarga se siguen viendo los datos anteriores. Ninguna pantalla tuvo que cambiar.

La comprobamos en el navegador: tocando cinco filtros seguidos en partidos, la lista termina en el último que se eligió.

## Después de los arreglos

```text
$ docker compose exec api npm run lint
$ docker compose exec web npm run lint
```

Las dos pasadas terminan sin errores. Los 36 tests de la API siguen en verde y el front compila (`npx vite build`).
