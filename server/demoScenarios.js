import { db } from './db.js';
import { seedDatabase } from './seed.js';

export const demoScenariosList = [
  {
    id: 1,
    key: 'case-1-multi-bin',
    title: 'CASE 1: Multi-Bin SKU',
    subtitle: 'One SKU across multiple physical locations',
    sku: 'SKU-103',
    description: 'SKU-103 (Logitech MX Master 3S) is distributed across WH1-R01-B04 (20 units), WH1-R02-B03 (35 units), and WH1-R03-B01 (10 units).'
  },
  {
    id: 2,
    key: 'case-2-fifo',
    title: 'CASE 2: FIFO Selection',
    subtitle: 'Oldest batch chosen first',
    sku: 'SKU-103',
    description: 'WH1-R02-B05 holds 30 units received 10 days ago (Oldest/FIFO), while WH1-R02-B06 holds 12 units received 2 days ago.'
  },
  {
    id: 3,
    key: 'case-3-split-putaway',
    title: 'CASE 3: Split Put-Away',
    subtitle: 'Shadow location prevention via multi-bin split',
    sku: 'SKU-204',
    description: 'Inbound 100 units of SKU-204: 70 placed into WH1-R01-B02, 30 into WH1-R01-B03. Total 100/100 Accounted For.'
  },
  {
    id: 4,
    key: 'case-4-phantom-inventory',
    title: 'CASE 4: Phantom Discrepancy',
    subtitle: 'Physical vs System quantity variance',
    sku: 'SKU-501',
    description: 'System records 10 units in WH1-R03-B04, physical count reveals 7 (-3 discrepancy reported and flagged).'
  },
  {
    id: 5,
    key: 'case-5-wrong-bin-scan',
    title: 'CASE 5: Wrong Bin Scan Error',
    subtitle: 'Pick prevention on location mismatch',
    expectedLocation: 'WH1-R02-B05',
    scannedLocation: 'WH1-R03-B02',
    description: 'Scanning wrong bin triggers instant loud visual/audio lockout: Expected WH1-R02-B05, Scanned WH1-R03-B02.'
  },
  {
    id: 6,
    key: 'case-6-verified-pick',
    title: 'CASE 6: Verified Pick Execution',
    subtitle: 'Order #10291 4-way matched pick',
    orderNumber: 'ORDER #10291',
    sku: 'SKU-103',
    description: 'Pick 2 individual units of SKU-103 from WH1-R02-B05. Inventory decrements 30 -> 28, logs audit ledger, updates last-known location.'
  },
  {
    id: 7,
    key: 'case-7-congestion-hotspot',
    title: 'CASE 7: Congestion Hotspot',
    subtitle: 'Row 03 high traffic heatmap simulation',
    rowCode: 'R03',
    description: 'Row 03 has heavy picking volume. Traversal algorithms deprioritize non-urgent picks in this aisle.'
  },
  {
    id: 8,
    key: 'case-8-movement-history',
    title: 'CASE 8: Full SKU Audit Trail',
    subtitle: 'Immutable accountability lifecycle',
    sku: 'SKU-103',
    description: 'Inspect full lifecycle: Inward (50) -> Transfer (20) -> Transfer (10) -> Picked (4) -> Return (1).'
  },
  {
    id: 9,
    key: 'case-9-low-stock',
    title: 'CASE 9: Low-Stock & Depletion Alerts',
    subtitle: 'Automatic threshold triggers',
    sku: 'SKU-305',
    description: 'SKU-305 (Anti-Static Mat) at 2 available vs minimum threshold 10 (Low Stock); SKU-409 at 0 (Out of Stock).'
  },
  {
    id: 10,
    key: 'case-10-returns-cart',
    title: 'CASE 10: Returns Staging Triage',
    subtitle: 'Quarantine before restocking',
    location: 'RETURNS-CART',
    sku: 'SKU-402',
    description: '5 units of SKU-402 in RETURNS-CART awaiting triage: click to inspect and restock to WH1-R02-B01 or scrap to QA-DAMAGED.'
  }
];

export function resetToDemoState() {
  seedDatabase();
  return { success: true, message: 'All 10 demo scenarios reset to default state.' };
}
