'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
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
import { createCard } from '@/app/actions/card-actions';

interface AddCardModalProps {
    children?: React.ReactNode; // Para el botón trigger
}

export default function AddCardModal({ children }: AddCardModalProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(event.currentTarget);

        try {
            await createCard(formData);
            setOpen(false); // Cerrar modal al éxito
        } catch (e) {
            setError(e instanceof Error ? e.message : "Error al crear la tarjeta");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || <Button>Agregar Tarjeta</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={onSubmit}>
                    <DialogHeader>
                        <DialogTitle>Agregar Tarjeta de Crédito</DialogTitle>
                        <DialogDescription>
                            Ingresa los detalles de tu tarjeta para comenzar a monitorearla.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="alias" className="text-right">
                                Alias
                            </Label>
                            <Input
                                id="alias"
                                name="alias"
                                placeholder="Ej: Nu Bank"
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="bank" className="text-right">
                                Banco
                            </Label>
                            <Input
                                id="bank"
                                name="bank"
                                placeholder="Ej: Nu"
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="last4" className="text-right">
                                Terminación
                            </Label>
                            <Input
                                id="last4"
                                name="last4"
                                placeholder="1234"
                                maxLength={4}
                                pattern="\d{4}"
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="cutoff_day" className="text-right">
                                Día Corte
                            </Label>
                            <Input
                                id="cutoff_day"
                                name="cutoff_day"
                                type="number"
                                min={1}
                                max={31}
                                defaultValue={21}
                                className="col-span-3"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm mb-4">
                            {error}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Guardando..." : "Guardar Tarjeta"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
