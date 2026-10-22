import { Router } from "express";
import controllerVentas from '../controllers/controllerVentas.js';
import { autenticar, autorizar } from '../middleware/authentication.js';

const routerVentas = Router();
routerVentas.post('/', autenticar, autorizar('admin'), controllerVentas.createVenta);
routerVentas.get('/:id', autenticar, controllerVentas.readVenta);
routerVentas.get('/', autenticar, controllerVentas.readVentas);
routerVentas.put('/:id', autenticar, autorizar('admin'), controllerVentas.updateVenta);
routerVentas.delete('/:id', autenticar, autorizar('admin'), controllerVentas.deleteVenta);

export default routerVentas;