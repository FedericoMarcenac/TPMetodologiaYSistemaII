import { Router } from 'express';
import * as canchaService from '../services/canchaService.js';

const router = Router();

router.get('/', async (req, res) => {
  res.json(await canchaService.listar(req.query));
});

router.get('/:id/disponibilidad', async (req, res) => {
  res.json(await canchaService.disponibilidad(req.params.id, req.query.fecha));
});

export default router;
