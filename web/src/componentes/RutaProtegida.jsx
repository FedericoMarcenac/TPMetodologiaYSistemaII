import { Navigate, Outlet, useLocation } from 'react-router';
import { useSesion } from '../sesion.jsx';

export default function RutaProtegida({ rol }) {
  const { usuario } = useSesion();
  const location = useLocation();

  if (!usuario) {
    return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  }
  if (rol && usuario.rol !== rol) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
