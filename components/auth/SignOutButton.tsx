'use client';

import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SignOutButton() {
    const router = useRouter();
    const [supabase] = useState(() => createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ));

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    return (
        <Button variant="outline" size="sm" onClick={handleSignOut} className="text-gray-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200">
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
        </Button>
    );
}
