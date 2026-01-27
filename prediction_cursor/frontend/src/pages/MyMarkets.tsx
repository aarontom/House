import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Loader2, LayoutGrid, Settings, ImagePlus, FileText, 
  Send, Clock, CheckCircle, XCircle, TrendingUp, X, Video, Image as ImageIcon
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useUser } from '../hooks/useUser';
import { getMyMarkets, postMarketUpdate, getMarketUpdates, resolveMarket, uploadFile } from '../services/api';
import type { Market } from '../types';

interface MarketUpdate {
  id: string;
  market_id: string;
  user_id: string;
  update_type: 'text' | 'image' | 'progress';
  content: string;
  media_url?: string;
  created_at: string;
}

export default function MyMarkets() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [updateContent, setUpdateContent] = useState('');
  const [updateType, setUpdateType] = useState<'text' | 'progress' | 'media'>('text');
  const [showResolveModal, setShowResolveModal] = useState(false);
  
  // Media upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data: markets, isLoading } = useQuery({
    queryKey: ['my-markets', user?.id],
    queryFn: () => getMyMarkets(user!.id),
    enabled: !!user?.id,
  });

  const { data: updates } = useQuery({
    queryKey: ['market-updates', selectedMarket?.id],
    queryFn: () => getMarketUpdates(selectedMarket!.id),
    enabled: !!selectedMarket?.id,
  });

  const postUpdateMutation = useMutation({
    mutationFn: (data: { marketId: string; updateType: string; content: string; mediaUrl?: string }) =>
      postMarketUpdate(data.marketId, user!.id, data.updateType, data.content, data.mediaUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-updates', selectedMarket?.id] });
      setUpdateContent('');
      setSelectedFile(null);
      setFilePreview(null);
      setUpdateType('text');
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (data: { marketId: string; outcome: 'YES' | 'NO' }) =>
      resolveMarket(data.marketId, data.outcome, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-markets'] });
      setShowResolveModal(false);
      setSelectedMarket(null);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Invalid file type. Please upload an image or video.');
      return;
    }

    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File too large. Maximum size is 50MB.');
      return;
    }

    setUploadError(null);
    setSelectedFile(file);
    setUpdateType('media');

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUpdateType('text');
  };

  const handlePostUpdate = async () => {
    if (!selectedMarket) return;
    if (!updateContent.trim() && !selectedFile) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      let mediaUrl: string | undefined;

      // Upload file if selected
      if (selectedFile) {
        const uploadResult = await uploadFile(selectedFile);
        mediaUrl = uploadResult.url;
      }

      await postUpdateMutation.mutateAsync({
        marketId: selectedMarket.id,
        updateType: selectedFile ? 'media' : updateType,
        content: updateContent || (selectedFile ? 'Shared media' : ''),
        mediaUrl,
      });
    } catch (error: any) {
      setUploadError(error.message || 'Failed to post update');
    } finally {
      setIsUploading(false);
    }
  };

  const isVideo = (url: string) => {
    return url.match(/\.(mp4|webm|mov)$/i);
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-card mb-4">
          <LayoutGrid className="h-8 w-8 text-muted" />
        </div>
        <h2 className="text-2xl font-bold text-text mb-4">Login Required</h2>
        <p className="text-muted">Please login to view your markets.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">My Markets</h1>
          <p className="text-muted mt-1">Manage markets you've created</p>
        </div>
        <Link
          to="/create"
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white font-medium rounded-xl transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create New
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : markets && markets.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Markets List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold text-text">Your Markets ({markets.length})</h2>
            <div className="space-y-3">
              {markets.map((market) => (
                <button
                  key={market.id}
                  onClick={() => setSelectedMarket(market)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedMarket?.id === market.id
                      ? 'border-accent bg-accent/10'
                      : 'border-border bg-card hover:border-accent/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-medium text-text text-sm line-clamp-2">{market.title}</h3>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                      market.status === 'open' 
                        ? 'bg-yes/10 text-yes' 
                        : market.status === 'resolved'
                          ? 'bg-accent/10 text-accent'
                          : 'bg-muted/10 text-muted'
                    }`}>
                      {market.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(market.closes_at), { addSuffix: true })}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {Math.round(market.yes_price * 100)}% Yes
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Market Details & Updates */}
          <div className="lg:col-span-2">
            {selectedMarket ? (
              <div className="space-y-6">
                {/* Market Info Card */}
                <div className="bg-card border border-border rounded-2xl p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${
                        selectedMarket.category === 'custom' ? 'bg-purple-500/10 text-purple-400' :
                        selectedMarket.category === 'crypto' ? 'bg-orange-500/10 text-orange-400' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>
                        {selectedMarket.category}
                      </span>
                      <h2 className="text-xl font-bold text-text">{selectedMarket.title}</h2>
                    </div>
                    {selectedMarket.status === 'open' && (
                      <button
                        onClick={() => setShowResolveModal(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        Resolve
                      </button>
                    )}
                  </div>
                  
                  <p className="text-muted text-sm mb-4">{selectedMarket.description}</p>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-background rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-yes">{Math.round(selectedMarket.yes_price * 100)}%</div>
                      <div className="text-xs text-muted">Yes Price</div>
                    </div>
                    <div className="bg-background rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-text">${selectedMarket.volume?.toFixed(0) || 0}</div>
                      <div className="text-xs text-muted">Volume</div>
                    </div>
                    <div className="bg-background rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-text">
                        {format(new Date(selectedMarket.closes_at), 'MMM d')}
                      </div>
                      <div className="text-xs text-muted">Closes</div>
                    </div>
                  </div>
                </div>

                {/* Post Update Section */}
                {selectedMarket.status === 'open' && (
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-text mb-4">Post Update</h3>
                    <p className="text-sm text-muted mb-4">
                      Share progress, news, or media about this market with traders.
                    </p>
                    
                    {/* Update Type Buttons */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => { setUpdateType('text'); handleRemoveFile(); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          updateType === 'text'
                            ? 'bg-accent text-white'
                            : 'bg-background text-muted hover:text-text'
                        }`}
                      >
                        <FileText className="h-4 w-4" />
                        Note
                      </button>
                      <button
                        onClick={() => { setUpdateType('progress'); handleRemoveFile(); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          updateType === 'progress'
                            ? 'bg-accent text-white'
                            : 'bg-background text-muted hover:text-text'
                        }`}
                      >
                        <TrendingUp className="h-4 w-4" />
                        Progress
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          updateType === 'media'
                            ? 'bg-accent text-white'
                            : 'bg-background text-muted hover:text-text'
                        }`}
                      >
                        <ImagePlus className="h-4 w-4" />
                        Media
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>

                    {/* File Preview */}
                    {filePreview && (
                      <div className="mb-4 relative inline-block">
                        <button
                          onClick={handleRemoveFile}
                          className="absolute -top-2 -right-2 z-10 p-1 bg-no rounded-full text-white hover:bg-red-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        {selectedFile?.type.startsWith('video/') ? (
                          <video
                            src={filePreview}
                            className="max-h-48 rounded-xl border border-border"
                            controls
                          />
                        ) : (
                          <img
                            src={filePreview}
                            alt="Preview"
                            className="max-h-48 rounded-xl border border-border"
                          />
                        )}
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                          {selectedFile?.type.startsWith('video/') ? (
                            <Video className="h-3 w-3" />
                          ) : (
                            <ImageIcon className="h-3 w-3" />
                          )}
                          <span>{selectedFile?.name}</span>
                          <span>({(selectedFile?.size || 0 / 1024 / 1024).toFixed(2)} MB)</span>
                        </div>
                      </div>
                    )}

                    {uploadError && (
                      <div className="mb-4 p-3 rounded-lg bg-no/10 border border-no/20 text-no text-sm">
                        {uploadError}
                      </div>
                    )}
                    
                    <textarea
                      value={updateContent}
                      onChange={(e) => setUpdateContent(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text placeholder-muted focus:outline-none focus:border-accent min-h-[100px] resize-none"
                      placeholder={
                        updateType === 'media'
                          ? "Add a caption to your media (optional)..."
                          : updateType === 'progress' 
                            ? "Share progress on this market (e.g., 'Event is now 50% complete...')"
                            : "Share an update or news related to this market..."
                      }
                    />
                    
                    <button
                      onClick={handlePostUpdate}
                      disabled={(!updateContent.trim() && !selectedFile) || postUpdateMutation.isPending || isUploading}
                      className="mt-3 flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      {(postUpdateMutation.isPending || isUploading) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      {isUploading ? 'Uploading...' : 'Post Update'}
                    </button>
                  </div>
                )}

                {/* Updates Timeline */}
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-text mb-4">Updates & Activity</h3>
                  
                  {updates && updates.length > 0 ? (
                    <div className="space-y-4">
                      {updates.map((update: MarketUpdate) => (
                        <div key={update.id} className="flex gap-3 pb-4 border-b border-border last:border-0">
                          <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            update.update_type === 'progress' 
                              ? 'bg-yes/10 text-yes' 
                              : update.update_type === 'media'
                                ? 'bg-purple-500/10 text-purple-400'
                                : 'bg-accent/10 text-accent'
                          }`}>
                            {update.update_type === 'progress' ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : update.update_type === 'media' ? (
                              <ImageIcon className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-text text-sm">{update.content}</p>
                            {update.media_url && (
                              <div className="mt-2">
                                {isVideo(update.media_url) ? (
                                  <video
                                    src={update.media_url}
                                    className="max-w-full max-h-64 rounded-xl border border-border"
                                    controls
                                  />
                                ) : (
                                  <img
                                    src={update.media_url}
                                    alt="Update media"
                                    className="max-w-full max-h-64 rounded-xl border border-border"
                                  />
                                )}
                              </div>
                            )}
                            <span className="text-xs text-muted mt-1 block">
                              {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted text-sm text-center py-8">
                      No updates yet. Post your first update above!
                    </p>
                  )}
                </div>

                {/* View Market Link */}
                <Link
                  to={`/market/${selectedMarket.id}`}
                  className="block w-full py-3 text-center bg-background border border-border rounded-xl text-accent font-medium hover:bg-card transition-colors"
                >
                  View Full Market Page
                </Link>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-12 text-center">
                <LayoutGrid className="h-12 w-12 text-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-text mb-2">Select a Market</h3>
                <p className="text-muted">
                  Choose a market from the list to manage it, post updates, or resolve it.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-card mb-4">
            <LayoutGrid className="h-8 w-8 text-muted" />
          </div>
          <h3 className="text-xl font-semibold text-text mb-2">No markets yet</h3>
          <p className="text-muted mb-6">Create your first prediction market!</p>
          <Link
            to="/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create Market
          </Link>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && selectedMarket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-text mb-2">Resolve Market</h3>
            <p className="text-muted text-sm mb-6">
              Once resolved, traders will receive payouts based on the outcome.
              This action cannot be undone.
            </p>
            
            <div className="space-y-3 mb-6">
              <button
                onClick={() => resolveMutation.mutate({ marketId: selectedMarket.id, outcome: 'YES' })}
                disabled={resolveMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-yes/10 border-2 border-yes text-yes font-semibold hover:bg-yes/20 transition-colors"
              >
                <CheckCircle className="h-5 w-5" />
                Resolve as YES
              </button>
              <button
                onClick={() => resolveMutation.mutate({ marketId: selectedMarket.id, outcome: 'NO' })}
                disabled={resolveMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-no/10 border-2 border-no text-no font-semibold hover:bg-no/20 transition-colors"
              >
                <XCircle className="h-5 w-5" />
                Resolve as NO
              </button>
            </div>
            
            <button
              onClick={() => setShowResolveModal(false)}
              className="w-full py-3 rounded-xl bg-background border border-border text-muted font-medium hover:text-text transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
