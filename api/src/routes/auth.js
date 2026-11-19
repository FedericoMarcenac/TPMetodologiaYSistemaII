import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import * as authService from '../services/authService.js';

const router = Router();

router.post('/registrar', async (req, res) => {
  res.status(201).json(await authService.registrar(req.body));
});

router.post('/login', async (req, res) => {
  res.json(await authService.login(req.body));
});

router.get('/yo', requireAuth, async (req, res) => {
  res.json(await authService.perfil(req.usuario.id));
});

export default router;
