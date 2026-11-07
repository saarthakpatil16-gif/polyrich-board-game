import React, { useState } from 'react';
import { PublicGameState, PlayerDTO } from '../types';
import { soundFX } from '../utils/audio';
import { PawnSelectorModal } from '../components/modals/PawnSelectorModal';
import { renderPawnIcon, RichupPawn } from '../utils/pawnShapes';
import { Crown, Users, Clock, Sparkles, Palette, CheckCircle2, Copy, Check, Sliders, Play, Bot, Plus, Minus, Trash2, ArrowLeft, AlertCircle } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { api } from '../services/api';

interface LobbyPageProps {
  state: PublicGameState;
  currentPlayer: PlayerDTO | null;
  errorMessage?: string | null;
  onStartGame: () => void;
  onToggleReady: () => void;
  onOpenEditor: () => void;
  onLeaveRoom: () => void;
  onAddBot?: () => void;
  onRemoveBot?: (botId?: string) => void;
}

export const LobbyPage: React.FC<LobbyPageProps> = ({
  state,
  currentPlayer,
  errorMessage,
  onStartGame,
  onToggleReady,
  onOpenEditor,
  onLeaveRoom,
  onAddBot,
  onRemoveBot,
}) => {
  const [copied, setCopied] = useState(false);
  const [pawnModalOpen, setPawnModalOpen] = useState(false);
  const isHost = currentPlayer?.isHost || false;
  const readyCount = state.players.filter(p => p.isReady).length;
  const botCount = state.players.filter(p => p.isBot).length;

  const { toast, ToastContainer } = useToast();

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}?room=${state.roomCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    soundFX.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  // Save pawn selection to server and show toast feedback
  const handleSavePawn = async (avatar: string, color: string) => {
    if (!currentPlayer) return;
    try {
      await api.updatePlayerAvatar(state.roomCode, currentPlayer.sessionId, avatar, color);
      toast.success('Pawn saved! 🎉');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? 'Failed to save pawn');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0d1a] text-slate-100 flex flex-col items-center justify-center p-4">
      {/* Container */}
      <div className="w-full max-w-2xl bg-[#11152a] border border-[#232b4b] rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col gap-6 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* Top Bar with Back Button & Room Details */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                soundFX.playClick();
                onLeaveRoom();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition active:scale-95 text-xs font-bold shrink-0"
              title="Leave lobby and return to home"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Leave</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black text-white tracking-wider">POLYRICH</span>
                <span className="text-[10px] bg-indigo-600/30 text-indigo-400 font-bold px-2 py-0.5 rounded border border-indigo-500/40">LOBBY</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Expanded 48-Tile Board Game • Up to 6 Players</p>
            </div>
          </div>

          {/* Room Code & Invite Button */}
          <div className="flex items-center gap-2 bg-[#090b16] px-3 py-2 rounded-2xl border border-slate-800">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Room Code</span>
              <span className="font-mono text-base font-black text-amber-400 tracking-widest">{state.roomCode}</span>
            </div>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow transition active:scale-95 ml-2"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied Link!' : 'Invite'}
            </button>
          </div>
        </div>

        {/* Error notification banner if any */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Players Lobby Section */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-400" />
              Connected Players ({state.players.length}/6)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">{readyCount} of {state.players.length} Ready</span>
              
              {/* Bot controls for Host */}
              {isHost && (
                <div className="flex items-center gap-1 bg-[#090b16] p-1 rounded-xl border border-slate-800 ml-1">
                  {state.players.length < 6 && onAddBot && (
                    <button
                      onClick={onAddBot}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600/30 hover:bg-indigo-600/60 text-indigo-300 border border-indigo-500/40 transition active:scale-95"
                      title="Add an automated Bot player"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>+ Bot</span>
                    </button>
                  )}
                  {botCount > 0 && onRemoveBot && (
                    <button
                      onClick={() => onRemoveBot()}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 transition active:scale-95"
                      title="Remove a Bot player"
                    >
                      <Minus className="w-3.5 h-3.5" />
                      <span>Bot</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Bot Suggestion for Solo Host */}
          {isHost && state.players.length === 1 && (
            <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-indigo-200">
                <Bot className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Playing alone? You can start solo or add automated bots to practice against!</span>
              </div>
              {onAddBot && (
                <button
                  onClick={onAddBot}
                  className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 ml-2 transition active:scale-95 shadow"
                >
                  Add Bot
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {state.players.map((p) => {
              const isYou = p.id === currentPlayer?.id;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                    isYou
                      ? 'bg-[#181f3d] border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                      : 'bg-[#13172c] border-[#222a49]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl bg-slate-900/80 border border-slate-700/80 flex items-center justify-center shrink-0 shadow-inner"
                    >
                      <RichupPawn 
                        color={p.color} 
                        avatar={p.avatar} 
                        size="sm" 
                        defaultIndex={p.orderIndex} 
                      />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-white">{p.name}</span>
                        {p.isHost && (
                          <span title="Room Host">
                            <Crown className="w-3.5 h-3.5 text-amber-400" />
                          </span>
                        )}
                        {p.isBot && (
                          <span className="text-[9px] bg-purple-500/30 text-purple-300 font-bold px-1 rounded flex items-center gap-0.5">
                            <Bot className="w-2.5 h-2.5" /> BOT
                          </span>
                        )}
                        {isYou && (
                          <span className="text-[9px] bg-indigo-500/30 text-indigo-300 font-bold px-1 rounded">YOU</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {p.isHost ? 'Host & Game Master' : p.isBot ? 'Automated Player' : 'Player'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isHost && p.isBot && onRemoveBot && (
                      <button
                        onClick={() => onRemoveBot(p.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition"
                        title="Remove Bot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {p.isReady ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400/80 bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-800/30">
                        <Clock className="w-3 h-3" /> Waiting
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Empty slots placeholders up to 6 players */}
            {Array.from({ length: 6 - state.players.length }).map((_, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-2xl border border-dashed border-slate-800/80 bg-slate-900/20 text-slate-600"
              >
                <div className="w-9 h-9 rounded-full border border-dashed border-slate-700 flex items-center justify-center text-xs">+</div>
                <span className="text-xs font-medium">Slot #{state.players.length + idx + 1} Open (Share link to invite)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Board Configuration Overview Box */}
        <div className="bg-[#0b0e1e] rounded-2xl border border-slate-800/80 p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                Board Configuration: {state.boardTiles.length} Tiles
                {state.boardTiles.filter(t => !!t.imageUrl).length > 0 && (
                  <span className="text-amber-400 font-normal ml-1">
                    ({state.boardTiles.filter(t => !!t.imageUrl).length} custom photos)
                  </span>
                )}
              </span>
              <span className="text-[11px] text-slate-400">
                Expanded Perimeter (12 per side) • Starting Cash: ${state.rules.startingCash} • Pass Start: +${state.rules.passStartBonus}
              </span>
            </div>
          </div>
          {isHost && (
            <button
              onClick={onOpenEditor}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition active:scale-95 shrink-0"
            >
              <Sliders className="w-3.5 h-3.5" />
              Edit Board
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          {/* Pawn Customizer Button */}
          {currentPlayer && (
            <button
              onClick={() => {
                soundFX.playClick();
                setPawnModalOpen(true);
              }}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 shadow-md transition active:scale-95 flex items-center justify-center gap-2"
            >
              <Palette className="w-4 h-4 text-indigo-400" />
              Customize Pawn
            </button>
          )}

          {/* Ready Toggle */}
          <button
            onClick={onToggleReady}
            className={`w-full sm:flex-1 py-3 px-6 rounded-2xl font-bold text-sm shadow-md transition active:scale-95 ${
              currentPlayer?.isReady
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
            }`}
          >
            {currentPlayer?.isReady ? "Cancel Ready" : "I'm Ready"}
          </button>

          {/* Start Game Button (Host Only) */}
          {isHost && (
            <button
              onClick={onStartGame}
              className="w-full sm:flex-1 py-3 px-6 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white shadow-emerald-900/40 shadow-xl transition active:scale-95 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              Start Game ({state.players.length} {state.players.length === 1 ? 'Player' : 'Players'})
            </button>
          )}
        </div>
      </div>
      {/* Toast notifications */}
      <ToastContainer />

      {/* Pawn Selector Modal */}
      {currentPlayer && (
        <PawnSelectorModal
          isOpen={pawnModalOpen}
          onClose={() => setPawnModalOpen(false)}
          currentPlayer={currentPlayer}
          onSave={handleSavePawn}
        />
      )}
    </div>
  );
};
