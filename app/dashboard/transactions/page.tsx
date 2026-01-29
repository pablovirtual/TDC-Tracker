import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { DataTable } from '@/components/transactions/data-table';
import { columns, Transaction } from '@/components/transactions/columns';
import { calculateCutoffMonth } from '@/lib/utils';

export default async function TransactionsPage() {
    const cookieStore = cookies();
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

    // Fetch transactions con join a cards para obtener alias y cutoff_day
    const { data: rawTransactions, error } = await supabase
        .from('transactions')
        .select(`
            *,
            credit_cards (
                alias,
                bank,
                cutoff_day
            )
        `)
        .order('date', { ascending: false });

    if (error) {
        return <div className="p-8 text-red-600">Error: {error.message}</div>;
    }

    // Procesar datos para añadir cutoff_month
    // Nota: TanStack table es muy rápido filtrando, así que calculamos esto aquí en servidor
    // para pasarlo como campo plano.
    const processedTransactions: Transaction[] = (rawTransactions || []).map((t: any) => {
        // Mapear relación
        const card = t.credit_cards;

        let cutoff_month = "Desconocido";
        if (card && card.cutoff_day) {
            cutoff_month = calculateCutoffMonth(t.date, card.cutoff_day);
        }

        return {
            id: t.id,
            date: t.date,
            amount: t.amount,
            concept: t.concept, // En DB se llama 'concept' o 'description'? Revisemos.
            // En steps anteriores usamos 'description' para el API insert, pero en DB schema...
            // Revisaré el schema si falla. Asumamos que Utils CSV parser usa 'concept'.
            // API insert mapea: description: t.concept.
            // Entonces en DB la columna es 'description' o 'concept'?
            // Utils.ts dice 'concept' en ParsedTransaction.
            // API route inserta: date, amount, concept, type. (WAIT, check API route again)

            // FIXME: API route inserta: concept: transaction.concept 
            // PERO... ¿cuál es el nombre en supabase?
            // Mirando logs anteriores del API route: transactionsToInsert has 'concept'.
            // Entonces en DB es 'concept'.

            type: t.type,
            category: t.category,
            card: {
                alias: card?.alias || 'Desconocida',
                bank: card?.bank || ''
            },
            cutoff_month: cutoff_month
        };
    });

    return (
        <div className="container mx-auto p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Historial de Transacciones</h1>
                <p className="text-gray-500">Consulta, filtra y edita todas tus movimientos.</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <DataTable columns={columns} data={processedTransactions} />
            </div>
        </div>
    );
}
