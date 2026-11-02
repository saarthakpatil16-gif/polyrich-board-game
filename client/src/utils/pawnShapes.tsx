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
 * Richup.io-styled Character Token (Circle with expressive cartoon eyes)
 * Fits cleanly onto board tiles and scales nicely across all screens.
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
  size = 'md',
  className = ''
}) => {
  const sizeMap: Record<'sm' | 'md' | 'lg', { diameter: number; eyeW: number; eyeH: number; pupil: number; mouthW: number }> = {
    sm: { diameter: 14, eyeW: 2.5, eyeH: 3.5, pupil: 1.5, mouthW: 3 },
    md: { diameter: 22, eyeW: 4, eyeH: 5.5, pupil: 2.2, mouthW: 5 },
    lg: { diameter: 34, eyeW: 6, eyeH: 8, pupil: 3.5, mouthW: 8 }
  };

  const s = sizeMap[size || 'md'];
  const d = s.diameter;

  return (
    <div 
      className={`relative inline-flex items-center justify-center select-none pointer-events-none drop-shadow-md ${className}`}
      style={{ width: `${d}px`, height: `${d}px` }}
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <radialGradient id={`ballGrad-${color.replace('#', '')}`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="35%" stopColor={color} />
            <stop offset="100%" stopColor="#0a0a14" stopOpacity="0.65" />
          </radialGradient>
        </defs>

        {/* Outer drop shadow */}
        <circle cx="16" cy="17" r="14" fill="#000000" fillOpacity="0.35" />

        {/* 3D Colored Sphere Body */}
        <circle 
          cx="16" 
          cy="16" 
          r="14" 
          fill={`url(#ballGrad-${color.replace('#', '')})`} 
          stroke="rgba(255,255,255,0.85)" 
          strokeWidth="1.5" 
        />

        {/* Gloss highlight sheen on top-left */}
        <ellipse cx="11" cy="9" rx="4" ry="2" fill="#ffffff" fillOpacity="0.6" transform="rotate(-20 11 9)" />

        {/* Left Eye (White sclera) */}
        <ellipse cx="11.5" cy="15" rx="3.2" ry="4.2" fill="#ffffff" stroke="#1e293b" strokeWidth="0.8" />
        {/* Left Pupil (Black) */}
        <circle cx="12.2" cy="15.2" r="2" fill="#0f172a" />
        {/* Left Eye Glint (White reflection) */}
        <circle cx="11.2" cy="14" r="0.9" fill="#ffffff" />

        {/* Right Eye (White sclera) */}
        <ellipse cx="20.5" cy="15" rx="3.2" ry="4.2" fill="#ffffff" stroke="#1e293b" strokeWidth="0.8" />
        {/* Right Pupil (Black) */}
        <circle cx="21.2" cy="15.2" r="2" fill="#0f172a" />
        {/* Right Eye Glint (White reflection) */}
        <circle cx="20.2" cy="14" r="0.9" fill="#ffffff" />

        {/* Little cute smile mouth */}
        <path d="M 14 21.5 Q 16 23.5 18 21.5" stroke="#1e293b" strokeWidth="0.9" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
};
