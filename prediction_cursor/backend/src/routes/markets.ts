import { Router } from 'express';
import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { getYesPrice, getNoPrice, initializeMarketStateWithProbability } from '../services/ammEngine';

const router = Router();

/**
 * Search markets by title (internal use)
 */
router.get('/search/:query', (req, res) => {
  try {
    const query = `%${req.params.query}%`;
    const markets = db.prepare(`
      SELECT id, title, description, category, status 
      FROM markets 
      WHERE title LIKE ? 
      ORDER BY created_at DESC
    `).all(query);
    res.json(markets);
  } catch (error: any) {
    res.status(500).json({ error: 'DatabaseError', message: error.message });
  }
});

/**
 * Get all markets with computed prices
 */
router.get('/', (req, res) => {
  try {
    const { status, category } = req.query;
    
    let query = 'SELECT * FROM markets WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC';

    const markets = db.prepare(query).all(...params) as any[];

    // Add computed prices and mini price history
    const marketsWithPrices = markets.map(market => {
      const yesPrice = getYesPrice(market);
      const noPrice = getNoPrice(market);
      
      // Get volume (sum of all transactions)
      const volume = db.prepare(`
        SELECT COALESCE(SUM(total_cost), 0) as total
        FROM transactions WHERE market_id = ?
      `).get(market.id) as any;

      // Get mini price history (last 20 points for sparkline)
      const priceHistory = db.prepare(`
        SELECT yes_price, timestamp
        FROM price_history
        WHERE market_id = ?
        ORDER BY timestamp DESC
        LIMIT 20
      `).all(market.id) as any[];

      return {
        ...market,
        resolution_criteria: JSON.parse(market.resolution_criteria),
        yes_price: yesPrice,
        no_price: noPrice,
        volume: volume.total,
        price_history: priceHistory.reverse() // Chronological order
      };
    });

    res.json(marketsWithPrices);
  } catch (error: any) {
    res.status(500).json({ error: 'DatabaseError', message: error.message });
  }
});

/**
 * Get markets created by a user
 */
router.get('/user/:userId', (req, res) => {
  try {
    const markets = db.prepare(`
      SELECT * FROM markets 
      WHERE created_by = ?
      ORDER BY created_at DESC
    `).all(req.params.userId) as any[];

    const marketsWithPrices = markets.map(market => {
      const yesPrice = getYesPrice(market);
      const noPrice = getNoPrice(market);
      
      const volume = db.prepare(`
        SELECT COALESCE(SUM(total_cost), 0) as total
        FROM transactions WHERE market_id = ?
      `).get(market.id) as any;

      return {
        ...market,
        resolution_criteria: JSON.parse(market.resolution_criteria),
        yes_price: yesPrice,
        no_price: noPrice,
        volume: volume.total
      };
    });

    res.json(marketsWithPrices);
  } catch (error: any) {
    res.status(500).json({ error: 'DatabaseError', message: error.message });
  }
});

/**
 * Get a single market by ID
 */
router.get('/:id', (req, res) => {
  try {
    const market = db.prepare('SELECT * FROM markets WHERE id = ?').get(req.params.id) as any;

    if (!market) {
      return res.status(404).json({ error: 'NotFound', message: 'Market not found' });
    }

    const yesPrice = getYesPrice(market);
    const noPrice = getNoPrice(market);

    // Get volume
    const volume = db.prepare(`
      SELECT COALESCE(SUM(total_cost), 0) as total
      FROM transactions WHERE market_id = ?
    `).get(market.id) as any;

    // Get price history
    const priceHistory = db.prepare(`
      SELECT yes_price, no_price, timestamp
      FROM price_history
      WHERE market_id = ?
      ORDER BY timestamp ASC
    `).all(market.id);

    // Get recent transactions
    const recentTransactions = db.prepare(`
      SELECT t.*, u.username
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.market_id = ?
      ORDER BY t.created_at DESC
      LIMIT 10
    `).all(market.id);

    res.json({
      ...market,
      resolution_criteria: JSON.parse(market.resolution_criteria),
      yes_price: yesPrice,
      no_price: noPrice,
      volume: volume.total,
      price_history: priceHistory,
      recent_transactions: recentTransactions
    });
  } catch (error: any) {
    res.status(500).json({ error: 'DatabaseError', message: error.message });
  }
});

/**
 * Create a new market
 */
