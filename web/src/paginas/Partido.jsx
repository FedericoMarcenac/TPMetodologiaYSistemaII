import { useState } from 'react';
import { Alert, Avatar, Badge, Button, Card, HStack, Progress, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { ArrowLeft, CalendarDays, Clock, Crown, MapPin, SearchX } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router';
import { api } from '../api.js';
import { useCarga } from '../useCarga.js';
import { useSesion } from '../sesion.jsx';
import { Cargando, Encabezado, ErrorCarga, ListaVacia } from '../componentes/estados.jsx';
import ConfirmarAccion from '../componentes/ConfirmarAccion.jsx';
import { avisar } from '../componentes/avisos.jsx';
import { DEPORTES, fechaLarga, lugaresLibres, textoFaltan } from '../partidos.js';

// Los horarios de la base son de Argentina, que no tiene horario de verano.
function yaEmpezo(partido) {
  return new Date(`${partido.fecha}T${partido.hora}:00-03:00`) <= new Date();
}

function Volver() {
  return (
    <Button asChild variant="ghost" size="sm" ms="-2" mt="4">
      <Link to="/partidos"><ArrowLeft /> Partidos</Link>
    </Button>
  );
}

function EstadoPartido({ partido }) {
  if (partido.estado === 'cancelado') return <Badge colorPalette="red" size="lg">Cancelado</Badge>;
  if (partido.completo) return <Badge colorPalette="gray" size="lg">Completo</Badge>;
  return <Badge colorPalette="pelota" size="lg">{textoFaltan(lugaresLibres(partido))}</Badge>;
}

function Cupo({ partido }) {
  return (
    <Stack gap="2">
      <HStack justify="space-between" fontSize="sm">
        <Text fontWeight="600">Jugadores</Text>
        <Text color="fg.muted">{partido.jugadores_actuales} de {partido.jugadores_necesarios}</Text>
      </HStack>
      <Progress.Root
        value={partido.jugadores_actuales}
        max={partido.jugadores_necesarios}
        colorPalette={partido.completo ? 'brand' : 'pelota'}
        size="lg"
        aria-label="Lugares ocupados"
      >
        <Progress.Track borderRadius="full">
          <Progress.Range />
        </Progress.Track>
      </Progress.Root>
    </Stack>
  );
}

function Participantes({ partido, usuarioId }) {
  return (
    <Stack as="ul" listStyleType="none" gap="3">
      {partido.participantes.map((p) => {
        const nombre = `${p.nombre} ${p.apellido}`;
        return (
          <HStack as="li" key={p.usuario_id} gap="3">
            <Avatar.Root size="sm" colorPalette={p.usuario_id === partido.creador_id ? 'pelota' : 'brand'}>
              <Avatar.Fallback name={nombre} />
            </Avatar.Root>
            <Text fontWeight={p.usuario_id === usuarioId ? '700' : '500'}>
              {nombre}{p.usuario_id === usuarioId && ' (vos)'}
            </Text>
            {p.usuario_id === partido.creador_id && (
              <Badge colorPalette="pelota" variant="subtle"><Crown size={12} /> Organiza</Badge>
            )}
          </HStack>
        );
      })}
    </Stack>
  );
}

function Acciones({ partido, usuario, onCambio }) {
  const location = useLocation();
  const [enviando, setEnviando] = useState(false);
  const anotado = usuario && partido.participantes.some((p) => p.usuario_id === usuario.id);

  async function sumarme() {
    setEnviando(true);
    try {
      await api.post(`/partidos/${partido.id}/participantes`);
      avisar('¡Te sumaste al partido!');
    } catch (e) {
      // Si alguien ocupo el ultimo lugar mientras miraba la pantalla, la API responde 409.
      avisar(e.message, 'error');
    } finally {
      setEnviando(false);
      onCambio();
    }
  }

  async function bajarme() {
    await api.delete(`/partidos/${partido.id}/participantes`);
    avisar('Te bajaste del partido');
    onCambio();
  }

  if (partido.estado === 'cancelado') {
    return (
      <Alert.Root status="error" borderRadius="lg">
        <Alert.Indicator />
        <Alert.Title>Este partido se canceló porque se canceló la reserva de la cancha.</Alert.Title>
      </Alert.Root>
    );
  }
  if (yaEmpezo(partido)) {
    return <Text color="fg.muted">Este partido ya empezó.</Text>;
  }
  if (!usuario) {
    return (
      <Button asChild colorPalette="pelota" size="lg" w={{ base: 'full', sm: 'auto' }}>
        <Link to="/login" state={{ desde: location.pathname }}>Entrá para sumarte</Link>
      </Button>
    );
  }
  if (usuario.id === partido.creador_id) {
    return (
      <Text color="fg.muted">
        Sos quien organiza este partido. Si no se juega, cancelá la reserva desde{' '}
        <Link to="/mis-reservas"><Text as="span" color="brand.fg" fontWeight="600">Mis reservas</Text></Link>.
      </Text>
    );
  }
  if (anotado) {
    return (
      <ConfirmarAccion
        titulo="¿Bajarte del partido?"
        descripcion="Tu lugar queda libre para otra persona."
        textoConfirmar="Bajarme"
        peligro
        onConfirmar={bajarme}
      >
        <Button variant="outline" colorPalette="red" size="lg" w={{ base: 'full', sm: 'auto' }}>Bajarme del partido</Button>
      </ConfirmarAccion>
    );
  }
  if (partido.completo) {
    return <Button size="lg" disabled w={{ base: 'full', sm: 'auto' }}>Sin lugar</Button>;
  }
  return (
    <Button colorPalette="pelota" size="lg" loading={enviando} onClick={sumarme} w={{ base: 'full', sm: 'auto' }}>
      Sumarme
    </Button>
  );
}

export default function Partido() {
  const { id } = useParams();
  const { usuario } = useSesion();
  const { datos: partido, cargando, error, recargar } = useCarga(() => api.get(`/partidos/${id}`), [id]);

  if (error?.status === 404) {
    return (
      <>
        <Volver />
        <Encabezado titulo="Partido" />
        <ListaVacia icono={SearchX} titulo="Ese partido no existe" descripcion="Puede que el link esté mal escrito.">
          <Button asChild variant="outline"><Link to="/partidos">Ver partidos abiertos</Link></Button>
        </ListaVacia>
      </>
    );
  }
  if (error) {
    return (
      <>
        <Volver />
        <Encabezado titulo="Partido" />
        <ErrorCarga error={error} onReintentar={recargar} />
      </>
    );
  }
  // Al recargar despues de sumarse se sigue mostrando el partido, sin volver al esqueleto.
  if (cargando && !partido) {
    return (
      <>
        <Volver />
        <Cargando filas={3} alto="24" />
      </>
    );
  }

  return (
    <>
      <Volver />
      <Encabezado titulo={partido.cancha} descripcion={`${DEPORTES[partido.deporte] ?? partido.deporte} · ${partido.complejo}`}>
        <EstadoPartido partido={partido} />
      </Encabezado>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap="4" alignItems="start">
        <Card.Root variant="outline">
          <Card.Body gap="5">
            <Stack gap="2">
              <HStack gap="2"><CalendarDays size={18} aria-hidden="true" /><Text>{fechaLarga(partido.fecha)}</Text></HStack>
              <HStack gap="2"><Clock size={18} aria-hidden="true" /><Text>{partido.hora} h</Text></HStack>
              <HStack gap="2"><MapPin size={18} aria-hidden="true" /><Text>{partido.complejo}</Text></HStack>
            </Stack>
            <Cupo partido={partido} />
            <Acciones partido={partido} usuario={usuario} onCambio={recargar} />
          </Card.Body>
        </Card.Root>

        <Card.Root variant="outline">
          <Card.Header>
            <Card.Title fontFamily="heading" fontSize="xl">Quiénes juegan</Card.Title>
          </Card.Header>
          <Card.Body>
            <Participantes partido={partido} usuarioId={usuario?.id} />
          </Card.Body>
        </Card.Root>
      </SimpleGrid>
    </>
  );
}
