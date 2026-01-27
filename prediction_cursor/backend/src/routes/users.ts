import { Router } from 'express';
import db from '../db/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getYesPrice, getNoPrice } from '../services/ammEngine';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'prediction-market-secret-key';

/**
 * Register a new user
 */
router.post('/register', (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Missing required fields: username, email, password'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if user exists
    const existingUser = db.prepare(
      'SELECT id FROM users WHERE username = ? OR email = ?'
    ).get(username, email);

    if (existingUser) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Username or email already exists'
      });
    }

    const userId = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);

    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, balance)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, username, email, passwordHash, 1000);

    const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      user: {
        id: userId,
        username,
        email,
        balance: 1000
      },
      token
    });
  } catch (error: any) {
    res.status(500).json({ error: 'DatabaseError', message: error.message });
  }
});

/**
 * Login user
 */
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Missing required fields: email, password'
      });
    }

    const user = db.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).get(email) as any;

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({
        error: 'AuthError',
        message: 'Invalid email or password'
      });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        balance: user.balance
      },
      token
    });
  } catch (error: any) {
    res.status(500).json({ error: 'DatabaseError', message: error.message });
  }
});

/**
 * Get user profile
 */
router.get('/:id', (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, username, email, balance, created_at
      FROM users WHERE id = ?
    `).get(req.params.id) as any;

    if (!user) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'User not found'
      });
    }

    // Get user's positions
    const positions = db.prepare(`
      SELECT p.*, m.title as market_title, m.status as market_status,
             m.total_yes_shares, m.total_no_shares, m.liquidity_pool
      FROM positions p
      JOIN markets m ON p.market_id = m.id
      WHERE p.user_id = ?
    `).all(req.params.id) as any[];

    // Calculate total value using proper LMSR prices
    let totalValue = user.balance;
    const positionsWithValue = positions.map(p => {
      const marketState = {
        total_yes_shares: p.total_yes_shares,
        total_no_shares: p.total_no_shares,
        liquidity_pool: p.liquidity_pool
      };
      const currentPrice = p.position_type === 'YES'
        ? getYesPrice(marketState)
        : getNoPrice(marketState);
      const currentValue = p.shares * currentPrice;
      const costBasis = p.shares * p.avg_price;
      const pnl = currentValue - costBasis;
      totalValue += currentValue;
      return {
        ...p,
        current_price: currentPrice,
        current_value: currentValue,
        cost_basis: costBasis,
        pnl: pnl
      };
    });

    // Get recent transactions
    const recentTransactions = db.prepare(`
      SELECT t.*, m.title as market_title
      FROM transactions t
      JOIN markets m ON t.market_id = m.id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC
      LIMIT 20
    `).all(req.params.id);

    res.json({
      ...user,
      total_value: totalValue,
      positions: positionsWithValue,
      recent_transactions: recentTransactions
    });
  } catch (error: any) {
    res.status(500).json({ error: 'DatabaseError', message: error.message });
  }
});

/**
 * Get user's positions
 */
router.get('/:id/positions', (req, res) => {
  try {
    const positions = db.prepare(`
      SELECT p.*, m.title as market_title, m.status as market_status,
             m.total_yes_shares, m.total_no_shares, m.liquidity_pool, m.outcome, m.closes_at
      FROM positions p
      JOIN markets m ON p.market_id = m.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `).all(req.params.id) as any[];

    const positionsWithValue = positions.map(p => {
      // Use proper LMSR price calculation
      const marketState = {
        total_yes_shares: p.total_yes_shares,
        total_no_shares: p.total_no_shares,
        liquidity_pool: p.liquidity_pool
      };
      const currentPrice = p.position_type === 'YES'
        ? getYesPrice(marketState)
        : getNoPrice(marketState);
      
      const currentValue = p.shares * currentPrice;
      const costBasis = p.shares * p.avg_price;
      const pnl = currentValue - costBasis;

      return {
        ...p,
        current_price: currentPrice,
        current_value: currentValue,
        cost_basis: costBasis,
        pnl: pnl,
        potential_payout: p.shares // Each share pays $1 if market resolves in your favor
      };
    });

    res.json(positionsWithValue);
  } catch (error: any) {
    res.status(500).json({ error: 'DatabaseError', message: error.message });
  }
});

/**
 * Get user's transaction history
 */
router.get('/:id/transactions', (req, res) => {
  try {
    const transactions = db.prepare(`
      SELECT t.*, m.title as market_title
      FROM transactions t
      JOIN markets m ON t.market_id = m.id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC
    `).all(req.params.id);

    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: 'DatabaseError', message: error.message });
  }
});

export default router;
