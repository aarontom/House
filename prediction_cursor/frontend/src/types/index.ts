export interface User {
  id: string;
  username: string;
  email: string;
  balance: number;
  created_at: string;
  total_value?: number;
}

export interface Market {
  id: string;
  template_id: string | null;
  title: string;
  description: string;
  category: string;
  resolution_source: string;
  resolution_criteria: ResolutionCriteria;
  created_by: string;
  created_at: string;
  closes_at: string;
  resolved_at: string | null;
  outcome: 'YES' | 'NO' | null;
  total_yes_shares: number;
  total_no_shares: number;
  liquidity_pool: number;
  status: 'open' | 'closed' | 'resolved';
  yes_price: number;
  no_price: number;
  volume: number;
  price_history?: PricePoint[];
  recent_transactions?: Transaction[];
}

export interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  resolution_source: string;
  resolution_logic: { path: string };
  default_duration_hours: number;
}

export interface Position {
  id: string;
  user_id: string;
  market_id: string;
  market_title: string;
  market_status: string;
  position_type: 'YES' | 'NO';
  shares: number;
  avg_price: number;
  created_at: string;
  current_price: number;
  current_value: number;
  cost_basis: number;
  pnl: number;
  potential_payout: number;
  outcome?: 'YES' | 'NO' | null;
  closes_at?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  market_id: string;
  type: 'BUY' | 'SELL';
  position_type: 'YES' | 'NO';
  shares: number;
  price_per_share: number;
  total_cost: number;
  created_at: string;
  market_title?: string;
  username?: string;
}

export interface Resolution {
  id: string;
  market_id: string;
  market_title: string;
  market_description: string;
  outcome: 'YES' | 'NO';
  resolved_at: string;
  source_url: string;
  source_response: any;
  calculation_steps: CalculationStep[];
  final_value: string;
  resolved_by: string;
  resolution_criteria: ResolutionCriteria;
  closes_at: string;
}

export interface ResolutionCriteria {
  path: string;
  operator: string;
  value: string | number | boolean;
  description?: string;
}

export interface CalculationStep {
  step: number;
  description: string;
  input?: string;
  output?: string;
}

export interface PricePoint {
  yes_price: number;
  no_price: number;
  timestamp: string;
}

export interface TradeQuote {
  shares: number;
  pricePerShare: number;
  totalCost: number;
  priceImpact: number;
  newYesPrice: number;
  newNoPrice: number;
  currentYesPrice: number;
  currentNoPrice: number;
}

export interface TradeResult {
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
