export type PriorityLevel = 'essential' | 'normal' | 'flexible';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface TaskStudyLink {
  subjectId: string;
  partId: string;
  tpId?: string;
  conceptId?: string;
  tab?: 'roadmap' | 'playlists';
}

export interface StudyNavigationTarget extends TaskStudyLink {
  nonce: number;
}

export interface Task {
  id: string;
  title: string;
  notes: string; // Descriptive field for homework details, concepts to learn, reminders
  plannedDuration: number; // in minutes (e.g. 45)
  actualDuration: number; // in seconds tracked so far
  scheduledStartTime?: string; // e.g. "14:30"
  status: TaskStatus;
  priority: PriorityLevel;
  studyLink?: TaskStudyLink; // Optional reference back to Study Library Part / TP card
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
  lastPlayedSeconds?: number; // Last playback position in seconds (for resuming)
  watchedDurationSeconds?: number; // Accumulated seconds watched towards budget
}

export interface DayPlan {
  date: string; // "YYYY-MM-DD"
  workHoursBudget: number; // in minutes (e.g. 300 = 5 hours)
  restHoursBudget: number; // in minutes (e.g. 180 = 3 hours)
  tasks: Task[];
  isDayStarted: boolean; // whether user kicked off their day
  dayStartedAt?: string; // ISO timestamp
  isDayEnded?: boolean; // whether user ended their day
  dayEndedAt?: string; // ISO timestamp
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
  lastPlayedSeconds?: number;
  isWatched?: boolean;
}

export interface SubjectPlaylist {
  id: string;
  name: string;
  description?: string;
  videos: SubjectVideo[];
  createdAt: string;
}

export interface StudyConceptVideo {
  videoId: string;
  title: string;
  url: string;
  durationMinutes: number;
  durationText?: string;
  channel: string;
  thumbnail: string;
  isPinned?: boolean;
  isHidden?: boolean;
  isWatched?: boolean;
  lastPlayedSeconds?: number;
}

