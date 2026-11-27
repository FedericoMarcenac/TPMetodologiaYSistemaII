import { Badge, Button, Card, HStack, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { CalendarCheck, CalendarClock } from 'lucide-react';
import { Link } from 'react-router';
import { api } from '../api.js';
import { useCarga } from '../useCarga.js';
import { Cargando, Encabezado, ErrorCarga, ListaVacia } from '../componentes/estados.jsx';
import ConfirmarAccion from '../componentes/ConfirmarAccion.jsx';
import { avisar } from '../componentes/avisos.jsx';
import { DEPORTES, fechaLarga } from '../partidos.js';

const pesos = (monto) =>
  monto.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

function esFutura(reserva) {
  return new Date(reserva.inicio) > new Date();
}

function TarjetaReserva({ reserva, futura, onCambio }) {
  const cancelada = reserva.estado === 'cancelada';
  const puedeCancelar = futura && !cancelada;

  async function cancelar() {
    await api.patch(`/reservas/${reserva.id}/cancelar`);
    avisar(
      'Reserva cancelada',
      'success',
      reserva.partido_id
        ? 'También se canceló el partido asociado a esta reserva.'
        : 'El turno volvió a quedar disponible.',
    );
    onCambio();
  }

  return (
    <Card.Root variant="outline" opacity={cancelada ? 0.7 : 1}>
      <Card.Body gap="3">
        <HStack justify="space-between" align="start" gap="3">
          <Stack gap="1" minW="0">
            <Text color="brand.fg" fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="wider">
              {DEPORTES[reserva.deporte] ?? reserva.deporte}
            </Text>
            <Card.Title fontFamily="heading" fontSize="xl" lineHeight="1.1">{reserva.cancha}</Card.Title>
            <Text color="fg.muted" fontSize="sm">{reserva.complejo}</Text>
          </Stack>
          <Badge colorPalette={cancelada ? 'gray' : 'brand'}>
            {cancelada ? 'Cancelada' : 'Confirmada'}
          </Badge>
        </HStack>

        <Stack gap="1">
          <Text fontWeight="600">{fechaLarga(reserva.fecha)}</Text>
          <Text color="fg.muted" fontSize="sm">{reserva.hora_inicio} a {reserva.hora_fin} h</Text>
          <Text fontWeight="600">{pesos(reserva.precio_total)}</Text>
        </Stack>

        {reserva.partido_id && !cancelada && (
          <Badge colorPalette="pelota" alignSelf="start">Tiene un partido asociado</Badge>
        )}

        {puedeCancelar && (
          <ConfirmarAccion
            titulo="¿Cancelar esta reserva?"
            descripcion={
              reserva.partido_id
                ? 'Esta reserva tiene un partido publicado. Al cancelarla también se cancelará el partido asociado y dejará de aparecer como disponible.'
                : 'El turno quedará libre para que otra persona pueda reservarlo.'
            }
            textoConfirmar="Cancelar reserva"
            peligro
            onConfirmar={cancelar}
          >
            <Button variant="outline" colorPalette="red" w="full">Cancelar reserva</Button>
          </ConfirmarAccion>
        )}
      </Card.Body>
    </Card.Root>
  );
}

function SeccionReservas({ titulo, descripcion, reservas, futura, icono: Icono, onCambio }) {
  return (
    <Stack gap="3">
      <Stack gap="0.5">
        <HStack gap="2">
          <Icono size={20} aria-hidden="true" />
          <Text fontFamily="heading" fontWeight="700" fontSize="2xl">{titulo}</Text>
        </HStack>
        <Text color="fg.muted" fontSize="sm">{descripcion}</Text>
      </Stack>

      {reservas.length === 0 ? (
        <ListaVacia
          titulo={futura ? 'No tenés reservas próximas' : 'Todavía no tenés reservas pasadas'}
          descripcion={futura ? 'Cuando reserves una cancha, va a aparecer acá.' : 'Tus reservas anteriores van a quedar guardadas en esta sección.'}
        >
          {futura && <Button asChild variant="outline"><Link to="/canchas">Buscar canchas</Link></Button>}
        </ListaVacia>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="4">
          {reservas.map((reserva) => (
            <TarjetaReserva key={reserva.id} reserva={reserva} futura={futura} onCambio={onCambio} />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}

export default function MisReservas() {
  const { datos, cargando, error, recargar } = useCarga(() => api.get('/reservas/mias'), []);

  const proximas = (datos ?? []).filter(esFutura).sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
  const pasadas = (datos ?? []).filter((reserva) => !esFutura(reserva)).sort((a, b) => new Date(b.inicio) - new Date(a.inicio));

  return (
    <>
      <Encabezado
        titulo="Mis reservas"
        descripcion="Consultá tus próximos turnos y revisá las reservas anteriores."
      />

      {cargando && !datos && <Cargando filas={3} alto="36" />}
      {error && <ErrorCarga error={error} onReintentar={recargar} />}

      {datos && (
        <Stack gap="8" pb="8">
          <SeccionReservas
            titulo="Próximas"
            descripcion="Turnos que todavía no comenzaron."
            reservas={proximas}
            futura
            icono={CalendarClock}
            onCambio={recargar}
          />
          <SeccionReservas
            titulo="Pasadas"
            descripcion="Historial de tus turnos."
            reservas={pasadas}
            icono={CalendarCheck}
            onCambio={recargar}
          />
        </Stack>
      )}
    </>
  );
}
