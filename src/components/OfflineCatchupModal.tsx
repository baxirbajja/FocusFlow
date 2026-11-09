import React, { useState } from 'react';
import { Clock, Briefcase, Coffee, Check, X, Sliders, Moon } from 'lucide-react';
import { Task } from '../types';
import { formatMinutes } from '../utils/storage';

export interface OfflineCatchupData {
  elapsedSeconds: number;
  lastBeatTime: string;
  nowTime: string;
  activeTask: Task | null;
}

interface OfflineCatchupModalProps {
  data: OfflineCatchupData | null;
  isOpen: boolean;
  onApply: (appliedSeconds: number, target: 'work' | 'rest' | 'discard') => void;
  onClose: () => void;
}

export const OfflineCatchupModal: React.FC<OfflineCatchupModalProps> = ({
  data,
  isOpen,
  onApply,
  onClose,
}) => {
  if (!isOpen || !data) return null;

  const totalMinutes = Math.max(1, Math.round(data.elapsedSeconds / 60));
  const [customMinutes, setCustomMinutes] = useState<number>(totalMinutes);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  const isWork = !!data.activeTask;

  const handleApplyFull = () => {
    onApply(data.elapsedSeconds, isWork ? 'work' : 'rest');
  };

  const handleApplyCustom = () => {
    const secs = Math.max(0, customMinutes * 60);
    onApply(secs, isWork ? 'work' : 'rest');
  };

  const handleDiscard = () => {
    onApply(0, 'discard');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-md p-5 shadow-2xl flex flex-col space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Moon className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono">
                Computer Was Off / Asleep
              </span>
              <h3 className="text-sm font-bold font-display text-white">
                Reconcile Offline Time
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Overview Box */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Offline Duration:</span>
            <span className="text-white font-mono font-bold text-sm">
              ⏱ {formatMinutes(totalMinutes)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span>Shutdown: {data.lastBeatTime}</span>
            <span>→</span>
            <span>Resumed: {data.nowTime}</span>
          </div>
        </div>

        {/* State details */}
        {isWork ? (
          <div className="bg-zinc-900/60 border border-zinc-700/60 rounded-xl p-3.5 flex items-start space-x-3">
            <div className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0 mt-0.5">
              <Briefcase className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">
                Active Task at Shutdown
              </span>
              <h4 className="text-xs font-bold text-white truncate">
                {data.activeTask?.title}
              </h4>
              <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                Did you continue working or studying on this task while your PC was off?
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-3.5 flex items-start space-x-3">
            <div className="w-7 h-7 rounded-lg bg-amber-900/40 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
              <Coffee className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold text-amber-400 font-mono">
                Rest / Idle Time at Shutdown
              </span>
              <p className="text-[11px] text-zinc-300 mt-1 leading-snug">
                Your computer was shut down during break time. Would you like to count this offline duration towards today's rest budget?
              </p>
            </div>
          </div>
        )}

        {/* Custom duration slider / input toggle */}
        {isCustomMode && (
          <div className="bg-zinc-900/90 border border-zinc-700 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-white">
              <span>Custom Minutes to Count:</span>
              <span className="font-mono text-amber-300">{customMinutes}m</span>
            </div>
            <input
              type="range"
              min={0}
              max={totalMinutes}
              value={customMinutes}
              onChange={(e) => setCustomMinutes(parseInt(e.target.value, 10))}
              className="w-full accent-white cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>0m</span>
              <span>{Math.round(totalMinutes / 2)}m</span>
              <span>{totalMinutes}m</span>
            </div>
          </div>
        )}

        {/* Decision Action Buttons */}
        <div className="flex flex-col space-y-2 pt-1">
          {isCustomMode ? (
            <button
              type="button"
              onClick={handleApplyCustom}
              className="w-full py-2.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold font-display uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-lg"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Apply {customMinutes}m to {isWork ? 'Task Work Time' : 'Rest Pool'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApplyFull}
              className="w-full py-2.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold font-display uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-lg"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Yes, Count Full {formatMinutes(totalMinutes)}</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsCustomMode(!isCustomMode)}
              className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors cursor-pointer border border-zinc-700"
            >
              <Sliders className="w-3.5 h-3.5 text-zinc-400" />
              <span>{isCustomMode ? 'Use Full Time' : 'Custom Time'}</span>
            </button>

            <button
              type="button"
              onClick={handleDiscard}
              className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-red-300 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors cursor-pointer border border-zinc-800"
            >
              <X className="w-3.5 h-3.5" />
              <span>Pause / Discard</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
