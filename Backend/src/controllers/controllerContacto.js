import MensajeContacto from '../models/modelMensajeContacto.js';
import nodemailer from 'nodemailer';

const controllerContacto = {
    crearMensaje: async (req, res) => {
        try {
            const { nombre, correo, asunto, mensaje } = req.body;

            if (![nombre, correo, asunto, mensaje].every((valor) => typeof valor === 'string' && valor.trim())) {
                return res.status(400).json({
                    resultado: 'mal',
                    mensaje: 'Todos los campos son obligatorios',
                    datos: null
                });
            }

            await MensajeContacto.create({
                nombre: nombre.trim(),
                correo: correo.trim(),
                asunto: asunto.trim(),
                mensaje: mensaje.trim()
            });

            try {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_NODE,
                        pass: process.env.PASS_NODE
                    }
                });

                await transporter.sendMail({
                    from: process.env.EMAIL_NODE,
                    to: correo.trim(),
                    subject: 'Confirmación de recepción - JAJ Motos',
                    text: [
                        `Hola ${nombre.trim()},`,
                        '',
                        'Hemos recibido tu mensaje de contacto. Nuestro equipo lo revisará y se pondrá en contacto contigo si es necesario.',
                        '',
                        `Asunto: ${asunto.trim()}`,
                        '',
                        'Gracias por comunicarte con JAJ Motos.'
                    ].join('\n')
                });
            } catch (emailError) {
                console.error('El mensaje de contacto se guardó, pero no se pudo enviar el correo de confirmación:', emailError);

                return res.status(202).json({
                    resultado: 'bien',
                    mensaje: 'Recibimos tu mensaje, pero no pudimos enviar el correo de confirmación. Nuestro equipo lo revisará.'
                });
            }

            return res.status(201).json({
                resultado: 'bien',
                mensaje: 'Mensaje enviado con éxito. Te enviamos una confirmación a tu correo.'
            });
        } catch (error) {
            console.error('Error al guardar mensaje de contacto:', error);
            const esValidacion = error.name === 'ValidationError';

            return res.status(esValidacion ? 400 : 500).json({
                resultado: 'mal',
                mensaje: esValidacion ? 'Los datos del mensaje no son válidos' : 'No fue posible enviar el mensaje',
                datos: null
            });
        }
    },

    obtenerMensajes: async (req, res) => {
        try {
            const mensajes = await MensajeContacto.find().sort({ fecha: -1 });

            return res.json({
                resultado: 'bien',
                mensaje: 'Mensajes consultados',
                datos: mensajes
            });
        } catch (error) {
            console.error('Error al consultar mensajes de contacto:', error);

            return res.status(500).json({
                resultado: 'mal',
                mensaje: 'No fue posible consultar los mensajes',
                datos: null
            });
        }
    },

    responderMensaje: async (req, res) => {
        const { id } = req.params;
        const respuesta = typeof req.body?.respuesta === 'string'
            ? req.body.respuesta.trim()
            : '';

        if (!respuesta) {
            return res.status(400).json({
                resultado: 'mal',
                mensaje: 'La respuesta es obligatoria',
                datos: null
            });
        }

        try {
            const mensajeActualizado = await MensajeContacto.findByIdAndUpdate(
                id,
                { respuesta, estado: 'respondido' },
                { new: true, runValidators: true }
            );

            if (!mensajeActualizado) {
                return res.status(404).json({
                    resultado: 'mal',
                    mensaje: 'Mensaje de contacto no encontrado',
                    datos: null
                });
            }

            return res.json({
                resultado: 'bien',
                mensaje: 'Respuesta enviada'
            });
        } catch (error) {
            console.error('Error al responder mensaje de contacto:', error);
            const esIdInvalido = error.name === 'CastError';

            return res.status(esIdInvalido ? 400 : 500).json({
                resultado: 'mal',
                mensaje: esIdInvalido ? 'El identificador del mensaje no es válido' : 'No fue posible responder el mensaje',
                datos: null
            });
        }
    }
};

export default controllerContacto;
