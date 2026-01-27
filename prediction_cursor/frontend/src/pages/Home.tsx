import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Home, Clock, CheckCircle, Filter, Loader2, Plus, Sparkles } from 'lucide-react';
import { getMarkets } from '../services/api';
import MarketCard from '../components/markets/MarketCard';

type StatusFilter = 'all' | 'open' | 'resolved';
type CategoryFilter = 'all' | 'custom' | 'sports' | 'entertainment' | 'weather' | 'technology';

export default function HomePage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const { data: markets, isLoading, error } = useQuery({
    queryKey: ['markets', statusFilter, categoryFilter],
    queryFn: () => getMarkets({
      status: statusFilter === 'all' ? undefined : statusFilter,
      category: categoryFilter === 'all' ? undefined : categoryFilter,
    }),
    refetchInterval: 10000, // Refresh every 10 seconds for live updates
  });

  const statusFilters: { value: StatusFilter; label: string; icon: any }[] = [
    { value: 'all', label: 'All', icon: Filter },
    { value: 'open', label: 'Open', icon: Clock },
    { value: 'resolved', label: 'Resolved', icon: CheckCircle },
  ];

  const categoryFilters: { value: CategoryFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'custom', label: 'Personal' },
    { value: 'sports', label: 'Sports' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'weather', label: 'Weather' },
    { value: 'technology', label: 'Tech' },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#FF6B35]/10 via-[#F7931E]/10 to-[#FEC84D]/10 text-sm font-medium mb-4">
          <Sparkles className="h-4 w-4 text-[#F7931E]" />
          <span className="brand-gradient-text font-semibold">Trade Everything, Create Anything</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-text mb-4">
          Welcome to <span className="brand-gradient-text">House</span>
        </h1>
        <p className="text-lg text-muted max-w-2xl mx-auto mb-6">
          Create your own prediction markets for everyday events. Any event, any time. Be the House. 
        </p>
        <Link
          to="/create"
          className="inline-flex items-center gap-2 px-6 py-3 brand-gradient hover:brand-glow text-white font-semibold rounded-xl transition-all"
        >
          <Plus className="h-5 w-5" />
          Create Your Own Market
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        {/* Status Filter */}
        <div className="flex gap-2">
          {statusFilters.map((filter) => {
            const Icon = filter.icon;
            return (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  statusFilter === filter.value
                    ? 'brand-gradient text-white'
                    : 'bg-card text-muted hover:text-text hover:bg-card-hover'
                }`}
              >
                <Icon className="h-4 w-4" />
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {categoryFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setCategoryFilter(filter.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                categoryFilter === filter.value
                  ? 'brand-gradient text-white'
                  : 'bg-card text-muted hover:text-text hover:bg-card-hover'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Markets Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#F7931E]" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-no">Failed to load markets. Please try again.</p>
        </div>
      ) : markets && markets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {markets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-card mb-4">
            <Home className="h-8 w-8 text-muted" />
          </div>
          <h3 className="text-xl font-semibold text-text mb-2">No markets found</h3>
          <p className="text-muted">
            {statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Be the first to create a prediction market!'}
          </p>
        </div>
      )}

      {/* Stats Section */}
      {markets && markets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t border-border">
          <div className="bg-card rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-text">{markets.length}</div>
            <div className="text-sm text-muted">Active Markets</div>
          </div>
          <div className="bg-card rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-text">
              ${markets.reduce((acc, m) => acc + (m.volume || 0), 0).toLocaleString()}
            </div>
            <div className="text-sm text-muted">Total Volume</div>
          </div>
          <div className="bg-card rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-text">
              {markets.filter(m => m.status === 'open').length}
            </div>
            <div className="text-sm text-muted">Open</div>
          </div>
          <div className="bg-card rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-text">
              {markets.filter(m => m.status === 'resolved').length}
            </div>
            <div className="text-sm text-muted">Resolved</div>
          </div>
        </div>
      )}
    </div>
  );
}
