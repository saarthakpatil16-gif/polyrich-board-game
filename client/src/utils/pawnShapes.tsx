import React from 'react';
import { 
  Crown, 
  Rocket, 
  Trophy, 
  Cat, 
  Zap, 
  Gem, 
  Anchor, 
  Shield, 
  Car, 
  Star 
} from 'lucide-react';
import { PawnShape } from '../types';

export interface PawnShapeDef {
  id: PawnShape;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const PAWN_SHAPES: PawnShapeDef[] = [
  { id: 'crown', label: 'Crown', icon: Crown },
  { id: 'rocket', label: 'Rocket', icon: Rocket },
  { id: 'trophy', label: 'Trophy', icon: Trophy },
  { id: 'cat', label: 'Cat', icon: Cat },
  { id: 'zap', label: 'Lightning', icon: Zap },
  { id: 'gem', label: 'Gemstone', icon: Gem },
  { id: 'anchor', label: 'Anchor', icon: Anchor },
  { id: 'shield', label: 'Shield', icon: Shield },
  { id: 'car', label: 'Race Car', icon: Car },
  { id: 'star', label: 'Star', icon: Star },
];

const DEFAULT_MAP: Record<string, PawnShape> = {
  'token-1': 'crown',
  'token-2': 'rocket',
  'token-3': 'trophy',
  'token-4': 'cat',
  'token-5': 'zap',
  'token-6': 'gem',
  'token-7': 'anchor',
  'token-8': 'shield',
  'token-9': 'car',
  'token-10': 'star',
};

export function resolvePawnShape(avatar?: string, defaultIndex = 0): PawnShape {
  if (!avatar) return PAWN_SHAPES[defaultIndex % PAWN_SHAPES.length].id;
  const lower = avatar.toLowerCase();
  const directMatch = PAWN_SHAPES.find(s => s.id === lower);
  if (directMatch) return directMatch.id;
  if (DEFAULT_MAP[lower]) return DEFAULT_MAP[lower];
  return PAWN_SHAPES[defaultIndex % PAWN_SHAPES.length].id;
}

export function renderPawnIcon(avatar?: string, className = "w-3 h-3", defaultIndex = 0) {
  const shapeId = resolvePawnShape(avatar, defaultIndex);
  const def = PAWN_SHAPES.find(s => s.id === shapeId) || PAWN_SHAPES[0];
  const Icon = def.icon;
  return <Icon className={className} />;
}

/**
 * Richup.io-styled 3D Pawn Marker Component
 * Replicates the modern pawn marker:
 * A tapered 3D standing token with a weighted base pedestal, head cap,
 * lighting reflections, and chosen color gradient + optional custom emblem.
 */
interface RichupPawnProps {
  color: string;
  avatar?: string;
  size?: 'sm' | 'md' | 'lg';
  defaultIndex?: number;
  showIcon?: boolean;
  className?: string;
}

export const RichupPawn: React.FC<RichupPawnProps> = ({
  color,
  avatar,
  size = 'md',
  defaultIndex = 0,
  showIcon = true,
  className = ''
}) => {
  const sizeMap = {
    sm: { w: '18px', h: '26px', iconSize: 'w-2 h-2', head: 'w-2.5 h-2.5' },
    md: { w: '26px', h: '36px', iconSize: 'w-3 h-3', head: 'w-3.5 h-3.5' },
    lg: { w: '38px', h: '50px', iconSize: 'w-4 h-4', head: 'w-5 h-5' }
  };

  const currentSize = sizeMap[size];

  return (
    <div 
      className={`relative inline-flex flex-col items-center justify-end select-none pointer-events-none drop-shadow-md ${className}`}
      style={{ width: currentSize.w, height: currentSize.h }}
    >
      {/* 3D Pawn Base Drop Shadow Oval */}
      <div 
        className="absolute bottom-0 w-4/5 h-[6px] rounded-[50%] bg-black/45 blur-[1.5px] -z-10 translate-y-[2px]"
      />

      {/* Pawn SVG 3D Silhouette */}
      <svg
        viewBox="0 0 40 54"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
      >
        <defs>
          {/* Main 3D lighting gradient */}
          <linearGradient id={`pawnGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="25%" stopColor={color} />
            <stop offset="70%" stopColor={color} />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
          </linearGradient>

          {/* Head sphere gradient */}
          <radialGradient id={`sphereGrad-${color.replace('#', '')}`} cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="45%" stopColor={color} />
            <stop offset="100%" stopColor="#0a0a0a" stopOpacity="0.65" />
          </radialGradient>
        </defs>

        {/* 1. Base pedestal rim */}
        <ellipse 
          cx="20" 
          cy="49" 
          rx="18" 
          ry="4" 
          fill={`url(#pawnGrad-${color.replace('#', '')})`} 
          stroke="rgba(255,255,255,0.7)" 
          strokeWidth="1.2"
        />

        {/* 2. Stepped pedestal collar */}
        <path 
          d="M 5 48 C 5 44, 35 44, 35 48 L 32 43 C 32 40, 8 40, 8 43 Z" 
          fill={color} 
          filter="brightness(0.9)"
        />

        {/* 3. Tapered body waist */}
        <path 
          d="M 8 43 C 12 36, 14 26, 15 20 C 15 19, 25 19, 25 20 C 26 26, 28 36, 32 43 Z" 
          fill={`url(#pawnGrad-${color.replace('#', '')})`}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="0.8"
        />

        {/* 4. Neck collar ring */}
        <ellipse 
          cx="20" 
          cy="19" 
          rx="6.5" 
          ry="2" 
          fill="#ffffff" 
          fillOpacity="0.75" 
        />

        {/* 5. Head ball sphere */}
        <circle 
          cx="20" 
          cy="11" 
          r="9.5" 
          fill={`url(#sphereGrad-${color.replace('#', '')})`} 
          stroke="rgba(255,255,255,0.8)" 
          strokeWidth="1"
        />

        {/* 6. Gloss highlight sheen */}
        <ellipse 
          cx="17" 
          cy="8" 
          rx="3.5" 
          ry="2.5" 
          fill="#ffffff" 
          fillOpacity="0.7" 
        />
      </svg>

      {/* Embedded Emblem / Icon on Pawn Chest */}
      {showIcon && (
        <div 
          className="absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
        >
          {renderPawnIcon(avatar, `${currentSize.iconSize} text-white drop-shadow`, defaultIndex)}
        </div>
      )}
    </div>
  );
};
