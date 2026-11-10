import { Router } from 'express';
import controllerAsesor from '../controllers/controllerAsesor.js';

const routerAsesor = Router();

routerAsesor.post('/', controllerAsesor.conversar);
routerAsesor.post('/', controllerAsesor.responder);

export default routerAsesor;
