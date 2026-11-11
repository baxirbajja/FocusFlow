import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  FileText, 
  UploadCloud, 
  BookOpen, 
  Check, 
  Clock, 
  Play, 
  AlertCircle, 
  Calendar, 
  Key, 
  Layers, 
  Briefcase, 
  FolderPlus,
  Loader2,
  Trash2,
  ExternalLink,
  ChevronRight,
  Info,
  CalendarPlus,
  Plus,
  CheckCircle2,
  BookmarkCheck,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { 
  StudySubject, 
  DayPlan, 
  Task, 
  YouTubeVideo, 
  PriorityLevel,
  SubjectStudyPlan,
  SubjectStudyPart,
  StudyConcept,
  StudyConceptVideo,
  SubjectMilestoneTP,
  ClassIntelNotice
} from '../types';
import { 
  formatMinutes, 
  getTomorrowDate, 
  getFormattedDate, 
  loadDayPlan, 
  saveDayPlan,
  appendSessionsToSubjectPlan,
  updateSubjectStudyPlan,
  saveSubjectCourseDocuments
} from '../utils/storage';
import { 
  generateMasterStudyPlan,
  analyzeLectureWithGemini, 
  getSavedGeminiKey, 
  saveGeminiKey, 
  AIDigestResult, 
  AIExtractedTask, 
  AIConcept,
  MultiSessionInput
} from '../utils/aiDigest';

interface AIDigestModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: StudySubject[];
  currentPlan: DayPlan;
  onUpdatePlan: (updatedPlan: DayPlan) => void;
  onUpdateSubjects?: (updatedSubjects: StudySubject[]) => void;
  onPlayVideo: (video: YouTubeVideo) => void;
  onViewSubjectRoadmap?: (subjectId: string) => void;
  initialSubjectId?: string;
}

interface AttachedDoc {
  id: string;
  name: string;
  size: number;
  type: 'transcript' | 'tp' | 'course';
  content: string;
}

