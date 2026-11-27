import { Box, Button, Heading, HStack, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { ArrowRight, Settings, Users } from 'lucide-react';
import { Link } from 'react-router';
import { api } from '../api.js';
import { useCarga } from '../useCarga.js';
import { useSesion } from '../sesion.jsx';
import { Cargando, ErrorCarga, ListaVacia } from '../componentes/estados.jsx';
import { DEPORTES } from '../partidos.js';
import { TarjetaPartido } from './Partidos.jsx';

const PROXIMOS = 3;

function TarjetaDeporte({ valor, texto }) {
  return (
    <Box
      asChild
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      gap="3"
      px="5"
      py={{ base: '4', md: '6' }}
      borderWidth="1px"
      borderRadius="xl"
      bg="bg"
      transition="border-color 150ms, background 150ms"
      _hover={{ borderColor: 'brand.border', bg: 'brand.subtle' }}
      _focusVisible={{ outline: '2px solid', outlineColor: 'brand.focusRing', outlineOffset: '2px' }}
    >
      <Link to={`/canchas?deporte=${valor}`}>
        <Text fontFamily="heading" fontWeight="700" fontSize={{ base: '2xl', md: '3xl' }} lineHeight="1">
          {texto}
        </Text>
        <Box color="brand.fg" aria-hidden="true"><ArrowRight /></Box>
      </Link>
    </Box>
  );
}

export default function Inicio() {
  const { usuario } = useSesion();
  const { datos, cargando, error, recargar } = useCarga(() => api.get('/partidos'), []);

  return (
    <Stack gap={{ base: '8', md: '12' }} pt={{ base: '5', md: '10' }}>
      <Stack as="section" gap="5" aria-labelledby="titulo-inicio">
        <Stack gap="2">
          {usuario && <Text fontWeight="600" color="brand.fg">Hola, {usuario.nombre}</Text>}
          <Heading id="titulo-inicio" as="h1" fontSize={{ base: '4xl', md: '6xl' }} lineHeight="0.95" fontWeight="700">
            ¿A qué querés jugar?
          </Heading>
          <Text color="fg.muted" fontSize={{ md: 'lg' }} maxW="50ch">
            Elegí el deporte, mirá los turnos libres y reservá tu cancha en un minuto.
          </Text>
        </Stack>

        <SimpleGrid as="ul" listStyleType="none" columns={{ base: 1, sm: 3 }} gap="3" aria-label="Buscar canchas por deporte">
          {Object.entries(DEPORTES).map(([valor, texto]) => (
            <li key={valor}><TarjetaDeporte valor={valor} texto={texto} /></li>
          ))}
        </SimpleGrid>

        <HStack gap="3" wrap="wrap">
          <Button asChild variant="outline"><Link to="/canchas">Ver todas las canchas</Link></Button>
          {usuario?.rol === 'administrador' && (
            <Button asChild variant="ghost"><Link to="/admin"><Settings /> Panel de administración</Link></Button>
          )}
        </HStack>
      </Stack>

      <Stack as="section" gap="4" aria-labelledby="titulo-partidos">
        <HStack justify="space-between" align="end" gap="4" wrap="wrap">
          <Stack gap="1">
            <Heading id="titulo-partidos" as="h2" fontSize={{ base: '2xl', md: '3xl' }} lineHeight="1" fontWeight="700">
              Próximos partidos
            </Heading>
            <Text color="fg.muted">Partidos que buscan jugadores. Sumate a uno.</Text>
          </Stack>
          {datos?.length > PROXIMOS && (
            <Button asChild variant="ghost" size="sm"><Link to="/partidos">Ver todos <ArrowRight /></Link></Button>
          )}
        </HStack>

        {cargando && <Cargando filas={2} alto="40" />}
        {error && <ErrorCarga error={error} onReintentar={recargar} />}
        {datos?.length === 0 && (
          <ListaVacia
            icono={Users}
            titulo="Todavía no hay partidos con lugar"
            descripcion="Reservá una cancha y publicá el tuyo para que otros se sumen."
          />
        )}
        {datos?.length > 0 && (
          <SimpleGrid as="ul" listStyleType="none" columns={{ base: 1, md: 2, lg: 3 }} gap="4">
            {datos.slice(0, PROXIMOS).map((partido) => (
              <li key={partido.id}><TarjetaPartido partido={partido} /></li>
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Stack>
  );
}
