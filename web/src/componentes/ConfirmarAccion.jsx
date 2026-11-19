import { useState } from 'react';
import { Button, Dialog, Portal, Text } from '@chakra-ui/react';

// Para acciones que no se pueden deshacer (cancelar una reserva, bajarse de un partido).
// El boton que se pasa como hijo abre la confirmacion; si onConfirmar falla, el error se muestra adentro.
export default function ConfirmarAccion({ titulo, descripcion, textoConfirmar = 'Confirmar', peligro = false, onConfirmar, children }) {
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  async function confirmar() {
    setEnviando(true);
    setError(null);
    try {
      await onConfirmar();
      setAbierto(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog.Root
      role="alertdialog"
      open={abierto}
      onOpenChange={(e) => {
        setAbierto(e.open);
        setError(null);
      }}
      placement="center"
    >
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner px="4">
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{titulo}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              {descripcion && <Text color="fg.muted">{descripcion}</Text>}
              {error && <Text color="fg.error" mt="3" role="alert">{error}</Text>}
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" disabled={enviando}>Volver</Button>
              </Dialog.ActionTrigger>
              <Button colorPalette={peligro ? 'red' : 'brand'} loading={enviando} onClick={confirmar}>
                {textoConfirmar}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
