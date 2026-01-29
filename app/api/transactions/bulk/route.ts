import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { calculateCutoffMonth } from '@/lib/utils';
import type { BulkUploadRequest, BulkUploadResponse, ParsedTransaction } from '@/types/transaction';

/**
 * POST /api/transactions/bulk
 * 
 * Endpoint para subir transacciones de forma masiva (bulk upload).
 * Recibe un array de transacciones y las inserta en la base de datos.
 * Calcula automáticamente el mes de corte para cada transacción.
 * 
 * @param request - Debe incluir: { card_id: string, transactions: ParsedTransaction[] }
 * @returns Respuesta con el número de transacciones insertadas y errores (si hay)
 */
export async function POST(request: NextRequest) {
    try {
        // Crear cliente de Supabase con autenticación
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                },
            }
        );

        // Verificar autenticación
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { success: false, message: 'No autenticado', inserted: 0, failed: 0 },
                { status: 401 }
            );
        }

        // Parsear el cuerpo de la petición
        const body: BulkUploadRequest = await request.json();
        const { card_id, transactions } = body;

        // Validar datos de entrada
        if (!card_id || !transactions || !Array.isArray(transactions)) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Datos inválidos. Se requiere card_id y transactions (array)',
                    inserted: 0,
                    failed: 0
                },
                { status: 400 }
            );
        }

        if (transactions.length === 0) {
            return NextResponse.json(
                { success: false, message: 'No hay transacciones para insertar', inserted: 0, failed: 0 },
                { status: 400 }
            );
        }

        // Verificar que la tarjeta existe y pertenece al usuario
        const { data: card, error: cardError } = await supabase
            .from('credit_cards')
            .select('id, cutoff_day, user_id')
            .eq('id', card_id)
            .eq('user_id', user.id)
            .single();

        if (cardError || !card) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Tarjeta no encontrada o no tienes permiso para acceder a ella',
                    inserted: 0,
                    failed: 0
                },
                { status: 404 }
            );
        }

        // Preparar transacciones para insertar
        const transactionsToInsert = [];
        const errors: BulkUploadResponse['errors'] = [];

        for (let i = 0; i < transactions.length; i++) {
            const transaction = transactions[i];

            try {
                // Validar campos requeridos
                if (!transaction.date || !transaction.concept || transaction.amount === undefined || !transaction.type) {
                    errors.push({
                        index: i,
                        transaction,
                        error: 'Campos requeridos faltantes (date, concept, amount, type)'
                    });
                    continue;
                }

                // Validar tipo de transacción
                if (transaction.type !== 'EXPENSE' && transaction.type !== 'PAYMENT') {
                    errors.push({
                        index: i,
                        transaction,
                        error: 'Tipo de transacción inválido. Debe ser EXPENSE o PAYMENT'
                    });
                    continue;
                }

                // Validar monto (debe ser positivo)
                if (transaction.amount <= 0) {
                    errors.push({
                        index: i,
                        transaction,
                        error: 'El monto debe ser mayor a 0'
                    });
                    continue;
                }

                // Validar fecha
                const date = new Date(transaction.date);
                if (isNaN(date.getTime())) {
                    errors.push({
                        index: i,
                        transaction,
                        error: 'Fecha inválida'
                    });
                    continue;
                }

                // Calcular mes de corte (opcional, puede ser útil para logs o validaciones)
                const cutoffMonth = calculateCutoffMonth(transaction.date, card.cutoff_day);

                // Preparar objeto para insertar
                transactionsToInsert.push({
                    card_id: card_id,
                    amount: transaction.amount,
                    date: transaction.date,
                    concept: transaction.concept,
                    type: transaction.type,
                    // Nota: cutoff_month se calcula en la vista, no se almacena
                });

            } catch (error) {
                errors.push({
                    index: i,
                    transaction,
                    error: error instanceof Error ? error.message : 'Error desconocido al procesar transacción'
                });
            }
        }

        // Si no hay transacciones válidas para insertar
        if (transactionsToInsert.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'No hay transacciones válidas para insertar',
                    inserted: 0,
                    failed: transactions.length,
                    errors
                },
                { status: 400 }
            );
        }

        // --- LÓGICA DE DUPLICADOS ---

        // 1. Obtener rango de fechas de las transacciones a insertar
        const dates = transactionsToInsert.map(t => new Date(t.date).getTime());
        const minDate = new Date(Math.min(...dates)).toISOString().split('T')[0];
        const maxDate = new Date(Math.max(...dates)).toISOString().split('T')[0];

        // 2. Consultar transacciones existentes en ese rango para esta tarjeta
        const { data: existingTransactions, error: fetchError } = await supabase
            .from('transactions')
            .select('date, amount, concept')
            .eq('card_id', card_id)
            .gte('date', minDate)
            .lte('date', maxDate);

        if (fetchError) {
            throw new Error(`Error al verificar duplicados: ${fetchError.message}`);
        }

        // 3. Crear Set de firmas para búsqueda rápida
        // Firma: YYYY-MM-DD_AMOUNT_CONCEPT
        const existingSignatures = new Set(
            existingTransactions?.map(t => `${t.date}_${t.amount}_${t.concept}`) || []
        );

        // 4. Filtrar duplicados
        const finalTransactionsToInsert: typeof transactionsToInsert = [];
        let duplicateCount = 0;

        for (const t of transactionsToInsert) {
            const signature = `${t.date}_${t.amount}_${t.concept}`;
            if (existingSignatures.has(signature)) {
                duplicateCount++;
            } else {
                finalTransactionsToInsert.push(t);
                // Agregar al Set localmente para evitar duplicados dentro del mismo archivo CSV
                existingSignatures.add(signature);
            }
        }

        // Si después de filtrar no queda nada
        if (finalTransactionsToInsert.length === 0) {
            return NextResponse.json({
                success: true,
                message: `Se procesaron ${transactionsToInsert.length} transacciones. Todas eran duplicadas.`,
                inserted: 0,
                failed: errors.length,
                skipped: duplicateCount
            }, { status: 200 }); // 200 OK porque funcionó, solo que no había nada nuevo
        }

        // 5. Insertar transacciones filtradas
        const { data: insertedData, error: insertError } = await supabase
            .from('transactions')
            .insert(finalTransactionsToInsert)
            .select();

        if (insertError) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Error al insertar transacciones: ${insertError.message}`,
                    inserted: 0,
                    failed: transactionsToInsert.length,
                    skipped: duplicateCount,
                    errors
                },
                { status: 500 }
            );
        }

        // Preparar respuesta
        const response: BulkUploadResponse & { skipped: number } = {
            success: true,
            message: `${insertedData?.length || 0} nuevas transacciones insertadas. ${duplicateCount} duplicados omitidos.`,
            inserted: insertedData?.length || 0,
            failed: errors.length,
            skipped: duplicateCount,
        };

        // Incluir errores solo si los hay
        if (errors.length > 0) {
            response.errors = errors;
        }

        return NextResponse.json(response, { status: 201 });

    } catch (error) {
        console.error('Error en bulk upload:', error);

        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : 'Error interno del servidor',
                inserted: 0,
                failed: 0,
                skipped: 0
            },
            { status: 500 }
        );
    }
}
