import { Flex, Heading, Text } from '@chakra-ui/react';

export default function App() {
  return (
    <Flex
      minH="100vh"
      direction="column"
      align="center"
      justify="center"
      gap="3"
    >
      <Heading size="3xl">Empezando Turnito</Heading>
      <Text color="gray.500">
        Reserva de canchas y organizacion de partidos
      </Text>
    </Flex>
  );
}
