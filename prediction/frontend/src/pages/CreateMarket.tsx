import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Loader2, ArrowRight, Sparkles, Zap, HelpCircle, Wand2, Send, RefreshCw } from 'lucide-react';
import { format, addDays, addHours, addMonths } from 'date-fns';
import { getTemplates, createMarket, generateMarketWithAI, getAIStatus, type GeneratedMarket } from '../services/api';
import { useUser } from '../hooks/useUser';
import type { Template } from '../types';

type MarketType = 'custom' | 'api' | 'template' | 'ai';

export default function CreateMarket() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [marketType, setMarketType] = useState<MarketType>('custom');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // AI Generation state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  
  // Check if AI is enabled on mount
  useEffect(() => {
    getAIStatus().then(status => setAiEnabled(status.enabled)).catch(() => setAiEnabled(false));
  }, []);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'custom',
    resolution_source: 'manual',
    criteria_path: 'manual',
    criteria_operator: 'equals',
    criteria_value: 'true',
    closes_at: format(addDays(new Date(), 7), "yyyy-MM-dd'T'HH:mm"),
    initial_liquidity: 100,
  });

  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => getTemplates(),
  });

  const handleMarketTypeSelect = (type: MarketType) => {
    setMarketType(type);
    if (type === 'custom') {
      setFormData({
        ...formData,
        resolution_source: 'manual',
        criteria_path: 'manual',
        criteria_operator: 'equals',
        criteria_value: 'true',
        category: 'custom',
      });
      setSelectedTemplate(null);
      setStep(2);
    } else if (type === 'ai') {
      setShowAiPanel(true);
    } else if (type === 'template') {
      // Stay on step 1 to select template
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      setError('Please describe your prediction market idea');
      return;
    }
    
    setAiLoading(true);
    setError('');
    
    try {
      const generated = await generateMarketWithAI(aiPrompt);
      
      // Apply generated market to form
      setFormData({
        ...formData,
        title: generated.title,
        description: generated.description,
        category: generated.category,
        resolution_source: 'manual',
        criteria_path: 'manual',
        criteria_operator: 'equals',
        criteria_value: 'true',
        closes_at: format(addDays(new Date(), generated.suggested_close_days), "yyyy-MM-dd'T'HH:mm"),
      });
      
      setMarketType('custom'); // AI generates custom markets
      setShowAiPanel(false);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate market. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setMarketType('api');
    setFormData({
      ...formData,
      category: template.category,
      resolution_source: template.resolution_source,
      criteria_path: template.resolution_logic.path,
      closes_at: format(addHours(new Date(), template.default_duration_hours), "yyyy-MM-dd'T'HH:mm"),
    });
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Please login to create a market');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // For custom markets, use simplified resolution criteria
      const resolutionCriteria = marketType === 'custom' 
        ? {
            path: 'manual',
            operator: 'equals',
            value: true,
            description: formData.description
          }
        : {
            path: formData.criteria_path,
            operator: formData.criteria_operator,
            value: isNaN(Number(formData.criteria_value)) 
              ? formData.criteria_value 
              : Number(formData.criteria_value),
          };

      const market = await createMarket({
        template_id: selectedTemplate?.id,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        resolution_source: formData.resolution_source,
        resolution_criteria: resolutionCriteria,
        created_by: user.id,
        closes_at: new Date(formData.closes_at).toISOString(),
        initial_liquidity: formData.initial_liquidity,
      });

      navigate(`/market/${market.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create market');
    } finally {
      setLoading(false);
    }
  };

  // Quick templates for crypto
  const cryptoQuickTemplates = [
    { coin: 'bitcoin', name: 'Bitcoin', symbol: 'BTC' },
    { coin: 'ethereum', name: 'Ethereum', symbol: 'ETH' },
    { coin: 'solana', name: 'Solana', symbol: 'SOL' },
  ];

  const applyCryptoQuickTemplate = (coin: string, name: string) => {
    setFormData({
      ...formData,
      title: `Will ${name} be above $X by ${format(addDays(new Date(), 1), 'MMM d')}?`,
      description: `This market resolves YES if ${name} price is at or above the target price on CoinGecko at market close time.`,
      resolution_source: `https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd`,
      criteria_path: `${coin}.usd`,
      criteria_operator: '>=',
    });
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-card mb-4">
          <Plus className="h-8 w-8 text-muted" />
        </div>
        <h2 className="text-2xl font-bold text-text mb-4">Login Required</h2>
        <p className="text-muted">Please login to create a prediction market.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F7931E]/10 text-[#F7931E] text-sm font-medium mb-4">
          <Sparkles className="h-4 w-4" />
          Create Market
        </div>
        <h1 className="text-3xl font-bold text-text mb-2">
          Create a Prediction Market
        </h1>
        <p className="text-muted">
          Set up a market that auto-resolves with verifiable data
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-[#F7931E]' : 'text-muted'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            step >= 1 ? 'brand-gradient text-white' : 'bg-card text-muted'
          }`}>1</div>
          <span className="hidden sm:inline">Template</span>
        </div>
        <ArrowRight className="h-4 w-4 text-muted" />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-[#F7931E]' : 'text-muted'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            step >= 2 ? 'brand-gradient text-white' : 'bg-card text-muted'
          }`}>2</div>
          <span className="hidden sm:inline">Details</span>
        </div>
      </div>

      {/* AI Generation Panel */}
      {showAiPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-xl p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl brand-gradient">
                <Wand2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text">AI Market Generator</h2>
                <p className="text-sm text-muted">Describe your idea and let AI create the market</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                What do you want to predict?
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g., Will Bitcoin hit $150k this year? Whether it will snow in Seattle next week, if the Lakers win the championship..."
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text placeholder-muted focus:outline-none focus:border-accent min-h-[120px] resize-none"
                disabled={aiLoading}
              />
              <p className="text-xs text-muted mt-2">
                Be as specific as possible. Include dates, names, and conditions.
              </p>
            </div>
            
            {/* Example prompts */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted">Try these examples:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Will it snow in NYC this weekend?",
                  "SpaceX launches Starship successfully in February",
                  "Apple announces a foldable iPhone at WWDC",
                  "My package from Amazon arrives before Friday",
                ].map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setAiPrompt(example)}
                    className="px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-muted hover:text-text hover:border-accent transition-colors"
                    disabled={aiLoading}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
            
            {error && (
              <div className="p-3 rounded-lg bg-no/10 border border-no/20 text-no text-sm">
                {error}
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAiPanel(false);
                  setError('');
                }}
                className="px-4 py-2.5 rounded-xl bg-background border border-border text-text font-medium hover:bg-card-hover transition-colors"
                disabled={aiLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={aiLoading || !aiPrompt.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl brand-gradient text-white font-semibold hover:brand-glow transition-all disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Generate Market
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Market Type Selection */}
      {step === 1 && (
        <div className="space-y-8">
          <h2 className="text-xl font-semibold text-text text-center">What kind of market do you want to create?</h2>
          
          {/* AI Generation - Featured Option */}
          {aiEnabled && (
            <button
              onClick={() => handleMarketTypeSelect('ai')}
              className="w-full text-left p-6 bg-gradient-to-r from-[#FF6B35]/10 via-[#F7931E]/10 to-[#FEC84D]/10 border-2 border-[#F7931E]/50 rounded-2xl hover:border-[#F7931E] transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl brand-gradient shadow-lg group-hover:brand-glow transition-all">
                  <Wand2 className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold brand-gradient-text">AI-Powered Creation</h3>
                    <span className="px-2 py-0.5 text-xs font-medium bg-[#F7931E]/20 text-[#F7931E] rounded-full">New</span>
                  </div>
                  <p className="text-muted mb-3">
                    Describe your prediction idea in plain English and let AI generate a well-structured market for you instantly.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 text-xs bg-card rounded-md text-muted">"Bitcoin hitting 150k"</span>
                    <span className="px-2 py-1 text-xs bg-card rounded-md text-muted">"SpaceX Starship launch success"</span>
                    <span className="px-2 py-1 text-xs bg-card rounded-md text-muted">"Snow in Seattle next week"</span>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-[#F7931E] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          )}
          
          {/* Custom Event */}
          <button
            onClick={() => handleMarketTypeSelect('custom')}
            className="w-full text-left p-6 bg-gradient-to-r from-accent/10 to-purple-500/10 border-2 border-accent/50 rounded-2xl hover:border-accent hover:bg-accent/5 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-accent/20 group-hover:bg-accent/30 transition-colors">
                <Zap className="h-6 w-6 text-accent" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-text">Custom Event</h3>
                  {!aiEnabled && <span className="px-2 py-0.5 text-xs font-medium bg-accent/20 text-accent rounded-full">Recommended</span>}
                </div>
                <p className="text-muted mb-3">
                  Create a prediction market for any yes/no question. Perfect for personal bets, community predictions, or custom events.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 text-xs bg-card rounded-md text-muted">"Will it rain tomorrow?"</span>
                  <span className="px-2 py-1 text-xs bg-card rounded-md text-muted">"Will our team win?"</span>
                  <span className="px-2 py-1 text-xs bg-card rounded-md text-muted">"Will X happen by Y date?"</span>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted">or use a template</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Template Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates?.filter(t => t.category !== 'custom').map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className="text-left p-5 bg-card border border-border rounded-2xl hover:border-accent/50 hover:bg-card-hover transition-all"
              >
                <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mb-3 ${
                  template.category === 'crypto' ? 'bg-orange-500/10 text-orange-400' :
                  template.category === 'sports' ? 'bg-green-500/10 text-green-400' :
                  template.category === 'weather' ? 'bg-blue-500/10 text-blue-400' :
                  'bg-purple-500/10 text-purple-400'
                }`}>
                  {template.category}
                </div>
                <h3 className="text-base font-semibold text-text mb-1">{template.name}</h3>
                <p className="text-sm text-muted">{template.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Market Details */}
      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Market Type Badge */}
          <div className="flex items-center gap-2 text-sm">
            <span className={`px-3 py-1 rounded-full font-medium ${
              marketType === 'custom' 
                ? 'bg-accent/20 text-accent' 
                : 'bg-orange-500/20 text-orange-400'
            }`}>
              {marketType === 'custom' ? 'Custom Event' : 'API-Based Market'}
            </span>
            <span className="text-muted">
              {marketType === 'custom' ? 'Manual resolution' : 'Auto-resolution'}
            </span>
          </div>

          {selectedTemplate?.category === 'crypto' && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-sm font-medium text-muted mb-3">Quick Fill</h3>
              <div className="flex gap-2">
                {cryptoQuickTemplates.map((c) => (
                  <button
                    key={c.coin}
                    type="button"
                    onClick={() => applyCryptoQuickTemplate(c.coin, c.name)}
                    className="px-4 py-2 bg-background rounded-lg text-sm font-medium text-text hover:bg-accent/20 transition-colors"
                  >
                    {c.symbol}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                Market Question *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text placeholder-muted focus:outline-none focus:border-accent"
                placeholder={marketType === 'custom' 
                  ? "Will it rain in NYC tomorrow?" 
                  : "Will Bitcoin be above $100,000 by end of month?"}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text placeholder-muted focus:outline-none focus:border-accent min-h-[100px]"
                placeholder={marketType === 'custom'
                  ? "Describe the exact conditions for YES and NO outcomes. Be specific so there's no ambiguity when resolving."
                  : "Describe how this market will be resolved..."}
                required
              />
              {marketType === 'custom' && (
                <p className="text-xs text-muted mt-2 flex items-center gap-1">
                  <HelpCircle className="h-3 w-3" />
                  This will be used as the resolution criteria. Be clear and specific.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-muted mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text focus:outline-none focus:border-accent"
                >
                  <option value="custom">Custom</option>
                  <option value="crypto">Crypto</option>
                  <option value="sports">Sports</option>
                  <option value="weather">Weather</option>
                  <option value="politics">Politics</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="technology">Technology</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted mb-2">
                  Closes At *
                </label>
                <input
                  type="datetime-local"
                  value={formData.closes_at}
                  onChange={(e) => setFormData({ ...formData, closes_at: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text focus:outline-none focus:border-accent"
                  required
                />
                {/* Quick date buttons */}
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, closes_at: format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm") })}
                    className="px-3 py-1 text-xs bg-background border border-border rounded-lg text-muted hover:text-text hover:border-accent transition-colors"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, closes_at: format(addDays(new Date(), 7), "yyyy-MM-dd'T'HH:mm") })}
                    className="px-3 py-1 text-xs bg-background border border-border rounded-lg text-muted hover:text-text hover:border-accent transition-colors"
                  >
                    1 Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, closes_at: format(addMonths(new Date(), 1), "yyyy-MM-dd'T'HH:mm") })}
                    className="px-3 py-1 text-xs bg-background border border-border rounded-lg text-muted hover:text-text hover:border-accent transition-colors"
                  >
                    1 Month
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Liquidity Settings */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text">Liquidity</h3>
              <span className="text-sm text-muted">Controls price sensitivity</span>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-muted">
                  Liquidity Parameter
                </label>
                <span className="text-text font-medium">{formData.initial_liquidity}</span>
              </div>
              <input
                type="range"
                min="50"
                max="500"
                step="25"
                value={formData.initial_liquidity}
                onChange={(e) => setFormData({ ...formData, initial_liquidity: parseInt(e.target.value) })}
                className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <div className="flex justify-between text-xs text-muted mt-1">
                <span>Low (more volatile)</span>
                <span>High (more stable)</span>
              </div>
            </div>
          </div>

          {/* API Resolution Settings - Only for non-custom markets */}
          {marketType !== 'custom' && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
              <h3 className="text-lg font-semibold text-text">Resolution Source</h3>

              <div>
                <label className="block text-sm font-medium text-muted mb-2">
                  Data Source URL *
                </label>
                <input
                  type="text"
                  value={formData.resolution_source}
                  onChange={(e) => setFormData({ ...formData, resolution_source: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text placeholder-muted focus:outline-none focus:border-accent font-mono text-sm"
                  placeholder="https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    JSON Path *
                  </label>
                  <input
                    type="text"
                    value={formData.criteria_path}
                    onChange={(e) => setFormData({ ...formData, criteria_path: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text placeholder-muted focus:outline-none focus:border-accent font-mono text-sm"
                    placeholder="bitcoin.usd"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    Operator
                  </label>
                  <select
                    value={formData.criteria_operator}
                    onChange={(e) => setFormData({ ...formData, criteria_operator: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text focus:outline-none focus:border-accent"
                  >
                    <option value=">=">Greater or Equal (≥)</option>
                    <option value="<=">Less or Equal (≤)</option>
                    <option value=">">Greater Than (&gt;)</option>
                    <option value="<">Less Than (&lt;)</option>
                    <option value="equals">Equals</option>
                    <option value="contains">Contains</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    Target Value *
                  </label>
                  <input
                    type="text"
                    value={formData.criteria_value}
                    onChange={(e) => setFormData({ ...formData, criteria_value: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text placeholder-muted focus:outline-none focus:border-accent"
                    placeholder="100000"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Manual Resolution Notice for Custom Markets */}
          {marketType === 'custom' && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-400 mb-1">Manual Resolution</h4>
                  <p className="text-sm text-muted">
                    This market will need to be resolved manually by the creator or an admin once the outcome is known.
                    Make sure your description is clear so everyone agrees on the outcome.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-no/10 border border-no/20 text-no">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-6 py-3 rounded-xl bg-card border border-border text-text font-medium hover:bg-card-hover transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl brand-gradient hover:brand-glow text-white font-semibold transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              ) : (
                'Create Market'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
