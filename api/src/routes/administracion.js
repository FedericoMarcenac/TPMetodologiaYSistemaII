import { Router } from 'express';
import { requireAuth, requireRol } from '../middlewares/auth.js';
import * as administracionService from '../services/administracionService.js';

const router = Router();

router.use(requireAuth, requireRol('administrador'));

router.get('/complejo', async (req, res) => {
  res.json(await administracionService.complejo(req.usuario));
});

router.get('/canchas', async (req, res) => {
  res.json(await administracionService.canchas(req.usuario));
});

router.post('/canchas', async (req, res) => {
  res.status(201).json(await administracionService.crearCancha(req.usuario, req.body));
});

router.put('/canchas/:id', async (req, res) => {
  res.json(await administracionService.editarCancha(req.usuario, req.params.id, req.body));
});

router.get('/reservas', async (req, res) => {
  res.json(await administracionService.reservasDelDia(req.usuario, req.query.fecha));
});

export default router;
