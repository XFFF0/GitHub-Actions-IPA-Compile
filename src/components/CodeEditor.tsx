import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle, FileCode, CheckCircle, Flame, Eye, Edit2 } from 'lucide-react';
import { LiquidCard } from './LiquidCard';

interface CodeEditorProps {
  fileName: string;
  initialValue: string;
  onSave: (newContent: string) => Promise<void>;
  errorLine?: number;
  errorExplanation?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  fileName,
  initialValue,
  onSave,
  errorLine = -1,
  errorExplanation,
}) => {
  const [content, setContent] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setContent(initialValue);
    setIsEditing(false);
    setSaveSuccess(false);
  }, [initialValue, fileName]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(content);
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Basic lightweight custom syntax highlighter for YAML / JSON / Swift
  const highlightLine = (lineText: string) => {
    if (!lineText) return <span>&nbsp;</span>;
    
    // Escaping html character structures
    const keys = [
      'name', 'on', 'jobs', 'steps', 'run', 'uses', 'with', 'env', 'workflow_dispatch',
      'import', 'func', 'let', 'var', 'struct', 'class', 'func', 'return', 'if', 'else',
      'const', 'export', 'default', 'interface', 'type'
    ];

    // Regex to highlight keywords, strings, comments
    let parts: React.ReactNode[] = [];
    let currentIdx = 0;

    // Check for comment
    if (lineText.trim().startsWith('#') || lineText.trim().startsWith('//')) {
      return <span className="text-slate-500/80 italic">{lineText}</span>;
    }

    // Replace YAML keys or Swift keywords
    // For simplicity, we split line by spaces and match tokens
    const tokens = lineText.split(/(\s+|[:{}()[\],;."'=>]|\b)/g);
    
    return tokens.map((token, idx) => {
      if (keys.includes(token.trim())) {
        return <span key={idx} className="text-pink-500 font-semibold">{token}</span>;
      }
      if (token.startsWith('"') && token.endsWith('"')) {
        return <span key={idx} className="text-teal-400">{token}</span>;
      }
      if (token.match(/^\d+$/)) {
        return <span key={idx} className="text-amber-400">{token}</span>;
      }
      if (token.trim() === 'true' || token.trim() === 'false') {
        return <span key={idx} className="text-violet-400 font-semibold">{token}</span>;
      }
      return <span key={idx}>{token}</span>;
    });
  };

  const lines = content.split('\n');

  return (
    <LiquidCard className="border border-slate-200/50 dark:border-white/10 overflow-hidden shadow-xl" glowColor="cyan">
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between px-5 py-4 bg-slate-100/60 dark:bg-slate-900/40 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <FileCode className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{fileName || "new_file.yml"}</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">{lines.length} lines</span>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              isEditing
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-white/20 hover:bg-white/35 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200'
            }`}
          >
            {isEditing ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                View Code
              </>
            ) : (
              <>
                <Edit2 className="w-3.5 h-3.5" />
                Edit Code
              </>
            )}
          </button>

          {isEditing && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving..." : "Commit Fix"}
            </button>
          )}

          {saveSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              <CheckCircle className="w-3.5 h-3.5" />
              Pushed to GitHub!
            </div>
          )}
        </div>
      </div>

      {/* Editor Main Canvas */}
      <div className="relative flex flex-col md:flex-row min-h-[420px] max-h-[600px] overflow-y-auto">
        
        {/* Editor Edit state */}
        {isEditing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[420px] p-5 font-mono text-sm leading-relaxed bg-slate-900 text-slate-100 outline-none border-none resize-y"
            style={{ tabSize: 2 }}
            spellCheck={false}
          />
        ) : (
          /* Editor Read/Line state with syntax highlights */
          <div className="w-full flex font-mono text-xs md:text-sm leading-relaxed overflow-x-auto bg-slate-950/70 dark:bg-slate-950/90 text-slate-300">
            {/* Margins containing line numbers */}
            <div className="select-none text-right bg-slate-900/50 py-4 pr-3 pl-4 border-r border-slate-800 text-slate-500 flex flex-col min-w-[3.5rem]">
              {lines.map((_, i) => {
                const lineNum = i + 1;
                const isErr = lineNum === errorLine;
                return (
                  <div 
                    key={i} 
                    className={`h-6 flex items-center justify-end ${
                      isErr ? 'text-red-400 font-bold bg-red-500/10 scale-105' : ''
                    }`}
                  >
                    {isErr ? (
                      <Flame className="w-3.5 h-3.5 text-red-500 animate-pulse mr-1" />
                    ) : null}
                    {lineNum}
                  </div>
                );
              })}
            </div>

            {/* Main Code block */}
            <div className="flex-1 py-4 flex flex-col overflow-x-auto w-full">
              {lines.map((line, i) => {
                const lineNum = i + 1;
                const isErr = lineNum === errorLine;
                return (
                  <div
                    key={i}
                    className={`h-6 px-4 flex items-center font-mono whitespace-pre w-max min-w-full ${
                      isErr 
                        ? 'bg-red-500/20 border-l-4 border-red-500 text-red-100 font-medium' 
                        : 'hover:bg-slate-800/20'
                    }`}
                  >
                    {highlightLine(line)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Embedded Build logs / Diagnostic message for highlight */}
      {!isEditing && errorLine > 0 && errorExplanation && (
        <div className="p-4 bg-red-950/40 border-t border-red-900/50 flex flex-col md:flex-row gap-3.5">
          <div className="p-2.5 rounded-2xl bg-red-500/10 self-start border border-red-500/20 animate-pulse">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-red-400 flex items-center gap-1.5">
              <span>Failure on Line {errorLine}</span>
              <span className="text-xs bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md">Error Highlighted Above</span>
            </h4>
            <p className="text-xs text-red-200 mt-1.5 leading-relaxed">{errorExplanation}</p>
          </div>
        </div>
      )}
    </LiquidCard>
  );
};
