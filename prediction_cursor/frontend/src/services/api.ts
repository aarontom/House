import axios from 'axios';
import type { Market, Template, Position, User, Resolution, TradeQuote, TradeResult, Transaction } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Markets
export const getMarkets = async (filters?: { status?: string; category?: string }): Promise<Market[]> => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.category) params.append('category', filters.category);
  
  const { data } = await api.get(`/markets?${params.toString()}`);
  return data;
};

export const getMarket = async (id: string): Promise<Market> => {
  const { data } = await api.get(`/markets/${id}`);
  return data;
};

export const createMarket = async (market: {
  template_id?: string;
  title: string;
  description: string;
  category: string;
  resolution_source: string;
  resolution_criteria: any;
  created_by: string;
  closes_at: string;
  initial_liquidity?: number;
}): Promise<Market> => {
  const { data } = await api.post('/markets', market);
  return data;
};

export const getMarketStats = async (id: string) => {
  const { data } = await api.get(`/markets/${id}/stats`);
  return data;
};

export const updateMarket = async (id: string, updates: { title?: string; description?: string; category?: string }): Promise<Market> => {
  const { data } = await api.patch(`/markets/${id}`, updates);
  return data;
};

export const getMyMarkets = async (userId: string): Promise<Market[]> => {
  const { data } = await api.get(`/markets/user/${userId}`);
  return data;
};

// Market Updates
export const getMarketUpdates = async (marketId: string) => {
  const { data } = await api.get(`/markets/${marketId}/updates`);
  return data;
};

export const postMarketUpdate = async (
  marketId: string, 
  userId: string, 
  updateType: string, 
  content: string,
  mediaUrl?: string
) => {
  const { data } = await api.post(`/markets/${marketId}/updates`, {
    user_id: userId,
    update_type: updateType,
    content,
    media_url: mediaUrl,
  });
  return data;
};

// File uploads
export const uploadFile = async (file: File): Promise<{
  success: boolean;
  url: string;
  filename: string;
  mimetype: string;
  size: number;
  isVideo: boolean;
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const { data } = await api.post('/uploads', {
          data: base64,
          mimetype: file.type,
          filename: file.name,
        });
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Templates
export const getTemplates = async (category?: string): Promise<Template[]> => {
  const params = category ? `?category=${category}` : '';
  const { data } = await api.get(`/templates${params}`);
  return data;
};

export const getTemplate = async (id: string): Promise<Template> => {
  const { data } = await api.get(`/templates/${id}`);
  return data;
};

// Trading
export const getTradeQuote = async (params: {
  market_id: string;
  position_type: 'YES' | 'NO';
  amount: number;
  action: 'BUY' | 'SELL';
}): Promise<TradeQuote> => {
  const { data } = await api.post('/trading/quote', params);
  return data;
};

export const executeBuy = async (params: {
  market_id: string;
  user_id: string;
  position_type: 'YES' | 'NO';
  amount: number;
}): Promise<TradeResult> => {
  const { data } = await api.post('/trading/buy', params);
  return data;
};

export const executeSell = async (params: {
  market_id: string;
  user_id: string;
  position_type: 'YES' | 'NO';
  shares: number;
}): Promise<TradeResult> => {
  const { data } = await api.post('/trading/sell', params);
  return data;
};

// Users
export const login = async (email: string, password: string): Promise<{ user: User; token: string }> => {
  const { data } = await api.post('/users/login', { email, password });
  return data;
};

export const register = async (username: string, email: string, password: string): Promise<{ user: User; token: string }> => {
  const { data } = await api.post('/users/register', { username, email, password });
  return data;
};

export const getUser = async (id: string): Promise<User & { positions: Position[]; recent_transactions: Transaction[] }> => {
  const { data } = await api.get(`/users/${id}`);
  return data;
};

export const getUserPositions = async (userId: string): Promise<Position[]> => {
  const { data } = await api.get(`/users/${userId}/positions`);
  return data;
};

export const getUserTransactions = async (userId: string): Promise<Transaction[]> => {
  const { data } = await api.get(`/users/${userId}/transactions`);
  return data;
};

// Resolutions
export const getResolution = async (marketId: string): Promise<Resolution> => {
  const { data } = await api.get(`/resolutions/${marketId}`);
  return data;
};

export const resolveMarket = async (marketId: string, outcome: 'YES' | 'NO', resolvedBy?: string) => {
  const { data } = await api.post(`/resolutions/${marketId}/resolve`, { outcome, resolved_by: resolvedBy });
  return data;
};

export const getAllResolutions = async (): Promise<Resolution[]> => {
  const { data } = await api.get('/resolutions');
  return data;
};

// AI Generation
export interface GeneratedMarket {
  title: string;
  description: string;
  category: string;
  suggested_close_days: number;
  resolution_criteria: string;
}

export const generateMarketWithAI = async (prompt: string): Promise<GeneratedMarket> => {
  const { data } = await api.post('/ai/generate-market', { prompt });
  return data.market;
};

export const improveDescriptionWithAI = async (title: string, description: string): Promise<string> => {
  const { data } = await api.post('/ai/improve-description', { title, description });
  return data.description;
};

export const getAIStatus = async (): Promise<{ enabled: boolean; message: string }> => {
  const { data } = await api.get('/ai/status');
  return data;
};

export default api;
