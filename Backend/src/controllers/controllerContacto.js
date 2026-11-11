import MensajeContacto from '../models/modelMensajeContacto.js';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_NODE,
        pass: process.env.PASS_NODE
    }
});

const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const textoHtml = (value) => escapeHtml(value).replace(/\r?\n/g, '<br>');

const plantillaCorreo = ({ preheader, saludo, contenido, cierre }) => `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>JAJ Motos</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f1f2f4;font-family:Arial,Helvetica,sans-serif;color:#222;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background-color:#f1f2f4;">
      <tr>
        <td align="center" style="padding:32px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;border-collapse:separate;background-color:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:26px 32px;background-color:#151515;border-bottom:4px solid #c8102e;">
                <p style="margin:0;color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:1px;">JAJ <span style="color:#e31b3d;">MOTOS</span></p>
                <p style="margin:6px 0 0;color:#c7c7c7;font-size:12px;letter-spacing:2px;">MÁS QUE UNA MOTO, UNA PASIÓN</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#292929;font-size:15px;line-height:1.65;">
                <p style="margin:0 0 18px;">${saludo}</p>
                ${contenido}
                <p style="margin:24px 0 0;">${cierre}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px;background-color:#f7f7f7;border-top:1px solid #e6e6e6;">
                <p style="margin:0 0 8px;color:#c8102e;font-size:13px;font-weight:bold;">Estamos para ayudarte</p>
                <p style="margin:0;color:#555555;font-size:12px;line-height:1.7;">
                  Calle 123 #45-67, Bogotá, Colombia<br>
                  Teléfono: +57 300 123 4567<br>
                  <a href="mailto:contacto@jajmotos.com" style="color:#c8102e;text-decoration:none;">contacto@jajmotos.com</a><br>
                  Lun - Sáb: 8:00 AM - 6:00 PM
                </p>
                <p style="margin:16px 0 0;color:#888888;font-size:11px;">© JAJ Motos. Este mensaje fue enviado automáticamente.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const plantillaConfirmacion = ({ nombre, asunto }) => plantillaCorreo({
    preheader: 'Confirmamos la recepción de tu solicitud de contacto.',
    saludo: `Hola ${escapeHtml(nombre)},`,
    contenido: `
      <h1 style="margin:0 0 16px;color:#151515;font-size:22px;line-height:1.3;">Hemos recibido tu solicitud</h1>
      <p style="margin:0 0 14px;">Gracias por comunicarte con JAJ Motos. Tu mensaje fue recibido correctamente y nuestro equipo lo revisará para atenderte lo más pronto posible.</p>
      <div style="margin:20px 0;padding:14px 16px;border-left:3px solid #c8102e;background-color:#f7f7f7;">
        <p style="margin:0;color:#666666;font-size:12px;font-weight:bold;text-transform:uppercase;">Asunto de tu solicitud</p>
        <p style="margin:5px 0 0;color:#222222;">${escapeHtml(asunto)}</p>
      </div>
      <p style="margin:0;">Conserva este correo como constancia de recepción. Si necesitas agregar información, puedes responder a este mensaje.</p>`,
    cierre: 'Saludos cordiales,<br><strong style="color:#151515;">Equipo de Atención al Cliente · JAJ Motos</strong>'
});

const plantillaRespuesta = ({ nombre, mensaje, respuesta }) => plantillaCorreo({
    preheader: 'El equipo de JAJ Motos respondió tu solicitud.',
    saludo: `Hola ${escapeHtml(nombre)},`,
    contenido: `
      <h1 style="margin:0 0 16px;color:#151515;font-size:22px;line-height:1.3;">Respuesta a tu solicitud</h1>
      <p style="margin:0 0 12px;">Nuestro equipo ha revisado tu mensaje y te responde a continuación:</p>
      <div style="margin:18px 0;padding:16px;border-left:3px solid #c8102e;background-color:#fff7f8;">
        <p style="margin:0;color:#222222;white-space:normal;">${textoHtml(respuesta)}</p>
      </div>
      <div style="margin:24px 0 0;padding:16px;border:1px solid #e6e6e6;border-radius:4px;background-color:#f7f7f7;">
        <p style="margin:0 0 8px;color:#666666;font-size:12px;font-weight:bold;letter-spacing:.5px;text-transform:uppercase;">Tu mensaje original</p>
        <p style="margin:0;color:#555555;font-size:14px;">${textoHtml(mensaje)}</p>
      </div>`,
    cierre: 'Gracias por confiar en nosotros.<br><strong style="color:#151515;">Cordialmente,<br>Equipo de Atención al Cliente · JAJ Motos</strong>'
});

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
                await transporter.sendMail({
                    from: process.env.EMAIL_NODE,
                    to: correo.trim(),
                    subject: 'Confirmación de recepción - JAJ Motos',
                    html: plantillaConfirmacion({
                        nombre: nombre.trim(),
                        asunto: asunto.trim()
                    })
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

            let correoEnviado = true;
            try {
                const asuntoOriginal = mensajeActualizado.asunto.trim();
                const asuntoRespuesta = /^re\s*:/i.test(asuntoOriginal)
                    ? asuntoOriginal
                    : `Re: ${asuntoOriginal}`;

                await transporter.sendMail({
                    from: process.env.EMAIL_NODE,
                    to: mensajeActualizado.correo,
                    subject: asuntoRespuesta,
                    html: plantillaRespuesta({
                        nombre: mensajeActualizado.nombre,
                        mensaje: mensajeActualizado.mensaje,
                        respuesta
                    })
                });
            } catch (emailError) {
                correoEnviado = false;
                console.error(
                    'La respuesta se guardó, pero no se pudo enviar el correo al remitente:',
                    emailError
                );
            }

            return res.json({
                resultado: 'bien',
                mensaje: correoEnviado
                    ? 'Respuesta guardada y correo enviado al remitente'
                    : 'Respuesta guardada, pero no se pudo enviar el correo al remitente'
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
