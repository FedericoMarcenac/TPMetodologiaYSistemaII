import { Alert, Button, EmptyState, Heading, HStack, Skeleton, Stack, Text, VStack } from '@chakra-ui/react';
import { RotateCw } from 'lucide-react';

// Los tres estados que tiene toda pantalla que trae datos: cargando, error y sin resultados.

export function Encabezado({ titulo, descripcion, children }) {
  return (
    <HStack justify="space-between" align="end" gap="4" wrap="wrap" pt={{ base: '5', md: '8' }} pb="5">
      <Stack gap="1" minW="0">
        <Heading as="h1" fontSize={{ base: '3xl', md: '4xl' }} lineHeight="1" fontWeight="700">
          {titulo}
        </Heading>
        {descripcion && <Text color="fg.muted" maxW="65ch">{descripcion}</Text>}
      </Stack>
      {children}
    </HStack>
  );
}

export function Cargando({ filas = 3, alto = '16' }) {
  return (
    <Stack gap="3" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: filas }, (_, i) => (
        <Skeleton key={i} height={alto} borderRadius="lg" />
      ))}
    </Stack>
  );
}

export function ErrorCarga({ error, onReintentar }) {
  return (
    <Alert.Root status="error" borderRadius="lg">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>No pudimos cargar esto</Alert.Title>
        <Alert.Description>{error?.message ?? 'Probá de nuevo en un momento.'}</Alert.Description>
      </Alert.Content>
      {onReintentar && (
        <Button size="sm" variant="outline" colorPalette="red" onClick={onReintentar} alignSelf="center">
          <RotateCw /> Reintentar
        </Button>
      )}
    </Alert.Root>
  );
}

export function ListaVacia({ icono: Icono, titulo, descripcion, children }) {
  return (
    <EmptyState.Root borderWidth="1px" borderStyle="dashed" borderRadius="xl" py="10">
      <EmptyState.Content>
        {Icono && (
          <EmptyState.Indicator color="brand.fg">
            <Icono />
          </EmptyState.Indicator>
        )}
        <VStack textAlign="center" gap="1">
          <EmptyState.Title fontSize="lg">{titulo}</EmptyState.Title>
          {descripcion && <EmptyState.Description maxW="40ch">{descripcion}</EmptyState.Description>}
        </VStack>
        {children}
      </EmptyState.Content>
    </EmptyState.Root>
  );
}
