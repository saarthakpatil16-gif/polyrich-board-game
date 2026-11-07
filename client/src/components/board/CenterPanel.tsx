import React, { useState, useEffect } from 'react';
import { PublicGameState, PlayerDTO } from '../../types';
import { soundFX } from '../../utils/audio';
import { 
  Dices, 
  ShoppingCart, 
  ArrowRight, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check,
  Skull,
  RotateCcw,
  Activity,
  ShieldAlert,
  Lock
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
  onPayBail?: () => void;
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
  onDeclareBankruptcy,
  onPayBail
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
    const url = `${window.location.origin}?room=${state.roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    soundFX.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRollClick = () => {
    if (!isMyTurn || isRollingAnimation) return;

    setIsRollingAnimation(true);
    soundFX.playDiceRoll();

    // Call server roll immediately so RNG calculation starts without lag
    onRollDice();

    // Rapidly tumble dice faces for 550ms
    const interval = setInterval(() => {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      setAnimatedDice([d1, d2]);
    }, 55);

    setTimeout(() => {
      clearInterval(interval);
      setIsRollingAnimation(false);
      setAnimatedDice([state.dice[0] || 1, state.dice[1] || 1]);
    }, 550);
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
        className={`w-7 h-7 sm:w-10 sm:h-10 bg-gradient-to-br from-white to-slate-200 rounded-md sm:rounded-xl shadow-lg border-2 border-slate-300 grid grid-cols-3 grid-rows-3 p-1 sm:p-1.5 gap-0.5 shrink-0 select-none ${
          isRolling ? 'animate-dice-shake' : ''
        }`}
      >
        {Array.from({ length: 9 }).map((_, idx) => (
          <div key={idx} className="flex items-center justify-center">
            {activePips.includes(idx) && (
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-slate-900 shadow-sm" />
            )}
          </div>
        ))}
      </div>
    );
  };

  // Last 5 transactions for recent activity
  const recentActivity = (state.transactions || []).slice(0, 6);

  return (
    <div className="w-full h-full flex flex-col bg-[#0f1325]/95 backdrop-blur-md rounded-xl sm:rounded-2xl border border-[#232b4b] shadow-2xl relative overflow-hidden select-none">
      
      {/* ── TOP: Room Info + Turn Indicator ── */}
      <div className="flex items-center justify-between px-2 pt-1.5 pb-1 border-b border-slate-800/70 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-wider">ROOM</span>
          <span className="font-mono text-[10px] sm:text-xs font-bold text-indigo-400">{state.roomCode}</span>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-0.5 text-[9px] sm:text-[10px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-lg transition"
            title="Copy invitation link"
          >
            {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
            {copied ? 'Copied' : 'Invite'}
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] sm:text-[10px] text-slate-500">
            R<span className="font-bold text-slate-300">{state.currentRound}</span>/{state.rules.maxRounds}
          </span>
          <button
            onClick={onToggleSound}
            className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition"
            title={soundEnabled ? 'Mute' : 'Unmute'}
          >
            {soundEnabled ? <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" /> : <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-600" />}
          </button>
        </div>
      </div>

      {/* ── MIDDLE: Active Turn + Dice + Actions ── */}
      <div className="flex flex-col items-center justify-center gap-1 py-1 sm:py-2 px-2 shrink-0 border-b border-slate-800/70">
        {/* Active player badge */}
        {activePlayer && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800/60 border border-slate-700/60">
            <div 
              className="w-2.5 h-2.5 rounded-full border border-white/60"
              style={{ backgroundColor: activePlayer.color }}
            />
            <span className="text-[10px] sm:text-xs font-semibold text-slate-200 truncate max-w-[120px]">
              {isPawnMoving ? `${activePlayer.name} moving…` : isMyTurn ? '🎲 Your Turn!' : `${activePlayer.name}'s Turn`}
            </span>
            {isMyTurn && !isPawnMoving && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>
        )}

        {/* Jail Alert Banner if active player is in jail */}
        {activePlayer?.inJail && (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-rose-950/70 border border-rose-500/50 text-[9px] sm:text-[10px] text-rose-300 font-bold">
            <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />
            <span>
              {isMyTurn 
                ? `You are in Jail! (${activePlayer.jailTurns || 1} turn${(activePlayer.jailTurns || 1) > 1 ? 's' : ''} left)`
                : `${activePlayer.name} is in Jail (${activePlayer.jailTurns || 1} turn left)`}
            </span>
          </div>
        )}

        {/* Dice Row */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
          {renderDiceFace(animatedDice[0], isRollingAnimation)}
          {state.rules.diceCount > 1 && renderDiceFace(animatedDice[1], isRollingAnimation)}
          <div className="text-base sm:text-xl font-black text-amber-400 ml-1">
            = {animatedDice[0] + (state.rules.diceCount > 1 ? animatedDice[1] : 0)}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {state.actionStage === 'AWAITING_ROLL' && (
            activePlayer?.inJail ? (
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                <button
                  onClick={handleRollClick}
                  disabled={!isMyTurn || isRollingAnimation}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-[10px] sm:text-xs shadow-lg transition-all ${
                    isMyTurn && !isRollingAnimation
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-slate-950 scale-105 active:scale-95 cursor-pointer shadow-gold'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                  }`}
                  title="Roll doubles to escape Jail for free!"
                >
                  <Dices className={`w-3.5 h-3.5 ${isRollingAnimation ? 'animate-spin' : ''}`} />
                  {isRollingAnimation ? 'Rolling…' : 'Roll for Doubles'}
                </button>
                {isMyTurn && onPayBail && (
                  <button
                    onClick={onPayBail}
                    disabled={!currentPlayer || currentPlayer.money < 50}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-[9px] sm:text-[10px] bg-emerald-700/60 hover:bg-emerald-600 text-emerald-200 border border-emerald-500/50 transition active:scale-95 disabled:opacity-40"
                    title="Pay ₹50 bail to be released immediately"
                  >
                    <Lock className="w-3 h-3" />
                    Pay ₹50 Bail
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleRollClick}
                disabled={!isMyTurn || isRollingAnimation}
                className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-bold text-[10px] sm:text-xs shadow-lg transition-all ${
                  isMyTurn && !isRollingAnimation
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 text-white scale-105 active:scale-95 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                }`}
              >
                <Dices className={`w-3.5 h-3.5 ${isRollingAnimation ? 'animate-spin' : ''}`} />
                {isRollingAnimation ? 'Rolling…' : 'Roll Dice'}
              </button>
            )
          )}

          {state.actionStage === 'AWAITING_BUY_DECISION' && !isPawnMoving && (
            isMyTurn ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onBuyProperty}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-[10px] sm:text-xs bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 shadow-lg"
                >
                  <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  Buy
                </button>
                <button
                  onClick={onSkipPurchase}
                  className="px-3 py-1.5 rounded-xl font-medium text-[10px] sm:text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95"
                >
                  Skip / Auction
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-[9px] sm:text-[10px] text-slate-300">
                <ShoppingCart className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Waiting for <span className="font-bold text-white">{activePlayer?.name}</span> to buy or skip...</span>
              </div>
            )
          )}

          {state.actionStage === 'AWAITING_END_TURN' && !isPawnMoving && (
            <button
              onClick={onEndTurn}
              disabled={!isMyTurn}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-bold text-[10px] sm:text-xs shadow-lg transition-all ${
                isMyTurn
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white scale-105 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
              }`}
            >
              <ArrowRight className="w-3.5 h-3.5" />
              End Turn
            </button>
          )}
        </div>

        {/* Trade Button */}
        {onOpenTrade && (
          <button
            onClick={onOpenTrade}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 transition"
            title="Propose property & cash trade"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Trade Deals
          </button>
        )}
      </div>

      {/* ── MAIN CENTER: Recent Activity Feed ── (flex-1, fills remaining space) */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-2 pt-1 pb-1">
        <div className="flex items-center gap-1 mb-0.5 shrink-0">
          <Activity className="w-2.5 h-2.5 text-indigo-400" />
          <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider">Recent Activity</span>
        </div>
        
        {/* Scrollable activity list with smaller, compact font */}
        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-0.5">
          {recentActivity.length > 0 ? (
            recentActivity.map((tx, i) => (
              <div 
                key={tx.id || i}
                className={`flex items-start gap-1 px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] leading-tight ${
                  i === 0 
                    ? 'bg-indigo-950/50 border border-indigo-800/40 text-slate-200' 
                    : 'bg-slate-900/40 text-slate-400'
                }`}
              >
                <span className="text-indigo-400 font-bold shrink-0 mt-px">#{tx.round}</span>
                <span className="break-words min-w-0">{tx.details}</span>
              </div>
            ))
          ) : (
            <div className="flex-1 flex items-center justify-center text-[8px] text-slate-600 italic">
              Game ready — Roll dice to begin!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
