import { Badge, Button, Card, HStack, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { CalendarDays, Clock, MapPin, Plus, Users } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../api.js';
import { useCarga } from '../useCarga.js';
import { useSesion } from '../sesion.jsx';
import { Cargando, Encabezado, ErrorCarga, ListaVacia } from '../componentes/estados.jsx';
import { DEPORTES, fechaCorta, lugaresLibres, textoFaltan } from '../partidos.js';

function FiltroDeporte({ elegido, onElegir }) {
  const opciones = [['', 'Todos'], ...Object.entries(DEPORTES)];
  return (
    <HStack gap="2" wrap="wrap" role="group" aria-label="Filtrar por deporte" pb="5">
      {opciones.map(([valor, texto]) => (
        <Button
          key={valor || 'todos'}
          size="sm"
          borderRadius="full"
          variant={elegido === valor ? 'solid' : 'outline'}
          aria-pressed={elegido === valor}
          onClick={() => onElegir(valor)}
        >
          {texto}
        </Button>
      ))}
    </HStack>
  );
}

function Dato({ icono: Icono, children }) {
  return (
    <HStack gap="1.5" color="fg.muted" fontSize="sm" minW="0">
      <Icono size={16} aria-hidden="true" />
      <Text truncate>{children}</Text>
    </HStack>
  );
}

export function TarjetaPartido({ partido }) {
  const libres = lugaresLibres(partido);
  return (
    <Card.Root
      asChild
      variant="outline"
      transition="border-color 150ms, box-shadow 150ms"
      _hover={{ borderColor: 'brand.border', boxShadow: 'sm' }}
      _focusVisible={{ outline: '2px solid', outlineColor: 'brand.focusRing', outlineOffset: '2px' }}
    >
      <Link to={`/partidos/${partido.id}`}>
        <Card.Body gap="3">
          <HStack justify="space-between" align="start" gap="3">
            <Stack gap="0.5" minW="0">
              <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="wider" color="brand.fg">
                {DEPORTES[partido.deporte] ?? partido.deporte}
              </Text>
              <Card.Title fontFamily="heading" fontSize="2xl" lineHeight="1.1" truncate>
                {partido.cancha}
              </Card.Title>
            </Stack>
            <Badge colorPalette="pelota" size="lg" flexShrink="0">{textoFaltan(libres)}</Badge>
          </HStack>
          <Stack gap="1.5">
            <Dato icono={MapPin}>{partido.complejo}</Dato>
            <HStack gap="4">
              <Dato icono={CalendarDays}>{fechaCorta(partido.fecha)}</Dato>
              <Dato icono={Clock}>{partido.hora} h</Dato>
            </HStack>
            <Dato icono={Users}>{partido.jugadores_actuales} de {partido.jugadores_necesarios} anotados</Dato>
          </Stack>
        </Card.Body>
      </Link>
    </Card.Root>
  );
}

export default function Partidos() {
  const { usuario } = useSesion();
  const [params, setParams] = useSearchParams();
  const deporte = DEPORTES[params.get('deporte')] ? params.get('deporte') : '';
  const { datos, cargando, error, recargar } = useCarga(
    () => api.get(deporte ? `/partidos?deporte=${deporte}` : '/partidos'),
    [deporte],
  );

  function elegirDeporte(valor) {
    setParams(valor ? { deporte: valor } : {}, { replace: true });
  }

  return (
    <>
      <Encabezado titulo="Partidos abiertos" descripcion="Partidos que todavía buscan jugadores. Entrá a uno para sumarte.">
        {usuario && (
          <Button asChild colorPalette="pelota">
            <Link to="/partidos/nuevo"><Plus /> Publicar partido</Link>
          </Button>
        )}
      </Encabezado>

      <FiltroDeporte elegido={deporte} onElegir={elegirDeporte} />

      {cargando && <Cargando filas={3} alto="40" />}
      {error && <ErrorCarga error={error} onReintentar={recargar} />}
      {datos?.length === 0 && (
        <ListaVacia
          icono={Users}
          titulo={deporte ? `No hay partidos de ${DEPORTES[deporte].toLowerCase()} con lugar` : 'No hay partidos con lugar'}
          descripcion="Reservá una cancha y publicá tu propio partido para que otros se sumen."
        >
          <Button asChild variant="outline"><Link to="/canchas">Buscar cancha</Link></Button>
        </ListaVacia>
      )}
      {datos?.length > 0 && (
        <SimpleGrid as="ul" listStyleType="none" columns={{ base: 1, md: 2, lg: 3 }} gap="4">
          {datos.map((partido) => (
            <li key={partido.id}><TarjetaPartido partido={partido} /></li>
          ))}
        </SimpleGrid>
      )}
    </>
  );
}
