import React, { useState, useEffect } from 'react';
import { 
  Folder, Play, Layers, BrainCircuit, Info, Settings, 
  Github, Key, LogOut, RefreshCw, Sun, Moon, Sparkles, HelpCircle 
} from 'lucide-react';
import { LiquidCard } from './components/LiquidCard';
import { AppIcon } from './components/AppIcon';
import { ThemeToggle } from './components/ThemeToggle';
import { RepoBrowser } from './components/RepoBrowser';
import { WorkflowBuilder } from './components/WorkflowBuilder';
import { CodeEditor } from './components/CodeEditor';
import { ActionsMonitor } from './components/ActionsMonitor';
import { AIDiagnostics } from './components/AIDiagnostics';
import { AboutTab } from './components/AboutTab';
import { GitHubRepo, RepoFile, AiRecommendation } from './types';

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // Default to night mode
  });

  // Authentication state
  const [githubToken, setGithubToken] = useState<string>(() => {
    return localStorage.getItem('github_token') || '';
  });
  const [tokenInput, setTokenInput] = useState('');

  // Repositories & Workspace Workspace data
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);

  // Tab systems
  const [activeTab, setActiveTab] = useState<'workspace' | 'workflows' | 'actions' | 'diagnostics' | 'about'>('workspace');

  // File viewing/editing system
  const [selectedFile, setSelectedFile] = useState<RepoFile | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loadingFileContent, setLoadingFileContent] = useState(false);

  // Failure & AI debugging states
  const [errorLine, setErrorLine] = useState<number>(-1);
  const [errorExplanation, setErrorExplanation] = useState<string>('');
  const [rawLogsText, setRawLogsText] = useState<string>('');

  // Monitor classes list
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Handle auto loading repositories on login
  useEffect(() => {
    if (githubToken) {
      fetchRepositories();
    }
  }, [githubToken]);

  // Fetch repos from GitHub APIs
  const fetchRepositories = async () => {
    setLoadingRepos(true);
    setRepoError(null);
    try {
      const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`Authentication failure. Status Code: ${response.status}`);
      }

      const data = await response.json();
      setRepos(data);
    } catch (err: any) {
      setRepoError(err.message || 'Failed fetching repositories. Check token verification permissions.');
      setRepos([]);
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleSaveToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    localStorage.setItem('github_token', tokenInput.trim());
    setGithubToken(tokenInput.trim());
    setTokenInput('');
  };

  const handleLogout = () => {
    localStorage.removeItem('github_token');
    setGithubToken('');
    setRepos([]);
    setSelectedRepo(null);
    setSelectedFile(null);
    setFileContent('');
  };

  // Loads the exact plain-text code contents of a file to view/edit in the code editor
  const handleOpenFile = async (file: RepoFile) => {
    setLoadingFileContent(true);
    setSelectedFile(file);
    try {
      const response = await fetch(file.url, {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: 'application/vnd.github.v3.raw', // Request raw file contents
        },
      });

      if (response.ok) {
        const text = await response.text();
        setFileContent(text);
        // Switch views so files instantly render in workspace
        setActiveTab('workspace');
      } else {
        throw new Error('Failed loading file content from GitHub.');
      }
    } catch (err) {
      alert('Could not open file: ' + err);
    } finally {
      setLoadingFileContent(false);
    }
  };

  // Commits any modifications made to a file directly back to standard github branch
  const handleCommitFileChange = async (filePath: string, updatedContent: string) => {
    if (!selectedRepo) return;
    
    // Convert to base64
    const base64Content = btoa(unescape(encodeURIComponent(updatedContent)));
    const url = `https://api.github.com/repos/${selectedRepo.full_name}/contents/${filePath}`;

    try {
      // Fetch latest file SHA to prevent collision failures
      let sha: string | undefined;
      const getFileRes = await fetch(`${url}?ref=${selectedRepo.default_branch}`, {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (getFileRes.ok) {
        const existingData = await getFileRes.json();
        sha = existingData.sha;
      }

      // Update PUT contents
      const updateRes = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `token ${githubToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          message: `AI Repair: Applied automated build correction to "${filePath}"`,
          content: base64Content,
          sha: sha,
          branch: selectedRepo.default_branch,
        }),
      });

      if (!updateRes.ok) {
        throw new Error(`Failed to commit repair to branch. StatusCode: ${updateRes.status}`);
      }

      // Refresh editor content
      setFileContent(updatedContent);

    } catch (err: any) {
      console.error(err);
      throw new Error(err.message || 'Failed push commit sequence.');
    }
  };

  // Launches Gemini AI Diagnostics when a run failure is identified
  const handleTriggerLogsAI = (rawLogs: string) => {
    setRawLogsText(rawLogs);
    setActiveTab('diagnostics');
  };

  // Closes active coding file to return to standard repo Explorer
  const handleCloseFileEditor = () => {
    setSelectedFile(null);
    setFileContent('');
    setErrorLine(-1);
    setErrorExplanation('');
  };

  return (
    <div className={`min-h-screen font-sans transition-all duration-500 pb-12 ${
      darkMode 
        ? 'bg-slate-950 text-slate-100 bg-linear-to-b from-slate-950 via-slate-900 to-indigo-950/20' 
        : 'bg-slate-50 text-slate-800 bg-linear-to-b from-slate-100 via-white to-slate-200/50'
    }`}>
      
      {/* Decorative absolute background grid glows */}
      <div className="absolute top-0 left-0 w-full h-[500px] pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/10 blur-[100px]" />
        <div className="absolute top-[-10%] right-[10%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-pink-500/15 to-indigo-500/10 blur-[90px]" />
      </div>

      {/* Primary Toolbar / Navigation Layout */}
      <header className="relative z-10 border-b border-slate-200/50 dark:border-white/5 backdrop-blur-md bg-white/25 dark:bg-slate-950/25 sticky top-0 px-4 py-3.5 select-none md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AppIcon size={44} />
            <div>
              <h1 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5 leading-none">
                <span>IPA Actions Compiler</span>
                <span className="text-[9px] bg-cyan-500/15 border border-cyan-500/20 text-cyan-400 font-extrabold px-1.5 py-0.5 rounded-full">v2.4</span>
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">Advanced iOS Build and Diagnostics Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {githubToken && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/20 px-3 py-1.5 rounded-xl hover:bg-red-500/10 transition-all select-none bg-white/10 dark:bg-slate-950/25"
                title="Disconnect GitHub PAT"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
            <ThemeToggle darkMode={darkMode} onToggle={() => setDarkMode(!darkMode)} />
          </div>
        </div>
      </header>

      {/* Main Container Wrapper */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 mt-8">
        
        {/* State 1: Unauthorized state - Request GitHub Personal Access Token */}
        {!githubToken ? (
          <div className="max-w-lg mx-auto py-12">
            <LiquidCard className="p-8 border-slate-200/50 dark:border-white/10 shadow-2xl text-center" glowColor="cyan">
              
              <div className="p-4 rounded-3xl bg-white/20 dark:bg-slate-900/40 border border-white/15 shadow-md inline-block mb-5">
                <AppIcon size={80} />
              </div>

              <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-150">Login with Personal Access Token</h2>
              <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 bg-slate-100/50 dark:bg-slate-950/30 py-1 px-3 rounded-full inline-block">Secure client-side authentication</p>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 leading-relaxed text-left">
                To fetch repositories, audit build steps, trigger macOS compilation runners, and download compiled iOS <strong>IPA packages</strong>, supply your personal GitHub token:
              </p>

              <form onSubmit={handleSaveToken} className="space-y-4 mt-6 text-left">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-450 uppercase tracking-widest mb-1.5">GitHub Token (PAT)</label>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-3 w-4 h-4 text-cyan-400" />
                    <input
                      type="password"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="ghp_xxxxxxxxx..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/50 dark:border-white/10 bg-white/20 dark:bg-slate-900/40 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm font-mono"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-lg hover:shadow-cyan-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Github className="w-4 h-4" />
                  Connect GitHub repocenter
                </button>
              </form>

              {/* Developer helper tip */}
              <div className="mt-6 pt-5 border-t border-slate-200/50 dark:border-white/5 flex gap-2.5 text-left text-[11px] text-slate-500 dark:text-slate-400">
                <HelpCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-0.5">Required Token Permissions:</span>
                  Please configure permissions to include <code className="text-indigo-400 font-mono bg-indigo-500/10 px-1 py-0.5 rounded">repo</code>, <code className="text-indigo-400 font-mono bg-indigo-500/10 px-1 py-0.5 rounded">workflow</code>, and <code className="text-indigo-400 font-mono bg-indigo-500/10 px-1 py-0.5 rounded">admin:repo_hook</code>. Create one in seconds on <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline inline-flex items-center gap-0.5">GitHub Token Settings</a>.
                </div>
              </div>

            </LiquidCard>
          </div>
        ) : (
          /* State 2: Authorized State - Full Workspace Dashboard */
          <div className="space-y-6">
            
            {/* Context bar detailing active workspace info */}
            {selectedRepo && (
              <div className="p-4 rounded-3xl bg-white/10 dark:bg-slate-900/15 border border-slate-200/40 dark:border-white/5 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img 
                    src={selectedRepo.owner.avatar_url} 
                    alt={selectedRepo.name} 
                    className="w-9 h-9 rounded-full border border-slate-300 dark:border-white/20" 
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Active Workspace Repo</h3>
                    <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{selectedRepo.full_name}</h2>
                  </div>
                </div>

                {/* Sub tabs selectors */}
                <div className="flex items-center gap-1.5 overflow-x-auto self-start md:self-center pr-2">
                  {[
                    { id: 'workspace', label: 'File Manager', icon: Folder },
                    { id: 'workflows', label: 'YAML Builder', icon: Settings },
                    { id: 'actions', label: 'Actions Monitor', icon: Play },
                    { id: 'diagnostics', label: 'AI Diagnostics', icon: BrainCircuit },
                    { id: 'about', label: 'About Dev', icon: Info },
                  ].map((tab) => {
                    const TabIcon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all select-none ${
                          isActive
                            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-md'
                            : 'bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-900/50'
                        }`}
                      >
                        <TabIcon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub views renders logic */}
            {activeTab === 'workspace' && (
              <div className="space-y-6">
                
                {/* Active coding file editor panel */}
                {selectedFile ? (
                  <div className="space-y-4">
                    <button
                      onClick={handleCloseFileEditor}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 font-semibold mb-2"
                    >
                      ← Close Editor / Go to Folder View
                    </button>
                    
                    {loadingFileContent ? (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400 font-mono">
                        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
                        <span>Pulling file content from GitHub...</span>
                      </div>
                    ) : (
                      <CodeEditor
                        fileName={selectedFile.name}
                        initialValue={fileContent}
                        onSave={(newContent) => handleCommitFileChange(selectedFile.path, newContent)}
                        errorLine={errorLine}
                        errorExplanation={errorExplanation}
                      />
                    )}
                  </div>
                ) : (
                  <RepoBrowser
                    token={githubToken}
                    repos={repos}
                    selectedRepo={selectedRepo}
                    onSelectRepo={(repo) => {
                      setSelectedRepo(repo);
                      setSelectedFile(null); // Clean editor state
                    }}
                    onOpenFile={handleOpenFile}
                    onRefreshRepos={fetchRepositories}
                  />
                )}
              </div>
            )}

            {activeTab === 'workflows' && selectedRepo && (
              <WorkflowBuilder
                onCommitWorkflow={handleCommitFileChange}
                loading={false}
              />
            )}

            {activeTab === 'actions' && selectedRepo && (
              <ActionsMonitor
                token={githubToken}
                repo={selectedRepo}
                onSelectionOfError={handleTriggerLogsAI}
              />
            )}

            {activeTab === 'diagnostics' && selectedRepo && (
              <AIDiagnostics
                token={githubToken}
                repo={selectedRepo}
                rawLogs={rawLogsText}
                onApplyFix={handleCommitFileChange}
                onTriggerRebuild={async () => {
                  // Trigger default workflow build sequence automatically
                  try {
                    const listResponse = await fetch(`https://api.github.com/repos/${selectedRepo.full_name}/actions/workflows`, {
                      headers: { 'Authorization': `token ${githubToken}` }
                    });
                    if (listResponse.ok) {
                      const listData = await listResponse.json();
                      const buildWorkflow = listData.workflows?.find((w: any) => w.path.includes('build-ipa.yml'));
                      if (buildWorkflow) {
                        await fetch(`https://api.github.com/repos/${selectedRepo.full_name}/actions/workflows/${buildWorkflow.id}/dispatches`, {
                          method: 'POST',
                          headers: {
                            'Authorization': `token ${githubToken}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({ ref: selectedRepo.default_branch })
                        });
                      }
                    }
                  } catch (e) {
                    console.error("Rebuild trigger delay: ", e);
                  }
                }}
              />
            )}

            {activeTab === 'about' && (
              <AboutTab />
            )}

            {/* When repository browser is active but no repo chosen yet, enforce showing repo browser */}
            {!selectedRepo && activeTab !== 'about' && activeTab !== 'workspace' && (
              <div className="space-y-4">
                <RepoBrowser
                  token={githubToken}
                  repos={repos}
                  selectedRepo={selectedRepo}
                  onSelectRepo={(repo) => setSelectedRepo(repo)}
                  onOpenFile={handleOpenFile}
                  onRefreshRepos={fetchRepositories}
                />
              </div>
            )}

          </div>
        )}

      </main>

    </div>
  );
}
