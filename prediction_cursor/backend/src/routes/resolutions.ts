import { Router } from 'express';
import db from '../db/database';
import { resolveMarket } from '../services/resolutionService';

const router = Router();

/**
 * Get resolution proof for a market
 */
router.get('/:marketId', (req, res) => {
  try {
    const resolution = db.prepare(`
      SELECT r.*, m.title as market_title, m.description as market_description,
             m.resolution_criteria, m.closes_at
      FROM resolutions r
      JOIN markets m ON r.market_id = m.id
      WHERE r.market_id = ?
    `).get(req.params.marketId) as any;

    if (!resolution) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Resolution not found for this market'
      });
    }

    res.json({
      ...resolution,
      source_response: JSON.parse(resolution.source_response),
      calculation_steps: JSON.parse(resolution.calculation_steps),
      resolution_criteria: JSON.parse(resolution.resolution_criteria)
    });
  } catch (error: any) {
    res.status(500).json({ error: 'DatabaseError', message: error.message });
  }
});

/**
 * Manually resolve a market (admin only in production)
 */
router.post('/:marketId/resolve', async (req, res) => {
  try {
    const { outcome, resolved_by } = req.body;

    if (!['YES', 'NO'].includes(outcome)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'outcome must be YES or NO'
      });
    }

    // Check if market exists and is not already resolved
    const market = db.prepare('SELECT * FROM markets WHERE id = ?').get(req.params.marketId) as any;

    if (!market) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Market not found'
      });
    }

    if (market.status === 'resolved') {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Market is already resolved'
      });
    }

    // Resolve the market
    const result = await resolveMarket(req.params.marketId, outcome, resolved_by || 'manual');

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'ResolutionError', message: error.message });
  }
});

/**
 * Get all resolved markets with their resolutions
 */
router.get('/', (req, res) => {
  try {
    const resolutions = db.prepare(`
      SELECT r.*, m.title as market_title, m.category
      FROM resolutions r
      JOIN markets m ON r.market_id = m.id
      ORDER BY r.resolved_at DESC
    `).all() as any[];

    const parsedResolutions = resolutions.map(r => ({
      ...r,
      source_response: JSON.parse(r.source_response),
      calculation_steps: JSON.parse(r.calculation_steps)
    }));

    res.json(parsedResolutions);
  } catch (error: any) {
    res.status(500).json({ error: 'DatabaseError', message: error.message });
  }
});

export default router;
