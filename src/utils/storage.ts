import { 
  DayPlan, 
  DayTemplate, 
  Task, 
  TaskTemplate, 
  StudySubject, 
  SubjectPlaylist, 
  SubjectVideo, 
  AppSettings,
  SubjectStudyPlan,
  SubjectStudyPart,
  StudyConcept,
  StudyConceptVideo,
  SubjectMilestoneTP,
  TPExecutionGuide,
  ClassIntelNotice,
  TaskStudyLink,
  SavedCourseDocument
} from '../types';

const STORAGE_KEY_PREFIX = 'focusflow_day_';
const TEMPLATES_KEY = 'focusflow_templates';
const TASK_TEMPLATES_KEY = 'focusflow_task_templates';
const SETTINGS_KEY = 'focusflow_settings';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  autoStartDay: true,
  autoStartTime: '08:00',
  taskRemindersEnabled: true,
  strictModeEnabled: false,
  postureBreakRemindersEnabled: true,
  postureBreakIntervalMinutes: 40,
};

export function loadAppSettings(): AppSettings {
  try {
    if (typeof window !== 'undefined' && window.electronAPI?.getStorage) {
      const disk = window.electronAPI.getStorage(SETTINGS_KEY);
      if (disk) return typeof disk === 'string' ? JSON.parse(disk) : disk;
    }
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Error loading settings:', e);
  }
  return DEFAULT_APP_SETTINGS;
}

export function saveAppSettings(settings: AppSettings): void {
  try {
    if (typeof window !== 'undefined' && window.electronAPI?.setStorage) {
      window.electronAPI.setStorage(SETTINGS_KEY, settings);
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings:', e);
  }
}

export function exportAllDataAsJSON(): string {
  const dump: Record<string, any> = {};
  if (typeof window !== 'undefined' && window.electronAPI?.getAllStorage) {
    const all = window.electronAPI.getAllStorage();
    if (all && typeof all === 'object') {
      return JSON.stringify(all, null, 2);
    }
  }
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('focusflow_')) {
      try {
        dump[key] = JSON.parse(localStorage.getItem(key) || '""');
      } catch {
        dump[key] = localStorage.getItem(key);
      }
    }
  }
  return JSON.stringify(dump, null, 2);
}

