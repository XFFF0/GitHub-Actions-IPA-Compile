import React, { useState, useEffect } from 'react';
import { 
  Play, RefreshCw, Layers, ShieldCheck, AlertCircle, Copy, 
  Check, Flame, Download, Compass, Sparkles, Terminal, FileCheck
} from 'lucide-react';
import { LiquidCard } from './LiquidCard';
import { GitHubRepo, Workflow, WorkflowRun, WorkflowJob, Artifact } from '../types';

interface ActionsMonitorProps {
  token: string;
  repo: GitHubRepo;
  onSelectionOfError: (logs: string, filePath: string) => void;
}

export const ActionsMonitor: React.FC<ActionsMonitorProps> = ({ 
  token, 
  repo, 
  onSelectionOfError 
}) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);

  // Fetching & status loading states
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [dispatching, setDispatching] = useState<number | null>(null);
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Failure logs extracted details
  const [failureStepLogs, setFailureStepLogs] = useState<string>('');
  const [detectedErrors, setDetectedErrors] = useState<string[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    loadWorkflows();
    loadRuns();
  }, [repo]);

  // Handle polling when workflow run is active
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const hasActiveRun = runs.some(r => r.status === 'queued' || r.status === 'in_progress');
    const hasActiveSelectedRun = selectedRun && (selectedRun.status === 'queued' || selectedRun.status === 'in_progress');

    if (hasActiveRun || hasActiveSelectedRun) {
      interval = setInterval(() => {
        loadRuns();
        if (selectedRun) {
          loadJobs(selectedRun.id);
          loadArtifacts(selectedRun.id);
        }
      }, 5000); // Poll every 5 seconds
    }

    return () => clearInterval(interval);
  }, [runs, selectedRun]);

  const loadWorkflows = async () => {
    setLoadingWorkflows(true);
    try {
      const response = await fetch(`https://api.github.com/repos/${repo.full_name}/actions/workflows`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.workflows || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingWorkflows(false);
    }
  };

  const loadRuns = async () => {
    setLoadingRuns(true);
    try {
      const response = await fetch(`https://api.github.com/repos/${repo.full_name}/actions/runs?per_page=12`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRuns(data.workflow_runs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRuns(false);
    }
  };

  const selectRunItem = (run: WorkflowRun) => {
    setSelectedRun(run);
    setJobs([]);
    setArtifacts([]);
    setFailureStepLogs('');
    setDetectedErrors([]);
    loadJobs(run.id);
    loadArtifacts(run.id);
  };

  const loadJobs = async (runId: number) => {
    setLoadingJobs(true);
    try {
      const response = await fetch(`https://api.github.com/repos/${repo.full_name}/actions/runs/${runId}/jobs`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);

        // Detect failed steps inside completed jobs and download logs
        const failedJob = (data.jobs as WorkflowJob[]).find(j => j.status === 'completed' && j.conclusion === 'failure');
        if (failedJob) {
          const failedStep = failedJob.steps.find(s => s.conclusion === 'failure');
          if (failedStep) {
            loadFailedStepLogs(failedJob.id);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingJobs(false);
    }
  };

  const loadArtifacts = async (runId: number) => {
    try {
      const response = await fetch(`https://api.github.com/repos/${repo.full_name}/actions/runs/${runId}/artifacts`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setArtifacts(data.artifacts || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Pull job failure logs from Github APIs
  const loadFailedStepLogs = async (jobId: number) => {
    setLoadingLogs(true);
    setFailureStepLogs('');
    setDetectedErrors([]);
    try {
      const response = await fetch(`https://api.github.com/repos/${repo.full_name}/actions/jobs/${jobId}/logs`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3.raw' // Plain text logs
        }
      });

      if (response.ok) {
        const logsText = await response.text();
        setFailureStepLogs(logsText);
        autoDetectWorkspaceErrors(logsText);
      }
    } catch (err) {
      console.error("Failed to read raw logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Parsing error logs to detect lines causing failures
  const autoDetectWorkspaceErrors = (logs: string) => {
    const lines = logs.split('\n');
    const errors: string[] = [];
    const errorIdentifiers = [
      /error:/i, /failed/i, /fatal/i, /compileError/i, /\[!\]/i, /No such file/i,
      /xcodebuild.*failed/i, /provisioning profile/i, /Code signing/i, /mismatch/i
    ];

    lines.forEach((line) => {
      const match = errorIdentifiers.some(regex => regex.test(line));
      if (match && errors.length < 8 && line.trim().length > 10) {
        errors.push(line.trim());
      }
    });

    setDetectedErrors(errors);
  };

  // Copy detected error strings to clipboard
  const handleCopyErrors = () => {
    if (detectedErrors.length === 0 && !failureStepLogs) return;
    const textToCopy = detectedErrors.length > 0 
      ? detectedErrors.join('\n') 
      : failureStepLogs.substring(0, 3000);
    
    navigator.clipboard.writeText(textToCopy);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Triggers dispatch builds inside GitHub
  const triggerWorkflowDispatch = async (workflowId: number) => {
    setDispatching(workflowId);
    setDispatchSuccess(null);
    try {
      const response = await fetch(`https://api.github.com/repos/${repo.full_name}/actions/workflows/${workflowId}/dispatches`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref: repo.default_branch
        })
      });

      if (response.ok) {
        setDispatchSuccess(`Action successfully queued inside GitHub! It will launch in a few moments.`);
        setTimeout(() => setDispatchSuccess(null), 5000);
        // Refresh runs
        setTimeout(loadRuns, 3000);
      } else {
        throw new Error(`Execution error. Status code: ${response.status}`);
      }
    } catch (err: any) {
      alert(`Could not trigger workflow: ${err.message}`);
    } finally {
      setDispatching(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      
      {/* GitHub Workflows dispatch panel (Left 2 columns) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Workflows triggers card */}
        <LiquidCard className="border border-slate-200/50 dark:border-white/10 p-5 md:p-6" glowColor="cyan">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Play className="w-4.5 h-4.5 text-cyan-400" />
            Launch Action compiler
          </h3>

          {loadingWorkflows ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-4 font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              Checking active workflows...
            </div>
          ) : workflows.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-3 leading-relaxed">
              No active workflows found. Use the <strong>Workflow YAML Builder</strong> tab or push a new Action to compile.
            </p>
          ) : (
            <div className="space-y-2.5">
              {workflows.map((w) => (
                <div 
                  key={w.id} 
                  className="p-4 rounded-2xl bg-white/30 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/5 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/60 transition-all"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] text-indigo-400 font-mono block mb-1">ID: {w.id}</span>
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{w.name}</h4>
                  </div>
                  <button
                    onClick={() => triggerWorkflowDispatch(w.id)}
                    disabled={dispatching === w.id}
                    className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md flex-shrink-0 disabled:opacity-50"
                  >
                    {dispatching === w.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                    Run Action
                  </button>
                </div>
              ))}
            </div>
          )}

          {dispatchSuccess && (
            <div className="p-3.5 mt-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{dispatchSuccess}</span>
            </div>
          )}
        </LiquidCard>

        {/* Historic workflow runs */}
        <LiquidCard className="border border-slate-200/50 dark:border-white/10 p-5 md:p-6" glowColor="neutral">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-4.5 h-4.5 text-indigo-400" />
              Actions Run history
            </h3>
            <button 
              onClick={loadRuns}
              className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-indigo-400 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {loadingRuns && runs.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-6 font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Syncing run history...
            </div>
          ) : runs.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-3 leading-relaxed">No historic runs found.</p>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {runs.map((r) => {
                const isActive = selectedRun?.id === r.id;
                const isFail = r.conclusion === 'failure';
                const isSuccess = r.conclusion === 'success';
                const isInProgress = r.status === 'queued' || r.status === 'in_progress';

                return (
                  <button
                    key={r.id}
                    onClick={() => selectRunItem(r)}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-start justify-between gap-3.5 transition-all outline-none ${
                      isActive 
                        ? 'bg-cyan-500/10 border-cyan-500/30' 
                        : 'bg-white/10 dark:bg-slate-900/10 border-transparent hover:bg-slate-100/50 dark:hover:bg-slate-900/40 hover:border-slate-200/50 dark:hover:border-white/5'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="text-[10px] font-mono font-bold text-slate-400">#{r.run_number}</span>
                        <span className="text-[9px] font-mono bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 text-slate-400 px-1 py-0.5 rounded uppercase">
                          {r.event}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{r.name || "Workflow Build Step"}</h4>
                      <span className="text-[10px] text-slate-500 block.5">{new Date(r.created_at).toLocaleDateString()} {new Date(r.created_at).toLocaleTimeString()}</span>
                    </div>

                    {/* Build Status nodes */}
                    <div className="flex-shrink-0 self-center">
                      {isInProgress ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Building
                        </span>
                      ) : isSuccess ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                          <ShieldCheck className="w-3 h-3" />
                          Success
                        </span>
                      ) : isFail ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full animate-bounce">
                          <Flame className="w-3 h-3" />
                          Failed
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          {r.conclusion || r.status}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </LiquidCard>

      </div>

      {/* Selected Action detail panel, jobs logs, and artifacts (Right 3 columns) */}
      <div className="lg:col-span-3">
        {selectedRun ? (
          <LiquidCard className="border border-slate-200/50 dark:border-white/10 p-5 md:p-6 h-full" glowColor={selectedRun.conclusion === 'failure' ? 'pink' : selectedRun.conclusion === 'success' ? 'green' : 'cyan'}>
            
            {/* Header Details */}
            <div className="pb-4.5 border-b border-slate-100 dark:border-white/5 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 font-bold block mb-1 ring-1 ring-cyan-500/20 rounded px-1.5 py-0.5 w-max">RUN DETAIL ID: {selectedRun.id}</span>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 leading-tight">
                  {selectedRun.name}
                </h3>
              </div>
              <button 
                onClick={() => selectRunItem(selectedRun)}
                className="flex items-center gap-1 text-xs text-indigo-400 border border-indigo-400/30 font-semibold px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 bg-white/20 dark:bg-slate-900/30 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Details
              </button>
            </div>

            {/* Steps & Jobs structure */}
            <div className="space-y-6">
              
              {/* Build jobs */}
              <div>
                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2.5">Jobs & Workflow Build Steps</h4>
                {loadingJobs && jobs.length === 0 ? (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono py-2">
                    <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                    Querying compiler jobs...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {jobs.map((job) => (
                      <div key={job.id} className="p-4 rounded-2xl bg-slate-100/30 dark:bg-slate-900/30 border border-slate-200/50 dark:border-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                            {job.name}
                          </span>
                          <span className={`text-[10px] font-bold uppercase rounded px-2 py-0.5 ${
                            job.conclusion === 'success' 
                              ? 'bg-emerald-500/10 text-emerald-400' 
                              : job.conclusion === 'failure' 
                              ? 'bg-rose-500/10 text-rose-300' 
                              : 'bg-amber-500/10 text-amber-300'
                          }`}>
                            {job.conclusion || job.status}
                          </span>
                        </div>

                        {/* Individual step outputs */}
                        <div className="border-t border-slate-100 dark:border-white/5 pt-2.5 space-y-1.5">
                          {job.steps.map((step) => {
                            const isFail = step.conclusion === 'failure';
                            const isSuccess = step.conclusion === 'success';
                            const isInProgress = step.status === 'in_progress';

                            return (
                              <div key={step.number} className="flex items-center justify-between text-xs py-1 px-1.5 hover:bg-slate-200/10 rounded-lg">
                                <span className="font-mono text-slate-500 dark:text-slate-400 mr-2">{step.number}</span>
                                <span className="text-slate-700 dark:text-slate-200 truncate flex-1 block text-left">
                                  {step.name}
                                </span>

                                <span className="flex-shrink-0">
                                  {isSuccess ? (
                                    <span className="text-emerald-400 font-bold">✓</span>
                                  ) : isFail ? (
                                    <span className="text-rose-400 font-bold animate-pulse">✗ Failed</span>
                                  ) : isInProgress ? (
                                    <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                                  ) : (
                                    <span className="text-slate-500">⋯</span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AUTOMATIC COMPREHENSIVE COMPILER ERROR DETECTOR MODULE */}
              {selectedRun.conclusion === 'failure' && (
                <div className="p-4.5 bg-rose-950/20 border border-rose-500/30 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-rose-400 animate-bounce" />
                      Automatic Compiler Error Analyzer
                    </h4>
                    
                    <button
                      onClick={handleCopyErrors}
                      className="flex items-center gap-1 text-[11px] font-semibold text-rose-300 hover:text-rose-200 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 active:scale-95 transition-all"
                    >
                      {copiedText ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Errors
                        </>
                      )}
                    </button>
                  </div>

                  {loadingLogs ? (
                    <div className="text-xs text-rose-300 font-mono flex items-center gap-2 py-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Scanning Raw GitHub Build Logs...
                    </div>
                  ) : detectedErrors.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[11px] text-rose-200/80 leading-relaxed">The compiler automatically intercepted the following build pipeline failures:</p>
                      <div className="p-3 bg-black/50 rounded-xl font-mono text-[10px] text-red-200 max-h-[160px] overflow-y-auto space-y-2 border border-red-950 text-left select-text">
                        {detectedErrors.map((err, idx) => (
                          <div key={idx} className="pb-1.5 border-b border-rose-950/30 last:border-none break-all">
                            {err}
                          </div>
                        ))}
                      </div>

                      {/* Trigger launcher for AI Diagnostics */}
                      <div className="pt-2.5">
                        <button
                          onClick={() => onSelectionOfError(failureStepLogs, "")}
                          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg transition-all active:scale-95 border border-red-500/20"
                        >
                          <Sparkles className="w-4 h-4 fill-white" />
                          Trigger Gemini Free AI Diagnostic Fix
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-rose-300 italic">Failure logs are currently loading or require direct administrator API access. Refresh details to fetch.</p>
                  )}
                </div>
              )}

              {/* ARTIFACT COMPILER DOWNLOAD COCKPIT (Requirement 8) */}
              {selectedRun.conclusion === 'success' && (
                <div className="p-4.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    Built IPA Downloads
                  </h4>

                  {artifacts.length === 0 ? (
                    <p className="text-xs text-emerald-200/70 italic">No artifacts published yet. Archiving files can take a few extra minutes after compilation finishes.</p>
                  ) : (
                    <div className="space-y-2">
                      {artifacts.map((art) => {
                        const sizeMB = (art.size_in_bytes / (1024 * 1024)).toFixed(2);
                        // Redirect to the Express backend downloader proxy
                        const downloadUrl = `/api/proxy/artifact-download?owner=${repo.owner.login}&repo=${repo.name}&artifactId=${art.id}&token=${token}`;

                        return (
                          <div 
                            key={art.id} 
                            className="p-3.5 rounded-xl bg-black/20 border border-emerald-500/10 flex items-center justify-between gap-4 hover:bg-black/35 transition-all"
                          >
                            <div className="min-w-0">
                              <h5 className="text-xs font-semibold text-emerald-200 truncate">{art.name}</h5>
                              <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">{sizeMB} MB • Expiring in 5 days</span>
                            </div>
                            <a
                              href={downloadUrl}
                              download
                              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all shadow-md active:scale-95 select-none"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download IPA (.zip)
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>

          </LiquidCard>
        ) : (
          <LiquidCard className="p-8 text-center border border-dashed border-slate-300 dark:border-white/10 h-full flex flex-col items-center justify-center min-h-[350px]" glowColor="cyan">
            <Compass className="w-12 h-12 text-cyan-400/50 mb-3 animate-pulse" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">No Run Selected</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
              Select or trigger a workflow run from the actions history timeline on the left to monitor, copy build errors, and pull artifacts.
            </p>
          </LiquidCard>
        )}
      </div>

    </div>
  );
};
