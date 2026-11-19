import express from 'express';
import salud from './routes/salud.js';
import { manejarErrores, rutaInexistente } from './middlewares/errores.js';

const app = express();

app.use(express.json());

app.use('/api/salud', salud);

app.use(rutaInexistente);
app.use(manejarErrores);

export default app;
