import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initSchema } from './db.js';

// Route imports
import inventoryRoutes from './routes/inventory.js';
import locationsRoutes from './routes/locations.js';
import ordersRoutes from './routes/orders.js';
import pickingRoutes from './routes/picking.js';
import movementsRoutes from './routes/movements.js';
import putawayRoutes from './routes/putaway.js';
import discrepanciesRoutes from './routes/discrepancies.js';
import transfersRoutes from './routes/transfers.js';
import returnsRoutes from './routes/returns.js';
import analyticsRoutes from './routes/analytics.js';
import searchRoutes from './routes/search.js';
import demoRoutes from './routes/demo.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize database schema
initSchema();

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());

// Server-Sent Events (SSE) Client Registry for Realtime Synchronization
let sseClients = [];

export function broadcastUpdate(eventData) {
  const payload = `data: ${JSON.stringify({ ...eventData, timestamp: new Date().toISOString() })}\n\n`;
  sseClients.forEach(client => {
    try {
      client.res.write(payload);
    } catch (err) {
      console.error('SSE send error:', err.message);
    }
  });
}

// Attach broadcaster to app instance so routes can trigger it
app.set('broadcastUpdate', broadcastUpdate);

// SSE Endpoint: /api/events
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  // Send initial connection handshake
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId, message: 'REALTIME STREAM ACTIVE' })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'LOGISTICS HUB Command Engine',
    timestamp: new Date().toISOString(),
    version: '1.0.0-hackathon'
  });
});

// Mount modular API routes
app.use('/api/inventory', inventoryRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/picking', pickingRoutes);
app.use('/api/movements', movementsRoutes);
app.use('/api/putaway', putawayRoutes);
app.use('/api/discrepancies', discrepanciesRoutes);
app.use('/api/transfers', transfersRoutes);
app.use('/api/returns', returnsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/demo', demoRoutes);

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve built frontend assets if present
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`
  ============================================================
  🚀 LOGISTICS HUB SERVER READY
  ============================================================
  Port:        http://localhost:${PORT}
  API Health:  http://localhost:${PORT}/api/health
  Events SSE:  http://localhost:${PORT}/api/events
  Status:      SYSTEM ONLINE / REALTIME ACTIVE
  ============================================================
  `);
});
