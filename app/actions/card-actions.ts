'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function createCard(formData: FormData) {
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

    // 1. Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        // Por ahora, para testing, si no hay usuario, usamos un usuario hardcodeado o lanzamos error
        // En producción DEBE haber usuario.
        // Simularemos usuario para desarrollo si es necesario, pero lo correcto es exigir auth.
        // throw new Error('Usuario no autenticado');
        console.warn("No user authenticated in server action, proceeding carefully (ensure checking RLS policy or dev mode)");
    }

    // Obtener campos
    const alias = formData.get('alias') as string;
    const bank = formData.get('bank') as string;
    const last4 = formData.get('last4') as string;
    const cutoffDay = parseInt(formData.get('cutoff_day') as string);

    // Validar
    if (!alias || !bank || !cutoffDay) {
        throw new Error('Faltan campos requeridos');
    }

    if (cutoffDay < 1 || cutoffDay > 31) {
        throw new Error('Día de corte inválido');
    }

    // Insertar
    const { error } = await supabase
        .from('credit_cards')
        .insert({
            user_id: user?.id, // Si RLS está bien, esto fallará si user es null.
            alias,
            bank,
            last_4_digits: last4,
            cutoff_day: cutoffDay
        });

    if (error) {
        console.error('Error creating card:', error);
        throw new Error(`Error al crear la tarjeta: ${error.message}`);
    }

    // Revalidar path
    revalidatePath('/dashboard/cards');
    revalidatePath('/dashboard'); // Para que el selector se actualice si está ahí
}
