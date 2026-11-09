import React from 'react';
import { Clock, Calendar, BookOpen, History, Sparkles } from 'lucide-react';
import { AppView } from '../types';

interface BottomNavProps {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  onOpenAIDigest?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeView,
  setActiveView,
  onOpenAIDigest,
}) => {
  const navItems = [
    {
      id: 'tracker' as AppView,
      label: 'Tracker',
      icon: Clock,
      onClick: () => setActiveView('tracker'),
      isActive: activeView === 'tracker',
    },
    {
      id: 'planner' as AppView,
      label: 'Planner',
      icon: Calendar,
      onClick: () => setActiveView('planner'),
      isActive: activeView === 'planner',
    },
    {
      id: 'ai_digest' as const,
      label: 'AI Digest',
      icon: Sparkles,
      onClick: () => onOpenAIDigest && onOpenAIDigest(),
      isActive: false,
      isSpecial: true,
    },
    {
      id: 'library' as AppView,
      label: 'Library',
      icon: BookOpen,
      onClick: () => setActiveView('library'),
      isActive: activeView === 'library',
    },
    {
      id: 'history' as AppView,
      label: 'History',
      icon: History,
      onClick: () => setActiveView('history'),
      isActive: activeView === 'history',
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#121214]/95 backdrop-blur-lg border-t border-zinc-800/80 px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-2xl">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
                item.isSpecial
                  ? 'text-amber-400 hover:text-amber-300'
                  : item.isActive
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <div
                className={`relative p-1 rounded-lg transition-transform active:scale-90 ${
                  item.isActive
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : item.isSpecial
                    ? 'bg-amber-950/40 text-amber-400 border border-amber-800/40'
                    : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${item.isSpecial ? 'animate-pulse' : ''}`} />
                {item.isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full" />
                )}
              </div>
              <span className={`text-[10px] font-semibold mt-1 tracking-tight ${
                item.isActive ? 'text-white' : item.isSpecial ? 'text-amber-400 font-bold' : 'text-zinc-400'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
