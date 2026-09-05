import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// GET /api/inventory - List products with inventory aggregation and filters
router.get('/', (req, res) => {
  try {
    const {
      search = '',
      category = '',
      status = '',
      weight = '',
      is_fragile = '',
      priority = '',
      page = 1,
      limit = 50
    } = req.query;

    let query = `
      SELECT 
        p.id,
        p.sku,
        p.name,
        p.category,
        p.weight_category,
        p.weight_kg,
        p.is_fragile,
        p.priority,
        p.min_stock,
        p.unit_type,
        COALESCE(SUM(i.quantity), 0) as total_quantity,
        COALESCE(SUM(i.reserved_quantity), 0) as total_reserved,
        COALESCE(SUM(i.quantity - i.reserved_quantity), 0) as total_available,
        COUNT(DISTINCT i.bin_id) as location_count,
        GROUP_CONCAT(DISTINCT b.location_code) as location_codes
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      LEFT JOIN bins b ON i.bin_id = b.id
      WHERE 1=1
    `;

    const params = [];

    if (search) {
      query += ` AND (p.sku LIKE ? OR p.name LIKE ? OR b.location_code LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    if (category && category !== 'All') {
      query += ` AND p.category = ?`;
      params.push(category);
    }

    if (weight && weight !== 'All') {
      query += ` AND p.weight_category = ?`;
      params.push(weight);
    }

    if (is_fragile !== '') {
      query += ` AND p.is_fragile = ?`;
      params.push(is_fragile === 'true' ? 1 : 0);
    }

    if (priority && priority !== 'All') {
      query += ` AND p.priority = ?`;
      params.push(priority);
    }

    query += ` GROUP BY p.id`;

    if (status === 'low_stock') {
      query += ` HAVING total_available > 0 AND total_available <= p.min_stock`;
    } else if (status === 'out_of_stock') {
      query += ` HAVING total_available = 0`;
    } else if (status === 'in_stock') {
      query += ` HAVING total_available > p.min_stock`;
    }

    query += ` ORDER BY p.priority = 'urgent' DESC, p.priority = 'high' DESC, p.sku ASC`;

    // Pagination
    const offset = (Number(page) - 1) * Number(limit);
    query += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const products = db.prepare(query).all(...params);

    // Total count for pagination
    const countQuery = `SELECT COUNT(DISTINCT p.id) as total FROM products p WHERE 1=1`;
    const countResult = db.prepare(countQuery).get();

    res.json({
      success: true,
      data: products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: countResult.total
      }
    });
  } catch (error) {
    console.error('Inventory list error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/inventory/:sku - Detailed SKU information with all locations and FIFO batches
router.get('/:sku', (req, res) => {
  try {
    const { sku } = req.params;

    const product = db.prepare(`
      SELECT * FROM products WHERE sku = ? OR id = ?
    `).get(sku, sku);

    if (!product) {
      return res.status(404).json({ success: false, error: `Product with SKU ${sku} not found` });
    }

    // Get all inventory locations for this product
    const locations = db.prepare(`
      SELECT 
        i.id as inventory_id,
        i.quantity,
        i.reserved_quantity,
        (i.quantity - i.reserved_quantity) as available_quantity,
        i.batch_number,
        i.received_at,
        i.stock_status,
        i.last_movement_at,
        i.last_movement_by,
        b.id as bin_id,
        b.bin_code,
        b.location_code,
        b.is_virtual,
        r.row_code,
        r.congestion_level
      FROM inventory i
      JOIN bins b ON i.bin_id = b.id
      JOIN rows r ON b.row_id = r.id
      WHERE i.product_id = ?
      ORDER BY i.received_at ASC
    `).all(product.id);

    // Identify oldest batch (FIFO recommendation)
    if (locations.length > 0) {
      locations[0].is_fifo_oldest = true;
    }

    // Last known physical location
    const lastMovement = db.prepare(`
      SELECT * FROM stock_movements
      WHERE product_id = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `).get(product.id);

    const movementHistory = db.prepare(`
      SELECT * FROM stock_movements
      WHERE product_id = ?
      ORDER BY timestamp DESC
      LIMIT 20
    `).all(product.id);

    // Last known physical location summary
    const lastKnownLocation = lastMovement ? {
      location_code: lastMovement.to_location_code,
      updated_at: lastMovement.timestamp,
      movement_type: lastMovement.movement_type,
      worker_name: lastMovement.worker_name,
      reason: lastMovement.reason
    } : (locations.length > 0 ? {
      location_code: locations[0].location_code,
      updated_at: locations[0].last_movement_at,
      movement_type: 'inward',
      worker_name: locations[0].last_movement_by,
      reason: 'Initial Inward Batch'
    } : null);

    res.json({
      success: true,
      data: {
        product,
        locations,
        total_quantity: locations.reduce((sum, l) => sum + l.quantity, 0),
        total_reserved: locations.reduce((sum, l) => sum + l.reserved_quantity, 0),
        total_available: locations.reduce((sum, l) => sum + l.available_quantity, 0),
        last_known_location: lastKnownLocation,
        movement_history: movementHistory
      }
    });
  } catch (error) {
    console.error('Inventory SKU detail error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
