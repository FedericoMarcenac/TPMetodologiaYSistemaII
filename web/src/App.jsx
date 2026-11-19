import { Route, Routes } from 'react-router';
import Layout from './componentes/Layout.jsx';
import RutaProtegida from './componentes/RutaProtegida.jsx';
import Inicio from './paginas/Inicio.jsx';
import Login from './paginas/Login.jsx';
import Registro from './paginas/Registro.jsx';
import Perfil from './paginas/Perfil.jsx';
import Administracion from './paginas/Administracion.jsx';
import Canchas from './paginas/Canchas.jsx';
import Cancha from './paginas/Cancha.jsx';
import MisReservas from './paginas/MisReservas.jsx';
import Partidos from './paginas/Partidos.jsx';
import Partido from './paginas/Partido.jsx';
import PublicarPartido from './paginas/PublicarPartido.jsx';
import NoEncontrada from './paginas/NoEncontrada.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="login" element={<Login />} />
        <Route path="registro" element={<Registro />} />
        <Route path="canchas" element={<Canchas />} />
        <Route path="canchas/:id" element={<Cancha />} />
        <Route path="partidos" element={<Partidos />} />
        <Route path="partidos/:id" element={<Partido />} />

        <Route element={<RutaProtegida />}>
          <Route path="mis-reservas" element={<MisReservas />} />
          <Route path="partidos/nuevo" element={<PublicarPartido />} />
          <Route path="perfil" element={<Perfil />} />
        </Route>

        <Route element={<RutaProtegida rol="administrador" />}>
          <Route path="admin" element={<Administracion />} />
        </Route>

        <Route path="*" element={<NoEncontrada />} />
      </Route>
    </Routes>
  );
}