export function importAllDataFromJSON(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (typeof parsed !== 'object' || !parsed) return false;
    for (const [key, value] of Object.entries(parsed)) {
      if (key.startsWith('focusflow_')) {
        if (typeof window !== 'undefined' && window.electronAPI?.setStorage) {
          window.electronAPI.setStorage(key, value);
        }
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
    }
    return true;
  } catch (e) {
    console.error('Failed to import JSON data:', e);
    return false;
  }
}
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
    studyPlan: {
      bigPictureDescription: 'LVM (Logical Volume Manager) gives Linux dynamic disk virtualization. Instead of rigid physical hard drives that break when full, LVM pools storage across multiple drives so you can resize, snapshot, and backup partitions on live servers with zero downtime. Understanding Volume Groups and Physical Extents is the foundation for modern cloud storage.',
      totalSessionsAnalyzed: 2,
      lastUpdated: '2026-11-10T20:00:00.000Z',
      attentionNotices: [
        {
          id: 'notice_lvm_deadline',
          category: 'deadline',
          sessionSource: 'Session 2 Lecture',
          title: 'TP 1 Submission Deadline',
          details: 'Teacher confirmed TP 1 is due next Tuesday at 23:59 via Moodle. Must include terminal screenshots of pvs, vgs, and lvs outputs.',
        },
        {
          id: 'notice_lvm_exam',
          category: 'exam_hint',
          sessionSource: 'Session 2 Lecture',
          title: 'Midterm Exam Question Revealed',
          details: 'The teacher explicitly stated that extending a logical volume while growing the filesystem with `lvextend -r` is a guaranteed exam question.',
        },
      ],
      parts: [
        {
          id: 'part_lvm_1',
          partNumber: 1,
          title: 'Block Devices, Partitions & LVM Architecture',
          description: 'Master how raw Linux storage devices are partitioned and converted into pooled Physical Volumes before creating logical drives.',
          isCompleted: false,
          mustLearnConcepts: [
            {
              id: 'concept_lvm_1',
              name: 'Block Devices vs. File Systems (fdisk, lsblk)',
              summary: 'How Linux addresses physical block storage devices (/dev/sda, /dev/nvme) and identifies filesystem partitions.',
              searchQuery: 'Linux storage block devices lsblk fdisk tutorial complete guide',
              isCompleted: true,
              completedAt: '2026-11-10T18:00:00.000Z',
              videoResources: [
                {
                  videoId: 'wThveiL3f3A',
                  title: 'Linux Disk Management & Block Devices Crash Course',
                  url: 'https://www.youtube.com/watch?v=wThveiL3f3A',
                  durationMinutes: 28,
                  durationText: '28:15',
                  channel: 'NetworkChuck',
                  thumbnail: 'https://img.youtube.com/vi/wThveiL3f3A/hqdefault.jpg',
                },
                {
                  videoId: 'oZ10r8AX2xc',
                  title: 'Storage Architecture Deep Dive',
                  url: 'https://www.youtube.com/watch?v=oZ10r8AX2xc',
                  durationMinutes: 45,
                  durationText: '45:20',
                  channel: 'TechCraft',
                  thumbnail: 'https://img.youtube.com/vi/oZ10r8AX2xc/hqdefault.jpg',
                },
              ],
            },
            {
              id: 'concept_lvm_2',
              name: 'Physical Extents (PE) & Physical Volumes (pvcreate)',
              summary: 'Understanding the 4MB extents allocation and how pvcreate initializes raw disks into the LVM subsystem.',
              searchQuery: 'Linux LVM Physical Volumes pvcreate vgcreate tutorial',
              isCompleted: false,
              videoResources: [
                {
                  videoId: 'RDnjc_L6ats',
                  title: 'LVM Concepts from Scratch: PV, VG, and LV Explained',
                  url: 'https://www.youtube.com/watch?v=RDnjc_L6ats',
                  durationMinutes: 32,
                  durationText: '32:40',
                  channel: 'Learn Linux TV',
                  thumbnail: 'https://img.youtube.com/vi/RDnjc_L6ats/hqdefault.jpg',
                },
              ],
            },
          ],
          targetTP: {
            id: 'tp_lvm_1',
            tpNumber: 1,
            title: 'TP 1: Raw Partitioning & Volume Group Initial Setup',
            description: 'Create 2 virtual disks in Debian, run fdisk to create type 8e (LVM) partitions, initialize PVs with pvcreate, and build a 10GB Volume Group (vg_data).',
            requiredConceptNames: ['Block Devices vs. File Systems (fdisk, lsblk)', 'Physical Extents (PE) & Physical Volumes (pvcreate)'],
            estimatedMinutes: 90,
            deadline: 'Next Tuesday 23:59',
            isCompleted: false,
          },
        },
        {
          id: 'part_lvm_2',
          partNumber: 2,
          title: 'Live Volume Resizing & Online Snapshots',
          description: 'Learn dynamic capacity expansion and how copy-on-write snapshots enable zero-downtime backups and instant rollbacks.',
          isCompleted: false,
          mustLearnConcepts: [
            {
              id: 'concept_lvm_3',
              name: 'Dynamic LV Extension & Filesystem Growth (lvextend -r)',
              summary: 'How to expand logical volumes while keeping the ext4/xfs filesystem mounted and operating live without unmounting.',
              searchQuery: 'Linux lvextend resize filesystem online tutorial',
              isCompleted: false,
              videoResources: [
                {
                  videoId: 'iG88m8rv3oY',
                  title: 'Resize LVM Volumes on the Fly (Zero Downtime)',
                  url: 'https://www.youtube.com/watch?v=iG88m8rv3oY',
                  durationMinutes: 22,
                  durationText: '22:10',
                  channel: 'DevOps Journey',
                  thumbnail: 'https://img.youtube.com/vi/iG88m8rv3oY/hqdefault.jpg',
                },
              ],
            },
            {
              id: 'concept_lvm_4',
              name: 'LVM Copy-on-Write Snapshots & Disaster Recovery',
              summary: 'Taking instant point-in-time snapshots before updates, testing changes, and merging back via lvconvert --merge.',
              searchQuery: 'LVM snapshots backup and restore tutorial linux',
              isCompleted: false,
              videoResources: [
                {
                  videoId: 'oZ10r8AX2xc',
                  title: 'How LVM Snapshots Work Under the Hood',
                  url: 'https://www.youtube.com/watch?v=oZ10r8AX2xc',
                  durationMinutes: 35,
                  durationText: '35:05',
                  channel: 'Linux Foundation',
                  thumbnail: 'https://img.youtube.com/vi/oZ10r8AX2xc/hqdefault.jpg',
                },
              ],
            },
          ],
          targetTP: {
            id: 'tp_lvm_2',
            tpNumber: 2,
            title: 'TP 2: Production Server Expansion & Snapshot Rollback Lab',
            description: 'Simulate a full web server disk, dynamically attach a new virtual hard drive to the VG, extend the web directory by 5GB, take a snapshot, simulate corruption, and restore.',
            requiredConceptNames: ['Dynamic LV Extension & Filesystem Growth (lvextend -r)', 'LVM Copy-on-Write Snapshots & Disaster Recovery'],
            estimatedMinutes: 120,
            isCompleted: false,
          },
        },
      ],
    },
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
  let loaded: StudySubject[] | null = null;
  try {
    if (typeof window !== 'undefined' && window.electronAPI?.getStorage) {
      const diskStored = window.electronAPI.getStorage(STUDY_SUBJECTS_KEY);
      if (diskStored) {
        loaded = typeof diskStored === 'string' ? JSON.parse(diskStored) : diskStored;
      }
    }
    if (!loaded) {
      const stored = localStorage.getItem(STUDY_SUBJECTS_KEY);
      if (stored) {
        loaded = JSON.parse(stored);
      }
    }
  } catch (e) {
    console.error('Error loading study subjects:', e);
  }

  if (loaded && loaded.length > 0) {
    // Backfill studyPlan for demo subject if missing
    let modified = false;
    const migrated = loaded.map((subj) => {
      if (subj.id === 'subject_linux' && !subj.studyPlan) {
        const defaultLinux = DEFAULT_STUDY_SUBJECTS.find((s) => s.id === 'subject_linux');
        if (defaultLinux?.studyPlan) {
          modified = true;
          return { ...subj, studyPlan: defaultLinux.studyPlan };
        }
      }
      return subj;
    });

    if (modified) {
      saveStudySubjects(migrated);
      return migrated;
    }
    return loaded;
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
}export function updateStudySubject(subject: StudySubject): StudySubject[] {
  const current = loadStudySubjects();
  const updated = current.map((s) => (s.id === subject.id ? subject : s));
  saveStudySubjects(updated);
  return updated;
}export function deleteStudySubject(subjectId: string): StudySubject[] {
  const current = loadStudySubjects();
  const updated = current.filter((s) => s.id !== subjectId);
  saveStudySubjects(updated);
  return updated;
}export function addPlaylistToSubject(subjectId: string, name: string, description?: string): StudySubject[] {
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
}export function deletePlaylistFromSubject(subjectId: string, playlistId: string): StudySubject[] {
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
}export function addVideoToSubjectPlaylist(
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
}export function deleteVideoFromSubjectPlaylist(
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
}export function addImportedPlaylistToSubject(
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
}export function updateVideoPlaybackState(
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

  // 2. Also update in StudyLibrary subjects if present (playlists & concept videoResources)
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

    let updatedStudyPlan = subj.studyPlan;
    if (subj.studyPlan) {
      let planChanged = false;
      const updatedParts = subj.studyPlan.parts.map((part) => ({
        ...part,
        mustLearnConcepts: part.mustLearnConcepts.map((concept) => ({
          ...concept,
          videoResources: concept.videoResources.map((vid) => {
            if (vid.videoId === videoId) {
              planChanged = true;
              subjectChanged = true;
              return {
                ...vid,
                lastPlayedSeconds,
                isWatched: isWatched ? true : vid.isWatched,
              };
            }
            return vid;
          }),
        })),
      }));
      if (planChanged) {
        updatedStudyPlan = {
          ...subj.studyPlan,
          parts: updatedParts,
        };
      }
    }

    return {
      ...subj,
      playlists: updatedPlaylists,
      studyPlan: updatedStudyPlan,
    };
  });

  if (subjectChanged) {
    saveStudySubjects(updatedSubjects);
  }

  return { updatedPlan, updatedSubjects };
}

