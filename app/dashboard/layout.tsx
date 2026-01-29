import SignOutButton from "@/components/auth/SignOutButton";
import Link from "next/link";
import { LayoutDashboard, CreditCard, List } from 'lucide-react';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col">
            {/* Navbar Simple */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-gray-900">
                        <LayoutDashboard className="h-6 w-6 text-blue-600" />
                        TDC Tracker
                    </Link>

                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
                        <Link href="/dashboard" className="hover:text-blue-600 transition-colors flex items-center gap-1">
                            <LayoutDashboard className="h-4 w-4" /> Dashboard
                        </Link>
                        <Link href="/dashboard/transactions" className="hover:text-blue-600 transition-colors flex items-center gap-1">
                            <List className="h-4 w-4" /> Transacciones
                        </Link>
                        <Link href="/dashboard/cards" className="hover:text-blue-600 transition-colors flex items-center gap-1">
                            <CreditCard className="h-4 w-4" /> Mis Tarjetas
                        </Link>
                    </nav>

                    <SignOutButton />
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 bg-gray-50/50">
                {children}
            </main>
        </div>
    );
}
