-- =====================================================
-- FINANCIAL CUTOFF TRACKER - PostgreSQL Database Schema
-- For Supabase (PostgreSQL)
-- =====================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TABLA: users
-- =====================================================
-- Nota: Si usas Supabase Auth, esta tabla se crea automáticamente como auth.users
-- Esta tabla es para datos adicionales del usuario (perfil extendido)
-- Si usas Supabase Auth, considera usar una tabla "profiles" en su lugar
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas por email
CREATE INDEX idx_users_email ON users(email);

-- =====================================================
-- 2. TABLA: credit_cards
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL,
    last_4_digits VARCHAR(4) NOT NULL CHECK (last_4_digits ~ '^[0-9]{4}$'),
    cutoff_day INTEGER NOT NULL DEFAULT 21 CHECK (cutoff_day >= 1 AND cutoff_day <= 31),
    credit_limit DECIMAL(12, 2) DEFAULT 0.00,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas por usuario
CREATE INDEX idx_credit_cards_user_id ON credit_cards(user_id);

-- Índice compuesto para búsquedas de tarjetas activas por usuario
CREATE INDEX idx_credit_cards_user_active ON credit_cards(user_id, active) WHERE active = TRUE;

-- =====================================================
-- 3. TABLA: transactions
-- =====================================================
-- Tipo ENUM para el tipo de transacción
CREATE TYPE transaction_type AS ENUM ('EXPENSE', 'PAYMENT');

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL,
    concept VARCHAR(255) NOT NULL,
    type transaction_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice en el campo date para optimizar consultas (REQUERIMIENTO ESPECÍFICO)
CREATE INDEX idx_transactions_date ON transactions(date);

-- Índice para búsquedas por tarjeta
CREATE INDEX idx_transactions_card_id ON transactions(card_id);

-- Índice compuesto para consultas frecuentes (tarjeta + fecha)
CREATE INDEX idx_transactions_card_date ON transactions(card_id, date DESC);

-- Índice para filtrar por tipo de transacción
CREATE INDEX idx_transactions_type ON transactions(type);

-- =====================================================
-- 4. FUNCIÓN: Calcular el mes de corte (cutoff_month)
-- =====================================================
-- Esta función calcula el mes de corte basado en la fecha de transacción
-- y el día de corte de la tarjeta
CREATE OR REPLACE FUNCTION calculate_cutoff_month(
    transaction_date DATE,
    cutoff_day INTEGER
) RETURNS DATE AS $$
DECLARE
    transaction_day INTEGER;
    cutoff_month DATE;
BEGIN
    transaction_day := EXTRACT(DAY FROM transaction_date);
    
    -- Si el día de la transacción es <= al día de corte, pertenece al mes actual
    IF transaction_day <= cutoff_day THEN
        cutoff_month := DATE_TRUNC('month', transaction_date)::DATE;
    ELSE
        -- Si el día de la transacción es > al día de corte, pertenece al mes siguiente
        cutoff_month := (DATE_TRUNC('month', transaction_date) + INTERVAL '1 month')::DATE;
    END IF;
    
    RETURN cutoff_month;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 5. VISTA: transactions_with_cutoff
-- =====================================================
-- Vista que incluye el mes de corte calculado para cada transacción
CREATE OR REPLACE VIEW transactions_with_cutoff AS
SELECT 
    t.id,
    t.card_id,
    t.amount,
    t.date,
    t.concept,
    t.type,
    t.created_at,
    t.updated_at,
    cc.user_id,
    cc.bank_name,
    cc.last_4_digits,
    cc.cutoff_day,
    calculate_cutoff_month(t.date, cc.cutoff_day) AS cutoff_month
FROM transactions t
JOIN credit_cards cc ON t.card_id = cc.id;

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6.1. Políticas RLS para USERS
-- =====================================================

-- Los usuarios solo pueden ver su propio perfil
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT
    USING (auth.uid() = id);

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE
    USING (auth.uid() = id);

-- Los usuarios pueden insertar su propio perfil
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- =====================================================
-- 6.2. Políticas RLS para CREDIT_CARDS
-- =====================================================

-- Los usuarios solo pueden ver sus propias tarjetas
CREATE POLICY "Users can view own credit cards" ON credit_cards
    FOR SELECT
    USING (auth.uid() = user_id);

-- Los usuarios pueden crear sus propias tarjetas
CREATE POLICY "Users can insert own credit cards" ON credit_cards
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizar sus propias tarjetas
CREATE POLICY "Users can update own credit cards" ON credit_cards
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Los usuarios pueden eliminar sus propias tarjetas
CREATE POLICY "Users can delete own credit cards" ON credit_cards
    FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- 6.3. Políticas RLS para TRANSACTIONS
-- =====================================================

-- Los usuarios solo pueden ver transacciones de sus propias tarjetas
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM credit_cards 
            WHERE credit_cards.id = transactions.card_id 
            AND credit_cards.user_id = auth.uid()
        )
    );

