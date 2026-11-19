import { Router } from 'express';
import * as canchaService from '../services/canchaService.js';

const router = Router();

router.get('/', async (req, res) => {
  res.json(await canchaService.listarComplejos());
});

export default router;
