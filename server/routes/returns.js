import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// GET /api/returns - List returns and virtual location contents
router.get('/', (req, res) => {
  try {
    const returnsList = db.prepare(`
      SELECT 
        r.*,
        p.sku,
        p.name as product_name,
        p.category
      FROM returns r
      JOIN products p ON r.product_id = p.id
      ORDER BY r.created_at DESC
    `).all();

    // Virtual location stocks
    const virtualStock = db.prepare(`
      SELECT 
        b.location_code,
        p.sku,
        p.name as product_name,
        i.quantity,
        i.batch_number,
        i.stock_status,
        i.received_at
      FROM inventory i
      JOIN bins b ON i.bin_id = b.id
      JOIN products p ON i.product_id = p.id
      WHERE b.is_virtual = 1
    `).all();

    res.json({
      success: true,
      data: {
        returns: returnsList,
        virtual_locations: virtualStock
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/returns/process - Triage return (restock to warehouse bin or move to QA-DAMAGED)
router.post('/process', (req, res) => {
  try {
    const { returnId, action, targetBinLocation, workerName = 'QA Inspector John', notes = 'Processed return QA triage' } = req.body;

    const ret = db.prepare(`
      SELECT r.*, p.sku, p.name as product_name
      FROM returns r
      JOIN products p ON r.product_id = p.id
      WHERE r.id = ? OR r.return_number = ?
    `).get(returnId, returnId);

    if (!ret) return res.status(404).json({ success: false, error: 'Return record not found' });

    db.transaction(() => {
      // Find source inventory in RETURNS-CART
      const sourceBin = db.prepare(`SELECT * FROM bins WHERE location_code = 'RETURNS-CART'`).get();
      const sourceInv = db.prepare(`
        SELECT * FROM inventory WHERE bin_id = ? AND product_id = ?
      `).get(sourceBin.id, ret.product_id);

      if (sourceInv && sourceInv.quantity >= ret.quantity) {
        db.prepare(`
          UPDATE inventory
          SET quantity = quantity - ?, last_movement_at = datetime('now'), last_movement_by = ?
          WHERE id = ?
        `).run(ret.quantity, workerName, sourceInv.id);
      }

      if (action === 'restock') {
        const destBin = db.prepare(`SELECT * FROM bins WHERE location_code = ?`).get(targetBinLocation);
        if (!destBin) throw new Error(`Target restock location ${targetBinLocation} not found`);

        const destInv = db.prepare(`SELECT * FROM inventory WHERE bin_id = ? AND product_id = ?`).get(destBin.id, ret.product_id);
        if (destInv) {
          db.prepare(`
            UPDATE inventory
            SET quantity = quantity + ?, stock_status = 'healthy', last_movement_at = datetime('now'), last_movement_by = ?
            WHERE id = ?
          `).run(ret.quantity, workerName, destInv.id);
        } else {
          db.prepare(`
            INSERT INTO inventory (id, product_id, bin_id, quantity, reserved_quantity, batch_number, received_at, stock_status, last_movement_at, last_movement_by)
            VALUES (?, ?, ?, ?, 0, ?, datetime('now'), 'healthy', datetime('now'), ?)
          `).run(`inv-${ret.product_id}-${destBin.id}-${Date.now()}`, ret.product_id, destBin.id, ret.quantity, `RESTOCK-${Date.now()}`, workerName);
        }

        // Record stock movement
        db.prepare(`
          INSERT INTO stock_movements (id, timestamp, product_id, sku, from_location_code, to_location_code, quantity, movement_type, worker_name, reason)
          VALUES (?, datetime('now'), ?, ?, 'RETURNS-CART', ?, ?, 'transfer', ?, ?)
        `).run(`mov-ret-${Date.now()}`, ret.product_id, ret.sku, destBin.location_code, ret.quantity, workerName, `Return Restocked: ${notes}`);

        db.prepare(`UPDATE returns SET status = 'restocked', notes = ? WHERE id = ?`).run(notes, ret.id);
      } else {
        // Move to QA-DAMAGED
        const qaBin = db.prepare(`SELECT * FROM bins WHERE location_code = 'QA-DAMAGED'`).get();
        const qaInv = db.prepare(`SELECT * FROM inventory WHERE bin_id = ? AND product_id = ?`).get(qaBin.id, ret.product_id);
        
        if (qaInv) {
          db.prepare(`UPDATE inventory SET quantity = quantity + ? WHERE id = ?`).run(ret.quantity, qaInv.id);
        } else {
          db.prepare(`
            INSERT INTO inventory (id, product_id, bin_id, quantity, reserved_quantity, batch_number, received_at, stock_status, last_movement_at, last_movement_by)
            VALUES (?, ?, ?, ?, 0, 'QA-SCRAP', datetime('now'), 'quarantine', datetime('now'), ?)
          `).run(`inv-${ret.product_id}-qa-${Date.now()}`, ret.product_id, qaBin.id, ret.quantity, workerName);
        }

        db.prepare(`
          INSERT INTO stock_movements (id, timestamp, product_id, sku, from_location_code, to_location_code, quantity, movement_type, worker_name, reason)
          VALUES (?, datetime('now'), ?, ?, 'RETURNS-CART', 'QA-DAMAGED', ?, 'transfer', ?, ?)
        `).run(`mov-qa-${Date.now()}`, ret.product_id, ret.sku, ret.quantity, workerName, `Damaged Return Quarantine: ${notes}`);

        db.prepare(`UPDATE returns SET status = 'scrapped', notes = ? WHERE id = ?`).run(notes, ret.id);
      }
    })();

    res.json({
      success: true,
      message: `Return ${ret.return_number} processed: ${action === 'restock' ? `Restocked to ${targetBinLocation}` : 'Quarantined in QA-DAMAGED'}`
    });
  } catch (error) {
    console.error('Process return error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
