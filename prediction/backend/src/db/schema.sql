-- Prediction Market Database Schema

-- Users (simplified for MVP)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    balance REAL DEFAULT 1000.0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Market Templates
CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    resolution_source TEXT NOT NULL,
    resolution_logic TEXT NOT NULL,
    default_duration_hours INTEGER DEFAULT 24
);

-- Markets
CREATE TABLE IF NOT EXISTS markets (
    id TEXT PRIMARY KEY,
    template_id TEXT REFERENCES templates(id),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    resolution_source TEXT NOT NULL,
    resolution_criteria TEXT NOT NULL,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    closes_at TEXT NOT NULL,
    resolved_at TEXT,
    outcome TEXT,
    total_yes_shares REAL DEFAULT 0,
    total_no_shares REAL DEFAULT 0,
    liquidity_pool REAL DEFAULT 100,
    status TEXT DEFAULT 'open'
);

-- Positions
CREATE TABLE IF NOT EXISTS positions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    market_id TEXT REFERENCES markets(id),
    position_type TEXT NOT NULL,
    shares REAL NOT NULL,
    avg_price REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, market_id, position_type)
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    market_id TEXT REFERENCES markets(id),
    type TEXT NOT NULL,
    position_type TEXT NOT NULL,
    shares REAL NOT NULL,
    price_per_share REAL NOT NULL,
    total_cost REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Resolutions (proof data)
CREATE TABLE IF NOT EXISTS resolutions (
    id TEXT PRIMARY KEY,
    market_id TEXT REFERENCES markets(id) UNIQUE,
    outcome TEXT NOT NULL,
    resolved_at TEXT DEFAULT CURRENT_TIMESTAMP,
    source_url TEXT NOT NULL,
    source_response TEXT NOT NULL,
    calculation_steps TEXT NOT NULL,
    final_value TEXT,
    resolved_by TEXT DEFAULT 'auto'
);

-- Price history for charts
CREATE TABLE IF NOT EXISTS price_history (
    id TEXT PRIMARY KEY,
    market_id TEXT REFERENCES markets(id),
    yes_price REAL NOT NULL,
    no_price REAL NOT NULL,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Market updates (creator posts for traders to see)
CREATE TABLE IF NOT EXISTS market_updates (
    id TEXT PRIMARY KEY,
    market_id TEXT REFERENCES markets(id),
    user_id TEXT REFERENCES users(id),
    update_type TEXT NOT NULL DEFAULT 'text',
    content TEXT NOT NULL,
    media_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE INDEX IF NOT EXISTS idx_markets_closes_at ON markets(closes_at);
CREATE INDEX IF NOT EXISTS idx_positions_user ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_market ON positions(market_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_market ON transactions(market_id);
CREATE INDEX IF NOT EXISTS idx_price_history_market ON price_history(market_id);
CREATE INDEX IF NOT EXISTS idx_market_updates_market ON market_updates(market_id);
CREATE INDEX IF NOT EXISTS idx_markets_created_by ON markets(created_by);
