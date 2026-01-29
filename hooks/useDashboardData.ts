'use client';

import { useEffect, useState } from 'react';
import type { TransactionWithCutoff } from '@/types/transaction';

export interface CutoffPeriodSummary {
    cutoff_month: string;
    total_expenses: number;
    total_payments: number;
    balance: number;
    transaction_count: number;
}

export interface DashboardData {
    transactions: TransactionWithCutoff[];
    totalBalance: number;
    totalExpenses: number;
    totalPayments: number;
    periodSummaries: CutoffPeriodSummary[];
    isLoading: boolean;
    error: string | null;
}

/**
 * Hook para obtener datos del dashboard
 * Fetches transacciones de una tarjeta y calcula métricas
 * 
 * @param cardId - UUID de la tarjeta a consultar
 */
export function useDashboardData(cardId: string | null): DashboardData {
    const [transactions, setTransactions] = useState<TransactionWithCutoff[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!cardId) {
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const response = await fetch(`/api/transactions?card_id=${cardId}&limit=1000`);

                if (!response.ok) {
                    throw new Error(`Error al obtener transacciones: ${response.statusText}`);
                }

                const data = await response.json();
                setTransactions(data.transactions || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error desconocido');
                setTransactions([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [cardId]);

    // Calcular métricas
    const totalExpenses = transactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + parseFloat(String(t.amount)), 0);

    const totalPayments = transactions
        .filter(t => t.type === 'PAYMENT')
        .reduce((sum, t) => sum + parseFloat(String(t.amount)), 0);

    const totalBalance = totalExpenses - totalPayments;

    // Agrupar por mes de corte
    const periodSummaries = calculatePeriodSummaries(transactions);

    return {
        transactions,
        totalBalance,
        totalExpenses,
        totalPayments,
        periodSummaries,
        isLoading,
        error,
    };
}

/**
 * Agrupa transacciones por mes de corte y calcula resúmenes
 */
function calculatePeriodSummaries(
    transactions: TransactionWithCutoff[]
): CutoffPeriodSummary[] {
    // Agrupar por cutoff_month
    const grouped = transactions.reduce((acc, transaction) => {
        const month = transaction.cutoff_month;

        if (!acc[month]) {
            acc[month] = {
                cutoff_month: month,
                total_expenses: 0,
                total_payments: 0,
                balance: 0,
                transaction_count: 0,
            };
        }

        const amount = parseFloat(String(transaction.amount));

        if (transaction.type === 'EXPENSE') {
            acc[month].total_expenses += amount;
        } else {
            acc[month].total_payments += amount;
        }

        acc[month].transaction_count += 1;
        acc[month].balance = acc[month].total_expenses - acc[month].total_payments;

        return acc;
    }, {} as Record<string, CutoffPeriodSummary>);

    // Convertir a array y ordenar por mes (más reciente primero)
    return Object.values(grouped).sort((a, b) =>
        b.cutoff_month.localeCompare(a.cutoff_month)
    );
}
