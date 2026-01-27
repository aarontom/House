import axios from 'axios';

export interface DataSourceResult {
  success: boolean;
  data: any;
  source_url: string;
  fetched_at: string;
  error?: string;
}

/**
 * Fetch data from an external source
 */
export async function fetchFromSource(url: string): Promise<DataSourceResult> {
  const fetchedAt = new Date().toISOString();

  // Handle manual resolution sources
  if (url === 'manual') {
    return {
      success: true,
      data: { manual: true },
      source_url: url,
      fetched_at: fetchedAt
    };
  }

  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PredictionMarket/1.0'
      }
    });

    return {
      success: true,
      data: response.data,
      source_url: url,
      fetched_at: fetchedAt
    };
  } catch (error: any) {
    return {
      success: false,
      data: null,
      source_url: url,
      fetched_at: fetchedAt,
      error: error.message
    };
  }
}

/**
 * Extract a value from nested object using dot notation path
 * Supports array access like "weather[0].main"
 */
export function extractValue(data: any, path: string): any {
  if (!data || !path) return undefined;

  const parts = path.split('.').flatMap(part => {
    // Handle array notation like "weather[0]"
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      return [arrayMatch[1], parseInt(arrayMatch[2])];
    }
    return [part];
  });

  let current = data;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }

  return current;
}

/**
 * Evaluate a condition based on operator
 */
export function evaluateCondition(
  actualValue: any,
  operator: string,
  expectedValue: any
): boolean {
  switch (operator) {
    case 'equals':
      return actualValue == expectedValue;
    case 'not_equals':
      return actualValue != expectedValue;
    case '>=':
      return parseFloat(actualValue) >= parseFloat(expectedValue);
    case '<=':
      return parseFloat(actualValue) <= parseFloat(expectedValue);
    case '>':
      return parseFloat(actualValue) > parseFloat(expectedValue);
    case '<':
      return parseFloat(actualValue) < parseFloat(expectedValue);
    case 'contains':
      return String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
}

/**
 * Pre-defined data source handlers for common APIs
 */
export const DataSources = {
  /**
   * CoinGecko - Cryptocurrency prices
   * Free, no API key required for basic usage
   */
  coingecko: {
    buildUrl: (coinId: string) =>
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
    extractPrice: (data: any, coinId: string) =>
      data?.[coinId]?.usd
  },

  /**
   * OpenWeatherMap - Weather data
   * Requires API key
   */
  openweather: {
    buildUrl: (city: string, apiKey: string) =>
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`,
    extractCondition: (data: any) =>
      data?.weather?.[0]?.main
  },

  /**
   * CoinCap - Alternative crypto prices
   * Free, no API key required
   */
  coincap: {
    buildUrl: (assetId: string) =>
      `https://api.coincap.io/v2/assets/${assetId}`,
    extractPrice: (data: any) =>
      parseFloat(data?.data?.priceUsd)
  }
};

/**
 * Generate human-readable calculation steps
 */
export function generateCalculationSteps(
  sourceUrl: string,
  sourceData: any,
  path: string,
  operator: string,
  expectedValue: any,
  actualValue: any,
  outcome: 'YES' | 'NO'
): Array<{ step: number; description: string; input?: string; output?: string }> {
  return [
    {
      step: 1,
      description: 'Fetched data from authoritative source',
      input: sourceUrl,
      output: 'Data retrieved successfully'
    },
    {
      step: 2,
      description: `Extracted value at path "${path}"`,
      input: JSON.stringify(sourceData).substring(0, 200) + '...',
      output: String(actualValue)
    },
    {
      step: 3,
      description: `Evaluated condition: ${actualValue} ${operator} ${expectedValue}`,
      input: `Actual: ${actualValue}, Expected: ${expectedValue}`,
      output: outcome === 'YES' ? 'Condition TRUE' : 'Condition FALSE'
    },
    {
      step: 4,
      description: 'Market resolved based on condition result',
      output: `Outcome: ${outcome}`
    }
  ];
}
