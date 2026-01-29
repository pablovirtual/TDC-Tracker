'use client';

import { createBrowserClient } from '@supabase/ssr';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [supabase] = useState(() => createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ));

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') {
                router.push('/dashboard');
            }
        });

        return () => subscription.unsubscribe();
    }, [supabase, router]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center py-2 bg-gray-50">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        Financial Cutoff Tracker
                    </h1>
                    <p className="mt-2 text-sm text-gray-500">
                        Inicia sesión para gestionar tus tarjetas
                    </p>
                </div>

                <Auth
                    supabaseClient={supabase}
                    appearance={{ theme: ThemeSupa }}
                    theme="light"
                    providers={[]} // Por ahora solo email/password, añadir 'google' si se requiere
                    redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
                />
            </div>
        </div>
    );
}
