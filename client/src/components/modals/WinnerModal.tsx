import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { PlayerDTO } from '../../types';
import { Trophy, Medal, RotateCcw } from 'lucide-react';
import { soundFX } from '../../utils/audio';

interface WinnerModalProps {
  winner: PlayerDTO | null;
  players: PlayerDTO[];
  onPlayAgain: () => void;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  winner,
  players,
  onPlayAgain
}) => {
  useEffect(() => {
    // Launch celebratory confetti bursts
    soundFX.playVictory();
    const duration = 3.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#6366f1', '#f59e0b', '#10b981', '#ec4899']
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#6366f1', '#f59e0b', '#10b981', '#ec4899']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  // Sort players by net worth
  const rankedPlayers = [...players].sort((a, b) => b.netWorth - a.netWorth);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in zoom-in-95 duration-300">
      <div className="w-full max-w-md bg-[#13172e] border border-amber-500/40 rounded-3xl shadow-2xl p-6 text-center flex flex-col items-center relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-16 w-44 h-44 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

        <div className="p-4 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 mb-3 shadow-gold animate-bounce">
          <Trophy className="w-10 h-10" />
        </div>

        <span className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">
          Game Completed
        </span>

        <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
          {winner ? `${winner.name} Wins!` : 'Game Over!'}
        </h2>

        <p className="text-xs text-slate-300 mb-6">
          {winner ? `Crowned the supreme tycoon with $${winner.netWorth} net worth!` : 'All rounds completed.'}
        </p>

        {/* Final Standings Table */}
        <div className="w-full bg-[#0b0e1f] rounded-2xl p-3 border border-slate-800/80 mb-6 flex flex-col gap-2">
          <span className="text-[11px] font-bold text-slate-400 text-left px-2 uppercase">
            Final Standings
          </span>
          {rankedPlayers.map((p, idx) => (
            <div 
              key={p.id}
              className={`flex items-center justify-between p-2 rounded-xl text-xs ${
                idx === 0 
                  ? 'bg-amber-500/10 border border-amber-500/30 font-bold' 
                  : 'bg-slate-900/40 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-5 text-center font-bold text-slate-400">
                  {idx === 0 ? <Medal className="w-4 h-4 text-amber-400 inline" /> : `#${idx + 1}`}
                </span>
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: p.color }} 
                />
                <span className="text-white">{p.name}</span>
                {p.isBankrupt && (
                  <span className="text-[9px] text-rose-400 font-normal">(Bankrupt)</span>
                )}
              </div>

              <div className="text-right">
                <span className="font-bold text-emerald-400">₹{p.netWorth}</span>
                <span className="text-[10px] text-slate-500 block">{p.propertyCount} properties</span>
              </div>
            </div>
          ))}
        </div>

        {/* Play Again Button */}
        <button
          onClick={onPlayAgain}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 text-slate-950 shadow-gold transition active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          Play Again / Lobby
        </button>
      </div>
    </div>
  );
};
