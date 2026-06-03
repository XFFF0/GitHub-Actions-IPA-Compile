import React, { useState, useEffect } from 'react';
import { 
  Folder, File, Upload, ArrowLeft, RefreshCw, GitFork, 
  Eye, Check, AlertCircle, Plus, FileCode, CheckCircle2 
} from 'lucide-react';
import { LiquidCard } from './LiquidCard';
import { GitHubRepo, RepoFile } from '../types';

interface RepoBrowserProps {
  token: string;
  repos: GitHubRepo[];
  selectedRepo: GitHubRepo | null;
  onSelectRepo: (repo: GitHubRepo | null) => void;
  onOpenFile: (file: RepoFile) => void;
  onRefreshRepos: () => void;
}

export const RepoBrowser: React.FC<RepoBrowserProps> = ({
  token,
  repos,
  selectedRepo,
  onSelectRepo,
  onOpenFile,
  onRefreshRepos,
}) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<RepoFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload features states
  const [dragActive, setDragActive] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploadPath, setUploadPath] = useState('');
  const [uploadMessage, setUploadMessage] = useState('Upload project file via IPA Action Manager');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Load contents of chosen repository at current path
  useEffect(() => {
    if (selectedRepo) {
      loadRepoFiles(currentPath);
    }
  }, [selectedRepo, currentPath]);

  const loadRepoFiles = async (path: string) => {
    if (!selectedRepo) return;
    setLoadingFiles(true);
    setError(null);
    try {
      const response = await fetch(
        `https://api.github.com/repos/${selectedRepo.full_name}/contents/${path}?ref=${selectedRepo.default_branch}`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to read folder contents. StatusCode: ${response.status}`);
      }

      const data = await response.json();
      const filesArray = Array.isArray(data) ? data : [data];
      // Sort: Directories first, then files
      filesArray.sort((a: RepoFile, b: RepoFile) => {
        if (a.type === 'dir' && b.type !== 'dir') return -1;
        if (a.type !== 'dir' && b.type === 'dir') return 1;
        return a.name.localeCompare(b.name);
      });

      setFiles(filesArray);
    } catch (err: any) {
      setError(err.message || "Could not fetch files.");
    } finally {
      setLoadingFiles(false);
    }
  };

  // Traverses into a directory
  const handleItemClick = (file: RepoFile) => {
    if (file.type === 'dir') {
      setCurrentPath(file.path);
    } else {
      onOpenFile(file);
    }
  };

  // Navigate folder levels up
  const handleBackDirectory = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/'));
  };

  // Drag and drop uploader handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedUploadFile(file);
      // Auto populate paths
      const destPath = currentPath ? `${currentPath}/${file.name}` : file.name;
      setUploadPath(destPath);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedUploadFile(file);
      const destPath = currentPath ? `${currentPath}/${file.name}` : file.name;
      setUploadPath(destPath);
    }
  };

  // Convert File object to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Commit and upload payload to GitHub Contents API
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepo || !selectedUploadFile || !uploadPath) return;

    setUploading(true);
    setUploadSuccess(null);
    setError(null);

    try {
      const base64Content = await fileToBase64(selectedUploadFile);
      const url = `https://api.github.com/repos/${selectedRepo.full_name}/contents/${uploadPath}`;

      // Check if file already exists to get its SHA to prevent collision
      let sha: string | undefined;
      const getFileRes = await fetch(url + `?ref=${selectedRepo.default_branch}`, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (getFileRes.ok) {
        const existingData = await getFileRes.json();
        sha = existingData.sha;
      }

      // Perform PUT upload request
      const putResponse = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          message: uploadMessage,
          content: base64Content,
          sha: sha,
          branch: selectedRepo.default_branch,
        }),
      });

      if (!putResponse.ok) {
        const errorText = await putResponse.text();
        throw new Error(`Failed to commit file. Server details: ${errorText}`);
      }

      setUploadSuccess(`"${selectedUploadFile.name}" successfully committed and pushed to GitHub!`);
      setSelectedUploadFile(null);
      setUploadPath('');
      // Reload current contents view
      loadRepoFiles(currentPath);

      setTimeout(() => setUploadSuccess(null), 4000);

    } catch (err: any) {
      setError(err.message || "Failed uploading asset to Github.");
    } finally {
      setUploading(false);
    }
  };

  // Component rendering: No Selected Repository (Show Repo Selector Grid)
  if (!selectedRepo) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Folder className="w-6 h-6 text-cyan-400" />
              Repository Workspace
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Select an active repository to manage files, configure pipelines, and track builds.</p>
          </div>
          <button 
            onClick={onRefreshRepos}
            className="flex items-center gap-1.5 text-xs text-cyan-400 border border-cyan-400/30 px-3 py-1.5 rounded-xl hover:bg-cyan-400/10 transition-all active:scale-95 bg-white/20 dark:bg-slate-900/35 backdrop-blur-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh List
          </button>
        </div>

        {repos.length === 0 ? (
          <LiquidCard className="p-8 text-center border border-dashed border-slate-300 dark:border-white/10" glowColor="cyan">
            <AlertCircle className="w-12 h-12 mx-auto text-emerald-400/50 mb-3" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">No Repositories Fetched</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
              Configure your GitHub Personal Access Token in the settings panel to fetch repositories.
            </p>
          </LiquidCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {repos.map((repo) => (
              <LiquidCard 
                key={repo.id}
                interactive
                glowColor="cyan"
                onClick={() => onSelectRepo(repo)}
                className="p-5 md:p-6 flex flex-col justify-between h-44 hover:shadow-cyan-400/5 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <img 
                      src={repo.owner.avatar_url} 
                      alt={repo.owner.login} 
                      className="w-7 h-7 rounded-full border border-slate-200 dark:border-white/20 shadow" 
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 text-slate-500 dark:text-slate-400">
                      {repo.private ? "Private" : "Public"}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 line-clamp-1 group-hover:text-cyan-400 transition-colors">
                    {repo.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {repo.description || "No project description provided."}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400 mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
                  <span className="flex items-center gap-1">
                    <GitFork className="w-3.5 h-3.5 text-indigo-400" />
                    {repo.default_branch}
                  </span>
                </div>
              </LiquidCard>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Component rendering: Browser UI within selected template
  return (
    <div className="space-y-6">
      
      {/* Header Back controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onSelectRepo(null)}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>{selectedRepo.name}</span>
              <span className="text-xs font-mono font-normal bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20">{selectedRepo.default_branch}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Selected Project Workspace Directory path: <span className="font-mono text-[10px] break-all bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 px-1 py-0.5 rounded text-indigo-400">{currentPath || "/"}</span></p>
          </div>
        </div>

        <button 
          onClick={() => loadRepoFiles(currentPath)}
          className="flex items-center gap-1.5 text-xs text-cyan-400 self-start md:self-center border border-cyan-400/30 px-3.5 py-1.5 rounded-xl hover:bg-cyan-400/10 bg-white/20 dark:bg-slate-900/30 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reload Directory
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Workspace directory tree (Left 3 columns) */}
        <LiquidCard className="lg:col-span-3 border border-slate-200/50 dark:border-white/10 overflow-hidden shadow-xl" glowColor="cyan">
          
          <div className="px-5 py-4 bg-slate-100/60 dark:bg-slate-900/40 border-b border-slate-200/50 dark:border-white/10 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <Folder className="w-4 h-4 text-cyan-400" />
              Files & Subdirectories
            </span>
          </div>

          <div className="p-2 md:p-3 min-h-[380px] max-h-[500px] overflow-y-auto">
            {loadingFiles ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
                <span className="text-xs font-semibold tracking-wider p-2">Syncing with GitHub Workspace...</span>
              </div>
            ) : error ? (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl m-3 text-red-400 text-xs text-left">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold">Syncing Error</h4>
                  <p className="mt-0.5 text-[11px] text-red-300">{error}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Back directory node if nested */}
                {currentPath && (
                  <button
                    onClick={handleBackDirectory}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-900/50 transition-all text-left"
                  >
                    <ArrowLeft className="w-4 h-4 text-cyan-400" />
                    <span>.. (parent directory)</span>
                  </button>
                )}

                {files.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 dark:text-slate-400">
                    <p className="text-xs">This directory is empty.</p>
                  </div>
                ) : (
                  files.map((file) => (
                    <button
                      key={file.sha}
                      onClick={() => handleItemClick(file)}
                      className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-slate-100/80 dark:hover:bg-slate-900/60 transition-all text-left border border-transparent hover:border-slate-200/30 dark:hover:border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        {file.type === 'dir' ? (
                          <Folder className="w-4.5 h-4.5 text-cyan-400 fill-cyan-400/20" />
                        ) : (
                          <File className="w-4.5 h-4.5 text-indigo-400" />
                        )}
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200 font-mono">
                          {file.name}
                        </span>
                      </div>

                      {file.type === 'file' && (
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/50 border border-slate-200/50 dark:border-white/5 rounded px-1.5 py-0.5">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                          <span className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            Launch View
                          </span>
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </LiquidCard>

        {/* File Drag-and-drop / selector uploader cockpit (Right 2 columns) */}
        <LiquidCard className="lg:col-span-2 border border-slate-200/50 dark:border-white/10 p-5 md:p-6" glowColor="violet">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <Upload className="w-4.5 h-4.5 text-violet-400" />
            File Uploader cockpit
          </h3>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            {/* Display active drop point */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`p-6 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-violet-500 bg-violet-500/10 text-violet-300 scale-95'
                  : 'border-slate-300 dark:border-white/10 hover:border-violet-400'
              }`}
            >
              <input
                type="file"
                id="file-upload-input"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="file-upload-input" className="cursor-pointer">
                <Upload className="w-9 h-9 mx-auto text-violet-400/70 mb-3" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {selectedUploadFile ? "File Selected!" : "Drag & Drop local file"}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-3">
                  {selectedUploadFile ? selectedUploadFile.name : "or click to search computer"}
                </span>
                {selectedUploadFile && (
                  <span className="inline-block text-[9px] font-mono bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded border border-violet-500/30">
                    {(selectedUploadFile.size / 1024).toFixed(1)} KB
                  </span>
                )}
              </label>
            </div>

            {/* Target Path details inside repository workspace */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1.5">Destination Workspace Path</label>
              <input
                type="text"
                value={uploadPath}
                onChange={(e) => setUploadPath(e.target.value)}
                placeholder="e.g. ios/Podfile or src/App.tsx"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200/50 dark:border-white/10 bg-white/20 dark:bg-slate-900/40 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm font-mono"
                required
              />
            </div>

            {/* Commit explanation details */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1.5">Git Commit Message</label>
              <input
                type="text"
                value={uploadMessage}
                onChange={(e) => setUploadMessage(e.target.value)}
                placeholder="Ex. Upload and update workspace pods"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200/50 dark:border-white/10 bg-white/20 dark:bg-slate-900/40 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                required
              />
            </div>

            {/* Action launcher file commit */}
            <button
              type="submit"
              disabled={uploading || !selectedUploadFile || !uploadPath}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Pushing to Github Workspace...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Commit & Push File
                </>
              )}
            </button>

            {/* Feedback notifications */}
            {uploadSuccess && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}
          </form>
        </LiquidCard>

      </div>
    </div>
  );
};
