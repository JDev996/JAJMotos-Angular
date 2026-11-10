import modelProducto from '../models/modelProducto.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_LENGTH = 12;
const MAX_PRODUCTS = 60;

const formatPrice = (price) => `$${Number(price).toLocaleString('es-CO')}`;

const buildCatalog = (products) => {
    if (products.length === 0) {
        return 'El catálogo no está disponible para esta consulta. No hay información verificable de modelos, inventario ni precios.';
    }

    return products
        .slice(0, MAX_PRODUCTS)
        .map((product) =>
            `- ${product.modelo} | categoría: ${product.categoria || 'sin categoría'} | precio: ${formatPrice(product.precio)} | color: ${product.color} | ${String(product.descripcion).slice(0, 150)}`
        )
        .join('\n');
};

const buildSystemPrompt = (catalog) => `Eres el asesor virtual de JAJ Motos, una tienda colombiana de motocicletas.
Responde en español colombiano con un tono cercano, claro y amable.
Ayuda a elegir según el uso, presupuesto y experiencia del cliente.
Catálogo actual:
${catalog}
Cuando te pidan una recomendación, siempre ofrece una opción útil y concreta. Si el catálogo contiene modelos, recomienda el que mejor se ajuste y menciona únicamente sus datos y precio tal como aparecen allí; nunca inventes disponibilidad, características, precios ni promociones.
Si el catálogo no está disponible o no tiene una opción adecuada, recomienda de forma provisional un tipo de moto según el uso y presupuesto que describa el cliente (por ejemplo, una moto urbana y económica para desplazamientos diarios o una más cómoda y estable para carretera). Aclara brevemente que no puedes confirmar modelos ni precios del catálogo en este momento. No inventes nombres de modelos ni detalles técnicos.
Si falta información, da primero una recomendación provisional razonable y luego haz una sola pregunta corta para afinarla. Responde en un máximo de cuatro frases.
No solicites datos personales, contraseñas ni datos de pago.`;

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
                mensaje: 'El asesor virtual no está configurado. Revisa GROQ_API_KEY en el backend.'
            });
        }

        let products = [];
        if (modelProducto.db.readyState === 1) {
            try {
                products = await modelProducto.find()
                    .select('modelo categoria precio color descripcion')
                    .limit(MAX_PRODUCTS)
                    .lean();
            } catch (error) {
                console.error('No se pudo consultar el catálogo para el asesor:', error.name, error.code ?? 'no-code');
            }
        } else {
            console.error('Catálogo no disponible para el asesor: MongoDB no está conectado.');
        }

        try {
            const groqResponse = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
                    messages: [
                        { role: 'system', content: buildSystemPrompt(buildCatalog(products)) },
                        ...historial,
                        { role: 'user', content: mensaje }
                    ],
                    temperature: 0.6,
                    max_completion_tokens: 700
                }),
                signal: AbortSignal.timeout(20000)
            });

            const data = await groqResponse.json().catch(() => null);
            if (!groqResponse.ok) {
                const errorCode = data?.error?.code ?? data?.error?.type ?? 'unknown';
                console.error('Groq API error:', groqResponse.status, errorCode, data?.error?.message ?? 'No message');

                const status = groqResponse.status === 429 ? 429 : 502;
                return res.status(status).json({
                    resultado: 'mal',
                    mensaje: groqResponse.status === 429
                        ? 'El asesor está recibiendo muchas consultas. Inténtalo de nuevo en un minuto.'
                        : 'Groq no pudo generar una respuesta. Revisa la clave y el modelo configurado.'
                });
            }

            const respuesta = data?.choices?.[0]?.message?.content;
            if (typeof respuesta !== 'string' || !respuesta.trim()) {
                console.error('Groq API devolvió una respuesta vacía o con formato inesperado.');
                return res.status(502).json({
                    resultado: 'mal',
                    mensaje: 'El asesor no pudo generar una respuesta. Inténtalo de nuevo.'
                });
            }

            return res.json({
                resultado: 'bien',
                mensaje: 'Respuesta generada',
                datos: { respuesta: respuesta.trim() }
            });
        } catch (error) {
            console.error('Error al conectar con Groq desde el asesor:', error.name, error.code ?? 'no-code');
            return res.status(502).json({
                resultado: 'mal',
                mensaje: 'No se pudo conectar con el asesor. Inténtalo de nuevo en unos momentos.'
            });
        }
    }
};

export default controllerAsesor;
