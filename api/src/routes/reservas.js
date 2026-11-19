import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import * as reservaService from '../services/reservaService.js';

const router = Router();

router.use(requireAuth);

router.post('/', async (req, res) => {
  res.status(201).json(await reservaService.reservar(req.usuario, req.body));
});

router.get('/mias', async (req, res) => {
  res.json(await reservaService.misReservas(req.usuario));
});

router.patch('/:id/cancelar', async (req, res) => {
  res.json(await reservaService.cancelar(req.usuario, req.params.id));
});

export default router;
