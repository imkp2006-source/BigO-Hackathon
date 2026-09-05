import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// POST /api/transfers - Atomically transfer stock from one bin to another
router.post('/', (req, res) => {
  try {
    const { fromLocationCode, toLocationCode, sku, quantity, workerName = 'Operator Carlos', reason = 'Bin Rebalancing' } = req.body;

    if (!fromLocationCode || !toLocationCode || !sku || !quantity) {
      return res.status(400).json({ success: false, error: 'All transfer fields are required' });
    }

    const transferQty = Number(quantity);
    if (transferQty <= 0) {
      return res.status(400).json({ success: false, error: 'QUANTITY CANNOT BE NEGATIVE OR ZERO' });
    }

    if (fromLocationCode.trim().toUpperCase() === toLocationCode.trim().toUpperCase()) {
      return res.status(400).json({ success: false, error: 'Source and destination locations cannot be identical' });
    }

    const fromBin = db.prepare(`SELECT * FROM bins WHERE location_code = ? OR id = ?`).get(fromLocationCode, fromLocationCode);
    if (!fromBin) return res.status(404).json({ success: false, error: `Source location ${fromLocationCode} not found` });

    const toBin = db.prepare(`SELECT * FROM bins WHERE location_code = ? OR id = ?`).get(toLocationCode, toLocationCode);
    if (!toBin) return res.status(404).json({ success: false, error: `Destination location ${toLocationCode} not found` });

    const product = db.prepare(`SELECT * FROM products WHERE sku = ? OR id = ?`).get(sku, sku);
    if (!product) return res.status(404).json({ success: false, error: `Product SKU ${sku} not found` });

    // ATOMIC TRANSACTION FOR TRANSFER:
    // BEGIN
    // Check source stock
    // Deduct source
    // Add destination
    // Create movement
    // COMMIT (or ROLLBACK on any failure)
    const transferTx = db.transaction(() => {
      const sourceInv = db.prepare(`
        SELECT * FROM inventory
        WHERE bin_id = ? AND product_id = ?
        ORDER BY received_at ASC
        LIMIT 1
      `).get(fromBin.id, product.id);

      if (!sourceInv) {
        throw new Error(`TRANSFER FAILED: No inventory for ${product.sku} found in source ${fromBin.location_code}`);
      }

      const availableSource = sourceInv.quantity - sourceInv.reserved_quantity;
      if (availableSource < transferQty) {
        throw new Error(`TRANSFER FAILED: Insufficient available stock in ${fromBin.location_code}. Available: ${availableSource}, Requested: ${transferQty}`);
      }

      // Deduct source
      const newSourceQty = sourceInv.quantity - transferQty;
      const sourceStatus = newSourceQty <= 0 ? 'out_of_stock' : (newSourceQty <= product.min_stock ? 'low_stock' : 'healthy');
      
      db.prepare(`
        UPDATE inventory
        SET quantity = ?, stock_status = ?, last_movement_at = datetime('now'), last_movement_by = ?
        WHERE id = ?
      `).run(newSourceQty, sourceStatus, workerName, sourceInv.id);

      // Add to destination
      const destInv = db.prepare(`
        SELECT * FROM inventory
        WHERE bin_id = ? AND product_id = ?
        LIMIT 1
      `).get(toBin.id, product.id);

      if (destInv) {
        db.prepare(`
          UPDATE inventory
          SET quantity = quantity + ?, stock_status = 'healthy', last_movement_at = datetime('now'), last_movement_by = ?
          WHERE id = ?
        `).run(transferQty, workerName, destInv.id);
      } else {
        const newInvId = `inv-${product.id}-${toBin.id}-${Date.now()}`;
        db.prepare(`
          INSERT INTO inventory (id, product_id, bin_id, quantity, reserved_quantity, batch_number, received_at, stock_status, last_movement_at, last_movement_by)
          VALUES (?, ?, ?, ?, 0, ?, ?, 'healthy', datetime('now'), ?)
        `).run(newInvId, product.id, toBin.id, transferQty, sourceInv.batch_number, sourceInv.received_at, workerName);
      }

      // Ensure target bin status is active
      db.prepare(`UPDATE bins SET status = 'available' WHERE id = ?`).run(toBin.id);

      // Log Stock Movement
      const movId = `mov-trans-${Date.now()}`;
      db.prepare(`
        INSERT INTO stock_movements (id, timestamp, product_id, sku, from_location_code, to_location_code, quantity, movement_type, worker_name, reason)
        VALUES (?, datetime('now'), ?, ?, ?, ?, ?, 'transfer', ?, ?)
      `).run(movId, product.id, product.sku, fromBin.location_code, toBin.location_code, transferQty, workerName, reason);

      return {
        previousSourceQty: sourceInv.quantity,
        newSourceQty,
        unitsTransferred: transferQty,
        movementId: movId
      };
    });

    const result = transferTx();

    // Broadcast SSE update
    req.app.get('broadcastUpdate')?.({
      type: 'TRANSFER_COMPLETED',
      sku: product.sku,
      fromLocation: fromBin.location_code,
      toLocation: toBin.location_code,
      quantity: transferQty,
      workerName
    });

    res.json({
      success: true,
      message: `Transferred ${transferQty} units of ${product.sku} from ${fromBin.location_code} to ${toBin.location_code}.`,
      data: result
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
