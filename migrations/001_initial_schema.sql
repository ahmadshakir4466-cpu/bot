-- ==============================================================================
-- FUTURES LAB: POSTGRESQL & SUPABASE MIGRATION
-- Migration 001: Initial Schema, Indexes, Foreign Keys, and Row Level Security
-- STRICT SECURITY: NO EXCHANGE SECRETS EVER STORED IN DATABASE
-- DEMO ISOLATION: ENVIRONMENT CHECK ENFORCING ONLY EXCHANGE_DEMO / HISTORICAL_BACKTEST
-- ==============================================================================

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles & Roles
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- 2. Connector Devices (Paired local workers)
CREATE TABLE IF NOT EXISTS connector_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    pairing_code TEXT,
    pairing_code_expires_at TIMESTAMPTZ,
    paired_at TIMESTAMPTZ,
    last_heartbeat_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'stale')),
    ip_address TEXT,
    client_version TEXT NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Exchange Connections (METADATA ONLY - NO SECRETS OR KEYS STORED)
CREATE TABLE IF NOT EXISTS exchange_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    broker TEXT NOT NULL DEFAULT 'bitget',
    environment TEXT NOT NULL DEFAULT 'EXCHANGE_DEMO' CHECK (environment = 'EXCHANGE_DEMO'),
    account_uid_masked TEXT NOT NULL,
    account_type TEXT NOT NULL DEFAULT 'UTA_V3_DEMO',
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    balance_usdt NUMERIC(20, 8) DEFAULT 0,
    available_margin_usdt NUMERIC(20, 8) DEFAULT 0,
    position_mode TEXT DEFAULT 'one_way',
    margin_mode TEXT DEFAULT 'isolated',
    last_reconciled_at TIMESTAMPTZ,
    is_stale BOOLEAN NOT NULL DEFAULT FALSE,
    unexplained_exposure_detected BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Strategy Versions
CREATE TABLE IF NOT EXISTS strategy_versions (
    version TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    parameters JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Bots
CREATE TABLE IF NOT EXISTS bots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    strategy_version TEXT NOT NULL REFERENCES strategy_versions(version),
    state TEXT NOT NULL DEFAULT 'STOPPED' CHECK (state IN ('STOPPED', 'RUNNING', 'PAUSED_ENTRIES', 'STOP_AFTER_FLAT', 'HALTED_DAILY_LOSS', 'HALTED_CONSECUTIVE_LOSS', 'EMERGENCY_HALTED')),
    state_reason TEXT NOT NULL DEFAULT 'Initialized',
    daily_trades_count INT NOT NULL DEFAULT 0,
    daily_loss_percent NUMERIC(8, 4) NOT NULL DEFAULT 0,
    consecutive_losses INT NOT NULL DEFAULT 0,
    day_start_equity NUMERIC(20, 8) NOT NULL DEFAULT 0,
    last_day_reset_utc DATE NOT NULL DEFAULT CURRENT_DATE,
    config JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Bot Runs (Durable execution epochs)
CREATE TABLE IF NOT EXISTS bot_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    environment TEXT NOT NULL DEFAULT 'EXCHANGE_DEMO' CHECK (environment IN ('EXCHANGE_DEMO', 'DIAGNOSTIC_DEMO')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    stopped_at TIMESTAMPTZ,
    initial_equity NUMERIC(20, 8) NOT NULL,
    final_equity NUMERIC(20, 8),
    status TEXT NOT NULL DEFAULT 'ACTIVE'
);

-- 7. Durable Commands Outbox
CREATE TABLE IF NOT EXISTS durable_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    device_id UUID REFERENCES connector_devices(id) ON DELETE SET NULL,
    run_id UUID REFERENCES bot_runs(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('START_BOT', 'PAUSE_ENTRIES', 'STOP_AFTER_FLAT', 'EMERGENCY_CLOSE', 'GLOBAL_HALT', 'RUN_DIAGNOSTIC')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'DISPATCHED', 'ACKNOWLEDGED', 'EXECUTED', 'REJECTED', 'EXPIRED')),
    status_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    lease_owner TEXT,
    lease_expires_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ
);

