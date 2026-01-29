'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter,
} from '@/components/ui/table';
import { useDashboardData } from '@/hooks/useDashboardData';
import { formatCurrency, formatCutoffMonth } from '@/lib/utils/formatting';
import WaterfallChart from '@/components/WaterfallChart';
import CsvUploader from '@/components/CsvUploader';
import { useState, useEffect } from 'react';
import { CreditCard } from 'lucide-react';

interface DashboardClientProps {
    cards: Array<{
        id: string;
        alias: string;
        bank: string;
        last_4_digits: string;
        cutoff_day: number;
    }>;
}

export default function DashboardClient({ cards }: DashboardClientProps) {
    // Inicializar con la primera tarjeta si existe
    const [selectedCardId, setSelectedCardId] = useState<string | null>(
        cards.length > 0 ? cards[0].id : null
    );

    const {
        totalBalance,
        totalExpenses,
        totalPayments,
        periodSummaries,
        isLoading,
        error,
    } = useDashboardData(selectedCardId);

    const handleUpload = async (transactions: any[]) => {
        if (!selectedCardId) {
            alert("Por favor selecciona una tarjeta primero");
            return;
        }

        try {
            const response = await fetch('/api/transactions/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    card_id: selectedCardId,
                    transactions: transactions.map(t => ({
                        date: t.date,
                        amount: t.amount,
                        description: t.concept,
                        type: t.type
                    }))
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error al cargar transacciones');
            }

            window.location.reload();

        } catch (error) {
            console.error('Upload error:', error);
            alert(error instanceof Error ? error.message : "Error desconocido al subir archivo");
        }
    };

    if (cards.length === 0) {
        return (
            <div className="container mx-auto p-8 text-center">
                <Card>
                    <CardHeader>
                        <CardTitle>Bienvenido</CardTitle>
                    </CardHeader>
                    <CardContent className="py-10">
                        <CreditCard className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                        <h2 className="text-xl font-semibold mb-2">No tienes tarjetas registradas</h2>
                        <p className="text-gray-500 mb-6">Para ver tu dashboard, necesitas agregar una tarjeta de crédito.</p>
                        <a href="/dashboard/cards" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                            Ir a Mis Tarjetas
                        </a>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!selectedCardId) {
        // Fallback por si hay tarjetas pero ninguna seleccionada (raro con el init state)
        return <div className="p-8">Seleccionando tarjeta...</div>;
    }

    // Si está cargando los datos iniciales (solo la primera vez)
    if (isLoading && !totalBalance && !totalExpenses) { // Condición un poco laxa para permitir mostrar esqueleto o algo
        // Dejamos el loading spinner original si se prefiere
    }

    return (
        <div className="container mx-auto p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                    Financial Cutoff Tracker
                </h1>
                <p className="text-gray-500">
                    Gestión de tarjetas de crédito basada en ciclos de corte
                </p>

                {/* Selector visual simple si hay muchas tarjetas, o simplemente indicar cuál se ve */}
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded-lg inline-block">
                    <span className="font-medium">Tarjeta Activa:</span>
                    <select
                        value={selectedCardId}
                        onChange={(e) => setSelectedCardId(e.target.value)}
                        className="bg-transparent border-none font-semibold text-blue-700 focus:ring-0 cursor-pointer"
                    >
                        {cards.map(c => (
                            <option key={c.id} value={c.id}>{c.alias} ({c.bank})</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Carga de Archivos */}
            <div className="mb-8">
                <CsvUploader
                    onUpload={handleUpload}
                    cards={cards}
                    selectedCardId={selectedCardId}
                    onCardSelect={setSelectedCardId}
                />
            </div>

            {isLoading && (
                <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-xs text-gray-500 mt-2">Actualizando datos...</p>
                </div>
            )}

            {error ? (
                <div className="bg-red-50 p-4 rounded-md text-red-700 border border-red-200 mb-8">
                    Error: {error}
                </div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="grid gap-6 md:grid-cols-3 mb-8">
                        {/* Saldo Real Total */}
                        <Card className="border-l-4 border-l-blue-600">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-gray-500">
                                    Saldo Real Total
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-gray-900">
                                    {formatCurrency(totalBalance)}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Gastos históricos menos pagos
                                </p>
                            </CardContent>
                        </Card>

                        {/* Total Gastos */}
                        <Card className="border-l-4 border-l-red-500">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-gray-500">
                                    Total Gastos
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-red-600">
                                    {formatCurrency(totalExpenses)}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Suma de todos los cargos
                                </p>
                            </CardContent>
                        </Card>

                        {/* Total Pagos */}
                        <Card className="border-l-4 border-l-green-600">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-gray-500">
                                    Total Pagos
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-green-600">
                                    {formatCurrency(totalPayments)}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Suma de todos los abonos
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Waterfall Chart - Evolución del Saldo */}
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle>Evolución del Saldo por Mes de Corte</CardTitle>
                            <p className="text-sm text-gray-500 mt-2">
                                Gráfico de cascada mostrando cómo varió el saldo en cada período
                            </p>
                        </CardHeader>
                        <CardContent>
                            {periodSummaries.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <p>No hay datos suficientes para mostrar el gráfico</p>
                                </div>
                            ) : (
                                <div className="h-[400px] w-full">
                                    <WaterfallChart data={periodSummaries} />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Tabla de Períodos de Corte */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Resumen por Mes de Corte</CardTitle>
                            <p className="text-sm text-gray-500 mt-2">
                                Transacciones agrupadas por período de corte (día {cards.find(c => c.id === selectedCardId)?.cutoff_day || 21})
                            </p>
                        </CardHeader>
                        <CardContent>
                            {periodSummaries.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <p>No hay transacciones registradas</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Mes de Corte</TableHead>
                                            <TableHead className="text-right">Total Gasto</TableHead>
                                            <TableHead className="text-right">Total Pagos</TableHead>
                                            <TableHead className="text-right">Saldo del Periodo</TableHead>
                                            <TableHead className="text-right">Transacciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {periodSummaries.map((period) => {
                                            const isPositiveBalance = period.balance > 0;

                                            return (
                                                <TableRow key={period.cutoff_month}>
                                                    <TableCell className="font-medium">
                                                        {formatCutoffMonth(period.cutoff_month)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-red-600">
                                                        {formatCurrency(period.total_expenses)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-green-600">
                                                        {formatCurrency(period.total_payments)}
                                                    </TableCell>
                                                    <TableCell
                                                        className={`text-right font-semibold ${isPositiveBalance ? 'text-red-600' : 'text-green-600'
                                                            }`}
                                                    >
                                                        {formatCurrency(period.balance)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-gray-500">
                                                        {period.transaction_count}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell className="font-bold">TOTAL</TableCell>
                                            <TableCell className="text-right font-bold text-red-600">
                                                {formatCurrency(totalExpenses)}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-green-600">
                                                {formatCurrency(totalPayments)}
                                            </TableCell>
                                            <TableCell
                                                className={`text-right font-bold ${totalBalance > 0 ? 'text-red-600' : 'text-green-600'
                                                    }`}
                                            >
                                                {formatCurrency(totalBalance)}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-gray-500">
                                                {periodSummaries.reduce((sum, p) => sum + p.transaction_count, 0)}
                                            </TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Nota sobre el día de corte */}
                    <Card className="mt-6 bg-blue-50 border-blue-200">
                        <CardContent className="pt-6">
                            <p className="text-sm text-blue-800">
                                <strong>Nota:</strong> Las transacciones están agrupadas por mes de corte usando el día {cards.find(c => c.id === selectedCardId)?.cutoff_day} como referencia.
                                Las transacciones del día 1-{cards.find(c => c.id === selectedCardId)?.cutoff_day} pertenecen al mes actual, y del resto al mes siguiente.
                            </p>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
