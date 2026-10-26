import React from 'react';
import { PlayerDTO } from '../../types';
import { Crown, DollarSign, Building, TrendingUp, ShieldAlert, WifiOff, Skull } from 'lucide-react';
import { renderPawnIcon, RichupPawn } from '../../utils/pawnShapes';

interface PlayerCardProps {
  player: PlayerDTO;
  isCurrentTurn: boolean;
  isCurrentClient: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isCurrentTurn,
  isCurrentClient
}) => {
  return (
    <div
      className={`relative flex flex-col p-3 rounded-xl border transition-all duration-300 ${
        player.isBankrupt
          ? 'bg-red-950/20 border-red-900/40 opacity-50'
          : isCurrentTurn
          ? 'bg-[#181f3d] border-indigo-500 shadow-neon scale-[1.02]'
          : 'bg-[#13172c] border-[#232b4b] hover:border-slate-700'
      }`}
    >
      {/* Top Header: Avatar, Name, Badges */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 overflow-hidden">
          {/* 3D Richup-style Pawn */}
          <div className="shrink-0">
            <RichupPawn
              color={player.color}
              avatar={player.avatar}
              size="sm"
              defaultIndex={player.orderIndex}
            />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-xs text-slate-200 truncate" title={player.name}>
                {player.name}
              </span>
              {player.isHost && (
                <span title="Room Host">
                  <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                </span>
              )}
              {isCurrentClient && (
                <span className="text-[9px] bg-indigo-500/30 text-indigo-300 px-1 rounded font-medium">
                  YOU
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 truncate">
              Pos: #{player.position}
            </span>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-1 shrink-0">
          {player.isBankrupt && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/40">
              <Skull className="w-3 h-3" /> OUT
            </span>
          )}
          {player.inJail && !player.isBankrupt && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40" title={`In Jail (${player.jailTurns} turns remaining)`}>
              <ShieldAlert className="w-3 h-3" /> JAIL
            </span>
          )}
          {!player.isConnected && (
            <span className="text-slate-500" title="Disconnected">
              <WifiOff className="w-3.5 h-3.5" />
            </span>
          )}
          {isCurrentTurn && !player.isBankrupt && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
        </div>
      </div>

      {/* Financial Stats: Balance, Properties, Net Worth */}
      <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-800/60 text-center">
        <div>
          <span className="text-[10px] text-slate-400 flex items-center justify-center gap-0.5">
            <DollarSign className="w-2.5 h-2.5 text-emerald-400" /> Cash
          </span>
          <span className={`text-xs font-bold ${player.money < 100 ? 'text-rose-400' : 'text-emerald-400'}`}>
            ${player.money}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 flex items-center justify-center gap-0.5">
            <Building className="w-2.5 h-2.5 text-indigo-400" /> Props
          </span>
          <span className="text-xs font-bold text-slate-200">
            {player.propertyCount}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 flex items-center justify-center gap-0.5">
            <TrendingUp className="w-2.5 h-2.5 text-amber-400" /> Worth
          </span>
          <span className="text-xs font-bold text-amber-300">
            ${player.netWorth}
          </span>
        </div>
      </div>
    </div>
  );
};
