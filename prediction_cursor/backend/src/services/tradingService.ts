import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import {
  getBuyQuote,
  getSellQuote,
  executeBuy,
  executeSell,
  getYesPrice,
  getNoPrice,
  MarketState
} from './ammEngine';

export interface TradeQuoteRequest {
  marketId: string;
  positionType: 'YES' | 'NO';
  amount: number;
  action: 'BUY' | 'SELL';
}

export interface TradeQuoteResponse {
  shares: number;
  pricePerShare: number;
  totalCost: number;
  priceImpact: number;
  newYesPrice: number;
  newNoPrice: number;
  currentYesPrice: number;
  currentNoPrice: number;
}

export interface TradeRequest extends TradeQuoteRequest {
  userId: string;
}

export interface TradeResponse {
  success: boolean;
  transactionId: string;
  shares: number;
  pricePerShare: number;
  totalCost: number;
  newBalance: number;
  position: {
    shares: number;
    avgPrice: number;
  };
}

/**
 * Get market state for AMM calculations
 */
function getMarketState(marketId: string): MarketState & { status: string } {
  const market = db.prepare(`
    SELECT total_yes_shares, total_no_shares, liquidity_pool, status
    FROM markets WHERE id = ?
  `).get(marketId) as any;

  if (!market) {
    throw new Error('Market not found');
  }

  return market;
}

/**
 * Get a quote for a trade without executing it
 */
export function getQuote(req: TradeQuoteRequest): TradeQuoteResponse {
  const market = getMarketState(req.marketId);

  if (market.status !== 'open') {
    throw new Error('Market is not open for trading');
  }

  const currentYesPrice = getYesPrice(market);
  const currentNoPrice = getNoPrice(market);

  let quote;
  if (req.action === 'BUY') {
    quote = getBuyQuote(market, req.positionType, req.amount);
  } else {
    quote = getSellQuote(market, req.positionType, req.amount);
  }

  return {
    shares: quote.shares,
    pricePerShare: quote.avgPricePerShare,
    totalCost: quote.totalCost,
    priceImpact: quote.priceImpact,
    newYesPrice: quote.newYesPrice,
    newNoPrice: quote.newNoPrice,
    currentYesPrice,
    currentNoPrice
  };
}

/**
 * Execute a buy trade
 */
export function executeBuyTrade(req: TradeRequest): TradeResponse {
  const market = getMarketState(req.marketId);

  if (market.status !== 'open') {
    throw new Error('Market is not open for trading');
  }

  // Get user balance
  const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.userId) as any;
  if (!user) {
    throw new Error('User not found');
  }

  if (user.balance < req.amount) {
    throw new Error('Insufficient balance');
  }

  // Execute the trade
  const result = executeBuy(market, req.positionType, req.amount);

  // Start transaction
  const updateMarket = db.prepare(`
    UPDATE markets 
    SET total_yes_shares = ?, total_no_shares = ?
    WHERE id = ?
  `);

  const updateBalance = db.prepare(`
    UPDATE users SET balance = balance - ? WHERE id = ?
  `);

  const getPosition = db.prepare(`
    SELECT id, shares, avg_price FROM positions 
    WHERE user_id = ? AND market_id = ? AND position_type = ?
  `);

  const insertPosition = db.prepare(`
    INSERT INTO positions (id, user_id, market_id, position_type, shares, avg_price)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const updatePosition = db.prepare(`
    UPDATE positions 
    SET shares = ?, avg_price = ?
    WHERE id = ?
  `);

  const insertTransaction = db.prepare(`
    INSERT INTO transactions (id, user_id, market_id, type, position_type, shares, price_per_share, total_cost)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPriceHistory = db.prepare(`
    INSERT INTO price_history (id, market_id, yes_price, no_price)
    VALUES (?, ?, ?, ?)
  `);

  const transactionId = uuidv4();
  
  // Execute all updates in a transaction
  const executeTransaction = db.transaction(() => {
    // Update market pools
    updateMarket.run(result.newYesShares, result.newNoShares, req.marketId);

    // Update user balance
    updateBalance.run(req.amount, req.userId);

    // Update or create position
    const existingPosition = getPosition.get(req.userId, req.marketId, req.positionType) as any;
    
    let newShares: number;
    let newAvgPrice: number;

    if (existingPosition) {
      // Calculate new average price
      const totalCost = (existingPosition.shares * existingPosition.avg_price) + req.amount;
      newShares = existingPosition.shares + result.shares;
      newAvgPrice = totalCost / newShares;
      updatePosition.run(newShares, newAvgPrice, existingPosition.id);
    } else {
      newShares = result.shares;
      newAvgPrice = result.avgPricePerShare;
      insertPosition.run(uuidv4(), req.userId, req.marketId, req.positionType, newShares, newAvgPrice);
    }

    // Record transaction
    insertTransaction.run(
      transactionId,
      req.userId,
      req.marketId,
      'BUY',
      req.positionType,
      result.shares,
      result.avgPricePerShare,
      req.amount
    );

    // Record price history using LMSR prices
    const newState = {
      total_yes_shares: result.newYesShares,
      total_no_shares: result.newNoShares,
      liquidity_pool: market.liquidity_pool
    };
    insertPriceHistory.run(
      uuidv4(),
      req.marketId,
      getYesPrice(newState),
      getNoPrice(newState)
    );

    return { newShares, newAvgPrice };
  });

  const positionResult = executeTransaction();

  // Get updated balance
  const updatedUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.userId) as any;

  return {
    success: true,
    transactionId,
    shares: result.shares,
    pricePerShare: result.avgPricePerShare,
    totalCost: req.amount,
    newBalance: updatedUser.balance,
    position: {
      shares: positionResult.newShares,
      avgPrice: positionResult.newAvgPrice
    }
  };
}

