import { useState, useEffect, useRef, useCallback } from 'react';
import { DayPlan, Task, YouTubeVideo } from '../types';
import { saveDayPlan, rebalanceTaskSchedule, getFormattedDate } from '../utils/storage';
import { soundManager } from '../utils/audio';
import { sendDesktopNotification } from '../utils/notifications';

interface UseTimerEngineProps {
  currentPlan: DayPlan;
  setCurrentPlan: React.Dispatch<React.SetStateAction<DayPlan>>;
  isToday: boolean;
  onOfflineSleepDetected?: (elapsedSeconds: number) => void;
  activePlayingVideo?: YouTubeVideo | null;
}

export function useTimerEngine({
  currentPlan,
  setCurrentPlan,
  isToday,
  onOfflineSleepDetected,
  activePlayingVideo,
}: UseTimerEngineProps) {
  const [taskOverModalTask, setTaskOverModalTask] = useState<Task | null>(null);
  const [hasAlertedTaskOver, setHasAlertedTaskOver] = useState<Record<string, boolean>>({});
  const lastRestWarningTimestamp = useRef<number>(0);
  const lastTickTime = useRef<number>(Date.now());

  // Reference for stable state during 1-sec intervals
  const planRef = useRef<DayPlan>(currentPlan);
  useEffect(() => {
    planRef.current = currentPlan;
  }, [currentPlan]);

  const activePlayingVideoRef = useRef<YouTubeVideo | null | undefined>(activePlayingVideo);
  useEffect(() => {
    activePlayingVideoRef.current = activePlayingVideo;
  }, [activePlayingVideo]);

  // Main 1-Second Timer Heartbeat
  useEffect(() => {
    if (!isToday) return;

    const interval = setInterval(() => {
      const plan = planRef.current;
      if (!plan.isDayStarted) return;

      const nowMs = Date.now();
      const deltaMs = nowMs - lastTickTime.current;
      lastTickTime.current = nowMs;

      // If PC woke up from sleep / laptop opened after 45+ seconds of suspension
      if (deltaMs > 45000 && onOfflineSleepDetected) {
        onOfflineSleepDetected(Math.floor(deltaMs / 1000));
        return;
      }

      const restBudgetSec = plan.restHoursBudget * 60;
      const playingVideo = activePlayingVideoRef.current;

      // Case 1: Active Task is running
      if (plan.activeTaskId) {
        const activeTaskId = plan.activeTaskId;
        let triggeredOver = false;
        let currentTaskObj: Task | null = null;

        const updatedTasks = plan.tasks.map((task) => {
          if (task.id === activeTaskId && task.status === 'in_progress') {
            const newActual = task.actualDuration + 1;
            const targetSec = task.plannedDuration * 60;
            currentTaskObj = { ...task, actualDuration: newActual };

            // Check if duration reached and hasn't alerted yet
            if (newActual >= targetSec && !hasAlertedTaskOver[task.id]) {
              triggeredOver = true;
            }

            return currentTaskObj;
          }
          return task;
        });

        const updatedPlan: DayPlan = {
          ...plan,
          tasks: updatedTasks,
          usedWorkSeconds: plan.usedWorkSeconds + 1,
          lastHeartbeatTimestamp: new Date().toISOString(),
        };

        setCurrentPlan(updatedPlan);
        saveDayPlan(updatedPlan);

        if (triggeredOver && currentTaskObj) {
          setHasAlertedTaskOver((prev) => ({ ...prev, [activeTaskId]: true }));
          soundManager.playTaskOverChime();
          sendDesktopNotification(
            '⏰ Time is Up!',
            `Scheduled time for "${(currentTaskObj as Task).title}" has ended. Did you finish, or need more time?`,
            'critical'
          );
          setTaskOverModalTask(currentTaskObj);
        }
      } 
      // Case 2: Study/Work Video is playing (Rest budget is frozen, counts toward work time)
      else if (playingVideo && playingVideo.type === 'work') {
        const updatedPlan: DayPlan = {
          ...plan,
          usedWorkSeconds: plan.usedWorkSeconds + 1,
          lastHeartbeatTimestamp: new Date().toISOString(),
        };

        setCurrentPlan(updatedPlan);
        saveDayPlan(updatedPlan);
      }
      // Case 3: IDLE / REST MODE (Day started, no task and no study video running)
      else {
        const newUsedRest = plan.usedRestSeconds + 1;
        const updatedPlan: DayPlan = {
          ...plan,
          usedRestSeconds: newUsedRest,
          lastHeartbeatTimestamp: new Date().toISOString(),
        };

        setCurrentPlan(updatedPlan);
        saveDayPlan(updatedPlan);

        // Check if rest budget is exceeded
        if (newUsedRest > restBudgetSec) {
          const now = Date.now();
          // Warn every 3 minutes if still idling over budget
          if (now - lastRestWarningTimestamp.current > 180000) {
            lastRestWarningTimestamp.current = now;
            soundManager.playRestExceededSiren();
            sendDesktopNotification(
              '⚠️ Rest Budget Exceeded!',
              `You have used all planned rest time for today (${Math.floor(newUsedRest / 60)}m used). Start your next task now to stop wasting time!`,
              'critical'
            );
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isToday, hasAlertedTaskOver, setCurrentPlan, onOfflineSleepDetected]);

  // Actions
  const startDay = useCallback(() => {
    setCurrentPlan((prev) => {
      const updated: DayPlan = {
        ...prev,
        isDayStarted: true,
        dayStartedAt: new Date().toISOString(),
        lastHeartbeatTimestamp: new Date().toISOString(),
      };
      saveDayPlan(updated);
      soundManager.playStartChime();
      sendDesktopNotification(
        '🌅 Day Started!',
        'Your daily clock is active. Pick your first task or remember that your rest budget is counting down!'
      );
      return updated;
    });
  }, [setCurrentPlan]);

  const startTask = useCallback((taskId: string) => {
    setCurrentPlan((prev) => {
      const task = prev.tasks.find((t) => t.id === taskId);
      const updatedTasks = prev.tasks.map((t) => {
        if (t.id === taskId) {
          return { ...t, status: 'in_progress' as const };
        }
        // Pause any previously in_progress task
        if (t.status === 'in_progress') {
          return { ...t, status: 'pending' as const };
        }
        return t;
      });

      const updated: DayPlan = {
        ...prev,
        activeTaskId: taskId,
        tasks: updatedTasks,
        lastHeartbeatTimestamp: new Date().toISOString(),
      };
      saveDayPlan(updated);
      soundManager.playStartChime();
      if (task) {
        sendDesktopNotification('🚀 Task Started', `Now tracking: "${task.title}". Focus mode engaged!`);
      }
      return updated;
    });
  }, [setCurrentPlan]);

  const pauseTask = useCallback((taskId: string) => {
    setCurrentPlan((prev) => {
      const updatedTasks = prev.tasks.map((t) => {
        if (t.id === taskId) {
          return { ...t, status: 'pending' as const };
        }
        return t;
      });

      const updated: DayPlan = {
        ...prev,
        activeTaskId: null,
        tasks: updatedTasks,
        lastHeartbeatTimestamp: new Date().toISOString(),
      };
      saveDayPlan(updated);
      return updated;
    });
  }, [setCurrentPlan]);

  const completeTask = useCallback((taskId: string) => {
    setCurrentPlan((prev) => {
      const task = prev.tasks.find((t) => t.id === taskId);
      const updatedTasks = prev.tasks.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            status: 'completed' as const,
            completedAt: new Date().toISOString(),
          };
        }
        return t;
      });

      const updated: DayPlan = {
        ...prev,
        activeTaskId: prev.activeTaskId === taskId ? null : prev.activeTaskId,
        tasks: updatedTasks,
      };
      saveDayPlan(updated);

      // Play subtle success chime
      soundManager.playSuccessChime();

      if (task) {
        sendDesktopNotification('Completed Task', `Finished "${task.title}".`);
      }

      return updated;
    });
    setTaskOverModalTask(null);
  }, [setCurrentPlan]);

  const extendTaskTime = useCallback((taskId: string, extraMinutes: number) => {
    setCurrentPlan((prev) => {
      // Rebalance schedule dynamically so subsequent tasks adapt
      const rebalancedTasks = rebalanceTaskSchedule(prev.tasks, taskId, extraMinutes);

      const updated: DayPlan = {
        ...prev,
        tasks: rebalancedTasks,
      };
      saveDayPlan(updated);

      // Reset alert for this task so it can alert again when new time is reached
      setHasAlertedTaskOver((a) => ({ ...a, [taskId]: false }));
      soundManager.playStartChime();

      sendDesktopNotification(
        '⏳ Task Extended',
        `Added +${extraMinutes}m. Remaining schedule automatically shifted to stay in sync.`
      );

      return updated;
    });
    setTaskOverModalTask(null);
  }, [setCurrentPlan]);

  return {
    startDay,
    startTask,
    pauseTask,
    completeTask,
    extendTaskTime,
    taskOverModalTask,
    setTaskOverModalTask,
  };
}
