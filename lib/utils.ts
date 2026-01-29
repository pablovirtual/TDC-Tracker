import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Calcula el mes de corte basado en la fecha de transacción y el día de corte de la tarjeta.
 * 
 * Regla de negocio:
 * - Si el día de la transacción es <= al día de corte, pertenece al mes actual.
 * - Si el día de la transacción es > al día de corte, pertenece al mes siguiente.
 * 
 * @param transactionDate - Fecha de la transacción (Date object o string ISO)
 * @param cutoffDay - Día de corte de la tarjeta (1-31)
 * @returns String en formato 'YYYY-MM' representando el mes de corte
 */
export function calculateCutoffMonth(
    transactionDate: Date | string,
    cutoffDay: number
): string {
    // Validar que cutoffDay esté en el rango válido
    if (cutoffDay < 1 || cutoffDay > 31) {
        throw new Error('cutoffDay debe estar entre 1 y 31');
    }

    // Convertir a Date si es string
    // Convertir a Date si es string
    let date: Date;
    if (typeof transactionDate === 'string') {
        const match = transactionDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) {
            // Crear fecha al mediodía para evitar problemas de bordes de zona horaria
            date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]), 12);
        } else {
            date = new Date(transactionDate);
        }
    } else {
        date = transactionDate;
    }

    // Validar que la fecha sea válida
    if (isNaN(date.getTime())) {
        throw new Error('Fecha de transacción inválida');
    }

    // Obtener el día de la transacción
    const transactionDay = date.getDate();

    // Determinar el mes de corte
    let cutoffMonth: Date;

    if (transactionDay <= cutoffDay) {
        // Si el día de la transacción es <= al día de corte, pertenece al mes actual
        cutoffMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    } else {
        // Si el día de la transacción es > al día de corte, pertenece al mes siguiente
        cutoffMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    }

    // Formatear como 'YYYY-MM'
    const year = cutoffMonth.getFullYear();
    const month = String(cutoffMonth.getMonth() + 1).padStart(2, '0');

    return `${year}-${month}`;
}
