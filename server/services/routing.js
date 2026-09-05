/**
 * Pick Route Optimization Service
 * Uses standard warehouse S-Shape traversal heuristic to minimize walking distance and eliminate zig-zagging.
 * Generates an ordered sequence of pick stops with distance, time, and polyline coordinates.
 */

// Warehouse reference coordinates:
// WH1 Layout:
// Row R01: Y = 100, Bins B01-B06: X = 100, 200, 300, 400, 500, 600
// Row R02: Y = 220, Bins B01-B06: X = 100, 200, 300, 400, 500, 600
// Row R03: Y = 340, Bins B01-B06: X = 100, 200, 300, 400, 500, 600
// Row R04: Y = 460, Bins B01-B06: X = 100, 200, 300, 400, 500, 600
// Start Dock: X = 40, Y = 60
// Packing Station: X = 660, Y = 500

export function optimizePickRoute(itemsWithLocations) {
  if (!itemsWithLocations || itemsWithLocations.length === 0) {
    return {
      stops: [],
      totalDistanceMeters: 0,
      estimatedPickTimeSeconds: 0,
      polylinePoints: []
    };
  }

  const startPoint = {
    stepNumber: 0,
    type: 'START_DOCK',
    label: 'Start Dock (Receiving / Staging)',
    location_code: 'DOCK-IN',
    x: 40,
    y: 60
  };

  const packingPoint = {
    stepNumber: itemsWithLocations.length + 1,
    type: 'PACKING_STATION',
    label: 'Fulfillment & Packing Station',
    location_code: 'PACK-01',
    x: 660,
    y: 500
  };

  // Group items by row for S-Shape traversal
  const byRow = {};
  itemsWithLocations.forEach(item => {
    const rowCode = item.row_code || (item.location_code ? item.location_code.split('-')[1] : 'R01');
    if (!byRow[rowCode]) byRow[rowCode] = [];
    byRow[rowCode].push(item);
  });

  const sortedRowKeys = Object.keys(byRow).sort(); // R01, R02, R03, R04
  const orderedStops = [];

  // Traverse rows in alternating directions (S-Shape) to avoid walking back and forth
  sortedRowKeys.forEach((rowKey, idx) => {
    const rowItems = byRow[rowKey];
    // Sort bins along the aisle
    rowItems.sort((a, b) => (a.x_coord || 0) - (b.x_coord || 0));

    // Even row index: left-to-right; odd row index: right-to-left
    if (idx % 2 === 1) {
      rowItems.reverse();
    }

    rowItems.forEach(item => {
      orderedStops.push({
        ...item,
        type: 'PICK_STOP',
        x: item.x_coord || 150,
        y: item.y_coord || 150
      });
    });
  });

  // Number the stops
  const numberedStops = orderedStops.map((stop, i) => ({
    ...stop,
    stopIndex: i + 1,
    stopLabel: String(i + 1).padStart(2, '0')
  }));

  // Calculate distance between sequential points
  let currentX = startPoint.x;
  let currentY = startPoint.y;
  let totalDistancePx = 0;

  const polylinePoints = [{ x: currentX, y: currentY, label: 'START' }];

  numberedStops.forEach(stop => {
    // Manhattan distance along warehouse pathways
    const dx = Math.abs(stop.x - currentX);
    const dy = Math.abs(stop.y - currentY);
    totalDistancePx += (dx + dy);
    currentX = stop.x;
    currentY = stop.y;
    polylinePoints.push({ x: currentX, y: currentY, label: stop.stopLabel, location_code: stop.location_code });
  });

  // Distance to packing station
  const dxFinal = Math.abs(packingPoint.x - currentX);
  const dyFinal = Math.abs(packingPoint.y - currentY);
  totalDistancePx += (dxFinal + dyFinal);
  polylinePoints.push({ x: packingPoint.x, y: packingPoint.y, label: 'PACK' });

  // Scale: ~10px = 1 meter in real warehouse simulation
  const totalDistanceMeters = Math.round(totalDistancePx / 8);
  // Average worker speed 1.2 m/s + 20s per item pick & scan verification
  const walkingTimeSeconds = Math.round(totalDistanceMeters / 1.2);
  const pickHandlingTimeSeconds = numberedStops.length * 20;
  const estimatedPickTimeSeconds = walkingTimeSeconds + pickHandlingTimeSeconds;

  return {
    startPoint,
    packingPoint,
    stops: numberedStops,
    totalStops: numberedStops.length,
    totalDistanceMeters,
    estimatedPickTimeSeconds,
    estimatedPickTimeMinutes: (estimatedPickTimeSeconds / 60).toFixed(1),
    polylinePoints
  };
}
