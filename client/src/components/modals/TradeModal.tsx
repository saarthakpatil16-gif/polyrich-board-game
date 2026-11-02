import React, { useState } from 'react';
import { PlayerDTO, BoardTileDTO, TradeProposal } from '../../types';
import { soundFX } from '../../utils/audio';
import { ArrowLeftRight, Check, X, DollarSign, Building } from 'lucide-react';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlayer: PlayerDTO;
  allPlayers: PlayerDTO[];
  boardTiles: BoardTileDTO[];
  activeTrade: TradeProposal | null;
  onProposeTrade: (
    toPlayerId: string,
    offeredMoney: number,
    offeredTileIds: string[],
    requestedMoney: number,
    requestedTileIds: string[]
  ) => void;
  onRespondTrade: (accept: boolean) => void;
  onCancelTrade: () => void;
}

export const TradeModal: React.FC<TradeModalProps> = ({
  isOpen,
  onClose,
  currentPlayer,
  allPlayers,
  boardTiles,
  activeTrade,
  onProposeTrade,
  onRespondTrade,
  onCancelTrade
}) => {
  const eligiblePartners = allPlayers.filter(p => p.id !== currentPlayer.id && !p.isBankrupt);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(eligiblePartners[0]?.id || '');
  const [offeredCash, setOfferedCash] = useState<number>(0);
  const [requestedCash, setRequestedCash] = useState<number>(0);
  const [offeredTileIds, setOfferedTileIds] = useState<string[]>([]);
  const [requestedTileIds, setRequestedTileIds] = useState<string[]>([]);

  if (!isOpen && !activeTrade) return null;

  // Incoming trade check: If there is an active trade targeted to currentPlayer
  const isIncoming = activeTrade && activeTrade.toPlayerId === currentPlayer.id;
  const isOutgoing = activeTrade && activeTrade.fromPlayerId === currentPlayer.id;

  const partner = allPlayers.find(p => p.id === selectedPartnerId);
  const myProperties = boardTiles.filter(t => t.ownerId === currentPlayer.id);
  const partnerProperties = partner ? boardTiles.filter(t => t.ownerId === partner.id) : [];

  const handleToggleOfferTile = (id: string) => {
    setOfferedTileIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleToggleRequestTile = (id: string) => {
    setRequestedTileIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleSendProposal = () => {
    if (!selectedPartnerId) return;
    soundFX.playCash();
    onProposeTrade(selectedPartnerId, offeredCash, offeredTileIds, requestedCash, requestedTileIds);
    onClose();
  };

  // ================= INCOMING TRADE PROPOSAL FLOATING BANNER =================
  // Floats at top right / center without blocking board or turns
  if (isIncoming && activeTrade) {
    const sender = allPlayers.find(p => p.id === activeTrade.fromPlayerId);
    const offeredTiles = boardTiles.filter(t => activeTrade.offeredTileIds.includes(t.id));
    const requestedTiles = boardTiles.filter(t => activeTrade.requestedTileIds.includes(t.id));

    return (
      <div className="fixed top-12 sm:top-14 right-2 sm:right-6 z-50 animate-in slide-in-from-top-4 pointer-events-auto max-w-sm w-full">
        <div className="bg-[#13172e]/95 backdrop-blur-md border-2 border-indigo-500 rounded-2xl shadow-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-indigo-600/30 text-indigo-400 border border-indigo-500/40">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest block leading-tight">
                  Trade Proposal
                </span>
                <h4 className="text-xs sm:text-sm font-black text-white">
                  {sender?.name} wants to trade
                </h4>
              </div>
            </div>
            <button 
              onClick={() => onRespondTrade(false)}
              className="text-slate-400 hover:text-white p-1"
              title="Decline trade"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-left text-[10px] bg-[#0b0e1f] p-2.5 rounded-xl border border-slate-800">
            <div>
              <span className="font-bold text-emerald-400 block mb-0.5">THEY OFFER:</span>
              <p className="font-bold text-white">${activeTrade.offeredMoney} Cash</p>
              {offeredTiles.length > 0 ? (
                <ul className="text-slate-300 space-y-0.5 truncate">
                  {offeredTiles.map(t => <li key={t.id} className="truncate">• {t.name}</li>)}
                </ul>
              ) : (
                <span className="text-slate-500 italic">No props</span>
              )}
            </div>

            <div>
              <span className="font-bold text-rose-400 block mb-0.5">THEY WANT:</span>
              <p className="font-bold text-white">${activeTrade.requestedMoney} Cash</p>
              {requestedTiles.length > 0 ? (
                <ul className="text-slate-300 space-y-0.5 truncate">
                  {requestedTiles.map(t => <li key={t.id} className="truncate">• {t.name}</li>)}
                </ul>
              ) : (
                <span className="text-slate-500 italic">No props</span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onRespondTrade(true)}
              className="flex-1 py-1.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white shadow-md transition active:scale-95 flex items-center justify-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Accept
            </button>
            <button
              onClick={() => onRespondTrade(false)}
              className="flex-1 py-1.5 rounded-xl font-medium text-xs bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/40 transition active:scale-95 flex items-center justify-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Decline
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= OUTGOING TRADE FLOATING STATUS =================
  // Non-blocking toast at top right
  if (isOutgoing && activeTrade) {
    return (
      <div className="fixed top-12 sm:top-14 right-2 sm:right-6 z-50 animate-in slide-in-from-top-4 pointer-events-auto">
        <div className="bg-[#13172e]/95 backdrop-blur-md border border-indigo-500/50 rounded-2xl shadow-xl px-4 py-2.5 flex items-center gap-3">
          <div className="animate-spin text-indigo-400">
            <ArrowLeftRight className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-bold text-indigo-300">
              Trade Sent to {activeTrade.toPlayerName}
            </p>
            <p className="text-[9px] text-slate-400">
              Waiting for response (gameplay continues)...
            </p>
          </div>
          <button
            onClick={onCancelTrade}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 ml-2"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ================= CREATE TRADE PROPOSAL MODAL =================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl bg-[#12162b] border border-[#2b355c] rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#181f3d] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-black text-base">
            <ArrowLeftRight className="w-5 h-5 text-indigo-400" />
            Trade Deal with Other Player
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-5">
          {/* Partner Selector */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Select Trading Partner:
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {eligiblePartners.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPartnerId(p.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                    selectedPartnerId === p.id
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name} (${p.money})
                </button>
              ))}
            </div>
          </div>

          {/* Trade Exchange Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Left: You Offer */}
            <div className="bg-[#0b0e1e] p-4 rounded-2xl border border-slate-800 flex flex-col gap-3">
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                You Offer:
              </span>

              {/* Cash Slider / Input */}
              <div>
                <label className="text-[11px] text-slate-400 flex justify-between mb-1">
                  <span>Cash:</span>
                  <span className="font-bold text-emerald-400">${offeredCash} / ${currentPlayer.money}</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={currentPlayer.money}
                  step={10}
                  value={offeredCash}
                  onChange={(e) => setOfferedCash(parseInt(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              {/* Select Properties */}
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Select Properties:</span>
                {myProperties.length === 0 ? (
                  <span className="text-xs text-slate-600 italic">You own no properties</span>
                ) : (
                  <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                    {myProperties.map(t => (
                      <label
                        key={t.id}
                        className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer border transition ${
                          offeredTileIds.includes(t.id)
                            ? 'bg-emerald-950/40 border-emerald-500/60 text-white'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={offeredTileIds.includes(t.id)}
                            onChange={() => handleToggleOfferTile(t.id)}
                            className="rounded accent-emerald-500"
                          />
                          <span>{t.name}</span>
                        </div>
                        <span className="font-bold text-slate-400">${t.price}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: You Request */}
            <div className="bg-[#0b0e1e] p-4 rounded-2xl border border-slate-800 flex flex-col gap-3">
              <span className="text-xs font-black text-rose-400 uppercase tracking-wider">
                You Request from {partner?.name || 'Partner'}:
              </span>

              {/* Cash Input */}
              <div>
                <label className="text-[11px] text-slate-400 flex justify-between mb-1">
                  <span>Cash:</span>
                  <span className="font-bold text-rose-400">${requestedCash} / ${partner?.money || 0}</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={partner?.money || 0}
                  step={10}
                  value={requestedCash}
                  onChange={(e) => setRequestedCash(parseInt(e.target.value))}
                  className="w-full accent-rose-500"
                />
              </div>

              {/* Partner Properties */}
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Select Properties:</span>
                {partnerProperties.length === 0 ? (
                  <span className="text-xs text-slate-600 italic">Partner owns no properties</span>
                ) : (
                  <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                    {partnerProperties.map(t => (
                      <label
                        key={t.id}
                        className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer border transition ${
                          requestedTileIds.includes(t.id)
                            ? 'bg-rose-950/40 border-rose-500/60 text-white'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={requestedTileIds.includes(t.id)}
                            onChange={() => handleToggleRequestTile(t.id)}
                            className="rounded accent-rose-500"
                          />
                          <span>{t.name}</span>
                        </div>
                        <span className="font-bold text-slate-400">${t.price}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#11152a] border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSendProposal}
            disabled={!selectedPartnerId || (offeredCash === 0 && offeredTileIds.length === 0 && requestedCash === 0 && requestedTileIds.length === 0)}
            className="px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 text-white shadow-neon transition active:scale-95 disabled:opacity-40"
          >
            Send Trade Proposal
          </button>
        </div>
      </div>
    </div>
  );
};
