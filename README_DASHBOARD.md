# Financial Cutoff Tracker - Dashboard Setup Guide

## 🚀 Instalación

### 1. Instalar Dependencias

```bash
npm install
```

Esto instalará:
- **Next.js 14** - Framework React
- **Supabase Client** - Para autenticación y base de datos
- **Tailwind CSS** - Framework de estilos
- **clsx & tailwind-merge** - Utilidades para Shadcn/UI
- **Recharts** - Para gráficos (preparado para futuras funcionalidades)

### 2. Configurar Variables de Entorno

Copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Edita `.env.local` y agrega tus credenciales de Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### 3. Configurar la Base de Datos

1. Ve a tu proyecto en Supabase
2. Navega a **SQL Editor**
3. Ejecuta el script en `database_schema.sql`

### 4. Ejecutar el Proyecto

```bash
npm run dev
```

Abre tu navegador en: http://localhost:3000/dashboard

## 📊 Estructura del Dashboard

### Componentes Creados

```
app/
├── dashboard/
│   └── page.tsx              # Página principal del dashboard
├── api/
│   └── transactions/
│       ├── route.ts          # GET transacciones
│       └── bulk/route.ts     # POST bulk upload
└── globals.css               # Estilos globales de Tailwind

components/
└── ui/
    ├── card.tsx              # Componente Card (Shadcn/UI)
    └── table.tsx             # Componente Table (Shadcn/UI)

hooks/
└── useDashboardData.ts       # Hook para fetching de datos

lib/
└── utils/
    ├── calculateCutoffMonth.ts   # Lógica de mes de corte
    ├── csvParser.ts              # Parseo de CSV
    ├── formatting.ts             # Formateadores de moneda/fechas
    └── cn.ts                     # Utility para clsx
```

## 🎨 Características del Dashboard

### 1. Tarjetas KPI

El dashboard muestra 3 tarjetas principales:

#### 📊 Saldo Real Total
- Suma todos los gastos históricos
- Resta todos los pagos históricos
- Resultado = Deuda real actual
- Color: Azul

#### 📈 Total Gastos
- Suma de todos los cargos (EXPENSE)
- Color: Rojo

#### 💰 Total Pagos
- Suma de todos los abonos (PAYMENT)
- Color: Verde

### 2. Tabla de Períodos de Corte

Agrupa las transacciones por `cutoff_month` usando la lógica del día 21:

**Columnas:**
- **Mes de Corte**: Formato legible (ej: "Enero 2026")
- **Total Gasto**: Suma de gastos del período (rojo)
- **Total Pagos**: Suma de pagos del período (verde)
- **Saldo del Periodo**: Balance del período (rojo si es positivo, verde si es negativo)
- **Transacciones**: Número de transacciones

**Características:**
- Ordenada por mes más reciente primero
- Fila de totales al final (TableFooter)
- Colores según el tipo de transacción
- Responsive design

### 3. Estados de UI

#### Estado Inicial
- Muestra input para ingresar Card ID
- Placeholder para futuro selector de tarjetas

#### Estado de Carga
- Spinner animado
- Mensaje "Cargando datos..."

#### Estado de Error
- Card rojo con mensaje de error
- Manejo de errores de API

#### Estado con Datos
- Despliega KPIs y tabla
- Nota informativa sobre la lógica de corte

## 🔧 Cómo Usar

### Opción 1: Con Card ID Manual

1. Ve a `/dashboard`
2. Ingresa un `card_id` (UUID) en el input
3. El dashboard cargará automáticamente los datos

### Opción 2 (Futuro): Selector de Tarjetas

```typescript
// TODO: Implementar selector de tarjetas del usuario
// Ejemplo de integración:
const { data: cards } = await supabase
  .from('credit_cards')
  .select('*')
  .eq('user_id', user.id);
```

## 📝 Lógica de Negocio

### Regla del Día de Corte (Día 21)

```
Si día de transacción <= 21  →  Mes actual
Si día de transacción > 21   →  Mes siguiente
```

**Ejemplos:**
- 15 de Enero → Corte de Enero
- 21 de Enero → Corte de Enero
- 22 de Enero → Corte de Febrero
- 31 de Enero → Corte de Febrero

Esta lógica está implementada en:
- **Backend**: `lib/utils/calculateCutoffMonth.ts`
- **Base de datos**: Función SQL `calculate_cutoff_month()`
- **API**: Los endpoints calculan `cutoff_month` automáticamente

## 🎯 Próximos Pasos

### Mejoras Recomendadas

1. **Selector de Tarjetas**
   - Dropdown para seleccionar entre las tarjetas del usuario
   - Guardar selección en localStorage

2. **Gráfico Waterfall**
   - Implementar con Recharts (ya instalado)
   - Mostrar cómo suben gastos y bajan pagos

3. **Filtros y Búsqueda**
   - Filtrar por rango de fechas
   - Buscar por concepto
   - Filtrar por tipo de transacción

4. **Detalles de Período**
   - Click en fila → Ver transacciones del período
   - Modal o página de detalle

5. **Exportación**
   - Exportar tabla a CSV/Excel
   - Generar PDF de reporte

6. **Métricas Adicionales**
   - "Días para el Corte"
   - "Promedio de Gasto Mensual"
   - "Uso de Crédito (%)"

## 🐛 Troubleshooting

### Error: "No autenticado"
- Verifica que las variables de entorno de Supabase estén configuradas
- Asegúrate de tener una sesión activa

### Error: "Tarjeta no encontrada"
- Verifica que el `card_id` sea válido
- Asegúrate de que la tarjeta pertenezca al usuario autenticado

### Los datos no se actualizan
- Revisa la consola del navegador para errores
- Verifica que el endpoint `/api/transactions` esté funcionando

### Estilos no se aplican
- Ejecuta `npm install` para instalar Tailwind CSS
- Verifica que `globals.css` esté importado en el layout

## 📚 Referencias

- [Shadcn/UI Documentation](https://ui.shadcn.com/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase Client](https://supabase.com/docs/reference/javascript)