export interface StudyConcept {
  id: string;
  name: string;
  summary: string;
  searchQuery: string;
  videoResources: StudyConceptVideo[]; // Rich list of video tutorials
  additionalNotes?: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface TPMachineStep {
  stepNumber: number;
  title: string;
  instruction: string;
  command?: string;
  expectedResult?: string;
}

export interface TPQuestionAnswer {
  question: string;
  answer: string;
}

export interface TPScreenshotItem {
  id: string;
  label: string;
  whatToShow: string;
  captionSuggestion?: string;
  isTaken?: boolean;
  imageDataUrl?: string;
  imageName?: string;
}

export interface TPExerciseGuide {
  id: string;
  exerciseNumber: number;
  title: string;
  description: string; // What we are going to do in this exercise
  machineSteps: TPMachineStep[]; // Steps on your machine
  questionAnswers: TPQuestionAnswer[]; // Answers to questions (if any)
  screenshotsToTake: TPScreenshotItem[]; // Screenshots to capture
  reportSectionLayout: string; // How your report section should look (where to place screenshots & answers)
  isCompleted?: boolean;
}

export interface TPExecutionGuide {
  generatedAt: string;
  overview: string;
  environmentSetup?: string;
  reportGeneralStructure: string;
  exercises: TPExerciseGuide[];
}

export interface SubjectMilestoneTP {
  id: string;
  tpNumber: number; // e.g. 1, 2, 3
  title: string;
  description: string;
  requiredConceptNames: string[]; // Concept names needed
  estimatedMinutes: number;
  deadline?: string;
  rawContent?: string; // Optional extracted TP sheet text for deep coaching
  executionGuide?: TPExecutionGuide; // Persisted AI step-by-step coach guide & progress
  isCompleted: boolean;
  completedAt?: string;
}

export interface SubjectStudyPart {
  id: string;
  partNumber: number; // Part 1, Part 2, Part 3...
  title: string;
  description: string; // The "why this matters"
  mustLearnConcepts: StudyConcept[];
  targetTP?: SubjectMilestoneTP; // The practical work capping off this part
  additionalTPs?: SubjectMilestoneTP[]; // Extra TPs attached to this part when multiple labs share prerequisites
  isCompleted: boolean;
  completedAt?: string;
}

export interface TPAttachment {
  attachToPartNumber: number;
  attachToPartTitle?: string;
  targetTP: SubjectMilestoneTP;
}

export interface ClassIntelNotice {
  id: string;
  category: 'deadline' | 'exam_hint' | 'teacher_warning' | 'setup_requirement';
  sessionSource: string; // e.g. "Session 3" or "Class discussion"
  title: string;
  details: string;
  isDismissed?: boolean;
}

export interface SubjectStudyPlan {
  bigPictureDescription: string; // The overarching mental model & real-world purpose
  totalSessionsAnalyzed: number;
  parts: SubjectStudyPart[];
  attentionNotices: ClassIntelNotice[]; // "Things to give attention to"
  pendingTPAttachments?: TPAttachment[]; // Transient placements for existing parts during append review
  lastUpdated: string;
}

export interface SavedCourseDocument {
  id: string;
  name: string;
  content: string;
  savedAt: string;
}

export interface StudySubject {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  playlists: SubjectPlaylist[];
  createdAt: string;
  studyPlan?: SubjectStudyPlan; // Master Study Plan & Prerequisite Learning Tree
  savedCourseDocuments?: SavedCourseDocument[]; // Remembered course PDFs/text for instant re-audits
}

export interface AuditConceptDraft {
  name: string;
  summary: string;
  searchQuery: string;
  additionalNotes?: string;
}

export interface AuditPartEnhancement {
  id: string;
  targetPartId: string;
  targetPartNumber: number;
  targetPartTitle: string;
  enhancementType: 'add_concepts' | 'refine_scope' | 'reorder_hint';
  reason: string;
  suggestedTitle?: string;
  suggestedDescription?: string;
  conceptsToAdd: AuditConceptDraft[];
}

export interface AuditNewPartSuggestion {
  id: string;
  insertPosition: 'start' | 'after_part' | 'end';
  insertAfterPartId: string | null;
  insertAfterPartNumber: number | null;
  insertAfterPartTitle?: string;
  reason: string;
  title: string;
  description: string;
  mustLearnConcepts: AuditConceptDraft[];
  targetTP?: {
    tpNumber: number;
    title: string;
    description: string;
    requiredConceptNames: string[];
    estimatedMinutes: number;
    deadline?: string;
  } | null;
}

export interface AuditReorderSuggestion {
  recommended: boolean;
  reason: string;
  orderedPartIds: string[]; // Complete permutation of existing part IDs in ideal prerequisite order
}

export interface CoursePlanAuditResult {
  status: 'perfect' | 'needs_improvement';
  coverageScore: number; // 0-100
  overallVerdict: string;
  coveredHighlights: string[];
  missingTopicsSummary: string[];
  reorderSuggestion?: AuditReorderSuggestion;
  enhancements: AuditPartEnhancement[];
  newParts: AuditNewPartSuggestion[];
  additionalNotices: ClassIntelNotice[];
}

export interface AppSettings {
  autoStartDay: boolean; // Auto-start tracking at target hour (e.g. 8:00 AM)
  autoStartTime: string; // Target hour, e.g. "08:00"
  taskRemindersEnabled: boolean; // Alert when scheduled task time arrives
  strictModeEnabled: boolean; // Unignorable siren alarms and strict task completion checks
  postureBreakRemindersEnabled?: boolean; // Continuous work posture & mind break reminder
  postureBreakIntervalMinutes?: number; // Continuous minutes before reminder (default 40)
}

export type AppView = 'tracker' | 'planner' | 'library' | 'history';
