import { Badge, Button, Code, Heading, HStack, Separator, Stack, Text } from '@chakra-ui/react';
import { CalendarX } from 'lucide-react';
import { Link } from 'react-router';
import { Cargando, Encabezado, ErrorCarga, ListaVacia } from '../componentes/estados.jsx';
import ConfirmarAccion from '../componentes/ConfirmarAccion.jsx';
import { avisar } from '../componentes/avisos.jsx';

// Muestra de los componentes compartidos. No esta en el menu: se entra por /componentes.

function Bloque({ titulo, codigo, children }) {
  return (
    <Stack gap="3" py="6">
      <Heading as="h2" size="lg" fontWeight="700">{titulo}</Heading>
      <Code colorPalette="gray" display="block" whiteSpace="pre-wrap" p="3" borderRadius="md" fontSize="xs">{codigo}</Code>
      {children}
    </Stack>
  );
}

export default function Componentes() {
  return (
    <>
      <Encabezado titulo="Componentes" descripcion="Lo que usa cada pantalla. Copiá el código de cada bloque.">
        <Button asChild variant="outline"><Link to="/">Volver</Link></Button>
      </Encabezado>

      <Bloque titulo="Botones" codigo={`<Button>Reservar</Button>  // verde: la acción principal\n<Button colorPalette="pelota">Sumarme</Button>  // naranja: partidos\n<Button variant="outline">Volver</Button>`}>
        <HStack wrap="wrap" gap="3">
          <Button>Reservar</Button>
          <Button colorPalette="pelota">Sumarme</Button>
          <Button variant="outline">Volver</Button>
          <Button variant="ghost">Ver más</Button>
          <Button loading>Reservando</Button>
          <Button disabled>Sin lugar</Button>
        </HStack>
      </Bloque>
      <Separator />

      <Bloque titulo="Etiquetas de estado" codigo={`<Badge colorPalette="brand">Libre</Badge>\n<Badge colorPalette="pelota">Faltan 2</Badge>`}>
        <HStack wrap="wrap" gap="2">
          <Badge colorPalette="brand" size="lg">Libre</Badge>
          <Badge colorPalette="gray" size="lg">Ocupado</Badge>
          <Badge colorPalette="pelota" size="lg">Faltan 2</Badge>
          <Badge colorPalette="red" size="lg">Cancelado</Badge>
        </HStack>
      </Bloque>
      <Separator />

      <Bloque titulo="Cargando" codigo={`const { datos, cargando, error, recargar } = useCarga(() => api.get('/canchas'), []);\nif (cargando) return <Cargando filas={3} />;`}>
        <Cargando filas={2} />
      </Bloque>
      <Separator />

      <Bloque titulo="Error al cargar" codigo={`if (error) return <ErrorCarga error={error} onReintentar={recargar} />;`}>
        <ErrorCarga error={{ message: 'No se pudo conectar con el servidor' }} onReintentar={() => avisar('Reintentando…', 'info')} />
      </Bloque>
      <Separator />

      <Bloque titulo="Lista vacía" codigo={`<ListaVacia icono={CalendarX} titulo="Todavía no reservaste" descripcion="...">\n  <Button asChild><Link to="/canchas">Buscar cancha</Link></Button>\n</ListaVacia>`}>
        <ListaVacia icono={CalendarX} titulo="Todavía no reservaste" descripcion="Elegí una cancha y un horario libre; tu reserva aparece acá.">
          <Button asChild><Link to="/canchas">Buscar cancha</Link></Button>
        </ListaVacia>
      </Bloque>
      <Separator />

      <Bloque titulo="Confirmar una acción" codigo={`<ConfirmarAccion titulo="¿Cancelar la reserva?" descripcion="..." textoConfirmar="Cancelar reserva" peligro\n  onConfirmar={() => api.patch(\`/reservas/\${id}/cancelar\`)}>\n  <Button variant="outline" colorPalette="red">Cancelar</Button>\n</ConfirmarAccion>`}>
        <HStack>
          <ConfirmarAccion
            titulo="¿Cancelar la reserva?"
            descripcion="Cancha 1, mañana de 19 a 20. Si tiene un partido, también se cancela."
            textoConfirmar="Cancelar reserva"
            peligro
            onConfirmar={async () => avisar('Reserva cancelada')}
          >
            <Button variant="outline" colorPalette="red">Cancelar reserva</Button>
          </ConfirmarAccion>
          <ConfirmarAccion
            titulo="Ejemplo con error"
            descripcion="Así se ve cuando la API rechaza la acción."
            onConfirmar={async () => { throw new Error('Ese turno ya está reservado'); }}
          >
            <Button variant="outline">Probar error</Button>
          </ConfirmarAccion>
        </HStack>
      </Bloque>
      <Separator />

      <Bloque titulo="Avisos" codigo={`avisar('Reserva confirmada');\navisar('No se pudo cancelar', 'error');`}>
        <HStack wrap="wrap">
          <Button variant="outline" onClick={() => avisar('Reserva confirmada', 'success', 'Cancha 1, mañana a las 19')}>Aviso de éxito</Button>
          <Button variant="outline" onClick={() => avisar('El partido ya no tiene lugar', 'error')}>Aviso de error</Button>
        </HStack>
        <Text color="fg.muted" fontSize="sm">Los avisos salen arriba, para no tapar las pestañas del celular.</Text>
      </Bloque>
    </>
  );
}
