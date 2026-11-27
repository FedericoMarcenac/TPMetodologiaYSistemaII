import { Badge, Button, Card, HStack, NativeSelect, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { SearchX, Volleyball } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../api.js';
import { useCarga } from '../useCarga.js';
import { Cargando, Encabezado, ErrorCarga, ListaVacia } from '../componentes/estados.jsx';
import { DEPORTES } from '../partidos.js';

const ESTADOS = {
  disponible: { texto: 'Disponible', color: 'brand' },
  mantenimiento: { texto: 'En mantenimiento', color: 'pelota' },
  inactiva: { texto: 'Inactiva', color: 'gray' },
};

const pesos = (monto) =>
  monto.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

function Filtros({ deporte, complejoId, complejos, onCambiar }) {
  return (
    <HStack gap="3" wrap="wrap" pb="5">
      <NativeSelect.Root size="md" width={{ base: 'full', sm: 'auto' }}>
        <NativeSelect.Field
          aria-label="Filtrar por deporte"
          value={deporte}
          onChange={(e) => onCambiar('deporte', e.target.value)}
        >
          <option value="">Todos los deportes</option>
          {Object.entries(DEPORTES).map(([valor, nombre]) => (
            <option key={valor} value={valor}>{nombre}</option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>

      <NativeSelect.Root size="md" width={{ base: 'full', sm: 'auto' }}>
        <NativeSelect.Field
          aria-label="Filtrar por complejo"
          value={complejoId}
          onChange={(e) => onCambiar('complejo_id', e.target.value)}
        >
          <option value="">Todos los complejos</option>
          {complejos.map((complejo) => (
            <option key={complejo.id} value={complejo.id}>{complejo.nombre}</option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </HStack>
  );
}

function TarjetaCancha({ cancha }) {
  const estado = ESTADOS[cancha.estado] ?? ESTADOS.inactiva;
  const disponible = cancha.estado === 'disponible';

  return (
    <Card.Root variant="outline">
      <Card.Body gap="3">
        <HStack justify="space-between" align="start" gap="3">
          <Stack gap="1" minW="0">
            <Text color="brand.fg" fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="wider">
              {DEPORTES[cancha.deporte] ?? cancha.deporte}
            </Text>
            <Card.Title fontFamily="heading" fontSize="2xl" lineHeight="1.1">
              {cancha.nombre}
            </Card.Title>
          </Stack>
          <Badge colorPalette={estado.color} flexShrink="0">{estado.texto}</Badge>
        </HStack>

        <Stack gap="1">
          <Text color="fg.muted" fontSize="sm">{cancha.complejo}</Text>
          <Text fontSize="sm" color="fg.muted">{cancha.capacidad} jugadores</Text>
        </Stack>

        <Stack gap="0">
          <Text fontSize="xs" color="fg.muted">Precio por hora</Text>
          <Text fontWeight="700" fontSize="xl">{pesos(cancha.precio_por_hora)}</Text>
        </Stack>
      </Card.Body>

      <Card.Footer pt="0">
        {disponible ? (
          <Button asChild colorPalette="brand" w="full">
            <Link to={`/canchas/${cancha.id}`}>Ver turnos</Link>
          </Button>
        ) : (
          <Button w="full" variant="outline" disabled>No disponible para reservar</Button>
        )}
      </Card.Footer>
    </Card.Root>
  );
}

export default function Canchas() {
  const [params, setParams] = useSearchParams();
  const deporte = DEPORTES[params.get('deporte')] ? params.get('deporte') : '';
  const complejoId = params.get('complejo_id') ?? '';

  const { datos, cargando, error, recargar } = useCarga(async () => {
    const consulta = new URLSearchParams();
    if (deporte) consulta.set('deporte', deporte);
    if (complejoId) consulta.set('complejo_id', complejoId);

    const ruta = consulta.size ? `/canchas?${consulta.toString()}` : '/canchas';
    const [canchas, complejos] = await Promise.all([
      api.get(ruta),
      api.get('/complejos'),
    ]);
    return { canchas, complejos };
  }, [deporte, complejoId]);

  function cambiarFiltro(campo, valor) {
    const nuevos = new URLSearchParams(params);
    if (valor) nuevos.set(campo, valor);
    else nuevos.delete(campo);
    setParams(nuevos, { replace: true });
  }

  const canchas = cargando ? null : datos?.canchas;

  return (
    <>
      <Encabezado
        titulo="Canchas"
        descripcion="Buscá una cancha por deporte o complejo y consultá sus turnos disponibles."
      />

      <Filtros
        deporte={deporte}
        complejoId={complejoId}
        complejos={datos?.complejos ?? []}
        onCambiar={cambiarFiltro}
      />

      {cargando && <Cargando filas={3} alto="44" />}
      {error && <ErrorCarga error={error} onReintentar={recargar} />}

      {canchas?.length === 0 && (
        <ListaVacia
          icono={SearchX}
          titulo="No encontramos canchas"
          descripcion="Probá cambiar los filtros para ver otras opciones."
        />
      )}

      {canchas?.length > 0 && (
        <SimpleGrid as="ul" listStyleType="none" columns={{ base: 1, md: 2, lg: 3 }} gap="4">
          {canchas.map((cancha) => (
            <li key={cancha.id}><TarjetaCancha cancha={cancha} /></li>
          ))}
        </SimpleGrid>
      )}

      {!cargando && !error && datos?.complejos.length === 0 && (
        <ListaVacia
          icono={Volleyball}
          titulo="Todavía no hay complejos cargados"
          descripcion="Cuando se agreguen complejos, sus canchas van a aparecer acá."
        />
      )}
    </>
  );
}
