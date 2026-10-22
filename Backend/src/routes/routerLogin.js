import {Router} from "express";
import loginController from "../controllers/controllerLogin.js";

const loginRouter= Router();
loginRouter.post('/', loginController.login);
loginRouter.get('/token/:tokenA', loginController.validarToken);

export default loginRouter; 