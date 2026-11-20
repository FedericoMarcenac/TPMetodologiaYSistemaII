import { Router } from 'express';
import * as partidoService from '../services/partidoService.js';

const router = Router();

router.get('/', async (req, res) => {
  res.json(await partidoService.abiertos(req.query));
});

router.get('/:id', async (req, res) => {
  res.json(await partidoService.detalle(req.params.id));
});

export default router;
