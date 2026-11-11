import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Settings, 
  Clock, 
  Bell, 
  ShieldAlert, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle,
  Power,
  Smartphone,
  Save,
  Activity,
  RotateCcw,
  Trash2,
  HardDrive
} from 'lucide-react';
import { AppSettings } from '../types';
import { loadAppSettings, saveAppSettings, exportAllDataAsJSON, importAllDataFromJSON } from '../utils/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
}) => {
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings());
  const [isAutoStartBoot, setIsAutoStartBoot] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [storeBackups, setStoreBackups] = useState<Array<{ fileName: string; createdAt: string; sizeBytes: number }>>([]);
  const [backupBusy, setBackupBusy] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshStoreBackups = async () => {
    if (window.electronAPI?.listStoreBackups) {
      const res = await window.electronAPI.listStoreBackups();
      if (res.success) {
        setStoreBackups(res.backups || []);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSettings(loadAppSettings());
      setImportStatus(null);
      setSavedSuccess(false);

      if (window.electronAPI?.getAutoStart) {
        window.electronAPI.getAutoStart().then(setIsAutoStartBoot);
      }
      refreshStoreBackups();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleAutoStartBoot = async () => {
    if (window.electronAPI?.setAutoStart) {
      const next = !isAutoStartBoot;
      const res = await window.electronAPI.setAutoStart(next);
      setIsAutoStartBoot(res);
    }
  };

  const handleSaveSettingField = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated: AppSettings = { ...settings, [key]: value };
    saveAppSettings(updated);
    setSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleCreateSnapshot = async () => {
    if (!window.electronAPI?.createStoreBackup || backupBusy) return;
    setBackupBusy(true);
    try {
      const res = await window.electronAPI.createStoreBackup('manual');
      if (res.success && res.backup) {
        setImportStatus({
          success: true,
          message: `Snapshot saved (${res.backup.fileName})`,
        });
        await refreshStoreBackups();
      } else {
        setImportStatus({
          success: false,
          message: res.error || 'Could not create snapshot.',
        });
      }
    } finally {
      setBackupBusy(false);
    }
  };

  const handleRestoreSnapshot = async (fileName: string) => {
    if (!window.electronAPI?.restoreStoreBackup || backupBusy) return;
    if (!window.confirm(`Restore snapshot "${fileName}"? FocusFlow will auto-save a safety backup of your current data first.`)) {
      return;
    }
    setBackupBusy(true);
    try {
      const res = await window.electronAPI.restoreStoreBackup(fileName);
      if (res.success) {
        setSettings(loadAppSettings());
        setImportStatus({
          success: true,
          message: `Restored "${fileName}" cleanly (a pre-restore safety snapshot was saved automatically).`,
        });
        await refreshStoreBackups();
        if (onDataRestored) onDataRestored();
      } else {
        setImportStatus({
          success: false,
          message: res.error || 'Restore failed.',
        });
      }
    } finally {
      setBackupBusy(false);
    }
  };

  const handleDeleteSnapshot = async (fileName: string) => {
    if (!window.electronAPI?.deleteStoreBackup || backupBusy) return;
    await window.electronAPI.deleteStoreBackup(fileName);
    await refreshStoreBackups();
  };

  const handleExportBackup = () => {
    try {
      const jsonStr = exportAllDataAsJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `FocusFlow-Backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importAllDataFromJSON(content);
        setImportStatus({
          success: ok,
          message: ok ? 'Data restored successfully!' : 'Invalid backup JSON file.',
        });
        if (ok) {
          setSettings(loadAppSettings());
          if (onDataRestored) {
            onDataRestored();
          }
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="bg-[#18181b] border border-zinc-700/80 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in text-zinc-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-white">Settings & Accountability</h2>
              <p className="text-xs text-zinc-400">Procrastination killer, auto-start, reminders & data backup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Section 1: Morning Auto-Start (Procrastination Killer) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Morning Auto-Start (Procrastination Killer)</span>
            </h3>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-white">Auto-Start Today's Tracker</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/60 text-amber-300 font-bold">
                      RECOMMENDED
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Auto-starts your clock at 8:00 AM. If you wake up late (e.g. 9:30 AM), the elapsed time since 8:00 AM burns directly into your daily leisure rest pool.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoStartDay}
                  onChange={(e) => handleSaveSettingField('autoStartDay', e.target.checked)}
                  className="w-5 h-5 accent-zinc-100 rounded cursor-pointer mt-1"
                />
              </div>

              {settings.autoStartDay && (
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                  <span className="text-xs text-zinc-300 font-medium">Daily Auto-Start Time:</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="time"
                      value={settings.autoStartTime}
                      onChange={(e) => handleSaveSettingField('autoStartTime', e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 text-white font-mono font-bold text-xs px-2.5 py-1 rounded-md focus:outline-none focus:border-zinc-500 cursor-pointer"
                    />
                    <span className="text-[11px] text-zinc-500 font-mono">Default: 08:00</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Task Time Alerts & Strict Mode */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <Bell className="w-3.5 h-3.5 text-cyan-400" />
              <span>Reminders & Strict Accountability</span>
            </h3>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-4">
              {/* Task Time Reminders */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Scheduled Task Start-Time Notifications</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Sends desktop and audio notifications at the exact scheduled time you entered for each task (e.g. 14:30).
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.taskRemindersEnabled}
                  onChange={(e) => handleSaveSettingField('taskRemindersEnabled', e.target.checked)}
                  className="w-5 h-5 accent-zinc-100 rounded cursor-pointer mt-0.5"
                />
              </div>

              {/* Strict Mode */}
              <div className="pt-3 border-t border-zinc-800/80 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-bold text-white">Strict Accountability Siren</h4>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-red-950/60 border border-red-800/60 text-red-300 font-bold uppercase">
                      Hardcore
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Fires urgent recurring sirens every 90 seconds when you exceed your rest budget until you choose a task.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.strictModeEnabled}
                  onChange={(e) => handleSaveSettingField('strictModeEnabled', e.target.checked)}
                  className="w-5 h-5 accent-zinc-100 rounded cursor-pointer mt-0.5"
                />
              </div>

              {/* Windows Boot Auto-Start */}
              {window.electronAPI?.setAutoStart && (
                <div className="pt-3 border-t border-zinc-800/80 flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-white">Auto-Start with Windows (Boot)</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Silently boots FocusFlow into the taskbar tray when your PC turns on so tracking is always ready.
                    </p>
                  </div>
                  <button
                    onClick={handleToggleAutoStartBoot}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer border ${
                      isAutoStartBoot
                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-700/60'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
                    }`}
                  >
                    {isAutoStartBoot ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Ergonomics & Posture Break */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Posture, Ergonomics & Mind Rest</span>
            </h3>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-bold text-white">40-Min Continuous Focus Break Reminder</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-bold">
                      WELLNESS
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Triggers a soothing chime and interactive stretch checklist when you work or watch video tutorials continuously for 40 minutes without resting.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.postureBreakRemindersEnabled !== false}
                  onChange={(e) => handleSaveSettingField('postureBreakRemindersEnabled', e.target.checked)}
                  className="w-5 h-5 accent-zinc-100 rounded cursor-pointer mt-1"
                />
              </div>

              {settings.postureBreakRemindersEnabled !== false && (
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                  <span className="text-xs text-zinc-300 font-medium">Continuous Focus Minutes Before Break:</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="10"
                      max="120"
                      value={settings.postureBreakIntervalMinutes || 40}
                      onChange={(e) => handleSaveSettingField('postureBreakIntervalMinutes', Math.max(5, Number(e.target.value)))}
                      className="w-20 bg-zinc-800 border border-zinc-700 text-white font-mono font-bold text-xs px-2.5 py-1 rounded-md focus:outline-hidden focus:border-zinc-500 text-center"
                    />
                    <span className="text-[11px] text-zinc-400 font-mono">minutes</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Data Export, Backup & Android Transfer */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <Download className="w-3.5 h-3.5 text-purple-400" />
              <span>Data Export, Backup & Mobile Transfer</span>
            </h3>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
              <p className="text-xs text-zinc-300 leading-relaxed">
                Export all your daily plans, task templates, and study subjects into a JSON backup file. You can import this file anytime to restore your data or sync to your Android phone.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-lg border border-zinc-700 flex items-center space-x-2 transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Export Backup (.JSON)</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-lg border border-zinc-700 flex items-center space-x-2 transition-colors cursor-pointer shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Restore Backup (.JSON)</span>
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />

                {window.electronAPI?.createStoreBackup && (
                  <button
                    type="button"
                    disabled={backupBusy}
                    onClick={handleCreateSnapshot}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center space-x-2 transition-colors cursor-pointer shadow-xs"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>{backupBusy ? 'Working...' : 'One-Click Local Snapshot'}</span>
                  </button>
                )}
              </div>

              {window.electronAPI?.listStoreBackups && (
                <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono uppercase tracking-wider">
                    <span>Local Snapshots ({storeBackups.length})</span>
                    <span className="text-[10px] text-zinc-500 normal-case">
                      Auto-saves a safety backup before restoring
                    </span>
                  </div>

                  {storeBackups.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-2">
                      No local snapshots saved yet. Click &quot;One-Click Local Snapshot&quot; to save a restore point.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {storeBackups.map((bk) => (
                        <div
                          key={bk.fileName}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="text-zinc-200 font-medium truncate">
                              {bk.fileName}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono">
                              {new Date(bk.createdAt).toLocaleString()} • {Math.max(1, Math.round(bk.sizeBytes / 1024))} KB
                            </div>
                          </div>
                          <div className="flex items-center space-x-1.5 shrink-0">
                            <button
                              type="button"
                              disabled={backupBusy}
                              onClick={() => handleRestoreSnapshot(bk.fileName)}
                              className="px-2.5 py-1 rounded-md bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-700/60 text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Restore</span>
                            </button>
                            <button
                              type="button"
                              disabled={backupBusy}
                              onClick={() => handleDeleteSnapshot(bk.fileName)}
                              className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-900 cursor-pointer"
                              title="Delete snapshot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {importStatus && (
                <div className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
                  importStatus.success
                    ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300'
                    : 'bg-red-950/40 border border-red-800/60 text-red-300'
                }`}>
                  {importStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{importStatus.message}</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-zinc-800 bg-zinc-900/40 text-xs shrink-0">
          <div className="flex items-center space-x-2 text-zinc-500">
            {savedSuccess && (
              <span className="text-emerald-400 font-semibold flex items-center space-x-1 animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Settings Saved</span>
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
