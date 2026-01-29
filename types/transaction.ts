/**
 * Tipos relacionados con transacciones
 */

export type TransactionType = 'EXPENSE' | 'PAYMENT';

export interface Transaction {
    id: string;
    card_id: string;
    amount: number;
    date: string; // ISO date string
    concept: string;
    type: TransactionType;
    created_at?: string;
    updated_at?: string;
}

export interface TransactionWithCutoff extends Transaction {
    cutoff_month: string; // formato 'YYYY-MM'
    user_id: string;
    bank_name: string;
    last_4_digits: string;
    cutoff_day: number;
}

/**
 * Tipos para la importación de CSV
 */
export interface CSVTransactionRow {
    Fecha: string;      // Puede venir en varios formatos
    Concepto: string;
    Monto: string | number; // Puede venir como string con formato monetario
    Tipo?: string;      // Opcional, puede inferirse del signo del monto
}

export interface ParsedTransaction {
    date: string;       // Normalizada a ISO format
    concept: string;
    amount: number;     // Siempre positivo
    type: TransactionType;
}

/**
 * Tipos para el endpoint de bulk upload
 */
export interface BulkUploadRequest {
    card_id: string;
    transactions: ParsedTransaction[];
}

export interface BulkUploadResponse {
    success: boolean;
    message: string;
    inserted: number;
    failed: number;
    errors?: Array<{
        index: number;
        transaction: ParsedTransaction;
        error: string;
    }>;
}
