import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// GET /api/picking/tasks - List active picking tasks
router.get('/tasks', (req, res) => {
  try {
    const tasks = db.prepare(`
      SELECT 
        pt.*,
        o.order_number,
        o.customer_name,
        o.priority as order_priority,
        p.sku,
        p.name as product_name,
        p.category,
        p.weight_category,
        p.unit_type,
        b.location_code,
        b.bin_code,
        b.x_coord,
        b.y_coord,
        r.row_code
      FROM picking_tasks pt
      JOIN orders o ON pt.order_id = o.id
      JOIN products p ON pt.product_id = p.id
      JOIN bins b ON pt.bin_id = b.id
      JOIN rows r ON b.row_id = r.id
      ORDER BY 
        CASE pt.step_status 
          WHEN 'completed' THEN 2 
          ELSE 1 
        END,
        o.priority = 'urgent' DESC,
        pt.created_at ASC
    `).all();

    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/picking/active - Get current active task for worker handheld
router.get('/active', (req, res) => {
  try {
    const activeTask = db.prepare(`
      SELECT 
        pt.*,
        o.order_number,
        o.customer_name,
        o.priority as order_priority,
        p.sku,
        p.name as product_name,
        p.category,
        p.weight_category,
        p.weight_kg,
        p.is_fragile,
        p.unit_type,
        b.location_code,
        b.bin_code,
        b.x_coord,
        b.y_coord,
        r.row_code,
        i.quantity as current_bin_qty,
        (i.quantity - i.reserved_quantity) as available_bin_qty,
        i.batch_number,
        i.received_at
      FROM picking_tasks pt
      JOIN orders o ON pt.order_id = o.id
      JOIN products p ON pt.product_id = p.id
      JOIN bins b ON pt.bin_id = b.id
      JOIN rows r ON b.row_id = r.id
      LEFT JOIN inventory i ON (i.bin_id = pt.bin_id AND i.product_id = pt.product_id)
      WHERE pt.step_status != 'completed'
      ORDER BY o.priority = 'urgent' DESC, pt.created_at ASC
      LIMIT 1
    `).get();

    if (!activeTask) {
      return res.json({ success: true, data: null, message: 'NO ACTIVE TASKS' });
    }

    res.json({ success: true, data: activeTask });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/picking/verify-scan - Validate scanned location code or product SKU
router.post('/verify-scan', (req, res) => {
  try {
    const { taskId, scanType, scannedValue } = req.body;

    const task = db.prepare(`
      SELECT 
        pt.*,
        p.sku,
        b.location_code
      FROM picking_tasks pt
      JOIN products p ON pt.product_id = p.id
      JOIN bins b ON pt.bin_id = b.id
      WHERE pt.id = ?
    `).get(taskId);

    if (!task) {
      return res.status(404).json({ success: false, error: 'Picking task not found' });
    }

    const cleanScanned = (scannedValue || '').trim().toUpperCase();

    if (scanType === 'bin') {
      const cleanExpected = task.location_code.trim().toUpperCase();
      if (cleanScanned === cleanExpected) {
        db.prepare(`UPDATE picking_tasks SET scanned_bin_code = ?, step_status = 'verify_sku' WHERE id = ?`).run(cleanScanned, taskId);
        return res.json({
          success: true,
          match: true,
          message: '✓ CORRECT BIN LOCATION',
          locationCode: task.location_code
        });
      } else {
        return res.status(400).json({
          success: false,
          match: false,
          errorType: 'WRONG_LOCATION',
          message: `⚠ WRONG LOCATION\nExpected: ${cleanExpected}\nScanned: ${cleanScanned}`,
          expectedLocation: cleanExpected,
          scannedLocation: cleanScanned
        });
      }
    } else if (scanType === 'sku') {
      const cleanExpected = task.sku.trim().toUpperCase();
      if (cleanScanned === cleanExpected) {
        db.prepare(`UPDATE picking_tasks SET scanned_sku = ?, step_status = 'confirm_quantity' WHERE id = ?`).run(cleanScanned, taskId);
        return res.json({
          success: true,
          match: true,
          message: '✓ SKU MATCH VERIFIED',
          sku: task.sku
        });
      } else {
        return res.status(400).json({
          success: false,
          match: false,
          errorType: 'WRONG_PRODUCT',
          message: `⚠ WRONG PRODUCT\nExpected SKU: ${cleanExpected}\nScanned: ${cleanScanned}`,
          expectedSku: cleanExpected,
          scannedSku: cleanScanned
        });
      }
    } else {
      return res.status(400).json({ success: false, error: 'Invalid scanType' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/picking/complete - Atomic Pick Transaction & Movement Ledger Entry
router.post('/complete', (req, res) => {
  try {
    const { taskId, workerName = 'Worker 04', confirmedQuantity } = req.body;

    const task = db.prepare(`
      SELECT 
        pt.*,
        o.order_number,
        p.sku,
        p.name as product_name,
        p.min_stock,
        b.location_code
      FROM picking_tasks pt
      JOIN orders o ON pt.order_id = o.id
      JOIN products p ON pt.product_id = p.id
      JOIN bins b ON pt.bin_id = b.id
      WHERE pt.id = ?
    `).get(taskId);

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    if (task.step_status === 'completed') {
      return res.status(400).json({ success: false, error: 'Task is already marked completed' });
    }

    const qtyToPick = Number(confirmedQuantity) || task.quantity_to_pick;

    // ATOMIC TRANSACTION:
    // 1. Check current inventory in target bin
    // 2. Decrement physical quantity & reserved quantity
    // 3. Mark task completed
    // 4. Mark order item picked
    // 5. Append outward stock movement log
    // 6. Check if order is fully completed
    const pickTx = db.transaction(() => {
      const invRecord = db.prepare(`
        SELECT * FROM inventory
        WHERE bin_id = ? AND product_id = ?
        ORDER BY received_at ASC
        LIMIT 1
      `).get(task.bin_id, task.product_id);

      if (!invRecord) {
        throw new Error(`Inventory not found in location ${task.location_code}`);
      }

      if (invRecord.quantity < qtyToPick) {
        throw new Error(`Insufficient stock in bin! Available: ${invRecord.quantity}, Requested: ${qtyToPick}`);
      }

      const newQty = invRecord.quantity - qtyToPick;
      const newReserved = Math.max(0, invRecord.reserved_quantity - qtyToPick);
      const newStatus = (newQty - newReserved) <= 0 ? 'out_of_stock' : ((newQty - newReserved) <= task.min_stock ? 'low_stock' : 'healthy');

      // Update inventory
      db.prepare(`
        UPDATE inventory
        SET 
          quantity = ?,
          reserved_quantity = ?,
          stock_status = ?,
          last_movement_at = datetime('now'),
          last_movement_by = ?
        WHERE id = ?
      `).run(newQty, newReserved, newStatus, workerName, invRecord.id);

      // Complete picking task
      db.prepare(`
        UPDATE picking_tasks
        SET 
          step_status = 'completed',
          assigned_worker = ?,
          completed_at = datetime('now')
        WHERE id = ?
      `).run(workerName, taskId);

      // Update order item
      db.prepare(`
        UPDATE order_items
        SET status = 'picked'
        WHERE id = ?
      `).run(task.order_item_id);

      // Check if all tasks in order are now completed
      const remainingTasks = db.prepare(`
        SELECT COUNT(*) as remaining FROM picking_tasks
        WHERE order_id = ? AND step_status != 'completed'
      `).get(task.order_id);

      if (remainingTasks.remaining === 0) {
        db.prepare(`UPDATE orders SET status = 'packed', updated_at = datetime('now') WHERE id = ?`).run(task.order_id);
      }

      // Log Outward Movement
      const movementId = `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      db.prepare(`
        INSERT INTO stock_movements (id, timestamp, product_id, sku, from_location_code, to_location_code, quantity, movement_type, order_id, worker_name, reason)
        VALUES (?, datetime('now'), ?, ?, ?, ?, ?, 'outward', ?, ?, ?)
      `).run(
        movementId,
        task.product_id,
        task.sku,
        task.location_code,
        task.order_number,
        qtyToPick,
        task.order_id,
        workerName,
        `Picked for ${task.order_number} by ${workerName}`
      );

      // If stock reached low or zero, log alert
      if (newStatus === 'low_stock' || newStatus === 'out_of_stock') {
        const alertId = `alt-${Date.now()}`;
        db.prepare(`
          INSERT INTO alerts (id, type, severity, title, message, reference_code)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          alertId,
          newStatus,
          newStatus === 'out_of_stock' ? 'critical' : 'warning',
          `${newStatus === 'out_of_stock' ? 'Out of Stock' : 'Low Stock Warning'}: ${task.product_name}`,
          `${task.sku} reduced to ${newQty} units in ${task.location_code} after picking for ${task.order_number}`,
          task.sku
        );
      }

      return {
        previousQuantity: invRecord.quantity,
        newQuantity: newQty,
        unitsRemoved: qtyToPick,
        movementId,
        orderStatus: remainingTasks.remaining === 0 ? 'packed' : 'picking'
      };
    });

    const result = pickTx();

    // Broadcast SSE update
    req.app.get('broadcastUpdate')?.({
      type: 'PICK_COMPLETED',
      sku: task.sku,
      locationCode: task.location_code,
      orderNumber: task.order_number,
      unitsRemoved: result.unitsRemoved,
      newQuantity: result.newQuantity,
      workerName
    });

    res.json({
      success: true,
      message: `✓ PICK VERIFIED: ${result.unitsRemoved} units removed. Inventory: ${result.previousQuantity} → ${result.newQuantity}`,
      data: {
        task_id: taskId,
        sku: task.sku,
        product_name: task.product_name,
        location_code: task.location_code,
        units_picked: result.unitsRemoved,
        previous_stock: result.previousQuantity,
        current_stock: result.newQuantity,
        order_status: result.orderStatus,
        last_known_location: {
          location_code: task.location_code,
          updated_at: new Date().toISOString(),
          last_movement: 'Picked for fulfillment',
          by: workerName
        }
      }
    });
  } catch (error) {
    console.error('Pick completion error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
