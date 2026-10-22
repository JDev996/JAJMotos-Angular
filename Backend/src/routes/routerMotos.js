import { Router } from "express";
import controllerMotos from '../controllers/controllerMotos.js';
import { uploadSingleImage } from '../middleware/upload.js';
import { autenticar, autorizar } from '../middleware/authentication.js';

const routerMotos = Router();
routerMotos.post('/', autenticar, autorizar('admin'), controllerMotos.createMoto);
routerMotos.get('/:id', autenticar, controllerMotos.readMotoId);
routerMotos.get('/', autenticar, controllerMotos.readMotos);
routerMotos.put('/:id', autenticar, autorizar('admin'), uploadSingleImage, controllerMotos.updateMoto);
routerMotos.delete('/:id', autenticar, autorizar('admin'), controllerMotos.deleteMoto);

export default routerMotos;