router.post('/', (req, res) => {
  try {
    const {
      template_id,
      title,
      description,
      category,
      resolution_source,
      resolution_criteria,
      created_by,
      closes_at,
      initial_liquidity = 100
    } = req.body;

    // Validation
    if (!title || !description || !category || !resolution_source || !resolution_criteria || !created_by || !closes_at) {
      return res.status(400).json({ 
        error: 'ValidationError', 
        message: 'Missing required fields' 
      });
    }

    const closesAtDate = new Date(closes_at);
    if (closesAtDate <= new Date()) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Closing date must be in the future'
      });
    }

    const marketId = uuidv4();
    
    // For LMSR: initial_liquidity is the 'b' parameter (liquidity depth)
    // Starting with q_yes = 0, q_no = 0 gives 50/50 probability
    // Higher 'b' = more liquidity, less price impact per trade
    const initialState = {
      total_yes_shares: 0,  // q_yes
      total_no_shares: 0,   // q_no
      liquidity_pool: initial_liquidity  // b parameter
    };
    
    const yesPrice = getYesPrice(initialState);
    const noPrice = getNoPrice(initialState);

    db.prepare(`
      INSERT INTO markets (
        id, template_id, title, description, category,
        resolution_source, resolution_criteria, created_by,
        closes_at, total_yes_shares, total_no_shares, liquidity_pool, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      marketId,
      template_id || null,
      title,
      description,
      category,
      resolution_source,
      JSON.stringify(resolution_criteria),
      created_by,
      closes_at,
      initialState.total_yes_shares,
      initialState.total_no_shares,
      initialState.liquidity_pool,
      'open'
    );

    // Add initial price history entry
    db.prepare(`
      INSERT INTO price_history (id, market_id, yes_price, no_price)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), marketId, yesPrice, noPrice);

    const newMarket = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId);

    res.status(201).json({
      ...newMarket,
      resolution_criteria: JSON.parse((newMarket as any).resolution_criteria),
      yes_price: yesPrice,
      no_price: noPrice
    });
  } catch (error: any) {
    res.status(500).json({ error: 'DatabaseError', message: error.message });
  }
});

/**
 * Update market metadata (title, description)
 */
router.patch('/:id', (req, res) => {
  try {
    const { title, description, category } = req.body;
    const marketId = req.params.id;

    // Check if market exists
    const market = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId) as any;
    if (!market) {
      return res.status(404).json({ error: 'NotFound', message: 'Market not found' });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'ValidationError', message: 'No fields to update' });
    }

    params.push(marketId);
    db.prepare(`UPDATE markets SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updatedMarket = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId) as any;
    
    res.json({
      ...updatedMarket,
      resolution_criteria: JSON.parse(updatedMarket.resolution_criteria),
      yes_price: getYesPrice(updatedMarket),
      no_price: getNoPrice(updatedMarket)
    });
  } catch (error: any) {
    res.status(500).json({ error: 'DatabaseError', message: error.message });
  }
});

/**
 * Get market statistics
 */
router.get('/:id/stats', (req, res) => {
  try {
    const market = db.prepare('SELECT * FROM markets WHERE id = ?').get(req.params.id) as any;

    if (!market) {
      return res.status(404).json({ error: 'NotFound', message: 'Market not found' });
    }

    // Total traders
    const traders = db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM transactions WHERE market_id = ?
    `).get(req.params.id) as any;

    // Total volume
    const volume = db.prepare(`
      SELECT COALESCE(SUM(total_cost), 0) as total
      FROM transactions WHERE market_id = ?
    `).get(req.params.id) as any;

    // Transaction count
    const transactionCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM transactions WHERE market_id = ?
    `).get(req.params.id) as any;

    // Position holders
    const positionHolders = db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM positions WHERE market_id = ? AND shares > 0
    `).get(req.params.id) as any;

    res.json({
      traders: traders.count,
      volume: volume.total,
      transactions: transactionCount.count,
      position_holders: positionHolders.count
    });
  } catch (error: any) {
    res.status(500).json({ error: 'DatabaseError', message: error.message });
  }
});

/**
 * Get market updates
 */
router.get('/:id/updates', (req, res) => {
  try {
    const updates = db.prepare(`
      SELECT mu.*, u.username
      FROM market_updates mu
      JOIN users u ON mu.user_id = u.id
      WHERE mu.market_id = ?
      ORDER BY mu.created_at DESC
    `).all(req.params.id);

    res.json(updates);
  } catch (error: any) {
    res.status(500).json({ error: 'DatabaseError', message: error.message });
  }
});

/**
 * Post a market update
 */
router.post('/:id/updates', (req, res) => {
  try {
    const { user_id, update_type, content, media_url } = req.body;
    const marketId = req.params.id;

    // Verify market exists and user is the creator
    const market = db.prepare('SELECT created_by FROM markets WHERE id = ?').get(marketId) as any;
    
    if (!market) {
      return res.status(404).json({ error: 'NotFound', message: 'Market not found' });
    }

    if (market.created_by !== user_id) {
      return res.status(403).json({ error: 'Forbidden', message: 'Only the market creator can post updates' });
    }

    const updateId = uuidv4();
    
    db.prepare(`
      INSERT INTO market_updates (id, market_id, user_id, update_type, content, media_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(updateId, marketId, user_id, update_type || 'text', content, media_url || null);

    const newUpdate = db.prepare('SELECT * FROM market_updates WHERE id = ?').get(updateId);

    res.status(201).json(newUpdate);
  } catch (error: any) {
    res.status(500).json({ error: 'DatabaseError', message: error.message });
  }
});

export default router;
