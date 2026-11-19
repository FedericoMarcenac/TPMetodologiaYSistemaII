import { Button, Heading, Stack, Text } from '@chakra-ui/react';
import { Link } from 'react-router';

export default function NoEncontrada() {
  return (
    <Stack gap="3" py="10" align="start">
      <Heading size="2xl">Esta página no existe</Heading>
      <Text color="fg.muted">Puede que el link esté mal escrito o que la página se haya movido.</Text>
      <Button asChild>
        <Link to="/">Volver al inicio</Link>
      </Button>
    </Stack>
  );
}