// ==========================================
// Subject Study Plan Helpers & Roadmaps
// ==========================================

function arePartTPsCompleted(part: SubjectStudyPart): boolean {
  const mainDone = part.targetTP ? part.targetTP.isCompleted : true;
  const extraDone = (part.additionalTPs || []).every((tp) => tp.isCompleted);
  return mainDone && extraDone;
}

function attachTPToPart(part: SubjectStudyPart, newTP: SubjectMilestoneTP): SubjectStudyPart {
  const normalizedNewTitle = newTP.title.trim().toLowerCase();

  if (!part.targetTP) {
    const updatedPart: SubjectStudyPart = {
      ...part,
      targetTP: newTP,
    };
    return {
      ...updatedPart,
      isCompleted: part.mustLearnConcepts.every((c) => c.isCompleted) && arePartTPsCompleted(updatedPart),
    };
  }

  if (part.targetTP.title.trim().toLowerCase() === normalizedNewTitle) {
    const updatedPart: SubjectStudyPart = {
      ...part,
      targetTP: {
        ...newTP,
        id: part.targetTP.id,
        isCompleted: part.targetTP.isCompleted,
        completedAt: part.targetTP.completedAt,
      },
    };
    return {
      ...updatedPart,
      isCompleted: part.mustLearnConcepts.every((c) => c.isCompleted) && arePartTPsCompleted(updatedPart),
    };
  }

  const existingExtras = part.additionalTPs || [];
  const existingExtraIdx = existingExtras.findIndex(
    (tp) => tp.title.trim().toLowerCase() === normalizedNewTitle
  );
  const nextExtras =
    existingExtraIdx >= 0
      ? existingExtras.map((tp, idx) =>
          idx === existingExtraIdx
            ? { ...newTP, id: tp.id, isCompleted: tp.isCompleted, completedAt: tp.completedAt }
            : tp
        )
      : [...existingExtras, newTP];

  const updatedPart: SubjectStudyPart = {
    ...part,
    additionalTPs: nextExtras,
  };
  return {
    ...updatedPart,
    isCompleted: part.mustLearnConcepts.every((c) => c.isCompleted) && arePartTPsCompleted(updatedPart),
  };
}

export function updateSubjectStudyPlan(
  subjectId: string,
  studyPlan: SubjectStudyPlan
): StudySubject[] {
  const { pendingTPAttachments: _ignored, ...cleanPlan } = studyPlan;
  const current = loadStudySubjects();
  const updated = current.map((s) => {
    if (s.id === subjectId) {
      return {
        ...s,
        studyPlan: cleanPlan,
      };
    }
    return s;
  });
  saveStudySubjects(updated);
  return updated;
}export function toggleStudyConceptCompleted(
  subjectId: string,
  partId: string,
  conceptId: string
): StudySubject[] {
  const current = loadStudySubjects();
  const updated = current.map((s) => {
    if (s.id === subjectId && s.studyPlan) {
      const updatedParts = s.studyPlan.parts.map((part) => {
        if (part.id === partId) {
          const updatedConcepts = part.mustLearnConcepts.map((c) => {
            if (c.id === conceptId) {
              const nextStatus = !c.isCompleted;
              return {
                ...c,
                isCompleted: nextStatus,
                completedAt: nextStatus ? new Date().toISOString() : undefined,
              };
            }
            return c;
          });

          // Check if all concepts and TPs in part are done
          const allConceptsDone = updatedConcepts.every((c) => c.isCompleted);
          const nextPart: SubjectStudyPart = {
            ...part,
            mustLearnConcepts: updatedConcepts,
          };

          return {
            ...nextPart,
            isCompleted: allConceptsDone && arePartTPsCompleted(nextPart),
          };
        }
        return part;
      });

      return {
        ...s,
        studyPlan: {
          ...s.studyPlan,
          parts: updatedParts,
          lastUpdated: new Date().toISOString(),
        },
      };
    }
    return s;
  });

  saveStudySubjects(updated);
  return updated;
}export function toggleStudyPartCompleted(
  subjectId: string,
  partId: string
): StudySubject[] {
  const current = loadStudySubjects();
  const updated = current.map((s) => {
    if (s.id === subjectId && s.studyPlan) {
      const updatedParts = s.studyPlan.parts.map((part) => {
        if (part.id === partId) {
          const nextVal = !part.isCompleted;
          return {
            ...part,
            isCompleted: nextVal,
            completedAt: nextVal ? new Date().toISOString() : undefined,
            // Mark all concepts completed if marking part complete
            mustLearnConcepts: part.mustLearnConcepts.map((c) => ({
              ...c,
              isCompleted: nextVal,
              completedAt: nextVal ? new Date().toISOString() : undefined,
            })),
            targetTP: part.targetTP
              ? {
                  ...part.targetTP,
                  isCompleted: nextVal,
                  completedAt: nextVal ? new Date().toISOString() : undefined,
                }
              : undefined,
            additionalTPs: part.additionalTPs
              ? part.additionalTPs.map((tp) => ({
                  ...tp,
                  isCompleted: nextVal,
                  completedAt: nextVal ? new Date().toISOString() : undefined,
                }))
              : undefined,
          };
        }
        return part;
      });

      return {
        ...s,
        studyPlan: {
          ...s.studyPlan,
          parts: updatedParts,
          lastUpdated: new Date().toISOString(),
        },
      };
    }
    return s;
  });

  saveStudySubjects(updated);
  return updated;
}export function toggleStudyTPCompleted(
  subjectId: string,
  partId: string,
  tpId?: string
): StudySubject[] {
  const current = loadStudySubjects();
  const updated = current.map((s) => {
    if (s.id === subjectId && s.studyPlan) {
      const updatedParts = s.studyPlan.parts.map((part) => {
        if (part.id !== partId) return part;

        const toggleTPItem = (tp: SubjectMilestoneTP): SubjectMilestoneTP => {
          const nextVal = !tp.isCompleted;
          return {
            ...tp,
            isCompleted: nextVal,
            completedAt: nextVal ? new Date().toISOString() : undefined,
          };
        };

        let updatedTargetTP = part.targetTP;
        let updatedAdditionalTPs = part.additionalTPs;

        if (part.targetTP && (!tpId || part.targetTP.id === tpId)) {
          updatedTargetTP = toggleTPItem(part.targetTP);
        } else if (tpId && part.additionalTPs) {
          updatedAdditionalTPs = part.additionalTPs.map((tp) =>
            tp.id === tpId ? toggleTPItem(tp) : tp
          );
        } else {
          return part;
        }

        const nextPart: SubjectStudyPart = {
          ...part,
          targetTP: updatedTargetTP,
          additionalTPs: updatedAdditionalTPs,
        };
        const allConceptsDone = nextPart.mustLearnConcepts.every((c) => c.isCompleted);

        return {
          ...nextPart,
          isCompleted: allConceptsDone && arePartTPsCompleted(nextPart),
        };
      });

      return {
        ...s,
        studyPlan: {
          ...s.studyPlan,
          parts: updatedParts,
          lastUpdated: new Date().toISOString(),
        },
      };
    }
    return s;
  });

  saveStudySubjects(updated);
  return updated;
}export function dismissClassIntelNotice(
  subjectId: string,
  noticeId: string
): StudySubject[] {
  const current = loadStudySubjects();
  const updated = current.map((s) => {
    if (s.id === subjectId && s.studyPlan) {
      return {
        ...s,
        studyPlan: {
          ...s.studyPlan,
          attentionNotices: s.studyPlan.attentionNotices.map((n) =>
            n.id === noticeId ? { ...n, isDismissed: true } : n
          ),
        },
      };
    }
    return s;
  });

  saveStudySubjects(updated);
  return updated;
}function stripPartNumberPrefix(title: string): string {
  return title.replace(/^Part\s+\d+\s*[:\-–]\s*/i, '').trim() || title.trim();
}

