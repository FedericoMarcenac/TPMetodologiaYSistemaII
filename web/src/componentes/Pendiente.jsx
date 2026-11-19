import { Construction } from 'lucide-react';
import { Encabezado, ListaVacia } from './estados.jsx';

export default function Pendiente({ titulo, ticket }) {
  return (
    <>
      <Encabezado titulo={titulo} />
      <ListaVacia icono={Construction} titulo="Pantalla en construcción" descripcion={`La está armando el ticket ${ticket}.`} />
    </>
  );
}
