/**
 * AMM (Automated Market Maker) Pricing Engine
 * 
 * Uses LMSR (Logarithmic Market Scoring Rule) - the industry standard for prediction markets.
 * LMSR naturally bounds prices between 0 and 1, making it ideal for binary outcomes.
 * 
 * Key formulas:
 * - Cost function: C(q_yes, q_no) = b * ln(exp(q_yes/b) + exp(q_no/b))
 * - YES price = exp(q_yes/b) / (exp(q_yes/b) + exp(q_no/b))
 * - NO price = exp(q_no/b) / (exp(q_yes/b) + exp(q_no/b))
 * - Always: YES price + NO price = 1.00 and prices are bounded [0, 1]
 * 
 * The liquidity parameter 'b' controls price sensitivity:
 * - Higher b = more liquidity, less price impact per trade
 * - Lower b = less liquidity, more price impact per trade
 * 
 * State variables:
 * - q_yes (stored as total_yes_shares): net YES shares outstanding
 * - q_no (stored as total_no_shares): net NO shares outstanding
 * - b (stored as liquidity_pool): liquidity parameter
 */

export interface MarketState {
  total_yes_shares: number;  // q_yes: net YES shares outstanding
  total_no_shares: number;   // q_no: net NO shares outstanding
  liquidity_pool: number;    // b: liquidity parameter
}

export interface QuoteResult {
  shares: number;
  avgPricePerShare: number;
  totalCost: number;
  priceImpact: number;
  newYesPrice: number;
  newNoPrice: number;
}

export interface TradeResult {
  shares: number;
  avgPricePerShare: number;
  totalCost: number;
  newYesShares: number;
  newNoShares: number;
}

/**
 * Calculate the LMSR cost function value
 * C(q_yes, q_no) = b * ln(exp(q_yes/b) + exp(q_no/b))
 */
function lmsrCost(qYes: number, qNo: number, b: number): number {
  // Use log-sum-exp trick for numerical stability
  const maxQ = Math.max(qYes / b, qNo / b);
  const expSum = Math.exp(qYes / b - maxQ) + Math.exp(qNo / b - maxQ);
  return b * (maxQ + Math.log(expSum));
}

/**
 * Calculate the current YES price using LMSR
 * p_yes = exp(q_yes/b) / (exp(q_yes/b) + exp(q_no/b))
 */
export function getYesPrice(state: MarketState): number {
  const { total_yes_shares: qYes, total_no_shares: qNo, liquidity_pool: b } = state;
  
  if (b === 0) return 0.5;
  
  // Use softmax for numerical stability
  const maxQ = Math.max(qYes / b, qNo / b);
  const expYes = Math.exp(qYes / b - maxQ);
  const expNo = Math.exp(qNo / b - maxQ);
  
  return expYes / (expYes + expNo);
}

/**
 * Calculate the current NO price using LMSR
 * p_no = exp(q_no/b) / (exp(q_yes/b) + exp(q_no/b))
 */
export function getNoPrice(state: MarketState): number {
  return 1 - getYesPrice(state);
}

/**
 * Calculate how many shares can be bought with a given amount using LMSR
 * Solves: C(q_yes + shares, q_no) - C(q_yes, q_no) = amount (for buying YES)
 * Uses binary search for numerical solution
 */
function calculateSharesForAmount(
  state: MarketState,
  positionType: 'YES' | 'NO',
  amount: number
): number {
  const { total_yes_shares: qYes, total_no_shares: qNo, liquidity_pool: b } = state;
  
  const currentCost = lmsrCost(qYes, qNo, b);
  const targetCost = currentCost + amount;
  
  // Binary search for shares
  let low = 0;
  let high = amount * 10; // Upper bound: can't get more than 10x shares per dollar
  const tolerance = 0.0001;
  
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    
    let newCost: number;
    if (positionType === 'YES') {
      newCost = lmsrCost(qYes + mid, qNo, b);
    } else {
      newCost = lmsrCost(qYes, qNo + mid, b);
    }
    
    if (Math.abs(newCost - targetCost) < tolerance) {
      return mid;
    }
    
    if (newCost < targetCost) {
      low = mid;
    } else {
      high = mid;
    }
  }
  
  return (low + high) / 2;
}

/**
 * Calculate how much money is received for selling shares using LMSR
 * Solves: C(q_yes, q_no) - C(q_yes - shares, q_no) = amount (for selling YES)
 */
function calculateAmountForShares(
  state: MarketState,
  positionType: 'YES' | 'NO',
  shares: number
): number {
  const { total_yes_shares: qYes, total_no_shares: qNo, liquidity_pool: b } = state;
  
  const currentCost = lmsrCost(qYes, qNo, b);
  
  let newCost: number;
  if (positionType === 'YES') {
    newCost = lmsrCost(qYes - shares, qNo, b);
  } else {
    newCost = lmsrCost(qYes, qNo - shares, b);
  }
  
  // Amount received is the decrease in cost
  return Math.max(0, currentCost - newCost);
}

/**
 * Get a quote for buying shares using LMSR
 */
