import { DayPlan, DayTemplate, Task, TaskTemplate, StudySubject, SubjectPlaylist, SubjectVideo } from '../types';

const STORAGE_KEY_PREFIX = 'focusflow_day_';
const TEMPLATES_KEY = 'focusflow_templates';
const TASK_TEMPLATES_KEY = 'focusflow_task_templates';
const SETTINGS_KEY = 'focusflow_settings';
const STUDY_SUBJECTS_KEY = 'focusflow_study_subjects';

export const DEFAULT_STUDY_SUBJECTS: StudySubject[] = [
  {
    id: 'subject_french',
    name: 'French Language (Français)',
    description: 'B1 to C1 progression, listening comprehension, grammar, and literature',
    color: '#6366f1',
    createdAt: '2026-11-09T00:00:00.000Z',
    playlists: [
      {
        id: 'pl_french_study_plan',
        name: 'Roadmap & Methods',
        description: 'Core strategy and guide videos',
        createdAt: '2026-11-09T00:00:00.000Z',
        videos: [
          {
            id: 'sv_french_1',
            title: 'Your French Study Plan for B1 to C1',
            url: 'https://www.youtube.com/watch?v=oZ10r8AX2xc',
            videoId: 'oZ10r8AX2xc',
            durationMinutes: 33,
            notes: 'High-leverage study strategy',
            addedAt: '2026-11-09T00:00:00.000Z',
          },
          {
            id: 'sv_french_2',
            title: '3 French Books You MUST Read',
            url: 'https://www.youtube.com/watch?v=iG88m8rv3oY',
            videoId: 'iG88m8rv3oY',
            durationMinutes: 13,
            notes: 'Recommended literature list',
            addedAt: '2026-11-09T00:00:00.000Z',
          },
        ],
      },
      {
        id: 'pl_french_watch_later',
        name: 'Watch Later & Listening Queue',
        description: 'Exercises, podcasts, and TV5 drills to schedule',
        createdAt: '2026-11-09T00:00:00.000Z',
        videos: [],
      },
    ],
  },
  {
    id: 'subject_linux',
    name: 'Linux Administration & LVM',
    description: 'Debian 13, LVM storage management, shell scripting, and lab homework',
    color: '#10b981',
    createdAt: '2026-11-09T00:00:00.000Z',
    playlists: [
      {
        id: 'pl_linux_homework',
        name: 'HighTech TP & Tutorials',
        description: 'Debian 13 and LVM walk-throughs',
        createdAt: '2026-11-09T00:00:00.000Z',
        videos: [],
      },
    ],
  },
];

