import { db, initSchema } from './db.js';

export function seedDatabase() {
  console.log('⚡ Initializing Database Schema...');
  initSchema();

  // Clean existing data
  const dropTables = [
    'alerts', 'returns', 'discrepancies', 'stock_movements',
    'picking_tasks', 'order_items', 'orders', 'inventory',
    'products', 'bins', 'rows', 'warehouses'
  ];
  
  db.transaction(() => {
    for (const tbl of dropTables) {
      db.prepare(`DELETE FROM ${tbl}`).run();
    }
  })();

  console.log('📦 Seeding Warehouse Hierarchy (Warehouse -> Row -> Bin)...');

  // 1. Warehouse
  db.prepare(`
    INSERT INTO warehouses (id, code, name, address)
    VALUES (?, ?, ?, ?)
  `).run('wh-1', 'WH1', 'Central Fulfillment Command Hub', 'Dock Bay 4, Logistics Blvd, Sector 7');

  // 2. Rows (R01 to R04)
  const rowsData = [
    { id: 'row-1', code: 'R01', name: 'Row 01 - Fast Mover Electronics', congestion: 'clear' },
    { id: 'row-2', code: 'R02', name: 'Row 02 - Core Peripherals & Accessories', congestion: 'moderate' },
    { id: 'row-3', code: 'R03', name: 'Row 03 - Tools & Heavy Hardware (Hotspot)', congestion: 'high' },
    { id: 'row-4', code: 'R04', name: 'Row 04 - Safety & Staging Supplies', congestion: 'clear' }
  ];

  for (const r of rowsData) {
    db.prepare(`
      INSERT INTO rows (id, warehouse_id, row_code, name, congestion_level)
      VALUES (?, ?, ?, ?, ?)
    `).run(r.id, 'wh-1', r.code, r.name, r.congestion);
  }

  // 3. Physical Bins (WH1-R01-B01 to WH1-R04-B06)
  const binInsert = db.prepare(`
    INSERT INTO bins (id, row_id, bin_code, location_code, max_capacity, x_coord, y_coord, status, is_virtual)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const binsMap = {};
  const yCoords = { R01: 110, R02: 210, R03: 310, R04: 410 };

  rowsData.forEach(r => {
    for (let b = 1; b <= 6; b++) {
      const binCode = `B0${b}`;
      const locCode = `WH1-${r.code}-${binCode}`;
      const binId = `bin-${r.code}-${binCode}`.toLowerCase();
      const x = 90 + (b - 1) * 95;
      const y = yCoords[r.code];

      binInsert.run(binId, r.id, binCode, locCode, 150, x, y, 'available', 0);
      binsMap[locCode] = binId;
    }
  });

  // Virtual Locations (RETURNS-CART & QA-DAMAGED)
  binInsert.run('bin-returns-cart', 'row-4', 'V-RET', 'RETURNS-CART', 50, 680, 110, 'virtual', 1);
  binInsert.run('bin-qa-damaged', 'row-4', 'V-QA', 'QA-DAMAGED', 50, 680, 210, 'virtual', 1);
  binsMap['RETURNS-CART'] = 'bin-returns-cart';
  binsMap['QA-DAMAGED'] = 'bin-qa-damaged';

  console.log('🏷️ Generating 500+ SKUs across 5 Core Categories...');

  const categories = [
    { name: 'Electronics', prefix: 'ELEC', weight: 'light', kg: 0.4 },
    { name: 'Peripherals', prefix: 'PERI', weight: 'medium', kg: 1.2 },
    { name: 'Hardware & Tools', prefix: 'TOOL', weight: 'heavy', kg: 4.5 },
    { name: 'Apparel & Safety', prefix: 'SAFE', weight: 'light', kg: 0.6 },
    { name: 'Packaging & Office', prefix: 'PACK', weight: 'medium', kg: 2.0 }
  ];

  const productInsert = db.prepare(`
    INSERT INTO products (id, sku, name, category, weight_category, weight_kg, is_fragile, priority, min_stock, unit_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const productsList = [];

  // Anchor showcase SKUs for intentional demo cases:
  const anchorProducts = [
    { id: 'prod-103', sku: 'SKU-103', name: 'Logitech MX Master 3S Wireless Mouse', category: 'Peripherals', weight_category: 'light', weight_kg: 0.35, is_fragile: 0, priority: 'high', min_stock: 15 },
    { id: 'prod-102', sku: 'SKU-102', name: 'Keychron K2 Mechanical Keyboard', category: 'Peripherals', weight_category: 'medium', weight_kg: 1.1, is_fragile: 0, priority: 'normal', min_stock: 10 },
    { id: 'prod-108', sku: 'SKU-108', name: 'Braided Thunderbolt 4 USB-C Cable (2m)', category: 'Electronics', weight_category: 'light', weight_kg: 0.15, is_fragile: 0, priority: 'normal', min_stock: 20 },
    { id: 'prod-204', sku: 'SKU-204', name: 'Anker 100W GaN Fast Charger Duo', category: 'Electronics', weight_category: 'light', weight_kg: 0.28, is_fragile: 0, priority: 'urgent', min_stock: 25 },
    { id: 'prod-305', sku: 'SKU-305', name: 'Industrial Anti-Static ESD Bench Mat', category: 'Hardware & Tools', weight_category: 'medium', weight_kg: 2.4, is_fragile: 0, priority: 'normal', min_stock: 10 },
    { id: 'prod-402', sku: 'SKU-402', name: 'Brio 4K Ultra HD Streaming Webcam', category: 'Electronics', weight_category: 'light', weight_kg: 0.45, is_fragile: 1, priority: 'normal', min_stock: 12 },
    { id: 'prod-409', sku: 'SKU-409', name: 'Bosch Laser Distance Measure GLM 50C', category: 'Hardware & Tools', weight_category: 'light', weight_kg: 0.5, is_fragile: 1, priority: 'high', min_stock: 8 },
    { id: 'prod-501', sku: 'SKU-501', name: 'Mitutoyo Digital Precision Caliper 150mm', category: 'Hardware & Tools', weight_category: 'medium', weight_kg: 0.8, is_fragile: 1, priority: 'high', min_stock: 8 }
  ];

  anchorProducts.forEach(p => {
    productInsert.run(p.id, p.sku, p.name, p.category, p.weight_category, p.weight_kg, p.is_fragile, p.priority, p.min_stock, 'individual units');
    productsList.push(p);
  });

  // Generate 520 additional realistic SKUs to fulfill 500-1000 SKUs requirement
  const adjectives = ['Pro', 'Ultra', 'Industrial', 'Ergonomic', 'Compact', 'Precision', 'Heavy-Duty', 'Rugged', 'Smart', 'Flex'];
  const baseItems = [
    'Wireless Earbuds', 'Noise Canceling Headset', 'Power Bank 20000mAh', 'HDMI 2.1 Cable',
    'USB-C Multiport Hub', 'Cat6A Ethernet Patch Cable', 'LED Inspection Torch', 'Soldering Station',
    'Thermal Label Roll', 'Barcode Scanner Handheld', 'Safety Glasses UV400', 'Cut-Resistant Gloves',
    'High-Visibility Vest', 'Steel-Toe Protective Boot', 'Precision Screwdriver Set', 'Torque Wrench 1/2in',
    'ESD Wrist Strap', 'Bubble Wrap Dispenser Roll', 'Carton Sealing Tape 3in', 'Pallet Stretch Film'
  ];

  let skuCounter = 600;
  for (let i = 0; i < 520; i++) {
    const cat = categories[i % categories.length];
    const adj = adjectives[i % adjectives.length];
    const item = baseItems[i % baseItems.length];
    const sku = `SKU-${skuCounter++}`;
    const name = `${adj} ${item} Series-${(i % 9) + 1}`;
    const weightKg = Number((0.2 + (i % 15) * 0.4).toFixed(2));
    const weightCat = weightKg > 4 ? 'heavy' : (weightKg > 1 ? 'medium' : 'light');
    const isFragile = (i % 7 === 0) ? 1 : 0;
    const minStock = 5 + (i % 15);

    const prodId = `prod-${sku.toLowerCase()}`;
    productInsert.run(prodId, sku, name, cat.name, weightCat, weightKg, isFragile, 'normal', minStock, 'individual units');
    productsList.push({ id: prodId, sku, name, category: cat.name, min_stock: minStock });
  }

  console.log(`✅ Seeded ${productsList.length} Products/SKUs.`);

  // 4. Inventory Seeding (Product + Location + Quantity)
  console.log('📊 Seeding Inventory with Multi-Bin distribution and FIFO batches...');
  const inventoryInsert = db.prepare(`
    INSERT INTO inventory (id, product_id, bin_id, quantity, reserved_quantity, batch_number, received_at, stock_status, last_movement_at, last_movement_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  const daysAgo = (d) => new Date(now - d * 86400000).toISOString();

  // CASE 1 & CASE 2: Multi-Bin & FIFO Anchors for SKU-103 (Wireless Mouse)
  // Bins: WH1-R01-B04 (20 units), WH1-R02-B03 (35 units), WH1-R03-B01 (10 units)
  // Plus FIFO explicit comparison: WH1-R02-B05 (30 units, 10 days ago - OLDEST) vs WH1-R02-B06 (12 units, 2 days ago - NEWER)
  inventoryInsert.run('inv-103-1', 'prod-103', binsMap['WH1-R01-B04'], 20, 0, 'BATCH-2026-0820-C', daysAgo(14), 'healthy', daysAgo(14), 'Operator Carlos');
  inventoryInsert.run('inv-103-2', 'prod-103', binsMap['WH1-R02-B03'], 35, 5, 'BATCH-2026-0828-A', daysAgo(6), 'healthy', daysAgo(6), 'Operator Sarah');
  inventoryInsert.run('inv-103-3', 'prod-103', binsMap['WH1-R03-B01'], 10, 0, 'BATCH-2026-0822-B', daysAgo(12), 'healthy', daysAgo(12), 'Operator Carlos');
  inventoryInsert.run('inv-103-4', 'prod-103', binsMap['WH1-R02-B05'], 30, 0, 'BATCH-2026-0824-A', daysAgo(10), 'healthy', daysAgo(10), 'Receiving Dock');
  inventoryInsert.run('inv-103-5', 'prod-103', binsMap['WH1-R02-B06'], 12, 0, 'BATCH-2026-0902-B', daysAgo(2), 'healthy', daysAgo(2), 'Receiving Dock');

  // SKU-102 (Keyboard)
  inventoryInsert.run('inv-102-1', 'prod-102', binsMap['WH1-R03-B02'], 45, 3, 'BATCH-2026-0825-K', daysAgo(9), 'healthy', daysAgo(9), 'Operator Liam');
  inventoryInsert.run('inv-102-2', 'prod-102', binsMap['WH1-R01-B01'], 18, 0, 'BATCH-2026-0901-K', daysAgo(3), 'healthy', daysAgo(3), 'Operator Sarah');

  // SKU-108 (USB-C Cable)
  inventoryInsert.run('inv-108-1', 'prod-108', binsMap['WH1-R01-B05'], 60, 1, 'BATCH-2026-0815-U', daysAgo(19), 'healthy', daysAgo(19), 'Operator Carlos');
  inventoryInsert.run('inv-108-2', 'prod-108', binsMap['WH1-R01-B06'], 40, 0, 'BATCH-2026-0830-U', daysAgo(4), 'healthy', daysAgo(4), 'Operator Liam');

  // CASE 3 Anchor: SKU-204 (Split Put-Away ready)
  inventoryInsert.run('inv-204-1', 'prod-204', binsMap['WH1-R01-B02'], 70, 0, 'BATCH-2026-0904-S1', daysAgo(1), 'healthy', daysAgo(1), 'Operator Dave');
  inventoryInsert.run('inv-204-2', 'prod-204', binsMap['WH1-R01-B03'], 30, 0, 'BATCH-2026-0904-S2', daysAgo(1), 'healthy', daysAgo(1), 'Operator Dave');

  // CASE 4 Anchor: SKU-501 (Phantom Discrepancy)
  inventoryInsert.run('inv-501-1', 'prod-501', binsMap['WH1-R03-B04'], 10, 0, 'BATCH-2026-0810-M', daysAgo(24), 'healthy', daysAgo(2), 'Worker 04');

  // CASE 9 Anchor: Low Stock & Out of Stock
  inventoryInsert.run('inv-305-1', 'prod-305', binsMap['WH1-R03-B05'], 2, 0, 'BATCH-2026-0801-E', daysAgo(33), 'low_stock', daysAgo(5), 'System');
  // SKU-409 has 0 stock in system
  inventoryInsert.run('inv-409-1', 'prod-409', binsMap['WH1-R03-B06'], 0, 0, 'BATCH-2026-0715-B', daysAgo(50), 'out_of_stock', daysAgo(10), 'System');

  // CASE 10 Anchor: RETURNS-CART stock
  inventoryInsert.run('inv-402-ret', 'prod-402', binsMap['RETURNS-CART'], 5, 0, 'RET-BATCH-0903', daysAgo(1), 'quarantine', daysAgo(1), 'QA Inspector');
  inventoryInsert.run('inv-402-main', 'prod-402', binsMap['WH1-R02-B01'], 22, 0, 'BATCH-2026-0829-W', daysAgo(5), 'healthy', daysAgo(5), 'Operator Sarah');

  // Distribute rest of products across remaining physical bins
  const physicalBinKeys = Object.keys(binsMap).filter(k => k.startsWith('WH1-'));
  
  for (let i = 8; i < productsList.length; i++) {
    const prod = productsList[i];
    // Assign to 1 or 2 bins
    const binKey1 = physicalBinKeys[i % physicalBinKeys.length];
    const qty1 = 15 + ((i * 7) % 65);
    const reserved1 = (i % 5 === 0) ? Math.floor(qty1 * 0.2) : 0;
    const batch1 = `BATCH-2026-08${10 + (i % 20)}-${(i % 9) + 1}`;
    const received1 = daysAgo((i % 30) + 1);

    inventoryInsert.run(
      `inv-${prod.id}-1`,
      prod.id,
      binsMap[binKey1],
      qty1,
      reserved1,
      batch1,
      received1,
      (qty1 - reserved1) < prod.min_stock ? 'low_stock' : 'healthy',
      received1,
      'Receiving'
    );

    // Multi-bin for ~30% of items
    if (i % 3 === 0) {
      const binKey2 = physicalBinKeys[(i + 5) % physicalBinKeys.length];
      const qty2 = 10 + ((i * 3) % 40);
      const batch2 = `BATCH-2026-090${(i % 4) + 1}-R`;
      const received2 = daysAgo((i % 5) + 1);

      inventoryInsert.run(
        `inv-${prod.id}-2`,
        prod.id,
        binsMap[binKey2],
        qty2,
        0,
        batch2,
        received2,
        'healthy',
        received2,
        'Transfer Shift'
      );
    }
  }

  // Update bin statuses based on inventory
  db.prepare(`
    UPDATE bins SET status = 'empty'
    WHERE is_virtual = 0 AND id NOT IN (SELECT DISTINCT bin_id FROM inventory WHERE quantity > 0)
  `).run();

  // Set R03-B04 as discrepancy status
  db.prepare(`UPDATE bins SET status = 'discrepancy' WHERE id = ?`).run(binsMap['WH1-R03-B04']);

  // 5. Stock Movements (Immutable Audit Log)
  console.log('📜 Seeding Stock Movement Ledger & SKU-103 Timeline...');
  const movementInsert = db.prepare(`
    INSERT INTO stock_movements (id, timestamp, product_id, sku, from_location_code, to_location_code, quantity, movement_type, order_id, worker_name, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // CASE 8: Full history for SKU-103
  movementInsert.run('mov-103-1', daysAgo(14), 'prod-103', 'SKU-103', 'SUPPLIER-DOCK', 'WH1-R01-B02', 50, 'inward', null, 'Rahul (Receiving Lead)', 'Purchase Order #PO-8820 Inbound');
  movementInsert.run('mov-103-2', daysAgo(10), 'prod-103', 'SKU-103', 'WH1-R01-B02', 'WH1-R02-B05', 30, 'transfer', null, 'Priya (Slotting Operator)', 'Aisle Replenishment Transfer');
  movementInsert.run('mov-103-3', daysAgo(6), 'prod-103', 'SKU-103', 'WH1-R01-B02', 'WH1-R02-B03', 20, 'transfer', null, 'Priya (Slotting Operator)', 'Bin Rebalancing');
  movementInsert.run('mov-103-4', daysAgo(2), 'prod-103', 'SKU-103', 'WH1-R02-B05', 'ORDER #10280', 2, 'outward', 'ord-10280', 'Aman (Senior Picker)', 'Customer Order Fulfillment');
  movementInsert.run('mov-103-5', daysAgo(1), 'prod-103', 'SKU-103', 'WH1-R02-B05', 'WH1-R03-B01', 10, 'transfer', null, 'Worker 04', 'Safety Stock Relocation');

  // Other movements
  movementInsert.run('mov-102-1', daysAgo(5), 'prod-102', 'SKU-102', 'SUPPLIER-DOCK', 'WH1-R03-B02', 50, 'inward', null, 'Rahul', 'Initial Batch Inbound');
  movementInsert.run('mov-108-1', daysAgo(4), 'prod-108', 'SKU-108', 'SUPPLIER-DOCK', 'WH1-R01-B05', 70, 'inward', null, 'Rahul', 'Inbound PO-8902');
  movementInsert.run('mov-204-1', daysAgo(1), 'prod-204', 'SKU-204', 'RECEIVING-STAGING', 'WH1-R01-B02', 70, 'inward', null, 'Dave', 'Split Put-Away Part 1 (70/100)');
  movementInsert.run('mov-204-2', daysAgo(1), 'prod-204', 'SKU-204', 'RECEIVING-STAGING', 'WH1-R01-B03', 30, 'inward', null, 'Dave', 'Split Put-Away Part 2 (30/100)');
  movementInsert.run('mov-402-ret', daysAgo(1), 'prod-402', 'SKU-402', 'CUSTOMER-RETURN', 'RETURNS-CART', 5, 'return', 'ord-10190', 'John (QA Inspector)', 'Customer remorse return - sealed packaging');

  // 6. Orders & Picking Tasks (CASE 6 Anchor: Order #10291)
  console.log('🛒 Seeding Orders & Order #10291 Intake Flow...');
  
  db.prepare(`
    INSERT INTO orders (id, order_number, customer_name, status, priority, total_items, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('ord-10291', 'ORDER #10291', 'Apex Tech Labs (Priority Express)', 'allocated', 'urgent', 6, daysAgo(0.1));

  // Order items for #10291:
  // 2 × Wireless Mouse (SKU-103) -> WH1-R02-B05
  // 1 × USB-C Cable (SKU-108) -> WH1-R01-B05
  // 3 × Mechanical Keyboard (SKU-102) -> WH1-R03-B02
  const itemInsert = db.prepare(`
    INSERT INTO order_items (id, order_id, product_id, quantity_ordered, allocated_bin_id, quantity_allocated, status, allocation_reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  itemInsert.run('item-10291-1', 'ord-10291', 'prod-103', 2, binsMap['WH1-R02-B05'], 2, 'allocated', '✓ Oldest eligible batch (FIFO 10d), 30 available, Zero contention');
  itemInsert.run('item-10291-2', 'ord-10291', 'prod-108', 1, binsMap['WH1-R01-B05'], 1, 'allocated', '✓ Oldest eligible batch (FIFO 19d), R01 Clear Traffic, Shortest dock path');
  itemInsert.run('item-10291-3', 'ord-10291', 'prod-102', 3, binsMap['WH1-R03-B02'], 3, 'allocated', '✓ Sufficient single-bin quantity (45 available), optimal S-curve traversal stop');

  // Reserve the quantities
  db.prepare(`UPDATE inventory SET reserved_quantity = reserved_quantity + 2 WHERE id = 'inv-103-4'`).run();
  db.prepare(`UPDATE inventory SET reserved_quantity = reserved_quantity + 1 WHERE id = 'inv-108-1'`).run();
  db.prepare(`UPDATE inventory SET reserved_quantity = reserved_quantity + 3 WHERE id = 'inv-102-1'`).run();

  // Create Picking Tasks for Handheld Worker Assistant
  const pickTaskInsert = db.prepare(`
    INSERT INTO picking_tasks (id, order_id, order_item_id, bin_id, product_id, quantity_to_pick, unit_type, step_status, assigned_worker)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  pickTaskInsert.run('task-pick-1', 'ord-10291', 'item-10291-2', binsMap['WH1-R01-B05'], 'prod-108', 1, 'individual units', 'navigate', 'Worker 04');
  pickTaskInsert.run('task-pick-2', 'ord-10291', 'item-10291-1', binsMap['WH1-R02-B05'], 'prod-103', 2, 'individual units', 'navigate', 'Worker 04');
  pickTaskInsert.run('task-pick-3', 'ord-10291', 'item-10291-3', binsMap['WH1-R03-B02'], 'prod-102', 3, 'individual units', 'navigate', 'Worker 04');

  // Seed sample completed and in-progress orders
  db.prepare(`
    INSERT INTO orders (id, order_number, customer_name, status, priority, total_items, created_at)
    VALUES 
      ('ord-10290', 'ORDER #10290', 'Nexus Systems Corp', 'picking', 'normal', 4, ?),
      ('ord-10289', 'ORDER #10289', 'Horizon Dynamics', 'packed', 'high', 8, ?),
      ('ord-10288', 'ORDER #10288', 'Quantum Innovations', 'shipped', 'normal', 2, ?)
  `).run(daysAgo(0.3), daysAgo(0.6), daysAgo(1.2));

  // 7. Discrepancies (CASE 4: Phantom Inventory)
  db.prepare(`
    INSERT INTO discrepancies (id, bin_id, product_id, system_quantity, physical_quantity, difference, status, reported_by, reason, reported_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('disc-501-1', binsMap['WH1-R03-B04'], 'prod-501', 10, 7, -3, 'pending', 'Worker 04 (Cycle Counter)', 'Physical audit detected 3 units missing from bin packaging', daysAgo(0.2));

  // 8. Returns (CASE 10: Staged in RETURNS-CART)
  db.prepare(`
    INSERT INTO returns (id, return_number, order_id, product_id, quantity, condition, current_location, status, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('ret-402-1', 'RET-9904', 'ord-10190', 'prod-402', 5, 'sealed', 'RETURNS-CART', 'pending_triage', 'Customer return: unused 4K webcam units in original sealed blister pack', daysAgo(0.5));

  // 9. Alerts
  const alertInsert = db.prepare(`
    INSERT INTO alerts (id, type, severity, title, message, reference_code, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  alertInsert.run('alt-1', 'low_stock', 'warning', 'Low Stock Warning: Anti-Static Mat', 'SKU-305 has 2 available units remaining (Minimum threshold: 10)', 'SKU-305', 0, daysAgo(0.1));
  alertInsert.run('alt-2', 'out_of_stock', 'critical', 'Stock Depleted: Laser Distance Measure', 'SKU-409 is completely depleted across all bins in WH1', 'SKU-409', 0, daysAgo(0.4));
  alertInsert.run('alt-3', 'discrepancy', 'critical', 'Phantom Inventory Reported: WH1-R03-B04', 'Physical count variance of -3 units reported on Mitutoyo Digital Caliper (SKU-501)', 'WH1-R03-B04', 0, daysAgo(0.2));
  alertInsert.run('alt-4', 'congestion', 'warning', 'Congestion Alert: Row 03 Hotspot', 'Heavy picking activity in Row 03. Traversal delay estimated at +35%.', 'R03', 0, daysAgo(0.05));

  console.log('🎉 Database Seeding Completed Successfully! All 10 Intentional Scenarios Ready.');
}

// Run directly if called as a script
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase();
  process.exit(0);
}
