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
 * 
 * @example
 * // Día de corte: 21
 * calculateCutoffMonth(new Date('2026-01-21'), 21) // '2026-01'
 * calculateCutoffMonth(new Date('2026-01-22'), 21) // '2026-02'
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
  const date = typeof transactionDate === 'string' 
    ? new Date(transactionDate) 
    : transactionDate;

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

/**
 * Calcula los días restantes hasta el próximo corte
 * 
 * @param cutoffDay - Día de corte de la tarjeta (1-31)
 * @param currentDate - Fecha actual (opcional, por defecto es hoy)
 * @returns Número de días hasta el próximo corte
 */
export function getDaysUntilCutoff(
  cutoffDay: number,
  currentDate: Date = new Date()
): number {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const day = currentDate.getDate();

  let nextCutoffDate: Date;

  if (day <= cutoffDay) {
    // El corte es en el mes actual
    nextCutoffDate = new Date(year, month, cutoffDay);
  } else {
    // El corte es en el mes siguiente
    nextCutoffDate = new Date(year, month + 1, cutoffDay);
  }

  // Calcular diferencia en milisegundos y convertir a días
  const diffTime = nextCutoffDate.getTime() - currentDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Obtiene el rango de fechas para un mes de corte específico
 * 
 * @param cutoffDay - Día de corte de la tarjeta
 * @param cutoffMonth - Mes de corte en formato 'YYYY-MM'
 * @returns Objeto con las fechas de inicio y fin del período de corte
 */
export function getCutoffDateRange(
  cutoffDay: number,
  cutoffMonth: string
): { startDate: Date; endDate: Date } {
  const [year, month] = cutoffMonth.split('-').map(Number);

  // El mes de corte va desde el día (cutoffDay + 1) del mes anterior
  // hasta el día cutoffDay del mes indicado
  const startDate = new Date(year, month - 2, cutoffDay + 1);
  const endDate = new Date(year, month - 1, cutoffDay);

  return { startDate, endDate };
}
