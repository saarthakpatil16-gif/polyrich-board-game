import React, { useState, useEffect } from 'react';
import { PublicGameState, PlayerDTO } from '../../types';
import { soundFX } from '../../utils/audio';
import { 
  Dices, 
  ShoppingCart, 
  History, 
  ArrowRight, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check 
} from 'lucide-react';

interface CenterPanelProps {
  state: PublicGameState;
  currentPlayer: PlayerDTO | null;
  onRollDice: () => void;
  onBuyProperty: () => void;
  onSkipPurchase: () => void;
  onEndTurn: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isPawnMoving?: boolean;
  onOpenTrade?: () => void;
  onDeclareBankruptcy?: () => void;
}

export const CenterPanel: React.FC<CenterPanelProps> = ({
  state,
  currentPlayer,
  onRollDice,
  onBuyProperty,
  onSkipPurchase,
  onEndTurn,
  soundEnabled,
  onToggleSound,
  isPawnMoving = false,
  onOpenTrade,
  onDeclareBankruptcy
}) => {
  const [copied, setCopied] = useState(false);
  const [isRollingAnimation, setIsRollingAnimation] = useState(false);
  const [animatedDice, setAnimatedDice] = useState<[number, number]>([state.dice[0] || 1, state.dice[1] || 1]);

  const activePlayer = state.players.find(p => p.id === state.activePlayerId);
  const isMyTurn = currentPlayer?.id === state.activePlayerId;

  // When state dice changes and action stage moves to decision/end, sync
  useEffect(() => {
    if (!isRollingAnimation) {
      setAnimatedDice([state.dice[0] || 1, state.dice[1] || 1]);
    }
  }, [state.dice, isRollingAnimation]);

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    soundFX.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRollClick = () => {
    if (!isMyTurn || isRollingAnimation || isPawnMoving) return;

    setIsRollingAnimation(true);
    soundFX.playDiceRoll();

    // Rapidly tumble dice faces for 900ms
    const interval = setInterval(() => {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      setAnimatedDice([d1, d2]);
    }, 60);

    setTimeout(() => {
      clearInterval(interval);
      setIsRollingAnimation(false);
      onRollDice();
    }, 900);
  };

  const renderDiceFace = (val: number, isRolling: boolean) => {
    const pips: Record<number, number[]> = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8]
    };
    const activePips = pips[val] || [4];

    return (
      <div 
        className={`w-8 h-8 sm:w-11 sm:h-11 md:w-12 md:h-12 bg-gradient-to-br from-white to-slate-200 rounded-lg sm:rounded-xl shadow-lg border-2 border-slate-300 grid grid-cols-3 grid-rows-3 p-1 sm:p-1.5 gap-0.5 sm:gap-1 shrink-0 select-none ${
          isRolling ? 'animate-dice-shake' : ''
        }`}
      >
        {Array.from({ length: 9 }).map((_, idx) => (
          <div key={idx} className="flex items-center justify-center">
            {activePips.includes(idx) && (
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-900 shadow-sm" />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-2 sm:p-4 bg-[#0f1325]/95 backdrop-blur-md rounded-xl sm:rounded-2xl border border-[#232b4b] shadow-2xl relative overflow-hidden">
      {/* Top Header: Room Code & Sound */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 sm:pb-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-[10px] sm:text-xs font-medium text-slate-400">ROOM:</span>
          <span className="font-mono text-xs sm:text-sm font-bold text-indigo-400 tracking-wider">
            {state.roomCode}
          </span>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1 text-[10px] sm:text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded transition"
            title="Copy invitation link"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Invite'}
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-[10px] sm:text-xs text-slate-400">
            Round <span className="font-bold text-white">{state.currentRound}</span>/{state.rules.maxRounds}
          </span>
          <button
            onClick={onToggleSound}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title={soundEnabled ? 'Mute sound' : 'Unmute sound'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* Middle Active Player & Animated Dice Section */}
      <div className="flex flex-col items-center justify-center my-auto py-1 sm:py-2 text-center">
        {activePlayer && (
          <div className="flex items-center gap-2 mb-2 sm:mb-3 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/60">
            <div 
              className="w-3.5 h-3.5 rounded-full border border-white"
              style={{ backgroundColor: activePlayer.color }}
            />
            <span className="text-xs sm:text-sm font-semibold text-slate-200">
              {isPawnMoving ? `${activePlayer.name} is moving...` : isMyTurn ? "Your Turn!" : `${activePlayer.name}'s Turn`}
            </span>
            {isMyTurn && !isPawnMoving && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>
        )}

        {/* Dice Display with 3D Rolling Animation */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 my-1 sm:my-2">
          {renderDiceFace(animatedDice[0], isRollingAnimation)}
          {state.rules.diceCount > 1 && renderDiceFace(animatedDice[1], isRollingAnimation)}
          <div className="text-lg sm:text-2xl font-black text-amber-400 ml-1">
            = {animatedDice[0] + (state.rules.diceCount > 1 ? animatedDice[1] : 0)}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-2 sm:mt-3">
          {/* Roll Dice Button */}
          {state.actionStage === 'AWAITING_ROLL' && (
            <button
              onClick={handleRollClick}
              disabled={!isMyTurn || isRollingAnimation || isPawnMoving}
              className={`flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition-all ${
                isMyTurn && !isRollingAnimation && !isPawnMoving
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 text-white shadow-neon scale-105 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
              }`}
            >
              <Dices className={`w-4 h-4 ${isRollingAnimation ? 'animate-spin' : ''}`} />
              {isRollingAnimation ? 'Rolling Dice...' : isPawnMoving ? 'Moving Pawn...' : 'Roll Dice'}
            </button>
          )}

          {/* Buy Decision Buttons */}
          {state.actionStage === 'AWAITING_BUY_DECISION' && !isPawnMoving && (
            <div className="flex items-center gap-2">
              <button
                onClick={onBuyProperty}
                disabled={!isMyTurn}
                className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition ${
                  isMyTurn 
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95' 
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Buy Property
              </button>
              <button
                onClick={onSkipPurchase}
                disabled={!isMyTurn}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-medium text-xs sm:text-sm transition ${
                  isMyTurn
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'bg-slate-900 text-slate-600 cursor-not-allowed'
                }`}
              >
                Skip
              </button>
            </div>
          )}

          {/* End Turn Button */}
          {state.actionStage === 'AWAITING_END_TURN' && !isPawnMoving && (
            <button
              onClick={onEndTurn}
              disabled={!isMyTurn}
              className={`flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition-all ${
                isMyTurn
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white shadow-gold scale-105 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
              }`}
            >
              <ArrowRight className="w-4 h-4" />
              End Turn
            </button>
          )}

          {/* Quick Trade & Bankruptcy Buttons */}
          <div className="flex items-center gap-1.5 w-full justify-center pt-1 border-t border-slate-800/60 mt-1">
            <button
              onClick={onOpenTrade}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 transition"
              title="Propose property & cash trade"
            >
              Trade Deals
            </button>
            <button
              onClick={onDeclareBankruptcy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-semibold bg-rose-950/20 hover:bg-rose-950/60 text-rose-400 border border-rose-900/30 transition"
              title="Liquidate assets and forfeit"
            >
              Bankrupt
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Transaction Ticker */}
      <div className="border-t border-slate-800/80 pt-1.5 text-[10px] sm:text-xs text-slate-400">
        <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
          <History className="w-3 h-3" /> Recent Activity
        </div>
        <div className="truncate">
          {state.transactions && state.transactions.length > 0 ? (
            <span className="text-slate-300">
              <span className="text-amber-400 font-medium">#{state.transactions[0].round} </span>
              {state.transactions[0].details}
            </span>
          ) : (
            <span>Game ready. Roll dice to begin!</span>
          )}
        </div>
      </div>
    </div>
  );
};
