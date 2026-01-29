'use client';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { formatCurrency, formatCutoffMonth } from '@/lib/utils/formatting';
import type { CutoffPeriodSummary } from '@/hooks/useDashboardData';

interface WaterfallDataPoint {
    name: string; // Nombre del mes de corte formateado
    value: number; // Cambio en el saldo (positivo o negativo)
    start: number; // Punto de inicio de la barra
    end: number; // Punto final de la barra
    isTotal: boolean; // True si es la barra de total acumulado
    color: string; // Color de la barra
}

interface WaterfallChartProps {
    data: CutoffPeriodSummary[];
}

/**
 * Componente Waterfall Chart para visualizar la evolución del saldo
 * 
 * - Eje X: Meses de corte
 * - Barras rojas: Saldo aumenta (gasto > pago)
 * - Barras verdes: Saldo disminuye (pago > gasto)
 * - Última barra: Total acumulado
 */
export default function WaterfallChart({ data }: WaterfallChartProps) {
    // Ordenar datos por mes (más antiguo primero para el waterfall)
    const sortedData = [...data].sort((a, b) =>
        a.cutoff_month.localeCompare(b.cutoff_month)
    );

    // Transformar datos para formato waterfall
    const waterfallData = transformToWaterfallData(sortedData);

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload as WaterfallDataPoint;

            return (
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-semibold text-gray-900 mb-2">{data.name}</p>
                    {data.isTotal ? (
                        <p className="text-sm text-gray-600">
                            <span className="font-medium">Total Acumulado:</span>{' '}
                            <span className={data.value > 0 ? 'text-red-600' : 'text-green-600'}>
                                {formatCurrency(data.value)}
                            </span>
                        </p>
                    ) : (
                        <>
                            <p className="text-sm text-gray-600">
                                <span className="font-medium">Cambio:</span>{' '}
                                <span className={data.value > 0 ? 'text-red-600' : 'text-green-600'}>
                                    {data.value > 0 ? '+' : ''}{formatCurrency(data.value)}
                                </span>
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                Saldo: {formatCurrency(data.start)} → {formatCurrency(data.end)}
                            </p>
                        </>
                    )}
                </div>
            );
        }
        return null;
    };

    // Formatear etiquetas del eje Y
    const formatYAxis = (value: number) => {
        return formatCurrency(value);
    };

    if (waterfallData.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                <p>No hay datos suficientes para mostrar el gráfico</p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart
                data={waterfallData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                />
                <YAxis
                    tickFormatter={formatYAxis}
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    content={() => (
                        <div className="flex justify-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-red-500 rounded"></div>
                                <span>Saldo Aumenta</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-green-500 rounded"></div>
                                <span>Saldo Disminuye</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-blue-600 rounded"></div>
                                <span>Total Acumulado</span>
                            </div>
                        </div>
                    )}
                />

                {/* Barras invisibles para el offset (start) */}
                <Bar dataKey="start" stackId="a" fill="transparent" />

                {/* Barras visibles con el cambio de valor */}
                <Bar dataKey="value" stackId="a" radius={[4, 4, 0, 0]}>
                    {waterfallData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

/**
 * Transforma los datos de períodos de corte a formato waterfall
 */
function transformToWaterfallData(
    periods: CutoffPeriodSummary[]
): WaterfallDataPoint[] {
    const waterfallData: WaterfallDataPoint[] = [];
    let runningTotal = 0;

    // Procesar cada período
    periods.forEach((period) => {
        const periodBalance = period.balance; // Ya es (gastos - pagos)
        const startValue = runningTotal;
        const endValue = runningTotal + periodBalance;

        // Determinar color basado en si el saldo sube (rojo) o baja (verde)
        const isIncrease = periodBalance > 0;
        const color = isIncrease ? '#ef4444' : '#22c55e'; // red-500 : green-500

        waterfallData.push({
            name: formatCutoffMonth(period.cutoff_month),
            value: periodBalance,
            start: Math.min(startValue, endValue),
            end: Math.max(startValue, endValue),
            isTotal: false,
            color,
        });

        runningTotal = endValue;
    });

    // Agregar barra de total acumulado al final
    if (periods.length > 0) {
        waterfallData.push({
            name: 'Total Acumulado',
            value: runningTotal,
            start: 0,
            end: runningTotal,
            isTotal: true,
            color: '#2563eb', // blue-600
        });
    }

    return waterfallData;
}
