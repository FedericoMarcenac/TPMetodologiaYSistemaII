import { useCallback, useEffect, useState } from 'react';

// Pide datos al abrir la pantalla y devuelve los tres estados que toda pantalla tiene que mostrar.
// Uso: const { datos, cargando, error, recargar } = useCarga(() => api.get('/canchas'), []);
// Mientras recarga se siguen mostrando los datos anteriores, para no volver al esqueleto.
export function useCarga(pedir, dependencias) {
  const [vuelta, setVuelta] = useState(0);
  const [estado, setEstado] = useState({ datos: null, error: null, clave: null });
  const clave = JSON.stringify([...dependencias, vuelta]);

  useEffect(() => {
    // Si las dependencias cambian antes de que llegue la respuesta, la vieja se descarta y no pisa a la nueva.
    let vigente = true;
    pedir()
      .then((datos) => vigente && setEstado({ datos, error: null, clave }))
      .catch((error) => vigente && setEstado({ datos: null, error, clave }));
    return () => {
      vigente = false;
    };
    // `pedir` es una funcion nueva en cada render: lo que la hace cambiar son las dependencias, que van en `clave`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  const cargando = estado.clave !== clave;
  const recargar = useCallback(() => setVuelta((v) => v + 1), []);

  return { datos: estado.datos, cargando, error: cargando ? null : estado.error, recargar };
}
