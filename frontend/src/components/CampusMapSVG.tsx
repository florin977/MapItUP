import React from 'react';

interface CampusMapSVGProps {
  onBuildingClick?: (buildingName: string) => void;
}

const CampusMapSVG: React.FC<CampusMapSVGProps> = ({ onBuildingClick }) => {
  const handleBuildingClick = (buildingName: string) => {
    if (onBuildingClick) {
      onBuildingClick(buildingName);
    }
  };

  return (
    <g id="campus-layout">
      {/* Background / Grass */}
      <rect x="0" y="0" width="800" height="600" fill="var(--map-bg)" />
      
      {/* Roads */}
      <path d="M 0 300 H 800" stroke="var(--map-road)" strokeWidth="20" fill="none" />
      <path d="M 400 0 V 600" stroke="var(--map-road)" strokeWidth="20" fill="none" />
      <circle cx="400" cy="300" r="40" fill="var(--map-road)" />

      {/* Buildings */}
      <rect x="50" y="50" width="200" height="150" fill="var(--map-building-bg)" stroke="var(--map-building-stroke)" strokeWidth="2" rx="5"/>
      <text x="150" y="130" textAnchor="middle" fontFamily="sans-serif" fontSize="20" fill="var(--map-text)" onClick={() => handleBuildingClick('Library')}>Library</text>

      <rect x="550" y="80" width="200" height="120" fill="var(--map-building-bg)" stroke="var(--map-building-stroke)" strokeWidth="2" rx="5"/>
      <text x="650" y="145" textAnchor="middle" fontFamily="sans-serif" fontSize="20" fill="var(--map-text)" onClick={() => handleBuildingClick('Eng. Building')}>Eng. Building</text>
      
      <rect x="80" y="400" width="250" height="150" fill="var(--map-building-bg)" stroke="var(--map-building-stroke)" strokeWidth="2" rx="5"/>
      <text x="205" y="480" textAnchor="middle" fontFamily="sans-serif" fontSize="20" fill="var(--map-text)" onClick={() => handleBuildingClick('Student Center')}>Student Center</text>

      <rect x="500" y="420" width="220" height="100" fill="var(--map-building-bg)" stroke="var(--map-building-stroke)" strokeWidth="2" rx="5"/>
      <text x="610" y="475" textAnchor="middle" fontFamily="sans-serif" fontSize="20" fill="var(--map-text)" onClick={() => handleBuildingClick('Admin Office')}>Admin Office</text>

      {/* Lake */}
      <path d="M 450 250 Q 500 220, 550 250 T 650 250" stroke="var(--map-water-stroke)" strokeWidth="2" fill="var(--map-water-fill)" />
    </g>
  );
};

export default CampusMapSVG;
