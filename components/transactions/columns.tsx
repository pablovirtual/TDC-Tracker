'use client';

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate } from "@/lib/utils/formatting";
import { deleteTransaction, updateTransaction } from "@/app/actions/transaction-actions";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Tipo de dato basado en la tabla transactions
export type Transaction = {
    id: string;
    date: string;
    concept: string;
    amount: number;
    type: 'EXPENSE' | 'PAYMENT';
    category: string | null;
    cutoff_month: string | null;
    // Nota: cutoff_month no está en la BD, lo calculamos o lo traemos si es view.
    // Si viene de raw table, lo calcularemos al vuelo o en el query.
    // Asumiremos que el backend/page lo calcula y lo pasa, o que calculamos aqui.
    card: { alias: string; bank: string } | null; // Join info
};

export const columns: ColumnDef<Transaction>[] = [
    {
        accessorKey: "date",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Fecha
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => formatDate(row.getValue("date")),
    },
    {
        accessorKey: "concept",
        header: "Concepto",
    },
    {
        accessorKey: "amount",
        header: ({ column }) => (
            <div className="text-right">Monto</div>
        ),
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("amount"));
            const type = row.original.type;
            const formatted = formatCurrency(amount);

            return <div className={`text-right font-medium ${type === 'PAYMENT' ? 'text-green-600' : 'text-red-600'}`}>
                {type === 'PAYMENT' ? '+' : '-'}{formatted}
            </div>
        },
    },
    {
        accessorKey: "category",
        header: "Categoría",
        cell: ({ row }) => row.getValue("category") || "Sin categoría",
    },
    {
        accessorKey: "cutoff_month", // Si decidimos pasarlo pre-calculado
        header: "Mes Corte",
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id));
        },
    },
    {
        // Columna para info de tarjeta
        accessorFn: (row) => row.card?.alias,
        header: "Tarjeta",
        id: "card_alias"
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const transaction = row.original;
            const [isEditOpen, setIsEditOpen] = useState(false);

            // Función de borrado
            const handleDelete = async () => {
                if (confirm("¿Estás seguro de eliminar esta transacción?")) {
                    await deleteTransaction(transaction.id);
                }
            };

            const EditDialog = () => {
                const [concept, setConcept] = useState(transaction.concept);
                const [category, setCategory] = useState(transaction.category || "");
                const [isSaving, setIsSaving] = useState(false);

                const handleSave = async () => {
                    setIsSaving(true);
                    try {
                        await updateTransaction(transaction.id, { concept, category });
                        setIsEditOpen(false);
                    } catch (e) {
                        alert("Error al actualizar");
                    } finally {
                        setIsSaving(false);
                    }
                }

                return (
                    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Editar Transacción</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Concepto</Label>
                                    <Input
                                        value={concept}
                                        onChange={(e) => setConcept(e.target.value)}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Categoría</Label>
                                    <Input
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        placeholder="Ej: Comida, Servicios..."
                                        className="col-span-3"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleSave} disabled={isSaving}>Guardar</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )
            }

            return (
                <>
                    <EditDialog />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menú</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
                                Eliminar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </>
            );
        },
    },
];
