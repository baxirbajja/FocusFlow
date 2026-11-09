import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  FileText, 
  ArrowRight, 
  AlertCircle, 
  AlertTriangle,
  Check, 
  CheckCircle2,
  BookmarkPlus, 
  BookmarkCheck,
  Zap,
  Tv,
  Moon,
  Briefcase,
  Coffee,
  Sparkles
} from 'lucide-react';
import { DayPlan, Task, PriorityLevel, DayTemplate, TaskTemplate } from '../types';
import { formatMinutes, loadTemplates } from '../utils/storage';

interface DayPlannerProps {
  plan: DayPlan;
  onUpdatePlan: (updatedPlan: DayPlan) => void;
  onOpenNotes: (task: Task) => void;
  onSwitchToTracker: () => void;
  isTomorrow: boolean;
  taskTemplates: TaskTemplate[];
  onOpenCreateTemplateModal: () => void;
  onSaveTaskAsTemplate: (task: Task) => void;
  onSelectTemplate: (template: TaskTemplate) => void;
  onOpenScheduleYouTubeModal: () => void;
  onOpenAIDigest?: () => void;
}

export const DayPlanner: React.FC<DayPlannerProps> = ({
  plan,
  onUpdatePlan,
  onOpenNotes,
  onSwitchToTracker,
  isTomorrow,
  taskTemplates,
  onOpenCreateTemplateModal,
  onSaveTaskAsTemplate,
  onSelectTemplate,
  onOpenScheduleYouTubeModal,
  onOpenAIDigest,
}) => {
  const [taskTitle, setTaskTitle] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [taskDuration, setTaskDuration] = useState(45);
  const [taskStartTime, setTaskStartTime] = useState('');
  const [taskPriority, setTaskPriority] = useState<PriorityLevel>('normal');
  const [selectedDayTemplateId, setSelectedDayTemplateId] = useState('');
  const [savedFeedbackId, setSavedFeedbackId] = useState<string | null>(null);
  const [loadedTemplateTitle, setLoadedTemplateTitle] = useState<string | null>(null);

  const dayTemplates = loadTemplates();

  const handleSelectTemplateIntoForm = (tpl: TaskTemplate) => {
    setTaskTitle(tpl.title);
    setTaskDuration(tpl.plannedDuration);
    setTaskNotes(tpl.notes || '');
    setTaskPriority(tpl.priority || 'normal');
    if (tpl.scheduledStartTime) {
      setTaskStartTime(tpl.scheduledStartTime);
    }
    setLoadedTemplateTitle(tpl.title);
    setTimeout(() => {
      setLoadedTemplateTitle(null);
    }, 3500);
  };

  // Scheduled work calculations (Tasks + YouTube Study Videos)
  const totalTaskMinutes = plan.tasks.reduce((sum, t) => sum + t.plannedDuration, 0);
  const totalWorkVideoMinutes = (plan.youtubeWorkVideos || []).reduce((sum, v) => sum + v.durationMinutes, 0);
  const totalScheduledWorkMinutes = totalTaskMinutes + totalWorkVideoMinutes;

  const remainingWorkToSchedule = plan.workHoursBudget - totalScheduledWorkMinutes;
  const isWorkOverBudget = remainingWorkToSchedule < 0;
  const workOverBudgetMinutes = Math.abs(remainingWorkToSchedule);
  const workScheduledPercent = Math.round((totalScheduledWorkMinutes / (plan.workHoursBudget || 1)) * 100);

  // Free time calculations (Rest pool - YouTube Entertainment Videos)
  const totalRestVideoMinutes = (plan.youtubeRestVideos || []).reduce((sum, v) => sum + v.durationMinutes, 0);
  const remainingFreeTimeToSchedule = plan.restHoursBudget - totalRestVideoMinutes;
  const isFreeTimeOverBudget = remainingFreeTimeToSchedule < 0;
  const freeTimeOverBudgetMinutes = Math.abs(remainingFreeTimeToSchedule);

  const TOTAL_WAKING_MINUTES = 16 * 60; // 960 minutes = 16 hours waking day (24h - 8h sleep)

  const handleWorkBudgetChange = (mins: number) => {
    // Clamp work between 1 hour (60m) and 15 hours (900m)
    const clampedWork = Math.min(Math.max(60, mins), 900);
    const coupledRest = TOTAL_WAKING_MINUTES - clampedWork;
    onUpdatePlan({ 
      ...plan, 
      workHoursBudget: clampedWork,
      restHoursBudget: coupledRest
    });
  };

  const handleRestBudgetChange = (mins: number) => {
    // Clamp rest between 1 hour (60m) and 15 hours (900m)
    const clampedRest = Math.min(Math.max(60, mins), 900);
    const coupledWork = TOTAL_WAKING_MINUTES - clampedRest;
    onUpdatePlan({ 
      ...plan, 
      workHoursBudget: coupledWork,
      restHoursBudget: clampedRest
    });
  };

  const handleAutoExpandWorkTarget = () => {
    handleWorkBudgetChange(totalScheduledWorkMinutes);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const newTask: Task = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title: taskTitle.trim(),
      notes: taskNotes.trim(),
      plannedDuration: taskDuration,
      actualDuration: 0,
      scheduledStartTime: taskStartTime || undefined,
      status: 'pending',
      priority: taskPriority,
    };

    onUpdatePlan({
      ...plan,
      tasks: [...plan.tasks, newTask],
    });

    setTaskTitle('');
    setTaskNotes('');
    setTaskStartTime('');
  };

  const handleSaveAsTemplateClick = (task: Task) => {
    onSaveTaskAsTemplate(task);
    setSavedFeedbackId(task.id);
    setTimeout(() => {
      setSavedFeedbackId(null);
    }, 1500);
  };

  const handleDeleteTask = (taskId: string) => {
    onUpdatePlan({
      ...plan,
      tasks: plan.tasks.filter((t) => t.id !== taskId),
    });
  };

  const handleApplyDayTemplate = (template: DayTemplate) => {
    const newTasks: Task[] = template.tasks.map((t, idx) => ({
      ...t,
      id: 'task_' + Date.now() + '_' + idx,
      actualDuration: 0,
      status: 'pending',
    }));

    onUpdatePlan({
      ...plan,
      workHoursBudget: template.workHoursBudget,
      restHoursBudget: template.restHoursBudget,
      tasks: newTasks,
    });
  };

  const handleMoveTask = (index: number, direction: 'up' | 'down') => {
    const newTasks = [...plan.tasks];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newTasks.length) return;
    const temp = newTasks[index];
    newTasks[index] = newTasks[targetIdx];
    newTasks[targetIdx] = temp;
    onUpdatePlan({ ...plan, tasks: newTasks });
  };

  return (
    <div className="space-y-5">
      
      {/* Top Banner & Actions */}
      <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-bold uppercase tracking-wider font-display">
                {isTomorrow ? 'Tomorrow Planning' : 'Schedule Architect'}
              </span>
            </div>
            <h2 className="text-base font-extrabold font-display text-white">
              {isTomorrow ? "Plan Tomorrow's Schedule" : `Schedule for ${plan.date}`}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5 font-normal">
              Set target work and rest hours, pick ready templates, or create new recurring tasks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* AI Lecture & TP Digest */}
            {onOpenAIDigest && (
              <button
                onClick={onOpenAIDigest}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-600 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-zinc-300 stroke-[2.2]" />
                <span>AI Class Digest</span>
              </button>
            )}

            {/* Schedule YouTube Button (User requested) */}
            <button
              onClick={onOpenScheduleYouTubeModal}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-600 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Tv className="w-3.5 h-3.5 text-zinc-300 stroke-[2.2]" />
              <span>Schedule YouTube</span>
              {(plan.youtubeWorkVideos?.length || plan.youtubeRestVideos?.length) ? (
                <span className="w-2 h-2 rounded-full bg-zinc-400" />
              ) : null}
            </button>

            {/* Create Template Button */}
            <button
              onClick={onOpenCreateTemplateModal}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-zinc-400 stroke-[2.2]" />
              <span>Create Template</span>
            </button>

            {/* Whole Day Routines */}
            <select
              value={selectedDayTemplateId}
              onChange={(e) => {
                const t = dayTemplates.find((tpl) => tpl.id === e.target.value);
                if (t) {
                  handleApplyDayTemplate(t);
                  setSelectedDayTemplateId('');
                }
              }}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="">Load Day Routine...</option>
              {dayTemplates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} ({formatMinutes(tpl.workHoursBudget)})
                </option>
              ))}
            </select>

            <button
              onClick={onSwitchToTracker}
              className="px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <span>View Today</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Ready Task Templates Shelf (Click to Preview & Edit Before Adding) */}
        {taskTemplates.length > 0 && (
          <div className="mt-4 pt-3.5 border-t border-zinc-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1 font-display">
                <Zap className="w-3 h-3 text-zinc-400" />
                <span>Ready Reusable Templates (Click to review & add):</span>
              </span>
              <button
                onClick={onOpenCreateTemplateModal}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 underline font-semibold cursor-pointer"
              >
                Manage Templates
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {taskTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => onSelectTemplate(tpl)}
                  title={`Click to review and customize "${tpl.title}" before adding`}
                  className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer group"
                >
                  <Plus className="w-3 h-3 text-zinc-500 group-hover:text-white" />
                  <span>{tpl.title}</span>
                  <span className="text-[10px] font-mono font-bold text-zinc-500 group-hover:text-zinc-400">
                    {formatMinutes(tpl.plannedDuration)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 24-Hour Day Balance & Dynamic Coupled Pool */}
      <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-display">
                Dynamic 24h Equilibrium
              </span>
              <span className="text-xs text-zinc-400 font-medium">
                8h Sleep • 16h Waking Pool
              </span>
            </div>
            <h3 className="text-sm font-bold font-display text-white mt-1">
              Reactive Time Allocation (Work + Free Time = 16 Hours)
            </h3>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono font-bold">
            <span className="text-zinc-400 flex items-center space-x-1">
              <Moon className="w-3.5 h-3.5 text-zinc-500" />
              <span>Sleep 8h</span>
            </span>
            <span className="text-zinc-600">•</span>
            <span className={`flex items-center space-x-1 ${isWorkOverBudget ? 'text-red-400' : 'text-white'}`}>
              <Briefcase className="w-3.5 h-3.5 text-zinc-300" />
              <span>
                Work {formatMinutes(plan.workHoursBudget)} ({formatMinutes(totalScheduledWorkMinutes)} sched)
              </span>
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-300 flex items-center space-x-1">
              <Coffee className="w-3.5 h-3.5 text-zinc-400" />
              <span>Free {formatMinutes(plan.restHoursBudget)}</span>
            </span>
          </div>
        </div>

        {/* 24-Hour Segmented Proportion Bar */}
        <div className="w-full h-3 rounded-full bg-zinc-900 border border-zinc-800 flex overflow-hidden p-0.5 gap-0.5">
          {/* Sleep Segment (Fixed 8h = 33.3%) */}
          <div 
            className="h-full rounded-sm bg-zinc-800 transition-all"
            style={{ width: `${(480 / 1440) * 100}%` }}
            title="Sleep: 8 hours (33.3%)"
          />
          {/* Work Segment (Dynamic target with nested scheduled fill) */}
          <div 
            className="h-full rounded-sm bg-zinc-800/80 relative overflow-hidden transition-all duration-150 border border-zinc-700/60"
            style={{ width: `${(plan.workHoursBudget / 1440) * 100}%` }}
            title={`Work Target: ${formatMinutes(plan.workHoursBudget)} (Scheduled: ${formatMinutes(totalScheduledWorkMinutes)})`}
          >
            <div 
              className={`h-full transition-all duration-200 ${isWorkOverBudget ? 'bg-red-500' : 'bg-zinc-100'}`}
              style={{ width: `${Math.min(100, workScheduledPercent)}%` }}
            />
          </div>
          {/* Free Time Segment (Dynamic) */}
          <div 
            className="h-full rounded-sm bg-zinc-600 transition-all duration-150"
            style={{ width: `${(plan.restHoursBudget / 1440) * 100}%` }}
            title={`Free Time: ${formatMinutes(plan.restHoursBudget)}`}
          />
        </div>

        <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-xs bg-zinc-800 inline-block border border-zinc-700"></span>
            <span>Sleep: 8h (Locked)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className={`w-2 h-2 rounded-xs inline-block ${isWorkOverBudget ? 'bg-red-500' : 'bg-zinc-100'}`}></span>
            <span className={`font-semibold ${isWorkOverBudget ? 'text-red-400' : 'text-zinc-300'}`}>
              Work: {formatMinutes(plan.workHoursBudget)} ({formatMinutes(totalScheduledWorkMinutes)} scheduled)
            </span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-xs bg-zinc-600 inline-block"></span>
            <span className="text-zinc-400 font-semibold">Free Time: {formatMinutes(plan.restHoursBudget)}</span>
          </span>
        </div>
      </div>

      {/* Target Time Budgets Configuration (Dynamically Coupled with Live Scheduled Progress) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Work Budget Card */}
        <div className={`bg-[#18181b] border rounded-xl p-4 transition-all ${
          isWorkOverBudget 
            ? 'border-red-600/80 shadow-[0_0_20px_rgba(239,68,68,0.18)] bg-gradient-to-b from-[#18181b] to-red-950/25' 
            : 'border-zinc-800'
        }`}>
          <div className="flex justify-between items-start mb-2.5">
            <div>
              <div className="flex items-center space-x-2">
                <Briefcase className={`w-3.5 h-3.5 ${isWorkOverBudget ? 'text-red-400' : 'text-zinc-300'}`} />
                <h3 className="text-xs font-bold font-display uppercase tracking-wider text-zinc-200">
                  Target Work Hours
                </h3>
                {isWorkOverBudget && (
                  <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-red-950 border border-red-700 text-red-300 animate-pulse">
                    ⚠️ +{formatMinutes(workOverBudgetMinutes)} EXCEEDED
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium text-zinc-500 mt-0.5">
                Coupled: automatically leaves <strong className="text-zinc-300 font-mono">{formatMinutes(TOTAL_WAKING_MINUTES - plan.workHoursBudget)}</strong> for free time
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg font-black font-display text-white">
                {formatMinutes(plan.workHoursBudget)}
              </span>
              <span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                Target Work
              </span>
            </div>
          </div>

          {/* Live Scheduled vs Target Work Sub-Box */}
          <div className={`p-3 rounded-lg border mb-3.5 transition-colors ${
            isWorkOverBudget
              ? 'bg-red-950/40 border-red-800/80 text-red-200'
              : 'bg-zinc-900/90 border-zinc-800/90 text-zinc-300'
          }`}>
            <div className="flex justify-between items-center mb-1.5 font-mono text-xs">
              <span className="flex items-center space-x-1">
                <span className="text-zinc-400">Scheduled:</span>
                <strong className={`font-bold ${isWorkOverBudget ? 'text-red-300' : 'text-white'}`}>
                  {formatMinutes(totalScheduledWorkMinutes)}
                </strong>
                <span className="text-zinc-500">/</span>
                <span className="text-zinc-400">{formatMinutes(plan.workHoursBudget)}</span>
              </span>

              <span className="font-bold text-[11px]">
                {isWorkOverBudget ? (
                  <span className="text-red-400 font-mono">+{formatMinutes(workOverBudgetMinutes)} Over Limit</span>
                ) : (
                  <span className="text-emerald-400 font-mono">{formatMinutes(remainingWorkToSchedule)} left to schedule</span>
                )}
              </span>
            </div>

            {/* Scheduled Progress Bar */}
            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden border border-zinc-700/60 my-2">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  isWorkOverBudget 
                    ? 'bg-red-500' 
                    : workScheduledPercent >= 100 
                      ? 'bg-emerald-400' 
                      : workScheduledPercent >= 75 
                        ? 'bg-zinc-200' 
                        : 'bg-zinc-300'
                }`}
                style={{ width: `${Math.min(100, workScheduledPercent)}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[10px] font-medium pt-0.5">
              <span className="text-zinc-400">
                {workScheduledPercent}% of target planned ({plan.tasks.length} {plan.tasks.length === 1 ? 'task' : 'tasks'}
                {totalWorkVideoMinutes > 0 ? `, ${formatMinutes(totalWorkVideoMinutes)} videos` : ''})
              </span>
              
              {isWorkOverBudget ? (
                <button
                  type="button"
                  onClick={handleAutoExpandWorkTarget}
                  className="text-[10px] font-bold text-red-300 hover:text-white underline cursor-pointer"
                >
                  Expand target to {formatMinutes(totalScheduledWorkMinutes)}
                </button>
              ) : (
                <span className="text-zinc-500">
                  {remainingWorkToSchedule === 0 
                    ? '✓ Schedule complete' 
                    : `${formatMinutes(remainingWorkToSchedule)} remaining to reach ${formatMinutes(plan.workHoursBudget)}`}
                </span>
              )}
            </div>
          </div>

          <input
            type="range"
            min="60"
            max="900"
            step="30"
            value={plan.workHoursBudget}
            onChange={(e) => handleWorkBudgetChange(Number(e.target.value))}
            className="w-full accent-zinc-200 cursor-pointer"
          />

          <div className="flex items-center space-x-1 mt-2.5">
            {[240, 360, 420, 480, 540, 600, 720].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => handleWorkBudgetChange(mins)}
                className={`flex-1 py-1 text-[11px] font-mono font-bold rounded border transition-colors cursor-pointer ${
                  plan.workHoursBudget === mins
                    ? 'bg-zinc-800 border-zinc-500 text-white shadow-xs'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {mins / 60}h
              </button>
            ))}
          </div>
        </div>

        {/* Free Time / Rest Budget Card */}
        <div className={`bg-[#18181b] border rounded-xl p-4 transition-all ${
          isFreeTimeOverBudget 
            ? 'border-red-600/80 shadow-[0_0_20px_rgba(239,68,68,0.18)] bg-gradient-to-b from-[#18181b] to-red-950/25' 
            : 'border-zinc-800'
        }`}>
          <div className="flex justify-between items-start mb-2.5">
            <div>
              <div className="flex items-center space-x-1.5">
                <Coffee className={`w-3.5 h-3.5 ${isFreeTimeOverBudget ? 'text-red-400' : 'text-zinc-300'}`} />
                <h3 className="text-xs font-bold font-display uppercase tracking-wider text-zinc-200">
                  Target Free Time (Rest Pool)
                </h3>
                {isFreeTimeOverBudget && (
                  <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-red-950 border border-red-700 text-red-300 animate-pulse">
                    ⚠️ OVER
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium text-zinc-500 mt-0.5">
                Coupled: automatically leaves <strong className="text-zinc-300 font-mono">{formatMinutes(TOTAL_WAKING_MINUTES - plan.restHoursBudget)}</strong> for work
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg font-black font-display text-white">
                {formatMinutes(plan.restHoursBudget)}
              </span>
              <span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                Target Free Time
              </span>
            </div>
          </div>

          {/* Live Free Time Progress Sub-Box */}
          <div className={`p-3 rounded-lg border mb-3.5 transition-colors ${
            isFreeTimeOverBudget
              ? 'bg-red-950/40 border-red-800/80 text-red-200'
              : 'bg-zinc-900/90 border-zinc-800/90 text-zinc-300'
          }`}>
            <div className="flex justify-between items-center mb-1.5 font-mono text-xs">
              <span className="flex items-center space-x-1">
                <span className="text-zinc-400">Entertainment Videos:</span>
                <strong className={`font-bold ${isFreeTimeOverBudget ? 'text-red-300' : 'text-white'}`}>
                  {formatMinutes(totalRestVideoMinutes)}
                </strong>
                <span className="text-zinc-500">/</span>
                <span className="text-zinc-400">{formatMinutes(plan.restHoursBudget)}</span>
              </span>

              <span className="font-bold text-[11px]">
                {isFreeTimeOverBudget ? (
                  <span className="text-red-400 font-mono">+{formatMinutes(freeTimeOverBudgetMinutes)} Exceeded</span>
                ) : (
                  <span className="text-zinc-300 font-mono">{formatMinutes(remainingFreeTimeToSchedule)} unreserved</span>
                )}
              </span>
            </div>

            {/* Visual Free Time Progress Bar */}
            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden border border-zinc-700/60 my-2">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  isFreeTimeOverBudget ? 'bg-red-500' : 'bg-zinc-400'
                }`}
                style={{ width: `${Math.min(100, Math.round((totalRestVideoMinutes / (plan.restHoursBudget || 1)) * 100))}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[10px] font-medium pt-0.5">
              <span className="text-zinc-400">
                {Math.round((totalRestVideoMinutes / (plan.restHoursBudget || 1)) * 100)}% reserved for entertainment videos
              </span>
              <span className="text-zinc-500">
                {formatMinutes(remainingFreeTimeToSchedule)} unallocated idle rest pool
              </span>
            </div>
          </div>

          <input
            type="range"
            min="60"
            max="900"
            step="30"
            value={plan.restHoursBudget}
            onChange={(e) => handleRestBudgetChange(Number(e.target.value))}
            className="w-full accent-zinc-200 cursor-pointer"
          />

          <div className="flex items-center space-x-1 mt-2.5">
            {[240, 360, 420, 480, 540, 600, 720].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => handleRestBudgetChange(mins)}
                className={`flex-1 py-1 text-[11px] font-mono font-bold rounded border transition-colors cursor-pointer ${
                  plan.restHoursBudget === mins
                    ? 'bg-zinc-800 border-zinc-500 text-white shadow-xs'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {mins / 60}h
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Dynamic Schedule Alert & Status Banner */}
      <div className={`p-4 rounded-xl border transition-all ${
        isWorkOverBudget 
          ? 'bg-[#201111] border-red-700 text-red-200 shadow-md' 
          : 'bg-[#18181b] border-zinc-800 text-zinc-300'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
              isWorkOverBudget 
                ? 'bg-red-900/60 text-red-400 border border-red-700/80 animate-pulse' 
                : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
            }`}>
              {isWorkOverBudget ? (
                <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-xs font-bold font-display uppercase tracking-wider text-white">
                  {isWorkOverBudget ? 'Target Work Time Exceeded' : 'Daily Schedule Balance'}
                </h4>
                {isWorkOverBudget && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-red-950 border border-red-700 text-red-300">
                    +{formatMinutes(workOverBudgetMinutes)} OVER BUDGET
                  </span>
                )}
              </div>

              <div className="text-xs mt-0.5">
                {isWorkOverBudget ? (
                  <p className="text-red-300 font-medium">
                    You scheduled <strong className="font-mono text-white font-bold">{formatMinutes(totalScheduledWorkMinutes)}</strong> of work, exceeding your <strong className="font-mono text-white font-bold">{formatMinutes(plan.workHoursBudget)}</strong> target by <strong className="font-mono text-red-200 underline font-bold">+{formatMinutes(workOverBudgetMinutes)}</strong>. Shorten some tasks or click the button to increase your work target.
                  </p>
                ) : (
                  <p className="text-zinc-400">
                    Scheduled: <strong className="font-mono text-white font-bold">{formatMinutes(totalScheduledWorkMinutes)}</strong> of <strong className="font-mono text-zinc-200">{formatMinutes(plan.workHoursBudget)}</strong> target. You still have <strong className="font-mono text-emerald-400 font-bold">{formatMinutes(remainingWorkToSchedule)}</strong> left to schedule.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action / Count */}
          {isWorkOverBudget ? (
            <button
              type="button"
              onClick={handleAutoExpandWorkTarget}
              className="px-3.5 py-1.5 bg-red-900/80 hover:bg-red-800 text-white rounded-lg text-xs font-bold border border-red-600 transition-colors shrink-0 flex items-center space-x-1 cursor-pointer shadow-sm"
            >
              <span>Increase Target to {formatMinutes(totalScheduledWorkMinutes)}</span>
            </button>
          ) : (
            <div className="text-right font-mono text-xs font-semibold text-zinc-500 shrink-0 hidden sm:block">
              {plan.tasks.length} {plan.tasks.length === 1 ? 'task' : 'tasks'} scheduled
            </div>
          )}
        </div>
      </div>

      {/* Manual Add Task Form */}
      <form onSubmit={handleAddTask} className="bg-[#18181b] border border-zinc-800 rounded-xl p-4 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-zinc-800/80">
          <h3 className="text-xs font-bold font-display uppercase tracking-wider text-zinc-200 flex items-center space-x-1.5">
            <Plus className="w-3.5 h-3.5 text-zinc-400 stroke-[2.5]" />
            <span>Add Custom Task</span>
          </h3>

          {/* Quick template selector dropdown in header */}
          {taskTemplates.length > 0 && (
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-semibold text-zinc-400">Load Template:</span>
              <select
                defaultValue=""
                onChange={(e) => {
                  const tpl = taskTemplates.find((t) => t.id === e.target.value);
                  if (tpl) handleSelectTemplateIntoForm(tpl);
                  e.target.value = '';
                }}
                className="bg-zinc-900 border border-zinc-700 hover:border-zinc-500 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:outline-none font-medium cursor-pointer"
              >
                <option value="" disabled>⚡ Select a template to autofill...</option>
                {taskTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({formatMinutes(t.plannedDuration)})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-zinc-300">
                Task Title *
              </label>

              {taskTemplates.length > 0 && (
                <div className="flex items-center space-x-1">
                  <span className="text-[10px] text-zinc-500 font-medium">Or choose template:</span>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const tpl = taskTemplates.find((t) => t.id === e.target.value);
                      if (tpl) handleSelectTemplateIntoForm(tpl);
                      e.target.value = '';
                    }}
                    className="bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-300 text-[11px] rounded px-2 py-0.5 focus:outline-none cursor-pointer font-medium"
                  >
                    <option value="" disabled>⚡ Select template...</option>
                    {taskTemplates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.title} ({formatMinutes(tpl.plannedDuration)})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                required
                list="task-templates-autocomplete"
                placeholder="e.g. Physics Problem Set 4"
                value={taskTitle}
                onChange={(e) => {
                  const val = e.target.value;
                  setTaskTitle(val);
                  const match = taskTemplates.find((t) => t.title.toLowerCase() === val.toLowerCase());
                  if (match) {
                    handleSelectTemplateIntoForm(match);
                  }
                }}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white font-medium placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />

              <datalist id="task-templates-autocomplete">
                {taskTemplates.map((tpl) => (
                  <option key={tpl.id} value={tpl.title}>
                    {formatMinutes(tpl.plannedDuration)} • {tpl.priority} priority
                  </option>
                ))}
              </datalist>
            </div>

            {loadedTemplateTitle && (
              <p className="text-[10px] text-emerald-400 font-mono font-medium mt-1 flex items-center space-x-1">
                <span>✓ Autofilled from template: <strong>{loadedTemplateTitle}</strong></span>
              </p>
            )}
          </div>

          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-zinc-300 mb-1">
              Duration (minutes)
            </label>
            <div className="flex items-center space-x-1">
              <input
                type="number"
                min="5"
                max="360"
                value={taskDuration}
                onChange={(e) => setTaskDuration(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none font-mono font-bold"
              />
              <div className="flex space-x-1">
                {[20, 30, 45, 60].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setTaskDuration(d)}
                    className="px-1.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded text-[10px] font-mono font-bold cursor-pointer"
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-zinc-300 mb-1">
              Start Time (optional)
            </label>
            <input
              type="time"
              value={taskStartTime}
              onChange={(e) => setTaskStartTime(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-zinc-300 mb-1">
            Descriptive Notes (What homework questions? Which concepts to learn?)
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Exercises 12 to 24 on page 110. Review lecture formula before starting."
            value={taskNotes}
            onChange={(e) => setTaskNotes(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-200 font-medium placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none leading-relaxed"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] text-zinc-400 font-bold">Priority:</span>
            {(['essential', 'normal', 'flexible'] as PriorityLevel[]).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setTaskPriority(lvl)}
                className={`px-2.5 py-1 rounded text-xs font-bold capitalize border transition-colors cursor-pointer ${
                  taskPriority === lvl
                    ? 'bg-zinc-800 text-white border-zinc-600'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-lg text-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Task</span>
          </button>
        </div>
      </form>

      {/* Scheduled Tasks List */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold font-display uppercase tracking-wider text-zinc-300 flex items-center justify-between">
          <span>Scheduled Tasks for this Day ({plan.tasks.length})</span>
          <span className="text-[11px] font-normal text-zinc-500 font-sans">Order of execution</span>
        </h3>

        {plan.tasks.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30 text-xs text-zinc-500">
            No tasks in schedule yet. Pick a ready template above or add a task manually.
          </div>
        ) : (
          plan.tasks.map((task, idx) => (
            <div
              key={task.id}
              className="bg-[#18181b] border border-zinc-800 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start space-x-2.5 flex-1 min-w-0">
                <div className="flex flex-col space-y-0.5 pt-0.5">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveTask(idx, 'up')}
                    className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer text-[9px] font-bold"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={idx === plan.tasks.length - 1}
                    onClick={() => handleMoveTask(idx, 'down')}
                    className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer text-[9px] font-bold"
                  >
                    ▼
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {task.scheduledStartTime && (
                      <span className="text-[11px] font-mono font-bold px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
                        {task.scheduledStartTime}
                      </span>
                    )}
                    <h4 className="text-sm font-bold text-white truncate">{task.title}</h4>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                      {formatMinutes(task.plannedDuration)}
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 capitalize">
                      {task.priority}
                    </span>
                  </div>

                  {task.notes && (
                    <p 
                      onClick={() => onOpenNotes(task)}
                      className="text-[11px] text-zinc-400 font-medium line-clamp-1 cursor-pointer hover:text-white transition-colors"
                    >
                      <span className="text-zinc-500 font-bold">Notes:</span> {task.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Task Action Buttons */}
              <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
                
                {/* Save as Template Button */}
                <button
                  type="button"
                  onClick={() => handleSaveAsTemplateClick(task)}
                  title="Save this task as a reusable template for other days"
                  className="px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/80 text-[11px] font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  {savedFeedbackId === task.id ? (
                    <>
                      <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Saved!</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Save as Template</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onOpenNotes(task)}
                  title="View Notes"
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/80 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteTask(task.id)}
                  title="Delete"
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 border border-zinc-700/80 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
