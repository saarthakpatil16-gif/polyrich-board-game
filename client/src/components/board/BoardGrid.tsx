import React from 'react';
import { BoardTileDTO, PlayerDTO, PublicGameState } from '../../types';
import { TileView } from './TileView';
import { CenterPanel } from './CenterPanel';

interface BoardGridProps {
  state: PublicGameState;
  currentPlayer: PlayerDTO | null;
  onRollDice: () => void;
  onBuyProperty: () => void;
  onSkipPurchase: () => void;
  onEndTurn: () => void;
  onTileClick?: (tile: BoardTileDTO) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  displayedPositions: Record<string, number>;
  hoppingPlayerId: string | null;
  isPawnMoving: boolean;
  onOpenTrade?: () => void;
  onDeclareBankruptcy?: () => void;
}

export const BoardGrid: React.FC<BoardGridProps> = ({
  state,
  currentPlayer,
  onRollDice,
  onBuyProperty,
  onSkipPurchase,
  onEndTurn,
  onTileClick,
  soundEnabled,
  onToggleSound,
  displayedPositions,
  hoppingPlayerId,
  isPawnMoving,
  onOpenTrade,
  onDeclareBankruptcy
}) => {
  const { boardTiles, players, activePlayerId } = state;
  const totalTiles = boardTiles.length;
  const sideLength = Math.max(4, Math.floor(totalTiles / 4)); // 12 for 48 tiles
  const gridSize = sideLength + 1; // 13x13 grid for 48 tiles

  /**
   * Determine grid column and row for any tile index in square perimeter
   */
  const getTileGridPosition = (index: number) => {
    // Side 0: Bottom edge (starts at bottom-right corner 0, moves left)
    if (index === 0) {
      return { col: gridSize, row: gridSize, side: 'bottom' as const, isCorner: true };
    }
    if (index < sideLength) {
      const offset = index;
      return { col: gridSize - offset, row: gridSize, side: 'bottom' as const, isCorner: false };
    }

    // Side 1: Left edge (starts at bottom-left corner index 12, moves up)
    if (index === sideLength) {
      return { col: 1, row: gridSize, side: 'left' as const, isCorner: true };
    }
    if (index < sideLength * 2) {
      const offset = index - sideLength;
      return { col: 1, row: gridSize - offset, side: 'left' as const, isCorner: false };
    }

    // Side 2: Top edge (starts at top-left corner index 24, moves right)
    if (index === sideLength * 2) {
      return { col: 1, row: 1, side: 'top' as const, isCorner: true };
    }
    if (index < sideLength * 3) {
      const offset = index - sideLength * 2;
      return { col: 1 + offset, row: 1, side: 'top' as const, isCorner: false };
    }

    // Side 3: Right edge (starts at top-right corner index 36, moves down)
    if (index === sideLength * 3) {
      return { col: gridSize, row: 1, side: 'right' as const, isCorner: true };
    }
    if (index < totalTiles) {
      const offset = index - sideLength * 3;
      return { col: gridSize, row: 1 + offset, side: 'right' as const, isCorner: false };
    }

    return { col: 1, row: 1, side: 'bottom' as const, isCorner: false };
  };

  return (
    <div className="relative w-full max-w-[min(99vw,calc(100vh-100px))] aspect-square mx-auto p-1 sm:p-2 bg-[#0a0d1a] rounded-xl sm:rounded-2xl border-2 border-[#1e2645] shadow-2xl overflow-hidden select-none">
      {/* 13x13 CSS Grid Board */}
      <div 
        className="grid w-full h-full gap-0.5 sm:gap-1"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
        }}
      >
        {/* Render all perimeter tiles */}
        {boardTiles.map((tile) => {
          const pos = getTileGridPosition(tile.index);
          // Use displayedPositions during pawn step-by-step movement
          const playersOnTile = players.filter(p => {
            const currentTilePos = displayedPositions[p.id] !== undefined ? displayedPositions[p.id] : p.position;
            return currentTilePos === tile.index && !p.isBankrupt;
          });
          const owner = tile.ownerId ? players.find(p => p.id === tile.ownerId) : null;

          return (
            <div
              key={tile.id}
              style={{
                gridColumnStart: pos.col,
                gridRowStart: pos.row,
              }}
              className="w-full h-full"
            >
              <TileView
                tile={tile}
                side={pos.side}
                isCorner={pos.isCorner}
                playersOnTile={playersOnTile}
                activePlayerId={activePlayerId}
                owner={owner}
                onTileClick={onTileClick}
                hoppingPlayerId={hoppingPlayerId}
              />
            </div>
          );
        })}

        {/* Center Panel (spanning internal 11x11 area) */}
        <div
          style={{
            gridColumnStart: 2,
            gridColumnEnd: gridSize,
            gridRowStart: 2,
            gridRowEnd: gridSize,
          }}
          className="w-full h-full p-1 sm:p-3 z-10"
        >
          <CenterPanel
            state={state}
            currentPlayer={currentPlayer}
            onRollDice={onRollDice}
            onBuyProperty={onBuyProperty}
            onSkipPurchase={onSkipPurchase}
            onEndTurn={onEndTurn}
            soundEnabled={soundEnabled}
            onToggleSound={onToggleSound}
            isPawnMoving={isPawnMoving}
            onOpenTrade={onOpenTrade}
            onDeclareBankruptcy={onDeclareBankruptcy}
          />
        </div>
      </div>
    </div>
  );
};
