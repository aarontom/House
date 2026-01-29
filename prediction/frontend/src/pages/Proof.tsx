import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { getResolution } from '../services/api';
import ProofDisplay from '../components/proof/ProofDisplay';

export default function ProofPage() {
  const { marketId } = useParams<{ marketId: string }>();

  const { data: resolution, isLoading, error } = useQuery({
    queryKey: ['resolution', marketId],
    queryFn: () => getResolution(marketId!),
    enabled: !!marketId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error || !resolution) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <h2 className="text-2xl font-bold text-text mb-4">Resolution Not Found</h2>
        <p className="text-muted mb-6">
          This market may not be resolved yet or doesn't exist.
        </p>
        <Link 
          to="/"
          className="inline-flex items-center gap-2 text-accent hover:text-accent-hover"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Markets
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back Button */}
      <Link 
        to={`/market/${marketId}`}
        className="inline-flex items-center gap-2 text-muted hover:text-text transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Market
      </Link>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-text mb-2">
          Resolution Proof
        </h1>
        <p className="text-muted">
          Transparent, verifiable market resolution
        </p>
      </div>

      {/* Proof Display */}
      <ProofDisplay resolution={resolution} />
    </div>
  );
}
