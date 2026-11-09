import React, { useState } from 'react';
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
  Info
} from 'lucide-react';
import { StudySubject, DayPlan, Task, YouTubeVideo, PriorityLevel } from '../types';
import { 
  formatMinutes, 
  getTomorrowDate, 
  getFormattedDate, 
  loadDayPlan, 
  saveDayPlan 
} from '../utils/storage';
import { 
  analyzeLectureWithGemini, 
  getSavedGeminiKey, 
  saveGeminiKey, 
  AIDigestResult, 
  AIExtractedTask, 
  AIConcept 
} from '../utils/aiDigest';

interface AIDigestModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: StudySubject[];
  currentPlan: DayPlan;
  onUpdatePlan: (updatedPlan: DayPlan) => void;
  onPlayVideo: (video: YouTubeVideo) => void;
}

interface AttachedFile {
  name: string;
  size: number;
  content: string;
}

export const AIDigestModal: React.FC<AIDigestModalProps> = ({
  isOpen,
  onClose,
  subjects,
  currentPlan,
  onUpdatePlan,
  onPlayVideo,
}) => {
  const tomorrowStr = getTomorrowDate();
  const todayStr = getFormattedDate();

  // Wizard Step: 'input' | 'processing' | 'review'
  const [step, setStep] = useState<'input' | 'processing' | 'review'>('input');

  // Input states
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [targetDate, setTargetDate] = useState<string>(tomorrowStr);
  const [transcriptText, setTranscriptText] = useState<string>('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [tpNotes, setTpNotes] = useState<string>('');

  // Processing state
  const [processStatus, setProcessStatus] = useState<string>('Analyzing lecture & TP instructions...');

  // Results state
  const [digestResult, setDigestResult] = useState<AIDigestResult | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<AIExtractedTask[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<AIConcept[]>([]);
  const [saveToLibraryAlso, setSaveToLibraryAlso] = useState<boolean>(true);

  // Gemini API Key config drawer
  const [isKeyDrawerOpen, setIsKeyDrawerOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => getSavedGeminiKey());
  const [keySavedMessage, setKeySavedMessage] = useState(false);

  if (!isOpen) return null;

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];

  // Handle file drop for transcript and TP files
  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    if (!files || files.length === 0) return;

    for (const file of files) {
      await processAndAttachFile(file);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      await processAndAttachFile(file);
    }
  };

  const processAndAttachFile = async (file: File) => {
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

        // Fallback for browser / plain text
        if (!extractedText) {
          try {
            extractedText = await file.text();
          } catch {
            extractedText = `Attached file: ${file.name}`;
          }
        }

        // If it's a transcript file (.vtt, .srt, or named transcript) and transcript is empty, fill it
        const lowerName = file.name.toLowerCase();
        if ((lowerName.endsWith('.vtt') || lowerName.endsWith('.srt') || lowerName.includes('transcript')) && !transcriptText) {
          setTranscriptText(extractedText);
        } else {
          setAttachedFiles((prev) => [
            ...prev,
            {
              name: file.name,
              size: file.size,
              content: extractedText,
            },
          ]);
        }
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.warn('File processing error:', err);
    }
  };

  const handleRemoveFile = (idx: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveApiKey = () => {
    saveGeminiKey(apiKeyInput);
    setKeySavedMessage(true);
    setTimeout(() => {
      setKeySavedMessage(false);
      setIsKeyDrawerOpen(false);
    }, 1500);
  };

  // Run AI Analysis & YouTube Matching
  const handleStartAnalysis = async () => {
    if (!transcriptText.trim() && attachedFiles.length === 0 && !tpNotes.trim()) {
      alert('Please paste a lecture transcript, attach a TP file, or enter homework instructions.');
      return;
    }

    setStep('processing');
    setProcessStatus('Step 1/3: Parsing transcript & TP documents with AI...');

    const combinedTpContent = attachedFiles.map((f) => `=== ${f.name} ===\n${f.content}`).join('\n\n') + 
      (tpNotes ? `\n\n=== Manual TP Notes ===\n${tpNotes}` : '');

    try {
      setTimeout(() => {
        setProcessStatus('Step 2/3: Searching top YouTube tutorials for extracted concepts...');
      }, 1200);

      const result = await analyzeLectureWithGemini(
        transcriptText,
        combinedTpContent,
        activeSubject?.name || '',
        apiKeyInput
      );

      setProcessStatus('Step 3/3: Assembling matched videos with concept breakdown notes...');

      setDigestResult(result);
      setSelectedTasks(result.tasks);
      setSelectedVideos(result.concepts.filter((c) => !!c.matchedVideo));
      setStep('review');
    } catch (err) {
      console.error('Digest analysis failed:', err);
      alert('Analysis failed. Please check your transcript input or API key.');
      setStep('input');
    }
  };

  // Toggle selection
  const handleToggleTask = (taskId: string) => {
    setSelectedTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, selected: !t.selected } : t))
    );
  };

  const handleToggleVideo = (conceptId: string) => {
    setSelectedVideos((prev) => {
      const exists = prev.some((c) => c.id === conceptId);
      if (exists) {
        return prev.filter((c) => c.id !== conceptId);
      } else {
        const found = digestResult?.concepts.find((c) => c.id === conceptId);
        return found ? [...prev, found] : prev;
      }
    });
  };

  // Schedule Final Plan
  const handleApplyToSchedule = () => {
    const targetPlan = targetDate === currentPlan.date ? currentPlan : loadDayPlan(targetDate);

    // 1. Build Tasks to add
    const activeTasksToAdd = selectedTasks
      .filter((t) => t.selected)
      .map((t) => {
        const newTask: Task = {
          id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          title: t.title,
          notes: t.notes,
          plannedDuration: t.plannedDuration,
          actualDuration: 0,
          status: 'pending',
          priority: t.priority,
        };
        return newTask;
      });

    // 2. Build Videos to add (with concept explanation notes attached!)
    const activeVideosToAdd = selectedVideos
      .filter((c) => c.matchedVideo)
      .map((c) => {
        const mv = c.matchedVideo!;
        const newVid: YouTubeVideo = {
          id: 'yt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          title: mv.title,
          url: mv.url,
          videoId: mv.videoId,
          durationMinutes: mv.durationMinutes,
          type: 'work',
          notes: `[${c.conceptName}] ${c.videoNote}`,
          isWatched: false,
        };
        return newVid;
      });

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

    // Reset and close
    setStep('input');
    setTranscriptText('');
    setAttachedFiles([]);
    setTpNotes('');
    onClose();
  };

  // Calculations for review step
  const tasksTotalMins = selectedTasks
    .filter((t) => t.selected)
    .reduce((sum, t) => sum + t.plannedDuration, 0);

  const videosTotalMins = selectedVideos
    .filter((c) => c.matchedVideo)
    .reduce((sum, c) => sum + (c.matchedVideo?.durationMinutes || 0), 0);

  const grandTotalMins = tasksTotalMins + videosTotalMins;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col p-5 shadow-2xl relative overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200">
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-extrabold font-display uppercase tracking-wider text-white">
                  AI Lecture & TP Homework Digest
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                  Teams / Wispr Flow
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Automatically extracts homework & TPs, discovers top YouTube tutorials, and crafts your study schedule.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsKeyDrawerOpen(!isKeyDrawerOpen)}
              title="Configure Gemini API Key"
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1 transition-colors ${
                apiKeyInput
                  ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white'
                  : 'bg-amber-950/40 text-amber-300 border-amber-800/60 hover:bg-amber-900/60'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span className="text-[11px]">{apiKeyInput ? 'API Key Configured' : 'Set Gemini Key'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Gemini API Key Drawer */}
        {isKeyDrawerOpen && (
          <div className="bg-zinc-900 border-b border-zinc-800 p-3.5 -mx-5 -mt-0 mb-3 space-y-2.5 animate-fade-in shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-bold font-display uppercase tracking-wider text-white">
                  Google Gemini API Key
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  (Free tier available from Google AI Studio)
                </span>
              </div>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center space-x-1"
              >
                <span>Get Free Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 bg-[#18181b] border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-zinc-400"
              />
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-200 hover:bg-white text-zinc-950 text-xs font-bold font-display uppercase tracking-wider transition-all"
              >
                {keySavedMessage ? '✓ Saved!' : 'Save Key'}
              </button>
            </div>
            <p className="text-[10px] text-zinc-500">
              Your key is saved locally on your hard drive in <code className="text-zinc-400">focusflow_store.json</code>.
            </p>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          
          {/* STEP 1: INPUT TRANSCRIPT & TP FILES */}
          {step === 'input' && (
            <div className="space-y-4">
              
              {/* Subject & Target Date Selector Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3.5">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                    Course / Subject *
                  </label>
                  <select
                    value={activeSubject?.id || ''}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-zinc-500 cursor-pointer"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        📚 {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                    Target Day Schedule *
                  </label>
                  <select
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-zinc-500 cursor-pointer"
                  >
                    <option value={tomorrowStr}>Tomorrow ({tomorrowStr}) — Recommended</option>
                    <option value={todayStr}>Today ({todayStr})</option>
                  </select>
                </div>
              </div>

              {/* Lecture Transcript Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold font-display uppercase tracking-wider text-zinc-200 flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Lecture Transcription (Teams / Wispr Flow)</span>
                  </label>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {transcriptText.length} characters
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                  placeholder="Paste the transcription of your 7:00 PM session here (from Microsoft Teams, Wispr Flow, or lecture notes)..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-500 font-sans focus:outline-none focus:border-zinc-500 leading-relaxed"
                />
              </div>

              {/* TP Lab Files Drop Zone */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold font-display uppercase tracking-wider text-zinc-200 flex items-center space-x-1.5">
                    <UploadCloud className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Attach Teacher's TP Lab Files (PDF, Word, Code, Docs)</span>
                  </label>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {attachedFiles.length} files attached
                  </span>
                </div>

                {/* Dropzone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  className="border border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-900/50 hover:bg-zinc-900 rounded-xl p-5 text-center transition-colors relative"
                >
                  <UploadCloud className="w-7 h-7 text-zinc-500 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-zinc-300">
                    Drag and drop your TP PDF, lab instructions, or syllabus here
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    Supports .pdf, .docx, .txt, .md, .sh, .py, .c, .vtt, .srt
                  </p>

                  <input
                    type="file"
                    multiple
                    onChange={handleFileInputChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>

                {/* Attached Files List */}
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {attachedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center space-x-2 bg-zinc-800 border border-zinc-700 px-2.5 py-1 rounded-lg text-xs text-zinc-200"
                      >
                        <FileText className="w-3 h-3 text-zinc-400" />
                        <span className="font-medium max-w-xs truncate">{file.name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          ({Math.round(file.size / 1024)} KB)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="text-zinc-500 hover:text-red-400 ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Optional TP prompt / questions note */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Optional TP Homework Specifics / Questions
                </label>
                <input
                  type="text"
                  value={tpNotes}
                  onChange={(e) => setTpNotes(e.target.value)}
                  placeholder="e.g. Due next Monday: create 3 logical volumes and format with ext4"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                />
              </div>

            </div>
          )}

          {/* STEP 2: PROCESSING ANIMATION */}
          {step === 'processing' && (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 shadow-xl">
                  <Sparkles className="w-8 h-8 animate-pulse text-zinc-300" />
                </div>
                <div className="absolute -inset-1 rounded-2xl bg-zinc-500/10 blur-xs -z-10 animate-pulse" />
              </div>

              <div>
                <h4 className="text-base font-bold font-display text-white">
                  Analyzing Your Class & Discovering Tutorials
                </h4>
                <p className="text-xs text-zinc-400 mt-1 max-w-md font-mono">
                  {processStatus}
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs text-zinc-500 pt-2">
                <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                <span>Extracting concepts • Fetching top YouTube videos • Crafting notes</span>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & 1-CLICK SCHEDULE */}
          {step === 'review' && digestResult && (
            <div className="space-y-5">
              
              {/* AI Lecture Summary Card */}
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-zinc-300 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold font-display uppercase tracking-wider text-white">
                    Class Summary & Requirements
                  </h4>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    {digestResult.summary}
                  </p>
                </div>
              </div>

              {/* Section 1: Extracted Tasks & TPs */}
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <h4 className="text-xs font-extrabold font-display uppercase tracking-wider text-white flex items-center space-x-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
                    <span>1. Extracted Tasks & TP Homework ({selectedTasks.filter((t) => t.selected).length})</span>
                  </h4>
                  <span className="text-[11px] font-mono font-bold text-zinc-300">
                    {formatMinutes(tasksTotalMins)}
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTask(task.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start space-x-3 select-none ${
                        task.selected
                          ? 'bg-zinc-900 border-zinc-600 shadow-sm'
                          : 'bg-[#18181b] border-zinc-800/80 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={task.selected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleTask(task.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 rounded border-zinc-700 text-zinc-100 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-white">
                            {task.title}
                          </h5>
                          <span className="text-[11px] font-mono font-bold text-zinc-300">
                            ⏱ {formatMinutes(task.plannedDuration)}
                          </span>
                        </div>
                        {task.notes && (
                          <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                            {task.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Matched YouTube Tutorial Videos (WITH CONCEPT NOTES!) */}
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <div>
                    <h4 className="text-xs font-extrabold font-display uppercase tracking-wider text-white flex items-center space-x-1.5">
                      <Play className="w-3.5 h-3.5 text-zinc-400 fill-current" />
                      <span>2. Recommended YouTube Tutorials with Concept Notes ({selectedVideos.length})</span>
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      Top-ranked videos explaining the unclear topics discussed in your session.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-zinc-300">
                    {formatMinutes(videosTotalMins)}
                  </span>
                </div>

                <div className="space-y-3">
                  {digestResult.concepts.map((concept) => {
                    const video = concept.matchedVideo;
                    if (!video) return null;
                    const isSelected = selectedVideos.some((c) => c.id === concept.id);

                    return (
                      <div
                        key={concept.id}
                        className={`p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-zinc-900 border-zinc-600 shadow-sm'
                            : 'bg-[#18181b] border-zinc-800 opacity-60'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row gap-3">
                          
                          {/* Left: Thumbnail & Play Preview */}
                          <div className="relative aspect-video w-full sm:w-44 bg-black rounded-lg overflow-hidden shrink-0 group">
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/85 text-[10px] font-mono font-bold text-white border border-white/10">
                              ⏱ {formatMinutes(video.durationMinutes)}
                            </div>
                            <button
                              type="button"
                              onClick={() => onPlayVideo({
                                id: video.videoId,
                                title: video.title,
                                url: video.url,
                                videoId: video.videoId,
                                durationMinutes: video.durationMinutes,
                                type: 'work',
                              })}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                            >
                              <div className="w-8 h-8 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-lg">
                                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                              </div>
                            </button>
                          </div>

                          {/* Middle: Details & Concept Note */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                                  {concept.conceptName}
                                </span>
                                <span className="text-[10px] text-zinc-500 font-mono">
                                  {video.channel}
                                </span>
                              </div>

                              <h5 
                                className="text-xs font-bold text-white mt-1 line-clamp-1 leading-snug"
                                title={video.title}
                              >
                                {video.title}
                              </h5>

                              {/* Highlighted Concept Note Box */}
                              <div className="bg-[#18181b] border border-zinc-800 rounded-lg p-2 mt-2 flex items-start space-x-2">
                                <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                                <div className="text-[11px] text-zinc-300 leading-relaxed">
                                  <strong className="text-white">Why & What: </strong>
                                  {concept.videoNote || concept.whyNeeded}
                                </div>
                              </div>
                            </div>

                            {/* Select checkbox */}
                            <div className="flex items-center justify-between pt-2 mt-1 border-t border-zinc-800/80">
                              <span className="text-[10px] text-zinc-400 font-mono">
                                ⏱ {formatMinutes(video.durationMinutes)} work allowance
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleVideo(concept.id)}
                                className={`px-2.5 py-1 rounded text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-zinc-200 text-zinc-950'
                                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                                }`}
                              >
                                {isSelected ? (
                                  <>
                                    <Check className="w-3 h-3 stroke-[3]" />
                                    <span>Selected</span>
                                  </>
                                ) : (
                                  <span>+ Select Video</span>
                                )}
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Impact Banner */}
              <div className="bg-zinc-900 border border-zinc-700/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold font-display uppercase tracking-wider text-white">
                    Schedule Impact for {targetDate}
                  </span>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    Adding <strong className="text-zinc-200 font-mono">{formatMinutes(tasksTotalMins)}</strong> of tasks + <strong className="text-zinc-200 font-mono">{formatMinutes(videosTotalMins)}</strong> of tutorials = <strong className="text-emerald-400 font-mono font-bold">{formatMinutes(grandTotalMins)}</strong> total study time.
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setStep('input')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white"
                  >
                    Back / Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyToSchedule}
                    className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-white text-zinc-950 text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Apply to {targetDate} Plan</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer (Step 1) */}
        {step === 'input' && (
          <div className="pt-3.5 border-t border-zinc-800 flex justify-between items-center shrink-0">
            <span className="text-[11px] text-zinc-500 font-mono">
              Ready for your evening class digest
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleStartAnalysis}
                className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-white text-zinc-950 text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-md cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Analyze Lecture & Find Videos</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
