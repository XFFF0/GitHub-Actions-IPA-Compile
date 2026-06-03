import React from 'react';

interface AppIconProps {
  className?: string;
  size?: number;
}

export const AppIcon: React.FC<AppIconProps> = ({ className = "", size = 64 }) => {
  return (
    <div 
      className={`relative inline-flex items-center justify-center rounded-2xl overflow-hidden transition-all duration-300 ${className}`}
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Dynamic Glowing Background Ring */}
      <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/30 to-violet-500/30 blur-xl opacity-75 animate-pulse" />

      {/* Main SVG Composition */}
      <svg
        width={size * 0.7}
        height={size * 0.7}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        <defs>
          <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" /> {/* Cyan */}
            <stop offset="50%" stopColor="#818cf8" /> {/* Indigo */}
            <stop offset="100%" stopColor="#ec4899" /> {/* Pinkish Violet */}
          </linearGradient>
          <linearGradient id="boxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="glassReflection" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* GitHub actions flow lines in background */}
        <path
          d="M 15,20 C 15,40 45,30 50,50 C 55,70 85,60 85,80"
          stroke="url(#primaryGrad)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="4 4"
          className="opacity-40"
        />

        {/* Circular Action Nodes */}
        <circle cx="15" cy="20" r="4" fill="#22d3ee" className="opacity-70" />
        <circle cx="50" cy="50" r="5" fill="#818cf8" className="opacity-80" />
        <circle cx="85" cy="80" r="4" fill="#ec4899" className="opacity-70" />

        {/* The 3D iOS IPA Box container */}
        <path
          d="M 50,22 L 80,35 L 50,48 L 20,35 Z"
          fill="url(#boxGrad)"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1.5"
        />
        <path
          d="M 20,35 L 20,65 L 50,78 L 50,48 Z"
          fill="#1d4ed8"
          fillOpacity="0.85"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.5"
        />
        <path
          d="M 50,48 L 50,78 L 80,65 L 80,35 Z"
          fill="#1e40af"
          fillOpacity="0.95"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.5"
        />

        {/* Shiny Swift-like Swoop overlaying from inside the container */}
        <path
          d="M 33,39 C 45,33 55,30 65,36 C 55,42 45,45 38,55 C 45,51 55,49 68,52 C 55,60 40,65 30,55 C 32,53 33,48 33,39 Z"
          fill="#f97316"
          className="opacity-90 blur-[0.3px]"
        />

        {/* Action Build Bolt / Success Indicator overlaying */}
        <path
          d="M 46,38 L 58,48 L 52,50 L 58,60 L 44,48 L 50,46 Z"
          fill="#22c55e"
          stroke="#ffffff"
          strokeWidth="1"
          strokeLinejoin="round"
          className="drop-shadow-lg"
        />
      </svg>

      {/* Shine Line - Pure Liquid Glass Reflection Grid */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.1) 100%)',
        }}
      />
      <div 
        className="absolute top-0 left-0 w-full h-[50%]"
        style={{
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      />
    </div>
  );
};
