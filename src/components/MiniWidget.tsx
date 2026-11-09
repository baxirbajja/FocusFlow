import React from 'react';
import { Maximize2, Pause, CheckCircle2, Coffee, Briefcase } from 'lucide-react';
import { DayPlan } from '../types';
import { formatSeconds } from '../utils/storage';

interface MiniWidgetProps {
  plan: DayPlan;
  onExpand: () => void;
  onPauseTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onExtendTask: (taskId: string, mins: number) => void;
}

export const MiniWidget: React.FC<MiniWidgetProps> = ({
  plan,
  onExpand,
  onPauseTask,
  onCompleteTask,
  onExtendTask,
}) => {
  const activeTask = plan.tasks.find((t) => t.id === plan.activeTaskId);
  const isResting = plan.isDayStarted && !plan.activeTaskId;
  const isRestExceeded = plan.usedRestSeconds > plan.restHoursBudget * 60;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-[#18181b] border border-zinc-700 rounded-xl p-3 shadow-xl flex items-center space-x-3.5 max-w-sm text-zinc-100">
      {activeTask ? (
        <>
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
              <Briefcase className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider truncate">
                Active Focus
              </div>
              <div className="text-xs font-semibold text-zinc-100 truncate max-w-[130px]">
                {activeTask.title}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm font-bold font-mono text-zinc-200">
              {formatSeconds(Math.max(0, activeTask.plannedDuration * 60 - activeTask.actualDuration))}
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            <button
              onClick={() => onCompleteTask(activeTask.id)}
              title="Mark Done"
              className="p-1.5 rounded-md bg-zinc-200 hover:bg-white text-zinc-950 cursor-pointer transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onPauseTask(activeTask.id)}
              title="Pause"
              className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer transition-colors"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onExtendTask(activeTask.id, 10)}
              title="+10m"
              className="px-1.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono cursor-pointer transition-colors"
            >
              +10m
            </button>
          </div>
        </>
      ) : isResting ? (
        <>
          <div className="flex items-center space-x-2 min-w-0">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              isRestExceeded ? 'bg-red-950 text-red-300' : 'bg-zinc-800 text-zinc-300'
            }`}>
              <Coffee className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className={`text-[10px] uppercase tracking-wider ${
                isRestExceeded ? 'text-red-400 font-semibold' : 'text-zinc-400'
              }`}>
                {isRestExceeded ? 'Rest Over' : 'Rest Active'}
              </div>
              <div className="text-xs text-zinc-300">
                Idle tracker
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className={`text-sm font-bold font-mono ${
              isRestExceeded ? 'text-red-400' : 'text-zinc-200'
            }`}>
              {formatSeconds(plan.usedRestSeconds)}
            </div>
          </div>
        </>
      ) : (
        <div className="text-xs text-zinc-400">
          Day not started
        </div>
      )}

      {/* Expand */}
      <button
        onClick={onExpand}
        title="Expand"
        className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer shrink-0 border border-zinc-700"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
