import { Heading, Stack, Text } from '@chakra-ui/react';

export default function Pendiente({ titulo, ticket }) {
  return (
    <Stack gap="2" py="10">
      <Heading size="2xl">{titulo}</Heading>
      <Text color="fg.muted">Pantalla en construcción · ticket {ticket}</Text>
    </Stack>
  );
}
