import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import {
  fetchFromSource,
  extractValue,
  evaluateCondition,
  generateCalculationSteps
} from './dataSourceService';

export interface ResolutionResult {
  marketId: string;
  outcome: 'YES' | 'NO';
  resolution: any;
  payouts: Array<{
    userId: string;
    amount: number;
    positionType: string;
    shares: number;
  }>;
}

/**
 * Resolve a market and settle all positions
 */
export async function resolveMarket(
  marketId: string,
  manualOutcome?: 'YES' | 'NO',
  resolvedBy: string = 'auto'
): Promise<ResolutionResult> {
  // Get the market
  const market = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId) as any;

  if (!market) {
    throw new Error('Market not found');
  }

  if (market.status === 'resolved') {
    throw new Error('Market is already resolved');
  }

  const criteria = JSON.parse(market.resolution_criteria);
  let outcome: 'YES' | 'NO';
  let sourceResponse: any;
  let calculationSteps: any[];
  let finalValue: string;

  // If manual outcome provided, use it
  if (manualOutcome) {
    outcome = manualOutcome;
    sourceResponse = { manual: true, outcome: manualOutcome };
    calculationSteps = [
      {
        step: 1,
        description: 'Market resolved manually',
        output: `Manual outcome: ${outcome}`
      }
    ];
    finalValue = manualOutcome;
  } else {
    // Fetch data from source
    const sourceResult = await fetchFromSource(market.resolution_source);

    if (!sourceResult.success) {
      throw new Error(`Failed to fetch data: ${sourceResult.error}`);
    }

    sourceResponse = sourceResult.data;

    // Extract the actual value
    const actualValue = extractValue(sourceResponse, criteria.path);

    if (actualValue === undefined) {
      throw new Error(`Could not extract value at path: ${criteria.path}`);
    }

    finalValue = String(actualValue);

    // Evaluate the condition
    const conditionMet = evaluateCondition(actualValue, criteria.operator, criteria.value);
    outcome = conditionMet ? 'YES' : 'NO';

    // Generate calculation steps
    calculationSteps = generateCalculationSteps(
      market.resolution_source,
      sourceResponse,
      criteria.path,
      criteria.operator,
      criteria.value,
      actualValue,
      outcome
    );
  }

  // Create resolution record and settle positions in a transaction
  const resolutionId = uuidv4();
  const payouts: ResolutionResult['payouts'] = [];

  const insertResolution = db.prepare(`
    INSERT INTO resolutions (id, market_id, outcome, source_url, source_response, calculation_steps, final_value, resolved_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateMarket = db.prepare(`
    UPDATE markets 
    SET status = 'resolved', outcome = ?, resolved_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const getWinningPositions = db.prepare(`
    SELECT * FROM positions 
    WHERE market_id = ? AND position_type = ?
  `);

  const updateUserBalance = db.prepare(`
    UPDATE users SET balance = balance + ? WHERE id = ?
  `);

  const executeResolution = db.transaction(() => {
    // Insert resolution record
    insertResolution.run(
      resolutionId,
      marketId,
      outcome,
      market.resolution_source,
      JSON.stringify(sourceResponse),
      JSON.stringify(calculationSteps),
      finalValue,
      resolvedBy
    );

    // Update market status
    updateMarket.run(outcome, marketId);

    // Get winning positions and pay out
    const winningPositions = getWinningPositions.all(marketId, outcome) as any[];

    for (const position of winningPositions) {
      // Winning positions pay $1 per share
      const payout = position.shares * 1.0;
      updateUserBalance.run(payout, position.user_id);

      payouts.push({
        userId: position.user_id,
        amount: payout,
        positionType: position.position_type,
        shares: position.shares
      });
    }
  });

  executeResolution();

  // Get the full resolution record
  const resolution = db.prepare('SELECT * FROM resolutions WHERE id = ?').get(resolutionId) as any;

  return {
    marketId,
    outcome,
    resolution: {
      ...resolution,
      source_response: JSON.parse(resolution.source_response),
      calculation_steps: JSON.parse(resolution.calculation_steps)
    },
    payouts
  };
}

/**
 * Get markets that are due for resolution
 */
export function getMarketsForResolution(): any[] {
  const now = new Date().toISOString();

  return db.prepare(`
    SELECT * FROM markets 
    WHERE status = 'open' 
    AND closes_at <= ?
    AND resolution_source != 'manual'
  `).all(now) as any[];
}

/**
 * Check and resolve all due markets
 */
export async function checkAndResolveMarkets(): Promise<void> {
  const dueMarkets = getMarketsForResolution();

  console.log(`[Resolver] Found ${dueMarkets.length} markets due for resolution`);

  for (const market of dueMarkets) {
    try {
      console.log(`[Resolver] Resolving market: ${market.title}`);
      const result = await resolveMarket(market.id);
      console.log(`[Resolver] Market resolved: ${market.title} -> ${result.outcome}`);
      console.log(`[Resolver] Paid out ${result.payouts.length} winning positions`);
    } catch (error: any) {
      console.error(`[Resolver] Failed to resolve market ${market.id}: ${error.message}`);
      
      // Update market status to indicate resolution failed
      db.prepare(`
        UPDATE markets SET status = 'closed' WHERE id = ?
      `).run(market.id);
    }
  }
}
