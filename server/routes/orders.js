import express from 'express';
import { db } from '../db.js';
import { allocateBinForSku } from '../services/allocation.js';
import { optimizePickRoute } from '../services/routing.js';

const router = express.Router();

// GET /api/orders - List all orders with items and status
router.get('/', (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT 
        o.*,
        COUNT(oi.id) as line_item_count,
        SUM(oi.quantity_ordered) as total_units_ordered,
        SUM(oi.quantity_allocated) as total_units_allocated
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id
      ORDER BY 
        CASE o.status 
          WHEN 'allocated' THEN 1 
          WHEN 'picking' THEN 2 
          WHEN 'pending' THEN 3 
          ELSE 4 
        END,
        o.created_at DESC
    `).all();

    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/orders/:id - Detailed order intake view with exact location allocation & route
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const order = db.prepare(`SELECT * FROM orders WHERE id = ? OR order_number = ?`).get(id, id);
    if (!order) {
      return res.status(404).json({ success: false, error: `Order ${id} not found` });
    }

    const items = db.prepare(`
      SELECT 
        oi.*,
        p.sku,
        p.name as product_name,
        p.category,
        p.weight_category,
        p.weight_kg,
        p.unit_type,
        b.location_code,
        b.bin_code,
        b.x_coord,
        b.y_coord,
        r.row_code,
        w.code as warehouse_code
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN bins b ON oi.allocated_bin_id = b.id
      LEFT JOIN rows r ON b.row_id = r.id
      LEFT JOIN warehouses w ON r.warehouse_id = w.id
      WHERE oi.order_id = ?
    `).all(order.id);

    // Get picking tasks associated with this order
    const pickingTasks = db.prepare(`
      SELECT 
        pt.*,
        p.sku,
        p.name as product_name,
        b.location_code,
        b.bin_code
      FROM picking_tasks pt
      JOIN products p ON pt.product_id = p.id
      JOIN bins b ON pt.bin_id = b.id
      WHERE pt.order_id = ?
      ORDER BY pt.created_at ASC
    `).all(order.id);

    // Compute optimized pick route for allocated items
    const route = optimizePickRoute(items.filter(i => i.allocated_bin_id));

    res.json({
      success: true,
      data: {
        order,
        items,
        pickingTasks,
        route
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/orders - Create new order and run instant intelligent location allocation
router.post('/', (req, res) => {
  try {
    const { customer_name, priority = 'normal', items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Order must contain at least one item' });
    }

    const orderId = `ord-${Date.now()}`;
    const orderNumber = `ORDER #${Math.floor(10000 + Math.random() * 90000)}`;

    const createTransaction = db.transaction(() => {
      // 1. Insert order record
      db.prepare(`
        INSERT INTO orders (id, order_number, customer_name, status, priority, total_items)
        VALUES (?, ?, ?, 'allocated', ?, ?)
      `).run(orderId, orderNumber, customer_name || 'Express Direct Order', priority, items.length);

      const allocatedItems = [];
      const pickingTasksToCreate = [];

      // 2. Process each requested line item through the Intelligent Bin Selection Engine
      for (const item of items) {
        const { product_id, sku, quantity } = item;
        const targetQty = Number(quantity) || 1;

        // Find product
        const product = db.prepare(`SELECT * FROM products WHERE id = ? OR sku = ?`).get(product_id || sku, sku || product_id);
        if (!product) {
          throw new Error(`Product ${sku || product_id} not found in catalog`);
        }

        // Run Intelligent Allocation Engine
        const allocationResult = allocateBinForSku(product.id, targetQty);

        if (!allocationResult.allocated) {
          throw new Error(`Insufficient stock to fulfill ${product.name} (${product.sku})`);
        }

        const bestBin = allocationResult.bin;
        const itemId = `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const reasonText = allocationResult.reasonsList.join('; ');

        // Insert order_item
        db.prepare(`
          INSERT INTO order_items (id, order_id, product_id, quantity_ordered, allocated_bin_id, quantity_allocated, status, allocation_reason)
          VALUES (?, ?, ?, ?, ?, ?, 'allocated', ?)
        `).run(itemId, orderId, product.id, targetQty, bestBin.bin_id, allocationResult.allocatedQuantity, reasonText);

        // Reserve stock in inventory to prevent double allocation
        db.prepare(`
          UPDATE inventory 
          SET reserved_quantity = reserved_quantity + ?
          WHERE id = ?
        `).run(allocationResult.allocatedQuantity, bestBin.inventory_id);

        // Prepare picking task
        const taskId = `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        db.prepare(`
          INSERT INTO picking_tasks (id, order_id, order_item_id, bin_id, product_id, quantity_to_pick, unit_type, step_status, assigned_worker)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'navigate', 'Worker 01')
        `).run(taskId, orderId, itemId, bestBin.bin_id, product.id, allocationResult.allocatedQuantity, product.unit_type);

        allocatedItems.push({
          item_id: itemId,
          sku: product.sku,
          product_name: product.name,
          quantity_ordered: targetQty,
          allocated_location: bestBin.location_code,
          row_code: bestBin.row_code,
          bin_code: bestBin.bin_code,
          x_coord: bestBin.x_coord,
          y_coord: bestBin.y_coord,
          available_before: bestBin.available_quantity,
          reasons: allocationResult.reasonsList
        });
      }

      // Generate optimized route
      const route = optimizePickRoute(allocatedItems);

      return {
        order_id: orderId,
        order_number: orderNumber,
        allocated_items: allocatedItems,
        route
      };
    });

    const result = createTransaction();

    // Broadcast SSE update
    req.app.get('broadcastUpdate')?.({
      type: 'ORDER_CREATED',
      orderNumber: result.order_number,
      message: `New Order ${result.order_number} allocated across ${result.allocated_items.length} bins.`
    });

    res.status(201).json({
      success: true,
      message: `Order ${result.order_number} successfully allocated.`,
      data: result
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
