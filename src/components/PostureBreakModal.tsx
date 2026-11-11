import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Activity, 
  Clock, 
  Check, 
  Coffee, 
  Eye, 
  Droplet, 
  Wind,
  CheckCircle2,
  BellRing
} from 'lucide-react';
import { formatMinutes } from '../utils/storage';

interface PostureBreakModalProps {
  isOpen: boolean;
  continuousMinutes: number;
  onTakeBreak: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
}

export const PostureBreakModal: React.FC<PostureBreakModalProps> = ({
  isOpen,
  continuousMinutes,
  onTakeBreak,
  onSnooze,
  onDismiss,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(180); // 3-min recommended stretch timer
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTimerRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (secondsRemaining === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, secondsRemaining]);

  if (!isOpen) return null;

  const timerMin = Math.floor(secondsRemaining / 60);
  const timerSec = secondsRemaining % 60;
  const timeFormatted = `${timerMin}:${String(timerSec).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-gradient-to-b from-[#18181b] to-zinc-950 border border-emerald-500/40 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative overflow-hidden text-center space-y-5 ring-1 ring-emerald-500/20">
        
        {/* Glow ambient background element */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Icon */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Title */}
        <div className="space-y-2 pt-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
            <Activity className="w-8 h-8 stroke-[2.2] animate-pulse" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[11px] font-mono font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span>{continuousMinutes || 40} Minutes Continuous Focus</span>
            </div>

            <h3 className="text-xl font-extrabold font-display text-white tracking-tight">
              Time to Rest Your Posture & Mind
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
              You've been working or watching for {continuousMinutes || 40} minutes without interruption. A brief posture reset prevents burnout and eye strain.
            </p>
          </div>
        </div>

        {/* 4 Quick Health Checks Grid */}
        <div className="grid grid-cols-2 gap-2.5 text-left">
          <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-2xl flex items-start space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-zinc-200 block">Posture Reset</span>
              <span className="text-[10px] text-zinc-400 leading-tight block mt-0.5">
                Stand up, roll shoulders back, release neck tension.
              </span>
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-2xl flex items-start space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400 shrink-0">
              <Eye className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-zinc-200 block">20-20-20 Rule</span>
              <span className="text-[10px] text-zinc-400 leading-tight block mt-0.5">
                Look 20 feet away to relax your eye ciliary muscles.
              </span>
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-2xl flex items-start space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400 shrink-0">
              <Droplet className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-zinc-200 block">Hydration</span>
              <span className="text-[10px] text-zinc-400 leading-tight block mt-0.5">
                Drink a glass of water to keep your brain oxygenated.
              </span>
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-2xl flex items-start space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-950 border border-teal-800 flex items-center justify-center text-teal-400 shrink-0">
              <Wind className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-zinc-200 block">Deep Breathing</span>
              <span className="text-[10px] text-zinc-400 leading-tight block mt-0.5">
                Take 3 deep, slow breaths into your abdomen.
              </span>
            </div>
          </div>
        </div>

        {/* Stretch Countdown Timer (Optional interactive widget) */}
        {isTimerRunning && (
          <div className="bg-emerald-950/40 border border-emerald-600/50 rounded-2xl p-3 flex items-center justify-between animate-pulse">
            <div className="flex items-center space-x-2">
              <Coffee className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-200">
                Stretch Break in Progress:
              </span>
            </div>
            <span className="text-base font-extrabold font-mono text-emerald-400">
              {timeFormatted}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-zinc-800/80">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setIsTimerRunning(true);
                onTakeBreak();
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 text-xs font-extrabold font-display uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950/60 cursor-pointer transition-all"
            >
              <Coffee className="w-4 h-4 stroke-[2.5]" />
              <span>Take a Stretch Break (3m)</span>
            </button>

            <button
              onClick={onSnooze}
              className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold font-display uppercase tracking-wider border border-zinc-700 cursor-pointer transition-colors"
            >
              Snooze 5m
            </button>
          </div>

          <button
            onClick={onDismiss}
            className="w-full py-2 text-zinc-400 hover:text-zinc-200 text-xs font-semibold cursor-pointer transition-colors"
          >
            I already stretched / Dismiss for next 40m
          </button>
        </div>

      </div>
    </div>
  );
};
