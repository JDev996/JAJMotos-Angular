import { Router } from 'express';
import controllerContacto from '../controllers/controllerContacto.js';
import { autenticar, autorizar } from '../middleware/authentication.js';

const routerContacto = Router();

routerContacto.post('/', controllerContacto.crearMensaje);
routerContacto.get('/', autenticar, autorizar('admin'), controllerContacto.obtenerMensajes);
routerContacto.put('/:id/responder', autenticar, autorizar('admin'), controllerContacto.responderMensaje);

export default routerContacto;
