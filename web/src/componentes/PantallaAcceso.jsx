import { Box, Heading, Stack, Text } from '@chakra-ui/react';

// Marco comun de login y registro: una columna angosta, comoda para completar con el pulgar.
export default function PantallaAcceso({ titulo, bajada, children, pie }) {
  return (
    <Box maxW="sm" mx="auto" pt={{ base: '6', md: '14' }}>
      <Stack gap="1" mb="6">
        <Heading as="h1" fontSize="4xl" lineHeight="1" fontWeight="700">{titulo}</Heading>
        <Text color="fg.muted">{bajada}</Text>
      </Stack>
      {children}
      {pie && <Box mt="6" pt="5" borderTopWidth="1px" textAlign="center" color="fg.muted">{pie}</Box>}
    </Box>
  );
}
