const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_LENGTH = 12;

const systemPrompt = [
    'Eres el asesor virtual de JAJ Motos, una tienda colombiana de motocicletas.',
    'Responde en español, de forma amable, breve y útil.',
    'Ayuda a elegir motos según uso, presupuesto y experiencia.',
    'No inventes precios, disponibilidad, especificaciones ni condiciones comerciales.',
    'Si no tienes un dato confirmado, indícalo y recomienda consultar al equipo desde la página de contacto.',
    'No solicites contraseñas, datos de tarjetas ni información sensible.'
].join(' ');

const controllerAsesor = {
    conversar: async (req, res) => {
        const mensaje = typeof req.body?.mensaje === 'string'
            ? req.body.mensaje.trim()
            : '';
        const historialRecibido = Array.isArray(req.body?.historial)
            ? req.body.historial
            : [];

        if (!mensaje || mensaje.length > MAX_MESSAGE_LENGTH) {
            return res.status(400).json({
                resultado: 'mal',
                mensaje: `Escribe un mensaje de 1 a ${MAX_MESSAGE_LENGTH} caracteres.`
            });
        }

        if (historialRecibido.length > MAX_HISTORY_LENGTH) {
            return res.status(400).json({
                resultado: 'mal',
                mensaje: 'La conversación es demasiado larga. Inicia una nueva consulta.'
            });
        }

        const historial = historialRecibido
            .filter((item) =>
                item &&
                (item.rol === 'user' || item.rol === 'assistant') &&
                typeof item.contenido === 'string' &&
                item.contenido.trim().length > 0 &&
                item.contenido.length <= MAX_MESSAGE_LENGTH
            )
            .map((item) => ({
                role: item.rol,
                content: item.contenido.trim()
            }));

        if (!process.env.GROQ_API_KEY) {
            console.error('Falta configurar GROQ_API_KEY en el backend.');
            return res.status(503).json({
                resultado: 'mal',
                mensaje: 'El asesor virtual no está configurado en este momento.'
            });
        }

        try {
            const upstreamResponse = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...historial,
                        { role: 'user', content: mensaje }
                    ],
                    temperature: 0.6,
                    max_completion_tokens: 500
                }),
                signal: AbortSignal.timeout(20000)
            });

            if (!upstreamResponse.ok) {
                const errorBody = await upstreamResponse.text();
                console.error('Groq API respondió con error:', upstreamResponse.status, errorBody);
                return res.status(502).json({
                    resultado: 'mal',
                    mensaje: 'El asesor virtual no pudo responder. Inténtalo de nuevo.'
                });
            }

            const data = await upstreamResponse.json();
            const respuesta = data?.choices?.[0]?.message?.content;

            if (typeof respuesta !== 'string' || !respuesta.trim()) {
                console.error('Groq API devolvió una respuesta vacía o con formato inesperado.');
                return res.status(502).json({
                    resultado: 'mal',
                    mensaje: 'El asesor virtual devolvió una respuesta no válida. Inténtalo de nuevo.'
                });
            }

            return res.json({
                resultado: 'bien',
                mensaje: 'Respuesta generada',
                datos: { respuesta: respuesta.trim() }
            });
        } catch (error) {
            console.error('Error al consultar Groq API:', error);
            return res.status(502).json({
                resultado: 'mal',
                mensaje: 'No se pudo conectar con el asesor virtual. Inténtalo de nuevo más tarde.'
            });
        }
    }
};

export default controllerAsesor;
