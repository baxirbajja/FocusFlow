import React from 'react';
import { Bell, CheckCircle2, Clock } from 'lucide-react';
import { Task } from '../types';
import { formatMinutes } from '../utils/storage';

interface TaskOverModalProps {
  task: Task | null;
  isOpen: boolean;
  onComplete: (taskId: string) => void;
  onExtend: (taskId: string, extraMins: number) => void;
  onClose: () => void;
}

export const TaskOverModal: React.FC<TaskOverModalProps> = ({
  task,
  isOpen,
  onComplete,
  onExtend,
}) => {
  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-sm p-5 text-center">
        
        <div className="w-10 h-10 mx-auto rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 mb-3">
          <Bell className="w-5 h-5" />
        </div>

        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
          Duration Elapsed
        </span>

        <h3 className="text-base font-bold text-zinc-100 mt-2 mb-1">
          {task.title}
        </h3>
        <p className="text-xs text-zinc-400 mb-5">
          Planned time of <strong className="text-zinc-200 font-mono">{formatMinutes(task.plannedDuration)}</strong> has elapsed. Did you finish, or need more time?
        </p>

        {/* Action 1: Complete */}
        <button
          onClick={() => onComplete(task.id)}
          className="w-full py-2.5 bg-zinc-200 hover:bg-white text-zinc-950 font-semibold rounded-lg text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer mb-3"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Mark as Completed</span>
        </button>

        {/* Action 2: Extend */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-left">
          <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-zinc-300 mb-1">
            <Clock className="w-3 h-3 text-zinc-400" />
            <span>Need more time? (Auto-shifts schedule)</span>
          </div>
          <p className="text-[10px] text-zinc-500 mb-2.5">
            Later tasks will automatically be shifted forward to match.
          </p>

          <div className="grid grid-cols-4 gap-1.5">
            {[5, 10, 15, 30].map((mins) => (
              <button
                key={mins}
                onClick={() => onExtend(task.id, mins)}
                className="py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 font-mono text-xs font-medium transition-colors cursor-pointer"
              >
                +{mins}m
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
