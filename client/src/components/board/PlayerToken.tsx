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
  // Compute non-overlapping offset within tile (compact circle tokens)
  const col = slotIndex % 3;
  const row = Math.floor(slotIndex / 3);

  const offsetX = (col - 1) * 6; // -6px, 0px, +6px
  const offsetY = (row - 0.5) * 5; // -2.5px, +2.5px

  return (
    <div
      className={`absolute transition-all duration-150 ease-out z-20 pointer-events-none ${
        isHopping ? 'animate-pawn-hop z-30' : ''
      }`}
      style={{
        transform: `translate(${offsetX}px, ${offsetY}px)`,
        left: '50%',
        top: '50%',
        marginLeft: '-7px',
        marginTop: '-7px',
        ['--pawn-x' as any]: `${offsetX}px`,
        ['--pawn-y' as any]: `${offsetY}px`,
      }}
      title={`${player.name} ($${player.money})`}
    >
      <div 
        className={`relative transition-transform ${
          isCurrentTurn && !isHopping ? 'scale-125 drop-shadow-[0_0_8px_rgba(250,204,21,0.9)]' : ''
        } ${isHopping ? 'scale-135 drop-shadow-[0_0_12px_rgba(255,255,255,0.95)] animate-bounce' : ''}`}
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
