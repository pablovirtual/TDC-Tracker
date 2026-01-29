import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AddCardModal from '@/components/cards/AddCardModal';
import { Plus, CreditCard } from 'lucide-react';

export default async function CardsPage() {
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

    // Fetch Cards
    const { data: cards, error } = await supabase
        .from('credit_cards')
        .select('*')
        .order('created_at', { ascending: false });

    // Handle Auth Error or No User
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return (
            <div className="container mx-auto p-8 text-center">
                <h1 className="text-2xl font-bold text-red-600">Acceso Restringido</h1>
                <p>Por favor inicia sesión para ver tus tarjetas.</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Mis Tarjetas</h1>
                    <p className="text-gray-500">Gestiona tus tarjetas de crédito y fechas de corte</p>
                </div>
                <AddCardModal>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Agregar Tarjeta
                    </Button>
                </AddCardModal>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-md mb-8">
                    Error al cargar tarjetas: {error.message}
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {cards?.map((card) => (
                    <Card key={card.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {card.bank}
                            </CardTitle>
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{card.alias}</div>
                            <p className="text-xs text-muted-foreground">
                                •••• {card.last_4_digits}
                            </p>
                            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
                                <span className="text-gray-500">Día de Corte:</span>
                                <span className="font-semibold text-blue-600">{card.cutoff_day}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {(!cards || cards.length === 0) && (
                    <div className="col-span-full text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                        <CreditCard className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No hay tarjetas registradas</h3>
                        <p className="text-gray-500 mb-4">Agrega tu primera tarjeta para comenzar.</p>
                        <AddCardModal>
                            <Button variant="outline">
                                <Plus className="mr-2 h-4 w-4" /> Agregar Ahora
                            </Button>
                        </AddCardModal>
                    </div>
                )}
            </div>
        </div>
    );
}
