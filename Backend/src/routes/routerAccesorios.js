import { Router } from "express";
import controllerAccesorios from '../controllers/controllerAccesorios.js';
import { uploadSingleImage } from '../middleware/upload.js';
import { autenticar, autorizar } from '../middleware/authentication.js';

const routerAccesorios = Router();
routerAccesorios.post('/', autenticar, autorizar('admin'), controllerAccesorios.createAccesorio);
routerAccesorios.get('/:id', autenticar, controllerAccesorios.readAccesorioId);
routerAccesorios.get('/', autenticar, controllerAccesorios.readAccesorios);
routerAccesorios.put('/:id', autenticar, autorizar('admin'), uploadSingleImage, controllerAccesorios.updateAccesorio);
routerAccesorios.delete('/:id', autenticar, autorizar('admin'), controllerAccesorios.deleteAccesorio);

export default routerAccesorios;