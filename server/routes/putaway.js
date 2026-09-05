import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// POST /api/putaway/split - Execute Split Put-Away to eliminate Shadow Locations
router.post('/split', (req, res) => {
  try {
    const { sku, totalQuantity, allocations, workerName = 'Operator Dave', supplierPO = 'PO-INBOUND' } = req.body;

    if (!sku || !totalQuantity || !allocations || !Array.isArray(allocations)) {
      return res.status(400).json({ success: false, error: 'Missing required put-away fields' });
    }

    const totalQty = Number(totalQuantity);
    const sumAllocated = allocations.reduce((sum, a) => sum + Number(a.quantity), 0);

    if (sumAllocated !== totalQty) {
      return res.status(400).json({
        success: false,
        error: `SPLIT ALLOCATION MISMATCH: Received ${totalQty} units, but allocations sum to ${sumAllocated}. All units must be accounted for.`
      });
    }

    const product = db.prepare(`SELECT * FROM products WHERE sku = ? OR id = ?`).get(sku, sku);
    if (!product) {
      return res.status(404).json({ success: false, error: `Product ${sku} not found` });
    }

    const splitTx = db.transaction(() => {
      const results = [];
      const batchNumber = `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-SPLIT`;

      allocations.forEach((alloc, index) => {
        const bin = db.prepare(`SELECT * FROM bins WHERE location_code = ? OR id = ?`).get(alloc.locationCode, alloc.locationCode);
        if (!bin) {
          throw new Error(`Target location ${alloc.locationCode} does not exist`);
        }

        const qty = Number(alloc.quantity);
        if (qty <= 0) return;

        // Check if existing inventory row exists in this bin for this product
        const existingInv = db.prepare(`
          SELECT * FROM inventory WHERE product_id = ? AND bin_id = ?
        `).get(product.id, bin.id);

        if (existingInv) {
          db.prepare(`
            UPDATE inventory 
            SET 
              quantity = quantity + ?,
              last_movement_at = datetime('now'),
              last_movement_by = ?
            WHERE id = ?
          `).run(qty, workerName, existingInv.id);
        } else {
          const invId = `inv-${product.id}-${bin.id}-${Date.now()}-${index}`;
          db.prepare(`
            INSERT INTO inventory (id, product_id, bin_id, quantity, reserved_quantity, batch_number, received_at, stock_status, last_movement_at, last_movement_by)
            VALUES (?, ?, ?, ?, 0, ?, datetime('now'), 'healthy', datetime('now'), ?)
          `).run(invId, product.id, bin.id, qty, batchNumber, workerName);
        }

        // Update bin status to available
        db.prepare(`UPDATE bins SET status = 'available' WHERE id = ?`).run(bin.id);

        // Record Inward Stock Movement
        const movId = `mov-putaway-${Date.now()}-${index}`;
        db.prepare(`
          INSERT INTO stock_movements (id, timestamp, product_id, sku, from_location_code, to_location_code, quantity, movement_type, worker_name, reason)
          VALUES (?, datetime('now'), ?, ?, 'RECEIVING-DOCK', ?, ?, 'inward', ?, ?)
        `).run(
          movId,
          product.id,
          product.sku,
          bin.location_code,
          qty,
          workerName,
          `Split Put-Away [Part ${index + 1}/${allocations.length}] ${supplierPO}`
        );

        results.push({
          location_code: bin.location_code,
          quantity_stored: qty,
          batch: batchNumber
        });
      });

      return results;
    });

    const storedAllocations = splitTx();

    // Broadcast SSE update
    req.app.get('broadcastUpdate')?.({
      type: 'PUTAWAY_SPLIT',
      sku: product.sku,
      totalUnits: totalQty,
      allocations: storedAllocations
    });

    res.json({
      success: true,
      accounted_status: `${totalQty} / ${totalQty} ACCOUNTED FOR ✓`,
      message: `Successfully completed Split Put-Away for ${totalQty} units across ${allocations.length} bins without shadow locations.`,
      data: {
        sku: product.sku,
        product_name: product.name,
        total_inward: totalQty,
        allocations: storedAllocations
      }
    });
  } catch (error) {
    console.error('Split Put-away error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