// Bidirectional bootstrap: sync disk store with browser localStorage on initial module evaluation
if (typeof window !== 'undefined') {
  try {
    if (window.electronAPI?.getAllStorage) {
      const diskStore = window.electronAPI.getAllStorage();
      if (diskStore && typeof diskStore === 'object') {
        for (const [k, v] of Object.entries(diskStore)) {
          if (!localStorage.getItem(k)) {
            localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
          }
        }
      }
    }
    // Also ensure any localStorage keys existing prior are saved to disk
    if (window.electronAPI?.setStorage && window.electronAPI?.getAllStorage) {
      const diskStore = window.electronAPI.getAllStorage();
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('focusflow_') && diskStore[k] === undefined) {
          const val = localStorage.getItem(k);
          if (val) {
            try {
              window.electronAPI.setStorage(k, JSON.parse(val));
            } catch {
              window.electronAPI.setStorage(k, val);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Storage sync bootstrap warning:', err);
  }
}

export const DEFAULT_TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'template_french_tv5',
    title: 'Learn French (TV5MONDE)',
    notes: 'Open TV5MONDE app. Complete 1 video listening comprehension exercise and vocabulary drill.',
    plannedDuration: 30,
    priority: 'essential',
    scheduledStartTime: '09:00',
  },
  {
    id: 'template_clean_room',
    title: 'Clean Room & Desk Reset',
    notes: 'Organize study desk, make bed, clear clutter, and open window for fresh air.',
    plannedDuration: 20,
    priority: 'normal',
    scheduledStartTime: '12:30',
  },
  {
    id: 'template_flashcards',
    title: 'Flashcard Drills & Active Recall',
    notes: 'Review spaced repetition deck. Focus on difficult formulas, verbs, and concepts.',
    plannedDuration: 25,
    priority: 'essential',
  },
  {
    id: 'template_reading',
    title: 'Daily Reading',
    notes: 'Read 15-20 pages of current book or lecture readings. Note down key insights.',
    plannedDuration: 40,
    priority: 'normal',
  },
];

export const DEFAULT_TEMPLATES: DayTemplate[] = [
  {
    id: 'deep-study',
    name: 'Focused Study Day',
    description: '5 hours of high-impact study with 3 hours of managed rest',
    workHoursBudget: 300, // 5 hours
    restHoursBudget: 180, // 3 hours
    tasks: [
      {
        title: 'Review Key Concepts & Flashcards',
        notes: 'Focus on formulas, definitions, and active recall before starting problems.',
        plannedDuration: 45,
        priority: 'essential',
        scheduledStartTime: '09:00',
      },
      {
        title: 'Core Homework & Problem Sets',
        notes: 'Complete mandatory exercises. Write down questions for office hours.',
        plannedDuration: 90,
        priority: 'essential',
        scheduledStartTime: '10:15',
      },
      {
        title: 'Room Reset & Physical Stretch',
        notes: 'Make bed, tidy desk, drink water, take a walk away from screens.',
        plannedDuration: 30,
        priority: 'normal',
        scheduledStartTime: '13:00',
      },
      {
        title: 'Deep Reading & Summary Notes',
        notes: 'Read assigned chapters. Highlight only key insights and draft 1-page summary.',
        plannedDuration: 60,
        priority: 'normal',
        scheduledStartTime: '15:00',
      },
    ],
  },
  {
    id: 'exam-prep',
    name: 'Intense Exam Prep',
    description: '6 hours of practice and review',
    workHoursBudget: 360,
    restHoursBudget: 150,
    tasks: [
      {
        title: 'Timed Mock Exam',
        notes: 'Simulate exam conditions: no notes, strictly timed.',
        plannedDuration: 120,
        priority: 'essential',
        scheduledStartTime: '09:30',
      },
      {
        title: 'Error Analysis & Weak Point Review',
        notes: 'Categorize every mistake made during mock exam.',
        plannedDuration: 90,
        priority: 'essential',
        scheduledStartTime: '13:30',
      },
      {
        title: 'Flashcard Drills & Memorization',
        notes: 'Final spaced repetition drill on formulas and definitions.',
        plannedDuration: 45,
        priority: 'normal',
        scheduledStartTime: '16:00',
      },
    ],
  },
  {
    id: 'weekend-reset',
    name: 'Weekend Reset & Chores',
    description: '3 hours of chores and review with ample recharge time',
    workHoursBudget: 180,
    restHoursBudget: 300,
    tasks: [
      {
        title: 'Clean Room & Organize Study Space',
        notes: 'Clear desk, laundry, wipe surfaces, organize notes for next week.',
        plannedDuration: 60,
        priority: 'essential',
        scheduledStartTime: '10:00',
      },
      {
        title: 'Weekly Academic Review & Planning',
        notes: 'Check syllabus, organize upcoming deadlines, and plan ahead.',
        plannedDuration: 45,
        priority: 'essential',
        scheduledStartTime: '14:00',
      },
      {
        title: 'Casual Reading / Language Practice',
        notes: 'Read a book or practice French with TV5MONDE.',
        plannedDuration: 45,
        priority: 'flexible',
        scheduledStartTime: '16:30',
      },
    ],
  },
];

// Date helpers
export function getFormattedDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getFormattedDate(tomorrow);
}

export function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getFormattedDate(yesterday);
}

