import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import * as partidoService from '../services/partidoService.js';

const router = Router();

router.get('/', async (req, res) => {
  res.json(await partidoService.abiertos(req.query));
});

router.get('/:id', async (req, res) => {
  res.json(await partidoService.detalle(req.params.id));
});

router.post('/', requireAuth, async (req, res) => {
  res.status(201).json(await partidoService.publicar(req.usuario, req.body));
});

router.post('/:id/participantes', requireAuth, async (req, res) => {
  res.status(201).json(await partidoService.sumarse(req.usuario, req.params.id));
});

router.delete('/:id/participantes', requireAuth, async (req, res) => {
  res.json(await partidoService.bajarse(req.usuario, req.params.id));
});

export default router;