import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Plus, 
  Settings2,
  BookmarkPlus,
  BookmarkCheck,
  Zap,
  Tv,
  Briefcase,
  Coffee
} from 'lucide-react';
import { DayPlan, Task, PriorityLevel, TaskTemplate, YouTubeVideo } from '../types';
import { formatMinutes, formatSeconds } from '../utils/storage';

interface DayTrackerProps {
  plan: DayPlan;
  onStartTask: (taskId: string) => void;
  onPauseTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onOpenNotes: (task: Task) => void;
  onQuickAddTask: (title: string, duration: number, priority: PriorityLevel) => void;
  onGoToPlanner: () => void;
  taskTemplates?: TaskTemplate[];
  onSelectTemplate?: (tpl: TaskTemplate) => void;
  onSaveTaskAsTemplate?: (task: Task) => void;
  onOpenScheduleYouTubeModal?: () => void;
  onPlayVideo?: (video: YouTubeVideo) => void;
}

export const DayTracker: React.FC<DayTrackerProps> = ({
  plan,
  onStartTask,
  onPauseTask,
  onCompleteTask,
  onOpenNotes,
  onQuickAddTask,
  onGoToPlanner,
  taskTemplates = [],
  onSelectTemplate,
  onSaveTaskAsTemplate,
  onOpenScheduleYouTubeModal,
  onPlayVideo,
}) => {
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDuration, setQuickDuration] = useState(30);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [savedFeedbackId, setSavedFeedbackId] = useState<string | null>(null);

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    onQuickAddTask(quickTitle.trim(), quickDuration, 'normal');
    setQuickTitle('');
    setShowQuickAdd(false);
  };

  const handleSaveAsTemplate = (task: Task) => {
    if (onSaveTaskAsTemplate) {
      onSaveTaskAsTemplate(task);
      setSavedFeedbackId(task.id);
      setTimeout(() => {
        setSavedFeedbackId(null);
      }, 1500);
    }
  };

  const completedTasks = plan.tasks.filter((t) => t.status === 'completed');

  return (
    <div className="space-y-4">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
        <div>
          <h2 className="text-sm font-bold font-display uppercase tracking-wider text-white flex items-center space-x-2">
            <span>Today's Execution Timeline</span>
            <span className="text-xs font-semibold text-zinc-500 font-sans">
              ({completedTasks.length}/{plan.tasks.length} Completed)
            </span>
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          {onOpenScheduleYouTubeModal && (
            <button
              onClick={onOpenScheduleYouTubeModal}
              className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold border border-zinc-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Tv className="w-3.5 h-3.5 text-zinc-400 stroke-[2.2]" />
              <span>YouTube</span>
              {(plan.youtubeWorkVideos?.length || plan.youtubeRestVideos?.length) ? (
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
              ) : null}
            </button>
          )}
          <button
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-400 stroke-[2.5]" />
            <span>Quick Task</span>
          </button>
          <button
            onClick={onGoToPlanner}
            className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>Edit Schedule</span>
          </button>
        </div>
      </div>

      {/* Quick Add Form Drawer */}
      {showQuickAdd && (
        <div className="bg-[#18181b] border border-zinc-700 rounded-xl p-3 space-y-3">
          <form onSubmit={handleQuickAddSubmit} className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Task title (e.g., Read history chapter 4)..."
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              className="flex-1 min-w-[200px] bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 font-medium focus:outline-none focus:border-zinc-500"
              autoFocus
            />
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-semibold text-zinc-400">Duration:</span>
              <select
                value={quickDuration}
                onChange={(e) => setQuickDuration(Number(e.target.value))}
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-bold text-zinc-200 focus:outline-none"
              >
                <option value={15}>15 mins</option>
                <option value={20}>20 mins</option>
                <option value={25}>25 mins</option>
                <option value={30}>30 mins</option>
                <option value={45}>45 mins</option>
                <option value={60}>60 mins</option>
                <option value={90}>90 mins</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowQuickAdd(false)}
              className="px-2.5 py-1.5 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </form>

          {/* Quick Add from Templates (Click to customize & add) */}
          {taskTemplates.length > 0 && onSelectTemplate && (
            <div className="pt-2 border-t border-zinc-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5 font-display">
                Or select a template (review & add):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {taskTemplates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      onSelectTemplate(tpl);
                      setShowQuickAdd(false);
                    }}
                    className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-[11px] font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5 text-zinc-500" />
                    <span>{tpl.title}</span>
                    <span className="font-mono text-[9px] text-zinc-500">
                      {formatMinutes(tpl.plannedDuration)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scheduled YouTube Playlists Bar (if videos exist) */}
      {(((plan.youtubeWorkVideos && plan.youtubeWorkVideos.length > 0) || (plan.youtubeRestVideos && plan.youtubeRestVideos.length > 0))) && (
        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center space-x-1.5 font-display">
              <Tv className="w-3.5 h-3.5 text-zinc-400 stroke-[2.2]" />
              <span>Scheduled YouTube Videos</span>
            </span>
            {onOpenScheduleYouTubeModal && (
              <button
                onClick={onOpenScheduleYouTubeModal}
                className="text-[10px] font-bold text-zinc-400 hover:text-white underline cursor-pointer"
              >
                Manage Queue
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Work Videos Thumbnail Gallery */}
            <div className="bg-zinc-900/80 rounded-xl p-2.5 border border-zinc-800">
              <div className="text-[10px] font-bold uppercase text-zinc-400 flex items-center justify-between mb-2 font-display">
                <span className="flex items-center space-x-1">
                  <Briefcase className="w-3 h-3 text-zinc-400" />
                  <span>Study Queue ({plan.youtubeWorkVideos?.length || 0})</span>
                </span>
              </div>
              {plan.youtubeWorkVideos && plan.youtubeWorkVideos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {plan.youtubeWorkVideos.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => onPlayVideo && onPlayVideo(v)}
                      className="group relative bg-[#18181b] border border-zinc-800 hover:border-zinc-500 rounded-lg overflow-hidden transition-all cursor-pointer aspect-video"
                      title={v.title}
                    >
                      <img
                        src={`https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`}
                        alt={v.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute bottom-1 right-1 bg-black/85 text-white text-[9px] font-mono font-bold px-1 py-0.2 rounded border border-white/10">
                        {formatMinutes(v.durationMinutes)}
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play className="w-3.5 h-3.5 text-white fill-current" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-[10px] text-zinc-600 block py-1">No study videos scheduled.</span>
              )}
            </div>

            {/* Rest Videos Thumbnail Gallery */}
            <div className="bg-zinc-900/80 rounded-xl p-2.5 border border-zinc-800">
              <div className="text-[10px] font-bold uppercase text-zinc-400 flex items-center justify-between mb-2 font-display">
                <span className="flex items-center space-x-1">
                  <Coffee className="w-3 h-3 text-zinc-400" />
                  <span>Entertainment Queue ({plan.youtubeRestVideos?.length || 0})</span>
                </span>
              </div>
              {plan.youtubeRestVideos && plan.youtubeRestVideos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {plan.youtubeRestVideos.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => onPlayVideo && onPlayVideo(v)}
                      className="group relative bg-[#18181b] border border-zinc-800 hover:border-zinc-500 rounded-lg overflow-hidden transition-all cursor-pointer aspect-video"
                      title={v.title}
                    >
                      <img
                        src={`https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`}
                        alt={v.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute bottom-1 right-1 bg-black/85 text-white text-[9px] font-mono font-bold px-1 py-0.2 rounded border border-white/10">
                        {formatMinutes(v.durationMinutes)}
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play className="w-3.5 h-3.5 text-white fill-current" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-[10px] text-zinc-600 block py-1">No entertainment videos scheduled.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {plan.tasks.length === 0 ? (
        <div className="text-center py-12 px-4 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
          <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-zinc-200 mb-1">No tasks scheduled for today</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-4 font-normal">
            Plan your schedule or pick a ready task template to begin.
          </p>
          <button
            onClick={onGoToPlanner}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg text-xs font-bold border border-zinc-700 transition-colors cursor-pointer"
          >
            Plan Day Schedule
          </button>
        </div>
      ) : (
        /* Task Cards */
        <div className="space-y-2.5">
          {plan.tasks.map((task) => {
            const isRunning = task.id === plan.activeTaskId;
            const isCompleted = task.status === 'completed';
            const targetSeconds = task.plannedDuration * 60;
            const spentPercent = Math.min(100, Math.round((task.actualDuration / (targetSeconds || 1)) * 100));

            return (
              <div
                key={task.id}
                className={`border rounded-xl p-3.5 transition-colors ${
                  isRunning
                    ? 'bg-[#18181b] border-zinc-600'
                    : isCompleted
                      ? 'bg-zinc-900/40 border-zinc-800/60 opacity-60'
                      : 'bg-[#18181b] border-zinc-800/90 hover:border-zinc-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  
                  {/* Left: Info */}
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <button
                      onClick={() => {
                        if (!isCompleted) onCompleteTask(task.id);
                      }}
                      title={isCompleted ? 'Completed' : 'Mark complete'}
                      className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                        isCompleted
                          ? 'bg-zinc-200 border-zinc-200 text-zinc-950'
                          : isRunning
                            ? 'border-zinc-400 bg-zinc-800 text-zinc-200'
                            : 'border-zinc-700 hover:border-zinc-500 text-transparent'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {task.scheduledStartTime && (
                          <span className="text-[11px] font-mono font-bold px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
                            {task.scheduledStartTime}
                          </span>
                        )}
                        <h3 className={`text-sm font-bold truncate ${
                          isCompleted ? 'line-through text-zinc-500' : 'text-white'
                        }`}>
                          {task.title}
                        </h3>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 capitalize">
                          {task.priority}
                        </span>
                      </div>

                      {task.notes ? (
                        <p 
                          onClick={() => onOpenNotes(task)}
                          className="text-[11px] text-zinc-400 font-medium line-clamp-1 cursor-pointer hover:text-white transition-colors"
                        >
                          <span className="text-zinc-500 font-bold">Notes:</span> {task.notes}
                        </p>
                      ) : (
                        <button
                          onClick={() => onOpenNotes(task)}
                          className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center space-x-1 cursor-pointer font-medium"
                        >
                          <FileText className="w-2.5 h-2.5" />
                          <span>Add notes</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right: Duration, Template Save, & Actions */}
                  <div className="flex items-center space-x-2.5 self-end sm:self-center shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-zinc-200">
                        {formatSeconds(task.actualDuration)} / {formatMinutes(task.plannedDuration)}
                      </div>
                      <div className="text-[10px] font-semibold text-zinc-500">
                        {isCompleted ? 'Done' : `${spentPercent}%`}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      {onSaveTaskAsTemplate && (
                        <button
                          type="button"
                          onClick={() => handleSaveAsTemplate(task)}
                          title="Save this task as a reusable template"
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/80 transition-colors cursor-pointer"
                        >
                          {savedFeedbackId === task.id ? (
                            <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <BookmarkPlus className="w-3.5 h-3.5 text-zinc-400" />
                          )}
                        </button>
                      )}

                      <button
                        onClick={() => onOpenNotes(task)}
                        title="Notes"
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>

                      {!isCompleted && (
                        isRunning ? (
                          <button
                            onClick={() => onPauseTask(task.id)}
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                          >
                            <Pause className="w-3.5 h-3.5" />
                            <span>Pause</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onStartTask(task.id)}
                            className="px-4 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Start</span>
                          </button>
                        )
                      )}
                    </div>

                  </div>

                </div>

                {/* Micro Progress */}
                {!isCompleted && (
                  <div className="w-full bg-zinc-900 rounded-full h-1 overflow-hidden border border-zinc-800/80 mt-2.5">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isRunning ? 'bg-zinc-300' : 'bg-zinc-700'
                      }`}
                      style={{ width: `${spentPercent}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