export function formatFriendlyDate(dateStr: string): string {
  const todayStr = getFormattedDate(new Date());
  const tomorrowStr = getTomorrowDate();
  const yesterdayStr = getYesterdayDate();

  if (dateStr === todayStr) return 'Today';
  if (dateStr === tomorrowStr) return 'Tomorrow';
  if (dateStr === yesterdayStr) return 'Yesterday';

  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatMinutes(mins: number): string {
  const hours = Math.floor(mins / 60);
  const remainder = mins % 60;
  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

export function formatSeconds(totalSeconds: number): string {
  const isNegative = totalSeconds < 0;
  const absSeconds = Math.abs(totalSeconds);
  const hours = Math.floor(absSeconds / 3600);
  const mins = Math.floor((absSeconds % 3600) / 60);
  const secs = absSeconds % 60;

  const paddedM = String(mins).padStart(2, '0');
  const paddedS = String(secs).padStart(2, '0');

  const prefix = isNegative ? '-' : '';

  if (hours > 0) {
    const paddedH = String(hours).padStart(2, '0');
    return `${prefix}${paddedH}:${paddedM}:${paddedS}`;
  }
  return `${prefix}${paddedM}:${paddedS}`;
}

export function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  // Match standard youtu.be/ or watch?v= or /embed/ or /v/ in URLs or dragged HTML
  const regExp = /(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\/watch\?v=)([^#\&\?\s"'>]{11})/;
  const match = input.match(regExp);
  if (match && match[1]) {
    return match[1];
  }
  const trimmed = input.trim();
  if (trimmed.length === 11 && !trimmed.includes('/') && !trimmed.includes('.')) {
    return trimmed;
  }
  return null;
}

export function extractYouTubePlaylistId(input: string): string | null {
  if (!input) return null;
  // Match ?list=PL... or &list=PL...
  const match = input.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) {
    const id = match[1].trim();
    if (id !== 'WL' && id !== 'LL' && id.length > 2) {
      return id;
    }
  }
  const directMatch = input.match(/youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/i);
  if (directMatch && directMatch[1]) {
    return directMatch[1].trim();
  }
  return null;
}

// Storage Operations
export function loadDayPlan(dateStr: string): DayPlan {
  const key = `${STORAGE_KEY_PREFIX}${dateStr}`;
  try {
    // 1. Check Electron persistent disk storage first
    if (typeof window !== 'undefined' && window.electronAPI?.getStorage) {
      const diskStored = window.electronAPI.getStorage(key);
      if (diskStored) {
        const parsed = typeof diskStored === 'string' ? JSON.parse(diskStored) : diskStored;
        return {
          ...parsed,
          youtubeWorkVideos: parsed.youtubeWorkVideos || [],
          youtubeRestVideos: parsed.youtubeRestVideos || [],
        };
      }
    }

    // 2. Fallback to browser localStorage
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      const plan = {
        ...parsed,
        youtubeWorkVideos: parsed.youtubeWorkVideos || [],
        youtubeRestVideos: parsed.youtubeRestVideos || [],
      };
      // Backfill disk storage if missing
      if (typeof window !== 'undefined' && window.electronAPI?.setStorage) {
        window.electronAPI.setStorage(key, plan);
      }
      return plan;
    }
  } catch (e) {
    console.error('Error loading day plan:', e);
  }

  return {
    date: dateStr,
    workHoursBudget: 480, // 8 hours default
    restHoursBudget: 480, // 8 hours default (8h work + 8h rest = 16h waking pool)
    tasks: [],
    isDayStarted: false,
    activeTaskId: null,
    usedWorkSeconds: 0,
    usedRestSeconds: 0,
    notes: '',
    youtubeWorkVideos: [],
    youtubeRestVideos: [],
  };
}

export function saveDayPlan(plan: DayPlan): void {
  const key = `${STORAGE_KEY_PREFIX}${plan.date}`;
  try {
    if (typeof window !== 'undefined' && window.electronAPI?.setStorage) {
      window.electronAPI.setStorage(key, plan);
    }
    localStorage.setItem(key, JSON.stringify(plan));
  } catch (e) {
    console.error('Error saving day plan:', e);
  }
}

export function getAllSavedDates(): string[] {
  const dateSet = new Set<string>();

  // Check Electron disk store keys
  if (typeof window !== 'undefined' && window.electronAPI?.getAllStorageKeys) {
    const diskKeys = window.electronAPI.getAllStorageKeys();
    for (const key of diskKeys) {
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        dateSet.add(key.replace(STORAGE_KEY_PREFIX, ''));
      }
    }
  }

  // Check localStorage keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
      dateSet.add(key.replace(STORAGE_KEY_PREFIX, ''));
    }
  }

  return Array.from(dateSet).sort().reverse();
}

