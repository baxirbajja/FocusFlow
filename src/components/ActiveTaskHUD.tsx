import React from 'react';
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  FileText, 
  Coffee,
  Pin
} from 'lucide-react';
import { DayPlan, Task } from '../types';
import { formatSeconds, formatMinutes } from '../utils/storage';

interface ActiveTaskHUDProps {
  plan: DayPlan;
  onStartDay: () => void;
  onPauseTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onExtendTask: (taskId: string, mins: number) => void;
  onOpenNotes: (task: Task) => void;
  isToday: boolean;
  onEnterMiniMode?: () => void;
}

export const ActiveTaskHUD: React.FC<ActiveTaskHUDProps> = ({
  plan,
  onStartDay,
  onPauseTask,
  onCompleteTask,
  onExtendTask,
  onOpenNotes,
  isToday,
  onEnterMiniMode,
}) => {
  const activeTask = plan.tasks.find((t) => t.id === plan.activeTaskId);

  // If day is not started yet
  if (!plan.isDayStarted && isToday) {
    return (
      <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-6 text-center my-4">
        <h2 className="text-lg font-bold font-display text-white mb-1">Start Today's Tracking</h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto mb-4 font-normal">
          Once initiated, unstarted intervals automatically count toward your daily rest budget.
        </p>
        <button
          onClick={onStartDay}
          className="px-6 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-lg text-xs transition-colors cursor-pointer inline-flex items-center space-x-2"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Start Day Tracker</span>
        </button>
      </div>
    );
  }

  // Active Task Running
  if (activeTask) {
    const targetSeconds = activeTask.plannedDuration * 60;
    const remainingSeconds = targetSeconds - activeTask.actualDuration;
    const isOvertime = remainingSeconds < 0;
    const progressPercent = Math.min(100, Math.round((activeTask.actualDuration / targetSeconds) * 100));

    return (
      <div className="bg-[#18181b] border border-zinc-700/80 rounded-2xl p-5 my-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          
          {/* Left: Task Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 uppercase font-display">
                Focus Session Active
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 capitalize">
                {activeTask.priority}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white mb-2 truncate">
              {activeTask.title}
            </h2>

            {/* Notes preview */}
            {activeTask.notes ? (
              <div 
                onClick={() => onOpenNotes(activeTask)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 cursor-pointer hover:border-zinc-700 transition-colors flex items-start justify-between max-w-xl"
              >
                <div className="flex items-start space-x-2 line-clamp-2">
                  <FileText className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
                  <p className="line-clamp-2 text-zinc-300 font-medium">{activeTask.notes}</p>
                </div>
                <span className="text-[11px] font-bold text-zinc-300 hover:text-white shrink-0 ml-2">
                  View Notes
                </span>
              </div>
            ) : (
              <button
                onClick={() => onOpenNotes(activeTask)}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-300 flex items-center space-x-1 cursor-pointer transition-colors"
              >
                <FileText className="w-3 h-3" />
                <span>+ Add notes / concept checklist</span>
              </button>
            )}
          </div>

          {/* Right: Timer & Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 shrink-0">
            
            {/* Countdown */}
            <div className="text-left sm:text-right">
              <div className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider font-display">
                {isOvertime ? 'Overtime' : 'Time Remaining'}
              </div>
              <div className={`text-4xl sm:text-5xl font-black font-display tracking-tight ${
                isOvertime ? 'text-red-400' : 'text-white'
              }`}>
                {formatSeconds(Math.abs(remainingSeconds))}
              </div>
              <div className="text-[11px] text-zinc-500 font-medium mt-0.5">
                {formatSeconds(activeTask.actualDuration)} / {formatMinutes(activeTask.plannedDuration)}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap sm:flex-col gap-2">
              <button
                onClick={() => onCompleteTask(activeTask.id)}
                className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Done</span>
              </button>

              <button
                onClick={() => onPauseTask(activeTask.id)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded-lg border border-zinc-700 text-xs flex items-center space-x-1.5 cursor-pointer transition-colors"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Take Break</span>
              </button>

              {onEnterMiniMode && (
                <button
                  onClick={onEnterMiniMode}
                  title="Pin mini floating pop-up timer on screen"
                  className="px-3 py-1.5 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white font-semibold rounded-lg border border-zinc-700 text-xs flex items-center space-x-1.5 cursor-pointer transition-colors"
                >
                  <Pin className="w-3.5 h-3.5 text-cyan-400 rotate-45" />
                  <span>Pin Mini Timer</span>
                </button>
              )}

              {/* Extensions */}
              <div className="flex items-center space-x-1">
                {[10, 15, 30].map((m) => (
                  <button
                    key={m}
                    onClick={() => onExtendTask(activeTask.id, m)}
                    title={`Add ${m}m to task`}
                    className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors"
                  >
                    +{m}m
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* Progress bar */}
        <div className="w-full bg-zinc-900 rounded-full h-1 overflow-hidden border border-zinc-800 mt-4">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isOvertime ? 'bg-red-500' : 'bg-zinc-300'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    );
  }

  // Rest / Idle Mode
  return (
    <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5 my-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 shrink-0">
            <Coffee className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold font-display uppercase tracking-wider text-white">Rest / Idle Mode</h3>
              <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase">
                Rest Timer Active
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 font-normal">
              No task is currently running. Select a task below and click <strong className="text-white font-bold">Start</strong> to begin your next focus session.
            </p>
          </div>
        </div>

        <div className="text-left md:text-right shrink-0">
          <div className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider font-display">
            Rest Used Today
          </div>
          <div className="text-2xl font-black font-display text-white">
            {formatSeconds(plan.usedRestSeconds)}
          </div>
          <div className="text-[11px] text-zinc-500 font-medium">
            Limit: {formatMinutes(plan.restHoursBudget)}
          </div>
          {onEnterMiniMode && (
            <button
              onClick={onEnterMiniMode}
              title="Pin mini floating pop-up timer on screen while resting"
              className="mt-2 px-3 py-1 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white font-semibold rounded-lg border border-zinc-700 text-xs inline-flex items-center space-x-1.5 cursor-pointer transition-colors"
            >
              <Pin className="w-3.5 h-3.5 text-amber-300 rotate-45" />
              <span>Pin Free Time</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
