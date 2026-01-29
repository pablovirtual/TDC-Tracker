'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { validateCSVHeaders, parseCSVData } from '@/lib/utils/csvParser';
import type { CSVTransactionRow, ParsedTransaction } from '@/types/transaction';
import { cn } from '@/lib/utils'; // Using consolidated utils

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface CsvUploaderProps {
    onUpload?: (transactions: ParsedTransaction[]) => void;
    cards?: Array<{ id: string; alias: string; last_4_digits: string; bank: string }>;
    onCardSelect?: (cardId: string) => void;
    selectedCardId?: string | null;
}

export default function CsvUploader({ onUpload, cards = [], onCardSelect, selectedCardId }: CsvUploaderProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [parsedData, setParsedData] = useState<ParsedTransaction[]>([]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (!selectedCardId) {
            setError("Por favor selecciona una tarjeta antes de subir el archivo.");
            return;
        }

        const file = acceptedFiles[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        setParsedData([]);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const headers = results.meta.fields || [];
                const rows = results.data as CSVTransactionRow[];

                // 1. Validar Headers
                const headerValidation = validateCSVHeaders(headers);
                if (!headerValidation.valid) {
                    setError(`El archivo CSV no tiene los encabezados requeridos. Faltan: ${headerValidation.missingHeaders.join(', ')}`);
                    setIsLoading(false);
                    return;
                }

                // 2. Parsear y Validar Datos
                const { transactions, errors } = parseCSVData(rows);

                if (errors.length > 0) {
                    // Mostrar los primeros errores para no saturar
                    const errorMessages = errors.slice(0, 3).map(e => e.error).join('. ');
                    const remainingErrors = errors.length - 3;
                    let fullErrorMsg = `Se encontraron errores en el archivo: ${errorMessages}`;
                    if (remainingErrors > 0) {
                        fullErrorMsg += ` y ${remainingErrors} errores más.`;
                    }
                    setError(fullErrorMsg);
                    setIsLoading(false);
                    return;
                }

                if (transactions.length === 0) {
                    setError('El archivo no contiene transacciones válidas.');
                    setIsLoading(false);
                    return;
                }

                // Éxito
                setParsedData(transactions);
                setSuccessMessage(`Se han procesado correctamente ${transactions.length} transacciones.`);
                setIsLoading(false);

                // Notificar al padre si existe la prop
                if (onUpload) {
                    onUpload(transactions);
                }
            },
            error: (err) => {
                setError(`Error al leer el archivo CSV: ${err.message}`);
                setIsLoading(false);
            }
        });
    }, [onUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.csv']
        },
        multiple: false
    });

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Cargar Transacciones (CSV)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="mb-6">
                    <label className="text-sm font-medium mb-2 block">Selecciona Tarjeta</label>
                    <Select
                        value={selectedCardId || ""}
                        onValueChange={(value) => onCardSelect && onCardSelect(value)}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona una tarjeta..." />
                        </SelectTrigger>
                        <SelectContent>
                            {cards.map((card) => (
                                <SelectItem key={card.id} value={card.id}>
                                    {card.alias} - {card.bank} (**** {card.last_4_digits})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div
                    {...getRootProps()}
                    className={cn(
                        "border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors",
                        isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400",
                        error ? "border-red-300 bg-red-50" : "",
                        successMessage ? "border-green-300 bg-green-50" : "",
                        !selectedCardId && "opacity-50 cursor-not-allowed bg-gray-50"
                    )}
                >
                    <input {...getInputProps()} />
                    {isLoading ? (
                        <p className="text-gray-500">Procesando archivo...</p>
                    ) : (
                        <div>
                            {isDragActive ? (
                                <p className="text-blue-600 font-medium">Suelta el archivo aquí...</p>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-gray-600">
                                        Arrastra y suelta un archivo CSV aquí, o haz clic para seleccionar
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Formato requerido: Fecha, Concepto, Monto, [Tipo]
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Mensajes de Estado */}
                {error && (
                    <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md text-sm">
                        <strong>Error:</strong> {error}
                    </div>
                )}

                {successMessage && (
                    <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-md text-sm">
                        <strong>¡Éxito!</strong> {successMessage}
                    </div>
                )}

                {/* Previsualización simple (opcional) */}
                {parsedData.length > 0 && !error && (
                    <div className="mt-4">
                        <p className="text-sm text-gray-500 mb-2">Vista previa (primeras 3 transacciones):</p>
                        <div className="bg-gray-50 rounded p-2 text-xs font-mono space-y-1">
                            {parsedData.slice(0, 3).map((tx, idx) => (
                                <div key={idx} className="flex justify-between border-b last:border-0 pb-1 border-gray-200">
                                    <span>{tx.date}</span>
                                    <span className="truncate max-w-[200px]">{tx.concept}</span>
                                    <span className={tx.type === 'PAYMENT' ? 'text-green-600' : 'text-red-600'}>
                                        {tx.type === 'PAYMENT' ? '+' : '-'}${tx.amount}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
