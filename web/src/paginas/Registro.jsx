import { useState } from 'react';
import { Alert, Button, Field, Input, Link, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router';
import { api } from '../api.js';
import { useSesion } from '../sesion.jsx';
import { avisar } from '../componentes/avisos.jsx';
import PantallaAcceso from '../componentes/PantallaAcceso.jsx';
import CampoContrasena from '../componentes/CampoContrasena.jsx';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Las mismas reglas que valida la API, para avisar antes de mandar el formulario.
function validar(datos) {
  const errores = {};
  if (!datos.nombre.trim()) errores.nombre = 'Escribí tu nombre';
  if (!datos.apellido.trim()) errores.apellido = 'Escribí tu apellido';
  if (!EMAIL.test(datos.email.trim())) errores.email = 'Revisá el email, parece incompleto';
  if (datos.password.length < 6) errores.password = 'Tiene que tener al menos 6 caracteres';
  return errores;
}

export default function Registro() {
  const { usuario, entrar } = useSesion();
  const navigate = useNavigate();
  const location = useLocation();
  const desde = location.state?.desde ?? '/';

  const [datos, setDatos] = useState({ nombre: '', apellido: '', email: '', telefono: '', password: '' });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={desde} replace />;

  const cambiar = (campo) => (e) => {
    setDatos({ ...datos, [campo]: e.target.value });
    if (errores[campo]) setErrores({ ...errores, [campo]: undefined });
  };

  async function enviar(e) {
    e.preventDefault();
    const encontrados = validar(datos);
    setErrores(encontrados);
    setErrorGeneral(null);
    if (Object.keys(encontrados).length) return;

    setEnviando(true);
    try {
      const respuesta = await api.post('/auth/registrar', datos);
      entrar(respuesta);
      avisar(`¡Bienvenido, ${respuesta.usuario.nombre}!`, 'success', 'Ya podés reservar y sumarte a partidos.');
      navigate(desde, { replace: true });
    } catch (err) {
      if (err.status === 409) setErrores({ email: `${err.message}. ¿Querés entrar?` });
      else setErrorGeneral(err.message);
      setEnviando(false);
    }
  }

  const campo = (nombre, etiqueta, props = {}, ayuda) => (
    <Field.Root invalid={!!errores[nombre]} required={!props.opcional}>
      <Field.Label>
        {etiqueta}
        {props.opcional && <Field.RequiredIndicator fallback={<Text as="span" color="fg.muted" fontWeight="normal">(opcional)</Text>} />}
      </Field.Label>
      {nombre === 'password' ? (
        <CampoContrasena nueva size="lg" value={datos.password} onChange={cambiar('password')} />
      ) : (
        <Input size="lg" value={datos[nombre]} onChange={cambiar(nombre)} {...props.input} />
      )}
      {ayuda && !errores[nombre] && <Field.HelperText>{ayuda}</Field.HelperText>}
      <Field.ErrorText>{errores[nombre]}</Field.ErrorText>
    </Field.Root>
  );

  return (
    <PantallaAcceso
      titulo="Creá tu cuenta"
      bajada="Un minuto y ya podés reservar."
      pie={
        <Text>
          ¿Ya tenés cuenta?{' '}
          <Link asChild color="brand.fg" fontWeight="600">
            <RouterLink to="/login" state={location.state}>Entrá</RouterLink>
          </Link>
        </Text>
      }
    >
      <form onSubmit={enviar} noValidate>
        <Stack gap="4">
          {errorGeneral && (
            <Alert.Root status="error" borderRadius="lg" role="alert">
              <Alert.Indicator />
              <Alert.Title>{errorGeneral}</Alert.Title>
            </Alert.Root>
          )}
          <SimpleGrid columns={2} gap="3">
            {campo('nombre', 'Nombre', { input: { autoComplete: 'given-name' } })}
            {campo('apellido', 'Apellido', { input: { autoComplete: 'family-name' } })}
          </SimpleGrid>
          {campo('email', 'Email', { input: { type: 'email', inputMode: 'email', autoComplete: 'email', autoCapitalize: 'none' } })}
          {campo('telefono', 'Teléfono', { opcional: true, input: { type: 'tel', inputMode: 'tel', autoComplete: 'tel' } }, 'Para que el complejo te pueda avisar si pasa algo con tu turno.')}
          {campo('password', 'Contraseña', {}, 'Al menos 6 caracteres.')}
          <Button type="submit" size="lg" loading={enviando} loadingText="Creando cuenta">
            Crear cuenta
          </Button>
        </Stack>
      </form>
    </PantallaAcceso>
  );
}