export function appendSessionsToSubjectPlan(
  subjectId: string,
  incomingPlan: SubjectStudyPlan
): StudySubject[] {
  const current = loadStudySubjects();
  const updated = current.map((s) => {
    if (s.id === subjectId) {
      const existing = s.studyPlan;
      if (!existing) {
        const { pendingTPAttachments: _ignored, ...cleanPlan } = incomingPlan;
        return { ...s, studyPlan: cleanPlan };
      }

      // Preserve existing Big Picture unless none existed yet
      const bigPictureDescription = existing.bigPictureDescription?.trim()
        ? existing.bigPictureDescription
        : incomingPlan.bigPictureDescription;

      // Merge Notices without duplicates
      const existingNoticeTitles = new Set(existing.attentionNotices.map((n) => n.title.toLowerCase().trim()));
      const mergedNotices = [...existing.attentionNotices];
      for (const notice of incomingPlan.attentionNotices) {
        if (!existingNoticeTitles.has(notice.title.toLowerCase().trim())) {
          mergedNotices.push(notice);
        }
      }

      // Apply pending TP attachments directly onto matching existing parts
      let mergedExistingParts = [...existing.parts];
      if (incomingPlan.pendingTPAttachments && incomingPlan.pendingTPAttachments.length > 0 && mergedExistingParts.length > 0) {
        for (const attachment of incomingPlan.pendingTPAttachments) {
          const targetIdx = mergedExistingParts.findIndex(
            (p) => p.partNumber === attachment.attachToPartNumber
          );
          const resolvedIdx = targetIdx >= 0 ? targetIdx : mergedExistingParts.length - 1;
          mergedExistingParts[resolvedIdx] = attachTPToPart(
            mergedExistingParts[resolvedIdx],
            attachment.targetTP
          );
        }
      }

      // Deduplicate against existing parts (by id or normalized title) and assign sequential numbers + unique IDs
      const existingPartIds = new Set(mergedExistingParts.map((p) => p.id));
      const existingPartTitles = new Set(
        mergedExistingParts.map((p) => stripPartNumberPrefix(p.title).toLowerCase())
      );

      const deduplicatedNewParts = incomingPlan.parts.filter((p) => {
        const cleanTitle = stripPartNumberPrefix(p.title).toLowerCase();
        return !existingPartIds.has(p.id) && !existingPartTitles.has(cleanTitle);
      });

      const startingPartNumber = mergedExistingParts.length;
      const newPartsAdjusted = deduplicatedNewParts.map((p, idx) => {
        const nextNum = startingPartNumber + idx + 1;
        return {
          ...p,
          id: existingPartIds.has(p.id) ? `${p.id}_${Date.now()}_${nextNum}` : p.id,
          partNumber: nextNum,
          title: stripPartNumberPrefix(p.title),
        };
      });

      const mergedPlan: SubjectStudyPlan = {
        bigPictureDescription,
        totalSessionsAnalyzed:
          (existing.totalSessionsAnalyzed || 0) + (incomingPlan.totalSessionsAnalyzed || 0),
        parts: [...mergedExistingParts, ...newPartsAdjusted],
        attentionNotices: mergedNotices,
        lastUpdated: new Date().toISOString(),
      };

      return {
        ...s,
        studyPlan: mergedPlan,
      };
    }
    return s;
  });

  saveStudySubjects(updated);
  return updated;
}

export interface CourseAuditApplyPayload {
  acceptReorder: boolean;
  orderedPartIds?: string[];
  acceptedEnhancements: Array<{
    targetPartId: string;
    suggestedTitle?: string;
    suggestedDescription?: string;
    conceptsToAdd: StudyConcept[];
  }>;
  acceptedNewParts: Array<{
    insertPosition: 'start' | 'after_part' | 'end';
    insertAfterPartId: string | null;
    part: SubjectStudyPart;
  }>;
  acceptedNotices?: ClassIntelNotice[];
}

