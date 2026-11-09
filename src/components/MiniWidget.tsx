import React from 'react';
import { 
  Maximize2, 
  Pause, 
  Play, 
  CheckCircle2, 
  Coffee, 
  Pin, 
  PinOff, 
  Tv, 
  Plus
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
  isPinned,
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
      className={`bg-[#18181b] border border-zinc-700/80 rounded-xl p-2.5 flex flex-col justify-between shadow-2xl select-none text-zinc-100 ${
        isStandaloneWindow 
          ? 'w-full h-full' 
          : 'fixed bottom-4 right-4 z-50 w-[340px] max-w-[95vw]'
      }`}
    >
      {/* Top Header / Drag Bar */}
      <div 
        className="flex items-center justify-between pb-1.5 border-b border-zinc-800/80 shrink-0 cursor-default"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* Status Badge */}
        <div className="flex items-center space-x-1.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {activeTask ? (
            <span className="flex items-center space-x-1 px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 text-[9px] font-bold uppercase tracking-wider font-display">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Working</span>
            </span>
          ) : activePlayingVideo && activePlayingVideo.type === 'work' ? (
            <span className="flex items-center space-x-1 px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-700/60 text-cyan-400 text-[9px] font-bold uppercase tracking-wider font-display">
              <Tv className="w-2.5 h-2.5" />
              <span>Study Video</span>
            </span>
          ) : plan.isDayStarted ? (
            <span className={`flex items-center space-x-1 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider font-display ${
              isRestExceeded 
                ? 'bg-red-950/80 border border-red-700/60 text-red-400 animate-pulse' 
                : 'bg-amber-950/80 border border-amber-700/60 text-amber-300'
            }`}>
              <Coffee className="w-2.5 h-2.5" />
              <span>{isRestExceeded ? 'Rest Over' : 'Free Time'}</span>
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 text-[9px] font-bold uppercase font-display">
              Day Not Started
            </span>
          )}
        </div>

        {/* Window controls */}
        <div className="flex items-center space-x-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {onTogglePin && (
            <button
              onClick={onTogglePin}
              title={isPinned ? 'Pinned Always on Top (Click to unpin)' : 'Pin Always on Top'}
              className={`p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer ${
                isPinned ? 'text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {isPinned ? <Pin className="w-3 h-3 rotate-45 fill-current" /> : <PinOff className="w-3 h-3" />}
            </button>
          )}

          <button
            onClick={onExpand}
            title="Expand to Full View"
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Center Details & Big Timer */}
      <div className="flex items-center justify-between py-1 px-0.5 gap-2 min-w-0">
        {activeTask ? (
          <>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-white truncate leading-tight" title={activeTask.title}>
                {activeTask.title}
              </h4>
              <span className="text-[10px] text-zinc-400 font-medium">
                {formatSeconds(activeTask.actualDuration)} / {formatMinutes(activeTask.plannedDuration)}
              </span>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-xl font-black font-display font-mono leading-none ${
                isOvertime ? 'text-red-400' : 'text-zinc-100'
              }`}>
                {isOvertime ? `+${formatSeconds(Math.abs(remainingSeconds))}` : formatSeconds(remainingSeconds)}
              </div>
              <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                {isOvertime ? 'Overtime' : 'Remaining'}
              </div>
            </div>
          </>
        ) : activePlayingVideo ? (
          <>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-white truncate leading-tight" title={activePlayingVideo.title}>
                {activePlayingVideo.title}
              </h4>
              <span className="text-[10px] text-cyan-400 font-medium">
                Counting as Study Time
              </span>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xl font-black font-display font-mono text-cyan-300 leading-none">
                {formatSeconds(activePlayingVideo.lastPlayedSeconds || 0)}
              </div>
              <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                / {formatMinutes(activePlayingVideo.durationMinutes)}
              </div>
            </div>
          </>
        ) : plan.isDayStarted ? (
          <>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-zinc-200 truncate leading-tight">
                {isRestExceeded ? 'Rest Budget Exceeded' : 'Resting / Free Time'}
              </h4>
              <span className="text-[10px] text-zinc-400 font-medium">
                Limit: {formatMinutes(plan.restHoursBudget)} ({Math.floor(plan.usedRestSeconds / 60)}m used)
              </span>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-xl font-black font-display font-mono leading-none ${
                isRestExceeded ? 'text-red-400 animate-pulse' : 'text-amber-300'
              }`}>
                {formatSeconds(plan.usedRestSeconds)}
              </div>
              <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                {isRestExceeded ? 'Over Budget' : 'Rest Used'}
              </div>
            </div>
          </>
        ) : (
          <div className="py-1">
            <h4 className="text-xs font-bold text-zinc-300">Ready to start today?</h4>
            <span className="text-[10px] text-zinc-500">Pick a task or start day clock</span>
          </div>
        )}
      </div>

      {/* Bottom Action Controls */}
      <div 
        className="flex items-center justify-between pt-1 border-t border-zinc-800/80 gap-1.5 shrink-0"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {activeTask ? (
          <>
            <button
              onClick={() => onCompleteTask(activeTask.id)}
              className="flex-1 py-1 px-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center space-x-1 transition-colors cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Done</span>
            </button>

            <button
              onClick={() => onPauseTask(activeTask.id)}
              className="py-1 px-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-[11px] flex items-center space-x-1 border border-zinc-700 transition-colors cursor-pointer"
            >
              <Pause className="w-3 h-3" />
              <span>Break</span>
            </button>

            <button
              onClick={() => onExtendTask(activeTask.id, 10)}
              title="Extend +10m"
              className="py-1 px-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 font-mono text-[10px] font-bold border border-zinc-700 transition-colors cursor-pointer"
            >
              +10m
            </button>
          </>
        ) : plan.isDayStarted ? (
          <>
            {nextPendingTask && onStartNextTask ? (
              <button
                onClick={onStartNextTask}
                className="flex-1 py-1 px-2.5 rounded-md bg-zinc-200 hover:bg-white text-zinc-950 font-bold text-[11px] flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-sm truncate"
                title={`Start: "${nextPendingTask.title}"`}
              >
                <Play className="w-3 h-3 fill-current shrink-0" />
                <span className="truncate">Start: {nextPendingTask.title}</span>
              </button>
            ) : (
              <button
                onClick={onExpand}
                className="flex-1 py-1 px-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-[11px] flex items-center justify-center space-x-1 transition-colors cursor-pointer border border-zinc-700"
              >
                <Plus className="w-3 h-3" />
                <span>Plan More Tasks</span>
              </button>
            )}
          </>
        ) : (
          <button
            onClick={onStartDay}
            className="w-full py-1 px-3 rounded-md bg-zinc-200 hover:bg-white text-zinc-950 font-bold text-[11px] flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Start Day Tracker</span>
          </button>
        )}
      </div>
    </div>
  );
};
