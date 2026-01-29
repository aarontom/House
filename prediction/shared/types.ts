// Shared types between frontend and backend

export interface User {
  id: string;
  username: string;
  email: string;
  balance: number;
  created_at: string;
}

export interface Template {
  id: string;
  name: string;
  category: 'crypto' | 'sports' | 'weather' | 'custom';
  description: string;
  resolution_source: string;
  resolution_logic: ResolutionLogic;
  default_duration_hours: number;
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
  // Computed fields
  yes_price?: number;
  no_price?: number;
  volume?: number;
}

export interface Position {
  id: string;
  user_id: string;
  market_id: string;
  position_type: 'YES' | 'NO';
  shares: number;
  avg_price: number;
  created_at: string;
  // Computed fields
  current_value?: number;
  pnl?: number;
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
}

export interface Resolution {
  id: string;
  market_id: string;
  outcome: 'YES' | 'NO';
  resolved_at: string;
  source_url: string;
  source_response: object;
  calculation_steps: CalculationStep[];
  final_value: string;
  resolved_by: 'auto' | string;
}

export interface ResolutionLogic {
  path: string;
  transform?: string;
}

export interface ResolutionCriteria {
  path: string;
  operator: 'equals' | 'not_equals' | '>=' | '<=' | '>' | '<' | 'contains';
  value: string | number | boolean;
  description?: string;
}

export interface CalculationStep {
  step: number;
  description: string;
  input?: string;
  output?: string;
}

// API Request/Response types
export interface TradeQuoteRequest {
  market_id: string;
  position_type: 'YES' | 'NO';
  amount: number;
  action: 'BUY' | 'SELL';
}

export interface TradeQuoteResponse {
  shares: number;
  price_per_share: number;
  total_cost: number;
  price_impact: number;
  new_yes_price: number;
  new_no_price: number;
}

export interface TradeRequest {
  market_id: string;
  user_id: string;
  position_type: 'YES' | 'NO';
  amount: number;
  action: 'BUY' | 'SELL';
}

export interface TradeResponse {
  success: boolean;
  transaction: Transaction;
  position: Position;
  new_balance: number;
  market: Market;
}

export interface CreateMarketRequest {
  template_id?: string;
  title: string;
  description: string;
  category: string;
  resolution_source: string;
  resolution_criteria: ResolutionCriteria;
  closes_at: string;
  created_by: string;
  initial_liquidity?: number;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  token: string;
}

export interface ApiError {
  error: string;
  message: string;
  details?: object;
}
