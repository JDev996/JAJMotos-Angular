import { Router } from "express";
import controllerUsuario, { forgotPassword } from '../controllers/controllerUsuario.js';
import { uploadSingleImage } from '../middleware/upload.js';
import { autenticar, autorizar } from '../middleware/authentication.js';

const routerUsuario = Router();
routerUsuario.post('/forgotPassword', forgotPassword);
routerUsuario.post('/', autenticar, autorizar('admin'), controllerUsuario.createUsuario);
routerUsuario.get('/perfil', autenticar, controllerUsuario.readPerfil);
routerUsuario.get('/:id', autenticar, autorizar('admin'), controllerUsuario.readUsuario);
routerUsuario.get('/', autenticar, autorizar('admin'), controllerUsuario.readUsuarios);
routerUsuario.put('/:id', autenticar, autorizar('admin'), uploadSingleImage, controllerUsuario.updateUsuario);
routerUsuario.delete('/:id', autenticar, autorizar('admin'), controllerUsuario.deleteUsuario);

export default routerUsuario;