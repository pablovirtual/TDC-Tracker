import { calculateCutoffMonth } from '../lib/utils';

describe('calculateCutoffMonth', () => {
    // Caso de prueba sugerido por el usuario
    it('debería asignar el mes actual si la fecha es menor o igual al día de corte', () => {
        const cutoffDay = 21;
        // 21 de Enero (<= 21) -> Enero
        const result = calculateCutoffMonth('2026-01-21', cutoffDay);
        expect(result).toBe('2026-01');
    });

    // Caso de prueba sugerido por el usuario
    it('debería asignar el mes siguiente si la fecha es mayor al día de corte', () => {
        const cutoffDay = 21;
        // 22 de Enero (> 21) -> Febrero
        const result = calculateCutoffMonth('2026-01-22', cutoffDay);
        expect(result).toBe('2026-02');
    });

    // Casos extremos
    it('debería manejar correctamente el cambio de año', () => {
        const cutoffDay = 21;
        // 22 de Diciembre 2025 -> Enero 2026
        const result = calculateCutoffMonth('2025-12-22', cutoffDay);
        expect(result).toBe('2026-01');
    });

    it('debería manejar fechas muy tempranas en el mes', () => {
        const cutoffDay = 21;
        // 1 de Enero -> Enero
        const result = calculateCutoffMonth('2026-01-01', cutoffDay);
        expect(result).toBe('2026-01');
    });

    it('debería lanzar error con día de corte inválido', () => {
        expect(() => calculateCutoffMonth('2026-01-15', 32)).toThrow();
        expect(() => calculateCutoffMonth('2026-01-15', 0)).toThrow();
    });

    it('debería lanzar error con fecha inválida', () => {
        expect(() => calculateCutoffMonth('invalid-date', 21)).toThrow();
    });
});