-- 8. Signal Decisions (Transparent why-waiting audit)
CREATE TABLE IF NOT EXISTS signal_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES bot_runs(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    candle_close_time TIMESTAMPTZ NOT NULL,
    close_price NUMERIC(20, 8) NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT', 'HOLD')),
    conditions JSONB NOT NULL,
    indicators JSONB NOT NULL,
    reason TEXT NOT NULL,
    expired BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Order Intents (Pre-execution durable intents)
CREATE TABLE IF NOT EXISTS order_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_oid TEXT NOT NULL UNIQUE,
    run_id UUID NOT NULL REFERENCES bot_runs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
    intended_price NUMERIC(20, 8) NOT NULL,
    stop_price NUMERIC(20, 8) NOT NULL,
    take_profit_price NUMERIC(20, 8) NOT NULL,
    risk_amount_usdt NUMERIC(20, 8) NOT NULL,
    calculated_quantity NUMERIC(20, 8) NOT NULL,
    environment TEXT NOT NULL CHECK (environment IN ('EXCHANGE_DEMO', 'DIAGNOSTIC_DEMO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Exchange Orders
CREATE TABLE IF NOT EXISTS exchange_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_oid TEXT NOT NULL UNIQUE REFERENCES order_intents(client_oid) ON DELETE CASCADE,
    exchange_order_id TEXT,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
    order_type TEXT NOT NULL CHECK (order_type IN ('market', 'limit')),
    reduce_only BOOLEAN NOT NULL DEFAULT FALSE,
    price NUMERIC(20, 8),
    size NUMERIC(20, 8) NOT NULL,
    filled_size NUMERIC(20, 8) NOT NULL DEFAULT 0,
    avg_fill_price NUMERIC(20, 8),
    status TEXT NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'SUBMITTING', 'UNKNOWN', 'ACKNOWLEDGED', 'PARTIALLY_FILLED', 'FILLED', 'CANCEL_PENDING', 'CANCELED', 'REJECTED')),
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Fills
CREATE TABLE IF NOT EXISTS fills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_fill_id TEXT NOT NULL UNIQUE,
    exchange_order_id TEXT NOT NULL,
    client_oid TEXT NOT NULL,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL,
    fill_price NUMERIC(20, 8) NOT NULL,
    fill_size NUMERIC(20, 8) NOT NULL,
    fee NUMERIC(20, 8) NOT NULL DEFAULT 0,
    fee_asset TEXT NOT NULL DEFAULT 'USDT',
    timestamp TIMESTAMPTZ NOT NULL
);

-- 12. Positions (Current active exposure)
CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    hold_side TEXT NOT NULL CHECK (hold_side IN ('long', 'short')),
    total_size NUMERIC(20, 8) NOT NULL,
    available_size NUMERIC(20, 8) NOT NULL,
    average_open_price NUMERIC(20, 8) NOT NULL,
    mark_price NUMERIC(20, 8) NOT NULL,
    unrealized_pnl NUMERIC(20, 8) NOT NULL DEFAULT 0,
    liquidation_price NUMERIC(20, 8),
    leverage INT NOT NULL DEFAULT 2,
    margin_mode TEXT NOT NULL DEFAULT 'isolated',
    entry_time TIMESTAMPTZ NOT NULL,
    bars_held INT NOT NULL DEFAULT 0,
    stop_loss_order_id TEXT,
    stop_loss_price NUMERIC(20, 8),
    take_profit_order_id TEXT,
    take_profit_price NUMERIC(20, 8),
    protection_verified BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Closed Trades (Full trade cycles)
CREATE TABLE IF NOT EXISTS closed_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES bot_runs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    environment TEXT NOT NULL CHECK (environment IN ('EXCHANGE_DEMO', 'DIAGNOSTIC_DEMO')),
    symbol TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
    entry_price NUMERIC(20, 8) NOT NULL,
    exit_price NUMERIC(20, 8) NOT NULL,
    size NUMERIC(20, 8) NOT NULL,
    opened_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ NOT NULL,
    hold_duration_seconds INT NOT NULL,
    hold_bars INT NOT NULL,
    gross_pnl NUMERIC(20, 8) NOT NULL,
    fees_paid NUMERIC(20, 8) NOT NULL,
    funding_paid NUMERIC(20, 8) NOT NULL DEFAULT 0,
    net_pnl NUMERIC(20, 8) NOT NULL,
    return_percent NUMERIC(10, 4) NOT NULL,
    exit_reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'FINALIZED' CHECK (status IN ('FINALIZED', 'PROVISIONAL')),
    provisional_reason TEXT,
    client_oids JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Equity Snapshots
