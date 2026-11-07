import React, { useState, useEffect, useRef } from 'react';
import { PublicGameState, PlayerDTO, BoardTileDTO, GameEventPopup } from '../types';
import { BoardGrid } from '../components/board/BoardGrid';
import { PlayerList } from '../components/players/PlayerList';
import { EventPopupModal } from '../components/modals/EventPopupModal';
import { PropertyDeedModal } from '../components/modals/PropertyDeedModal';
import { WinnerModal } from '../components/modals/WinnerModal';
import { TradeModal } from '../components/modals/TradeModal';
import { AuctionModal } from '../components/modals/AuctionModal';
import { soundFX } from '../utils/audio';
import { Sliders, Volume2, VolumeX, LogOut, Building2, ChevronUp, ChevronDown, ArrowUpCircle, Lock, Unlock, DollarSign, Skull } from 'lucide-react';

interface GamePageProps {
  state: PublicGameState;
  currentPlayer: PlayerDTO | null;
  onRollDice: () => void;
  onBuyProperty: () => void;
  onSkipPurchase: () => void;
  onUpgradeProperty: (tileId: string) => void;
  onEndTurn: () => void;
  onOpenEditor: () => void;
  onLeaveGame: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onPlaceBid: (bidAmount: number) => void;
  onProposeTrade: (
    toPlayerId: string,
    offeredMoney: number,
    offeredTileIds: string[],
    requestedMoney: number,
    requestedTileIds: string[]
  ) => void;
  onRespondTrade: (accept: boolean) => void;
  onCancelTrade: () => void;
  onMortgageProperty: (tileId: string) => void;
  onUnmortgageProperty: (tileId: string) => void;
  onSellProperty?: (tileId: string) => void;
  onDeclareBankruptcy: () => void;
}

