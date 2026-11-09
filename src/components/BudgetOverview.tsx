import React from 'react';
import { Briefcase, Coffee, AlertCircle } from 'lucide-react';
import { DayPlan } from '../types';
import { formatMinutes, formatSeconds } from '../utils/storage';

interface BudgetOverviewProps {
  plan: DayPlan;
}

export const BudgetOverview: React.FC<BudgetOverviewProps> = ({ plan }) => {
  const workBudgetSec = plan.workHoursBudget * 60;
  const restBudgetSec = plan.restHoursBudget * 60;

  const usedWorkSec = plan.usedWorkSeconds;
  const usedRestSec = plan.usedRestSeconds;

  const workPercent = Math.min(100, Math.round((usedWorkSec / (workBudgetSec || 1)) * 100));
  const restPercent = Math.round((usedRestSec / (restBudgetSec || 1)) * 100);

  const remainingWorkSec = Math.max(0, workBudgetSec - usedWorkSec);
  const remainingRestSec = restBudgetSec - usedRestSec;

  const isRestExceeded = remainingRestSec < 0;
  const isWorking = !!plan.activeTaskId;
  const isResting = plan.isDayStarted && !plan.activeTaskId;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
      
      {/* 1. Work Time Budget */}
      <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-200">
              <Briefcase className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-xs font-bold font-display uppercase tracking-wider text-zinc-200">Daily Work Budget</h3>
              <p className="text-[11px] font-medium text-zinc-500">Target: {formatMinutes(plan.workHoursBudget)}</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xl font-black font-display tracking-tight text-white">
              {formatSeconds(usedWorkSec)}
            </span>
            <div className="text-[10px] font-semibold text-zinc-500">
              {workPercent}% completed
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-zinc-800 mb-2.5">
          <div
            className="h-full rounded-full bg-zinc-300 transition-all duration-300"
            style={{ width: `${workPercent}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-xs text-zinc-400">
          <span className="text-[11px] font-medium">Remaining: <strong className="text-zinc-100 font-bold font-mono">{formatSeconds(remainingWorkSec)}</strong></span>
          {isWorking ? (
            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold uppercase tracking-wider">
              Tracking Work
            </span>
          ) : (
            <span className="text-zinc-600 text-[11px] font-medium">Paused</span>
          )}
        </div>
      </div>

      {/* 2. Rest / Idle Budget */}
      <div className={`border rounded-xl p-4 transition-colors ${
        isRestExceeded 
          ? 'bg-[#1e1515] border-red-900/60' 
          : isResting 
            ? 'bg-[#1c1a17] border-amber-900/40' 
            : 'bg-[#18181b] border-zinc-800'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
              isRestExceeded 
                ? 'bg-red-950/80 border-red-900 text-red-300' 
                : 'bg-zinc-800 border-zinc-700/60 text-zinc-200'
            }`}>
              <Coffee className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xs font-bold font-display uppercase tracking-wider text-zinc-200">Rest & Leisure Pool</h3>
                {isRestExceeded && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-800">
                    Over Limit
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium text-zinc-500">Allowed: {formatMinutes(plan.restHoursBudget)}</p>
            </div>
          </div>

          <div className="text-right">
            <span className={`text-xl font-black font-display tracking-tight ${
              isRestExceeded ? 'text-red-400' : 'text-white'
            }`}>
              {formatSeconds(usedRestSec)}
            </span>
            <div className="text-[10px] font-semibold text-zinc-500">
              {restPercent}% used
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-zinc-800 mb-2.5">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isRestExceeded
                ? 'bg-red-500'
                : isResting
                  ? 'bg-amber-600'
                  : 'bg-zinc-500'
            }`}
            style={{ width: `${Math.min(100, restPercent)}%` }}
          />
        </div>

        {/* Status Line */}
        <div className="flex justify-between items-center text-xs">
          <div>
            {isRestExceeded ? (
              <span className="text-red-400 text-[11px] font-bold flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                <span>Exceeded by +{formatSeconds(Math.abs(remainingRestSec))}</span>
              </span>
            ) : (
              <span className="text-zinc-400 text-[11px] font-medium">
                Rest remaining: <strong className="text-zinc-100 font-bold font-mono">{formatSeconds(remainingRestSec)}</strong>
              </span>
            )}
          </div>

          <div>
            {isResting ? (
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60 font-bold uppercase tracking-wider">
                Rest Burning (Idle)
              </span>
            ) : isWorking ? (
              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-bold uppercase tracking-wider">
                Rest Paused
              </span>
            ) : (
              <span className="text-zinc-600 text-[11px] font-medium">Not started</span>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
