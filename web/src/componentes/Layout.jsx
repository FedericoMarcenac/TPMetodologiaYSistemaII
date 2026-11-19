import { Avatar, Box, Button, Container, Flex, HStack, IconButton, Menu, Portal, Text } from '@chakra-ui/react';
import { CalendarCheck, House, LogOut, Moon, Settings, Sun, User, Users, Volleyball } from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useSesion } from '../sesion.jsx';
import { useModoColor } from '../modoColor.js';
import { Avisos } from './avisos.jsx';

const SECCIONES = [
  { a: '/', texto: 'Inicio', icono: House, exacta: true },
  { a: '/canchas', texto: 'Canchas', icono: Volleyball },
  { a: '/partidos', texto: 'Partidos', icono: Users },
  { a: '/mis-reservas', texto: 'Mis reservas', icono: CalendarCheck },
];

function Marca() {
  return (
    <Link to="/" aria-label="Turnito, ir al inicio">
      <HStack gap="1.5" align="baseline">
        <Text fontFamily="heading" fontWeight="700" fontSize="2xl" lineHeight="1" color="brand.fg" letterSpacing="-0.01em">
          Turnito
        </Text>
        <Box boxSize="2" borderRadius="full" bg="pelota.solid" aria-hidden="true" />
      </HStack>
    </Link>
  );
}

function EnlaceArriba({ a, texto, exacta }) {
  return (
    <Box
      asChild
      px="3"
      py="2"
      borderRadius="md"
      fontWeight="600"
      color="fg.muted"
      transition="background 150ms, color 150ms"
      _hover={{ bg: 'bg.muted', color: 'fg' }}
      _currentPage={{ color: 'brand.fg', bg: 'brand.subtle' }}
      _focusVisible={{ outline: '2px solid', outlineColor: 'brand.focusRing', outlineOffset: '2px' }}
    >
      <NavLink to={a} end={exacta}>{texto}</NavLink>
    </Box>
  );
}

function PestanaAbajo({ a, texto, icono: Icono, exacta }) {
  return (
    <Flex
      asChild
      direction="column"
      align="center"
      justify="center"
      gap="0.5"
      flex="1"
      minH="14"
      fontSize="xs"
      fontWeight="600"
      color="fg.muted"
      _currentPage={{ color: 'brand.fg', '& svg': { strokeWidth: '2.5' } }}
      _focusVisible={{ outline: '2px solid', outlineColor: 'brand.focusRing', outlineOffset: '-2px' }}
    >
      <NavLink to={a} end={exacta}>
        <Icono size={22} aria-hidden="true" />
        {texto}
      </NavLink>
    </Flex>
  );
}

function MenuUsuario({ usuario, salir }) {
  const navigate = useNavigate();
  return (
    <Menu.Root positioning={{ placement: 'bottom-end' }}>
      <Menu.Trigger asChild>
        <Button variant="ghost" size="sm" px="1" aria-label={`Menú de ${usuario.nombre}`}>
          <Avatar.Root size="sm" colorPalette="brand">
            <Avatar.Fallback name={`${usuario.nombre} ${usuario.apellido}`} />
          </Avatar.Root>
          <Text hideBelow="md">{usuario.nombre}</Text>
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="48">
            <Menu.Item value="perfil" onSelect={() => navigate('/perfil')}>
              <User size={16} /> Mi perfil
            </Menu.Item>
            {usuario.rol === 'administrador' && (
              <Menu.Item value="admin" onSelect={() => navigate('/admin')}>
                <Settings size={16} /> Administración
              </Menu.Item>
            )}
            <Menu.Separator />
            <Menu.Item value="salir" color="fg.error" onSelect={() => { salir(); navigate('/'); }}>
              <LogOut size={16} /> Salir
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

export default function Layout() {
  const { usuario, salir } = useSesion();
  const { modo, alternar } = useModoColor();

  return (
    <Box minH="100dvh">
      <Box
        as="header"
        position="sticky"
        top="0"
        zIndex="sticky"
        bg="bg/90"
        backdropFilter="saturate(180%) blur(8px)"
        borderBottomWidth="1px"
        pt="env(safe-area-inset-top)"
      >
        <Container maxW="6xl">
          <Flex as="nav" aria-label="Principal" h="14" align="center" gap="2">
            <Marca />
            <HStack as="ul" listStyleType="none" gap="1" ms="6" hideBelow="md">
              {SECCIONES.filter((s) => s.a !== '/mis-reservas' || usuario).map((s) => (
                <li key={s.a}><EnlaceArriba {...s} /></li>
              ))}
              {usuario?.rol === 'administrador' && <li><EnlaceArriba a="/admin" texto="Administración" /></li>}
            </HStack>
            <Box flex="1" />
            <IconButton
              variant="ghost"
              size="sm"
              onClick={alternar}
              aria-label={modo === 'dark' ? 'Usar modo claro' : 'Usar modo oscuro'}
            >
              {modo === 'dark' ? <Sun /> : <Moon />}
            </IconButton>
            {usuario ? (
              <MenuUsuario usuario={usuario} salir={salir} />
            ) : (
              <Button asChild size="sm">
                <Link to="/login">Entrar</Link>
              </Button>
            )}
          </Flex>
        </Container>
      </Box>

      <Container as="main" maxW="6xl" pb={{ base: 'calc(4.5rem + env(safe-area-inset-bottom))', md: '12' }}>
        <Outlet />
      </Container>

      <Flex
        as="nav"
        aria-label="Secciones"
        hideFrom="md"
        position="fixed"
        insetX="0"
        bottom="0"
        zIndex="sticky"
        bg="bg"
        borderTopWidth="1px"
        pb="env(safe-area-inset-bottom)"
        px="2"
      >
        {SECCIONES.map((s) => (
          <PestanaAbajo key={s.a} {...s} />
        ))}
      </Flex>

      <Avisos />
    </Box>
  );
}