CREATE TABLE IF NOT EXISTS equity_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES bot_runs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    balance NUMERIC(20, 8) NOT NULL,
    unrealized_pnl NUMERIC(20, 8) NOT NULL,
    equity NUMERIC(20, 8) NOT NULL,
    unitized_nav NUMERIC(20, 8) NOT NULL,
    peak_nav NUMERIC(20, 8) NOT NULL,
    drawdown_percent NUMERIC(8, 4) NOT NULL,
    external_cashflow NUMERIC(20, 8) NOT NULL DEFAULT 0
);

-- 15. Execution Events (Append-only audit trail)
CREATE TABLE IF NOT EXISTS execution_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES bot_runs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARN', 'ERROR', 'CRITICAL')),
    category TEXT NOT NULL CHECK (category IN ('AUTH', 'SIGNAL', 'RISK', 'ORDER', 'FILL', 'RECONCILE', 'HEARTBEAT', 'DIAGNOSTIC')),
    symbol TEXT,
    message TEXT NOT NULL,
    details JSONB,
    correlation_id TEXT
);

-- 16. Backtest Runs
CREATE TABLE IF NOT EXISTS backtest_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    config JSONB NOT NULL,
    assumptions JSONB NOT NULL,
    results JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. Showcase Publications (Read-only public demo view)
CREATE TABLE IF NOT EXISTS showcase_publications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES bot_runs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    title TEXT NOT NULL,
    declared_period JSONB NOT NULL,
    allowed_symbols JSONB NOT NULL,
    metrics JSONB NOT NULL,
    recent_anonymized_trades JSONB NOT NULL DEFAULT '[]'::jsonb,
    disclaimer TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR SCALE & SPEED
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_connector_devices_user ON connector_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_exchange_conn_user ON exchange_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_bots_user ON bots(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_runs_bot ON bot_runs(bot_id);
CREATE INDEX IF NOT EXISTS idx_durable_commands_user_status ON durable_commands(user_id, status);
CREATE INDEX IF NOT EXISTS idx_signal_decisions_run ON signal_decisions(run_id, candle_close_time);
CREATE INDEX IF NOT EXISTS idx_closed_trades_run ON closed_trades(run_id, closed_at);
CREATE INDEX IF NOT EXISTS idx_closed_trades_user_env ON closed_trades(user_id, environment);
CREATE INDEX IF NOT EXISTS idx_equity_snapshots_run_time ON equity_snapshots(run_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_execution_events_run_time ON execution_events(run_id, timestamp);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict multi-tenant isolation: Users only see & mutate their own records.
-- Admin role can view audit/system health.
-- Showcase publications with is_published = TRUE are readable publicly without auth.
-- ==============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE connector_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE durable_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE closed_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE backtest_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE showcase_publications ENABLE ROW LEVEL SECURITY;

-- 1. Profiles policy
CREATE POLICY "Users read own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- 2. Connector devices policy
CREATE POLICY "Users own connector devices" ON connector_devices
    FOR ALL USING (auth.uid() = user_id);

-- 3. Exchange connection policy
CREATE POLICY "Users own exchange connection" ON exchange_connections
    FOR ALL USING (auth.uid() = user_id);

-- 4. Bots policy
CREATE POLICY "Users own bots" ON bots
    FOR ALL USING (auth.uid() = user_id);

-- 5. Bot runs policy
CREATE POLICY "Users own bot runs" ON bot_runs
    FOR ALL USING (auth.uid() = user_id);

-- 6. Durable commands policy
CREATE POLICY "Users own commands" ON durable_commands
    FOR ALL USING (auth.uid() = user_id);

-- 7. Closed trades policy
CREATE POLICY "Users own closed trades" ON closed_trades
    FOR ALL USING (auth.uid() = user_id);

-- 8. Equity snapshots policy
CREATE POLICY "Users own snapshots" ON equity_snapshots
    FOR ALL USING (auth.uid() = user_id);

-- 9. Execution events policy
CREATE POLICY "Users own execution events" ON execution_events
    FOR ALL USING (auth.uid() = user_id);

-- 10. Showcase policy (Public read allowed ONLY when is_published = TRUE)
CREATE POLICY "Public read published showcases" ON showcase_publications
    FOR SELECT USING (is_published = TRUE);

CREATE POLICY "Owners manage showcase publications" ON showcase_publications
    FOR ALL USING (auth.uid() = user_id);