/**
 * Applies user-approved AI Course Plan Audit enhancements, part reorders,
 * and missing parts safely without losing existing completion state or duplicating items.
 */
export function applyCourseAuditSuggestions(
  subjectId: string,
  payload: CourseAuditApplyPayload
): StudySubject[] {
  const current = loadStudySubjects();
  const updated = current.map((s) => {
    if (s.id !== subjectId || !s.studyPlan) return s;

    const existing = s.studyPlan;

    // 1. Group enhancements by targetPartId
    const enhancementsByPartId = new Map<
      string,
      Array<{
        suggestedTitle?: string;
        suggestedDescription?: string;
        conceptsToAdd: StudyConcept[];
      }>
    >();
    for (const enh of payload.acceptedEnhancements) {
      const list = enhancementsByPartId.get(enh.targetPartId) || [];
      list.push(enh);
      enhancementsByPartId.set(enh.targetPartId, list);
    }

    let workingParts: SubjectStudyPart[] = existing.parts.map((part) => {
      const partEnhancements = enhancementsByPartId.get(part.id);
      if (!partEnhancements || partEnhancements.length === 0) {
        return part;
      }

      let nextTitle = part.title;
      let nextDesc = part.description;
      const seenConceptNames = new Set(
        part.mustLearnConcepts.map((c) => c.name.trim().toLowerCase())
      );
      const nextConcepts = [...part.mustLearnConcepts];

      for (const enh of partEnhancements) {
        if (enh.suggestedTitle?.trim()) {
          nextTitle = stripPartNumberPrefix(enh.suggestedTitle);
        }
        if (enh.suggestedDescription?.trim()) {
          nextDesc = enh.suggestedDescription.trim();
        }
        for (const concept of enh.conceptsToAdd) {
          const normName = concept.name.trim().toLowerCase();
          if (!normName || seenConceptNames.has(normName)) continue;
          seenConceptNames.add(normName);
          nextConcepts.push(concept);
        }
      }

      const stillCompleted =
        nextConcepts.length > 0 &&
        nextConcepts.every((c) => c.isCompleted) &&
        arePartTPsCompleted(part);

      return {
        ...part,
        title: stripPartNumberPrefix(nextTitle),
        description: nextDesc,
        mustLearnConcepts: nextConcepts,
        isCompleted: stillCompleted,
        completedAt: stillCompleted ? part.completedAt : undefined,
      };
    });

    // 2. Reorder existing parts if approved (guaranteeing zero dropped parts)
    if (payload.acceptReorder && payload.orderedPartIds && payload.orderedPartIds.length > 0) {
      const byId = new Map(workingParts.map((p) => [p.id, p]));
      const reordered: SubjectStudyPart[] = [];
      const placed = new Set<string>();

      for (const id of payload.orderedPartIds) {
        const match = byId.get(id);
        if (match && !placed.has(id)) {
          placed.add(id);
          reordered.push(match);
        }
      }
      for (const p of workingParts) {
        if (!placed.has(p.id)) {
          placed.add(p.id);
          reordered.push(p);
        }
      }
      workingParts = reordered;
    }

    // 3. Insert approved missing parts at their pedagogical anchors
    const existingIds = new Set(workingParts.map((p) => p.id));
    const existingTitles = new Set(
      workingParts.map((p) => stripPartNumberPrefix(p.title).toLowerCase())
    );

    const startInserts: SubjectStudyPart[] = [];
    const afterInserts = new Map<string, SubjectStudyPart[]>();
    const endInserts: SubjectStudyPart[] = [];

    for (let idx = 0; idx < payload.acceptedNewParts.length; idx++) {
      const item = payload.acceptedNewParts[idx];
      const cleanTitle = stripPartNumberPrefix(item.part.title);
      if (existingTitles.has(cleanTitle.toLowerCase())) continue;

      existingTitles.add(cleanTitle.toLowerCase());
      const safePart: SubjectStudyPart = {
        ...item.part,
        id: existingIds.has(item.part.id)
          ? `${item.part.id}_${Date.now()}_${idx}`
          : item.part.id,
        title: cleanTitle,
      };
      existingIds.add(safePart.id);

      if (item.insertPosition === 'start') {
        startInserts.push(safePart);
      } else if (
        item.insertPosition === 'after_part' &&
        item.insertAfterPartId &&
        workingParts.some((p) => p.id === item.insertAfterPartId)
      ) {
        const bucket = afterInserts.get(item.insertAfterPartId) || [];
        bucket.push(safePart);
        afterInserts.set(item.insertAfterPartId, bucket);
      } else {
        endInserts.push(safePart);
      }
    }

    const assembled: SubjectStudyPart[] = [...startInserts];
    for (const part of workingParts) {
      assembled.push(part);
      const trailing = afterInserts.get(part.id);
      if (trailing && trailing.length > 0) {
        assembled.push(...trailing);
      }
    }
    assembled.push(...endInserts);

    // 4. Sequentially renumber 1..N with clean titles
    const finalParts: SubjectStudyPart[] = assembled.map((p, idx) => ({
      ...p,
      partNumber: idx + 1,
      title: stripPartNumberPrefix(p.title),
    }));

    // 5. Merge any additional non-duplicate notices
    const existingNoticeTitles = new Set(
      existing.attentionNotices.map((n) => n.title.toLowerCase().trim())
    );
    const mergedNotices = [...existing.attentionNotices];
    for (const notice of payload.acceptedNotices || []) {
      const norm = notice.title.toLowerCase().trim();
      if (norm && !existingNoticeTitles.has(norm)) {
        existingNoticeTitles.add(norm);
        mergedNotices.push(notice);
      }
    }

    return {
      ...s,
      studyPlan: {
        ...existing,
        parts: finalParts,
        attentionNotices: mergedNotices,
        lastUpdated: new Date().toISOString(),
      },
    };
  });

  saveStudySubjects(updated);
  return updated;
}

/**
 * Persists a TP's interactive step-by-step AI guide (exercise progress, screenshot checks, optional raw TP text).
 */
