import { useState } from 'react';
import { IconButton, Input, InputGroup } from '@chakra-ui/react';
import { Eye, EyeOff } from 'lucide-react';

export default function CampoContrasena({ nueva = false, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <InputGroup
      endElement={
        <IconButton
          variant="ghost"
          size="sm"
          me="-2"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {visible ? <EyeOff /> : <Eye />}
        </IconButton>
      }
    >
      <Input
        type={visible ? 'text' : 'password'}
        autoComplete={nueva ? 'new-password' : 'current-password'}
        {...props}
      />
    </InputGroup>
  );
}
