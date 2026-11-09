import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  Clock, 
  Coffee, 
  Briefcase, 
  ArrowRight, 
  Check, 
  RotateCcw, 
  X,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { DayPlan, Task } from '../types';
import { formatMinutes, formatSeconds, getTomorrowDate, formatFriendlyDate } from '../utils/storage';

interface DayReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: DayPlan;
  onReopenDay?: () => void;
  onMoveTasksToTomorrow: (tasksToCarryOver: Task[]) => void;
}

export const DayReportModal: React.FC<DayReportModalProps> = ({
  isOpen,
  onClose,
  plan,
  onReopenDay,
  onMoveTasksToTomorrow,
}) => {
  if (!isOpen) return null;

  const tomorrowStr = getTomorrowDate();
  const completedTasks = plan.tasks.filter((t) => t.status === 'completed');
  const unfinishedTasks = plan.tasks.filter((t) => t.status !== 'completed');

  // Multi-select for unfinished tasks to carry over (all selected by default)
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(() =>
    unfinishedTasks.map((t) => t.id)
  );
  const [tasksCarriedOver, setTasksCarriedOver] = useState<boolean>(false);
  const [showCompletedList, setShowCompletedList] = useState<boolean>(false);

  // Work Compliance Calculation
  const workBudgetSec = plan.workHoursBudget * 60;
  const workUsedSec = plan.usedWorkSeconds;
  const workRatio = workBudgetSec > 0 ? (workUsedSec / workBudgetSec) : 1;
  const workPercent = Math.round(workRatio * 100);
  const isWorkRespected = workRatio >= 0.85;

  // Rest Compliance Calculation
  const restBudgetSec = plan.restHoursBudget * 60;
  const restUsedSec = plan.usedRestSeconds;
  const isRestExceeded = restUsedSec > restBudgetSec;
  const restDifferenceSec = Math.abs(restUsedSec - restBudgetSec);

  // Overall Completion
  const totalTasksCount = plan.tasks.length;
  const completedCount = completedTasks.length;
  const taskPercent = totalTasksCount > 0 ? Math.round((completedCount / totalTasksCount) * 100) : 100;

  const toggleSelectTask = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedTaskIds.length === unfinishedTasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(unfinishedTasks.map((t) => t.id));
    }
  };

  const handleCarryOver = () => {
    const tasksToMove = unfinishedTasks.filter((t) => selectedTaskIds.includes(t.id));
    if (tasksToMove.length === 0) return;
    onMoveTasksToTomorrow(tasksToMove);
    setTasksCarriedOver(true);
  };

  // Determine overall discipline badge
  const isGreatDay = isWorkRespected && !isRestExceeded && taskPercent >= 80;
  const isGoodDay = (isWorkRespected || taskPercent >= 60) && (!isRestExceeded || restDifferenceSec < 1800);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-[#18181b] border border-zinc-700/80 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl flex flex-col space-y-5">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs ${
              isGreatDay 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : isGoodDay
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                  {formatFriendlyDate(plan.date)} ({plan.date})
                </span>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase">
                  Day Summary
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white tracking-tight">
                Daily Performance Report
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Overall Status Banner */}
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
          isGreatDay 
            ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300' 
            : isGoodDay
            ? 'bg-blue-950/30 border-blue-800/60 text-blue-300'
            : 'bg-amber-950/30 border-amber-800/60 text-amber-300'
        }`}>
          <div>
            <h3 className="text-sm font-bold font-display uppercase tracking-wider">
              {isGreatDay ? '🌟 Outstanding Discipline & Execution' : isGoodDay ? '👍 Solid Effort & Progress' : '⚠️ Target Under-Delivered'}
            </h3>
            <p className="text-xs opacity-90 mt-0.5 font-medium">
              {isGreatDay 
                ? 'You stayed within your rest budget and hit your working goals. Excellent focus today!' 
                : isGoodDay
                ? 'Good momentum today. Keep optimizing your rest intervals to stay on schedule.'
                : 'You drifted off target today. Review your unfinished tasks below to regain momentum tomorrow.'}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-2xl font-black font-display">
              {taskPercent}%
            </span>
            <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
              Tasks Done
            </div>
          </div>
        </div>

        {/* Compliance Grid: Work Time & Rest Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Work Time Compliance */}
          <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-zinc-300">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider font-display">
                  Working Time
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                workRatio >= 1.0
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                  : workRatio >= 0.85
                  ? 'bg-blue-950/60 text-blue-400 border-blue-800'
                  : 'bg-amber-950/60 text-amber-400 border-amber-800'
              }`}>
                {workRatio >= 1.0 ? 'Exceeded Goal' : workRatio >= 0.85 ? 'Respected' : 'Under Budget'}
              </span>
            </div>

            <div className="my-2">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-2xl font-black font-display text-white">
                  {formatSeconds(workUsedSec)}
                </span>
                <span className="text-xs text-zinc-400 font-medium">
                  Goal: {formatMinutes(plan.workHoursBudget)}
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    workRatio >= 0.85 ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                  style={{ width: `${Math.min(100, workPercent)}%` }}
                />
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 mt-1 font-medium">
              {workRatio >= 1.0 
                ? `🎯 Completed ${workPercent}% of scheduled work time.` 
                : workRatio >= 0.85
                ? `✅ Logged ${workPercent}% of scheduled work time.`
                : `⚠️ Missed work target by ${formatSeconds(workBudgetSec - workUsedSec)}.`}
            </p>
          </div>

          {/* Rest Time Compliance */}
          <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-zinc-300">
                <Coffee className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider font-display">
                  Rest / Free Time
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                !isRestExceeded
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                  : 'bg-red-950/60 text-red-400 border-red-800'
              }`}>
                {!isRestExceeded ? 'Within Budget' : 'Over Budget'}
              </span>
            </div>

            <div className="my-2">
              <div className="flex items-baseline justify-between mb-1">
                <span className={`text-2xl font-black font-display ${isRestExceeded ? 'text-red-400' : 'text-white'}`}>
                  {formatSeconds(restUsedSec)}
                </span>
                <span className="text-xs text-zinc-400 font-medium">
                  Limit: {formatMinutes(plan.restHoursBudget)}
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    isRestExceeded ? 'bg-red-500' : 'bg-amber-400'
                  }`}
                  style={{ width: `${Math.min(100, (restUsedSec / restBudgetSec) * 100)}%` }}
                />
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 mt-1 font-medium">
              {!isRestExceeded
                ? `✅ Kept ${formatSeconds(restDifferenceSec)} of rest unused.`
                : `⚠️ Overspent free time by +${formatSeconds(restDifferenceSec)}.`}
            </p>
          </div>

        </div>

        {/* Unfinished Tasks Section */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
            <div>
              <h3 className="text-sm font-bold font-display text-white flex items-center space-x-2">
                <span>Unfinished Tasks ({unfinishedTasks.length})</span>
                {unfinishedTasks.length === 0 && (
                  <span className="text-emerald-400 text-xs font-normal">All tasks completed! 🎉</span>
                )}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {unfinishedTasks.length > 0
                  ? 'Select the tasks you want to reschedule and add to tomorrow\'s plan.'
                  : 'Great job! You achieved 100% completion of your scheduled tasks today.'}
              </p>
            </div>

            {unfinishedTasks.length > 0 && !tasksCarriedOver && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-[11px] font-bold text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {selectedTaskIds.length === unfinishedTasks.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          {unfinishedTasks.length > 0 ? (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {unfinishedTasks.map((task) => {
                const isSelected = selectedTaskIds.includes(task.id);
                return (
                  <div
                    key={task.id}
                    onClick={() => !tasksCarriedOver && toggleSelectTask(task.id)}
                    className={`p-3 rounded-lg border flex items-center justify-between gap-3 transition-colors ${
                      tasksCarriedOver
                        ? 'bg-zinc-900/40 border-zinc-800/60 opacity-60'
                        : isSelected
                        ? 'bg-zinc-800/90 border-zinc-600 cursor-pointer shadow-xs'
                        : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={tasksCarriedOver}
                        onChange={() => toggleSelectTask(task.id)}
                        className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-white focus:ring-0 cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                            task.priority === 'essential'
                              ? 'bg-red-950/50 text-red-400 border-red-800/50'
                              : task.priority === 'normal'
                              ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          }`}>
                            {task.priority}
                          </span>
                          <span className="text-xs font-bold text-white truncate">
                            {task.title}
                          </span>
                        </div>
                        {task.notes && (
                          <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                            {task.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 text-xs font-medium text-zinc-400">
                      <span>{task.plannedDuration}m</span>
                      {task.actualDuration > 0 && (
                        <div className="text-[10px] text-amber-400">
                          {formatSeconds(task.actualDuration)} logged
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-zinc-400 flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>No unfinished tasks remaining today. Enjoy your evening!</span>
            </div>
          )}

          {/* Action to carry over tasks */}
          {unfinishedTasks.length > 0 && (
            <div className="mt-4 pt-3 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              {tasksCarriedOver ? (
                <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-3 py-2 rounded-lg w-full">
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>
                    Successfully added {selectedTaskIds.length} task(s) to tomorrow's schedule ({tomorrowStr})!
                  </span>
                </div>
              ) : (
                <>
                  <p className="text-xs text-zinc-400">
                    {selectedTaskIds.length === 0
                      ? 'No tasks selected to move.'
                      : `Carry over ${selectedTaskIds.length} selected task(s) into tomorrow (${tomorrowStr}).`}
                  </p>
                  <button
                    type="button"
                    disabled={selectedTaskIds.length === 0}
                    onClick={handleCarryOver}
                    className="w-full sm:w-auto px-4 py-2 bg-zinc-100 hover:bg-white disabled:opacity-50 text-zinc-950 font-bold rounded-lg text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer shrink-0"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Move Selected to Tomorrow's Schedule</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Collapsible Completed Tasks List */}
        {completedTasks.length > 0 && (
          <div className="border border-zinc-800 rounded-xl bg-zinc-900/40 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCompletedList(!showCompletedList)}
              className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Completed Tasks ({completedTasks.length})</span>
              </div>
              {showCompletedList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showCompletedList && (
              <div className="p-3 border-t border-zinc-800 space-y-1.5 max-h-48 overflow-y-auto">
                {completedTasks.map((task) => (
                  <div 
                    key={task.id}
                    className="flex items-center justify-between px-3 py-2 bg-zinc-900/60 rounded-lg text-xs"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-zinc-200 truncate">{task.title}</span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400 shrink-0 ml-2">
                      {formatSeconds(task.actualDuration)} / {task.plannedDuration}m
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal Actions Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800">
          <div>
            {onReopenDay && (
              <button
                type="button"
                onClick={() => {
                  onReopenDay();
                  onClose();
                }}
                className="px-3 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white font-semibold rounded-lg border border-zinc-700 text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resume / Reopen Day Tracking</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-zinc-200 hover:bg-white text-zinc-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
            >
              Done & Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
