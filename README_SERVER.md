# Financial Cutoff Tracker - Documentación del Servidor

## 📁 Estructura del Proyecto

```
Web TDC Traker/
├── app/
│   └── api/
│       └── transactions/
│           ├── route.ts          # GET - Consultar transacciones
│           └── bulk/
│               └── route.ts      # POST - Carga masiva
├── lib/
│   └── utils/
│       ├── calculateCutoffMonth.ts  # Lógica de mes de corte
│       └── csvParser.ts             # Parseo de archivos CSV
├── types/
│   └── transaction.ts            # Tipos TypeScript
├── database_schema.sql           # Schema de PostgreSQL/Supabase
└── .env.example                  # Variables de entorno
```

## 🔧 Configuración Inicial

### 1. Variables de Entorno

Copia `.env.example` a `.env.local` y completa los valores:

```bash
cp .env.example .env.local
```

Obtén tus credenciales de Supabase desde: https://supabase.com/dashboard

### 2. Base de Datos

Ejecuta el script SQL en Supabase:

1. Ve a tu proyecto en Supabase
2. Navega a **SQL Editor**
3. Copia y pega el contenido de `database_schema.sql`
4. Ejecuta el script

Esto creará:
- ✅ Tablas: `users`, `credit_cards`, `transactions`
- ✅ Row Level Security (RLS) policies
- ✅ Índices optimizados
- ✅ Funciones y vistas auxiliares

## 📚 API Endpoints

### GET `/api/transactions`

Obtiene transacciones de una tarjeta con el mes de corte calculado.

**Query Parameters:**
- `card_id` (requerido): UUID de la tarjeta
- `cutoff_month` (opcional): Filtrar por mes de corte (formato: `YYYY-MM`)
- `limit` (opcional): Número máximo de resultados (default: 100)
- `offset` (opcional): Offset para paginación (default: 0)

**Ejemplo de Request:**
```bash
GET /api/transactions?card_id=123e4567-e89b-12d3-a456-426614174000&cutoff_month=2026-01
```

**Ejemplo de Response:**
```json
{
  "card": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "bank_name": "Banco Ejemplo",
    "last_4_digits": "1234",
    "cutoff_day": 21
  },
  "transactions": [
    {
      "id": "...",
      "card_id": "...",
      "amount": 500.00,
      "date": "2026-01-15",
      "concept": "Supermercado",
      "type": "EXPENSE",
      "cutoff_month": "2026-01"
    }
  ],
  "summary": {
    "total_transactions": 10,
    "total_expenses": 5000.00,
    "total_payments": 2000.00,
    "balance": 3000.00
  },
  "pagination": {
    "limit": 100,
    "offset": 0,
    "returned": 10
  }
}
```

---

### POST `/api/transactions/bulk`

Carga masiva de transacciones.

**Request Body:**
```json
{
  "card_id": "123e4567-e89b-12d3-a456-426614174000",
  "transactions": [
    {
      "date": "2026-01-15",
      "concept": "Supermercado",
      "amount": 500.00,
      "type": "EXPENSE"
    },
    {
      "date": "2026-01-20",
      "concept": "Pago mensual",
      "amount": 1000.00,
      "type": "PAYMENT"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "2 transacciones insertadas correctamente",
  "inserted": 2,
  "failed": 0
}
```

**Response con Errores:**
```json
{
  "success": false,
  "message": "1 transacciones insertadas, 1 fallaron",
  "inserted": 1,
  "failed": 1,
  "errors": [
    {
      "index": 0,
      "transaction": {...},
      "error": "Fecha inválida"
    }
  ]
}
```

## 🛠️ Utilidades

### `calculateCutoffMonth()`

Calcula el mes de corte basado en la lógica de negocio.

```typescript
import { calculateCutoffMonth } from '@/lib/utils/calculateCutoffMonth';

// Ejemplo: Día de corte = 21
calculateCutoffMonth(new Date('2026-01-21'), 21); // '2026-01'
calculateCutoffMonth(new Date('2026-01-22'), 21); // '2026-02'
```

**Regla:**
- Si día de transacción ≤ día de corte → Mes actual
- Si día de transacción > día de corte → Mes siguiente

### `getDaysUntilCutoff()`

Calcula días restantes hasta el próximo corte.

