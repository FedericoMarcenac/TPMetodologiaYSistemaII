import { useState } from 'react';
import { Badge, Box, Button, HStack, IconButton, Input, Link, Stack, Tabs, Text } from '@chakra-ui/react';
import { CalendarX, ChevronLeft, ChevronRight, Pencil, Plus, Volleyball } from 'lucide-react';
import { api } from '../api.js';
import { useCarga } from '../useCarga.js';
import { Cargando, Encabezado, ErrorCarga, ListaVacia } from '../componentes/estados.jsx';
import FormularioCancha, { ESTADOS_CANCHA } from '../componentes/FormularioCancha.jsx';
import { DEPORTES, fechaLarga } from '../partidos.js';

const COLOR_ESTADO = { disponible: 'brand', mantenimiento: 'pelota', inactiva: 'gray' };

const pesos = (monto) => monto.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

// 'en-CA' da AAAA-MM-DD en la zona horaria del navegador (toISOString usaria UTC y de noche cambia el dia).
const hoy = () => new Date().toLocaleDateString('en-CA');

function moverDia(fecha, dias) {
  const dia = new Date(`${fecha}T12:00:00`);
  dia.setDate(dia.getDate() + dias);
  return dia.toLocaleDateString('en-CA');
}

function Fila({ children, apagada = false }) {
  return (
    <HStack as="li" gap="4" px="4" py="3.5" align="center" opacity={apagada ? 0.6 : 1} borderBottomWidth="1px" _last={{ borderBottomWidth: '0' }}>
      {children}
    </HStack>
  );
}

function Agenda() {
  const [fecha, setFecha] = useState(hoy);
  const carga = useCarga(() => api.get(`/admin/reservas?fecha=${fecha}`), [fecha]);
  const { cargando, error, recargar } = carga;
  // Al cambiar de dia no se muestran las reservas del dia anterior mientras llegan las nuevas.
  const datos = cargando ? null : carga.datos;
  const confirmadas = datos?.filter((r) => r.estado === 'confirmada') ?? [];
  const total = confirmadas.reduce((suma, r) => suma + r.precio_total, 0);

  return (
    <Stack gap="4">
      <HStack gap="2" wrap="wrap">
        <IconButton variant="outline" aria-label="Día anterior" onClick={() => setFecha(moverDia(fecha, -1))}><ChevronLeft /></IconButton>
        <Input
          type="date"
          aria-label="Fecha"
          value={fecha}
          onChange={(e) => e.target.value && setFecha(e.target.value)}
          w="auto"
          flex={{ base: '1', sm: 'initial' }}
        />
        <IconButton variant="outline" aria-label="Día siguiente" onClick={() => setFecha(moverDia(fecha, 1))}><ChevronRight /></IconButton>
        {fecha !== hoy() && <Button variant="ghost" onClick={() => setFecha(hoy())}>Hoy</Button>}
      </HStack>

      <HStack justify="space-between" align="baseline" gap="3" wrap="wrap">
        <Text fontFamily="heading" fontWeight="700" fontSize="2xl" lineHeight="1">{fechaLarga(fecha)}</Text>
        {confirmadas.length > 0 && (
          <Text color="fg.muted">
            {confirmadas.length === 1 ? '1 reserva' : `${confirmadas.length} reservas`} · {pesos(total)}
          </Text>
        )}
      </HStack>

      {cargando && <Cargando filas={3} alto="14" />}
      {error && <ErrorCarga error={error} onReintentar={recargar} />}
      {datos?.length === 0 && (
        <ListaVacia icono={CalendarX} titulo="No hay reservas este día" descripcion="Cuando alguien reserve una cancha del complejo, aparece acá." />
      )}
      {datos?.length > 0 && (
        <Box as="ul" listStyleType="none" borderWidth="1px" borderRadius="xl">
          {datos.map((r) => (
            <Fila key={r.id} apagada={r.estado === 'cancelada'}>
              <Text fontFamily="heading" fontWeight="700" fontSize="xl" lineHeight="1" w="12" flexShrink="0">{r.hora_inicio}</Text>
              <Stack gap="0.5" flex="1" minW="0">
                <HStack gap="2" wrap="wrap">
                  <Text fontWeight="600">{r.cancha}</Text>
                  {r.partido_id && <Badge colorPalette="pelota">Partido abierto</Badge>}
                  {r.estado === 'cancelada' && <Badge>Cancelada</Badge>}
                </HStack>
                <Text fontSize="sm" color="fg.muted">
                  {r.nombre} {r.apellido}
                  {r.telefono && <> · <Link href={`tel:${r.telefono}`} color="brand.fg">{r.telefono}</Link></>}
                </Text>
              </Stack>
              <Text fontWeight="600" flexShrink="0" textDecoration={r.estado === 'cancelada' ? 'line-through' : undefined}>
                {pesos(r.precio_total)}
              </Text>
            </Fila>
          ))}
        </Box>
      )}
    </Stack>
  );
}

function Canchas() {
  const { datos, cargando, error, recargar } = useCarga(() => api.get('/admin/canchas'), []);

  return (
    <Stack gap="4">
      <HStack justify="space-between" gap="3" wrap="wrap">
        <Text color="fg.muted">Las canchas de tu complejo. Solo las disponibles se pueden reservar.</Text>
        <FormularioCancha onGuardada={recargar}>
          <Button><Plus /> Nueva cancha</Button>
        </FormularioCancha>
      </HStack>

      {cargando && <Cargando filas={3} alto="14" />}
      {error && <ErrorCarga error={error} onReintentar={recargar} />}
      {datos?.length === 0 && (
        <ListaVacia icono={Volleyball} titulo="Tu complejo todavía no tiene canchas" descripcion="Creá la primera para que la gente pueda reservarla." />
      )}
      {datos?.length > 0 && (
        <Box as="ul" listStyleType="none" borderWidth="1px" borderRadius="xl">
          {datos.map((c) => (
            <Fila key={c.id}>
              <Stack gap="0.5" flex="1" minW="0">
                <HStack gap="2" wrap="wrap">
                  <Text fontWeight="600">{c.nombre}</Text>
                  <Badge colorPalette={COLOR_ESTADO[c.estado]}>{ESTADOS_CANCHA[c.estado]}</Badge>
                </HStack>
                <Text fontSize="sm" color="fg.muted">
                  {DEPORTES[c.deporte]} · {c.capacidad} jugadores · {pesos(c.precio_por_hora)} la hora
                </Text>
              </Stack>
              <FormularioCancha cancha={c} onGuardada={recargar}>
                <Button variant="outline" size="sm" aria-label={`Editar ${c.nombre}`}><Pencil /> Editar</Button>
              </FormularioCancha>
            </Fila>
          ))}
        </Box>
      )}
    </Stack>
  );
}

export default function Administracion() {
  const { datos: complejo } = useCarga(() => api.get('/admin/complejo'), []);

  return (
    <>
      <Encabezado
        titulo={complejo?.nombre ?? 'Administración'}
        descripcion={complejo && `${complejo.direccion} · abre de ${complejo.horario_apertura.slice(0, 5)} a ${complejo.horario_cierre.slice(0, 5)}`}
      />
      <Tabs.Root defaultValue="agenda" variant="line" lazyMount>
        <Tabs.List mb="5">
          <Tabs.Trigger value="agenda">Agenda del día</Tabs.Trigger>
          <Tabs.Trigger value="canchas">Canchas</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="agenda" p="0"><Agenda /></Tabs.Content>
        <Tabs.Content value="canchas" p="0"><Canchas /></Tabs.Content>
      </Tabs.Root>
    </>
  );
}
