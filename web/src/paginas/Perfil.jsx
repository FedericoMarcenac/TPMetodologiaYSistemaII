import { Avatar, Box, Button, Card, DataList, HStack, Stack, Text } from '@chakra-ui/react';
import { CalendarCheck, ChevronRight, LogOut, Settings, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useSesion } from '../sesion.jsx';
import { Encabezado } from '../componentes/estados.jsx';

function Acceso({ a, icono: Icono, titulo, descripcion }) {
  return (
    <Box
      asChild
      display="flex"
      alignItems="center"
      gap="4"
      px="4"
      py="3.5"
      borderRadius="lg"
      transition="background 150ms"
      _hover={{ bg: 'bg.muted' }}
      _focusVisible={{ outline: '2px solid', outlineColor: 'brand.focusRing', outlineOffset: '2px' }}
    >
      <Link to={a}>
        <Box color="brand.fg" flexShrink="0" aria-hidden="true"><Icono /></Box>
        <Stack gap="0" flex="1" minW="0">
          <Text fontWeight="600">{titulo}</Text>
          <Text fontSize="sm" color="fg.muted">{descripcion}</Text>
        </Stack>
        <Box color="fg.subtle" aria-hidden="true"><ChevronRight size={18} /></Box>
      </Link>
    </Box>
  );
}

export default function Perfil() {
  const { usuario, salir } = useSesion();
  const navigate = useNavigate();
  const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`;
  const desde = new Date(usuario.fecha_registro).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  function cerrarSesion() {
    salir();
    navigate('/', { replace: true });
  }

  return (
    <>
      <Encabezado titulo="Mi perfil" />
      <Stack gap="6" maxW="xl">
        <Card.Root variant="outline">
          <Card.Body gap="5">
            <HStack gap="4">
              <Avatar.Root size="xl" colorPalette="brand">
                <Avatar.Fallback name={nombreCompleto} />
              </Avatar.Root>
              <Stack gap="0.5" minW="0">
                <Text fontFamily="heading" fontWeight="700" fontSize="2xl" lineHeight="1.1" truncate>{nombreCompleto}</Text>
                <Text color="fg.muted" fontSize="sm">
                  {usuario.rol === 'administrador' ? 'Administrador' : 'Jugador'} · en Turnito desde {desde}
                </Text>
              </Stack>
            </HStack>
            <DataList.Root orientation="horizontal" size="lg">
              <DataList.Item>
                <DataList.ItemLabel>Email</DataList.ItemLabel>
                <DataList.ItemValue wordBreak="break-all">{usuario.email}</DataList.ItemValue>
              </DataList.Item>
              <DataList.Item>
                <DataList.ItemLabel>Teléfono</DataList.ItemLabel>
                <DataList.ItemValue color={usuario.telefono ? undefined : 'fg.muted'}>
                  {usuario.telefono ?? 'Sin cargar'}
                </DataList.ItemValue>
              </DataList.Item>
            </DataList.Root>
          </Card.Body>
        </Card.Root>

        <Stack as="nav" aria-label="Accesos" gap="1" borderWidth="1px" borderRadius="xl" p="1">
          <Acceso a="/mis-reservas" icono={CalendarCheck} titulo="Mis reservas" descripcion="Tus turnos próximos y pasados" />
          <Acceso a="/partidos" icono={Users} titulo="Partidos" descripcion="Los que buscan jugadores; adentro de cada uno ves si estás anotado" />
          {usuario.rol === 'administrador' && (
            <Acceso a="/admin" icono={Settings} titulo="Administración" descripcion="Las canchas y la agenda de tu complejo" />
          )}
        </Stack>

        <Button variant="outline" colorPalette="red" alignSelf="start" onClick={cerrarSesion}>
          <LogOut /> Cerrar sesión
        </Button>
      </Stack>
    </>
  );
}