```typescript
import { getDaysUntilCutoff } from '@/lib/utils/calculateCutoffMonth';

getDaysUntilCutoff(21); // Devuelve días hasta el día 21
```

### `getCutoffDateRange()`

Obtiene el rango de fechas de un período de corte.

```typescript
import { getCutoffDateRange } from '@/lib/utils/calculateCutoffMonth';

getCutoffDateRange(21, '2026-01');
// { startDate: 2025-12-22, endDate: 2026-01-21 }
```

### Parseo de CSV

```typescript
import { parseCSVData, validateCSVHeaders } from '@/lib/utils/csvParser';

// Validar encabezados
const { valid, missingHeaders } = validateCSVHeaders(['Fecha', 'Concepto', 'Monto']);

// Parsear datos
const { transactions, errors } = parseCSVData(csvRows);
```

**Formato CSV Esperado:**

| Fecha | Concepto | Monto | Tipo (opcional) |
|-------|----------|-------|-----------------|
| 15/01/2026 | Supermercado | 500.00 | EXPENSE |
| 20/01/2026 | Pago | -1000.00 | PAYMENT |

**Formatos de Fecha Soportados:**
- `DD/MM/YYYY` (15/01/2026)
- `DD-MM-YYYY` (15-01-2026)
- `YYYY-MM-DD` (2026-01-15)

**Formatos de Monto Soportados:**
- Números simples: `500.00`
- Con símbolo de moneda: `$500.00`
- Con separadores de miles: `1,500.00`
- Negativos para pagos: `-500.00`

## 🔒 Seguridad (RLS)

Todas las tablas tienen Row Level Security habilitado:

- **users**: Los usuarios solo pueden ver/editar su propio perfil
- **credit_cards**: Los usuarios solo pueden gestionar sus propias tarjetas
- **transactions**: Los usuarios solo pueden ver transacciones de sus tarjetas

Las políticas RLS están configuradas automáticamente en el schema SQL.

## 📝 Tipos TypeScript

### `Transaction`
```typescript
interface Transaction {
  id: string;
  card_id: string;
  amount: number;
  date: string; // ISO date
  concept: string;
  type: 'EXPENSE' | 'PAYMENT';
  created_at?: string;
  updated_at?: string;
}
```

### `TransactionWithCutoff`
```typescript
interface TransactionWithCutoff extends Transaction {
  cutoff_month: string; // formato 'YYYY-MM'
  user_id: string;
  bank_name: string;
  last_4_digits: string;
  cutoff_day: number;
}
```

## 🧪 Pruebas Sugeridas

### 1. Probar el Cálculo de Mes de Corte
```typescript
// Caso 1: Transacción antes del corte
console.log(calculateCutoffMonth('2026-01-15', 21)); // '2026-01' ✓

// Caso 2: Transacción el día del corte
console.log(calculateCutoffMonth('2026-01-21', 21)); // '2026-01' ✓

// Caso 3: Transacción después del corte
console.log(calculateCutoffMonth('2026-01-22', 21)); // '2026-02' ✓
```

### 2. Probar Bulk Upload
```bash
curl -X POST http://localhost:3000/api/transactions/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "card_id": "tu-card-id",
    "transactions": [
      {
        "date": "2026-01-15",
        "concept": "Test",
        "amount": 100.00,
        "type": "EXPENSE"
      }
    ]
  }'
```

### 3. Probar Query de Transacciones
```bash
curl "http://localhost:3000/api/transactions?card_id=tu-card-id&cutoff_month=2026-01"
```

## 🚀 Próximos Pasos

1. **Frontend**: Crear componentes React para:
   - Dashboard con KPIs
   - Gráfico Waterfall (usando Recharts)
   - Formulario de importación CSV
   - Lista de transacciones

2. **Funcionalidades Adicionales**:
   - Endpoint para obtener resumen por mes de corte
   - Endpoint para calcular "días hasta el corte"
   - WebSocket para actualizaciones en tiempo real

3. **Optimizaciones**:
   - Caché de consultas frecuentes
   - Compresión de respuestas
   - Rate limiting

## 📖 Referencias

- [Next.js App Router](https://nextjs.org/docs/app)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [TypeScript](https://www.typescriptlang.org/)
