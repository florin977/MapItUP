import React from 'react';

const MapBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-slate-100 dark:bg-brand-background">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="opacity-60 dark:opacity-30">
        <defs>
          <pattern id="map-pattern" patternUnits="userSpaceOnUse" width="200" height="200">
            <g fill="none" stroke="var(--map-pattern-stroke)" strokeWidth="1">
              {/* Grid-like streets */}
              <path d="M0 50 h200 M0 100 h200 M0 150 h200" />
              <path d="M50 0 v200 M100 0 v200 M150 0 v200" />

              {/* Diagonal and curved streets */}
              <path d="M0 0 L100 100 L150 50 L200 100" />
              <path d="M0 100 Q50 50 100 100 T200 100" />
              <path d="M0 200 L50 150 Q100 100 150 150 L200 200" />
              <path d="M20 0 C40 40, 80 20, 100 50 S150 120, 180 200" />
              <path d="M180 0 C160 40, 120 20, 100 50 S50 120, 20 200" />
              
              {/* Smaller connecting roads */}
              <path d="M50 50 L75 75 M150 50 L125 75" strokeWidth="0.5" />
              <path d="M50 150 L75 125 M150 150 L125 125" strokeWidth="0.5" />
              <path d="M25 25 Q50 0 75 25" strokeWidth="0.5" />
              <path d="M125 175 Q150 200 175 175" strokeWidth="0.5" />
            </g>
          </pattern>
           <radialGradient id="grad-overlay" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--map-bg)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--map-bg)" stopOpacity="0.8" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#map-pattern)" />
        <rect width="100%" height="100%" fill="url(#grad-overlay)" />
      </svg>
    </div>
  );
};

export default MapBackground;