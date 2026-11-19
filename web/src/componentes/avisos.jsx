import { createToaster, Portal, Stack, Toast, Toaster } from '@chakra-ui/react';

const toaster = createToaster({ placement: 'top', pauseOnPageIdle: true });

// avisar('Reserva confirmada') o avisar('No se pudo cancelar', 'error')
export function avisar(titulo, tipo = 'success', descripcion) {
  toaster.create({ title: titulo, description: descripcion, type: tipo, closable: true });
}

export function Avisos() {
  return (
    <Portal>
      <Toaster toaster={toaster} insetInline={{ mdDown: '4' }}>
        {(toast) => (
          <Toast.Root width={{ md: 'sm' }}>
            <Toast.Indicator />
            <Stack gap="1" flex="1" maxWidth="100%">
              {toast.title && <Toast.Title>{toast.title}</Toast.Title>}
              {toast.description && <Toast.Description>{toast.description}</Toast.Description>}
            </Stack>
            {toast.closable && <Toast.CloseTrigger />}
          </Toast.Root>
        )}
      </Toaster>
    </Portal>
  );
}
