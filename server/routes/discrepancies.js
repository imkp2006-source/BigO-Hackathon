import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// GET /api/discrepancies - List all discrepancies
router.get('/', (req, res) => {
  try {
    const list = db.prepare(`
      SELECT 
        d.*,
        p.sku,
        p.name as product_name,
        b.location_code,
        b.bin_code,
        r.row_code
      FROM discrepancies d
      JOIN products p ON d.product_id = p.id
      JOIN bins b ON d.bin_id = b.id
      JOIN rows r ON b.row_id = r.id
      ORDER BY d.reported_at DESC
    `).all();

    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/discrepancies - Report Phantom Inventory Discrepancy
router.post('/', (req, res) => {
  try {
    const { locationCode, sku, physicalQuantity, reportedBy = 'Worker 04', reason = 'Cycle count mismatch' } = req.body;

    const bin = db.prepare(`SELECT * FROM bins WHERE location_code = ? OR id = ?`).get(locationCode, locationCode);
    if (!bin) return res.status(404).json({ success: false, error: `Location ${locationCode} not found` });

    const product = db.prepare(`SELECT * FROM products WHERE sku = ? OR id = ?`).get(sku, sku);
    if (!product) return res.status(404).json({ success: false, error: `Product ${sku} not found` });

    const inv = db.prepare(`SELECT * FROM inventory WHERE bin_id = ? AND product_id = ?`).get(bin.id, product.id);
    const systemQty = inv ? inv.quantity : 0;
    const physicalQty = Number(physicalQuantity);
    const difference = physicalQty - systemQty;

    const discId = `disc-${Date.now()}`;

    db.transaction(() => {
      // 1. Insert discrepancy record (does NOT silently overwrite inventory!)
      db.prepare(`
        INSERT INTO discrepancies (id, bin_id, product_id, system_quantity, physical_quantity, difference, status, reported_by, reason, reported_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, datetime('now'))
      `).run(discId, bin.id, product.id, systemQty, physicalQty, difference, reportedBy, reason);

      // 2. Mark bin visual status as discrepancy
      db.prepare(`UPDATE bins SET status = 'discrepancy' WHERE id = ?`).run(bin.id);

      // 3. Create high-severity alert
      const alertId = `alt-disc-${Date.now()}`;
      db.prepare(`
        INSERT INTO alerts (id, type, severity, title, message, reference_code)
        VALUES (?, 'discrepancy', 'critical', ?, ?, ?)
      `).run(
        alertId,
        `Phantom Inventory Discrepancy: ${bin.location_code}`,
        `Physical: ${physicalQty} vs System: ${systemQty} (Variance: ${difference}). Item: ${product.name} (${product.sku}). Reported by ${reportedBy}.`,
        bin.location_code
      );
    })();

    // Broadcast SSE update
    req.app.get('broadcastUpdate')?.({
      type: 'DISCREPANCY_REPORTED',
      locationCode: bin.location_code,
      sku: product.sku,
      systemQty,
      physicalQty,
      difference
    });

    res.status(201).json({
      success: true,
      message: `Discrepancy of ${difference} units reported for ${product.sku} at ${bin.location_code}. Auditor alert generated.`,
      data: {
        discrepancy_id: discId,
        location_code: bin.location_code,
        sku: product.sku,
        system_quantity: systemQty,
        physical_quantity: physicalQty,
        difference,
        status: '🔴 DISCREPANCY'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/discrepancies/:id/resolve - Recount or adjust inventory with audited movement
router.post('/:id/resolve', (req, res) => {
  try {
    const { id } = req.params;
    const { action, auditorNotes = 'Audited cycle count verified' } = req.body; // action: 'adjust' or 'reject'

    const disc = db.prepare(`
      SELECT d.*, b.location_code, p.sku
      FROM discrepancies d
      JOIN bins b ON d.bin_id = b.id
      JOIN products p ON d.product_id = p.id
      WHERE d.id = ?
    `).get(id);

    if (!disc) return res.status(404).json({ success: false, error: 'Discrepancy record not found' });

    db.transaction(() => {
      if (action === 'adjust') {
        // Adjust inventory to verified physical count
        db.prepare(`
          UPDATE inventory
          SET quantity = ?, stock_status = ?, last_movement_at = datetime('now'), last_movement_by = 'Inventory Auditor'
          WHERE bin_id = ? AND product_id = ?
        `).run(disc.physical_quantity, disc.physical_quantity > 0 ? 'healthy' : 'out_of_stock', disc.bin_id, disc.product_id);

        // Record adjustment movement in audit ledger
        db.prepare(`
          INSERT INTO stock_movements (id, timestamp, product_id, sku, from_location_code, to_location_code, quantity, movement_type, worker_name, reason)
          VALUES (?, datetime('now'), ?, ?, ?, 'AUDIT-ADJUSTMENT', ?, 'adjustment', 'Lead Auditor', ?)
        `).run(`mov-adj-${Date.now()}`, disc.product_id, disc.sku, disc.location_code, Math.abs(disc.difference), `Audit Variance Adjustment (${disc.difference > 0 ? '+' : ''}${disc.difference} units): ${auditorNotes}`);

        db.prepare(`UPDATE discrepancies SET status = 'adjusted' WHERE id = ?`).run(id);
      } else {
        db.prepare(`UPDATE discrepancies SET status = 'rejected' WHERE id = ?`).run(id);
      }

      // Check if any other pending discrepancies exist for this bin
      const otherDiscs = db.prepare(`SELECT COUNT(*) as count FROM discrepancies WHERE bin_id = ? AND status = 'pending' AND id != ?`).get(disc.bin_id, id);
      if (otherDiscs.count === 0) {
        db.prepare(`UPDATE bins SET status = 'available' WHERE id = ?`).run(disc.bin_id);
      }
    })();

    res.json({ success: true, message: `Discrepancy ${action === 'adjust' ? 'adjusted and inventory synced' : 'rejected'}.` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
