# ⚡ LOGISTICS HUB
### *Warehouse Intelligence & Precision Picking*
> **"Know the stock. Know the location. Know the next move."**

Built for **PS-3: E-Commerce Multi-Warehouse Inventory & Location Tracking System** (Pure Hard Development Problem).

---

## 🌟 Executive Product Vision

Traditional warehouse operations suffer from slow searching, unnecessary walking, wrong-pick errors, phantom inventory discrepancies, and shadow locations. **LOGISTICS HUB** bridges:

$$\text{Digital Inventory} \longrightarrow \text{Physical Warehouse} \longrightarrow \text{Warehouse Worker} \longrightarrow \text{Fulfillment}$$

Instead of relying on tribal knowledge, the system tells workers **exactly where to go, what to pick, how to get there, verifies the physical action, decrements stock atomically, and records an immutable movement audit trail.**

---

## 📐 Strict PS-3 Location Hierarchy

As strictly specified in official PS-3 requirements, the physical database hierarchy is exclusively:

$$\mathbf{Warehouse \longrightarrow Row \longrightarrow Bin}$$

* **Warehouse:** `WH1` (Central Fulfillment Command Hub)
* **Rows:** `R01`, `R02`, `R03`, `R04`
* **Bins:** `B01`, `B02`, `B03`, `B04`, `B05`, `B06` in each row
* **Unique Location Codes:** `WH1-R01-B01` through `WH1-R04-B06` (24 Physical Bins)
* **Virtual Transit Bays:** `RETURNS-CART` (Buffer staging for customer returns) and `QA-DAMAGED` (Quarantine for scrap)

> *Note:* In accordance with PS-3 guidelines, no Aisle, Rack, Shelf, or Level entities exist in the database hierarchy. Pathways are rendered purely for visual map navigation.

---

## 🎨 Visual Design & Command Center Theme

Inspired by enterprise industrial logistics command centers:
* **Background:** Deep near-black canvas (`#07090E`) with graphite panels (`#0E131E`)
* **Primary Accent:** Electric Cyan (`#00F0FF`) for active routes, selected bins, and priority actions
* **Semantic States:**
  * 🟢 **Green:** Available, Healthy Stock, Completed Verification
  * 🟡 **Yellow:** Low Stock Warning, Moderate Traffic, Attention Required
  * 🔴 **Red:** Critical Variance, Discrepancy Flag, Congestion Hotspot, Wrong Scan Lockout
  * ⚪ **Gray:** Empty Bin
  * 🔵 **Cyan Glow:** Active Traversal Route & Numbered Pick Stops

---

## 🛠️ Tech Stack & Architecture

| Layer | Technology | Key Capabilities |
|---|---|---|
| **Frontend** | **React 19 + Vite 8** | Modern reactive component architecture, Tailwind CSS v4, Lucide icons |
| **Backend** | **Node.js (v24) + Express 5** | RESTful modular routing, ACID transactions, Real-time SSE broadcaster |
| **Database** | **SQLite (WAL Mode) + Supabase DDL** | Zero-dependency local setup (`warehouse.db`) + `supabase_schema.sql` for PostgreSQL cloud deployment |
| **Realtime** | **Server-Sent Events (SSE)** | Live bidirectional push notifications synchronizing Desktop & Mobile simultaneously |
| **Audio Engine** | **Web Audio API Synth** | Real-time audio feedback: 1.4kHz scanner blip, dual-tone success chime, and 160Hz error buzzer |

---

## 📱 Dual-Screen Experience: Desktop vs Mobile Handheld

### 1. Desktop Warehouse Command Center (1280px+)
* **Interactive 2D Warehouse Map:** Visual grid with real-time stock levels, row traffic heatmaps, and animated cyan traversal paths.
* **Order Intake & Allocation Engine:** Generates instant Warehouse → Row → Bin pick plans with **"Why This Bin?"** transparent reasoning.
* **Slotting & Stock Operations:** Split Put-Away wizard, Bin-to-Bin stock transfers, and Discrepancy investigation.
* **Immutable Movement Ledger:** Cryptographic audit trail of all inward, outward, transfer, return, and adjustment events.

