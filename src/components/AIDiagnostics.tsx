import React, { useState, useEffect } from 'react';
import { Sparkles, BrainCircuit, RefreshCw, CheckCircle, AlertTriangle, Play, HelpCircle } from 'lucide-react';
import { LiquidCard } from './LiquidCard';
import { AiRecommendation, GitHubRepo } from '../types';

interface AIDiagnosticsProps {
  token: string;
  repo: GitHubRepo;
  rawLogs: string;
  onApplyFix: (filePath: string, fixedContent: string) => Promise<void>;
  onTriggerRebuild: () => Promise<void>;
}

export const AIDiagnostics: React.FC<AIDiagnosticsProps> = ({
  token,
  repo,
  rawLogs,
  onApplyFix,
  onTriggerRebuild,
}) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [recommendation, setRecommendation] = useState<AiRecommendation | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // States for correcting files
  const [applying, setApplying] = useState(false);
  const [applyStep, setApplyStep] = useState<'idle' | 'committing' | 'rebuilding' | 'done'>('idle');

  useEffect(() => {
    if (rawLogs) {
      triggerAiAnalysis();
    }
  }, [rawLogs, repo]);

  const triggerAiAnalysis = async () => {
    setAnalyzing(true);
    setErrorStatus(null);
    setRecommendation(null);
    setApplyStep('idle');

    try {
      // Look for custom workflow files or project files that could be parsed
      const response = await fetch('/api/gemini/analyze-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorLogs: rawLogs,
          filePath: ".github/workflows/build-ipa.yml" // Default target fallback
        })
      });

      if (!response.ok) {
        throw new Error("Failure from Gemini backend.");
      }

      const data = await response.json();
      setRecommendation(data);
    } catch (err: any) {
      setErrorStatus(err.message || "Failed to reach AI Diagnostics server.");
    } finally {
      setAnalyzing(false);
    }
  };

  const executeRepairSequence = async () => {
    if (!recommendation) return;
    setApplying(true);
    setApplyStep('committing');

    try {
      // 1. Commit the code correction to GitHub
      const targetPath = recommendation.filePath || '.github/workflows/build-ipa.yml';
      await onApplyFix(targetPath, recommendation.proposedCode);

      // 2. Trigger the rebuild
      setApplyStep('rebuilding');
      await onTriggerRebuild();

      setApplyStep('done');
    } catch (err: any) {
      setErrorStatus(`Repair interrupted: ${err.message || err}`);
      setApplyStep('idle');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Diagnostics Panel Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <BrainCircuit className="w-6 h-6 text-pink-500" />
          AI Diagnostics Center
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Powered by Gemini AI. Analyzes build failures, pinpoints compilation faults, and deploys automatic corrections.</p>
      </div>

      {analyzing ? (
        <LiquidCard className="p-12 text-center border mr-2 border-slate-200/50 dark:border-white/10" glowColor="pink">
          <RefreshCw className="w-10 h-10 animate-spin mx-auto text-pink-500 mb-4" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200">Consulting Gemini Expert...</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1.5 leading-relaxed">
            Parsing compilation steps, evaluating logs, checking SDK configurations, and composing quick-fixes...
          </p>
        </LiquidCard>
      ) : errorStatus ? (
        <LiquidCard className="p-6 border border-rose-500/20 bg-rose-500/5" glowColor="pink">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 text-rose-500 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-rose-400">Diagnostic Interruption</h3>
              <p className="text-xs text-rose-200/80 mt-1">{errorStatus}</p>
              <button 
                onClick={triggerAiAnalysis}
                className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold active:scale-95 transition-all shadow-md"
              >
                Retry Analysis
              </button>
            </div>
          </div>
        </LiquidCard>
      ) : recommendation ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Detailed analysis column (Left 2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            
            <LiquidCard className="border border-slate-200/50 dark:border-white/10 p-5 md:p-6" glowColor="pink">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono uppercase bg-pink-500/10 text-pink-400 px-2.5 py-0.5 rounded border border-pink-500/20 font-bold">ANALYSIS REPORT</span>
                <span className="text-xs font-mono text-zinc-400 font-bold flex items-center gap-1.5">
                  Accuracy: <span className="text-emerald-400">{recommendation.confidence}%</span>
                </span>
              </div>

              <div className="space-y-4">
                {/* Summary */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Fault Summary</h4>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{recommendation.errorSummary}</p>
                </div>

                {/* Explanation */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Reason for Failure</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{recommendation.explanation}</p>
                </div>

                {/* Pinpoint exact line */}
                {recommendation.errorLine > 0 && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 animate-pulse" />
                    <span className="text-xs text-red-200">Failure traced to file line <strong>{recommendation.errorLine}</strong></span>
                  </div>
                )}

                {/* Repair Sequence process controller */}
                {applyStep === 'idle' ? (
                  <button
                    onClick={executeRepairSequence}
                    className="w-full py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold text-sm tracking-wide shadow-lg hover:shadow-pink-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 fill-white" />
                    Apply One-Click AI Repair & Rebuild
                  </button>
                ) : (
                  <div className="p-4 bg-slate-100/50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-white/5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-pink-400" />
                      <span>Executing Repair Sequence...</span>
                    </div>

                    <div className="space-y-2 text-[11px] font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">1. Push correction to GitHub</span>
                        <span className={applyStep === 'committing' ? 'text-amber-400 animate-pulse' : 'text-emerald-400 font-bold'}>
                          {applyStep === 'committing' ? 'In Progress' : 'Completed ✓'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">2. Trigger Action build dispatch</span>
                        <span className={applyStep === 'rebuilding' ? 'text-amber-400 animate-pulse' : applyStep === 'done' ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                          {applyStep === 'rebuilding' ? 'In Progress' : applyStep === 'done' ? 'Completed ✓' : 'Queued'}
                        </span>
                      </div>
                    </div>

                    {applyStep === 'done' && (
                      <div className="flex items-center gap-1.5 p-2.5 bg-emerald-500/15 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-400 font-semibold leading-relaxed">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span>Action successfully pushed & rebuilt! Check <strong>Actions Monitor</strong> tab.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </LiquidCard>

          </div>

          {/* Corrected Code Column (Right 3 columns) */}
          <div className="lg:col-span-3 flex flex-col">
            <div className="flex-1 rounded-3xl bg-slate-900/90 dark:bg-slate-950/95 border border-slate-800 text-slate-300 p-5 font-mono text-xs overflow-y-auto max-h-[500px] shadow-2xl relative">
              <div className="absolute top-4 right-4 bg-slate-800/80 text-[10px] text-zinc-400 px-2.5 py-1 rounded-md flex items-center gap-1 border border-slate-700 select-none">
                <BrainCircuit className="w-3.5 h-3.5 text-pink-400" />
                Proposed Repair - {recommendation.filePath || 'build-ipa.yml'}
              </div>
              <pre className="mt-4 leading-relaxed overflow-x-auto text-[11px] text-emerald-300 whitespace-pre">
                {recommendation.proposedCode}
              </pre>
            </div>
          </div>

        </div>
      ) : (
        <LiquidCard className="p-8 text-center border border-dashed border-slate-300 dark:border-white/10 h-full flex flex-col items-center justify-center min-h-[350px]" glowColor="pink">
          <HelpCircle className="w-12 h-12 text-pink-400/50 mb-3" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">No Failed Logs Injected</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
            AI Analytics automatically monitor and process failed steps. Check the <strong>Actions Monitor</strong> tab to launch live debugger logs.
          </p>
        </LiquidCard>
      )}

    </div>
  );
};
