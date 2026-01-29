# ESPECIFICACIONES DEL PROYECTO: FINANCIAL CUTOFF TRACKER

## 1. Visión General
Estamos construyendo una aplicación web para la gestión de tarjetas de crédito que se diferencia por manejar "Ciclos de Corte" (Cutoff Cycles) en lugar de meses naturales. El objetivo es que los usuarios visualicen su deuda real basada en su fecha de corte bancaria.

## 2. Stack Tecnológico Preferido
- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Shadcn/UI (para componentes).
- **Gráficos:** Recharts (para Waterfall y Treemaps).
- **Backend:** Next.js Server Actions / API Routes.
- **Base de Datos:** PostgreSQL (vía Supabase o Prisma ORM).
- **Auth:** Supabase Auth o NextAuth.

## 3. La Lógica de Negocio (CRÍTICA)
El núcleo de la aplicación es el cálculo del "Mes de Corte".
No usamos el mes calendario (1-30). Usamos una regla de corte dinámica.

**Regla del Día de Corte (Ejemplo: Día 21):**
- Si la fecha de la transacción es <= 21, pertenece al mes actual.
- Si la fecha de la transacción es > 21, pertenece al mes siguiente.

*Ejemplo:*
- 21 de Enero -> Corte Enero.
- 22 de Enero -> Corte Febrero.

## 4. Estructura de Datos (Schema)
Necesitamos las siguientes tablas relacionales:

1.  **Users:** id, email, created_at.
2.  **CreditCards:**
    - id, user_id (FK), bank_name, last_4_digits, cutoff_day (INT, default 21).
3.  **Transactions:**
    - id, card_id (FK), amount (Decimal), date (Date), concept (String), type (ENUM: 'EXPENSE', 'PAYMENT').
    - *Campo Calculado Virtual:* `cutoff_month` (basado en la fecha y el cutoff_day de la tarjeta).

## 5. Requerimientos Funcionales
- Dashboard principal con KPI cards: "Saldo Real Total", "Gasto al Corte Actual", "Días para el Corte".
- Gráfico de Cascada (Waterfall) mostrando cómo los gastos suben la deuda y los pagos la bajan.
- Importación de CSV: Debe permitir subir archivos con columnas `Fecha`, `Concepto`, `Monto`.