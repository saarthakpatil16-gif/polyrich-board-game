import React from 'react';
import { BoardTileDTO, PlayerDTO } from '../../types';
import { PlayerToken } from './PlayerToken';
import {
  Building2,
  Gift,
  AlertTriangle,
  Compass,
  Car,
  HelpCircle,
  Train,
  Coins,
  ShieldAlert,
  Lock,
} from 'lucide-react';

interface TileViewProps {
  tile: BoardTileDTO;
  side: 'bottom' | 'left' | 'top' | 'right';
  isCorner: boolean;
  playersOnTile: PlayerDTO[];
  activePlayerId: string | null;
  onTileClick?: (tile: BoardTileDTO) => void;
  owner?: PlayerDTO | null;
  hoppingPlayerId?: string | null;
}

const HousesDisplay: React.FC<{ level: number; groupColor?: string | null }> = ({ level, groupColor }) => {
  if (!level) return null;
  if (level >= 3) {
    return (
      <div
        className="w-4/5 mx-auto rounded-sm flex items-center justify-center"
        style={{ backgroundColor: '#dc2626', height: 5 }}
        title="Hotel"
      >
        <span style={{ fontSize: 3.5, color: '#fff', fontWeight: 700, lineHeight: 1 }}>HTL</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-px w-full" title={`${level} house${level > 1 ? 's' : ''}`}>
      {Array.from({ length: level }).map((_, i) => (
        <div
          key={i}
          className="rounded-sm"
          style={{ backgroundColor: groupColor ?? '#16a34a', width: `${Math.floor(80 / level)}%`, height: 5 }}
        />
      ))}
    </div>
  );
};

export const TileView: React.FC<TileViewProps> = ({
  tile,
  isCorner,
  playersOnTile,
  activePlayerId,
  onTileClick,
  owner,
  hoppingPlayerId,
}) => {
  const isOccupiedByActive = playersOnTile.some(p => p.id === activePlayerId);
  const upgradeLevel = tile.upgradeLevel ?? 0;
  const hasColorBand = tile.type === 'PROPERTY' && !!tile.colorGroup && !isCorner;

  const iconNode = (() => {
    const cls = 'w-full h-full';
    switch (tile.type) {
      case 'START':      return <Compass       className={`${cls} text-emerald-400`} />;
      case 'JAIL':       return <ShieldAlert   className={`${cls} text-amber-400`} />;
      case 'BONUS':      return <Car           className={`${cls} text-blue-400`} />;
      case 'MOVE_TO':    return <AlertTriangle className={`${cls} text-rose-400`} />;
      case 'REWARD':     return <Gift          className={`${cls} text-emerald-400`} />;
      case 'PUNISHMENT': return <AlertTriangle className={`${cls} text-rose-400`} />;
      case 'TAX':        return <Coins         className={`${cls} text-yellow-400`} />;
      case 'TRANS':      return <Train         className={`${cls} text-cyan-400`} />;
      case 'CHANCE':     return <HelpCircle    className={`${cls} text-purple-400`} />;
      default:           return <Building2     className={`${cls} text-slate-400`} />;
    }
  })();

  return (
    <div
      onClick={() => onTileClick?.(tile)}
      className={[
        'relative w-full h-full flex flex-col overflow-hidden',
        'bg-[#14182e] border border-[#273055]',
        'rounded-[3px] sm:rounded-[4px]',
        'cursor-pointer select-none transition-all duration-150',
        'hover:border-indigo-400 hover:scale-[1.04] hover:z-20',
        isCorner        ? 'bg-[#192144] border-amber-500/60' : '',
        isOccupiedByActive ? 'ring-1 ring-indigo-400' : '',
        tile.isMortgaged   ? 'opacity-50' : '',
      ].join(' ')}
    >
      {/* ── Zone 1: Color band (property only, compact 2px) ── */}
      {hasColorBand && (
        <div
          className="w-full shrink-0"
          style={{ backgroundColor: tile.colorGroup!, height: 2.5 }}
        />
      )}

      {/* ── Zone 2: Icon / Image — expanded to maximize visibility ── */}
      <div className="relative flex-1 w-full overflow-hidden flex items-center justify-center min-h-0 p-0">
        {tile.imageUrl ? (
          <img
            src={tile.imageUrl}
            alt={tile.name}
            className={`w-full h-full object-${tile.imageFit || 'cover'}`}
            style={{ imageRendering: 'auto' }}
            loading="eager"
          />
        ) : (
          /* Icon enlarged to fill available area with drop shadow */
          <div className="w-full h-full flex items-center justify-center p-0.5">
            <div className="w-full h-full flex items-center justify-center scale-110 drop-shadow-sm">
              {iconNode}
            </div>
          </div>
        )}
      </div>

      {/* ── Zone 3: Name (compact height, clean thin font) ── */}
      <div
        className="w-full shrink-0 flex items-center justify-center px-0.5"
        style={{ height: 8 }}
      >
        <span
          className={[
            'w-full text-center truncate leading-none font-medium',
            isCorner
              ? 'text-amber-300'
              : 'text-slate-200',
          ].join(' ')}
          style={{ fontSize: isCorner ? 5.2 : 4.4 }}
          title={tile.name}
        >
          {tile.name}
        </span>
      </div>

      {/* ── Zone 4: Info bar (price / owner dot / houses) — compact 8px ── */}
      <div
        className="w-full shrink-0 flex flex-col items-center justify-center px-0.5 gap-px"
        style={{ height: 8 }}
      >
        {/* Price */}
        {tile.type === 'PROPERTY' && !tile.isMortgaged && (
          <span style={{ fontSize: 4.5, color: '#6ee7b7', lineHeight: 1, fontWeight: 700 }}>
            ${tile.price}
          </span>
        )}
        {tile.type === 'START' && (
          <span style={{ fontSize: 4.2, color: '#6ee7b7', lineHeight: 1, fontWeight: 600 }}>+$200</span>
        )}
        {tile.type === 'TAX' && (
          <span style={{ fontSize: 4.2, color: '#f87171', lineHeight: 1, fontWeight: 600 }}>
            -{tile.price ?? 100}
          </span>
        )}

        {/* Mortgaged */}
        {tile.isMortgaged && (
          <div className="flex items-center gap-px" style={{ color: '#f87171', fontSize: 3.8 }}>
            <Lock style={{ width: 4, height: 4 }} />MTG
          </div>
        )}

        {/* Owner dot */}
        {owner && !tile.isMortgaged && (
          <div className="flex items-center gap-0.5">
            <div
              className="rounded-full border border-white/50"
              style={{ backgroundColor: owner.color, width: 4.5, height: 4.5 }}
              title={owner.name}
            />
          </div>
        )}

        {/* Houses / Hotel */}
        {owner && !tile.isMortgaged && upgradeLevel > 0 && (
          <HousesDisplay level={upgradeLevel} groupColor={tile.colorGroup} />
        )}
      </div>

      {/* ── Player tokens (absolute overlay, always on top) ── */}
      {playersOnTile.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {playersOnTile.map((p, idx) => (
            <PlayerToken
              key={p.id}
              player={p}
              slotIndex={idx}
              totalTokensOnTile={playersOnTile.length}
              isCurrentTurn={p.id === activePlayerId}
              isHopping={p.id === hoppingPlayerId}
            />
          ))}
        </div>
      )}
    </div>
  );
};
