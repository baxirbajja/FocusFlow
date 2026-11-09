import React from 'react';
import { 
  Maximize2, 
  Pause, 
  Play, 
  CheckCircle2, 
  Coffee, 
  Pin, 
  PinOff, 
  Tv
} from 'lucide-react';
import { DayPlan, YouTubeVideo } from '../types';
import { formatSeconds, formatMinutes } from '../utils/storage';

interface MiniWidgetProps {
  plan: DayPlan;
  onExpand: () => void;
  onPauseTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onExtendTask: (taskId: string, mins: number) => void;
  onStartNextTask?: () => void;
  onStartDay?: () => void;
  activePlayingVideo?: YouTubeVideo | null;
  isPinned?: boolean;
  onTogglePin?: () => void;
  isStandaloneWindow?: boolean;
}

export const MiniWidget: React.FC<MiniWidgetProps> = ({
  plan,
  onExpand,
  onPauseTask,
  onCompleteTask,
  onExtendTask,
  onStartNextTask,
  onStartDay,
  activePlayingVideo,
  isPinned = true,
  onTogglePin,
  isStandaloneWindow = false,
}) => {
  const activeTask = plan.tasks.find((t) => t.id === plan.activeTaskId);
  const nextPendingTask = plan.tasks.find((t) => t.status === 'pending');
  const isRestExceeded = plan.usedRestSeconds > plan.restHoursBudget * 60;

  const targetSeconds = activeTask ? activeTask.plannedDuration * 60 : 0;
  const remainingSeconds = activeTask ? targetSeconds - activeTask.actualDuration : 0;
  const isOvertime = remainingSeconds < 0;

  return (
    <div 
      className={`bg-[#18181b] border border-zinc-700/80 rounded-2xl px-3.5 py-2.5 flex flex-col justify-between shadow-2xl select-none text-zinc-100 ${
        isStandaloneWindow 
          ? 'w-full h-full' 
          : 'fixed bottom-4 right-4 z-50 w-[360px] h-[92px] max-w-[95vw]'
      }`}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Top Row: Badge on Left, Action Controls & Window Controls on Right */}
      <div className="flex items-center justify-between shrink-0">
        
        {/* Status Badge */}
        <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {activeTask ? (
            <div className="px-2 py-0.5 rounded-md border border-emerald-600/80 bg-emerald-950/40 text-emerald-400 font-bold text-[10px] uppercase tracking-wider font-display flex items-center space-x-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>WORKING</span>
            </div>
          ) : activePlayingVideo && activePlayingVideo.type === 'work' ? (
            <div className="px-2 py-0.5 rounded-md border border-cyan-600/80 bg-cyan-950/40 text-cyan-400 font-bold text-[10px] uppercase tracking-wider font-display flex items-center space-x-1.5 shadow-sm">
              <Tv className="w-3 h-3 text-cyan-400" />
              <span>STUDY VIDEO</span>
            </div>
          ) : plan.isDayStarted ? (
            <div className={`px-2 py-0.5 rounded-md border font-bold text-[10px] uppercase tracking-wider font-display flex items-center space-x-1.5 shadow-sm ${
              isRestExceeded 
                ? 'border-red-600/80 bg-red-950/40 text-red-400 animate-pulse' 
                : 'border-amber-600/80 bg-amber-950/40 text-amber-500'
            }`}>
              <Coffee className="w-3 h-3 text-amber-500 stroke-[2.5]" />
              <span>FREE TIME</span>
            </div>
          ) : (
            <div className="px-2 py-0.5 rounded-md border border-zinc-700 bg-zinc-800 text-zinc-400 font-bold text-[10px] uppercase tracking-wider font-display">
              DAY IDLE
            </div>
          )}
        </div>

        {/* Right: Quick actions + Pin + Expand */}
        <div 
          className="flex items-center space-x-2 shrink-0" 
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {activeTask && (
            <>
              <button
                onClick={() => onCompleteTask(activeTask.id)}
                title="Mark Task Done"
                className="p-1 rounded hover:bg-zinc-800 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onPauseTask(activeTask.id)}
                title="Take Break"
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onExtendTask(activeTask.id, 10)}
                title="Extend +10m"
                className="px-1 py-0.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white font-mono text-[9px] font-bold transition-colors cursor-pointer"
              >
                +10m
              </button>
            </>
          )}

          {!activeTask && plan.isDayStarted && nextPendingTask && onStartNextTask && (
            <button
              onClick={onStartNextTask}
              title={`Start: "${nextPendingTask.title}"`}
              className="p-1 rounded hover:bg-zinc-800 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          )}

          {!activeTask && !plan.isDayStarted && onStartDay && (
            <button
              onClick={onStartDay}
              title="Start Today's Tracking"
              className="p-1 rounded hover:bg-zinc-800 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          )}

          {onTogglePin && (
            <button
              onClick={onTogglePin}
              title={isPinned ? 'Pinned Always on Top (Click to unpin)' : 'Pin Always on Top'}
              className={`p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer ${
                isPinned ? 'text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {isPinned ? <Pin className="w-3.5 h-3.5 rotate-45 fill-current" /> : <PinOff className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            onClick={onExpand}
            title="Expand to Full View"
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Row: Title & Subtitle on Left, Large Digital Timer & Label on Right */}
      <div className="flex items-end justify-between gap-3 min-w-0 pt-1">
        
        {/* Left Side: Title & Subtitle */}
        <div className="min-w-0 flex-1">
          {activeTask ? (
            <>
              <h4 className="text-sm font-bold text-white tracking-tight leading-tight truncate" title={activeTask.title}>
                {activeTask.title}
              </h4>
              <p className="text-[11px] text-zinc-400 font-medium truncate mt-0.5">
                {formatSeconds(activeTask.actualDuration)} / {formatMinutes(activeTask.plannedDuration)}
              </p>
            </>
          ) : activePlayingVideo ? (
            <>
              <h4 className="text-sm font-bold text-white tracking-tight leading-tight truncate" title={activePlayingVideo.title}>
                {activePlayingVideo.title}
              </h4>
              <p className="text-[11px] text-cyan-400 font-medium truncate mt-0.5">
                Counting as Study Time
              </p>
            </>
          ) : plan.isDayStarted ? (
            <>
              <h4 className="text-sm font-bold text-white tracking-tight leading-tight">
                Resting / Free Time
              </h4>
              <p className="text-[11px] text-zinc-400 font-medium truncate mt-0.5">
                Limit: {formatMinutes(plan.restHoursBudget)} ({Math.floor(plan.usedRestSeconds / 60)}m used)
              </p>
            </>
          ) : (
            <>
              <h4 className="text-sm font-bold text-zinc-300 tracking-tight leading-tight">
                Day Not Started
              </h4>
              <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                Click play above to begin
              </p>
            </>
          )}
        </div>

        {/* Right Side: Giant Digital Timer & Subtitle Label */}
        <div className="text-right shrink-0">
          {activeTask ? (
            <>
              <div className={`text-2xl font-black font-display font-mono tracking-wider leading-none ${
                isOvertime ? 'text-red-400 animate-pulse' : 'text-zinc-100'
              }`}>
                {isOvertime ? `+${formatSeconds(Math.abs(remainingSeconds))}` : formatSeconds(remainingSeconds)}
              </div>
              <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                {isOvertime ? 'OVERTIME' : 'REMAINING'}
              </div>
            </>
          ) : activePlayingVideo ? (
            <>
              <div className="text-2xl font-black font-display font-mono tracking-wider leading-none text-cyan-300">
                {formatSeconds(activePlayingVideo.lastPlayedSeconds || 0)}
              </div>
              <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                / {formatMinutes(activePlayingVideo.durationMinutes)}
              </div>
            </>
          ) : plan.isDayStarted ? (
            <>
              <div className={`text-2xl font-black font-display font-mono tracking-wider leading-none ${
                isRestExceeded ? 'text-red-400 animate-pulse' : 'text-amber-400'
              }`}>
                {formatSeconds(plan.usedRestSeconds)}
              </div>
              <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                {isRestExceeded ? 'OVER BUDGET' : 'REST USED'}
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-black font-display font-mono tracking-wider leading-none text-zinc-500">
                00:00:00
              </div>
              <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-1">
                IDLE
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