-- Los usuarios pueden crear transacciones solo en sus propias tarjetas
CREATE POLICY "Users can insert own transactions" ON transactions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM credit_cards 
            WHERE credit_cards.id = transactions.card_id 
            AND credit_cards.user_id = auth.uid()
        )
    );

-- Los usuarios pueden actualizar transacciones solo de sus propias tarjetas
CREATE POLICY "Users can update own transactions" ON transactions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM credit_cards 
            WHERE credit_cards.id = transactions.card_id 
            AND credit_cards.user_id = auth.uid()
        )
    );

-- Los usuarios pueden eliminar transacciones solo de sus propias tarjetas
CREATE POLICY "Users can delete own transactions" ON transactions
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM credit_cards 
            WHERE credit_cards.id = transactions.card_id 
            AND credit_cards.user_id = auth.uid()
        )
    );

-- =====================================================
-- 7. TRIGGERS para actualizar updated_at automáticamente
-- =====================================================

-- Función para actualizar el campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para users
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para credit_cards
CREATE TRIGGER update_credit_cards_updated_at
    BEFORE UPDATE ON credit_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para transactions
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. FUNCIONES ÚTILES
-- =====================================================

-- Función para obtener el saldo actual de una tarjeta
CREATE OR REPLACE FUNCTION get_card_balance(p_card_id UUID)
RETURNS DECIMAL(12, 2) AS $$
DECLARE
    total_expenses DECIMAL(12, 2);
    total_payments DECIMAL(12, 2);
    balance DECIMAL(12, 2);
BEGIN
    -- Sumar todos los gastos
    SELECT COALESCE(SUM(amount), 0) INTO total_expenses
    FROM transactions
    WHERE card_id = p_card_id AND type = 'EXPENSE';
    
    -- Sumar todos los pagos
    SELECT COALESCE(SUM(amount), 0) INTO total_payments
    FROM transactions
    WHERE card_id = p_card_id AND type = 'PAYMENT';
    
    -- El saldo es: gastos - pagos
    balance := total_expenses - total_payments;
    
    RETURN balance;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener el saldo del corte actual
CREATE OR REPLACE FUNCTION get_current_cutoff_balance(p_card_id UUID)
RETURNS DECIMAL(12, 2) AS $$
DECLARE
    v_cutoff_day INTEGER;
    v_current_cutoff_month DATE;
    total_expenses DECIMAL(12, 2);
    total_payments DECIMAL(12, 2);
    balance DECIMAL(12, 2);
BEGIN
    -- Obtener el día de corte de la tarjeta
    SELECT cutoff_day INTO v_cutoff_day
    FROM credit_cards
    WHERE id = p_card_id;
    
    -- Calcular el mes de corte actual
    v_current_cutoff_month := calculate_cutoff_month(CURRENT_DATE, v_cutoff_day);
    
    -- Sumar gastos del corte actual
    SELECT COALESCE(SUM(amount), 0) INTO total_expenses
    FROM transactions t
    JOIN credit_cards cc ON t.card_id = cc.id
    WHERE t.card_id = p_card_id 
    AND t.type = 'EXPENSE'
    AND calculate_cutoff_month(t.date, cc.cutoff_day) = v_current_cutoff_month;
    
    -- Sumar pagos del corte actual
    SELECT COALESCE(SUM(amount), 0) INTO total_payments
    FROM transactions t
    JOIN credit_cards cc ON t.card_id = cc.id
    WHERE t.card_id = p_card_id 
    AND t.type = 'PAYMENT'
    AND calculate_cutoff_month(t.date, cc.cutoff_day) = v_current_cutoff_month;
    
    -- El saldo del corte actual es: gastos - pagos
    balance := total_expenses - total_payments;
    
    RETURN balance;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. DATOS DE EJEMPLO (OPCIONAL - Comentados)
-- =====================================================

/*
-- Insertar usuario de ejemplo
INSERT INTO users (id, email) VALUES 
    ('123e4567-e89b-12d3-a456-426614174000', 'usuario@ejemplo.com');

-- Insertar tarjeta de ejemplo
INSERT INTO credit_cards (id, user_id, bank_name, last_4_digits, cutoff_day, credit_limit) VALUES 
    ('223e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174000', 'Banco Ejemplo', '1234', 21, 50000.00);

-- Insertar transacciones de ejemplo
INSERT INTO transactions (card_id, amount, date, concept, type) VALUES 
    ('223e4567-e89b-12d3-a456-426614174000', 500.00, '2026-01-15', 'Compra en supermercado', 'EXPENSE'),
    ('223e4567-e89b-12d3-a456-426614174000', 1000.00, '2026-01-20', 'Pago de supermercado', 'PAYMENT'),
    ('223e4567-e89b-12d3-a456-426614174000', 750.00, '2026-01-25', 'Compra en tienda', 'EXPENSE');
*/

-- =====================================================
-- FIN DEL SCHEMA
-- =====================================================
