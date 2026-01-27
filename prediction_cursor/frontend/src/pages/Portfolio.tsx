import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Wallet, TrendingUp, TrendingDown, Clock, CheckCircle, ArrowUpRight, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useUser } from '../hooks/useUser';
import { getUser } from '../services/api';

export default function Portfolio() {
  const { user } = useUser();

  const { data: userData, isLoading } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: () => getUser(user!.id),
    enabled: !!user?.id,
  });

  if (!user) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-card mb-4">
          <Wallet className="h-8 w-8 text-muted" />
        </div>
        <h2 className="text-2xl font-bold text-text mb-4">Login Required</h2>
        <p className="text-muted">Please login to view your portfolio.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const positions = userData?.positions || [];
  const transactions = userData?.recent_transactions || [];

  const openPositions = positions.filter(p => p.market_status === 'open');
  const resolvedPositions = positions.filter(p => p.market_status === 'resolved');

  const totalPnL = positions.reduce((acc, p) => acc + (p.pnl || 0), 0);
  const totalValue = positions.reduce((acc, p) => acc + (p.current_value || 0), 0);

  // Helper to safely calculate percentage
  const formatPnLPercent = (pnl: number, costBasis: number) => {
    if (!costBasis || costBasis === 0 || isNaN(pnl) || isNaN(costBasis)) {
      return '0.0';
    }
    const percent = (pnl / costBasis) * 100;
    if (isNaN(percent) || !isFinite(percent)) {
      return '0.0';
    }
    return percent.toFixed(1);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text mb-2">Portfolio</h1>
        <p className="text-muted">Track your positions and performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 text-muted mb-2">
            <Wallet className="h-4 w-4" />
            <span className="text-sm">Cash Balance</span>
          </div>
          <span className="text-2xl font-bold text-text">
            ${user.balance.toFixed(2)}
          </span>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 text-muted mb-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">Position Value</span>
          </div>
          <span className="text-2xl font-bold text-text">
            ${totalValue.toFixed(2)}
          </span>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 text-muted mb-2">
            {totalPnL >= 0 ? (
              <TrendingUp className="h-4 w-4 text-yes" />
            ) : (
              <TrendingDown className="h-4 w-4 text-no" />
            )}
            <span className="text-sm">Total P&L</span>
          </div>
          <span className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-yes' : 'text-no'}`}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
          </span>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 text-muted mb-2">
            <Wallet className="h-4 w-4" />
            <span className="text-sm">Total Value</span>
          </div>
          <span className="text-2xl font-bold text-text">
            ${(user.balance + totalValue).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Open Positions */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent" />
            <h2 className="text-xl font-semibold text-text">Open Positions</h2>
            <span className="ml-auto text-sm text-muted">{openPositions.length} positions</span>
          </div>
        </div>

        {openPositions.length > 0 ? (
          <div className="divide-y divide-border">
            {openPositions.map((position) => (
              <Link
                key={position.id}
                to={`/market/${position.market_id}`}
                className="flex items-center justify-between p-6 hover:bg-card-hover transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-text font-medium truncate mb-1">
                    {position.market_title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm">
                    <span className={`font-semibold ${
                      position.position_type === 'YES' ? 'text-yes' : 'text-no'
                    }`}>
                      {position.position_type}
                    </span>
                    <span className="text-muted">
                      {position.shares.toFixed(2)} shares @ {(position.avg_price * 100).toFixed(1)}¢
                    </span>
                    <span className="text-muted">
                      Now: {(position.current_price * 100).toFixed(1)}¢
                    </span>
                    {position.closes_at && (
                      <span className="text-muted hidden md:inline">
                        Closes {formatDistanceToNow(new Date(position.closes_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-6 ml-4">
                  <div className="text-right">
                    <div className="text-text font-medium">
                      ${position.current_value.toFixed(2)}
                    </div>
                    <div className={`text-sm ${position.pnl >= 0 ? 'text-yes' : 'text-no'}`}>
                      {position.pnl >= 0 ? '+' : ''}{formatPnLPercent(position.pnl, position.cost_basis)}%
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-muted" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <TrendingUp className="h-12 w-12 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text mb-2">No open positions</h3>
            <p className="text-muted mb-4">Start trading to build your portfolio</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
            >
              Browse Markets
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>

      {/* Resolved Positions */}
      {resolvedPositions.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-yes" />
              <h2 className="text-xl font-semibold text-text">Resolved Positions</h2>
              <span className="ml-auto text-sm text-muted">{resolvedPositions.length} positions</span>
            </div>
          </div>

          <div className="divide-y divide-border">
            {resolvedPositions.map((position) => {
              const won = position.outcome === position.position_type;
              return (
                <Link
                  key={position.id}
                  to={`/proof/${position.market_id}`}
                  className="flex items-center justify-between p-6 hover:bg-card-hover transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-text font-medium truncate mb-1">
                      {position.market_title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm">
                      <span className={`font-semibold ${
                        position.position_type === 'YES' ? 'text-yes' : 'text-no'
                      }`}>
                        {position.position_type}
                      </span>
                      <span className="text-muted">
                        {position.shares.toFixed(2)} shares
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        won ? 'bg-yes/10 text-yes' : 'bg-no/10 text-no'
                      }`}>
                        {won ? 'Won' : 'Lost'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 ml-4">
                    <div className="text-right">
                      <div className={`font-semibold ${won ? 'text-yes' : 'text-no'}`}>
                        {won ? `+$${position.shares.toFixed(2)}` : `-$${position.cost_basis.toFixed(2)}`}
                      </div>
                      <div className="text-sm text-muted">
                        Resolved {position.outcome}
                      </div>
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-muted" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {transactions.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-semibold text-text">Recent Activity</h2>
          </div>

          <div className="divide-y divide-border">
            {transactions.slice(0, 10).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 hover:bg-card-hover transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    tx.type === 'BUY' ? 'bg-yes' : 'bg-no'
                  }`} />
                  <div>
                    <span className="text-text capitalize">{tx.type.toLowerCase()}</span>
                    <span className="text-muted"> {tx.shares.toFixed(2)} </span>
                    <span className={tx.position_type === 'YES' ? 'text-yes' : 'text-no'}>
                      {tx.position_type}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${tx.type === 'BUY' ? 'text-no' : 'text-yes'}`}>
                    {tx.type === 'BUY' ? '-' : '+'}${tx.total_cost.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted">
                    {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
