import express from 'express';
import salud from './routes/salud.js';
import auth from './routes/auth.js';
import administracion from './routes/administracion.js';
import complejos from './routes/complejos.js';
import canchas from './routes/canchas.js';
import { manejarErrores, rutaInexistente } from './middlewares/errores.js';


const app = express();

app.use(express.json());

app.use('/api/salud', salud);
app.use('/api/auth', auth);
app.use('/api/admin', administracion);
app.use('/api/complejos', complejos);
app.use('/api/canchas', canchas);

app.use(rutaInexistente);
app.use(manejarErrores);

export default app;