export function loadTemplates(): DayTemplate[] {
  try {
    if (typeof window !== 'undefined' && window.electronAPI?.getStorage) {
      const diskStored = window.electronAPI.getStorage(TEMPLATES_KEY);
      if (diskStored) {
        return typeof diskStored === 'string' ? JSON.parse(diskStored) : diskStored;
      }
    }
    const stored = localStorage.getItem(TEMPLATES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading templates:', e);
  }
  return DEFAULT_TEMPLATES;
}

export function saveTemplate(template: DayTemplate): void {
  const templates = loadTemplates();
  const existingIdx = templates.findIndex((t) => t.id === template.id);
  if (existingIdx >= 0) {
    templates[existingIdx] = template;
  } else {
    templates.push(template);
  }

  if (typeof window !== 'undefined' && window.electronAPI?.setStorage) {
    window.electronAPI.setStorage(TEMPLATES_KEY, templates);
  }
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

// Task Templates (Single reusable / repeated tasks like French with TV5MONDE)
export function loadTaskTemplates(): TaskTemplate[] {
  try {
    if (typeof window !== 'undefined' && window.electronAPI?.getStorage) {
      const diskStored = window.electronAPI.getStorage(TASK_TEMPLATES_KEY);
      if (diskStored) {
        return typeof diskStored === 'string' ? JSON.parse(diskStored) : diskStored;
      }
    }
    const stored = localStorage.getItem(TASK_TEMPLATES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading task templates:', e);
  }

  // Initialize with defaults if empty
  if (typeof window !== 'undefined' && window.electronAPI?.setStorage) {
    window.electronAPI.setStorage(TASK_TEMPLATES_KEY, DEFAULT_TASK_TEMPLATES);
  }
  localStorage.setItem(TASK_TEMPLATES_KEY, JSON.stringify(DEFAULT_TASK_TEMPLATES));
  return DEFAULT_TASK_TEMPLATES;
}

export function saveTaskTemplate(template: TaskTemplate): TaskTemplate[] {
  const current = loadTaskTemplates();
  // Match by id first, then by title
  let existingIdx = current.findIndex((t) => t.id === template.id);
  if (existingIdx === -1) {
    existingIdx = current.findIndex((t) => t.title.toLowerCase() === template.title.toLowerCase());
  }
  let updated: TaskTemplate[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = template;
  } else {
    updated = [template, ...current];
  }

  if (typeof window !== 'undefined' && window.electronAPI?.setStorage) {
    window.electronAPI.setStorage(TASK_TEMPLATES_KEY, updated);
  }
  localStorage.setItem(TASK_TEMPLATES_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteTaskTemplate(templateId: string): TaskTemplate[] {
  const current = loadTaskTemplates();
  const updated = current.filter((t) => t.id !== templateId);

  if (typeof window !== 'undefined' && window.electronAPI?.setStorage) {
    window.electronAPI.setStorage(TASK_TEMPLATES_KEY, updated);
  }
  localStorage.setItem(TASK_TEMPLATES_KEY, JSON.stringify(updated));
  return updated;
}

// Dynamic Schedule Rebalancing
export function rebalanceTaskSchedule(tasks: Task[], afterTaskId: string, extraMinutes: number): Task[] {
  let found = false;
  return tasks.map((task) => {
    if (task.id === afterTaskId) {
      found = true;
      return {
        ...task,
        plannedDuration: task.plannedDuration + extraMinutes,
      };
    }
    if (found && task.scheduledStartTime && task.status === 'pending') {
      const [h, m] = task.scheduledStartTime.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        const totalMinutes = h * 60 + m + extraMinutes;
        const newH = Math.floor(totalMinutes / 60) % 24;
        const newM = totalMinutes % 60;
        const newTimeStr = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
        return {
          ...task,
          scheduledStartTime: newTimeStr,
        };
      }
    }
    return task;
  });
}

// ==========================================
// Study Subjects & Unlimited Playlists Store
// ==========================================

export function loadStudySubjects(): StudySubject[] {
  try {
    if (typeof window !== 'undefined' && window.electronAPI?.getStorage) {
      const diskStored = window.electronAPI.getStorage(STUDY_SUBJECTS_KEY);
      if (diskStored) {
        return typeof diskStored === 'string' ? JSON.parse(diskStored) : diskStored;
      }
    }
    const stored = localStorage.getItem(STUDY_SUBJECTS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading study subjects:', e);
  }

  // Initialize with sensible defaults
  saveStudySubjects(DEFAULT_STUDY_SUBJECTS);
  return DEFAULT_STUDY_SUBJECTS;
}

export function saveStudySubjects(subjects: StudySubject[]): void {
  try {
    if (typeof window !== 'undefined' && window.electronAPI?.setStorage) {
      window.electronAPI.setStorage(STUDY_SUBJECTS_KEY, subjects);
    }
    localStorage.setItem(STUDY_SUBJECTS_KEY, JSON.stringify(subjects));
  } catch (e) {
    console.error('Error saving study subjects:', e);
  }
}

export function addStudySubject(name: string, description?: string, color: string = '#6366f1'): StudySubject[] {
  const current = loadStudySubjects();
  const newSubject: StudySubject = {
    id: 'subject_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    name: name.trim(),
    description: description?.trim() || '',
    color,
    createdAt: new Date().toISOString(),
    playlists: [
      {
        id: 'pl_' + Date.now() + '_main',
        name: 'Main Watch Later',
        description: 'Default watch queue for ' + name.trim(),
        createdAt: new Date().toISOString(),
        videos: [],
      },
    ],
  };

  const updated = [...current, newSubject];
  saveStudySubjects(updated);
  return updated;
}

export function updateStudySubject(subject: StudySubject): StudySubject[] {
  const current = loadStudySubjects();
  const updated = current.map((s) => (s.id === subject.id ? subject : s));
  saveStudySubjects(updated);
  return updated;
}

export function deleteStudySubject(subjectId: string): StudySubject[] {
  const current = loadStudySubjects();
  const updated = current.filter((s) => s.id !== subjectId);
  saveStudySubjects(updated);
  return updated;
}

export function addPlaylistToSubject(subjectId: string, name: string, description?: string): StudySubject[] {
  const current = loadStudySubjects();
  const newPlaylist: SubjectPlaylist = {
    id: 'pl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    name: name.trim(),
    description: description?.trim() || '',
    createdAt: new Date().toISOString(),
    videos: [],
  };

  const updated = current.map((s) => {
    if (s.id === subjectId) {
      return {
        ...s,
        playlists: [...s.playlists, newPlaylist],
      };
    }
    return s;
  });

  saveStudySubjects(updated);
  return updated;
}

export function deletePlaylistFromSubject(subjectId: string, playlistId: string): StudySubject[] {
  const current = loadStudySubjects();
  const updated = current.map((s) => {
    if (s.id === subjectId) {
      return {
        ...s,
        playlists: s.playlists.filter((p) => p.id !== playlistId),
      };
    }
    return s;
  });

  saveStudySubjects(updated);
  return updated;
}

export function addVideoToSubjectPlaylist(
  subjectId: string,
  playlistId: string,
  video: { title: string; url: string; videoId: string; durationMinutes: number; notes?: string }
): StudySubject[] {
  const current = loadStudySubjects();
  const newVideo: SubjectVideo = {
    id: 'sv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    title: video.title.trim(),
    url: video.url.trim(),
    videoId: video.videoId,
    durationMinutes: Math.max(1, Math.round(video.durationMinutes)),
    notes: video.notes?.trim() || '',
    addedAt: new Date().toISOString(),
  };

  const updated = current.map((s) => {
    if (s.id === subjectId) {
      return {
        ...s,
        playlists: s.playlists.map((p) => {
          if (p.id === playlistId) {
            const filtered = p.videos.filter((v) => v.videoId !== video.videoId);
            return {
              ...p,
              videos: [newVideo, ...filtered],
            };
          }
          return p;
        }),
      };
    }
    return s;
  });

  saveStudySubjects(updated);
  return updated;
}

export function deleteVideoFromSubjectPlaylist(
  subjectId: string,
  playlistId: string,
  videoId: string
): StudySubject[] {
  const current = loadStudySubjects();
  const updated = current.map((s) => {
    if (s.id === subjectId) {
      return {
        ...s,
        playlists: s.playlists.map((p) => {
          if (p.id === playlistId) {
            return {
              ...p,
              videos: p.videos.filter((v) => v.id !== videoId && v.videoId !== videoId),
            };
          }
          return p;
        }),
      };
    }
    return s;
  });

  saveStudySubjects(updated);
  return updated;
}

export function addImportedPlaylistToSubject(
  subjectId: string,
  playlistName: string,
  description: string,
  videos: Array<{ title: string; url: string; videoId: string; durationMinutes: number; notes?: string }>
): StudySubject[] {
  const current = loadStudySubjects();
  const newPlaylist: SubjectPlaylist = {
    id: 'pl_yt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    name: playlistName.trim() || 'Imported YouTube Playlist',
    description: description.trim(),
    createdAt: new Date().toISOString(),
    videos: videos.map((v, idx) => ({
      id: 'sv_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substring(2, 5),
      title: v.title.trim(),
      url: v.url.trim(),
      videoId: v.videoId,
      durationMinutes: Math.max(1, Math.round(v.durationMinutes)),
      notes: v.notes || '',
      addedAt: new Date().toISOString(),
    })),
  };

  const updated = current.map((s) => {
    if (s.id === subjectId) {
      return {
        ...s,
        playlists: [newPlaylist, ...s.playlists],
      };
    }
    return s;
  });

  saveStudySubjects(updated);
  return updated;
}


export function updateVideoPlaybackState(
  dateStr: string,
  videoId: string,
  lastPlayedSeconds: number,
  isWatched: boolean = false,
  addedWorkSeconds: number = 0
): { updatedPlan: DayPlan; updatedSubjects: StudySubject[] } {
  const plan = loadDayPlan(dateStr);

  // 1. Update in DayPlan youtubeWorkVideos
  let foundInWork = false;
  const updatedWorkVids = (plan.youtubeWorkVideos || []).map((v) => {
    if (v.videoId === videoId || v.id === videoId) {
      foundInWork = true;
      return {
        ...v,
        lastPlayedSeconds,
        isWatched: isWatched ? true : v.isWatched,
        watchedDurationSeconds: (v.watchedDurationSeconds || 0) + addedWorkSeconds,
      };
    }
    return v;
  });

  // Also check in DayPlan youtubeRestVideos
  const updatedRestVids = (plan.youtubeRestVideos || []).map((v) => {
    if (v.videoId === videoId || v.id === videoId) {
      return {
        ...v,
        lastPlayedSeconds,
        isWatched: isWatched ? true : v.isWatched,
      };
    }
    return v;
  });

  const updatedPlan: DayPlan = {
    ...plan,
    youtubeWorkVideos: updatedWorkVids,
    youtubeRestVideos: updatedRestVids,
    usedWorkSeconds: plan.usedWorkSeconds + (foundInWork ? addedWorkSeconds : 0),
    lastHeartbeatTimestamp: new Date().toISOString(),
  };
  saveDayPlan(updatedPlan);

  // 2. Also update in StudyLibrary subjects if present
  const subjects = loadStudySubjects();
  let subjectChanged = false;
  const updatedSubjects = subjects.map((subj) => {
    const updatedPlaylists = subj.playlists.map((pl) => {
      const updatedVids = pl.videos.map((vid) => {
        if (vid.videoId === videoId || vid.id === videoId) {
          subjectChanged = true;
          return {
            ...vid,
            lastPlayedSeconds,
            isWatched: isWatched ? true : vid.isWatched,
          };
        }
        return vid;
      });
      return { ...pl, videos: updatedVids };
    });
    return { ...subj, playlists: updatedPlaylists };
  });

  if (subjectChanged) {
    saveStudySubjects(updatedSubjects);
  }

  return { updatedPlan, updatedSubjects };
}
