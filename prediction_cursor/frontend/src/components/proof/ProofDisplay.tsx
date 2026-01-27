import { ExternalLink, CheckCircle, XCircle, Clock, Database, Calculator, Award } from 'lucide-react';
import { format } from 'date-fns';
import type { Resolution } from '../../types';

interface ProofDisplayProps {
  resolution: Resolution;
}

export default function ProofDisplay({ resolution }: ProofDisplayProps) {
  const isYes = resolution.outcome === 'YES';

  return (
    <div className="space-y-6">
      {/* Outcome Banner */}
      <div className={`p-6 rounded-2xl border-2 ${
        isYes 
          ? 'bg-yes/10 border-yes/30' 
          : 'bg-no/10 border-no/30'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isYes ? 'bg-yes/20' : 'bg-no/20'}`}>
            {isYes ? (
              <CheckCircle className="h-8 w-8 text-yes" />
            ) : (
              <XCircle className="h-8 w-8 text-no" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">
              Resolved: <span className={isYes ? 'text-yes' : 'text-no'}>{resolution.outcome}</span>
            </h2>
            <p className="text-muted">
              {format(new Date(resolution.resolved_at), 'MMMM d, yyyy \'at\' h:mm a')}
            </p>
          </div>
        </div>
      </div>

      {/* Market Question */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-3">{resolution.market_title}</h3>
        <p className="text-muted">{resolution.market_description}</p>
      </div>

      {/* Resolution Criteria */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-accent/10">
            <Calculator className="h-5 w-5 text-accent" />
          </div>
          <h3 className="text-lg font-semibold text-white">Resolution Criteria</h3>
        </div>
        <div className="bg-background rounded-xl p-4 font-mono text-sm">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="text-muted block mb-1">Path</span>
              <span className="text-white">{resolution.resolution_criteria.path}</span>
            </div>
            <div>
              <span className="text-muted block mb-1">Operator</span>
              <span className="text-white">{resolution.resolution_criteria.operator}</span>
            </div>
            <div>
              <span className="text-muted block mb-1">Expected</span>
              <span className="text-white">{String(resolution.resolution_criteria.value)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Source */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Database className="h-5 w-5 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Data Source</h3>
        </div>
        
        {resolution.source_url !== 'manual' ? (
          <a
            href={resolution.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-accent hover:text-accent-hover transition-colors mb-4"
          >
            <span className="truncate">{resolution.source_url}</span>
            <ExternalLink className="h-4 w-4 flex-shrink-0" />
          </a>
        ) : (
          <p className="text-muted mb-4">Manual resolution</p>
        )}

        <div className="bg-background rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted">API Response</span>
            <span className="text-xs text-muted font-mono">JSON</span>
          </div>
          <pre className="text-sm text-white overflow-x-auto max-h-48 font-mono">
            {JSON.stringify(resolution.source_response, null, 2)}
          </pre>
        </div>
      </div>

      {/* Calculation Steps */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <Clock className="h-5 w-5 text-orange-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Resolution Steps</h3>
        </div>
        
        <div className="space-y-4">
          {resolution.calculation_steps.map((step, index) => (
            <div 
              key={step.step}
              className="relative pl-8 pb-4 last:pb-0"
            >
              {/* Connector line */}
              {index < resolution.calculation_steps.length - 1 && (
                <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-border" />
              )}
              
              {/* Step number */}
              <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                {step.step}
              </div>
              
              {/* Step content */}
              <div className="bg-background rounded-xl p-4">
                <p className="text-white font-medium mb-2">{step.description}</p>
                {step.input && (
                  <div className="text-sm mb-2">
                    <span className="text-muted">Input: </span>
                    <code className="text-accent">{step.input}</code>
                  </div>
                )}
                {step.output && (
                  <div className="text-sm">
                    <span className="text-muted">Output: </span>
                    <code className={`${
                      step.output.includes('TRUE') || step.output === 'YES' 
                        ? 'text-yes' 
                        : step.output.includes('FALSE') || step.output === 'NO'
                          ? 'text-no'
                          : 'text-white'
                    }`}>{step.output}</code>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Final Value */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-yes/10">
            <Award className="h-5 w-5 text-yes" />
          </div>
          <h3 className="text-lg font-semibold text-white">Final Determination</h3>
        </div>
        
        <div className="flex items-center justify-between bg-background rounded-xl p-4">
          <div>
            <span className="text-muted block text-sm mb-1">Actual Value</span>
            <span className="text-white text-xl font-bold font-mono">{resolution.final_value}</span>
          </div>
          <div className={`px-4 py-2 rounded-xl font-bold text-lg ${
            isYes ? 'bg-yes/20 text-yes' : 'bg-no/20 text-no'
          }`}>
            {resolution.outcome}
          </div>
        </div>
      </div>

      {/* Resolver Info */}
      <div className="text-center text-sm text-muted">
        Resolved by: {resolution.resolved_by === 'auto' ? 'Automatic System' : resolution.resolved_by}
      </div>
    </div>
  );
}
