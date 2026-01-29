import { useState, useEffect } from 'react';
import { Loader2, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { useUser } from '../../hooks/useUser';
import { getTradeQuote, executeBuy, executeSell } from '../../services/api';
import type { Market, TradeQuote, Position } from '../../types';

interface TradingPanelProps {
  market: Market;
  userPosition?: Position | null;
  onTradeComplete: () => void;
}

export default function TradingPanel({ market, userPosition, onTradeComplete }: TradingPanelProps) {
  const { user, updateBalance } = useUser();
  const [tab, setTab] = useState<'BUY' | 'SELL'>('BUY');
  const [position, setPosition] = useState<'YES' | 'NO'>('YES');
  const [amount, setAmount] = useState('10');
  const [quote, setQuote] = useState<TradeQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isMarketOpen = market.status === 'open';

  // Auto-fade messages after 10 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('');
        setError('');
      }, 10000); // 10 seconds

      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // Clear messages when tab or position changes (user interaction)
  useEffect(() => {
    setSuccess('');
    setError('');
  }, [tab, position]);

  // Fetch quote when inputs change
  useEffect(() => {
    const fetchQuote = async () => {
      const numAmount = parseFloat(amount);
      if (!numAmount || numAmount <= 0 || !isMarketOpen) {
        setQuote(null);
        return;
      }

      setQuoteLoading(true);
      try {
        const q = await getTradeQuote({
          market_id: market.id,
          position_type: position,
          amount: numAmount,
          action: tab,
        });
        setQuote(q);
        setError('');
      } catch (err: any) {
        setQuote(null);
        if (err.response?.data?.message) {
          setError(err.response.data.message);
        }
      } finally {
        setQuoteLoading(false);
      }
    };

    const debounce = setTimeout(fetchQuote, 300);
    return () => clearTimeout(debounce);
  }, [amount, position, tab, market.id, isMarketOpen]);

  const handleTrade = async () => {
    if (!user) {
      setError('Please login to trade');
      return;
    }

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let result;
      if (tab === 'BUY') {
        result = await executeBuy({
          market_id: market.id,
          user_id: user.id,
          position_type: position,
          amount: numAmount,
        });
      } else {
        result = await executeSell({
          market_id: market.id,
          user_id: user.id,
          position_type: position,
          shares: numAmount,
        });
      }

      updateBalance(result.newBalance);
      setSuccess(`Successfully ${tab === 'BUY' ? 'bought' : 'sold'} ${result.shares.toFixed(2)} shares!`);
      setAmount('10');
      onTradeComplete();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Trade failed');
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [10, 25, 50, 100];

  if (!isMarketOpen) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text mb-2">Market Closed</h3>
          <p className="text-muted">
            This market is no longer accepting trades.
            {market.status === 'resolved' && (
              <span className="block mt-2">
                Resolved: <span className={market.outcome === 'YES' ? 'text-yes' : 'text-no'}>{market.outcome}</span>
              </span>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab('BUY')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            tab === 'BUY'
              ? 'text-yes border-b-2 border-yes bg-yes/5'
              : 'text-muted hover:text-text'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setTab('SELL')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            tab === 'SELL'
              ? 'text-no border-b-2 border-no bg-no/5'
              : 'text-muted hover:text-text'
          }`}
        >
          Sell
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Position Selection */}
        <div>
          <label className="block text-sm font-medium text-muted mb-3">
            Outcome
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPosition('YES')}
              className={`py-4 px-4 rounded-xl border-2 transition-all duration-200 ${
                position === 'YES'
                  ? 'border-yes bg-yes/10 text-yes scale-105'
                  : 'border-border text-muted hover:border-yes/50 hover:text-yes hover:scale-105 active:scale-95'
              }`}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp className="h-5 w-5" />
                <span className="font-bold text-lg">Yes</span>
              </div>
              <div className="text-sm opacity-80">
                {Math.round(market.yes_price * 100)}¢
              </div>
            </button>
            <button
              onClick={() => setPosition('NO')}
              className={`py-4 px-4 rounded-xl border-2 transition-all duration-200 ${
                position === 'NO'
                  ? 'border-no bg-no/10 text-no scale-105'
                  : 'border-border text-muted hover:border-no/50 hover:text-no hover:scale-105 active:scale-95'
              }`}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingDown className="h-5 w-5" />
                <span className="font-bold text-lg">No</span>
              </div>
              <div className="text-sm opacity-80">
                {Math.round(market.no_price * 100)}¢
              </div>
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-medium text-muted">
              {tab === 'BUY' ? 'Amount ($)' : 'Shares to sell'}
            </label>
            {tab === 'SELL' && userPosition && userPosition.position_type === position && (
              <span className="text-sm text-muted">
                You own: <span className="text-text font-semibold">{userPosition.shares.toFixed(2)}</span> shares
              </span>
            )}
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text text-lg font-semibold focus:outline-none focus:border-accent transition-colors"
            placeholder="0"
            min="0"
            step="1"
          />
          <div className="flex gap-2 mt-3">
            {tab === 'SELL' && userPosition && userPosition.position_type === position ? (
              <>
                <button
                  onClick={() => setAmount(Math.floor(userPosition.shares * 0.25).toString())}
                  className="flex-1 py-2 rounded-lg bg-background border border-border text-sm text-muted hover:text-text hover:border-accent transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  25%
                </button>
                <button
                  onClick={() => setAmount(Math.floor(userPosition.shares * 0.5).toString())}
                  className="flex-1 py-2 rounded-lg bg-background border border-border text-sm text-muted hover:text-text hover:border-accent transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  50%
                </button>
                <button
                  onClick={() => setAmount(Math.floor(userPosition.shares * 0.75).toString())}
                  className="flex-1 py-2 rounded-lg bg-background border border-border text-sm text-muted hover:text-text hover:border-accent transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  75%
                </button>
                <button
                  onClick={() => setAmount(userPosition.shares.toFixed(2))}
                  className="flex-1 py-2 rounded-lg bg-background border border-border text-sm text-muted hover:text-text hover:border-accent transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  Max
                </button>
              </>
            ) : (
              quickAmounts.map((qa) => (
                <button
                  key={qa}
                  onClick={() => setAmount(qa.toString())}
                  className="flex-1 py-2 rounded-lg bg-background border border-border text-sm text-muted hover:text-text hover:border-accent transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  {tab === 'BUY' ? `$${qa}` : qa}
                </button>
              ))
            )}
          </div>
        </div>

        {/* No position warning for sell */}
        {tab === 'SELL' && user && (!userPosition || userPosition.position_type !== position || userPosition.shares <= 0) && (
          <div className="p-3 rounded-lg bg-background border border-border text-muted text-sm">
            You don't have any {position} shares to sell in this market.
          </div>
        )}

        {/* Quote Preview */}
        {quote && (
          <div className="bg-background rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Est. shares</span>
              <span className="text-text font-medium">{quote.shares.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Avg. price</span>
              <span className="text-text font-medium">{(quote.pricePerShare * 100).toFixed(1)}¢</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Price impact</span>
              <span className={`font-medium ${Math.abs(quote.priceImpact) > 0.05 ? 'text-orange-400' : 'text-muted'}`}>
                {(Math.abs(quote.priceImpact) * 100).toFixed(2)}%
              </span>
            </div>
            {tab === 'BUY' && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">New {position} price</span>
                  <span className="text-text font-medium">
                    {(position === 'YES' ? quote.newYesPrice * 100 : quote.newNoPrice * 100).toFixed(1)}¢
                  </span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="text-muted">Max payout if {position}</span>
                  <span className="text-yes font-semibold">
                    ${quote.shares.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Potential profit</span>
                  <span className="text-yes font-semibold">
                    +${(quote.shares - quote.totalCost).toFixed(2)} ({((quote.shares / quote.totalCost - 1) * 100).toFixed(0)}%)
                  </span>
                </div>
              </>
            )}
            {tab === 'SELL' && (
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="text-muted">You receive</span>
                <span className="text-text font-semibold">
                  ${quote.totalCost.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        {quoteLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          </div>
        )}

        {/* User Balance */}
        {user && (
          <div className="flex justify-between text-sm text-muted">
            <span>Your balance</span>
            <span>${user.balance.toFixed(2)}</span>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="p-3 rounded-lg bg-no/10 border border-no/20 text-no text-sm animate-fade-in">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-lg bg-yes/10 border border-yes/20 text-yes text-sm animate-fade-in">
            {success}
          </div>
        )}

        {/* Trade Button */}
        <button
          onClick={handleTrade}
          disabled={loading || !quote || !user}
          className={`w-full py-4 rounded-xl font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 disabled:hover:scale-100 ${
            tab === 'BUY'
              ? 'bg-yes hover:bg-yes-hover hover:shadow-lg hover:shadow-yes/30'
              : 'bg-no hover:bg-no-hover hover:shadow-lg hover:shadow-no/30'
          }`}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          ) : !user ? (
            'Login to Trade'
          ) : (
            `${tab === 'BUY' ? 'Buy' : 'Sell'} ${position}`
          )}
        </button>
      </div>
    </div>
  );
}