export const GamePage: React.FC<GamePageProps> = ({
  state,
  currentPlayer,
  onRollDice,
  onBuyProperty,
  onSkipPurchase,
  onUpgradeProperty,
  onEndTurn,
  onOpenEditor,
  onLeaveGame,
  soundEnabled,
  onToggleSound,
  onPlaceBid,
  onProposeTrade,
  onRespondTrade,
  onCancelTrade,
  onMortgageProperty,
  onUnmortgageProperty,
  onSellProperty,
  onDeclareBankruptcy,
}) => {
  // Selected tile for property deed inspection
  const [inspectedTile, setInspectedTile] = useState<BoardTileDTO | null>(null);

  // Trade Modal Open state
  const [isTradeModalOpen, setIsTradeModalOpen] = useState<boolean>(false);

  // My Properties Dashboard expanded state
  const [isDashboardOpen, setIsDashboardOpen] = useState<boolean>(false);

  // Pawn Step-by-Step Moving Animation State
  const [displayedPositions, setDisplayedPositions] = useState<Record<string, number>>({});
  const [isPawnMoving, setIsPawnMoving] = useState<boolean>(false);
  const [hoppingPlayerId, setHoppingPlayerId] = useState<string | null>(null);
  const [visiblePopup, setVisiblePopup] = useState<GameEventPopup | null>(null);

  const prevPositionsRef = useRef<Record<string, number>>({});

  // Real-time synchronization: derive current user snapshot from state.players so cash is never stale
  const me = currentPlayer
    ? state.players.find(p => p.id === currentPlayer.id || (currentPlayer.sessionId && p.sessionId === currentPlayer.sessionId)) || currentPlayer
    : null;
  const isHost = me?.isHost || false;
  const isMyTurn = me?.id === state.activePlayerId;

  // My owned properties
  const myProperties = me
    ? state.boardTiles.filter(t => t.ownerId === me.id && t.type === 'PROPERTY')
    : [];

  // Initialize or track player movements
  useEffect(() => {
    const totalTiles = state.boardTiles.length || 48;
    const activePlayer = state.players.find(p => p.id === state.activePlayerId);

    // Initial load: populate displayedPositions
    if (Object.keys(prevPositionsRef.current).length === 0) {
      const initPositions: Record<string, number> = {};
      state.players.forEach(p => {
        initPositions[p.id] = p.position;
      });
      prevPositionsRef.current = initPositions;
      setDisplayedPositions(initPositions);
      setVisiblePopup(state.activePopup || null);
      return;
    }

    // Check if active player moved
    if (activePlayer) {
      const oldPos = prevPositionsRef.current[activePlayer.id] ?? activePlayer.position;
      const targetPos = activePlayer.position;

      if (oldPos !== targetPos) {
        let steps = (targetPos - oldPos + totalTiles) % totalTiles;
        if (steps === 0 && targetPos !== oldPos) steps = totalTiles;

        setIsPawnMoving(true);
        setHoppingPlayerId(activePlayer.id);
        setVisiblePopup(null);

        let currentStep = 0;
        let currentPos = oldPos;

        // Auto-release safety timeout so the game can never get stuck on hopping animation
        const safetyTimer = setTimeout(() => {
          setIsPawnMoving(false);
          setHoppingPlayerId(null);
          prevPositionsRef.current[activePlayer.id] = targetPos;
          setVisiblePopup(state.activePopup || null);
        }, 2500);

        const timer = setInterval(() => {
          currentStep++;
          currentPos = (currentPos + 1) % totalTiles;
          soundFX.playStep();

          setDisplayedPositions(prev => ({
            ...prev,
            [activePlayer.id]: currentPos
          }));

          if (currentStep >= steps || currentPos === targetPos) {
            clearInterval(timer);
            clearTimeout(safetyTimer);
            prevPositionsRef.current[activePlayer.id] = targetPos;
            setIsPawnMoving(false);
            setHoppingPlayerId(null);
            setVisiblePopup(state.activePopup || null);
          }
        }, 340);

        return () => {
          clearInterval(timer);
          clearTimeout(safetyTimer);
          setIsPawnMoving(false);
          setHoppingPlayerId(null);
        };
      } else {
        setIsPawnMoving(false);
        setHoppingPlayerId(null);
        setVisiblePopup(state.activePopup || null);
      }
    } else {
      setIsPawnMoving(false);
      setHoppingPlayerId(null);
      setVisiblePopup(state.activePopup || null);
    }
  }, [state.players, state.activePlayerId, state.activePopup, state.boardTiles.length]);

  const handleTileClick = (tile: BoardTileDTO) => {
    soundFX.playClick();
    setInspectedTile(tile);
  };

  const handlePopupAction = (action: string) => {
    if (action === 'BUY') {
      onBuyProperty();
    } else if (action === 'SKIP') {
      onSkipPurchase();
    }
  };

  const inspectedTileOwner = inspectedTile?.ownerId 
    ? state.players.find(p => p.id === inspectedTile.ownerId) || null 
    : null;

  const upgradeLabels = ['', '🏠 1 House', '🏠🏠 2 Houses', '🏨 Hotel'];

  return (
    <div className="h-screen w-screen max-w-full overflow-hidden bg-[#070914] text-slate-100 flex flex-col p-1 sm:p-2.5 select-none">
      {/* Top Navbar */}
      <header className="flex items-center justify-between px-2.5 py-1 sm:px-3 sm:py-1.5 bg-[#0e1224] border border-[#1f2747] rounded-xl shadow-md shrink-0 mb-1">
        <div className="flex items-center gap-2">
          <span className="font-black text-xs sm:text-sm tracking-wider text-white">
            POLYRICH
          </span>
          <span className="text-[9px] bg-indigo-600/30 text-indigo-300 font-bold px-1.5 py-0.2 rounded border border-indigo-500/40">
            {state.boardTiles.length} TILES
          </span>
          <span className="text-[10px] text-slate-400 border-l border-slate-800 pl-2 ml-1">
            Room: <span className="font-mono font-bold text-amber-400">{state.roomCode}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {isHost && (
            <button
              onClick={onOpenEditor}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 hover:bg-indigo-600/50 transition"
              title="Open Board & Game Editor"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Editor</span>
            </button>
          )}

          {onDeclareBankruptcy && (
            <button
              onClick={onDeclareBankruptcy}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 border border-rose-800/40 transition"
              title="Declare Bankruptcy"
            >
              <Skull className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bankrupt</span>
            </button>
          )}

          <button
            onClick={onToggleSound}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          <button
            onClick={onLeaveGame}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
            title="Leave Game"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Game Content Area - Flexible Viewport Fitting */}
      <div className="flex-1 flex flex-col gap-1 max-w-[1200px] w-full mx-auto min-h-0 overflow-y-auto sm:overflow-hidden">
        {/* Compact Players Panel */}
        <PlayerList
          players={state.players}
          activePlayerId={state.activePlayerId}
          currentPlayerId={me?.id}
        />

        {/* Board Display - Full view on laptop as well as mobile */}
        <div className="flex-1 flex items-center justify-center min-h-0 py-0.5 overflow-hidden">
          <BoardGrid
            state={state}
            currentPlayer={me}
            onRollDice={onRollDice}
            onBuyProperty={onBuyProperty}
            onSkipPurchase={onSkipPurchase}
            onEndTurn={onEndTurn}
            onTileClick={handleTileClick}
            soundEnabled={soundEnabled}
            onToggleSound={onToggleSound}
            displayedPositions={displayedPositions}
            hoppingPlayerId={hoppingPlayerId}
            isPawnMoving={isPawnMoving}
            onOpenTrade={() => setIsTradeModalOpen(true)}
            onDeclareBankruptcy={onDeclareBankruptcy}
          />
        </div>

        {/* ── MY PROPERTIES DASHBOARD (slide-up drawer) ── */}
        <div className={`w-full bg-[#0d1021]/95 border border-[#232b4b] rounded-xl shadow-2xl overflow-hidden transition-all duration-300 shrink-0 ${isDashboardOpen ? 'max-h-52 sm:max-h-64' : 'max-h-9 sm:max-h-10'}`}>
          {/* Dashboard Header / Toggle */}
          <button
            onClick={() => { soundFX.playClick(); setIsDashboardOpen(prev => !prev); }}
            className="w-full flex items-center justify-between px-3 py-1.5 sm:py-2 text-left hover:bg-slate-800/40 transition"
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
              <span className="text-[10px] sm:text-xs font-bold text-slate-200">
                My Properties
              </span>
              {myProperties.length > 0 && (
                <span className="text-[9px] bg-indigo-600/40 text-indigo-300 font-bold px-1.5 py-0.5 rounded-full border border-indigo-500/40">
                  {myProperties.length}
                </span>
              )}
              {/* Cash display */}
              {me && (
                <span className="flex items-center gap-0.5 text-[9px] sm:text-[10px] text-emerald-400 font-bold ml-1">
                  <DollarSign className="w-2.5 h-2.5" />
                  {me.money}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {myProperties.length === 0 && !isDashboardOpen && (
                <span className="text-[9px] text-slate-500 italic">No properties yet</span>
              )}
              {isDashboardOpen 
                ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                : <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              }
            </div>
          </button>

          {/* Dashboard Body */}
          {isDashboardOpen && (
            <div className="overflow-x-auto overflow-y-hidden border-t border-slate-800/60">
              {myProperties.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-[10px] sm:text-xs text-slate-500 italic">
                  You don't own any properties yet. Land on a space and buy it!
                </div>
              ) : (
                <div className="flex items-stretch gap-2 p-2" style={{ minWidth: 'max-content' }}>
                  {myProperties.map(tile => {
                    const upgradeLevel = tile.upgradeLevel ?? 0;
                    // Check if player owns all properties of this color category
                    const colorGroupTiles = state.boardTiles.filter(t => t.type === 'PROPERTY' && t.colorGroup === tile.colorGroup);
                    const ownsEntireColorGroup = colorGroupTiles.length > 0 && colorGroupTiles.every(t => t.ownerId === me?.id);
                    const hasMortgagedInGroup = colorGroupTiles.some(t => t.isMortgaged);
                    const canUpgrade = ownsEntireColorGroup && !hasMortgagedInGroup && !tile.isMortgaged && upgradeLevel < 3 && me && me.money >= (tile.upgradeCost || 100);
                    const canMortgage = !tile.isMortgaged && upgradeLevel === 0;
                    const unmortgageCost = Math.round(tile.price * 0.55);
                    const canUnmortgage = tile.isMortgaged && me && me.money >= unmortgageCost;
                    const canSell = upgradeLevel === 0;
                    const sellCash = tile.isMortgaged ? Math.round(tile.price * 0.25) : tile.price;

                    return (
                      <div
                        key={tile.id}
                        className={`flex flex-col rounded-xl border overflow-hidden shrink-0 w-28 sm:w-32 ${
                          tile.isMortgaged ? 'opacity-50 border-slate-700' : 'border-slate-700/80'
                        }`}
                        style={{ backgroundColor: '#13172c' }}
                      >
                        {/* Color band */}
                        <div
                          className="h-2 w-full shrink-0"
                          style={{ backgroundColor: tile.colorGroup ?? '#6366f1' }}
                        />

                        {/* Tile image / icon */}
                        <div className="h-10 sm:h-12 w-full flex items-center justify-center bg-slate-900/50 overflow-hidden">
                          {tile.imageUrl ? (
                            <img src={tile.imageUrl} alt={tile.name} className="w-full h-full object-cover" />
                          ) : (
                            <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="px-1.5 pt-1 pb-0.5 flex flex-col gap-0.5 flex-1">
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-200 truncate">{tile.name}</span>
                          <div className="flex items-center justify-between text-[8px] sm:text-[9px] text-slate-400">
                            <span>{tile.isMortgaged ? '🔒 Mortgaged' : upgradeLevel > 0 ? upgradeLabels[upgradeLevel] : 'No dev'}</span>
                            <span className="text-emerald-400 font-bold">${tile.baseRent}</span>
                          </div>
                          {!tile.isMortgaged && upgradeLevel > 0 && (
                            <span className="text-[7px] sm:text-[8px] text-amber-400">Rent: ${
                              upgradeLevel === 1 ? tile.rentLevel1 : upgradeLevel === 2 ? tile.rentLevel2 : tile.rentLevel3
                            }</span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-0.5 px-1 pb-1 pt-0.5">
                          {canUpgrade && (
                            <button
                              onClick={(e: React.MouseEvent) => { e.stopPropagation(); onUpgradeProperty(tile.id); }}
                              className="flex-1 flex items-center justify-center gap-0.5 py-1 rounded-lg text-[8px] sm:text-[9px] font-bold bg-amber-600/30 hover:bg-amber-600/60 text-amber-300 border border-amber-600/40 transition active:scale-95"
                              title={`Upgrade for $${tile.upgradeCost}`}
                            >
                              <ArrowUpCircle className="w-2.5 h-2.5 shrink-0" />
                              Dev ${tile.upgradeCost}
                            </button>
                          )}
                          {canMortgage && (
                            <button
                              onClick={(e: React.MouseEvent) => { e.stopPropagation(); onMortgageProperty(tile.id); }}
                              className="flex-1 flex items-center justify-center gap-0.5 py-1 rounded-lg text-[8px] sm:text-[9px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600/40 transition active:scale-95"
                              title={`Mortgage for $${Math.round(tile.price * 0.5)}`}
                            >
                              <Lock className="w-2.5 h-2.5 shrink-0" />
                              Mtg
                            </button>
                          )}
                          {canUnmortgage && (
                            <button
                              onClick={(e: React.MouseEvent) => { e.stopPropagation(); onUnmortgageProperty(tile.id); }}
                              className="flex-1 flex items-center justify-center gap-0.5 py-1 rounded-lg text-[8px] sm:text-[9px] font-bold bg-emerald-700/40 hover:bg-emerald-700/70 text-emerald-300 border border-emerald-600/40 transition active:scale-95"
                              title={`Unmortgage for $${unmortgageCost}`}
                            >
                              <Unlock className="w-2.5 h-2.5 shrink-0" />
                              Unmtg
                            </button>
                          )}
                          {canSell && onSellProperty && (
                            <button
                              onClick={(e: React.MouseEvent) => { e.stopPropagation(); onSellProperty(tile.id); }}
                              className="flex-1 flex items-center justify-center py-1 rounded-lg text-[8px] font-bold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 transition active:scale-95"
                              title={`Sell back to bank for +$${sellCash} cash`}
                            >
                              Sell +${sellCash}
                            </button>
                          )}
                          {!canUpgrade && !canMortgage && !canUnmortgage && !canSell && (
                            <button
                              onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleTileClick(tile); }}
                              className="flex-1 flex items-center justify-center py-1 rounded-lg text-[8px] font-medium bg-slate-900/60 text-slate-500 border border-slate-800 transition"
                            >
                              View Deed
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Event Popup Modal (Landing triggers: Rewards, Punishments, Property Buy, Taxes) */}
      <EventPopupModal
        popup={visiblePopup}
        onAction={handlePopupAction}
        onClose={onEndTurn}
        isMyTurn={isMyTurn}
      />

      {/* Property Deed Inspection Modal with Mortgage & Development */}
      <PropertyDeedModal
        tile={inspectedTile}
        owner={inspectedTileOwner}
        currentPlayer={me}
        allTiles={state.boardTiles}
        onUpgrade={(tileId: string) => {
          onUpgradeProperty(tileId);
          setInspectedTile(null);
        }}
        onMortgage={(tileId: string) => {
          onMortgageProperty(tileId);
          setInspectedTile(null);
        }}
        onUnmortgage={(tileId: string) => {
          onUnmortgageProperty(tileId);
          setInspectedTile(null);
        }}
        onSell={(tileId: string) => {
          onSellProperty?.(tileId);
          setInspectedTile(null);
        }}
        onClose={() => setInspectedTile(null)}
      />

      {/* Live Auction Modal (RichUp.io feature) */}
      <AuctionModal
        auction={state.activeAuction || null}
        currentPlayer={currentPlayer}
        boardTiles={state.boardTiles}
        onPlaceBid={onPlaceBid}
      />

      {/* Player-to-Player Trading Modal (RichUp.io feature) */}
      {currentPlayer && (
        <TradeModal
          isOpen={isTradeModalOpen}
          onClose={() => setIsTradeModalOpen(false)}
          currentPlayer={currentPlayer}
          allPlayers={state.players}
          boardTiles={state.boardTiles}
          activeTrade={state.activeTrade || null}
          onProposeTrade={onProposeTrade}
          onRespondTrade={onRespondTrade}
          onCancelTrade={onCancelTrade}
        />
      )}

      {/* Winner Victory Modal */}
      {state.status === 'FINISHED' && (
        <WinnerModal
          winner={state.winner}
          players={state.players}
          onPlayAgain={onLeaveGame}
        />
      )}
    </div>
  );
};
