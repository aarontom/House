import { Router } from 'express';
import { getQuote, executeBuyTrade, executeSellTrade, getUserPositions } from '../services/tradingService';

const router = Router();

/**
 * Get a quote for a trade
 */
router.post('/quote', (req, res) => {
  try {
    const { market_id, position_type, amount, action } = req.body;

    if (!market_id || !position_type || !amount || !action) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Missing required fields: market_id, position_type, amount, action'
      });
    }

    if (!['YES', 'NO'].includes(position_type)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'position_type must be YES or NO'
      });
    }

    if (!['BUY', 'SELL'].includes(action)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'action must be BUY or SELL'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'amount must be greater than 0'
      });
    }

    const quote = getQuote({
      marketId: market_id,
      positionType: position_type,
      amount: parseFloat(amount),
      action
    });

    res.json(quote);
  } catch (error: any) {
    res.status(400).json({ error: 'TradeError', message: error.message });
  }
});

/**
 * Execute a buy trade
 */
router.post('/buy', (req, res) => {
  try {
    const { market_id, user_id, position_type, amount } = req.body;

    if (!market_id || !user_id || !position_type || !amount) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Missing required fields: market_id, user_id, position_type, amount'
      });
    }

    if (!['YES', 'NO'].includes(position_type)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'position_type must be YES or NO'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'amount must be greater than 0'
      });
    }

    const result = executeBuyTrade({
      marketId: market_id,
      userId: user_id,
      positionType: position_type,
      amount: parseFloat(amount),
      action: 'BUY'
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: 'TradeError', message: error.message });
  }
});

/**
 * Execute a sell trade
 */
router.post('/sell', (req, res) => {
  try {
    const { market_id, user_id, position_type, shares } = req.body;

    if (!market_id || !user_id || !position_type || !shares) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Missing required fields: market_id, user_id, position_type, shares'
      });
    }

    if (!['YES', 'NO'].includes(position_type)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'position_type must be YES or NO'
      });
    }

    if (shares <= 0) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'shares must be greater than 0'
      });
    }

    const result = executeSellTrade({
      marketId: market_id,
      userId: user_id,
      positionType: position_type,
      amount: parseFloat(shares),
      action: 'SELL'
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: 'TradeError', message: error.message });
  }
});

/**
 * Get user's positions
 */
router.get('/positions/:userId', (req, res) => {
  try {
    const { marketId } = req.query;
    const positions = getUserPositions(
      req.params.userId,
      marketId as string | undefined
    );
    res.json(positions);
  } catch (error: any) {
    res.status(500).json({ error: 'DatabaseError', message: error.message });
  }
});

export default router;
