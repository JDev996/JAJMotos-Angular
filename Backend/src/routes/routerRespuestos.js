import { Router } from "express";
import controllerRepuestos from '../controllers/controllerRepuestos.js';
import { uploadSingleImage } from '../middleware/upload.js';
import { autenticar, autorizar } from '../middleware/authentication.js';

const routerRespuestos = Router();
routerRespuestos.post('/', autenticar, autorizar('admin'), controllerRepuestos.createRepuesto);
routerRespuestos.get('/:id', autenticar, controllerRepuestos.readRepuestoId);
routerRespuestos.get('/', autenticar, controllerRepuestos.readRepuestos);
routerRespuestos.put('/:id', autenticar, autorizar('admin'), uploadSingleImage, controllerRepuestos.updateRepuesto);
routerRespuestos.delete('/:id', autenticar, autorizar('admin'), controllerRepuestos.deleteRepuesto);

export default routerRespuestos;
