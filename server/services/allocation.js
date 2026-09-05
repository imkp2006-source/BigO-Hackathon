import { db } from '../db.js';

/**
 * Intelligent Bin Selection Engine
 * Evaluates all candidate bins holding the requested SKU and chooses the optimal pick source.
 * Produces transparent 'WHY THIS BIN?' human-readable explanations.
 */
export function allocateBinForSku(productId, requestedQuantity) {
  // Query all candidate inventory rows for this product with available stock
  const candidates = db.prepare(`
    SELECT 
      i.id as inventory_id,
      i.bin_id,
      i.quantity,
      i.reserved_quantity,
      (i.quantity - i.reserved_quantity) as available_quantity,
      i.batch_number,
      i.received_at,
      b.bin_code,
      b.location_code,
      b.x_coord,
      b.y_coord,
      r.row_code,
      r.congestion_level
    FROM inventory i
    JOIN bins b ON i.bin_id = b.id
    JOIN rows r ON b.row_id = r.id
    WHERE i.product_id = ? AND (i.quantity - i.reserved_quantity) > 0
    ORDER BY i.received_at ASC
  `).all(productId);

  if (!candidates || candidates.length === 0) {
    return {
      allocated: false,
      reason: 'No stock available in any location',
      bin: null,
      reasonsList: []
    };
  }

  // Find oldest arrival date among candidates for relative FIFO comparison
  const oldestArrival = new Date(candidates[0].received_at).getTime();

  // Score each candidate bin
  const scored = candidates.map(c => {
    let score = 100;
    const reasons = [];

    const available = c.available_quantity;
    const arrivalTime = new Date(c.received_at).getTime();
    const daysAgo = Math.max(1, Math.round((Date.now() - arrivalTime) / (1000 * 60 * 60 * 24)));

    // 1. Stock fulfillment check
    if (available >= requestedQuantity) {
      score += 40;
      reasons.push(`✓ Enough available stock (${available} available, need ${requestedQuantity})`);
    } else {
      score -= 30;
      reasons.push(`⚠ Partial stock only (${available} available)`);
    }

    // 2. FIFO priority: Earlier batch gets high bonus
    if (arrivalTime <= oldestArrival + 86400000) { // within 24h of oldest
      score += 50;
      reasons.push(`✓ Oldest eligible batch (FIFO - received ${daysAgo}d ago, Batch ${c.batch_number})`);
    } else {
      score -= 15;
      reasons.push(`• Newer batch (received ${daysAgo}d ago, Batch ${c.batch_number})`);
    }

    // 3. Row Congestion check
    if (c.congestion_level === 'clear') {
      score += 20;
      reasons.push(`✓ Row ${c.row_code} traffic is clear`);
    } else if (c.congestion_level === 'moderate') {
      score += 5;
      reasons.push(`• Moderate traffic in Row ${c.row_code}`);
    } else {
      score -= 25;
      reasons.push(`⚠ High congestion hotspot in Row ${c.row_code}`);
    }

    // 4. Reserved stock isolation
    if (c.reserved_quantity === 0) {
      reasons.push(`✓ Zero reserved stock contention`);
    } else {
      reasons.push(`• ${c.reserved_quantity} units currently reserved for other orders`);
    }

    return {
      ...c,
      score,
      reasons
    };
  });

  // Sort by highest score first
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];

  return {
    allocated: true,
    bin: best,
    allocatedQuantity: Math.min(best.available_quantity, requestedQuantity),
    reasonsList: best.reasons,
    allCandidates: scored
  };
}
