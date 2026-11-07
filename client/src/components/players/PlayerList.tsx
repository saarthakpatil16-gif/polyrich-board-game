import React from 'react';
import { PlayerDTO } from '../../types';
import { Crown, DollarSign, Building, ShieldAlert, Skull, WifiOff } from 'lucide-react';

interface PlayerListProps {
  players: PlayerDTO[];
  activePlayerId: string | null;
  currentPlayerId?: string | null;
}

export const PlayerList: React.FC<PlayerListProps> = ({
  players,
  activePlayerId,
  currentPlayerId
}) => {
  return (
    <div className="w-full bg-[#0d1021]/90 backdrop-blur-sm border border-[#232b4b] rounded-xl px-2 py-1.5 sm:px-3 sm:py-2 shadow-md">
      {/* Responsive compact list */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
        {players.map((player) => {
          const isTurn = player.id === activePlayerId;
          const isYou = player.id === currentPlayerId;

          return (
            <div
              key={player.id}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-all shrink-0 ${
                player.isBankrupt
                  ? 'bg-red-950/20 border-red-900/40 opacity-40'
                  : isTurn
                  ? 'bg-[#1a2142] border-indigo-500 shadow-neon scale-[1.02]'
                  : 'bg-[#12162a] border-[#222a49]'
              }`}
            >
              {/* Token avatar */}
              <div 
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center font-bold text-[9px] sm:text-[10px] text-white shadow border border-white/80 shrink-0"
                style={{ backgroundColor: player.color }}
              >
                {player.name.charAt(0).toUpperCase()}
              </div>

              {/* Player Name and Badges */}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-200 truncate max-w-[85px] sm:max-w-[110px]" title={player.name}>
                    {player.name}
                  </span>
                  {player.isHost && (
                    <span title="Room Host">
                      <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400 shrink-0" />
                    </span>
                  )}
                  {isYou && (
                    <span className="text-[8px] bg-indigo-500/30 text-indigo-300 px-1 rounded font-bold">
                      YOU
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[9px] sm:text-[10px]">
                  <span className={`font-black ${player.money < 100 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    ₹{player.money}
                  </span>
                  <span className="text-slate-400">
                    Pos #{player.position}
                  </span>
                </div>
              </div>

              {/* Status Badges */}
              {player.isBankrupt ? (
                <span className="text-rose-400 text-[9px] font-bold" title="Bankrupt">
                  <Skull className="w-3 h-3" />
                </span>
              ) : player.inJail ? (
                <span className="text-amber-400 text-[9px] font-bold" title="In Jail">
                  <ShieldAlert className="w-3 h-3" />
                </span>
              ) : !player.isConnected ? (
                <span className="text-slate-500" title="Disconnected">
                  <WifiOff className="w-3 h-3" />
                </span>
              ) : isTurn ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-0.5" />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
