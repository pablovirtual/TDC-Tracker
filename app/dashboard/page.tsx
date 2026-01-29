import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
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

    // Fetch Cards for the user
    // NOTA: Asumimos que el usuario está autenticado si llega aquí (middleware o supabase auth)
    // Si no checkeamos user, la RLS (Row Level Security) debería filtrar y devolver array vacío si no hay sesión.

    // Check session just in case to avoid empty unauth access if RLS is strict
    const { data: { user } } = await supabase.auth.getUser();

    // Si no hay usuario, podríamos redirigir o mostrar estado vacío.
    // DashboardClient maneja array vacío, así que está bien.

    const { data: cards, error } = await supabase
        .from('credit_cards')
        .select('*')
        .order('created_at', { ascending: true }); // Ordenar por creación para mantener consistencia

    if (error) {
        console.error("Error fetching cards:", error);
        // Podríamos manejar error aquí o pasar array vacío
    }

    return (
        <DashboardClient cards={cards || []} />
    );
}
