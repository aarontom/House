import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock, TrendingUp, Users, ExternalLink, FileCheck, MessageSquare, FileText, Bell, Image as ImageIcon, Video } from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { getMarket, getMarketStats, getUserPositions, getMarketUpdates } from '../services/api';
import { useUser } from '../hooks/useUser';
import TradingPanel from '../components/trading/TradingPanel';
import PriceChart from '../components/markets/PriceChart';
import type { Position } from '../types';

export default function MarketPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const { data: market, isLoading, error } = useQuery({
    queryKey: ['market', id],
    queryFn: () => getMarket(id!),
    enabled: !!id,
  });

  const { data: stats } = useQuery({
    queryKey: ['market-stats', id],
    queryFn: () => getMarketStats(id!),
    enabled: !!id,
  });

  const { data: userPositions } = useQuery({
    queryKey: ['user-positions', user?.id, id],
    queryFn: () => getUserPositions(user!.id),
    enabled: !!user?.id,
  });

  const { data: marketUpdates } = useQuery({
    queryKey: ['market-updates', id],
    queryFn: () => getMarketUpdates(id!),
    enabled: !!id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const userPosition = userPositions?.find(p => p.market_id === id);

  const handleTradeComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['market', id] });
    queryClient.invalidateQueries({ queryKey: ['market-stats', id] });
    queryClient.invalidateQueries({ queryKey: ['user-positions'] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-text mb-2">Market not found</h2>
        <Link to="/" className="text-accent hover:text-accent-hover">
          Back to markets
        </Link>
      </div>
    );
  }

  const isExpired = isPast(new Date(market.closes_at));
  const isResolved = market.status === 'resolved';
  const yesPercent = Math.round(market.yes_price * 100);

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Link 
        to="/"
        className="inline-flex items-center gap-2 text-muted hover:text-text transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Markets
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Market Header */}
          <div className="bg-card border border-border rounded-2xl p-6 animate-fade-in">
            <div className="flex items-start justify-between gap-4 mb-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                market.category === 'crypto' ? 'bg-orange-500/10 text-orange-400' :
                market.category === 'sports' ? 'bg-green-500/10 text-green-400' :
                market.category === 'weather' ? 'bg-blue-500/10 text-blue-400' :
                'bg-purple-500/10 text-purple-400'
              }`}>
                {market.category}
              </span>
              {isResolved && (
                <Link
                  to={`/proof/${market.id}`}
                  className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-colors"
                >
                  <FileCheck className="h-4 w-4" />
                  View Proof
                </Link>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-text mb-4">
              {market.title}
            </h1>

            <p className="text-muted mb-6">
              {market.description}
            </p>

            {/* Status Badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
              isResolved 
                ? market.outcome === 'YES' 
                  ? 'bg-yes/10 text-yes'
                  : 'bg-no/10 text-no'
                : isExpired 
                  ? 'bg-orange-500/10 text-orange-400'
                  : 'bg-accent/10 text-accent'
            }`}>
              <Clock className="h-4 w-4" />
              {isResolved 
                ? `Resolved: ${market.outcome}`
                : isExpired 
                  ? 'Awaiting Resolution'
                  : `Closes ${formatDistanceToNow(new Date(market.closes_at), { addSuffix: true })}`}
            </div>
          </div>

          {/* Probability Display */}
          <div className="bg-card border border-border rounded-2xl p-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <h3 className="text-sm font-medium text-muted mb-4">Current Probability</h3>
            
            <div className="flex items-end justify-between mb-4">
              <div>
                <span className="text-5xl font-bold text-yes">{yesPercent}%</span>
                <span className="text-2xl text-muted ml-2">Yes</span>
              </div>
              <div className="text-right">
                <span className="text-5xl font-bold text-no">{100 - yesPercent}%</span>
                <span className="text-2xl text-muted ml-2">No</span>
              </div>
            </div>

            <div className="h-4 bg-background rounded-full overflow-hidden flex">
              <div 
                className="bg-gradient-to-r from-yes to-yes/80 transition-all duration-500"
                style={{ width: `${yesPercent}%` }}
              />
              <div className="bg-gradient-to-r from-no/80 to-no flex-1" />
            </div>
          </div>

          {/* Price Chart */}
          {market.price_history && market.price_history.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
              <h3 className="text-lg font-semibold text-text mb-4">Price History</h3>
              <PriceChart 
                data={[
                  ...market.price_history,
                  // Add current price as the last point to ensure alignment
                  {
                    yes_price: market.yes_price,
                    no_price: market.no_price,
                    timestamp: new Date().toISOString()
                  }
                ]} 
                height={250} 
              />
            </div>
          )}

          {/* Creator Updates */}
          {marketUpdates && marketUpdates.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="h-5 w-5 text-accent" />
                <h3 className="text-lg font-semibold text-text">Creator Updates</h3>
                <span className="px-2 py-0.5 text-xs font-medium bg-accent/10 text-accent rounded-full">
                  {marketUpdates.length}
                </span>
              </div>
              <div className="space-y-4">
                {marketUpdates.slice(0, 5).map((update: any) => (
                  <div 
                    key={update.id} 
                    className="flex gap-3 pb-4 border-b border-border last:border-0 last:pb-0"
                  >
                    <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      update.update_type === 'progress' 
                        ? 'bg-yes/10 text-yes' 
                        : update.update_type === 'media'
                          ? 'bg-purple-500/10 text-purple-400'
                          : 'bg-accent/10 text-accent'
                    }`}>
                      {update.update_type === 'progress' ? (
                        <TrendingUp className="h-5 w-5" />
                      ) : update.update_type === 'media' ? (
                        <ImageIcon className="h-5 w-5" />
                      ) : (
                        <FileText className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-text text-sm">{update.username}</span>
                        <span className="text-xs text-muted">
                          {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-text text-sm whitespace-pre-wrap">{update.content}</p>
                      {update.media_url && (
                        <div className="mt-2">
                          {update.media_url.match(/\.(mp4|webm|mov)$/i) ? (
                            <video
                              src={update.media_url}
                              className="max-w-full max-h-64 rounded-xl border border-border"
                              controls
                            />
                          ) : (
                            <img
                              src={update.media_url}
                              alt="Update media"
                              className="max-w-full max-h-64 rounded-xl border border-border cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(update.media_url, '_blank')}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Volume</span>
              </div>
              <span className="text-xl font-bold text-text">
                ${market.volume?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted mb-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">Traders</span>
              </div>
              <span className="text-xl font-bold text-text">
                {stats?.traders || 0}
              </span>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted mb-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Created</span>
              </div>
              <span className="text-sm font-medium text-text">
                {format(new Date(market.created_at), 'MMM d, yyyy')}
              </span>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted mb-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Closes</span>
              </div>
              <span className="text-sm font-medium text-text">
                {format(new Date(market.closes_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>

          {/* Resolution Source */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-text mb-4">Resolution Source</h3>
            <div className="bg-background rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted">Data Source URL</span>
                {market.resolution_source !== 'manual' && (
                  <a
                    href={market.resolution_source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-hover text-sm flex items-center gap-1"
                  >
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <code className="text-sm text-text break-all">
                {market.resolution_source}
              </code>
            </div>
            <div className="mt-4 bg-background rounded-xl p-4">
              <span className="text-sm text-muted block mb-2">Resolution Criteria</span>
              <code className="text-sm text-text">
                {market.resolution_criteria.path} {market.resolution_criteria.operator} {String(market.resolution_criteria.value)}
              </code>
            </div>
          </div>

          {/* Recent Activity */}
          {market.recent_transactions && market.recent_transactions.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-text mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {market.recent_transactions.map((tx) => (
                  <div 
                    key={tx.id}
                    className="flex items-center justify-between py-3 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        tx.position_type === 'YES' ? 'bg-yes/10 text-yes' : 'bg-no/10 text-no'
                      }`}>
                        {tx.user_id?.slice(0, 2).toUpperCase() || '??'}
                      </div>
                      <div>
                        <code className="text-text font-mono text-xs bg-background px-1.5 py-0.5 rounded">{tx.user_id?.slice(0, 8) || 'Unknown'}...</code>
                        <span className="text-muted"> {tx.type.toLowerCase()} </span>
                        <span className={`font-semibold ${tx.position_type === 'YES' ? 'text-yes' : 'text-no'}`}>
                          {tx.position_type}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-text font-medium">
                        {tx.shares.toFixed(2)} shares
                      </div>
                      <div className="text-sm text-muted">
                        ${tx.total_cost.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Trading Panel */}
        <div className="space-y-6">
          <TradingPanel 
            market={market} 
            userPosition={userPosition}
            onTradeComplete={handleTradeComplete}
          />

          {/* User Position */}
          {userPosition && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-text mb-4">Your Position</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted">Position</span>
                  <span className={`font-semibold ${
                    userPosition.position_type === 'YES' ? 'text-yes' : 'text-no'
                  }`}>
                    {userPosition.position_type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Shares</span>
                  <span className="text-text font-medium">
                    {userPosition.shares.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Avg. Price</span>
                  <span className="text-text font-medium">
                    {(userPosition.avg_price * 100).toFixed(1)}¢
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Current Value</span>
                  <span className="text-text font-medium">
                    ${userPosition.current_value.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-3">
                  <span className="text-muted">P&L</span>
                  <span className={`font-semibold ${
                    userPosition.pnl >= 0 ? 'text-yes' : 'text-no'
                  }`}>
                    {userPosition.pnl >= 0 ? '+' : ''}${userPosition.pnl.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Potential Payout</span>
                  <span className="text-yes font-semibold">
                    ${userPosition.potential_payout.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
