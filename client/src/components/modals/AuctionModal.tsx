import React, { useState } from 'react';
import { AuctionState, PlayerDTO, BoardTileDTO } from '../../types';
import { soundFX } from '../../utils/audio';
import { Gavel, Clock, Flame, ArrowUp } from 'lucide-react';

interface AuctionModalProps {
  auction: AuctionState | null;
  currentPlayer: PlayerDTO | null;
  boardTiles: BoardTileDTO[];
  onPlaceBid: (bidAmount: number) => void;
}

export const AuctionModal: React.FC<AuctionModalProps> = ({
  auction,
  currentPlayer,
  boardTiles,
  onPlaceBid
}) => {
  const [customBid, setCustomBid] = useState<string>('');

  if (!auction || !auction.active) return null;

  const tile = boardTiles.find(t => t.id === auction.tileId);
  const myMoney = currentPlayer?.money || 0;
  const isHighestBidder = currentPlayer && auction.highestBidderId === currentPlayer.id;

  const handleQuickBid = (increment: number) => {
    const nextBid = auction.currentBid + increment;
    if (nextBid <= myMoney) {
      soundFX.playCash();
      onPlaceBid(nextBid);
    }
  };

  const handleCustomBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customBid);
    if (!isNaN(parsed) && parsed > auction.currentBid && parsed <= myMoney) {
      soundFX.playCash();
      onPlaceBid(parsed);
      setCustomBid('');
    }
  };

  // Timer percentage (15s base)
  const timerPct = Math.min(100, Math.max(0, (auction.timeRemainingSec / 15) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in zoom-in-95 select-none">
      <div className="w-full max-w-md bg-[#13172e] border-2 border-amber-500/60 rounded-3xl shadow-2xl p-5 sm:p-6 text-center flex flex-col gap-4 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Gavel className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                Live Property Auction
              </span>
              <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                {auction.tileName}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs font-bold text-amber-300">
            <Clock className="w-3.5 h-3.5" />
            <span>{auction.timeRemainingSec}s</span>
          </div>
        </div>

        {/* Timer Bar */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden -mt-2">
          <div 
            className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-1000 ease-linear"
            style={{ width: `${timerPct}%` }}
          />
        </div>

        {/* Property Preview & District */}
        {tile && (
          <div className="bg-[#0b0e1f] p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
            {tile.imageUrl ? (
              <div className="w-16 h-12 rounded-lg overflow-hidden border border-slate-700 shrink-0">
                <img src={tile.imageUrl} alt={tile.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-16 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold shrink-0">
                {tile.name.charAt(0)}
              </div>
            )}
            <div className="text-left min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Base Value: ${tile.price} • Rent: ${tile.baseRent}
              </span>
              <p className="text-xs text-slate-200 truncate font-semibold">
                {tile.district || 'Prime Real Estate'}
              </p>
            </div>
          </div>
        )}

        {/* Current Highest Bid Display */}
        <div className="bg-gradient-to-b from-[#181f3d] to-[#12162e] p-4 rounded-2xl border border-indigo-500/30 flex flex-col items-center">
          <span className="text-xs text-slate-400 uppercase font-semibold">Current Highest Bid</span>
          <span className="text-3xl sm:text-4xl font-black text-amber-400 my-1 drop-shadow">
            ₹{auction.currentBid}
          </span>
          <span className="text-xs text-slate-300 font-medium">
            {auction.highestBidderName ? (
              <span className="text-white font-bold">
                Bid by <span className="text-indigo-400">{auction.highestBidderName}</span>
                {isHighestBidder && <span className="text-emerald-400 font-black ml-1">(YOU!)</span>}
              </span>
            ) : (
              <span className="text-slate-500 italic">No bids yet (Opening Bid)</span>
            )}
          </span>
        </div>

        {/* Quick Bid Increment Buttons */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] text-slate-400 font-semibold text-left">
            Quick Bid (Your Balance: <span className="text-emerald-400 font-bold">₹{myMoney}</span>)
          </span>

          <div className="grid grid-cols-3 gap-2">
            {[10, 50, 100].map(inc => {
              const target = auction.currentBid + inc;
              const affordable = target <= myMoney;

              return (
                <button
                  key={inc}
                  onClick={() => handleQuickBid(inc)}
                  disabled={!affordable}
                  className={`py-2.5 px-3 rounded-xl font-black text-xs transition active:scale-95 flex items-center justify-center gap-1 shadow-md ${
                    affordable
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-slate-950 shadow-gold'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                  }`}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  +₹{inc} (₹{target})
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Bid Input */}
        <form onSubmit={handleCustomBidSubmit} className="flex gap-2">
          <input
            type="number"
            min={auction.currentBid + 1}
            max={myMoney}
            value={customBid}
            onChange={(e) => setCustomBid(e.target.value)}
            placeholder={`Enter bid > ₹${auction.currentBid}...`}
            className="flex-1 bg-[#090b16] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            disabled={!customBid || parseInt(customBid) <= auction.currentBid || parseInt(customBid) > myMoney}
            className="px-4 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition active:scale-95"
          >
            Bid
          </button>
        </form>
      </div>
    </div>
  );
};
