import { useState } from 'react';
import { Alert, Button, Field, HStack, Input, Link, Stack, Text } from '@chakra-ui/react';
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router';
import { api } from '../api.js';
import { useSesion } from '../sesion.jsx';
import PantallaAcceso from '../componentes/PantallaAcceso.jsx';
import CampoContrasena from '../componentes/CampoContrasena.jsx';

const DE_PRUEBA = [
  { texto: 'Jugador', email: 'jugador@turnito.com' },
  { texto: 'Administrador', email: 'admin@turnito.com' },
];

export default function Login() {
  const { usuario, entrar } = useSesion();
  const navigate = useNavigate();
  const location = useLocation();
  const desde = location.state?.desde ?? '/';

  const [datos, setDatos] = useState({ email: '', password: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  if (usuario) return <Navigate to={desde} replace />;

  const cambiar = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      entrar(await api.post('/auth/login', datos));
      navigate(desde, { replace: true });
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <PantallaAcceso
      titulo="Entrá a Turnito"
      bajada={desde === '/' ? 'Reservá tu cancha y sumate a partidos.' : 'Iniciá sesión para seguir.'}
      pie={
        <Text>
          ¿No tenés cuenta?{' '}
          <Link asChild color="brand.fg" fontWeight="600">
            <RouterLink to="/registro" state={location.state}>Creá una</RouterLink>
          </Link>
        </Text>
      }
    >
      <form onSubmit={enviar} noValidate>
        <Stack gap="4">
          {error && (
            <Alert.Root status="error" borderRadius="lg">
              <Alert.Indicator />
              <Alert.Title>{error}</Alert.Title>
            </Alert.Root>
          )}
          <Field.Root required>
            <Field.Label>Email</Field.Label>
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              size="lg"
              value={datos.email}
              onChange={cambiar('email')}
            />
          </Field.Root>
          <Field.Root required>
            <Field.Label>Contraseña</Field.Label>
            <CampoContrasena size="lg" value={datos.password} onChange={cambiar('password')} />
          </Field.Root>
          <Button type="submit" size="lg" loading={enviando} loadingText="Entrando" disabled={!datos.email || !datos.password}>
            Entrar
          </Button>
        </Stack>
      </form>

      <Stack mt="6" gap="2" p="4" borderRadius="lg" bg="bg.subtle">
        <Text fontSize="sm" color="fg.muted">Para probar, completá con un usuario de ejemplo:</Text>
        <HStack gap="2" wrap="wrap">
          {DE_PRUEBA.map((u) => (
            <Button key={u.email} size="xs" variant="outline" onClick={() => setDatos({ email: u.email, password: 'turnito123' })}>
              {u.texto}
            </Button>
          ))}
        </HStack>
      </Stack>
    </PantallaAcceso>
  );
}