export function getBuyQuote(
  state: MarketState,
  positionType: 'YES' | 'NO',
  amount: number
): QuoteResult {
  const { total_yes_shares: qYes, total_no_shares: qNo, liquidity_pool: b } = state;
  
  // Current prices before trade
  const currentYesPrice = getYesPrice(state);
  const currentNoPrice = getNoPrice(state);
  const currentPrice = positionType === 'YES' ? currentYesPrice : currentNoPrice;
  
  // Calculate shares received
  const sharesReceived = calculateSharesForAmount(state, positionType, amount);
  
  // Calculate average price per share
  const avgPricePerShare = sharesReceived > 0 ? amount / sharesReceived : 0;
  
  // Calculate new state and prices
  let newQYes = qYes;
  let newQNo = qNo;
  
  if (positionType === 'YES') {
    newQYes += sharesReceived;
  } else {
    newQNo += sharesReceived;
  }
  
  const newState: MarketState = {
    total_yes_shares: newQYes,
    total_no_shares: newQNo,
    liquidity_pool: b
  };
  
  const newYesPrice = getYesPrice(newState);
  const newNoPrice = getNoPrice(newState);
  
  // Price impact = (avg price - current price) / current price
  const priceImpact = currentPrice > 0 
    ? (avgPricePerShare - currentPrice) / currentPrice 
    : 0;
  
  return {
    shares: sharesReceived,
    avgPricePerShare,
    totalCost: amount,
    priceImpact,
    newYesPrice,
    newNoPrice
  };
}

/**
 * Get a quote for selling shares using LMSR
 */
export function getSellQuote(
  state: MarketState,
  positionType: 'YES' | 'NO',
  shares: number
): QuoteResult {
  const { total_yes_shares: qYes, total_no_shares: qNo, liquidity_pool: b } = state;
  
  // Current prices before trade
  const currentYesPrice = getYesPrice(state);
  const currentNoPrice = getNoPrice(state);
  const currentPrice = positionType === 'YES' ? currentYesPrice : currentNoPrice;
  
  // Calculate amount received
  const amountReceived = calculateAmountForShares(state, positionType, shares);
  
  // Calculate average price per share
  const avgPricePerShare = shares > 0 ? amountReceived / shares : 0;
  
  // Calculate new state and prices
  let newQYes = qYes;
  let newQNo = qNo;
  
  if (positionType === 'YES') {
    newQYes -= shares;
  } else {
    newQNo -= shares;
  }
  
  const newState: MarketState = {
    total_yes_shares: newQYes,
    total_no_shares: newQNo,
    liquidity_pool: b
  };
  
  const newYesPrice = getYesPrice(newState);
  const newNoPrice = getNoPrice(newState);
  
  // Price impact for selling (positive means you sold below spot)
  const priceImpact = currentPrice > 0 
    ? (currentPrice - avgPricePerShare) / currentPrice 
    : 0;
  
  return {
    shares,
    avgPricePerShare,
    totalCost: amountReceived,
    priceImpact,
    newYesPrice,
    newNoPrice
  };
}

/**
 * Execute a buy trade and return the new market state
 */
export function executeBuy(
  state: MarketState,
  positionType: 'YES' | 'NO',
  amount: number
): TradeResult {
  const quote = getBuyQuote(state, positionType, amount);
  
  let newQYes = state.total_yes_shares;
  let newQNo = state.total_no_shares;
  
  if (positionType === 'YES') {
    newQYes += quote.shares;
  } else {
    newQNo += quote.shares;
  }
  
  return {
    shares: quote.shares,
    avgPricePerShare: quote.avgPricePerShare,
    totalCost: amount,
    newYesShares: newQYes,
    newNoShares: newQNo
  };
}

/**
 * Execute a sell trade and return the new market state
 */
export function executeSell(
  state: MarketState,
  positionType: 'YES' | 'NO',
  shares: number
): TradeResult {
  const quote = getSellQuote(state, positionType, shares);
  
  let newQYes = state.total_yes_shares;
  let newQNo = state.total_no_shares;
  
  if (positionType === 'YES') {
    newQYes -= shares;
  } else {
    newQNo -= shares;
  }
  
  return {
    shares,
    avgPricePerShare: quote.avgPricePerShare,
    totalCost: quote.totalCost,
    newYesShares: newQYes,
    newNoShares: newQNo
  };
}

/**
 * Calculate potential winnings if market resolves in your favor
 * Winning positions pay out $1.00 per share
 */
export function calculatePotentialPayout(shares: number): number {
  return shares * 1.0;
}

/**
 * Calculate profit/loss for a position
 */
export function calculatePnL(
  shares: number,
  avgPrice: number,
  currentPrice: number
): number {
  const costBasis = shares * avgPrice;
  const currentValue = shares * currentPrice;
  return currentValue - costBasis;
}

/**
 * Initialize market state for LMSR
 * For a 50/50 starting probability, we want q_yes = q_no = 0
 * The liquidity parameter b determines price sensitivity
 */
export function initializeMarketState(liquidity: number): MarketState {
  return {
    total_yes_shares: 0,
    total_no_shares: 0,
    liquidity_pool: liquidity
  };
}

/**
 * Initialize market state with a specific starting probability
 * To get starting probability p for YES, we need:
 * p = exp(q_yes/b) / (exp(q_yes/b) + exp(q_no/b))
 * 
 * Setting q_no = 0 and solving for q_yes:
 * q_yes = b * ln(p / (1-p))
 */
export function initializeMarketStateWithProbability(
  liquidity: number,
  yesProbability: number
): MarketState {
  // Clamp probability to valid range
  const p = Math.max(0.01, Math.min(0.99, yesProbability));
  
  // Calculate q_yes to achieve desired probability
  // With q_no = 0: p = exp(q_yes/b) / (exp(q_yes/b) + 1)
  // Solving: q_yes = b * ln(p / (1-p))
  const qYes = liquidity * Math.log(p / (1 - p));
  
  return {
    total_yes_shares: qYes,
    total_no_shares: 0,
    liquidity_pool: liquidity
  };
}
