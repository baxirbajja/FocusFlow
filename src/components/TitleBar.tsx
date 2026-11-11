import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

/**
 * Windows-style desktop title bar rendered at the top of the frameless Electron window.
 * Provides full-width window dragging, top-edge resize pass-through, and standard
 * Minimize, Maximize/Restore, and Close controls that remain accessible above modals.
 */
export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFocused, setIsFocused] = useState(
    typeof document !== 'undefined' ? document.hasFocus() : true
  );

  useEffect(() => {
    window.electronAPI?.isWindowMaximized?.().then(setIsMaximized).catch(() => {});
    const unsubscribe = window.electronAPI?.onWindowMaximizedChange?.(setIsMaximized);

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      unsubscribe?.();
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  if (!window.electronAPI?.isElectron) {
    return null;
  }

  return (
    <div className="w-full h-8 bg-[#121214] border-b border-zinc-800/90 flex flex-col shrink-0 select-none z-[100]">
      {/* Thin non-drag top strip when restored so Windows top-border vertical resize still triggers */}
      {!isMaximized && <div className="h-[3px] w-full shrink-0" />}

      <div className="flex-1 min-h-0 flex items-center justify-between">
        {/* Draggable Windows Caption Area */}
        <div
          className="flex-1 h-full flex items-center px-3 space-x-2 min-w-0"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <div className="w-4 h-4 rounded bg-zinc-800 border border-zinc-700/70 flex items-center justify-center text-zinc-300 shrink-0">
            <Clock className="w-2.5 h-2.5 stroke-[2.5]" />
          </div>
          <span
            className={`text-xs font-medium tracking-tight truncate transition-colors ${
              isFocused ? 'text-zinc-300' : 'text-zinc-500'
            }`}
          >
            FocusFlow Organizer
          </span>
        </div>

        {/* Standard Windows Window Controls (Minimize, Maximize/Restore, Close) */}
        <div
          className="flex items-center h-full shrink-0"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            type="button"
            onClick={() => window.electronAPI?.minimizeWindow?.()}
            title="Minimize"
            aria-label="Minimize window"
            className={`w-[46px] h-full flex items-center justify-center transition-colors cursor-default hover:bg-zinc-800 hover:text-white ${
              isFocused ? 'text-zinc-400' : 'text-zinc-500'
            }`}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M0 5H10" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>

          <button
            type="button"
            onClick={async () => {
              const next = await window.electronAPI?.maximizeWindow?.();
              if (typeof next === 'boolean') {
                setIsMaximized(next);
              }
            }}
            title={isMaximized ? 'Restore Down' : 'Maximize'}
            aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
            className={`w-[46px] h-full flex items-center justify-center transition-colors cursor-default hover:bg-zinc-800 hover:text-white ${
              isFocused ? 'text-zinc-400' : 'text-zinc-500'
            }`}
          >
            {isMaximized ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path
                  d="M2.5 2.5V0.5H9.5V7.5H7.5M0.5 2.5H7.5V9.5H0.5V2.5Z"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={() => window.electronAPI?.closeWindow?.()}
            title="Close (Minimizes to Tray)"
            aria-label="Close window"
            className={`w-[46px] h-full flex items-center justify-center transition-colors cursor-default hover:bg-[#e81123] hover:text-white ${
              isFocused ? 'text-zinc-400' : 'text-zinc-500'
            }`}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path
                d="M1 1L9 9M9 1L1 9"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