### 2. Mobile Handheld Worker Assistant (360px - 430px)
* **High-contrast, large touch targets** designed for physical warehouse lighting conditions.
* **5-Step Precision Pick Stepper:**
  1. **Navigate:** Walk to target row and bin.
  2. **Verify Bin:** Scanned barcode/QR validation with instant lockout on mismatch:
     $$\text{⚠ WRONG LOCATION: Expected } \mathbf{WH1\text{-}R02\text{-}B05} \text{, Scanned } \mathbf{WH1\text{-}R03\text{-}B02}$$
  3. **Verify SKU:** Scans product barcode to prevent picking wrong variants.
  4. **Confirm Quantity:** Explicit prompt: `"PICK: 2 INDIVIDUAL UNITS"` to eliminate mispack errors.
  5. **4-Way Match Completion:**
     $$\checkmark \text{ ORDER MATCH } \quad \checkmark \text{ BIN MATCH } \quad \checkmark \text{ SKU MATCH } \quad \checkmark \text{ QUANTITY MATCH}$$
  6. **Instant Sync:** Decrements live stock $30 \to 28$, updates order status, logs outward movement, updates last-known location, and triggers dashboard refresh.

---

## 🚀 The 10 Intentional Hackathon Demo Scenarios

Use the **HACKATHON DEMO RUNNER** banner at the top of the interface for 1-click execution:

| Case | Scenario | Description | Key Result |
|---|---|---|---|
| **1** | **Multi-Bin SKU** | `SKU-103` (Wireless Mouse) exists in multiple bins. | `WH1-R01-B04` (20), `WH1-R02-B03` (35), `WH1-R03-B01` (10). |
| **2** | **FIFO Selection** | Multiple batches of `SKU-103`. | System picks from `WH1-R02-B05` (10d ago, oldest) over `WH1-R02-B06` (2d ago). |
| **3** | **Split Put-Away** | Inward 100 units of `SKU-204` cannot fit in one bin. | Splits: 70 in `R01-B02`, 30 in `R01-B03` $\to$ **100/100 ACCOUNTED FOR ✓** (Zero shadow locations). |
| **4** | **Phantom Discrepancy** | Cycle count variance on `SKU-501`. | System: 10, Physical: 7 $\to$ Difference: -3. Flagged without silent overwrites. |
| **5** | **Wrong Bin Scan** | Worker scans `WH1-R03-B02` instead of `WH1-R02-B05`. | Instant red lockout banner & error buzzer. Progression blocked. |
| **6** | **Verified Pick Complete** | Order #10291 intake and fulfillment. | 4-way matched pick: stock drops $30 \to 28$, outward log created, live updates broadcast. |
| **7** | **Congestion Hotspot** | Heavy picking activity in Row 03. | R03 flagged with glowing red hotspot banner (+35% delay warning in routing). |
| **8** | **Full SKU Audit Trail** | Lifecycle inspection for `SKU-103`. | Timeline: Inward (50) $\to$ Transfer (20) $\to$ Transfer (10) $\to$ Picked (4) $\to$ Return (1). |
| **9** | **Low-Stock Alert** | Threshold tracking ($Avail \le MinStock$). | `SKU-305` triggers yellow warning (2 left, min 10); `SKU-409` triggers critical red (0 left). |
| **10** | **Returns Cart Triage** | 5 units of `SKU-402` in `RETURNS-CART`. | 1-Click QA triage: inspect and restock to `WH1-R02-B01` or scrap to `QA-DAMAGED`. |

---

## 🏃 Getting Started & Local Execution

### Prerequisites
* Node.js v18+ (tested on Node v24.15)
* npm

### Quick Start (1 Command)
```powershell
# From the root directory:
npm run build && npm start
```
Open **`http://localhost:5000`** in your browser to experience the complete application!

### Running in Development Mode
```powershell
# Terminal 1: Backend Server (Port 5000)
cd server
node index.js

# Terminal 2: Frontend Client (Port 3000 with hot reload)
cd client
npm run dev
```

### Seeding or Resetting Data
```powershell
# Seed or reset the 528 SKUs and demo cases:
node server/seed.js
```
*(You can also click the **Reset Demo Data** button directly in the application header at any time!)*

---

## 🔒 Supabase PostgreSQL Cloud Setup (Optional)
If deploying to Supabase:
1. Open your Supabase SQL Editor.
2. Run the DDL script located at `server/supabase_schema.sql`.
3. Add your Supabase URL and Anon Key into `server/.env`.

---

## 🏆 Summary
**LOGISTICS HUB** transforms warehouse management from passive tracking into an active, intelligent, and verifiable execution system.

*"Know the stock. Know the location. Know the next move."*
