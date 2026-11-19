import { Box, Button, Container, Flex, Link } from '@chakra-ui/react';
import { Link as RouterLink, Outlet, useNavigate } from 'react-router';
import { useSesion } from '../sesion.jsx';

function Enlace({ to, children }) {
  return (
    <Link asChild>
      <RouterLink to={to}>{children}</RouterLink>
    </Link>
  );
}

export default function Layout() {
  const { usuario, salir } = useSesion();
  const navigate = useNavigate();

  return (
    <Box minH="100vh">
      <Box as="header" borderBottomWidth="1px">
        <Container maxW="6xl">
          <Flex as="nav" gap="4" py="3" align="center" wrap="wrap">
            <Enlace to="/">Turnito</Enlace>
            <Enlace to="/canchas">Canchas</Enlace>
            <Enlace to="/partidos">Partidos</Enlace>
            {usuario && <Enlace to="/mis-reservas">Mis reservas</Enlace>}
            {usuario?.rol === 'administrador' && <Enlace to="/admin">Administración</Enlace>}
            <Box flex="1" />
            {usuario ? (
              <>
                <Enlace to="/perfil">{usuario.nombre}</Enlace>
                <Button size="sm" variant="outline" onClick={() => { salir(); navigate('/'); }}>
                  Salir
                </Button>
              </>
            ) : (
              <Enlace to="/login">Entrar</Enlace>
            )}
          </Flex>
        </Container>
      </Box>
      <Container as="main" maxW="6xl">
        <Outlet />
      </Container>
    </Box>
  );
}
