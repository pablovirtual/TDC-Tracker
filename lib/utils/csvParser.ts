import type { CSVTransactionRow, ParsedTransaction, TransactionType } from '@/types/transaction';

/**
 * Parsea una fila de CSV a una transacción validada
 * 
 * @param row - Fila del CSV con campos Fecha, Concepto, Monto
 * @param rowIndex - Índice de la fila (para mensajes de error)
 * @returns ParsedTransaction o null si la fila es inválida
 */
export function parseCSVRow(
    row: CSVTransactionRow,
    rowIndex: number
): { transaction: ParsedTransaction | null; error: string | null } {
    try {
        // Validar que existan los campos requeridos
        if (!row.Fecha || !row.Concepto || row.Monto === undefined || row.Monto === '') {
            return {
                transaction: null,
                error: `Fila ${rowIndex}: Faltan campos requeridos (Fecha, Concepto, Monto)`
            };
        }

        // Parsear fecha - soportar varios formatos comunes
        const date = parseDate(row.Fecha);
        if (!date) {
            return {
                transaction: null,
                error: `Fila ${rowIndex}: Formato de fecha inválido: ${row.Fecha}`
            };
        }

        // Parsear monto - remover formato monetario si existe
        const { amount, type } = parseAmount(row.Monto, row.Tipo);
        if (amount === null) {
            return {
                transaction: null,
                error: `Fila ${rowIndex}: Formato de monto inválido: ${row.Monto}`
            };
        }

        // Limpiar concepto
        const concept = String(row.Concepto).trim();
        if (concept.length === 0) {
            return {
                transaction: null,
                error: `Fila ${rowIndex}: El concepto no puede estar vacío`
            };
        }

        return {
            transaction: {
                date: date.toISOString().split('T')[0], // Formato YYYY-MM-DD
                concept,
                amount,
                type,
            },
            error: null
        };

    } catch (error) {
        return {
            transaction: null,
            error: `Fila ${rowIndex}: ${error instanceof Error ? error.message : 'Error desconocido'}`
        };
    }
}

/**
 * Parsea una fecha en varios formatos comunes
 * Soporta: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, MM/DD/YYYY
 * 
 * @param dateString - String con la fecha
 * @returns Date object o null si es inválido
 */
function parseDate(dateString: string): Date | null {
    const cleaned = dateString.trim();

    // Intentar con formato ISO (YYYY-MM-DD)
    let date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
        return date;
    }

    // Intentar con formatos DD/MM/YYYY o DD-MM-YYYY
    const parts = cleaned.split(/[\/\-\.]/);

    if (parts.length === 3) {
        const [part1, part2, part3] = parts.map(p => parseInt(p, 10));

        // Si el tercer componente es un año de 4 dígitos, usar DD/MM/YYYY
        if (part3 > 999) {
            date = new Date(part3, part2 - 1, part1);
        }
        // Si el primer componente es un año de 4 dígitos, usar YYYY/MM/DD
        else if (part1 > 999) {
            date = new Date(part1, part2 - 1, part3);
        }
        // Intentar formato MM/DD/YYYY (estadounidense)
        else {
            date = new Date(part3 + 2000, part1 - 1, part2); // Asume años 20XX
        }

        if (!isNaN(date.getTime())) {
            return date;
        }
    }

    return null;
}

/**
 * Parsea un monto y determina el tipo de transacción
 * 
 * @param amountString - String con el monto (puede incluir $, comas, etc.)
 * @param typeString - Tipo explícito (opcional)
 * @returns { amount, type } o { amount: null } si es inválido
 */
function parseAmount(
    amountString: string | number,
    typeString?: string
): { amount: number | null; type: TransactionType } {
    let numericValue: number;

    if (typeof amountString === 'number') {
        numericValue = amountString;
    } else {
        // Limpiar string: remover símbolos monetarios, espacios, comas
        const cleaned = amountString
            .replace(/[$€£¥\s]/g, '') // Remover símbolos de moneda y espacios
            .replace(/,/g, '');       // Remover comas (separadores de miles)

        numericValue = parseFloat(cleaned);
    }

    // Validar que sea un número válido
    if (isNaN(numericValue)) {
        return { amount: null, type: 'EXPENSE' };
    }

    // Determinar el tipo basado en:
    // 1. El campo Tipo si está presente
    // 2. El signo del número (negativo = pago, positivo = gasto)
    let type: TransactionType = 'EXPENSE';

    if (typeString) {
        const typeUpper = typeString.toUpperCase().trim();
        if (typeUpper === 'PAYMENT' || typeUpper === 'PAGO' || typeUpper === 'ABONO') {
            type = 'PAYMENT';
        } else if (typeUpper === 'EXPENSE' || typeUpper === 'GASTO' || typeUpper === 'CARGO') {
            type = 'EXPENSE';
        }
    } else {
        // Inferir del signo
        if (numericValue < 0) {
            type = 'PAYMENT';
            numericValue = Math.abs(numericValue); // Convertir a positivo
        }
    }

    // Asegurar que el monto sea positivo
    const amount = Math.abs(numericValue);

    // Validar que sea mayor a 0
    if (amount <= 0) {
        return { amount: null, type };
    }

    // Redondear a 2 decimales
    const roundedAmount = Math.round(amount * 100) / 100;

    return { amount: roundedAmount, type };
}

/**
 * Procesa un array completo de filas CSV
 * 
 * @param rows - Array de objetos con los datos del CSV
 * @returns Objeto con transacciones válidas y errores
 */
export function parseCSVData(rows: CSVTransactionRow[]): {
    transactions: ParsedTransaction[];
    errors: Array<{ rowIndex: number; error: string }>;
} {
    const transactions: ParsedTransaction[] = [];
    const errors: Array<{ rowIndex: number; error: string }> = [];

    rows.forEach((row, index) => {
        const { transaction, error } = parseCSVRow(row, index + 1); // +1 para contar desde 1

        if (transaction) {
            transactions.push(transaction);
        } else if (error) {
            errors.push({ rowIndex: index + 1, error });
        }
    });

    return { transactions, errors };
}

/**
 * Valida que un archivo CSV tenga los encabezados correctos
 * 
 * @param headers - Array con los nombres de las columnas
 * @returns true si los encabezados son válidos
 */
export function validateCSVHeaders(headers: string[]): {
    valid: boolean;
    missingHeaders: string[];
} {
    const requiredHeaders = ['Fecha', 'Concepto', 'Monto'];
    const normalizedHeaders = headers.map(h => h.trim());

    const missingHeaders = requiredHeaders.filter(
        required => !normalizedHeaders.some(
            header => header.toLowerCase() === required.toLowerCase()
        )
    );

    return {
        valid: missingHeaders.length === 0,
        missingHeaders
    };
}
