import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// GET /api/movements - Immutable Movement Ledger with multi-type filters
router.get('/', (req, res) => {
  try {
    const { type, sku, location, limit = 100, page = 1 } = req.query;

    let query = `
      SELECT 
        sm.*,
        p.name as product_name,
        p.category
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (type && type !== 'all') {
      query += ` AND sm.movement_type = ?`;
      params.push(type.toLowerCase());
    }

    if (sku) {
      query += ` AND (sm.sku LIKE ? OR p.name LIKE ?)`;
      params.push(`%${sku}%`, `%${sku}%`);
    }

    if (location) {
      query += ` AND (sm.from_location_code LIKE ? OR sm.to_location_code LIKE ?)`;
      params.push(`%${location}%`, `%${location}%`);
    }

    query += ` ORDER BY sm.timestamp DESC`;

    const offset = (Number(page) - 1) * Number(limit);
    query += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const movements = db.prepare(query).all(...params);

    const counts = db.prepare(`
      SELECT 
        movement_type,
        COUNT(*) as count,
        SUM(quantity) as total_units
      FROM stock_movements
      GROUP BY movement_type
    `).all();

    res.json({
      success: true,
      data: movements,
      type_summary: counts
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
