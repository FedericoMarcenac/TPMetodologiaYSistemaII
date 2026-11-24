import { useCallback, useEffect, useState } from 'react';

// Pide datos al abrir la pantalla y devuelve los tres estados que toda pantalla tiene que mostrar.
// Uso: const { datos, cargando, error, recargar } = useCarga(() => api.get('/canchas'), []);
export function useCarga(pedir, dependencias) {
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: null });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cargar = useCallback(pedir, dependencias);

  const recargar = useCallback(() => {
    setEstado((anterior) => ({ ...anterior, cargando: true, error: null }));
    return cargar()
      .then((datos) => setEstado({ datos, cargando: false, error: null }))
      .catch((error) => setEstado({ datos: null, cargando: false, error }));
  }, [cargar]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { ...estado, recargar };
}
