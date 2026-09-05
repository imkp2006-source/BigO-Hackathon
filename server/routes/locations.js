import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// GET /api/locations - Warehouse map overview (Warehouse -> Row -> Bin)
router.get('/', (req, res) => {
  try {
    const warehouse = db.prepare(`SELECT * FROM warehouses LIMIT 1`).get();
    const rows = db.prepare(`SELECT * FROM rows WHERE warehouse_id = ? ORDER BY row_code ASC`).all(warehouse.id);
    
    // Get all bins with aggregate stock counts
    const bins = db.prepare(`
      SELECT 
        b.id,
        b.row_id,
        b.bin_code,
        b.location_code,
        b.max_capacity,
        b.x_coord,
        b.y_coord,
        b.status as base_status,
        b.is_virtual,
        r.row_code,
        r.congestion_level,
        COALESCE(SUM(i.quantity), 0) as total_quantity,
        COALESCE(SUM(i.reserved_quantity), 0) as total_reserved,
        COALESCE(SUM(i.quantity - i.reserved_quantity), 0) as available_quantity,
        COUNT(DISTINCT i.product_id) as sku_count
      FROM bins b
      JOIN rows r ON b.row_id = r.id
      LEFT JOIN inventory i ON b.id = i.bin_id
      GROUP BY b.id
      ORDER BY r.row_code ASC, b.bin_code ASC
    `).all();

    // Determine visual status for each bin:
    // green = healthy
    // yellow = low stock
    // red = discrepancy or high congestion
    // gray = empty
    const mappedBins = bins.map(b => {
      let visualStatus = 'empty';
      if (b.base_status === 'discrepancy' || b.congestion_level === 'high') {
        visualStatus = 'issue'; // Red
      } else if (b.total_quantity === 0) {
        visualStatus = 'empty'; // Gray
      } else if (b.available_quantity < 10) {
        visualStatus = 'low_stock'; // Yellow
      } else {
        visualStatus = 'healthy'; // Green
      }

      return {
        ...b,
        visual_status: visualStatus,
        occupancy_pct: Math.min(100, Math.round((b.total_quantity / b.max_capacity) * 100))
      };
    });

    res.json({
      success: true,
      data: {
        warehouse,
        rows,
        bins: mappedBins
      }
    });
  } catch (error) {
    console.error('Locations fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/locations/:locationCode - Detailed inspection of a specific bin
router.get('/:locationCode', (req, res) => {
  try {
    const { locationCode } = req.params;

    const bin = db.prepare(`
      SELECT 
        b.*,
        r.row_code,
        r.name as row_name,
        r.congestion_level,
        w.name as warehouse_name,
        w.code as warehouse_code
      FROM bins b
      JOIN rows r ON b.row_id = r.id
      JOIN warehouses w ON r.warehouse_id = w.id
      WHERE b.location_code = ? OR b.id = ?
    `).get(locationCode, locationCode);

    if (!bin) {
      return res.status(404).json({ success: false, error: `Location ${locationCode} not found` });
    }

    // Get all products currently stored in this bin
    const inventory = db.prepare(`
      SELECT 
        i.*,
        (i.quantity - i.reserved_quantity) as available_quantity,
        p.sku,
        p.name as product_name,
        p.category,
        p.weight_category,
        p.weight_kg,
        p.is_fragile,
        p.unit_type
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.bin_id = ?
      ORDER BY i.received_at ASC
    `).all(bin.id);

    // Identify oldest batch in this bin
    if (inventory.length > 0) {
      inventory[0].is_oldest_in_bin = true;
    }

    // Get recent movements into or out of this bin
    const recentMovements = db.prepare(`
      SELECT * FROM stock_movements
      WHERE from_location_code = ? OR to_location_code = ?
      ORDER BY timestamp DESC
      LIMIT 10
    `).all(bin.location_code, bin.location_code);

    res.json({
      success: true,
      data: {
        bin,
        inventory,
        total_quantity: inventory.reduce((sum, item) => sum + item.quantity, 0),
        total_available: inventory.reduce((sum, item) => sum + item.available_quantity, 0),
        recent_movements: recentMovements
      }
    });
  } catch (error) {
    console.error('Bin detail error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/locations/row-congestion - Update row congestion level
router.patch('/row-congestion', (req, res) => {
  try {
    const { rowCode, congestionLevel } = req.body;
    if (!['clear', 'moderate', 'high'].includes(congestionLevel)) {
      return res.status(400).json({ success: false, error: 'Invalid congestion level' });
    }

    db.prepare(`UPDATE rows SET congestion_level = ? WHERE row_code = ?`).run(congestionLevel, rowCode);

    res.json({ success: true, message: `Row ${rowCode} congestion updated to ${congestionLevel}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
