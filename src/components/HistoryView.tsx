import React from 'react';
import { Calendar, Briefcase, Coffee, CheckCircle2, ChevronRight } from 'lucide-react';
import { getAllSavedDates, loadDayPlan, formatFriendlyDate, formatSeconds, formatMinutes } from '../utils/storage';

interface HistoryViewProps {
  onSelectDate: (date: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onSelectDate }) => {
  const dates = getAllSavedDates();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-zinc-400" />
          <span>Past Days History</span>
        </h2>
        <p className="text-xs text-zinc-400">
          Review your actual work time logged vs rest consumed.
        </p>
      </div>

      {dates.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30 text-xs text-zinc-500">
          No records yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {dates.map((dateStr) => {
            const plan = loadDayPlan(dateStr);
            const completedCount = plan.tasks.filter((t) => t.status === 'completed').length;
            const restExceeded = plan.usedRestSeconds > plan.restHoursBudget * 60;

            return (
              <div
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                className="bg-[#18181b] border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors">
                      {formatFriendlyDate(dateStr)}
                    </h3>
                    <span className="text-[10px] font-mono text-zinc-500">{dateStr}</span>
                  </div>

                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-zinc-400" />
                    <span>{completedCount}/{plan.tasks.length} Done</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-2.5">
                  <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                    <div className="flex items-center space-x-1 text-zinc-500 text-[10px] mb-0.5">
                      <Briefcase className="w-3 h-3" />
                      <span>Work</span>
                    </div>
                    <div className="font-mono font-semibold text-zinc-200 text-xs">
                      {formatSeconds(plan.usedWorkSeconds)}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      Target: {formatMinutes(plan.workHoursBudget)}
                    </div>
                  </div>

                  <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                    <div className="flex items-center space-x-1 text-zinc-500 text-[10px] mb-0.5">
                      <Coffee className="w-3 h-3" />
                      <span>Rest</span>
                    </div>
                    <div className={`font-mono font-semibold text-xs ${
                      restExceeded ? 'text-red-400' : 'text-zinc-200'
                    }`}>
                      {formatSeconds(plan.usedRestSeconds)}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {restExceeded ? 'Exceeded' : `Pool: ${formatMinutes(plan.restHoursBudget)}`}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end items-center text-[11px] text-zinc-500 group-hover:text-zinc-300 transition-colors">
                  <span>Inspect</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
