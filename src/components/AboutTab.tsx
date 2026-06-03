import React from 'react';
import { Github, Globe, Heart, ShieldAlert, Award, Star } from 'lucide-react';
import { LiquidCard } from './LiquidCard';
import { AppIcon } from './AppIcon';

export const AboutTab: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      
      {/* Central Portrait Card */}
      <LiquidCard className="p-8 text-center border-slate-200/50 dark:border-white/10 relative overflow-hidden flex flex-col items-center" glowColor="violet">
        
        {/* Floating Glowing Decorative Stars */}
        <div className="absolute top-6 left-6 text-violet-400 opacity-60 animate-bounce">
          <Star className="w-5 h-5 fill-current" />
        </div>
        <div className="absolute bottom-6 right-6 text-cyan-400 opacity-50 animate-pulse">
          <Award className="w-6 h-6" />
        </div>

        {/* Large Centered Visual App Icon */}
        <div className="p-4 rounded-3xl bg-white/20 dark:bg-slate-900/40 border border-white/20 shadow-xl mb-6">
          <AppIcon size={100} />
        </div>

        {/* Brand details */}
        <h2 className="text-2xl font-bold font-sans tracking-tight text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2">
          GitHub Actions IPA Compiler & Manager
        </h2>
        <span className="text-xs font-mono font-bold bg-violet-500/10 text-violet-300 border border-violet-500/20 px-3 py-1 rounded-full mt-2">
          Version 2.4.0 (Stable release)
        </span>

        {/* Main developer credit section (Requirement 10) */}
        <div className="mt-8 mb-6 p-6 rounded-2xl bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-white/5 max-w-lg w-full">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            تم التطوير بواسطة العبقري علي فرحان
          </p>
          <p className="text-base font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-pink-500 mt-1">
            Developed by Ali Farhan
          </p>

          <div className="mt-4 flex items-center justify-center gap-3">
            <a 
              href="https://github.com/XFFF0" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/15 px-3 py-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 shadow transition-all hover:scale-105 active:scale-95"
            >
              <Github className="w-4 h-4 text-violet-400" />
              <span>@XFFF0</span>
            </a>
          </div>
        </div>

        {/* Short platform mission explanation */}
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
          This system was custom engineered to empower mobile developers, sideload enthusiasts, and QA engineers. It compiles fully compliant, unsigned iOS IPA packages directly inside GitHub's macOS cloud infrastructure, bypassing the need for an expensive local Mac environment.
        </p>

        {/* Quality stamp */}
        <div className="mt-8 flex items-center justify-center gap-1.5 text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-500">
          <span>Crafted with</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          <span>for the iOS sideload community</span>
        </div>

      </LiquidCard>

      {/* Security note card */}
      <LiquidCard className="p-6 border border-slate-200/50 dark:border-white/10" glowColor="neutral">
        <div className="flex gap-4">
          <ShieldAlert className="w-8 h-8 text-amber-500 flex-shrink-0" />
          <div className="space-y-1">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-700 dark:text-slate-300">GitHub API Security Assurance</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Your GitHub Personal Access Token (PAT) is loaded and stored strictly on the client side inside the safe browser sandboxed environment (via standard localStorage). Token requests are routed directly to GitHub's secure central REST server without any middleman storage or third-party tracking.
            </p>
          </div>
        </div>
      </LiquidCard>

    </div>
  );
};
