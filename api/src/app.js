import express from 'express';
import salud from './routes/salud.js';
import auth from './routes/auth.js';
import { manejarErrores, rutaInexistente } from './middlewares/errores.js';

const app = express();

app.use(express.json());

app.use('/api/salud', salud);
app.use('/api/auth', auth);

app.use(rutaInexistente);
app.use(manejarErrores);

export default app;
