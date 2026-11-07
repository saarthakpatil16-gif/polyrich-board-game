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

      {/* ── Zone 2: Icon / Image — maximized to occupy the vast majority of the tile ── */}
      <div className="relative flex-1 w-full overflow-hidden flex items-center justify-center min-h-0 p-0">
        {tile.imageUrl ? (
          <img
            src={tile.imageUrl}
            alt={tile.name}
            className={`w-full h-full ${tile.imageFit === 'contain' ? 'object-contain' : 'object-cover'}`}
            style={{ imageRendering: 'auto' }}
            loading="eager"
          />
        ) : (
          /* Icon enlarged to fill available area with drop shadow */
          <div className="w-full h-full flex items-center justify-center p-0.5">
            <div className="w-full h-full flex items-center justify-center scale-125 drop-shadow-sm">
              {iconNode}
            </div>
          </div>
        )}

        {/* ── Sleek Floating Price / Status Badge (INR Currency) ── */}
        {tile.type === 'PROPERTY' && !tile.isMortgaged && (
          <div
            className="absolute top-0.5 left-0.5 z-10 px-0.5 py-px rounded-[2px] bg-black/80 backdrop-blur-[1px] border border-emerald-500/50 flex items-center leading-none shadow-sm"
          >
            <span style={{ fontSize: 4.4, color: '#6ee7b7', fontWeight: 800 }}>
              ₹{tile.price}
            </span>
          </div>
        )}
        {tile.type === 'START' && (
          <div
            className="absolute top-0.5 left-0.5 z-10 px-0.5 py-px rounded-[2px] bg-black/80 backdrop-blur-[1px] border border-emerald-500/50 flex items-center leading-none shadow-sm"
          >
            <span style={{ fontSize: 4.2, color: '#6ee7b7', fontWeight: 800 }}>+₹200</span>
          </div>
        )}
        {tile.type === 'TAX' && (
          <div
            className="absolute top-0.5 left-0.5 z-10 px-0.5 py-px rounded-[2px] bg-black/80 backdrop-blur-[1px] border border-rose-500/50 flex items-center leading-none shadow-sm"
          >
            <span style={{ fontSize: 4.2, color: '#f87171', fontWeight: 800 }}>
              -₹{tile.price ?? 100}
            </span>
          </div>
        )}
        {tile.isMortgaged && (
          <div
            className="absolute top-0.5 left-0.5 z-10 px-0.5 py-px rounded-[2px] bg-black/90 border border-rose-500/60 flex items-center gap-px leading-none shadow-sm"
          >
            <Lock style={{ width: 3.5, height: 3.5, color: '#f87171' }} />
            <span style={{ fontSize: 3.8, color: '#f87171', fontWeight: 800 }}>MTG</span>
          </div>
        )}

        {/* ── Owner dot & development tier floating top-right ── */}
        {owner && !tile.isMortgaged && (
          <div className="absolute top-0.5 right-0.5 z-10 flex items-center gap-0.5 bg-black/75 px-0.5 py-px rounded-[2px] border border-white/20">
            <div
              className="rounded-full border border-white/60"
              style={{ backgroundColor: owner.color, width: 4.5, height: 4.5 }}
              title={owner.name}
            />
            {upgradeLevel > 0 && (
              <span style={{ fontSize: 3.8, color: '#fbbf24', fontWeight: 800 }}>
                {upgradeLevel >= 3 ? 'HTL' : `T${upgradeLevel}`}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Zone 3: Compact Name Bar (minimal height so image gets maximum space) ── */}
      <div
        className="w-full shrink-0 flex items-center justify-center px-0.5 bg-[#0e1224]/95 border-t border-slate-800/80"
        style={{ height: 6.5 }}
      >
        <span
          className={[
            'w-full text-center truncate leading-none font-bold',
            isCorner ? 'text-amber-300' : 'text-slate-100',
          ].join(' ')}
          style={{ fontSize: isCorner ? 5.2 : 4.5 }}
          title={tile.name}
        >
          {tile.name}
        </span>
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
