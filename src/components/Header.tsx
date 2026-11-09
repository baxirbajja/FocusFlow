import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  Pin, 
  PinOff, 
  Bell, 
  History as HistoryIcon,
  BookOpen,
  Sparkles,
  Power
} from 'lucide-react';
import { AppView } from '../types';
import { getFormattedDate, getTomorrowDate, getYesterdayDate, formatFriendlyDate } from '../utils/storage';
import { soundManager } from '../utils/audio';
import { requestNotificationPermission } from '../utils/notifications';

interface HeaderProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  isMiniMode: boolean;
  setIsMiniMode: (mini: boolean) => void;
  onOpenAIDigest?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedDate,
  setSelectedDate,
  activeView,
  setActiveView,
  isMiniMode,
  setIsMiniMode,
  onOpenAIDigest,
}) => {
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const [isAutoStart, setIsAutoStart] = useState<boolean>(false);

  const todayStr = getFormattedDate();
  const tomorrowStr = getTomorrowDate();
  const yesterdayStr = getYesterdayDate();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifGranted(Notification.permission === 'granted');
    }
    if (window.electronAPI?.getAlwaysOnTop) {
      window.electronAPI.getAlwaysOnTop().then(setIsAlwaysOnTop);
    }
    if (window.electronAPI?.getAutoStart) {
      window.electronAPI.getAutoStart().then(setIsAutoStart);
    }
  }, []);

  const handleToggleAutoStart = async () => {
    if (window.electronAPI?.setAutoStart) {
      const next = !isAutoStart;
      const res = await window.electronAPI.setAutoStart(next);
      setIsAutoStart(res);
    }
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundManager.setMuted(next);
  };

  const handleToggleAlwaysOnTop = async () => {
    if (window.electronAPI?.toggleAlwaysOnTop) {
      const next = !isAlwaysOnTop;
      const res = await window.electronAPI.toggleAlwaysOnTop(next);
      setIsAlwaysOnTop(res);
    } else {
      alert('Always-on-top is supported in Desktop mode.');
    }
  };

  const handleRequestNotif = async () => {
    const granted = await requestNotificationPermission();
    setNotifGranted(granted);
    if (granted) {
      soundManager.playStartChime();
    }
  };

  return (
    <header className="border-b border-zinc-800/80 bg-[#161619] sticky top-0 z-40 px-4 py-3">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-200">
            <Clock className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-extrabold font-display tracking-tight text-white">FocusFlow</h1>
              <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50 uppercase">
                Organizer
              </span>
            </div>
            <p className="text-[11px] font-medium text-zinc-500">
              {formatFriendlyDate(selectedDate)} ({selectedDate})
            </p>
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex items-center bg-zinc-900/90 p-1 rounded-lg border border-zinc-800 text-xs">
          <button
            onClick={() => setSelectedDate(yesterdayStr)}
            className={`px-2.5 py-1 rounded transition-colors font-semibold ${
              selectedDate === yesterdayStr
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Yesterday
          </button>
          <button
            onClick={() => {
              setSelectedDate(todayStr);
              setActiveView('tracker');
            }}
            className={`px-2.5 py-1 rounded transition-colors font-bold ${
              selectedDate === todayStr
                ? 'bg-zinc-200 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => {
              setSelectedDate(tomorrowStr);
              setActiveView('planner');
            }}
            className={`px-2.5 py-1 rounded transition-colors font-semibold ${
              selectedDate === tomorrowStr
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Tomorrow
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="bg-transparent text-zinc-400 hover:text-zinc-200 text-xs px-2 py-1 focus:outline-none cursor-pointer font-medium"
          />
        </div>

        {/* Navigation Tabs (Desktop / Tablet) */}
        <div className="hidden md:flex items-center bg-zinc-900/90 p-1 rounded-lg border border-zinc-800 text-xs">
          <button
            onClick={() => setActiveView('tracker')}
            className={`px-3 py-1 rounded transition-colors font-bold flex items-center space-x-1.5 ${
              activeView === 'tracker'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Today's Track</span>
          </button>
          <button
            onClick={() => setActiveView('planner')}
            className={`px-3 py-1 rounded transition-colors font-bold flex items-center space-x-1.5 ${
              activeView === 'planner'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Schedule Plan</span>
          </button>
          <button
            onClick={() => setActiveView('library')}
            className={`px-3 py-1 rounded transition-colors font-bold flex items-center space-x-1.5 ${
              activeView === 'library'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Study Library</span>
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`px-3 py-1 rounded transition-colors font-bold flex items-center space-x-1.5 ${
              activeView === 'history'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <HistoryIcon className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>History</span>
          </button>
        </div>

        {/* Tools */}
        <div className="flex items-center space-x-1.5">
          {onOpenAIDigest && (
            <button
              onClick={onOpenAIDigest}
              title="AI Class Digest: Turn your 7:00 PM Teams session & TP into a study plan"
              className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold font-display uppercase tracking-wider border border-zinc-700 flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-zinc-300 stroke-[2.5]" />
              <span>AI Class Digest</span>
            </button>
          )}

          {!notifGranted && (
            <button
              onClick={handleRequestNotif}
              title="Enable Desktop Notifications"
              className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 flex items-center space-x-1 transition-colors"
            >
              <Bell className="w-3.5 h-3.5 text-zinc-400" />
              <span>Enable Alerts</span>
            </button>
          )}

          <button
            onClick={handleToggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
            className="p-1.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700/60 transition-colors"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleToggleAlwaysOnTop}
            title={isAlwaysOnTop ? 'Disable Always on Top' : 'Keep Always on Top'}
            className={`p-1.5 rounded-md border transition-colors ${
              isAlwaysOnTop
                ? 'bg-zinc-200 text-zinc-950 border-zinc-300'
                : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 border-zinc-700/60'
            }`}
          >
            {isAlwaysOnTop ? <Pin className="w-3.5 h-3.5 rotate-45" /> : <PinOff className="w-3.5 h-3.5" />}
          </button>

          {window.electronAPI?.setAutoStart && (
            <button
              onClick={handleToggleAutoStart}
              title={isAutoStart ? 'Auto-Start with Windows is ON (Runs in background on boot)' : 'Auto-Start with Windows is OFF (Click to enable)'}
              className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                isAutoStart
                  ? 'bg-zinc-800 text-cyan-400 border-cyan-700/60 shadow-xs'
                  : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-500 border-zinc-700/60'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setIsMiniMode(!isMiniMode)}
            title={isMiniMode ? 'Full View' : 'Mini Floating Bar'}
            className="p-1.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700/60 transition-colors"
          >
            {isMiniMode ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

      </div>
    </header>
  );
};