export function saveTPExecutionGuide(
  subjectId: string,
  partId: string,
  tpId: string,
  executionGuide: TPExecutionGuide,
  rawContent?: string
): StudySubject[] {
  const current = loadStudySubjects();
  const updated = current.map((s) => {
    if (s.id !== subjectId || !s.studyPlan) return s;

    const updatedParts = s.studyPlan.parts.map((part) => {
      if (part.id !== partId) return part;

      const patchTP = (tp: SubjectMilestoneTP): SubjectMilestoneTP => ({
        ...tp,
        executionGuide,
        rawContent: rawContent !== undefined ? rawContent : tp.rawContent,
      });

      return {
        ...part,
        targetTP: part.targetTP?.id === tpId ? patchTP(part.targetTP) : part.targetTP,
        additionalTPs: part.additionalTPs?.map((tp) =>
          tp.id === tpId ? patchTP(tp) : tp
        ),
      };
    });

    return {
      ...s,
      studyPlan: {
        ...s.studyPlan,
        parts: updatedParts,
        lastUpdated: new Date().toISOString(),
      },
    };
  });

  saveStudySubjects(updated);
  return updated;
}

/**
 * Sets a specific Milestone TP completion status explicitly (true/false) and updates parent part completion.
 */
export function setStudyTPCompletedState(
  subjectId: string,
  partId: string,
  tpId: string,
  isCompleted: boolean
): StudySubject[] {
  const current = loadStudySubjects();
  const updated = current.map((s) => {
    if (s.id !== subjectId || !s.studyPlan) return s;

    const updatedParts = s.studyPlan.parts.map((part) => {
      if (part.id !== partId) return part;

      const patchTP = (tp: SubjectMilestoneTP): SubjectMilestoneTP => ({
        ...tp,
        isCompleted,
        completedAt: isCompleted ? tp.completedAt || new Date().toISOString() : undefined,
      });

      const nextPart: SubjectStudyPart = {
        ...part,
        targetTP: part.targetTP?.id === tpId ? patchTP(part.targetTP) : part.targetTP,
        additionalTPs: part.additionalTPs?.map((tp) =>
          tp.id === tpId ? patchTP(tp) : tp
        ),
      };

      const allConceptsDone = nextPart.mustLearnConcepts.every((c) => c.isCompleted);
      const nextPartDone = allConceptsDone && arePartTPsCompleted(nextPart);
      return {
        ...nextPart,
        isCompleted: nextPartDone,
        completedAt: nextPartDone ? part.completedAt || new Date().toISOString() : undefined,
      };
    });

    return {
      ...s,
      studyPlan: {
        ...s.studyPlan,
        parts: updatedParts,
        lastUpdated: new Date().toISOString(),
      },
    };
  });

  saveStudySubjects(updated);
  return updated;
}

/**
 * Resolves a DayTracker Task back to its originating Study Library Subject / Part / TP card.
 * Supports explicit `task.studyLink` and title-based matching for already-scheduled TP tasks.
 */
export function resolveTaskStudyNavigation(
  task: Task,
  subjects: StudySubject[]
): TaskStudyLink | null {
  if (task.studyLink) {
    const linkedSubject = subjects.find((s) => s.id === task.studyLink!.subjectId);
    const linkedPart = linkedSubject?.studyPlan?.parts.find(
      (p) => p.id === task.studyLink!.partId
    );
    if (linkedSubject && linkedPart) {
      return task.studyLink;
    }
  }

  const rawTitle = (task.title || '').trim();
  if (!rawTitle) return null;

  const prefixMatch = rawTitle.match(/^\[([^\]]+)\]\s*(.+)$/);
  const prefixedSubjectName = prefixMatch ? prefixMatch[1].trim().toLowerCase() : null;
  const cleanTitle = (prefixMatch ? prefixMatch[2] : rawTitle).trim().toLowerCase();

  const candidateSubjects = prefixedSubjectName
    ? subjects.filter((s) => s.name.trim().toLowerCase() === prefixedSubjectName)
    : [];
  const searchSubjects = candidateSubjects.length > 0 ? candidateSubjects : subjects;

  for (const subject of searchSubjects) {
    const parts = subject.studyPlan?.parts || [];
    for (const part of parts) {
      const partTPs = [
        ...(part.targetTP ? [part.targetTP] : []),
        ...(part.additionalTPs || []),
      ];
      for (const tp of partTPs) {
        if (tp.title.trim().toLowerCase() === cleanTitle) {
          return {
            subjectId: subject.id,
            partId: part.id,
            tpId: tp.id,
          };
        }
      }

      const partTitleLower = part.title.trim().toLowerCase();
      const studyPartLabel = `study part ${part.partNumber}: ${partTitleLower}`;
      const plainPartLabel = `part ${part.partNumber}: ${partTitleLower}`;
      if (
        cleanTitle === studyPartLabel ||
        cleanTitle === plainPartLabel ||
        cleanTitle === partTitleLower
      ) {
        return {
          subjectId: subject.id,
          partId: part.id,
        };
      }
    }
  }

  return null;
}

/**
 * Updates concept tutorial video flags (pin, hide, restore hidden, watched) cleanly.
 */
export function toggleConceptVideoState(
  subjectId: string,
  partId: string,
  conceptId: string,
  videoId: string,
  action: 'pin' | 'hide' | 'unhide_all' | 'watched'
): StudySubject[] {
  const current = loadStudySubjects();
  const updated = current.map((s) => {
    if (s.id !== subjectId || !s.studyPlan) return s;

    const updatedParts = s.studyPlan.parts.map((part) => {
      if (part.id !== partId) return part;

      const updatedConcepts = part.mustLearnConcepts.map((concept) => {
        if (concept.id !== conceptId) return concept;

        const updatedVideos = concept.videoResources.map((vid) => {
          if (action === 'unhide_all') {
            return vid.isHidden ? { ...vid, isHidden: false } : vid;
          }
          if (vid.videoId !== videoId) return vid;

          if (action === 'pin') {
            return { ...vid, isPinned: !vid.isPinned, isHidden: false };
          }
          if (action === 'hide') {
            return { ...vid, isHidden: true, isPinned: false };
          }
          return { ...vid, isWatched: !vid.isWatched };
        });

        return { ...concept, videoResources: updatedVideos };
      });

      return { ...part, mustLearnConcepts: updatedConcepts };
    });

    return {
      ...s,
      studyPlan: {
        ...s.studyPlan,
        parts: updatedParts,
        lastUpdated: new Date().toISOString(),
      },
    };
  });

  saveStudySubjects(updated);
  return updated;
}

