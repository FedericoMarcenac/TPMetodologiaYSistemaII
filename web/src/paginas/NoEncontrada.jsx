import { Button } from '@chakra-ui/react';
import { MapPinOff } from 'lucide-react';
import { Link } from 'react-router';
import { Encabezado, ListaVacia } from '../componentes/estados.jsx';

export default function NoEncontrada() {
  return (
    <>
      <Encabezado titulo="Fuera de la cancha" />
      <ListaVacia
        icono={MapPinOff}
        titulo="Esta página no existe"
        descripcion="Puede que el link esté mal escrito o que la página se haya movido."
      >
        <Button asChild>
          <Link to="/">Volver al inicio</Link>
        </Button>
      </ListaVacia>
    </>
  );
}
