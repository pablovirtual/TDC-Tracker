'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function updateTransaction(id: string, data: { category?: string; concept?: string }) {
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

    const { error } = await supabase
        .from('transactions')
        .update(data)
        .eq('id', id);

    if (error) {
        throw new Error(`Error updating transaction: ${error.message}`);
    }

    revalidatePath('/dashboard/transactions');
}

export async function deleteTransaction(id: string) {
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

    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(`Error deleting transaction: ${error.message}`);
    }

    revalidatePath('/dashboard/transactions');
}
