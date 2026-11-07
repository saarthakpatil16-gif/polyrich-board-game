import React from 'react';
import { GameEventPopup } from '../../types';
import { Gift, AlertTriangle, Building, Coins, ShieldAlert, ArrowRight } from 'lucide-react';

interface EventPopupModalProps {
  popup: GameEventPopup | null;
  onAction: (action: string) => void;
  onClose: () => void;
  isMyTurn: boolean;
}

export const EventPopupModal: React.FC<EventPopupModalProps> = ({
  popup,
  onAction,
  onClose,
  isMyTurn
}) => {
  if (!popup) return null;

  const getHeaderIcon = () => {
    switch (popup.type) {
      case 'REWARD': return <Gift className="w-6 h-6 text-emerald-400" />;
      case 'PUNISHMENT': return <AlertTriangle className="w-6 h-6 text-rose-400" />;
      case 'PROPERTY': return <Building className="w-6 h-6 text-indigo-400" />;
      case 'RENT': return <Coins className="w-6 h-6 text-amber-400" />;
      case 'JAIL': return <ShieldAlert className="w-6 h-6 text-red-500" />;
      default: return <Coins className="w-6 h-6 text-cyan-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#12162b] border border-[#2b355c] rounded-2xl shadow-2xl p-5 flex flex-col items-center text-center relative overflow-hidden">
        {/* Glow accent */}
        <div 
          className={`absolute -top-12 -left-12 w-28 h-28 rounded-full blur-2xl opacity-30 ${
            popup.type === 'REWARD' ? 'bg-emerald-500' : popup.type === 'PUNISHMENT' ? 'bg-rose-500' : 'bg-indigo-500'
          }`} 
        />

        {/* Optional Uploaded City Photo */}
        {popup.imageUrl && (
          <div className="w-full h-32 rounded-xl mb-3 overflow-hidden border border-slate-700/80 shadow-md">
            <img 
              src={popup.imageUrl} 
              alt={popup.title} 
              className="w-full h-full object-cover" 
            />
          </div>
        )}

        {/* Icon & Title */}
        <div className="p-2.5 rounded-full bg-slate-800/80 mb-2 border border-slate-700">
          {getHeaderIcon()}
        </div>

        <h3 className="text-base sm:text-lg font-bold text-white mb-1">
          {popup.title}
        </h3>

        {/* Amount Badge */}
        {popup.amount !== undefined && popup.amount !== 0 && (
          <div className={`text-base font-extrabold px-3 py-0.5 rounded-full mb-2 ${
            popup.amount > 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          }`}>
            {popup.amount > 0 ? `+₹${popup.amount}` : `-₹${Math.abs(popup.amount)}`}
          </div>
        )}

        {/* Description */}
        <p className="text-xs sm:text-sm text-slate-300 mb-5 leading-relaxed">
          {popup.description}
        </p>

        {/* Action Buttons */}
        {popup.options && popup.options.length > 0 && isMyTurn ? (
          <div className="flex items-center gap-2.5 w-full">
            {popup.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => onAction(opt.action)}
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 ${
                  opt.action === 'BUY'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white shadow-emerald-900/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 text-white shadow-lg transition active:scale-95"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
