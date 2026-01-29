import OpenAI from 'openai';

// Inicializar cliente, pero no fallar si no hay key (para build time)
const apiKey = process.env.OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

// Categorías permitidas (actualizadas según requerimiento)
const ALLOWED_CATEGORIES = [
    'Alimentos',
    'Transporte',
    'Servicios',
    'Salud',
    'Entretenimiento',
    'Hogar',
    'Compras',
    'Transferencias',
    'Otros'
];

export async function predictCategory(concept: string): Promise<string> {
    if (!openai) {
        console.warn("OpenAI API Key not found. Skipping categorization.");
        // Fallback: "Sin Categoría" no es parte de la lista permitida para IA, 
        // pero es útil como fallback local. Si la IA no está, retornamos 'Otros' o un string neutro.
        // El requerimiento dice: "asigna la categoría 'Sin Categoría'".
        return 'Sin Categoría';
    }

    try {
        const completion = await openai.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `Eres un experto contador mexicano. Tu trabajo es clasificar descripciones de estados de cuenta bancarios en UNA sola categoría.
Las categorías permitidas son: [${ALLOWED_CATEGORIES.join(', ')}].
Reglas de contexto:
- 'OXXO', '7 ELEVEN', 'WALMART', 'CHEDRAUI', 'UBER EATS' -> Alimentos.
- 'BP', 'SHELL', 'PEMEX', 'GASOLINERA', 'UBER', 'DIDI' -> Transporte.
- 'CFE', 'TELMEX', 'TELCEL', 'IZZI', 'NETFLIX', 'SPOTIFY' -> Servicios.
- 'FARMACIA', 'DR', 'HOSPITAL' -> Salud.
- 'SPEI', 'TEF' -> Transferencias.
Responde SOLAMENTE con la palabra de la categoría. No uses frases completas.`
                },
                { role: "user", content: concept }
            ],
            model: "gpt-4o-mini", // Modelo optimizado
            temperature: 0.1, // Baja temperatura para determinismo
            max_tokens: 10,
        });

        const category = completion.choices[0]?.message.content?.trim();

        // Validar que la respuesta sea una categoría válida
        if (category && ALLOWED_CATEGORIES.includes(category)) {
            return category;
        }

        // Si la IA responde algo raro
        return 'Otros';

    } catch (error) {
        console.error("Error predicting category:", error);
        // Fallback seguro en caso de error de API
        return 'Sin Categoría';
    }
}
