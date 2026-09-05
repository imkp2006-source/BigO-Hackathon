import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'warehouse.db');
export const db = new Database(dbPath);

// Enable WAL mode & foreign keys for high performance & ACID safety
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initSchema() {
  db.exec(`
    -- 1. WAREHOUSES
    CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 2. ROWS
    CREATE TABLE IF NOT EXISTS rows (
      id TEXT PRIMARY KEY,
      warehouse_id TEXT NOT NULL,
      row_code TEXT NOT NULL,
      name TEXT NOT NULL,
      congestion_level TEXT DEFAULT 'clear' CHECK (congestion_level IN ('clear', 'moderate', 'high')),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
      UNIQUE(warehouse_id, row_code)
    );

    -- 3. BINS (Strict PS-3: Warehouse -> Row -> Bin)
    CREATE TABLE IF NOT EXISTS bins (
      id TEXT PRIMARY KEY,
      row_id TEXT NOT NULL,
      bin_code TEXT NOT NULL,
      location_code TEXT UNIQUE NOT NULL, -- e.g. WH1-R01-B01
      max_capacity INTEGER DEFAULT 100,
      x_coord REAL DEFAULT 0,
      y_coord REAL DEFAULT 0,
      status TEXT DEFAULT 'available' CHECK (status IN ('available', 'low_stock', 'empty', 'discrepancy', 'virtual')),
      is_virtual INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (row_id) REFERENCES rows(id) ON DELETE CASCADE
    );

    -- 4. PRODUCTS
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      weight_category TEXT DEFAULT 'medium' CHECK (weight_category IN ('light', 'medium', 'heavy')),
      weight_kg REAL DEFAULT 0.5,
      is_fragile INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
      min_stock INTEGER DEFAULT 10,
      unit_type TEXT DEFAULT 'individual units',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 5. INVENTORY (Product + Location + Quantity)
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      bin_id TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity >= 0),
      reserved_quantity INTEGER DEFAULT 0 CHECK (reserved_quantity >= 0 AND reserved_quantity <= quantity),
      batch_number TEXT NOT NULL,
      received_at TEXT DEFAULT (datetime('now')),
      stock_status TEXT DEFAULT 'healthy' CHECK (stock_status IN ('healthy', 'low_stock', 'out_of_stock', 'reserved', 'quarantine')),
      last_movement_at TEXT DEFAULT (datetime('now')),
      last_movement_by TEXT DEFAULT 'System',
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (bin_id) REFERENCES bins(id) ON DELETE CASCADE,
      UNIQUE(product_id, bin_id, batch_number)
    );

    -- 6. ORDERS
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'allocated', 'picking', 'packed', 'shipped', 'cancelled')),
      priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
      total_items INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 7. ORDER ITEMS
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
      allocated_bin_id TEXT,
      quantity_allocated INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'allocated', 'picked')),
      allocation_reason TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (allocated_bin_id) REFERENCES bins(id)
    );

    -- 8. PICKING TASKS
    CREATE TABLE IF NOT EXISTS picking_tasks (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      order_item_id TEXT NOT NULL,
      bin_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity_to_pick INTEGER NOT NULL,
      unit_type TEXT DEFAULT 'individual units',
      step_status TEXT DEFAULT 'navigate' CHECK (step_status IN ('navigate', 'verify_bin', 'verify_sku', 'confirm_quantity', 'completed')),
      scanned_bin_code TEXT,
      scanned_sku TEXT,
      assigned_worker TEXT DEFAULT 'Worker 01',
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
      FOREIGN KEY (bin_id) REFERENCES bins(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- 9. STOCK MOVEMENTS (Immutable Audit Log)
    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      timestamp TEXT DEFAULT (datetime('now')),
      product_id TEXT NOT NULL,
      sku TEXT NOT NULL,
      from_location_code TEXT NOT NULL,
      to_location_code TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      movement_type TEXT NOT NULL CHECK (movement_type IN ('inward', 'outward', 'transfer', 'return', 'adjustment')),
      order_id TEXT,
      worker_name TEXT DEFAULT 'Worker',
      reason TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- 10. DISCREPANCIES (Phantom Inventory)
    CREATE TABLE IF NOT EXISTS discrepancies (
      id TEXT PRIMARY KEY,
      bin_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      system_quantity INTEGER NOT NULL,
      physical_quantity INTEGER NOT NULL,
      difference INTEGER NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'adjusted', 'rejected')),
      reported_by TEXT NOT NULL,
      reason TEXT,
      reported_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (bin_id) REFERENCES bins(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- 11. RETURNS (Special Staging)
    CREATE TABLE IF NOT EXISTS returns (
      id TEXT PRIMARY KEY,
      return_number TEXT UNIQUE NOT NULL,
      order_id TEXT,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      condition TEXT DEFAULT 'sealed' CHECK (condition IN ('sealed', 'opened', 'damaged')),
      current_location TEXT DEFAULT 'RETURNS-CART',
      status TEXT DEFAULT 'pending_triage' CHECK (status IN ('pending_triage', 'restocked', 'scrapped')),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- 12. ALERTS
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('low_stock', 'out_of_stock', 'discrepancy', 'congestion', 'wrong_pick')),
      severity TEXT DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      reference_code TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- INDEXES
    CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_bin ON inventory(bin_id);
    CREATE INDEX IF NOT EXISTS idx_bins_location ON bins(location_code);
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_movements_sku ON stock_movements(sku);
    CREATE INDEX IF NOT EXISTS idx_movements_time ON stock_movements(timestamp DESC);
  `);
}
