import React from 'react';

interface LiquidCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'cyan' | 'pink' | 'violet' | 'green' | 'amber' | 'neutral';
  interactive?: boolean;
}

export const LiquidCard: React.FC<LiquidCardProps> = ({
  children,
  className = "",
  glowColor = 'neutral',
  interactive = false,
  ...props
}) => {
  const glowStyles = {
    neutral: 'from-slate-500/10 to-transparent',
    cyan: 'from-cyan-500/20 to-transparent',
    pink: 'from-pink-500/20 to-transparent',
    violet: 'from-violet-500/20 to-transparent',
    green: 'from-emerald-500/20 to-transparent',
    amber: 'from-amber-500/20 to-transparent',
  };

  return (
    <div
      className={`relative rounded-3xl overflow-hidden transition-all duration-300 backdrop-blur-xl shadow-2xl border ${
        interactive
          ? 'hover:scale-[1.01] hover:shadow-cyan-500/10 hover:border-white/30 cursor-pointer active:scale-[0.99]'
          : ''
      } ${
        // Glass themed dark/light styles
        'bg-white/45 dark:bg-slate-950/45 border-slate-200/50 dark:border-white/10'
      } ${className}`}
      {...props}
    >
      {/* Liquid fluid background accent glow inside card */}
      <div className={`absolute -top-24 -left-24 w-48 h-48 bg-gradient-to-br ${glowStyles[glowColor]} blur-3xl rounded-full pointer-events-none opacity-60`} />
      <div className={`absolute -bottom-24 -right-24 w-48 h-48 bg-gradient-to-br ${glowStyles[glowColor]} blur-3xl rounded-full pointer-events-none opacity-40`} />

      {/* Glossy Liquid Glass reflection overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.02) 100%)',
        }}
      />

      {/* Frosted highlight line from top border to mimic reflection */}
      <div 
        className="absolute top-0 left-0 w-full h-[1px] pointer-events-none"
        style={{
          background: 'linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,0.25) 20%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.25) 80%, rgba(255,255,255,0))',
        }}
      />

      {/* Content wrapper */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};
