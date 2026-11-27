import { useState } from 'react';
import { Badge, Button, Card, Field, HStack, Input, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { ArrowLeft, CalendarDays, Clock, MapPin, SearchX } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router';
import { api } from '../api.js';
import { useCarga } from '../useCarga.js';
import { useSesion } from '../sesion.jsx';
import { Cargando, Encabezado, ErrorCarga, ListaVacia } from '../componentes/estados.jsx';
import ConfirmarAccion from '../componentes/ConfirmarAccion.jsx';
import { avisar } from '../componentes/avisos.jsx';
import { DEPORTES, fechaLarga } from '../partidos.js';

const hoy = () => new Date().toLocaleDateString('en-CA');

const pesos = (monto) =>
  monto.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

function EstadoTurno({ estado }) {
  const opciones = {
    libre: { texto: 'Libre', color: 'brand' },
    ocupado: { texto: 'Ocupado', color: 'red' },
    pasado: { texto: 'Ya pasó', color: 'gray' },
  };
  const opcion = opciones[estado] ?? opciones.ocupado;
  return <Badge colorPalette={opcion.color}>{opcion.texto}</Badge>;
}

export default function Cancha() {
  const { id } = useParams();
  const { usuario } = useSesion();
  const location = useLocation();
  const [fecha, setFecha] = useState(hoy);
  const [reservando, setReservando] = useState(null);

  const { datos, cargando, error, recargar } = useCarga(async () => {
    const [canchas, turnos] = await Promise.all([
      api.get('/canchas'),
      api.get(`/canchas/${id}/disponibilidad?fecha=${fecha}`),
    ]);
    return { cancha: canchas.find((c) => c.id === Number(id)), turnos };
  }, [id, fecha]);

  async function confirmarReserva(hora) {
    setReservando(hora);
    try {
      await api.post('/reservas', {
        cancha_id: Number(id),
        fecha,
        hora,
      });
      avisar('¡Reserva confirmada!', 'success', `${fechaLarga(fecha)} a las ${hora} h`);
      recargar();
    } catch (e) {
      // Si otra persona tomó el turno mientras esta pantalla estaba abierta, la API responde 409.
      // Va como aviso y no en el diálogo: al recargar, la grilla se desmonta y el mensaje no llegaría a verse.
      if (e.status !== 409) throw e;
      avisar(e.message, 'error', 'Elegí otro horario.');
      recargar();
    } finally {
      setReservando(null);
    }
  }

  const turnos = cargando ? null : datos?.turnos;

  if (error?.status === 404 || (!cargando && datos && !datos.cancha)) {
    return (
      <>
        <Button asChild variant="ghost" size="sm" ms="-2" mt="4">
          <Link to="/canchas"><ArrowLeft /> Canchas</Link>
        </Button>
        <Encabezado titulo="Turnos de la cancha" />
        <ListaVacia icono={SearchX} titulo="Esa cancha no existe" descripcion="Puede que el enlace esté mal escrito.">
          <Button asChild variant="outline"><Link to="/canchas">Ver canchas</Link></Button>
        </ListaVacia>
      </>
    );
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" ms="-2" mt="4">
        <Link to="/canchas"><ArrowLeft /> Canchas</Link>
      </Button>

      {cargando && !datos && <Cargando filas={3} alto="24" />}
      {error && <ErrorCarga error={error} onReintentar={recargar} />}

      {datos?.cancha && (
        <>
          <Encabezado
            titulo={datos.cancha.nombre}
            descripcion={`${DEPORTES[datos.cancha.deporte] ?? datos.cancha.deporte} · ${datos.cancha.complejo}`}
          >
            <Badge colorPalette={datos.cancha.estado === 'disponible' ? 'brand' : 'pelota'} size="lg">
              {datos.cancha.estado === 'disponible' ? 'Disponible' : 'No disponible'}
            </Badge>
          </Encabezado>

          <SimpleGrid columns={{ base: 1, md: 2 }} gap="4" alignItems="start">
            <Card.Root variant="outline">
              <Card.Body gap="3">
                <HStack gap="2"><MapPin size={18} /><Text>{datos.cancha.complejo}</Text></HStack>
                <HStack gap="2"><Text color="fg.muted" fontSize="sm">Capacidad:</Text><Text>{datos.cancha.capacidad} jugadores</Text></HStack>
                <Stack gap="0">
                  <Text color="fg.muted" fontSize="sm">Precio por hora</Text>
                  <Text fontSize="2xl" fontWeight="700">{pesos(datos.cancha.precio_por_hora)}</Text>
                </Stack>
              </Card.Body>
            </Card.Root>

            <Card.Root variant="outline">
              <Card.Body gap="4">
                <Stack gap="1">
                  <Text fontWeight="700">Elegí el día</Text>
                  <Field.Root>
                    <Input
                      type="date"
                      aria-label="Fecha de la reserva"
                      min={hoy()}
                      value={fecha}
                      onChange={(e) => e.target.value && setFecha(e.target.value)}
                    />
                  </Field.Root>
                </Stack>
                <HStack gap="2" color="fg.muted" fontSize="sm">
                  <CalendarDays size={16} />
                  <Text>{fechaLarga(fecha)}</Text>
                </HStack>
                <HStack gap="2" color="fg.muted" fontSize="sm">
                  <Clock size={16} />
                  <Text>Turnos de una hora</Text>
                </HStack>
              </Card.Body>
            </Card.Root>
          </SimpleGrid>

          <Stack gap="3" mt="6">
            <Stack gap="1">
              <Text fontFamily="heading" fontSize="2xl" fontWeight="700">Disponibilidad</Text>
              <Text color="fg.muted" fontSize="sm">Elegí un horario libre para reservarlo.</Text>
            </Stack>

            {cargando && <Cargando filas={2} alto="12" />}
            {turnos?.length === 0 && (
              <ListaVacia titulo="No hay turnos para este día" descripcion="Elegí otra fecha para consultar la disponibilidad." />
            )}

            {turnos?.length > 0 && (
              <SimpleGrid columns={{ base: 2, sm: 3, md: 4 }} gap="3">
                {turnos.map((turno) => (
                  <Card.Root key={turno.hora} variant="outline">
                    <Card.Body gap="2" alignItems="center">
                      <Text fontFamily="heading" fontSize="2xl" fontWeight="700">{turno.hora}</Text>
                      <EstadoTurno estado={turno.estado} />
                      {turno.estado === 'libre' && usuario && (
                        <ConfirmarAccion
                          titulo="¿Confirmar la reserva?"
                          descripcion={`${datos.cancha.nombre}, ${fechaLarga(fecha)} a las ${turno.hora}. Precio: ${pesos(datos.cancha.precio_por_hora)}.`}
                          textoConfirmar="Reservar"
                          onConfirmar={() => confirmarReserva(turno.hora)}
                        >
                          <Button size="sm" colorPalette="brand" w="full" loading={reservando === turno.hora}>
                            Reservar
                          </Button>
                        </ConfirmarAccion>
                      )}
                      {turno.estado === 'libre' && !usuario && (
                        <Button asChild size="sm" colorPalette="brand" w="full">
                          <Link to="/login" state={{ desde: location.pathname }}>Entrá para reservar</Link>
                        </Button>
                      )}
                    </Card.Body>
                  </Card.Root>
                ))}
              </SimpleGrid>
            )}
          </Stack>
        </>
      )}
    </>
  );
}
