import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  darkMode: boolean;
  onToggle: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ darkMode, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="relative p-2.5 rounded-full transition-all duration-300 backdrop-blur-md overflow-hidden active:scale-95 group border border-slate-200/50 dark:border-white/10 bg-white/30 dark:bg-slate-900/40 hover:bg-white/50 dark:hover:bg-slate-900/60 shadow-lg"
      title={darkMode ? "Switch to Day Mode" : "Switch to Night Mode"}
    >
      {/* Light Reflection glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400/20 to-indigo-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10 flex items-center justify-center">
        {darkMode ? (
          <Sun className="w-5 h-5 text-amber-400 animate-spin-slow" />
        ) : (
          <Moon className="w-5 h-5 text-indigo-700" />
        )}
      </div>
    </button>
  );
};