/**
 * Execute a sell trade
 */
export function executeSellTrade(req: TradeRequest): TradeResponse {
  const market = getMarketState(req.marketId);

  if (market.status !== 'open') {
    throw new Error('Market is not open for trading');
  }

  // Get user's position
  const position = db.prepare(`
    SELECT id, shares, avg_price FROM positions 
    WHERE user_id = ? AND market_id = ? AND position_type = ?
  `).get(req.userId, req.marketId, req.positionType) as any;

  if (!position || position.shares < req.amount) {
    throw new Error('Insufficient shares to sell');
  }

  // Execute the trade
  const result = executeSell(market, req.positionType, req.amount);

  const updateMarket = db.prepare(`
    UPDATE markets 
    SET total_yes_shares = ?, total_no_shares = ?
    WHERE id = ?
  `);

  const updateBalance = db.prepare(`
    UPDATE users SET balance = balance + ? WHERE id = ?
  `);

  const updatePosition = db.prepare(`
    UPDATE positions SET shares = ? WHERE id = ?
  `);

  const deletePosition = db.prepare(`
    DELETE FROM positions WHERE id = ?
  `);

  const insertTransaction = db.prepare(`
    INSERT INTO transactions (id, user_id, market_id, type, position_type, shares, price_per_share, total_cost)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPriceHistory = db.prepare(`
    INSERT INTO price_history (id, market_id, yes_price, no_price)
    VALUES (?, ?, ?, ?)
  `);

  const transactionId = uuidv4();

  const executeTransaction = db.transaction(() => {
    // Update market pools
    updateMarket.run(result.newYesShares, result.newNoShares, req.marketId);

    // Update user balance (add the proceeds)
    updateBalance.run(result.totalCost, req.userId);

    // Update position
    const newShares = position.shares - req.amount;
    if (newShares <= 0.0001) {
      deletePosition.run(position.id);
    } else {
      updatePosition.run(newShares, position.id);
    }

    // Record transaction
    insertTransaction.run(
      transactionId,
      req.userId,
      req.marketId,
      'SELL',
      req.positionType,
      req.amount,
      result.avgPricePerShare,
      result.totalCost
    );

    // Record price history using LMSR prices
    const newState = {
      total_yes_shares: result.newYesShares,
      total_no_shares: result.newNoShares,
      liquidity_pool: market.liquidity_pool
    };
    insertPriceHistory.run(
      uuidv4(),
      req.marketId,
      getYesPrice(newState),
      getNoPrice(newState)
    );

    return newShares;
  });

  const newShares = executeTransaction();

  // Get updated balance
  const updatedUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.userId) as any;

  return {
    success: true,
    transactionId,
    shares: req.amount,
    pricePerShare: result.avgPricePerShare,
    totalCost: result.totalCost,
    newBalance: updatedUser.balance,
    position: {
      shares: Math.max(0, newShares),
      avgPrice: position.avg_price
    }
  };
}

/**
 * Get user's positions for a market
 */
export function getUserPositions(userId: string, marketId?: string) {
  let query = `
    SELECT p.*, m.title as market_title, m.status as market_status,
           m.total_yes_shares, m.total_no_shares, m.liquidity_pool, m.outcome
    FROM positions p
    JOIN markets m ON p.market_id = m.id
    WHERE p.user_id = ?
  `;
  const params: any[] = [userId];

  if (marketId) {
    query += ' AND p.market_id = ?';
    params.push(marketId);
  }

  const positions = db.prepare(query).all(...params) as any[];

  return positions.map(p => {
    // Use LMSR price calculation
    const marketState = {
      total_yes_shares: p.total_yes_shares,
      total_no_shares: p.total_no_shares,
      liquidity_pool: p.liquidity_pool || 100
    };
    const currentPrice = p.position_type === 'YES'
      ? getYesPrice(marketState)
      : getNoPrice(marketState);

    return {
      ...p,
      current_price: currentPrice,
      current_value: p.shares * currentPrice,
      cost_basis: p.shares * p.avg_price,
      pnl: (p.shares * currentPrice) - (p.shares * p.avg_price),
      potential_payout: p.shares * 1.0 // $1 per share if wins
    };
  });
}
