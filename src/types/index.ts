export type PriorityLevel = 'essential' | 'normal' | 'flexible';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface Task {
  id: string;
  title: string;
  notes: string; // Descriptive field for homework details, concepts to learn, reminders
  plannedDuration: number; // in minutes (e.g. 45)
  actualDuration: number; // in seconds tracked so far
  scheduledStartTime?: string; // e.g. "14:30"
  status: TaskStatus;
  priority: PriorityLevel;
  completedAt?: string; // ISO timestamp
}

export interface TaskTemplate {
  id: string;
  title: string;
  notes: string;
  plannedDuration: number; // in minutes
  priority: PriorityLevel;
  scheduledStartTime?: string;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  url: string;
  videoId: string;
  durationMinutes: number; // Duration of this video in minutes
  type: 'work' | 'rest';
  notes?: string;
  isWatched?: boolean;
}

export interface DayPlan {
  date: string; // "YYYY-MM-DD"
  workHoursBudget: number; // in minutes (e.g. 300 = 5 hours)
  restHoursBudget: number; // in minutes (e.g. 180 = 3 hours)
  tasks: Task[];
  isDayStarted: boolean; // whether user kicked off their day
  dayStartedAt?: string; // ISO timestamp
  activeTaskId: string | null; // which task is currently being tracked
  usedWorkSeconds: number; // accumulated work time in seconds
  usedRestSeconds: number; // accumulated rest/idle time in seconds
  notes?: string; // General day reflection or goals
  youtubeWorkVideos?: YouTubeVideo[];
  youtubeRestVideos?: YouTubeVideo[];
  lastHeartbeatTimestamp?: string; // ISO timestamp tracked periodically for offline PC shutdown catchup
}

export interface DayTemplate {
  id: string;
  name: string;
  description: string;
  workHoursBudget: number;
  restHoursBudget: number;
  tasks: Omit<Task, 'id' | 'actualDuration' | 'status' | 'completedAt'>[];
}

export interface SubjectVideo {
  id: string;
  title: string;
  url: string;
  videoId: string;
  durationMinutes: number;
  durationSeconds?: number;
  notes?: string;
  addedAt: string;
}

export interface SubjectPlaylist {
  id: string;
  name: string;
  description?: string;
  videos: SubjectVideo[];
  createdAt: string;
}

export interface StudySubject {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  playlists: SubjectPlaylist[];
  createdAt: string;
}

export type AppView = 'tracker' | 'planner' | 'library' | 'history';
