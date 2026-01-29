import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { calculateCutoffMonth } from '@/lib/utils';
import type { TransactionWithCutoff } from '@/types/transaction';

/**
 * GET /api/transactions?card_id={uuid}&cutoff_month={YYYY-MM}
 * 
 * Obtiene transacciones de una tarjeta con el mes de corte calculado.
 * Opcionalmente filtra por un mes de corte específico.
 * 
 * Query params:
 * - card_id (requerido): ID de la tarjeta
 * - cutoff_month (opcional): Mes de corte en formato YYYY-MM
 * - limit (opcional): Número máximo de resultados (default: 100)
 * - offset (opcional): Offset para paginación (default: 0)
 */
export async function GET(request: NextRequest) {
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
                { error: 'No autenticado' },
                { status: 401 }
            );
        }

        // Obtener parámetros de query
        const searchParams = request.nextUrl.searchParams;
        const card_id = searchParams.get('card_id');
        const cutoff_month = searchParams.get('cutoff_month');
        const limit = parseInt(searchParams.get('limit') || '100', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        // Validar parámetros
        if (!card_id) {
            return NextResponse.json(
                { error: 'Se requiere el parámetro card_id' },
                { status: 400 }
            );
        }

        // Verificar que la tarjeta existe y pertenece al usuario
        const { data: card, error: cardError } = await supabase
            .from('credit_cards')
            .select('id, cutoff_day, user_id, bank_name, last_4_digits')
            .eq('id', card_id)
            .eq('user_id', user.id)
            .single();

        if (cardError || !card) {
            return NextResponse.json(
                { error: 'Tarjeta no encontrada o no tienes permiso para acceder a ella' },
                { status: 404 }
            );
        }

        // Construir query de transacciones
        let query = supabase
            .from('transactions')
            .select('*')
            .eq('card_id', card_id)
            .order('date', { ascending: false })
            .range(offset, offset + limit - 1);

        // Ejecutar query
        const { data: transactions, error: transactionsError } = await query;

        if (transactionsError) {
            return NextResponse.json(
                { error: `Error al obtener transacciones: ${transactionsError.message}` },
                { status: 500 }
            );
        }

        // Agregar mes de corte calculado a cada transacción
        const transactionsWithCutoff: TransactionWithCutoff[] = (transactions || []).map(t => ({
            ...t,
            cutoff_month: calculateCutoffMonth(t.date, card.cutoff_day),
            user_id: card.user_id,
            bank_name: card.bank_name,
            last_4_digits: card.last_4_digits,
            cutoff_day: card.cutoff_day,
        }));

        // Filtrar por mes de corte si se especificó
        let filteredTransactions = transactionsWithCutoff;
        if (cutoff_month) {
            filteredTransactions = transactionsWithCutoff.filter(
                t => t.cutoff_month === cutoff_month
            );
        }

        // Calcular resumen
        const summary = {
            total_transactions: filteredTransactions.length,
            total_expenses: filteredTransactions
                .filter(t => t.type === 'EXPENSE')
                .reduce((sum, t) => sum + parseFloat(String(t.amount)), 0),
            total_payments: filteredTransactions
                .filter(t => t.type === 'PAYMENT')
                .reduce((sum, t) => sum + parseFloat(String(t.amount)), 0),
        };

        summary['balance'] = summary.total_expenses - summary.total_payments;

        return NextResponse.json({
            card: {
                id: card.id,
                bank_name: card.bank_name,
                last_4_digits: card.last_4_digits,
                cutoff_day: card.cutoff_day,
            },
            transactions: filteredTransactions,
            summary,
            pagination: {
                limit,
                offset,
                returned: filteredTransactions.length,
            }
        });

    } catch (error) {
        console.error('Error en GET /api/transactions:', error);

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