export const AIDigestModal: React.FC<AIDigestModalProps> = ({
  isOpen,
  onClose,
  subjects,
  currentPlan,
  onUpdatePlan,
  onUpdateSubjects,
  onPlayVideo,
  onViewSubjectRoadmap,
  initialSubjectId,
}) => {
  const tomorrowStr = getTomorrowDate();
  const todayStr = getFormattedDate();

  // Wizard Step: 'input' | 'processing' | 'review'
  const [step, setStep] = useState<'input' | 'processing' | 'review'>('input');
  const [digestMode, setDigestMode] = useState<'master_plan' | 'quick_schedule'>('master_plan');

  // Input states
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialSubjectId || subjects[0]?.id || ''
  );
  const [targetDate, setTargetDate] = useState<string>(tomorrowStr);
  const [transcriptText, setTranscriptText] = useState<string>('');
  const [tpText, setTpText] = useState<string>('');
  const [attachedDocs, setAttachedDocs] = useState<AttachedDoc[]>([]);
  const [isAppending, setIsAppending] = useState<boolean>(true);
  const [isDraggingTranscripts, setIsDraggingTranscripts] = useState<boolean>(false);
  const [isDraggingTps, setIsDraggingTps] = useState<boolean>(false);

  // Processing state
  const [processStatus, setProcessStatus] = useState<string>('Analyzing multi-session transcripts and TP files...');

  // Master Study Plan results state
  const [generatedMasterPlan, setGeneratedMasterPlan] = useState<SubjectStudyPlan | null>(null);

  // Quick digest legacy result state
  const [legacyResult, setLegacyResult] = useState<AIDigestResult | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<AIExtractedTask[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<AIConcept[]>([]);

  // Gemini API Key config drawer
  const [isKeyDrawerOpen, setIsKeyDrawerOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => getSavedGeminiKey());
  const [keySavedMessage, setKeySavedMessage] = useState(false);

  // Reset wizard cleanly every time the modal opens so Append / New runs always start at the file input form
  useEffect(() => {
    if (isOpen) {
      const targetSubjectId = initialSubjectId || subjects[0]?.id || '';
      setStep('input');
      setDigestMode('master_plan');
      setSelectedSubjectId(targetSubjectId);
      setTranscriptText('');
      setTpText('');
      setAttachedDocs([]);
      setGeneratedMasterPlan(null);
      setLegacyResult(null);
      setIsAppending(true);
    }
  }, [isOpen, initialSubjectId]);

  if (!isOpen) return null;

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const hasExistingPlan = !!activeSubject?.studyPlan;

  // Process uploaded files
  const processAndAddFile = async (file: File, fileType: 'transcript' | 'tp' | 'course') => {
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        let extractedText = '';

        if (window.electronAPI?.parseFileContent) {
          const res = await window.electronAPI.parseFileContent({
            fileName: file.name,
            base64Data: base64,
          });
          if (res.success && res.text) {
            extractedText = res.text;
          }
        }

        if (!extractedText) {
          try {
            extractedText = await file.text();
          } catch {
            extractedText = `Attached document: ${file.name}`;
          }
        }

        const newDoc: AttachedDoc = {
          id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          name: file.name,
          size: file.size,
          type: fileType,
          content: extractedText,
        };

        setAttachedDocs((prev) => [...prev, newDoc]);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn('File ingestion error:', err);
    }
  };

  const handleRemoveDoc = (id: string) => {
    setAttachedDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSaveApiKey = () => {
    saveGeminiKey(apiKeyInput);
    setKeySavedMessage(true);
    setTimeout(() => {
      setKeySavedMessage(false);
      setIsKeyDrawerOpen(false);
    }, 1500);
  };

  // Run Master Synthesis
  const handleStartAnalysis = async () => {
    const transcripts = attachedDocs
      .filter((d) => d.type === 'transcript')
      .map((d) => ({ name: d.name, content: d.content }));

    if (transcriptText.trim()) {
      transcripts.push({ name: 'Direct Lecture Input', content: transcriptText.trim() });
    }

    const tps = attachedDocs
      .filter((d) => d.type === 'tp')
      .map((d) => ({ name: d.name, content: d.content }));

    if (tpText.trim()) {
      tps.push({ name: 'Direct TP Notes', content: tpText.trim() });
    }

    const courses = attachedDocs
      .filter((d) => d.type === 'course')
      .map((d) => ({ name: d.name, content: d.content }));

    if (transcripts.length === 0 && tps.length === 0 && courses.length === 0) {
      alert('Please add at least one session transcript, course file, or TP document to analyze.');
      return;
    }

    setStep('processing');

    if (digestMode === 'master_plan') {
      setProcessStatus('Step 1/3: Architecting sequential prerequisite roadmap (Concepts → TP)...');

      try {
        const input: MultiSessionInput = {
          subjectName: activeSubject?.name || 'General Subject',
          transcripts,
          tpDocuments: tps,
          courseDocuments: courses,
          apiKey: apiKeyInput,
        };

        setTimeout(() => {
          setProcessStatus('Step 2/3: Searching rich educational video resources on YouTube...');
        }, 1200);

        const synthesizedPlan = await generateMasterStudyPlan(
          input,
          isAppending && hasExistingPlan ? activeSubject.studyPlan : undefined
        );

        setProcessStatus('Step 3/3: Finalizing roadmap milestones and class intel notices...');
        setGeneratedMasterPlan(synthesizedPlan);
        setStep('review');
      } catch (err) {
        console.error('Synthesis failed:', err);
        alert('Analysis encountered an issue. Falling back to default plan structure.');
        setStep('input');
      }
    } else {
      // Legacy quick schedule mode
      setProcessStatus('Extracting immediate tasks and videos for tomorrow...');
      const combinedTranscripts = transcripts.map((t) => t.content).join('\n\n');
      const combinedTps = tps.map((t) => t.content).join('\n\n');

      try {
        const result = await analyzeLectureWithGemini(
          combinedTranscripts,
          combinedTps,
          activeSubject?.name || '',
          apiKeyInput
        );
        setLegacyResult(result);
        setSelectedTasks(result.tasks);
        setSelectedVideos(result.concepts.filter((c) => !!c.matchedVideo));
        setStep('review');
      } catch (err) {
        console.error('Quick schedule digest failed:', err);
        setStep('input');
      }
    }
  };

  // Save Master Study Plan to Subject
  const handleSaveMasterPlanToSubject = () => {
    if (!generatedMasterPlan || !activeSubject) return;

    let updatedSubjects: StudySubject[];
    if (isAppending && hasExistingPlan) {
      updatedSubjects = appendSessionsToSubjectPlan(activeSubject.id, generatedMasterPlan);
    } else {
      updatedSubjects = updateSubjectStudyPlan(activeSubject.id, generatedMasterPlan);
    }

    const courseDocsToRemember = attachedDocs
      .filter((d) => d.type === 'course' && d.content.trim().length >= 20)
      .map((d) => ({ name: d.name, content: d.content }));
    if (courseDocsToRemember.length > 0) {
      updatedSubjects = saveSubjectCourseDocuments(activeSubject.id, courseDocsToRemember);
    }

    if (onUpdateSubjects) {
      onUpdateSubjects(updatedSubjects);
    }

    setGeneratedMasterPlan(null);
    setAttachedDocs([]);
    setTranscriptText('');
    setTpText('');
    setStep('input');
    onClose();

    if (onViewSubjectRoadmap) {
      onViewSubjectRoadmap(activeSubject.id);
    }
  };

  // Schedule a Concept's video to today or tomorrow
  const handleScheduleConceptVideo = (concept: StudyConcept, video: StudyConceptVideo, dateStr: string) => {
    const targetPlan = dateStr === currentPlan.date ? currentPlan : loadDayPlan(dateStr);
    const existingWorkVideos = targetPlan.youtubeWorkVideos || [];

    if (existingWorkVideos.some((v) => v.videoId === video.videoId)) {
      alert(`"${video.title}" is already scheduled.`);
      return;
    }

    const scheduledVideo: YouTubeVideo = {
      id: 'yt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: video.title,
      url: video.url,
      videoId: video.videoId,
      durationMinutes: video.durationMinutes,
      type: 'work',
      notes: `[${activeSubject?.name || 'Subject'}] Concept: ${concept.name}`,
      isWatched: false,
    };

    const updated = {
      ...targetPlan,
      youtubeWorkVideos: [...existingWorkVideos, scheduledVideo],
    };

    if (dateStr === currentPlan.date) {
      onUpdatePlan(updated);
    } else {
      saveDayPlan(updated);
    }

    alert(`✓ Scheduled "${video.title}" (${video.durationMinutes}m) to ${dateStr === todayStr ? 'Today' : 'Tomorrow'}!`);
  };

  // Schedule TP as Task
  const handleScheduleTPAsTask = (tp: SubjectMilestoneTP, dateStr: string) => {
    const targetPlan = dateStr === currentPlan.date ? currentPlan : loadDayPlan(dateStr);
    const newTask: Task = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: `${activeSubject?.name ? `[${activeSubject.name}] ` : ''}${tp.title}`,
      notes: `${tp.description}\nPrerequisites: ${tp.requiredConceptNames.join(', ')}`,
      plannedDuration: tp.estimatedMinutes,
      actualDuration: 0,
      status: 'pending',
      priority: 'essential',
    };

    const updated = {
      ...targetPlan,
      tasks: [...targetPlan.tasks, newTask],
    };

    if (dateStr === currentPlan.date) {
      onUpdatePlan(updated);
    } else {
      saveDayPlan(updated);
    }

    alert(`✓ Scheduled TP "${tp.title}" (${tp.estimatedMinutes}m) as a task for ${dateStr === todayStr ? 'Today' : 'Tomorrow'}!`);
  };

  // Legacy apply to schedule
  const handleApplyLegacySchedule = () => {
    const targetPlan = targetDate === currentPlan.date ? currentPlan : loadDayPlan(targetDate);

    const activeTasksToAdd = selectedTasks
      .filter((t) => t.selected)
      .map((t) => ({
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        title: t.title,
        notes: t.notes,
        plannedDuration: t.plannedDuration,
        actualDuration: 0,
        status: 'pending' as const,
        priority: t.priority,
      }));

    const activeVideosToAdd = selectedVideos
      .filter((c) => c.matchedVideo)
      .map((c) => ({
        id: 'yt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        title: c.matchedVideo!.title,
        url: c.matchedVideo!.url,
        videoId: c.matchedVideo!.videoId,
        durationMinutes: c.matchedVideo!.durationMinutes,
        type: 'work' as const,
        notes: `[${c.conceptName}] ${c.videoNote}`,
        isWatched: false,
      }));

    const updatedPlan: DayPlan = {
      ...targetPlan,
      tasks: [...targetPlan.tasks, ...activeTasksToAdd],
      youtubeWorkVideos: [...(targetPlan.youtubeWorkVideos || []), ...activeVideosToAdd],
    };

    if (targetDate === currentPlan.date) {
      onUpdatePlan(updatedPlan);
    } else {
      saveDayPlan(updatedPlan);
    }

    onClose();
  };

  const transcriptsCount = attachedDocs.filter((d) => d.type === 'transcript').length + (transcriptText.trim() ? 1 : 0);
  const tpCount = attachedDocs.filter((d) => d.type === 'tp').length + (tpText.trim() ? 1 : 0);
  const coursesCount = attachedDocs.filter((d) => d.type === 'course').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col p-5 shadow-2xl relative overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200">
              <Sparkles className="w-5 h-5 text-indigo-400 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-extrabold font-display uppercase tracking-wider text-white">
                  Multi-Session AI Study Digest & Roadmap Architect
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                  Gemini Flash + Prerequisite Tree
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Drop multiple class sessions and TP documents to synthesize an interactive, part-by-part study roadmap.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsKeyDrawerOpen(!isKeyDrawerOpen)}
              title="Configure Gemini API Key"
              className={`p-1.5 px-2.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                apiKeyInput
                  ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white'
                  : 'bg-amber-950/40 text-amber-300 border-amber-800/60 hover:bg-amber-900/60'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span className="text-[11px]">{apiKeyInput ? 'API Key Active' : 'Set Gemini Key'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Gemini API Key Drawer */}
        {isKeyDrawerOpen && (
          <div className="bg-zinc-900/90 border border-zinc-700/80 rounded-xl p-3 mt-3 shrink-0 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-display">
                  Google Gemini API Key
                </span>
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-zinc-400 hover:text-white underline flex items-center space-x-1"
              >
                <span>Get free key at Google AI Studio</span>
                <ExternalLink className="w-3 h-3 inline" />
              </a>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 font-mono focus:outline-hidden focus:border-zinc-500"
              />
              <button
                onClick={handleSaveApiKey}
                className="px-3 py-1.5 bg-zinc-200 hover:bg-white text-zinc-950 rounded-lg text-xs font-bold font-display uppercase tracking-wider cursor-pointer"
              >
                Save
              </button>
            </div>
            {keySavedMessage && (
              <span className="text-[11px] text-emerald-400 mt-1 block font-medium">
                ✓ Gemini API key securely saved!
              </span>
            )}
          </div>
        )}

        {/* STEP 1: INPUT WIZARD */}
        {step === 'input' && (
          <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
            
            {/* Top Selector: Target Subject & Mode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 font-display uppercase tracking-wider mb-1.5">
                  1. Target Study Subject
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-medium focus:outline-hidden focus:border-zinc-500 cursor-pointer"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} {sub.studyPlan ? `(Existing: ${sub.studyPlan.parts.length} Parts)` : '(No plan yet)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 font-display uppercase tracking-wider mb-1.5">
                  2. Synthesis Goal
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setDigestMode('master_plan')}
                    className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all text-center cursor-pointer ${
                      digestMode === 'master_plan'
                        ? 'bg-zinc-800 text-white border-zinc-500 shadow-xs'
                        : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    Interactive Subject Roadmap
                  </button>
                  <button
                    type="button"
                    onClick={() => setDigestMode('quick_schedule')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all text-center cursor-pointer ${
                      digestMode === 'quick_schedule'
                        ? 'bg-zinc-800 text-white border-zinc-500 shadow-xs'
                        : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    Quick Day Tasks
                  </button>
                </div>
              </div>
            </div>

            {/* Existing Plan Notice & Incremental Toggle */}
            {hasExistingPlan && digestMode === 'master_plan' && (
              <div className="bg-indigo-950/30 border border-indigo-800/60 rounded-xl p-3 flex items-start justify-between gap-3">
                <div className="flex items-start space-x-2.5">
                  <BookmarkCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-indigo-200">
                      Subject "{activeSubject?.name}" already has an Interactive Study Plan ({activeSubject?.studyPlan?.parts.length} parts)
                    </span>
                    <p className="text-[11px] text-indigo-300/80 mt-0.5">
                      New sessions append as subsequent parts; new TPs whose concepts are already covered will be placed directly under the matching existing part(s).
                    </p>
                  </div>
                </div>

                <label className="flex items-center space-x-2 shrink-0 cursor-pointer text-xs font-semibold text-zinc-300">
                  <input
                    type="checkbox"
                    checked={isAppending}
                    onChange={(e) => setIsAppending(e.target.checked)}
                    className="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-indigo-600 focus:ring-0"
                  />
                  <span>Append to existing</span>
                </label>
              </div>
            )}

            {/* Multi-File Ingestion Slots */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Slot 1: Class Transcriptions (Multiple files) */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingTranscripts(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingTranscripts(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingTranscripts(false);
                  const files = Array.from(e.dataTransfer.files || []);
                  files.forEach((f) => processAndAddFile(f, 'transcript'));
                }}
                className={`transition-all rounded-xl p-3.5 space-y-2.5 border ${
                  isDraggingTranscripts
                    ? 'bg-emerald-950/40 border-emerald-500 shadow-lg ring-2 ring-emerald-500/30'
                    : 'bg-zinc-900/50 border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white font-display uppercase tracking-wider">
                      Class Transcriptions ({transcriptsCount})
                    </span>
                  </div>
                  <label className="text-[11px] px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 cursor-pointer font-medium flex items-center space-x-1">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>+ Add Session Files</span>
                    <input
                      type="file"
                      multiple
                      accept=".txt,.vtt,.srt,.docx,.pdf"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        files.forEach((f) => processAndAddFile(f, 'transcript'));
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Attached transcript files list */}
                {attachedDocs.filter((d) => d.type === 'transcript').length > 0 && (
                  <div className="space-y-1.5 max-h-24 overflow-y-auto">
                    {attachedDocs
                      .filter((d) => d.type === 'transcript')
                      .map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300"
                        >
                          <span className="truncate pr-2 font-mono text-[11px]">📄 {doc.name}</span>
                          <button
                            onClick={() => handleRemoveDoc(doc.id)}
                            className="text-zinc-500 hover:text-red-400 transition-colors p-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                  </div>
                )}

                <textarea
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                  placeholder="Drop audio transcripts (.vtt, .srt, .txt, .pdf) or paste notes here..."
                  className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-white placeholder-zinc-600 focus:outline-hidden focus:border-zinc-600 font-mono resize-none"
                />
              </div>

              {/* Slot 2: TP & Course Documents (Multiple files) */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingTps(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingTps(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingTps(false);
                  const files = Array.from(e.dataTransfer.files || []);
                  files.forEach((f) => {
                    const lower = f.name.toLowerCase();
                    const isCourse =
                      lower.includes('course') ||
                      lower.includes('cours') ||
                      lower.includes('slide') ||
                      lower.includes('chapitre') ||
                      lower.includes('lecture') ||
                      lower.includes('syllabus');
                    processAndAddFile(f, isCourse ? 'course' : 'tp');
                  });
                }}
                className={`transition-all rounded-xl p-3.5 space-y-2.5 border ${
                  isDraggingTps
                    ? 'bg-sky-950/40 border-sky-500 shadow-lg ring-2 ring-sky-500/30'
                    : 'bg-zinc-900/50 border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Briefcase className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-bold text-white font-display uppercase tracking-wider">
                      TP Lab Sheets & Courses ({tpCount + coursesCount})
                    </span>
                  </div>
                  <label className="text-[11px] px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 cursor-pointer font-medium flex items-center space-x-1">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>+ Add TP / PDF</span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.docx,.txt,.md"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        files.forEach((f) => processAndAddFile(f, 'tp'));
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Attached TP / Course files list */}
                {attachedDocs.filter((d) => d.type === 'tp' || d.type === 'course').length > 0 && (
                  <div className="space-y-1.5 max-h-24 overflow-y-auto">
                    {attachedDocs
                      .filter((d) => d.type === 'tp' || d.type === 'course')
                      .map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300"
                        >
                          <span className="truncate pr-2 font-mono text-[11px]">
                            {doc.type === 'tp' ? '🛠️ TP: ' : '📚 Course: '}
                            {doc.name}
                          </span>
                          <button
                            onClick={() => handleRemoveDoc(doc.id)}
                            className="text-zinc-500 hover:text-red-400 transition-colors p-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                  </div>
                )}

                <textarea
                  value={tpText}
                  onChange={(e) => setTpText(e.target.value)}
                  placeholder="Drop TP lab assignments & course slides (.pdf, .docx, .md) or paste requirements here..."
                  className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-white placeholder-zinc-600 focus:outline-hidden focus:border-zinc-600 font-mono resize-none"
                />
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-zinc-800">
              <span className="text-[11px] text-zinc-400">
                Ready: {transcriptsCount} Session(s) • {tpCount} TP Lab(s)
              </span>

              <button
                type="button"
                onClick={handleStartAnalysis}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-2 shadow-lg shadow-indigo-950/50 cursor-pointer transition-all"
              >
                <Sparkles className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {digestMode === 'master_plan'
                    ? isAppending && hasExistingPlan
                      ? 'Append Sessions to Study Plan'
                      : 'Synthesize Master Study Plan'
                    : 'Analyze & Extract Tasks'}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

        {/* STEP 2: PROCESSING ANIMATION */}
        {step === 'processing' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-indigo-400 animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-base font-extrabold font-display text-white">
                Architecting Curriculum with Gemini
              </h4>
              <p className="text-xs text-zinc-400 font-mono max-w-md">
                {processStatus}
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW MASTER STUDY PLAN */}
        {step === 'review' && digestMode === 'master_plan' && generatedMasterPlan && (
          <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
            
            {/* Big Picture Overarching Mental Model Card */}
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-900/90 border border-zinc-700/80 rounded-xl p-4 space-y-2">
              <div className="flex items-center space-x-2 text-indigo-400">
                <Lightbulb className="w-4 h-4 stroke-[2.5]" />
                <span className="text-xs font-bold font-display uppercase tracking-wider">
                  The Big Picture & Real-World Mental Model
                </span>
              </div>
              <p className="text-xs text-zinc-200 leading-relaxed">
                {generatedMasterPlan.bigPictureDescription}
              </p>
            </div>

            {/* Attention Notices: Things to Give Attention To */}
            {generatedMasterPlan.attentionNotices.length > 0 && (
              <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center space-x-2 text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-bold font-display uppercase tracking-wider">
                    Class Intelligence Radar ({generatedMasterPlan.attentionNotices.length} Notices)
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {generatedMasterPlan.attentionNotices.map((notice) => (
                    <div
                      key={notice.id}
                      className="bg-zinc-950/80 border border-zinc-800 p-2.5 rounded-lg text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-200">{notice.title}</span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300">
                          {notice.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">{notice.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TPs Placed Directly Under Existing Parts */}
            {generatedMasterPlan.pendingTPAttachments &&
              generatedMasterPlan.pendingTPAttachments.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold font-display uppercase tracking-wider text-sky-400">
                      TPs Placed Under Existing Parts ({generatedMasterPlan.pendingTPAttachments.length})
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      Concepts already covered → Attached to prerequisite Part
                    </span>
                  </div>

                  {generatedMasterPlan.pendingTPAttachments.map((att, idx) => (
                    <div
                      key={att.targetTP.id || idx}
                      className="bg-sky-950/20 border border-sky-800/50 rounded-xl p-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-200 border border-indigo-700/70">
                          Placed Under Existing Part {att.attachToPartNumber}
                          {att.attachToPartTitle ? `: ${att.attachToPartTitle}` : ''}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                          ~{formatMinutes(att.targetTP.estimatedMinutes)}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 pt-1">
                        <Briefcase className="w-4 h-4 text-sky-400 shrink-0" />
                        <span className="text-xs font-bold text-sky-200 font-display">
                          Milestone TP: {att.targetTP.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-300">{att.targetTP.description}</p>
                      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                        <span className="text-[10px] text-zinc-400 font-mono">
                          Requires: {att.targetTP.requiredConceptNames.join(' + ')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleScheduleTPAsTask(att.targetTP, todayStr)}
                          className="px-2.5 py-1 rounded-md bg-sky-900/60 hover:bg-sky-800 text-sky-200 border border-sky-700/60 text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Schedule TP as Task</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            {/* Parts: Prerequisite Concepts -> Milestone TP */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold font-display uppercase tracking-wider text-zinc-400">
                  Synthesized Learning Parts ({generatedMasterPlan.parts.length} {generatedMasterPlan.parts.length === 1 ? 'Part' : 'Sequential Parts'})
                </span>
                <span className="text-[11px] text-zinc-500 font-mono">
                  Prerequisite Chained: Concepts → Practical TP
                </span>
              </div>

              {generatedMasterPlan.parts.length === 0 &&
                generatedMasterPlan.pendingTPAttachments &&
                generatedMasterPlan.pendingTPAttachments.length > 0 && (
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-400">
                    All required concepts for the uploaded TP(s) are already covered by your existing parts. No duplicate parts were created — saving will place each TP directly under its matching existing part above.
                  </div>
                )}

              {generatedMasterPlan.parts.map((part) => (
                <div
                  key={part.id}
                  className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3"
                >
                  {/* Part Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 font-mono">
                          Part {part.partNumber}
                        </span>
                        <h4 className="text-sm font-bold text-white font-display">
                          {part.title.replace(/^Part\s+\d+\s*[:\-–]\s*/i, '')}
                        </h4>
                      </div>
                    </div>
                  </div>

                  {/* The Big Picture / Why You Learn It / How It Benefits You */}
                  {part.description && (
                    <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-xl p-3 space-y-1">
                      <div className="flex items-center space-x-2 text-indigo-400">
                        <Lightbulb className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span className="text-[11px] font-extrabold font-display uppercase tracking-wider text-indigo-300">
                          The Big Picture: Why You Learn It & How It Benefits You
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                        {part.description}
                      </p>
                    </div>
                  )}

                  {/* Must-Learn Concepts */}
                  <div className="space-y-2 pt-1 border-t border-zinc-800/80">
                    <span className="text-[11px] font-bold font-display uppercase tracking-wider text-emerald-400 block">
                      Must-Learn Concepts (Prerequisites)
                    </span>
                    <div className="space-y-2">
                      {part.mustLearnConcepts.map((concept) => (
                        <div
                          key={concept.id}
                          className="bg-zinc-950 border border-zinc-800/90 rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-xs font-bold text-zinc-100">{concept.name}</span>
                              <p className="text-[11px] text-zinc-400 mt-0.5">{concept.summary}</p>
                            </div>
                          </div>

                          {/* Rich Video Recommendations */}
                          {concept.videoResources.length > 0 && (
                            <div className="pt-1.5 border-t border-zinc-900 space-y-1.5">
                              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                                Recommended Video Tutorials ({concept.videoResources.length} available):
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {concept.videoResources.map((vid) => (
                                  <div
                                    key={vid.videoId}
                                    className="bg-zinc-900 border border-zinc-800 p-2 rounded-lg flex items-center justify-between gap-2"
                                  >
                                    <div className="flex items-center space-x-2 min-w-0">
                                      <img
                                        src={vid.thumbnail}
                                        alt={vid.title}
                                        className="w-12 h-8 rounded object-cover shrink-0"
                                      />
                                      <div className="min-w-0">
                                        <p className="text-[11px] font-semibold text-zinc-200 truncate">{vid.title}</p>
                                        <span className="text-[10px] text-zinc-500 font-mono">
                                          {vid.durationText || `${vid.durationMinutes}m`} • {vid.channel}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onPlayVideo({
                                            id: 'yt_pv_' + vid.videoId,
                                            title: vid.title,
                                            url: vid.url,
                                            videoId: vid.videoId,
                                            durationMinutes: vid.durationMinutes,
                                            type: 'work',
                                            notes: `[${activeSubject?.name}] ${concept.name}`,
                                            isWatched: false,
                                          })
                                        }
                                        title="Watch Video"
                                        className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                                      >
                                        <Play className="w-3.5 h-3.5 fill-current" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleScheduleConceptVideo(concept, vid, todayStr)}
                                        title="Schedule to Today"
                                        className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-emerald-400 transition-colors"
                                      >
                                        <CalendarPlus className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Target TP Milestone */}
                  {part.targetTP && (
                    <div className="bg-sky-950/20 border border-sky-800/40 rounded-lg p-3 space-y-2 mt-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <Briefcase className="w-4 h-4 text-sky-400" />
                          <span className="text-xs font-bold text-sky-200 font-display">
                            Milestone TP: {part.targetTP.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                          ~{formatMinutes(part.targetTP.estimatedMinutes)}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-300">{part.targetTP.description}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-zinc-400 font-mono">
                          Requires: {part.targetTP.requiredConceptNames.join(' + ')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleScheduleTPAsTask(part.targetTP!, todayStr)}
                          className="px-2.5 py-1 rounded-md bg-sky-900/60 hover:bg-sky-800 text-sky-200 border border-sky-700/60 text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Schedule TP as Task</span>
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold cursor-pointer"
              >
                Back to Input
              </button>

              <button
                type="button"
                onClick={handleSaveMasterPlanToSubject}
                className="px-5 py-2.5 rounded-xl bg-zinc-200 hover:bg-white text-zinc-950 text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-2 shadow-lg cursor-pointer"
              >
                <BookmarkCheck className="w-4 h-4 stroke-[2.5]" />
                <span>Save to Subject & Open Interactive Roadmap</span>
              </button>
            </div>

          </div>
        )}

        {/* STEP 3 (FALLBACK / QUICK): REVIEW QUICK SCHEDULE */}
        {step === 'review' && digestMode === 'quick_schedule' && legacyResult && (
          <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
            <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl">
              <h4 className="text-xs font-bold text-white uppercase font-display mb-1">
                Lecture & Assignment Summary
              </h4>
              <p className="text-xs text-zinc-300">{legacyResult.summary}</p>
            </div>

            {/* Extracted Tasks */}
            <div className="space-y-2">
              <span className="text-xs font-bold font-display uppercase tracking-wider text-zinc-400 block">
                Extracted Assignment Tasks ({selectedTasks.filter((t) => t.selected).length}/{selectedTasks.length})
              </span>
              {selectedTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() =>
                    setSelectedTasks((prev) =>
                      prev.map((item) => (item.id === t.id ? { ...item, selected: !item.selected } : item))
                    )
                  }
                  className={`p-3 rounded-xl border text-xs cursor-pointer flex items-start justify-between ${
                    t.selected
                      ? 'bg-zinc-900 border-zinc-600'
                      : 'bg-zinc-950/60 border-zinc-800 opacity-60'
                  }`}
                >
                  <div className="flex items-start space-x-2.5">
                    <input
                      type="checkbox"
                      checked={t.selected}
                      onChange={() => {}}
                      className="w-4 h-4 mt-0.5 rounded bg-zinc-950 border-zinc-700 text-indigo-600"
                    />
                    <div>
                      <span className="font-bold text-zinc-100">{t.title}</span>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{t.notes}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 shrink-0">{formatMinutes(t.plannedDuration)}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold cursor-pointer"
              >
                Back
              </button>

              <button
                type="button"
                onClick={handleApplyLegacySchedule}
                className="px-5 py-2.5 rounded-xl bg-zinc-200 hover:bg-white text-zinc-950 text-xs font-bold font-display uppercase tracking-wider cursor-pointer"
              >
                Apply to Tomorrow's Schedule
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
