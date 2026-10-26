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
import { Sliders, Volume2, VolumeX, LogOut } from 'lucide-react';

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
  onDeclareBankruptcy,
}) => {
  // Selected tile for property deed inspection
  const [inspectedTile, setInspectedTile] = useState<BoardTileDTO | null>(null);

  // Trade Modal Open state
  const [isTradeModalOpen, setIsTradeModalOpen] = useState<boolean>(false);

  // Pawn Step-by-Step Moving Animation State
  const [displayedPositions, setDisplayedPositions] = useState<Record<string, number>>({});
  const [isPawnMoving, setIsPawnMoving] = useState<boolean>(false);
  const [hoppingPlayerId, setHoppingPlayerId] = useState<string | null>(null);
  const [visiblePopup, setVisiblePopup] = useState<GameEventPopup | null>(null);

  const prevPositionsRef = useRef<Record<string, number>>({});
  const isHost = currentPlayer?.isHost || false;
  const isMyTurn = currentPlayer?.id === state.activePlayerId;

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
            prevPositionsRef.current[activePlayer.id] = targetPos;
            setIsPawnMoving(false);
            setHoppingPlayerId(null);
            setVisiblePopup(state.activePopup || null);
          }
        }, 180);

        return () => clearInterval(timer);
      } else {
        setVisiblePopup(state.activePopup || null);
      }
    } else {
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
      <div className="flex-1 flex flex-col justify-between gap-1 max-w-[1200px] w-full mx-auto min-h-0 overflow-hidden">
        {/* Compact Players Panel */}
        <PlayerList
          players={state.players}
          activePlayerId={state.activePlayerId}
          currentPlayerId={currentPlayer?.id}
        />

        {/* Board Display - Full view on laptop as well as mobile */}
        <div className="flex-1 flex items-center justify-center min-h-0 py-0.5 overflow-hidden">
          <BoardGrid
            state={state}
            currentPlayer={currentPlayer}
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
        currentPlayer={currentPlayer}
        onUpgrade={(tileId) => {
          onUpgradeProperty(tileId);
          setInspectedTile(null);
        }}
        onMortgage={(tileId) => {
          onMortgageProperty(tileId);
          setInspectedTile(null);
        }}
        onUnmortgage={(tileId) => {
          onUnmortgageProperty(tileId);
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
