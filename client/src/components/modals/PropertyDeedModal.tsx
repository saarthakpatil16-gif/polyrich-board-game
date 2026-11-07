import React from 'react';
import { BoardTileDTO, PlayerDTO } from '../../types';
import { X, ArrowUpCircle, Lock, Unlock, DollarSign } from 'lucide-react';

interface PropertyDeedModalProps {
  tile: BoardTileDTO | null;
  owner: PlayerDTO | null;
  currentPlayer: PlayerDTO | null;
  allTiles?: BoardTileDTO[];
  onUpgrade?: (tileId: string) => void;
  onMortgage?: (tileId: string) => void;
  onUnmortgage?: (tileId: string) => void;
  onSell?: (tileId: string) => void;
  onClose: () => void;
}

export const PropertyDeedModal: React.FC<PropertyDeedModalProps> = ({
  tile,
  owner,
  currentPlayer,
  allTiles = [],
  onUpgrade,
  onMortgage,
  onUnmortgage,
  onSell,
  onClose,
}) => {
  if (!tile) return null;

  const isOwner = currentPlayer && owner && currentPlayer.id === owner.id;
  
  // Rule: Must own all color category properties to build houses/hotels
  const groupTiles = allTiles.filter(t => t.type === 'PROPERTY' && t.colorGroup === tile.colorGroup);
  const ownsAllInGroup = groupTiles.length > 0 && groupTiles.every(t => t.ownerId === currentPlayer?.id);
  const anyMortgagedInGroup = groupTiles.some(t => t.isMortgaged);
  
  const canUpgrade = isOwner && ownsAllInGroup && !anyMortgagedInGroup && !tile.isMortgaged && (tile.upgradeLevel || 0) < 3 && ((currentPlayer?.money || 0) >= (tile.upgradeCost || 100));
  const canMortgage = isOwner && !tile.isMortgaged && (tile.upgradeLevel || 0) === 0;
  const unmortgageCost = Math.round(tile.price * 0.55);
  const canUnmortgage = isOwner && tile.isMortgaged && ((currentPlayer?.money || 0) >= unmortgageCost);
  const canSellProperty = isOwner && (tile.upgradeLevel || 0) === 0;
  const canSellUpgrade = isOwner && (tile.upgradeLevel || 0) > 0;
  const sellPropertyRefund = tile.isMortgaged ? Math.round(tile.price * 0.25) : tile.price;
  const sellUpgradeRefund = Math.round((tile.upgradeCost || 100) * 0.5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in select-none">
      <div className="w-full max-w-sm bg-[#12162b] border border-[#2b355c] rounded-2xl shadow-2xl overflow-hidden relative">
        {/* District Color Header */}
        <div 
          className="p-4 flex items-center justify-between text-white relative shadow-md"
          style={{ backgroundColor: tile.colorGroup || '#3b82f6' }}
        >
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-90">
              {tile.district || tile.type}
            </span>
            <h3 className="text-lg font-black leading-tight drop-shadow">
              {tile.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full bg-black/20 hover:bg-black/40 text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex flex-col gap-3">
          {/* Photograph if uploaded */}
          {tile.imageUrl && (
            <div className="w-full h-32 rounded-xl overflow-hidden border border-slate-700/80 shadow-inner">
              <img 
                src={tile.imageUrl} 
                alt={tile.name} 
                className={`w-full h-full ${tile.imageFit === 'contain' ? 'object-contain' : 'object-cover'}`} 
              />
            </div>
          )}

          {/* Description */}
          {tile.description && (
            <p className="text-xs text-slate-300 italic border-l-2 border-indigo-500 pl-2">
              "{tile.description}"
            </p>
          )}

          {/* Pricing & Rent Schedule */}
          {tile.type === 'PROPERTY' && (
            <div className="bg-[#0b0e1e] rounded-xl p-3 border border-slate-800 text-xs flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-slate-300 pb-1 border-b border-slate-800">
                <span>Purchase Price</span>
                <span className="font-bold text-emerald-400">₹{tile.price}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Base Rent</span>
                <span className="font-semibold text-slate-200">₹{tile.baseRent}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Tier 1 Upgrade Rent</span>
                <span className="font-semibold text-slate-200">₹{tile.rentLevel1 || Math.round(tile.baseRent * 2.5)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Tier 2 Upgrade Rent</span>
                <span className="font-semibold text-slate-200">₹{tile.rentLevel2 || Math.round(tile.baseRent * 5)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Tier 3 Upgrade Rent</span>
                <span className="font-semibold text-amber-400">₹{tile.rentLevel3 || Math.round(tile.baseRent * 10)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-slate-800">
                <span>Mortgage Value (Cash)</span>
                <span className="font-semibold text-emerald-400">+₹{Math.round(tile.price * 0.5)}</span>
              </div>
            </div>
          )}

          {/* Ownership Status */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
            <span className="text-slate-400">Owner:</span>
            {owner ? (
              <div className="flex items-center gap-1.5 font-bold text-white">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: owner.color }} 
                />
                <span>{owner.name}</span>
                {tile.isMortgaged ? (
                  <span className="text-[10px] text-rose-400 font-bold bg-rose-950/60 px-1 rounded border border-rose-800/40">
                    MORTGAGED
                  </span>
                ) : (tile.upgradeLevel || 0) > 0 ? (
                  <span className="text-[10px] text-amber-400 font-normal">
                    (Tier {tile.upgradeLevel})
                  </span>
                ) : null}
              </div>
            ) : (
              <span className="text-slate-500 font-semibold">Unowned</span>
            )}
          </div>

          {/* Action Buttons for Owner */}
          {isOwner && (
            <div className="flex flex-col gap-2">
              {/* Monopoly requirement guidance */}
              {!ownsAllInGroup && !tile.isMortgaged && (tile.upgradeLevel || 0) < 3 && (
                <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-800/40 text-[10px] text-amber-300/80">
                  ⚠️ Must own all {groupTiles.length} {tile.district || 'color group'} properties to develop houses or hotels.
                </div>
              )}

              {canUpgrade && onUpgrade && (
                <button
                  onClick={() => onUpgrade(tile.id)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-slate-950 shadow-gold transition active:scale-95"
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  Develop Property (₹{tile.upgradeCost})
                </button>
              )}

              {canSellUpgrade && onSell && (
                <button
                  onClick={() => onSell(tile.id)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-bold text-xs bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-700/50 transition active:scale-95"
                >
                  Sell 1 Upgrade for +₹{sellUpgradeRefund} Cash
                </button>
              )}

              {canMortgage && onMortgage && (
                <button
                  onClick={() => onMortgage(tile.id)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition active:scale-95"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Mortgage for +₹{Math.round(tile.price * 0.5)} Cash
                </button>
              )}

              {canUnmortgage && onUnmortgage && (
                <button
                  onClick={() => onUnmortgage(tile.id)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-bold text-xs bg-emerald-700 hover:bg-emerald-600 text-white transition active:scale-95"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Unmortgage (Pay ₹{unmortgageCost})
                </button>
              )}

              {canSellProperty && onSell && (
                <button
                  onClick={() => onSell(tile.id)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-bold text-xs bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/50 transition active:scale-95"
                >
                  Sell Property to Bank for +₹{sellPropertyRefund} Cash
                </button>
              )}
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Close Deed
          </button>
        </div>
      </div>
    </div>
  );
};
