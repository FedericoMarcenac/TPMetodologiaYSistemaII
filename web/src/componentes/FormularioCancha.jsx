import { useState } from 'react';
import { Alert, Button, Dialog, Field, Input, NativeSelect, Portal, SimpleGrid, Stack } from '@chakra-ui/react';
import { api } from '../api.js';
import { avisar } from './avisos.jsx';
import { DEPORTES } from '../partidos.js';

export const ESTADOS_CANCHA = { disponible: 'Disponible', mantenimiento: 'En mantenimiento', inactiva: 'Inactiva' };

const VACIA = { nombre: '', deporte: 'futbol', capacidad: '', precio_por_hora: '', estado: 'disponible' };

// Las mismas reglas que valida la API, para marcar el campo antes de mandar.
function validar(datos) {
  const errores = {};
  if (!datos.nombre.trim()) errores.nombre = 'Poné un nombre, por ejemplo "Cancha 4"';
  const capacidad = Number(datos.capacidad);
  if (!Number.isInteger(capacidad) || capacidad <= 0) errores.capacidad = 'Tiene que ser un número entero mayor a 0';
  const precio = Number(datos.precio_por_hora);
  if (datos.precio_por_hora === '' || !Number.isFinite(precio) || precio < 0) errores.precio_por_hora = 'Escribí el precio en pesos, sin puntos';
  return errores;
}

function Opciones({ valor, onChange, opciones }) {
  return (
    <NativeSelect.Root size="lg">
      <NativeSelect.Field value={valor} onChange={onChange}>
        {Object.entries(opciones).map(([clave, texto]) => <option key={clave} value={clave}>{texto}</option>)}
      </NativeSelect.Field>
      <NativeSelect.Indicator />
    </NativeSelect.Root>
  );
}

// Alta y edicion en el mismo dialogo: sin `cancha` crea una nueva, con `cancha` la edita.
export default function FormularioCancha({ cancha, onGuardada, children }) {
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState(VACIA);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [enviando, setEnviando] = useState(false);

  function abrirOCerrar(e) {
    setAbierto(e.open);
    if (e.open) {
      setDatos(cancha ? { ...cancha, capacidad: String(cancha.capacidad), precio_por_hora: String(cancha.precio_por_hora) } : VACIA);
      setErrores({});
      setErrorGeneral(null);
    }
  }

  const cambiar = (campo) => (e) => {
    setDatos({ ...datos, [campo]: e.target.value });
    if (errores[campo]) setErrores({ ...errores, [campo]: undefined });
  };

  async function guardar(e) {
    e.preventDefault();
    const encontrados = validar(datos);
    setErrores(encontrados);
    setErrorGeneral(null);
    if (Object.keys(encontrados).length) return;

    setEnviando(true);
    const cuerpo = {
      nombre: datos.nombre.trim(),
      deporte: datos.deporte,
      capacidad: Number(datos.capacidad),
      precio_por_hora: Number(datos.precio_por_hora),
      estado: datos.estado,
    };
    try {
      const guardada = cancha ? await api.put(`/admin/canchas/${cancha.id}`, cuerpo) : await api.post('/admin/canchas', cuerpo);
      avisar(cancha ? 'Cambios guardados' : `${guardada.nombre} creada`);
      setAbierto(false);
      onGuardada();
    } catch (err) {
      setErrorGeneral(err.message);
    } finally {
      setEnviando(false);
    }
  }

  const idFormulario = `cancha-${cancha?.id ?? 'nueva'}`;

  return (
    <Dialog.Root open={abierto} onOpenChange={abrirOCerrar} placement="center">
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner px="4">
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{cancha ? `Editar ${cancha.nombre}` : 'Nueva cancha'}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <form id={idFormulario} onSubmit={guardar} noValidate>
                <Stack gap="4">
                  {errorGeneral && (
                    <Alert.Root status="error" borderRadius="lg" role="alert">
                      <Alert.Indicator />
                      <Alert.Title>{errorGeneral}</Alert.Title>
                    </Alert.Root>
                  )}
                  <Field.Root invalid={!!errores.nombre} required>
                    <Field.Label>Nombre</Field.Label>
                    <Input size="lg" value={datos.nombre} onChange={cambiar('nombre')} autoComplete="off" />
                    <Field.ErrorText>{errores.nombre}</Field.ErrorText>
                  </Field.Root>
                  <SimpleGrid columns={2} gap="3">
                    <Field.Root required>
                      <Field.Label>Deporte</Field.Label>
                      <Opciones valor={datos.deporte} onChange={cambiar('deporte')} opciones={DEPORTES} />
                    </Field.Root>
                    <Field.Root invalid={!!errores.capacidad} required>
                      <Field.Label>Jugadores</Field.Label>
                      <Input size="lg" type="number" inputMode="numeric" min="1" value={datos.capacidad} onChange={cambiar('capacidad')} />
                      <Field.ErrorText>{errores.capacidad}</Field.ErrorText>
                    </Field.Root>
                  </SimpleGrid>
                  <Field.Root invalid={!!errores.precio_por_hora} required>
                    <Field.Label>Precio por hora</Field.Label>
                    <Input size="lg" type="number" inputMode="numeric" min="0" step="500" value={datos.precio_por_hora} onChange={cambiar('precio_por_hora')} />
                    {errores.precio_por_hora
                      ? <Field.ErrorText>{errores.precio_por_hora}</Field.ErrorText>
                      : <Field.HelperText>Las reservas ya hechas conservan el precio con el que se hicieron.</Field.HelperText>}
                  </Field.Root>
                  <Field.Root required>
                    <Field.Label>Estado</Field.Label>
                    <Opciones valor={datos.estado} onChange={cambiar('estado')} opciones={ESTADOS_CANCHA} />
                    <Field.HelperText>Solo las disponibles aceptan reservas nuevas.</Field.HelperText>
                  </Field.Root>
                </Stack>
              </form>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" disabled={enviando}>Volver</Button>
              </Dialog.ActionTrigger>
              <Button type="submit" form={idFormulario} loading={enviando} loadingText="Guardando">
                {cancha ? 'Guardar cambios' : 'Crear cancha'}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
