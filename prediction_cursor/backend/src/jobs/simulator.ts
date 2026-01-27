/**
 * Market Simulator
 * 
 * Simulates trading activity on markets for demo purposes.
 * Creates fake users and executes random trades to show realistic market behavior.
 */

import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { executeBuy, executeSell, getYesPrice, getNoPrice, getBuyQuote } from '../services/ammEngine';

// Simulated trader names
const TRADER_NAMES = [
  'CryptoKing', 'MarketMaker', 'TrendHunter', 'AlphaSeeker', 
  'DataDriven', 'SwingTrader', 'ValueBet', 'RiskTaker',
  'SmartMoney', 'EdgeFinder', 'ProbabilityPro', 'InfoAdvantage'
];

// Create or get simulated users
function getOrCreateSimUser(name: string): string {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(name) as any;
  
  if (existing) {
    return existing.id;
  }
  
  const userId = uuidv4();
  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, balance)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, name, `${name.toLowerCase()}@sim.house`, 'simulated', 10000);
  
  return userId;
}

// Get a random trader
function getRandomTrader(): string {
  const name = TRADER_NAMES[Math.floor(Math.random() * TRADER_NAMES.length)];
  return getOrCreateSimUser(name);
}

// Simulate a single trade on a market
function simulateTrade(marketId: string): boolean {
  try {
    const market = db.prepare(`
      SELECT * FROM markets WHERE id = ? AND status = 'open'
    `).get(marketId) as any;
    
    if (!market) return false;
    
    const marketTitle = market.title.length > 40 
      ? market.title.substring(0, 40) + '...' 
      : market.title;
    
    const userId = getRandomTrader();
    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as any;
    
    // Decide action: 70% buy, 30% sell
    const isBuy = Math.random() > 0.3;
    
    // Decide position type based on current price (slight bias toward underpriced)
    const yesPrice = getYesPrice(market);
    const yesBias = yesPrice < 0.5 ? 0.6 : 0.4; // More likely to buy YES if it's cheap
    const positionType: 'YES' | 'NO' = Math.random() < yesBias ? 'YES' : 'NO';
    
    if (isBuy) {
      // Random amount between $5 and $50
      const amount = 5 + Math.random() * 45;
      
      if (user.balance < amount) return false;
      
      // Get quote first
      const quote = getBuyQuote(market, positionType, amount);
      if (quote.shares <= 0) return false;
      
      // Execute the trade
      const result = executeBuy(market, positionType, amount);
      
      // Update database
      const updateMarket = db.prepare(`
        UPDATE markets SET total_yes_shares = ?, total_no_shares = ? WHERE id = ?
      `);
      updateMarket.run(result.newYesShares, result.newNoShares, marketId);
      
      // Update user balance
      db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(amount, userId);
      
      // Create or update position
      const existingPosition = db.prepare(`
        SELECT id, shares, avg_price FROM positions 
        WHERE user_id = ? AND market_id = ? AND position_type = ?
      `).get(userId, marketId, positionType) as any;
      
      if (existingPosition) {
        const totalCost = (existingPosition.shares * existingPosition.avg_price) + amount;
        const newShares = existingPosition.shares + result.shares;
        const newAvgPrice = totalCost / newShares;
        db.prepare('UPDATE positions SET shares = ?, avg_price = ? WHERE id = ?')
          .run(newShares, newAvgPrice, existingPosition.id);
      } else {
        db.prepare(`
          INSERT INTO positions (id, user_id, market_id, position_type, shares, avg_price)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), userId, marketId, positionType, result.shares, result.avgPricePerShare);
      }
      
      // Record transaction
      db.prepare(`
        INSERT INTO transactions (id, user_id, market_id, type, position_type, shares, price_per_share, total_cost)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), userId, marketId, 'BUY', positionType, result.shares, result.avgPricePerShare, amount);
      
      // Record price history and log the trade
      const newState = { total_yes_shares: result.newYesShares, total_no_shares: result.newNoShares, liquidity_pool: market.liquidity_pool };
      const newYesPrice = getYesPrice(newState);
      db.prepare(`
        INSERT INTO price_history (id, market_id, yes_price, no_price)
        VALUES (?, ?, ?, ?)
      `).run(uuidv4(), marketId, newYesPrice, getNoPrice(newState));
      
      console.log(`[Simulator] "${marketTitle}" | ${positionType} BUY $${amount.toFixed(2)} -> ${result.shares.toFixed(2)} shares | Price: ${(newYesPrice * 100).toFixed(1)}% YES`);
      return true;
    } else {
      // Sell: check if user has position
      const position = db.prepare(`
        SELECT * FROM positions WHERE user_id = ? AND market_id = ? AND position_type = ? AND shares > 0.01
      `).get(userId, marketId, positionType) as any;
      
      if (!position) return false;
      
      // Sell 20-80% of position
      const sellPercent = 0.2 + Math.random() * 0.6;
      const sharesToSell = position.shares * sellPercent;
      
      const result = executeSell(market, positionType, sharesToSell);
      
      // Update database
      db.prepare(`
        UPDATE markets SET total_yes_shares = ?, total_no_shares = ? WHERE id = ?
      `).run(result.newYesShares, result.newNoShares, marketId);
      
      // Update user balance
      db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(result.totalCost, userId);
      
      // Update position
      const newShares = position.shares - sharesToSell;
      if (newShares <= 0.0001) {
        db.prepare('DELETE FROM positions WHERE id = ?').run(position.id);
      } else {
        db.prepare('UPDATE positions SET shares = ? WHERE id = ?').run(newShares, position.id);
      }
      
      // Record transaction
      db.prepare(`
        INSERT INTO transactions (id, user_id, market_id, type, position_type, shares, price_per_share, total_cost)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), userId, marketId, 'SELL', positionType, sharesToSell, result.avgPricePerShare, result.totalCost);
      
      // Record price history and log the trade
      const newState = { total_yes_shares: result.newYesShares, total_no_shares: result.newNoShares, liquidity_pool: market.liquidity_pool };
      const newYesPrice = getYesPrice(newState);
      db.prepare(`
        INSERT INTO price_history (id, market_id, yes_price, no_price)
        VALUES (?, ?, ?, ?)
      `).run(uuidv4(), marketId, newYesPrice, getNoPrice(newState));
      
      console.log(`[Simulator] "${marketTitle}" | ${positionType} SELL ${sharesToSell.toFixed(2)} shares -> $${result.totalCost.toFixed(2)} | Price: ${(newYesPrice * 100).toFixed(1)}% YES`);
      return true;
    }
  } catch (error: any) {
    console.error('[Simulator] Trade error:', error.message);
    return false;
  }
}

// Run simulation cycle
export function runSimulation() {
  try {
    // Get all open markets
    const markets = db.prepare(`
      SELECT id FROM markets WHERE status = 'open'
    `).all() as any[];
    
    if (markets.length === 0) return;
    
    // Pick a random market
    const market = markets[Math.floor(Math.random() * markets.length)];
    
    // 60% chance to execute a trade
    if (Math.random() < 0.6) {
      simulateTrade(market.id);
    }
  } catch (error: any) {
    console.error('[Simulator] Error:', error.message);
  }
}

// Start the simulator (runs every 5-15 seconds)
export function startSimulator() {
  console.log('[Simulator] Starting market simulator...');
  
  // Initial delay
  setTimeout(() => {
    runSimulation();
    
    // Schedule next run with random interval
    const scheduleNext = () => {
      const delay = 5000 + Math.random() * 10000; // 5-15 seconds
      setTimeout(() => {
        runSimulation();
        scheduleNext();
      }, delay);
    };
    
    scheduleNext();
  }, 3000);
  
  console.log('[Simulator] Market simulator started - trades every 5-15 seconds');
}
