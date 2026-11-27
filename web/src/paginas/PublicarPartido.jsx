import { useState } from 'react';
import { Alert, Button, Card, Field, HStack, Input, RadioCard, Stack } from '@chakra-ui/react';
import { ArrowLeft, CalendarX } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { api } from '../api.js';
import { useCarga } from '../useCarga.js';
import { Cargando, Encabezado, ErrorCarga, ListaVacia } from '../componentes/estados.jsx';
import { avisar } from '../componentes/avisos.jsx';
import { DEPORTES, fechaCorta } from '../partidos.js';

const MINIMO_JUGADORES = 2;

// Se pueden publicar las reservas confirmadas, que todavia no empezaron y que no tienen partido.
async function cargarReservas() {
  const [reservas, canchas] = await Promise.all([api.get('/reservas/mias'), api.get('/canchas')]);
  const capacidad = Object.fromEntries(canchas.map((c) => [c.id, c.capacidad]));
  const ahora = new Date();
  return reservas
    .filter((r) => r.estado === 'confirmada' && !r.partido_id && new Date(r.inicio) > ahora)
    .map((r) => ({ ...r, capacidad: capacidad[r.cancha_id] }));
}

function Volver() {
  return (
    <Button asChild variant="ghost" size="sm" ms="-2" mt="4">
      <Link to="/partidos"><ArrowLeft /> Partidos</Link>
    </Button>
  );
}

function Formulario({ reservas, inicial }) {
  const navigate = useNavigate();
  const [reservaId, setReservaId] = useState(inicial ?? String(reservas[0].id));
  const reserva = reservas.find((r) => String(r.id) === reservaId);
  const [jugadores, setJugadores] = useState(String(reserva.capacidad));
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const numero = Number(jugadores);
  const valido = Number.isInteger(numero) && numero >= MINIMO_JUGADORES && numero <= reserva.capacidad;

  function elegirReserva(id) {
    setReservaId(id);
    // Al cambiar de cancha se propone la capacidad de la nueva.
    setJugadores(String(reservas.find((r) => String(r.id) === id).capacidad));
    setError(null);
  }

  async function publicar(evento) {
    evento.preventDefault();
    if (!valido) return;
    setEnviando(true);
    setError(null);
    try {
      const partido = await api.post('/partidos', { reserva_id: reserva.id, jugadores_necesarios: numero });
      avisar('Partido publicado', 'success', 'Ya aparece en la lista de partidos abiertos.');
      navigate(`/partidos/${partido.id}`);
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  }

  return (
    <Card.Root variant="outline" maxW="2xl">
      <Card.Body asChild gap="6">
        <form onSubmit={publicar} noValidate>
          <RadioCard.Root value={reservaId} onValueChange={(e) => elegirReserva(e.value)} colorPalette="brand">
            <RadioCard.Label fontWeight="600" mb="2">¿Qué reserva querés publicar?</RadioCard.Label>
            <Stack gap="2">
              {reservas.map((r) => (
                <RadioCard.Item key={r.id} value={String(r.id)}>
                  <RadioCard.ItemHiddenInput />
                  <RadioCard.ItemControl>
                    <RadioCard.ItemContent>
                      <RadioCard.ItemText fontWeight="600">
                        {r.cancha} · {DEPORTES[r.deporte] ?? r.deporte}
                      </RadioCard.ItemText>
                      <RadioCard.ItemDescription>
                        {r.complejo} · {fechaCorta(r.fecha)} de {r.hora_inicio} a {r.hora_fin}
                      </RadioCard.ItemDescription>
                    </RadioCard.ItemContent>
                    <RadioCard.ItemIndicator />
                  </RadioCard.ItemControl>
                </RadioCard.Item>
              ))}
            </Stack>
          </RadioCard.Root>

          <Field.Root invalid={!valido} required maxW="xs">
            <Field.Label>¿Cuántos jugadores tiene que haber?</Field.Label>
            <Input
              type="number"
              inputMode="numeric"
              min={MINIMO_JUGADORES}
              max={reserva.capacidad}
              value={jugadores}
              onChange={(e) => setJugadores(e.target.value)}
            />
            {valido ? (
              <Field.HelperText>Contándote a vos. Esta cancha admite hasta {reserva.capacidad}.</Field.HelperText>
            ) : (
              <Field.ErrorText>Tiene que ser un número entre {MINIMO_JUGADORES} y {reserva.capacidad}.</Field.ErrorText>
            )}
          </Field.Root>

          {error && (
            <Alert.Root status="error" borderRadius="lg">
              <Alert.Indicator />
              <Alert.Title>{error}</Alert.Title>
            </Alert.Root>
          )}

          <HStack gap="3" justify="end" wrap="wrap">
            <Button asChild variant="outline"><Link to="/partidos">Volver</Link></Button>
            <Button type="submit" colorPalette="pelota" loading={enviando} disabled={!valido}>
              Publicar partido
            </Button>
          </HStack>
        </form>
      </Card.Body>
    </Card.Root>
  );
}

export default function PublicarPartido() {
  const [params] = useSearchParams();
  const { datos: reservas, cargando, error, recargar } = useCarga(cargarReservas, []);
  // Desde Mis reservas se puede llegar con ?reserva=ID para que ya venga elegida.
  const pedida = params.get('reserva');
  const inicial = reservas?.some((r) => String(r.id) === pedida) ? pedida : undefined;

  return (
    <>
      <Volver />
      <Encabezado
        titulo="Publicar un partido"
        descripcion="Elegí una de tus reservas y cuántos jugadores buscás. Vos quedás anotado como primer jugador."
      />
      {cargando && <Cargando filas={2} alto="20" />}
      {error && <ErrorCarga error={error} onReintentar={recargar} />}
      {reservas?.length === 0 && (
        <ListaVacia
          icono={CalendarX}
          titulo="No tenés reservas para publicar"
          descripcion="Para armar un partido primero reservá una cancha. Las reservas que ya tienen partido no aparecen acá."
        >
          <Button asChild><Link to="/canchas">Buscar cancha</Link></Button>
        </ListaVacia>
      )}
      {reservas?.length > 0 && <Formulario reservas={reservas} inicial={inicial} />}
    </>
  );
}
