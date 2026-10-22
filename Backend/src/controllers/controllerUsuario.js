import { uploadImage } from '../middleware/upload.js';
import modelUsuario from '../models/modelUsuario.js';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

const generarContrasenaAleatoria = () => {
    return randomBytes(6).toString('hex');
};

export const forgotPassword = async (req, res) => {
    try {
        const correo = typeof req.body?.correo === 'string'
            ? req.body.correo.trim().toLowerCase()
            : '';
        const user = await modelUsuario.findOne({ correo });

        if (!user) {
            return res.status(400).json({
                result: 'mistake',
                message: 'El correo no se encuentra registrado',
            });
        }

        const newPass = generarContrasenaAleatoria();
        const hashPassword = await bcrypt.hash(newPass, 10);

        user.password = hashPassword;
        await user.save();

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_NODE,
                pass: process.env.PASS_NODE,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_NODE,
            to: user.correo,
            subject: 'Recuperación de contraseña - JAJ Motos',
            text: `Tu nueva contraseña temporal es: ${newPass}`,
        };

        await transporter.sendMail(mailOptions);

        return res.json({
            result: 'fine',
            message: 'Se ha enviado una nueva contraseña al correo registrado.',
        });
    } catch (error) {
        console.error('Error al recuperar la contraseña:', error);
        return res.status(500).json({
            result: 'mistake',
            message: 'Error interno en el servidor',
            error: error.message,
        });
    }
};

const usuarioPublico = (usuario) => {
    const datos = usuario.toObject();
    delete datos.password;
    return datos;
};

const contUsuario = {

    readPerfil: async (req, res) => {
        try {
            const usuarioFound = await modelUsuario.findById(req.usuario.id);

            if (!usuarioFound) {
                return res.status(404).json({
                    resultado: 'mal',
                    mensaje: 'Usuario no encontrado',
                    datos: null,
                });
            }

            return res.json({
                resultado: 'bien',
                mensaje: 'Perfil obtenido',
                datos: usuarioPublico(usuarioFound),
            });
        } catch (error) {
            console.error('Error obteniendo el perfil del usuario:', error);
            return res.status(500).json({
                resultado: 'mal',
                mensaje: 'Ocurrio un error al obtener el perfil',
                datos: null,
            });
        }
    },

    createUsuario: async (req, res) => {
        uploadImage(req, res, async (error) => {
            if (error) {
                return res.status(400).json({
                    resultado: 'mal',
                    mensaje: 'Ocurrio un error cargando la imagen',
                    datos: null
                });
            }
            if (!req.file) {
                return res.status(400).json({
                    resultado: 'mal',
                    mensaje: 'La imagen es obligatoria',
                    datos: null
                });
            }

            try {
                const newUsuario = new modelUsuario({
                    nombre: req.body.nombre,
                    apellido: req.body.apellido,
                    correo: req.body.correo,
                    edad: req.body.edad,
                    rol: req.body.rol,
                    password: req.body.password,
                    Foto: req.file.filename
                });

                const saveUsuario = await newUsuario.save();

                return res.json({
                    resultado: 'bien',
                    mensaje: `usuario ${saveUsuario.rol} creado satisfactoriamente`,
                    datos: usuarioPublico(saveUsuario)
                });

            } catch (err) {
                console.error('Error creando el usuario:', err);
                return res.status(500).json({
                    resultado: 'mal',
                    mensaje: 'Ocurrio un error creando el Usuario',
                    datos: null
                });
            }
        });
    },

    readUsuario: async (req, res) => {
        try {
            const usuarioFound = await modelUsuario.findById(req.params.id);

            if (!usuarioFound) {
                return res.json({
                    resultado: 'mal',
                    mensaje: 'Usuario no encontrado',
                    datos: null,
                });
            }

            return res.json({
                resultado: 'bien',
                mensaje: 'Usuario encontrado satisfactoriamente',
                datos: usuarioPublico(usuarioFound),
            });
        } catch (error) {
            console.error('Error encontrando el usuario:', error);
            return res.status(500).json({
                resultado: 'mal',
                mensaje: 'Ocurrio un error encontrando el Usuario',
                datos: null,
            });
        }
    },

    readUsuarios: async (req, res) => {
        try {
            const usuarios = await modelUsuario.find();
            return res.json({
                resultado: 'bien',
                mensaje: 'Usuarios encontrados satisfactoriamente',
                datos: usuarios.map(usuarioPublico),
            });
        } catch (error) {
            console.error('Error encontrando los usuarios:', error);
            return res.status(500).json({
                resultado: 'mal',
                mensaje: 'Ocurrio un error encontrando los Usuarios',
                datos: null,
            });
        }
    },

    updateUsuario: async (req, res) => {
        try {
            const usuarioExistente = await modelUsuario.findById(req.params.id);

            if (!usuarioExistente) {
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(404).json({
                    resultado: 'mal',
                    mensaje: 'Usuario no encontrado',
                    datos: null,
                });
            }

            const camposActualizables = ['nombre', 'apellido', 'correo', 'edad', 'rol'];
            for (const campo of camposActualizables) {
                if (req.body[campo] !== undefined) {
                    usuarioExistente[campo] = req.body[campo];
                }
            }

            if (typeof req.body.password === 'string' && req.body.password.length > 0) {
                usuarioExistente.password = req.body.password;
            }

            const fotoAnterior = usuarioExistente.Foto;
            if (req.file) {
                usuarioExistente.Foto = req.file.filename;
            }

            const usuarioUpdate = await usuarioExistente.save();

            if (req.file && fotoAnterior) {
                const rutaFotoAnterior = path.join('imagenes', fotoAnterior);
                if (fs.existsSync(rutaFotoAnterior)) {
                    fs.unlinkSync(rutaFotoAnterior);
                }
            }

            return res.json({
                resultado: 'bien',
                mensaje: 'Usuario actualizado',
                datos: usuarioPublico(usuarioUpdate),
            });

        } catch (error) {
            console.error('Error actualizando el usuario:', error);
            return res.status(500).json({
                resultado: 'mal',
                mensaje: 'Error al actualizar el usuario',
                datos: null,
            });
        }
    },

    deleteUsuario: async (req, res) => {
        try {
            const usuarioToDelete = await modelUsuario.findByIdAndDelete(
                req.params.id
            );

            if (!usuarioToDelete) {
                return res.status(404).json({
                    resultado: 'mal',
                    mensaje: "Usuario no encontrado para eliminar.",
                    datos: null,
                })
            }

            if (usuarioToDelete.Foto) {
                const rutaFoto = path.join('imagenes', usuarioToDelete.Foto);

                if (fs.existsSync(rutaFoto)) {
                    fs.unlinkSync(rutaFoto);
                }
            }

            return res.json({
                resultado: 'bien',
                mensaje: "Usuario eliminado correctamente.",
                datos: null,
            });

        } catch (error) {
            console.error('Error eliminando el usuario:', error);
            return res.status(500).json({
                resultado: 'mal',
                mensaje: "Error al eliminar el usuario.",
                datos: null,
            });
        }
    }

}
export default contUsuario;