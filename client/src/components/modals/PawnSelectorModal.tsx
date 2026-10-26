import React, { useState } from 'react';
import { PlayerDTO, PawnShape } from '../../types';
import { PAWN_SHAPES, resolvePawnShape, RichupPawn } from '../../utils/pawnShapes';
import { soundFX } from '../../utils/audio';
import { Check, X, Palette, Sparkles } from 'lucide-react';

interface PawnSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlayer: PlayerDTO;
  onSave: (avatar: PawnShape, color: string) => void;
}

const COLOR_OPTIONS = [
  { hex: '#6366f1', label: 'Indigo' },
  { hex: '#ef4444', label: 'Ruby' },
  { hex: '#10b981', label: 'Emerald' },
  { hex: '#f59e0b', label: 'Amber' },
  { hex: '#8b5cf6', label: 'Amethyst' },
  { hex: '#06b6d4', label: 'Cyan' },
  { hex: '#ec4899', label: 'Rose' },
  { hex: '#14b8a6', label: 'Teal' },
  { hex: '#f97316', label: 'Sunset' },
  { hex: '#3b82f6', label: 'Sapphire' }
];

export const PawnSelectorModal: React.FC<PawnSelectorModalProps> = ({
  isOpen,
  onClose,
  currentPlayer,
  onSave
}) => {
  const currentShape = resolvePawnShape(currentPlayer.avatar, currentPlayer.orderIndex);
  const [selectedShape, setSelectedShape] = useState<PawnShape>(currentShape);
  const [selectedColor, setSelectedColor] = useState<string>(currentPlayer.color || COLOR_OPTIONS[0].hex);

  if (!isOpen) return null;

  const handleApply = () => {
    soundFX.playCash();
    onSave(selectedShape, selectedColor);
    onClose();
  };

  const SelectedIcon = (PAWN_SHAPES.find(s => s.id === selectedShape) || PAWN_SHAPES[0]).icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in zoom-in-95 select-none">
      <div className="w-full max-w-md bg-[#11152a] border-2 border-indigo-500/80 rounded-3xl shadow-2xl p-6 flex flex-col gap-5 relative overflow-hidden">
        {/* Glow */}
        <div 
          className="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl pointer-events-none opacity-40 transition-colors"
          style={{ backgroundColor: selectedColor }}
        />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div 
              className="p-2 rounded-xl text-white shadow-md border border-white/30"
              style={{ backgroundColor: selectedColor }}
            >
              <SelectedIcon className="w-5 h-5 drop-shadow" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Customize Player Pawn
              </h3>
              <p className="text-xs text-slate-400">
                Choose your distinctive 3D game piece & board color
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pawn Preview Stage */}
        <div className="flex items-center justify-center p-4 rounded-2xl bg-[#090b16] border border-slate-800/90 gap-5">
          <div 
            className="flex items-center justify-center transition-transform scale-125"
          >
            <RichupPawn 
              color={selectedColor} 
              avatar={selectedShape} 
              size="lg" 
              defaultIndex={currentPlayer.orderIndex} 
            />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">
              3D Pawn Preview
            </span>
            <span className="text-sm font-bold text-white">
              {currentPlayer.name}
            </span>
            <span className="text-[11px] text-slate-400">
              Shape: {PAWN_SHAPES.find(s => s.id === selectedShape)?.label}
            </span>
          </div>
        </div>

        {/* 10 Distinct Pawn Shapes Grid */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-300">
            Select Pawn Shape (10 Options):
          </span>
          <div className="grid grid-cols-5 gap-2">
            {PAWN_SHAPES.map((shape) => {
              const Icon = shape.icon;
              const isSelected = selectedShape === shape.id;
              return (
                <button
                  key={shape.id}
                  onClick={() => {
                    soundFX.playClick();
                    setSelectedShape(shape.id);
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-md scale-105 ring-1 ring-indigo-400'
                      : 'bg-[#161c36] border-[#252f55] text-slate-400 hover:text-white hover:border-slate-600'
                  }`}
                  title={shape.label}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-[9px] font-bold truncate max-w-full">
                    {shape.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Distinct Player Colors */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-indigo-400" />
            Select Board Color:
          </span>
          <div className="flex flex-wrap gap-2.5 justify-center">
            {COLOR_OPTIONS.map((c) => {
              const isSelected = selectedColor === c.hex;
              return (
                <button
                  key={c.hex}
                  onClick={() => {
                    soundFX.playClick();
                    setSelectedColor(c.hex);
                  }}
                  className={`w-8 h-8 rounded-full border-2 transition-transform relative ${
                    isSelected ? 'scale-125 border-white shadow-lg ring-2 ring-indigo-400' : 'border-white/50 hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                >
                  {isSelected && (
                    <Check className="w-4 h-4 text-white drop-shadow mx-auto" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" /> Save Pawn
          </button>
        </div>
      </div>
    </div>
  );
};
