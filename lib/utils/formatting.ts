/**
 * Formatea un número como moneda en formato MXN
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Formatea un mes de corte (YYYY-MM) a formato legible
 * Ejemplo: '2026-01' -> 'Enero 2026'
 */
export function formatCutoffMonth(cutoffMonth: string): string {
    const [year, month] = cutoffMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);

    return new Intl.DateTimeFormat('es-MX', {
        month: 'long',
        year: 'numeric',
    }).format(date);
}

/**
 * Formatea una fecha ISO a formato corto
 * Ejemplo: '2026-01-15' -> '15/01/2026'
 */
export function formatDate(dateString: string): string {
    const date = new Date(dateString);

    return new Intl.DateTimeFormat('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date);
}
