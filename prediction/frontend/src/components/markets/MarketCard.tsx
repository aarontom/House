import { Link } from 'react-router-dom';
import { Clock, Users, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow, isPast } from 'date-fns';
import type { Market } from '../../types';
import MiniChart from './MiniChart';

interface MarketCardProps {
  market: Market;
}

export default function MarketCard({ market }: MarketCardProps) {
  const yesPercent = Math.round(market.yes_price * 100);
  const isExpired = isPast(new Date(market.closes_at));
  const isResolved = market.status === 'resolved';

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'crypto':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'sports':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'weather':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'entertainment':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      case 'technology':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'custom':
      default:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    }
  };

  return (
    <Link
      to={`/market/${market.id}`}
      className="block group"
    >
      <div className="bg-card hover:bg-card-hover border border-border rounded-2xl p-5 transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/10 hover:-translate-y-1 transform">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryColor(market.category)}`}>
            {market.category}
          </span>
          {isResolved && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              market.outcome === 'YES' 
                ? 'bg-yes/10 text-yes' 
                : 'bg-no/10 text-no'
            }`}>
              {market.outcome === 'YES' ? (
                <CheckCircle className="h-3.5 w-3.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              Resolved {market.outcome}
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-text mb-4 line-clamp-2 group-hover:text-accent transition-colors duration-300">
          {market.title}
        </h3>

        {/* Mini Chart */}
        {market.price_history && market.price_history.length > 1 && (
          <div className="mb-4 h-12 group-hover:opacity-80 transition-opacity duration-300">
            <MiniChart data={market.price_history} />
          </div>
        )}

        {/* Probability Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-yes font-semibold">{yesPercent}% Yes</span>
            <span className="text-no font-semibold">{100 - yesPercent}% No</span>
          </div>
          <div className="h-2 bg-background rounded-full overflow-hidden flex group-hover:h-2.5 transition-all duration-300">
            <div 
              className="bg-gradient-to-r from-yes to-yes/80 transition-all duration-500 group-hover:shadow-sm group-hover:shadow-yes/20"
              style={{ width: `${yesPercent}%` }}
            />
            <div 
              className="bg-gradient-to-r from-no/80 to-no flex-1 group-hover:shadow-sm group-hover:shadow-no/20 transition-all duration-300"
            />
          </div>
        </div>

        {/* Footer Stats */}
        <div className="flex items-center justify-between text-sm text-muted">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" />
              <span>${market.volume?.toLocaleString() || '0'}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>
              {isResolved 
                ? 'Resolved'
                : isExpired 
                  ? 'Closed' 
                  : formatDistanceToNow(new Date(market.closes_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
