import { validarToken } from "../token/generate.js";

export const autenticar = async (req, res, next) => {
    try {
        const header = req.headers.authorization;

        if (!header) {
            return res.status(401).json({
                resultado: 'mal',
                mensaje: 'Token no proporcionado',
                datos: null,
            });
        }

        const token = header.split(' ')[1];
        const decoded = await validarToken(token);

        req.usuario = decoded;
        next();

    } catch (error) {
        return res.status(401).json({
            resultado: 'mal',
            mensaje: 'Token inválido o expirado',
            datos: null,
        });
    }
};

export const autorizar = (...rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({
                resultado: 'mal',
                mensaje: 'No tienes permisos para esta acción',
                datos: null,
            });
        }
        next();
    };
};