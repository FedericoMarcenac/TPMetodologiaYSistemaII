import { createContext, startTransition, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const SesionContext = createContext(null);

function leerUsuario() {
  try {
    return localStorage.getItem('token') ? JSON.parse(localStorage.getItem('usuario')) : null;
  } catch {
    return null;
  }
}

export function SesionProvider({ children }) {
  const [usuario, setUsuario] = useState(leerUsuario);

  function guardarUsuario(datos) {
    localStorage.setItem('usuario', JSON.stringify(datos));
    setUsuario(datos);
  }

  // Al abrir la app se piden los datos frescos: el usuario guardado puede haber cambiado.
  useEffect(() => {
    if (localStorage.getItem('token')) {
      api.get('/auth/yo').then(guardarUsuario).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const vencida = () => setUsuario(null);
    window.addEventListener('sesion-vencida', vencida);
    return () => window.removeEventListener('sesion-vencida', vencida);
  }, []);

  function entrar({ token, usuario: datos }) {
    localStorage.setItem('token', token);
    guardarUsuario(datos);
  }

  function salir() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    // En transicion, como los cambios de ruta del router: asi salir() y el navigate('/') que lo sigue
    // se dibujan juntos y RutaProtegida no alcanza a mandar al login desde una pantalla protegida.
    startTransition(() => setUsuario(null));
  }

  return (
    <SesionContext.Provider value={{ usuario, entrar, salir }}>
      {children}
    </SesionContext.Provider>
  );
}

export function useSesion() {
  return useContext(SesionContext);
}