/**
 * Sets completion state on all concepts inside a Study Part (used for Part theory task sync).
 */
export function setStudyPartConceptsCompleted(
  subjectId: string,
  partId: string,
  isCompleted: boolean
): StudySubject[] {
  const current = loadStudySubjects();
  const nowIso = new Date().toISOString();

  const updated = current.map((s) => {
    if (s.id !== subjectId || !s.studyPlan) return s;

    const updatedParts = s.studyPlan.parts.map((part) => {
      if (part.id !== partId) return part;

      const updatedConcepts = part.mustLearnConcepts.map((c) => ({
        ...c,
        isCompleted,
        completedAt: isCompleted ? c.completedAt || nowIso : undefined,
      }));

      const nextPart: SubjectStudyPart = {
        ...part,
        mustLearnConcepts: updatedConcepts,
      };
      const allConceptsDone = updatedConcepts.every((c) => c.isCompleted);
      const partDone = allConceptsDone && arePartTPsCompleted(nextPart);

      return {
        ...nextPart,
        isCompleted: partDone,
        completedAt: partDone ? part.completedAt || nowIso : undefined,
      };
    });

    return {
      ...s,
      studyPlan: {
        ...s.studyPlan,
        parts: updatedParts,
        lastUpdated: nowIso,
      },
    };
  });

  saveStudySubjects(updated);
  return updated;
}

/**
 * Syncs a TP completion toggle from Study Library / TP Coach back to the matching DayTracker Task.
 */
export function syncTPCompletionToDayPlan(
  dateStr: string,
  subject: StudySubject,
  partId: string,
  tp: SubjectMilestoneTP,
  isCompleted: boolean
): DayPlan | null {
  const plan = loadDayPlan(dateStr);
  const targetTitle = tp.title.trim().toLowerCase();
  const prefixedTitle = `[${subject.name}] ${tp.title}`.trim().toLowerCase();
  const nowIso = new Date().toISOString();
  let matched = false;

  const updatedTasks = plan.tasks.map((task) => {
    const isStudyLinkMatch =
      task.studyLink &&
      task.studyLink.subjectId === subject.id &&
      task.studyLink.partId === partId &&
      task.studyLink.tpId === tp.id;

    const cleanTaskTitle = task.title.trim().toLowerCase();
    const isTitleMatch = cleanTaskTitle === prefixedTitle || cleanTaskTitle === targetTitle;

    if (!isStudyLinkMatch && !isTitleMatch) return task;

    matched = true;
    const nextStatus: Task['status'] = isCompleted
      ? 'completed'
      : task.status === 'completed'
      ? 'pending'
      : task.status;

    return {
      ...task,
      status: nextStatus,
      completedAt: isCompleted ? task.completedAt || nowIso : undefined,
    };
  });

  if (!matched) return null;

  const updatedPlan: DayPlan = {
    ...plan,
    tasks: updatedTasks,
    activeTaskId:
      isCompleted && plan.activeTaskId && updatedTasks.find((t) => t.id === plan.activeTaskId)?.status === 'completed'
        ? null
        : plan.activeTaskId,
  };
  saveDayPlan(updatedPlan);
  return updatedPlan;
}

/**
 * Persists remembered course PDFs/documents on a StudySubject (deduplicated by filename).
 */
