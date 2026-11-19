import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { ChakraProvider } from '@chakra-ui/react';
import { sistema } from './tema.js';
import { aplicarModo } from './modoColor.js';
import { SesionProvider } from './sesion.jsx';
import App from './App.jsx';

// Antes del primer dibujo, para que no parpadee en claro si el usuario eligio oscuro.
aplicarModo();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChakraProvider value={sistema}>
      <BrowserRouter>
        <SesionProvider>
          <App />
        </SesionProvider>
      </BrowserRouter>
    </ChakraProvider>
  </React.StrictMode>
);
