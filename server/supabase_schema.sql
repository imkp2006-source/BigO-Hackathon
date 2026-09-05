-- ============================================================
-- LOGISTICS HUB: WMS Database Schema (Supabase PostgreSQL DDL)
-- Official PS-3: Warehouse -> Row -> Bin Hierarchy
-- ============================================================

-- 1. WAREHOUSES
CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ROWS
CREATE TABLE IF NOT EXISTS rows (
    id TEXT PRIMARY KEY,
    warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    row_code TEXT NOT NULL,
    name TEXT NOT NULL,
    congestion_level TEXT DEFAULT 'clear' CHECK (congestion_level IN ('clear', 'moderate', 'high')),
    UNIQUE(warehouse_id, row_code)
);

-- 3. BINS (Strict PS-3: WH -> Row -> Bin)
CREATE TABLE IF NOT EXISTS bins (
    id TEXT PRIMARY KEY,
    row_id TEXT NOT NULL REFERENCES rows(id) ON DELETE CASCADE,
    bin_code TEXT NOT NULL,
    location_code TEXT UNIQUE NOT NULL, -- e.g. WH1-R01-B01
    max_capacity INTEGER DEFAULT 100,
    x_coord REAL DEFAULT 0,
    y_coord REAL DEFAULT 0,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'low_stock', 'empty', 'discrepancy', 'virtual')),
    is_virtual BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. PRODUCTS / SKUS
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    weight_category TEXT DEFAULT 'medium' CHECK (weight_category IN ('light', 'medium', 'heavy')),
    weight_kg REAL DEFAULT 0.5,
    is_fragile BOOLEAN DEFAULT FALSE,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    min_stock INTEGER DEFAULT 10,
    unit_type TEXT DEFAULT 'individual units',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. INVENTORY (Product + Location + Quantity)
-- Authoritative inventory quantity exists ONLY here, NOT on product alone!
CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    bin_id TEXT NOT NULL REFERENCES bins(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    reserved_quantity INTEGER DEFAULT 0 CHECK (reserved_quantity >= 0 AND reserved_quantity <= quantity),
    batch_number TEXT NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    stock_status TEXT DEFAULT 'healthy' CHECK (stock_status IN ('healthy', 'low_stock', 'out_of_stock', 'reserved', 'quarantine')),
    last_movement_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_movement_by TEXT DEFAULT 'System',
    UNIQUE(product_id, bin_id, batch_number)
);

-- 6. ORDERS
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'allocated', 'picking', 'packed', 'shipped', 'cancelled')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'urgent')),
    total_items INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
    allocated_bin_id TEXT REFERENCES bins(id),
    quantity_allocated INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'allocated', 'picked')),
    allocation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. PICKING TASKS (Handheld Worker Execution)
CREATE TABLE IF NOT EXISTS picking_tasks (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    order_item_id TEXT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    bin_id TEXT NOT NULL REFERENCES bins(id),
    product_id TEXT NOT NULL REFERENCES products(id),
    quantity_to_pick INTEGER NOT NULL,
    unit_type TEXT DEFAULT 'individual units',
    step_status TEXT DEFAULT 'navigate' CHECK (step_status IN ('navigate', 'verify_bin', 'verify_sku', 'confirm_quantity', 'completed')),
    scanned_bin_code TEXT,
    scanned_sku TEXT,
    assigned_worker TEXT DEFAULT 'Worker 01',
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. STOCK MOVEMENTS (Immutable Audit Ledger)
CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    product_id TEXT NOT NULL REFERENCES products(id),
    sku TEXT NOT NULL,
    from_location_code TEXT NOT NULL,
    to_location_code TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    movement_type TEXT NOT NULL CHECK (movement_type IN ('inward', 'outward', 'transfer', 'return', 'adjustment')),
    order_id TEXT,
    worker_name TEXT DEFAULT 'Worker',
    reason TEXT
);

-- 10. DISCREPANCIES (Phantom Inventory Reporting)
CREATE TABLE IF NOT EXISTS discrepancies (
    id TEXT PRIMARY KEY,
    bin_id TEXT NOT NULL REFERENCES bins(id),
    product_id TEXT NOT NULL REFERENCES products(id),
    system_quantity INTEGER NOT NULL,
    physical_quantity INTEGER NOT NULL,
    difference INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'adjusted', 'rejected')),
    reported_by TEXT NOT NULL,
    reason TEXT,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. RETURNS (Special Staging: RETURNS-CART & QA-DAMAGED)
CREATE TABLE IF NOT EXISTS returns (
    id TEXT PRIMARY KEY,
    return_number TEXT UNIQUE NOT NULL,
    order_id TEXT,
    product_id TEXT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    condition TEXT DEFAULT 'sealed' CHECK (condition IN ('sealed', 'opened', 'damaged')),
    current_location TEXT DEFAULT 'RETURNS-CART',
    status TEXT DEFAULT 'pending_triage' CHECK (status IN ('pending_triage', 'restocked', 'scrapped')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. ALERTS
CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('low_stock', 'out_of_stock', 'discrepancy', 'congestion', 'wrong_pick')),
    severity TEXT DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    reference_code TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_bin ON inventory(bin_id);
CREATE INDEX IF NOT EXISTS idx_bins_location ON bins(location_code);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_movements_sku ON stock_movements(sku);
CREATE INDEX IF NOT EXISTS idx_movements_timestamp ON stock_movements(timestamp DESC);
