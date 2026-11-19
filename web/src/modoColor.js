import { useState } from 'react';

const CLAVE = 'modo-color';

function modoGuardado() {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado === 'dark' || guardado === 'light') return guardado;
  } catch {
    // Sin acceso a localStorage (modo privado): se usa el del sistema.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Chakra pinta el modo oscuro cuando <html> tiene la clase "dark".
export function aplicarModo(modo = modoGuardado()) {
  const html = document.documentElement;
  html.classList.toggle('dark', modo === 'dark');
  html.classList.toggle('light', modo !== 'dark');
  html.style.colorScheme = modo;
}

export function useModoColor() {
  const [modo, setModo] = useState(modoGuardado);

  function alternar() {
    const nuevo = modo === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(CLAVE, nuevo);
    } catch {
      // Si no se puede guardar, igual cambia por esta visita.
    }
    aplicarModo(nuevo);
    setModo(nuevo);
  }

  return { modo, alternar };
}
