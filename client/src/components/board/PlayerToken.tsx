import React from 'react';
import { PlayerDTO } from '../../types';
import { RichupPawn } from '../../utils/pawnShapes';

interface PlayerTokenProps {
  player: PlayerDTO;
  slotIndex: number;
  totalTokensOnTile: number;
  isCurrentTurn: boolean;
  isHopping?: boolean;
}

export const PlayerToken: React.FC<PlayerTokenProps> = ({
  player,
  slotIndex,
  isCurrentTurn,
  isHopping
}) => {
  // Compute non-overlapping offset within tile (up to 6 distinct slots)
  // Grid of 3 columns x 2 rows inside token container
  const col = slotIndex % 3;
  const row = Math.floor(slotIndex / 3);

  const offsetX = (col - 1) * 7; // -7px, 0px, +7px
  const offsetY = (row - 0.5) * 6; // -3px, +3px

  return (
    <div
      className={`absolute transition-all duration-150 ease-out z-20 pointer-events-none ${
        isHopping ? 'animate-pawn-hop z-30' : ''
      }`}
      style={{
        transform: `translate(${offsetX}px, ${offsetY}px)`,
        left: '50%',
        top: '50%',
        marginLeft: '-9px',
        marginTop: '-14px',
        ['--pawn-x' as any]: `${offsetX}px`,
        ['--pawn-y' as any]: `${offsetY}px`,
      }}
      title={`${player.name} ($${player.money})`}
    >
      <div 
        className={`relative transition-transform ${
          isCurrentTurn && !isHopping ? 'scale-110 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]' : ''
        } ${isHopping ? 'scale-125 drop-shadow-[0_0_12px_rgba(255,255,255,0.9)] animate-bounce' : ''}`}
      >
        <RichupPawn 
          color={player.color} 
          avatar={player.avatar} 
          size="sm" 
          defaultIndex={player.orderIndex} 
        />
      </div>
    </div>
  );
};
