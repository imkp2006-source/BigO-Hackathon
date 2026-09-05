import express from 'express';
import { demoScenariosList, resetToDemoState } from '../demoScenarios.js';

const router = express.Router();

// GET /api/demo/cases - List all 10 intentional demo scenarios
router.get('/cases', (req, res) => {
  res.json({ success: true, data: demoScenariosList });
});

// POST /api/demo/reset - Instantly reset database to clean 100% pre-seeded demo state
router.post('/reset', (req, res) => {
  try {
    const result = resetToDemoState();

    req.app.get('broadcastUpdate')?.({
      type: 'DEMO_RESET',
      message: 'Demo dataset restored to initial state.'
    });

    res.json({ success: true, message: result.message });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