export function saveSubjectCourseDocuments(
  subjectId: string,
  docs: Array<{ id?: string; name: string; content: string; savedAt?: string }>
): StudySubject[] {
  const current = loadStudySubjects();
  const nowIso = new Date().toISOString();

  const updated = current.map((s) => {
    if (s.id !== subjectId) return s;

    const merged = [...(s.savedCourseDocuments || [])];
    for (const doc of docs) {
      const normalizedName = doc.name.trim().toLowerCase();
      if (!normalizedName || !doc.content.trim()) continue;

      const truncatedContent = doc.content.slice(0, 250000);
      const entry: SavedCourseDocument = {
        id: doc.id || `cdoc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: doc.name.trim(),
        content: truncatedContent,
        savedAt: doc.savedAt || nowIso,
      };

      const existingIdx = merged.findIndex((m) => m.name.trim().toLowerCase() === normalizedName);
      if (existingIdx >= 0) {
        merged[existingIdx] = { ...merged[existingIdx], ...entry, id: merged[existingIdx].id };
      } else {
        merged.push(entry);
      }
    }

    return {
      ...s,
      savedCourseDocuments: merged,
    };
  });

  saveStudySubjects(updated);
  return updated;
}

/**
 * Removes a remembered course document from a StudySubject.
 */
export function removeSubjectCourseDocument(
  subjectId: string,
  docId: string
): StudySubject[] {
  const current = loadStudySubjects();
  const updated = current.map((s) => {
    if (s.id !== subjectId) return s;
    return {
      ...s,
      savedCourseDocuments: (s.savedCourseDocuments || []).filter((d) => d.id !== docId),
    };
  });

  saveStudySubjects(updated);
  return updated;
}

function mutateStudyPart(
  subjectId: string,
  partId: string,
  updater: (part: SubjectStudyPart) => SubjectStudyPart
): StudySubject[] {
  const current = loadStudySubjects();
  const nowIso = new Date().toISOString();

  const updated = current.map((s) => {
    if (s.id !== subjectId || !s.studyPlan) return s;

    const updatedParts = s.studyPlan.parts.map((part) => {
      if (part.id !== partId) return part;
      const nextPart = updater(part);
      const allConceptsDone =
        nextPart.mustLearnConcepts.length === 0
          ? arePartTPsCompleted(nextPart)
          : nextPart.mustLearnConcepts.every((c) => c.isCompleted);
      const partDone = allConceptsDone && arePartTPsCompleted(nextPart);
      return {
        ...nextPart,
        isCompleted: partDone,
        completedAt: partDone ? nextPart.completedAt || nowIso : undefined,
      };
    });

    return {
      ...s,
      studyPlan: {
        ...s.studyPlan,
        parts: updatedParts,
        lastUpdated: nowIso,
      },
    };
  });

  saveStudySubjects(updated);
  return updated;
}

/**
 * Inline-edits a Study Part title and/or description.
 */
export function updateStudyPartDetails(
  subjectId: string,
  partId: string,
  updates: { title?: string; description?: string }
): StudySubject[] {
  return mutateStudyPart(subjectId, partId, (part) => ({
    ...part,
    title: updates.title !== undefined ? updates.title.trim() || part.title : part.title,
    description: updates.description !== undefined ? updates.description.trim() : part.description,
  }));
}

/**
 * Inline-edits a Concept's name, summary, or personal notes/CLI commands.
 */
export function updateStudyConceptDetails(
  subjectId: string,
  partId: string,
  conceptId: string,
  updates: { name?: string; summary?: string; additionalNotes?: string }
): StudySubject[] {
  return mutateStudyPart(subjectId, partId, (part) => ({
    ...part,
    mustLearnConcepts: part.mustLearnConcepts.map((c) =>
      c.id !== conceptId
        ? c
        : {
            ...c,
            name: updates.name !== undefined ? updates.name.trim() || c.name : c.name,
            summary: updates.summary !== undefined ? updates.summary.trim() : c.summary,
            additionalNotes:
              updates.additionalNotes !== undefined
                ? updates.additionalNotes.trim() || undefined
                : c.additionalNotes,
          }
    ),
  }));
}

/**
 * Adds a custom Concept directly into a Study Part.
 */
export function addCustomStudyConcept(
  subjectId: string,
  partId: string,
  draft: { name: string; summary: string; additionalNotes?: string }
): StudySubject[] {
  const newConcept: StudyConcept = {
    id: `concept_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: draft.name.trim(),
    summary: draft.summary.trim(),
    searchQuery: draft.name.trim(),
    videoResources: [],
    additionalNotes: draft.additionalNotes?.trim() || undefined,
    isCompleted: false,
  };

  return mutateStudyPart(subjectId, partId, (part) => ({
    ...part,
    mustLearnConcepts: [...part.mustLearnConcepts, newConcept],
  }));
}

/**
 * Removes a Concept from a Study Part and recalculates Part completion.
 */
export function deleteStudyConcept(
  subjectId: string,
  partId: string,
  conceptId: string
): StudySubject[] {
  return mutateStudyPart(subjectId, partId, (part) => ({
    ...part,
    mustLearnConcepts: part.mustLearnConcepts.filter((c) => c.id !== conceptId),
  }));
}

/**
 * Appends (and pins) a manual YouTube tutorial video onto a Concept card.
 */
export function addManualVideoToConcept(
  subjectId: string,
  partId: string,
  conceptId: string,
  video: StudyConceptVideo
): StudySubject[] {
  return mutateStudyPart(subjectId, partId, (part) => ({
    ...part,
    mustLearnConcepts: part.mustLearnConcepts.map((c) => {
      if (c.id !== conceptId) return c;
      const existing = c.videoResources.find((v) => v.videoId === video.videoId);
      if (existing) {
        return {
          ...c,
          videoResources: c.videoResources.map((v) =>
            v.videoId === video.videoId
              ? { ...v, ...video, isHidden: false, isPinned: true }
              : v
          ),
        };
      }
      return {
        ...c,
        videoResources: [{ ...video, isPinned: true, isHidden: false }, ...c.videoResources],
      };
    }),
  }));
}

/**
 * Inline-edits a Milestone TP's title, description, duration estimate, or deadline.
 */
export function updateStudyTPDetails(
  subjectId: string,
  partId: string,
  tpId: string,
  updates: { title?: string; description?: string; estimatedMinutes?: number; deadline?: string }
): StudySubject[] {
  const applyToTP = (tp: SubjectMilestoneTP): SubjectMilestoneTP =>
    tp.id !== tpId
      ? tp
      : {
          ...tp,
          title: updates.title !== undefined ? updates.title.trim() || tp.title : tp.title,
          description: updates.description !== undefined ? updates.description.trim() : tp.description,
          estimatedMinutes:
            updates.estimatedMinutes !== undefined
              ? Math.max(10, Math.round(updates.estimatedMinutes))
              : tp.estimatedMinutes,
          deadline:
            updates.deadline !== undefined ? updates.deadline.trim() || undefined : tp.deadline,
        };

  return mutateStudyPart(subjectId, partId, (part) => ({
    ...part,
    targetTP: part.targetTP ? applyToTP(part.targetTP) : undefined,
    additionalTPs: part.additionalTPs ? part.additionalTPs.map(applyToTP) : undefined,
  }));
}

/**
 * Adds a custom Milestone TP card inside a Study Part.
 */
export function addCustomStudyTP(
  subjectId: string,
  partId: string,
  draft: { title: string; description: string; estimatedMinutes: number; deadline?: string }
): StudySubject[] {
  const newTP: SubjectMilestoneTP = {
    id: `tp_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    tpNumber: 1,
    title: draft.title.trim(),
    description: draft.description.trim(),
    requiredConceptNames: [],
    estimatedMinutes: Math.max(15, Math.round(draft.estimatedMinutes || 60)),
    deadline: draft.deadline?.trim() || undefined,
    isCompleted: false,
  };

  return mutateStudyPart(subjectId, partId, (part) => {
    const existingCount = (part.targetTP ? 1 : 0) + (part.additionalTPs?.length || 0);
    const tpWithNum: SubjectMilestoneTP = {
      ...newTP,
      tpNumber: existingCount + 1,
      requiredConceptNames: part.mustLearnConcepts.map((c) => c.name),
    };
    if (!part.targetTP) {
      return { ...part, targetTP: tpWithNum };
    }
    return {
      ...part,
      additionalTPs: [...(part.additionalTPs || []), tpWithNum],
    };
  });
}

