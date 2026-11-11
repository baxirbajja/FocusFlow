import React from 'react';
import { 
  Maximize2, 
  Pause, 
  Play, 
  CheckCircle2, 
  Pin, 
  PinOff 
} from 'lucide-react';
import { DayPlan, YouTubeVideo } from '../types';
import { formatSeconds, formatMinutes } from '../utils/storage';

interface MiniWidgetProps {
  plan: DayPlan;
  onExpand: () => void;
  onPauseTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onExtendTask?: (taskId: string, mins: number) => void;
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

  // 1. Task Countdown & Dynamic Progress Color
  let budgetLabel = 'DAY IDLE';
  let timerText = '00:00:00';
  let colorClass = 'text-zinc-500';
  let barColorClass = 'bg-zinc-700';
  let progressPercent = 0;

  if (activeTask) {
    budgetLabel = `WORK BUDGET • ${activeTask.title}`;
    const targetSeconds = activeTask.plannedDuration * 60;
    const remainingSeconds = targetSeconds - activeTask.actualDuration;
    const isOvertime = remainingSeconds < 0;

    if (isOvertime) {
      timerText = `+${formatSeconds(Math.abs(remainingSeconds))}`;
      colorClass = 'text-red-500 animate-pulse font-black';
      barColorClass = 'bg-red-500 animate-pulse';
      progressPercent = 100;
    } else {
      timerText = formatSeconds(remainingSeconds);
      const ratio = targetSeconds > 0 ? remainingSeconds / targetSeconds : 0;
      progressPercent = Math.min(100, Math.max(0, ratio * 100));

      // Color changes dynamically from start to end:
      // > 50% left: Fresh Emerald Green
      // 20% - 50% left: Golden Amber
      // < 20% left: Warm Orange / Red alert
      if (ratio >= 0.50) {
        colorClass = 'text-emerald-400 font-black';
        barColorClass = 'bg-emerald-400';
      } else if (ratio >= 0.20) {
        colorClass = 'text-amber-400 font-black';
        barColorClass = 'bg-amber-400';
      } else {
        colorClass = 'text-orange-400 animate-pulse font-black';
        barColorClass = 'bg-orange-400 animate-pulse';
      }
    }
  } else if (activePlayingVideo && activePlayingVideo.type === 'work') {
    budgetLabel = `STUDY VIDEO • ${activePlayingVideo.title}`;
    timerText = formatSeconds(activePlayingVideo.lastPlayedSeconds || 0);
    colorClass = 'text-cyan-400 font-black';
    barColorClass = 'bg-cyan-400';
    progressPercent = 100;
  } else if (plan.isDayStarted) {
    if (plan.isDayEnded) {
      budgetLabel = 'DAY COMPLETED';
      timerText = formatSeconds(plan.usedWorkSeconds);
      colorClass = 'text-purple-300 font-black';
      barColorClass = 'bg-purple-400';
      progressPercent = 100;
    } else {
      // Idle Rest / Free Time Mode
      const usedMins = Math.floor(plan.usedRestSeconds / 60);
      budgetLabel = `REST BUDGET (${usedMins}m / ${formatMinutes(plan.restHoursBudget)})`;
      timerText = formatSeconds(plan.usedRestSeconds);

      const restBudgetSec = plan.restHoursBudget * 60;
      const ratio = restBudgetSec > 0 ? plan.usedRestSeconds / restBudgetSec : 0;
      progressPercent = Math.min(100, ratio * 100);

      if (isRestExceeded) {
        colorClass = 'text-red-500 animate-pulse font-black';
        barColorClass = 'bg-red-500 animate-pulse';
      } else if (ratio >= 0.80) {
        colorClass = 'text-orange-400 font-black';
        barColorClass = 'bg-orange-400';
      } else if (ratio >= 0.50) {
        colorClass = 'text-amber-400 font-black';
        barColorClass = 'bg-amber-400';
      } else {
        colorClass = 'text-emerald-400 font-black';
        barColorClass = 'bg-emerald-400';
      }
    }
  }

  return (
    <div 
      className={`bg-[#18181b]/95 backdrop-blur-md border border-zinc-700/80 shadow-2xl select-none text-zinc-100 flex flex-col justify-between overflow-hidden ${
        isStandaloneWindow 
          ? 'w-full h-full rounded-[8px]' 
          : 'fixed bottom-4 right-4 z-50 w-[210px] h-[50px] max-w-[95vw] rounded-[10px]'
      }`}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Upper Content: Budget Tag & Big Dynamic Timer + Micro Action Buttons */}
      <div className="flex items-center justify-between px-2.5 pt-1.5 pb-0.5 min-w-0 flex-1">
        
        {/* Left Side: Budget Label & Timer */}
        <div className="min-w-0 flex-1 pr-1.5 flex flex-col justify-center">
          <span 
            className="text-[8px] font-mono font-bold uppercase tracking-wider text-zinc-400 truncate block leading-none mb-1"
            title={budgetLabel}
          >
            {budgetLabel}
          </span>
          <div className={`text-[21px] font-mono leading-none tracking-tight ${colorClass}`}>
            {timerText}
          </div>
        </div>

        {/* Right Side: Micro Action Buttons */}
        <div 
          className="flex items-center space-x-1 shrink-0"
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
              title={isPinned ? 'Always on Top (Active)' : 'Pin on Top'}
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
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* Bottom Progress Bar: Visually shrinking/growing with the remaining time */}
      <div className="w-full h-[2.5px] bg-zinc-800 shrink-0 overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ease-linear ${barColorClass}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

    </div>
  );
};
