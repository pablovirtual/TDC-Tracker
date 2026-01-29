'use client';

import * as React from "react";
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
}

export function DataTable<TData, TValue>({
    columns,
    data,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            sorting,
            columnFilters,
        },
        initialState: {
            pagination: {
                pageSize: 10,
            }
        }
    });

    // Extraer valores únicos para el filtro de Categoría
    const categories = React.useMemo(() => {
        // @ts-ignore - asumimos que data tiene category
        const unique = new Set(data.map(item => item.category).filter(Boolean));
        return Array.from(unique) as string[];
    }, [data]);

    // Extraer valores únicos para el filtro de Mes de Corte
    const months = React.useMemo(() => {
        // @ts-ignore - asumimos que data tiene cutoff_month
        const unique = new Set(data.map(item => item.cutoff_month).filter(Boolean));
        return Array.from(unique) as string[];
    }, [data]);

    return (
        <div>
            {/* Filtros */}
            <div className="flex items-center py-4 gap-4 flex-wrap">
                {/* Buscador Global (Concepto) */}
                <Input
                    placeholder="Filtrar concepto..."
                    value={(table.getColumn("concept")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("concept")?.setFilterValue(event.target.value)
                    }
                    className="max-w-sm"
                />

                {/* Filtro Categoría */}
                <div className="w-[180px]">
                    <Select
                        value={(table.getColumn("category")?.getFilterValue() as string) || "all"}
                        onValueChange={(value) => table.getColumn("category")?.setFilterValue(value === "all" ? "" : value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Categoría" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {categories.map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Filtro Mes de Corte */}
                <div className="w-[180px]">
                    <Select
                        value={(table.getColumn("cutoff_month")?.getFilterValue() as string) || "all"}
                        onValueChange={(value) => table.getColumn("cutoff_month")?.setFilterValue(value === "all" ? "" : value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Mes de Corte" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {months.map((m) => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Reset */}
                {(table.getState().columnFilters.length > 0) && (
                    <Button
                        variant="ghost"
                        onClick={() => table.resetColumnFilters()}
                        className="h-8 px-2 lg:px-3"
                    >
                        Resetear
                        <X className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Tabla */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No hay resultados.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Paginación */}
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    Anterior
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    Siguiente
                </Button>
            </div>
        </div>
    );
}
