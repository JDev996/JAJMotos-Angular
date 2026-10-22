import modelUsuario from "../models/modelUsuario.js";
import { generarToken, validarToken } from "../token/generate.js";
import bcrypt from "bcryptjs";

const loginController = {
    login: async (req, res) => {
        try {
            const { correo, password } = req.body;

            if (typeof correo !== "string" || typeof password !== "string") {
                return res.status(401).json({
                    resultado: "mal",
                    mensaje: "Credenciales inválidas",
                });
            }

            const usuarioFound = await modelUsuario.findOne({
                correo: correo.trim().toLowerCase(),
            });

            if (!usuarioFound) {
                return res.status(401).json({
                    resultado: "mal",
                    mensaje: "Credenciales inválidas",
                });
            }

            const passwordMatch = await bcrypt.compare(password, usuarioFound.password);
            if (!passwordMatch) {
                return res.status(401).json({
                    resultado: "mal",
                    mensaje: "Credenciales inválidas",
                });
            }

            const token = await generarToken({
                id: usuarioFound._id,
                nombre: usuarioFound.nombre,
                correo: usuarioFound.correo,
                rol: usuarioFound.rol
            });

            return res.json({
                resultado: "bien",
                mensaje: "Acceso permitido",
                datos: token,
            });

        } catch (error) {
            console.error("Error durante el inicio de sesión:", error);
            return res.status(500).json({
                resultado: "mal",
                mensaje: "Error en el servidor",
            });
        }
    },

    validarToken: async (req, res) => {
        try {
            const tokenA = req.params.token;
            const validate = await validarToken(tokenA);

            if (validate && validate.id) {
                return res.json({
                    mensaje: 'El token es válido',
                    datos: validate,
                });
            }

            return res.json({
                mensaje: 'Token no es válido',
                datos: null,
            });
        } catch (error) {
            return res.json({
                mensaje: 'Durante la validación del token se presentó un error',
                datos: error.message,
            });
        }
    }
};

export default loginController;