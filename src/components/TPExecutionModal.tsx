import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Sparkles,
  FileText,
  UploadCloud,
  Trash2,
  Loader2,
  Key,
  ExternalLink,
  CheckCircle2,
  Circle,
  Terminal,
  Copy,
  Check,
  Camera,
  FileCode2,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  AlertCircle,
  Send,
  Layers,
  Download,
  Image as ImageIcon,
  FileDown,
} from 'lucide-react';
import {
  StudySubject,
  SubjectStudyPart,
  SubjectMilestoneTP,
  TPExecutionGuide,
} from '../types';
import {
  generateTPStepByStepGuide,
  askTPStepAssistant,
  getSavedGeminiKey,
  saveGeminiKey,
} from '../utils/aiDigest';
import {
  saveTPExecutionGuide,
  setStudyTPCompletedState,
} from '../utils/storage';

interface TPExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: StudySubject;
  part: SubjectStudyPart;
  tp: SubjectMilestoneTP;
  onUpdateSubjects: (updatedSubjects: StudySubject[]) => void;
  onTPCompleted?: (tpTitle: string, completedTp?: SubjectMilestoneTP) => void;
}

export const TPExecutionModal: React.FC<TPExecutionModalProps> = ({
  isOpen,
  onClose,
  subject,
  part,
  tp,
  onUpdateSubjects,
  onTPCompleted,
}) => {
  const [mode, setMode] = useState<'setup' | 'generating' | 'guide'>('setup');
  const [rawTPText, setRawTPText] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [unreadablePdfWarning, setUnreadablePdfWarning] = useState<boolean>(false);
  const [extraNotes, setExtraNotes] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // API key drawer
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => getSavedGeminiKey());
  const [isKeyDrawerOpen, setIsKeyDrawerOpen] = useState<boolean>(false);
  const [keySavedMessage, setKeySavedMessage] = useState<boolean>(false);

  // Active Guide state
  const [guide, setGuide] = useState<TPExecutionGuide | null>(null);
  const [activeTab, setActiveTab] = useState<number | 'report'>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // In-step troubleshooting assistant
  const [isAskOpen, setIsAskOpen] = useState<boolean>(false);
  const [askInput, setAskInput] = useState<string>('');
  const [askLoading, setAskLoading] = useState<boolean>(false);
  const [askReplyByExercise, setAskReplyByExercise] = useState<Record<string, string>>({});
  const [draggingShotId, setDraggingShotId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ src: string; caption: string } | null>(null);
  const [exportToast, setExportToast] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setApiKeyInput(getSavedGeminiKey());
    setIsKeyDrawerOpen(false);
    setKeySavedMessage(false);
    setErrorMsg(null);
    setUnreadablePdfWarning(false);
    setUploadedFileName('');
    setExtraNotes('');
    setIsAskOpen(false);
    setAskInput('');
    setAskReplyByExercise({});
    setRawTPText(tp.rawContent || '');

    if (tp.executionGuide && tp.executionGuide.exercises.length > 0) {
      setGuide(tp.executionGuide);
      const firstIncomplete = tp.executionGuide.exercises.findIndex((ex) => !ex.isCompleted);
      setActiveTab(firstIncomplete >= 0 ? firstIncomplete : 0);
      setMode('guide');
    } else {
      setGuide(null);
      setActiveTab(0);
      setMode('setup');
    }
  }, [isOpen, tp.id]);

  if (!isOpen) return null;

  const handleSaveApiKey = () => {
    saveGeminiKey(apiKeyInput);
    setKeySavedMessage(true);
    setTimeout(() => setKeySavedMessage(false), 2500);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 1800);
  };

  const processTPFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      let extractedText = '';

      if (window.electronAPI?.parseFileContent && base64) {
        const res = await window.electronAPI.parseFileContent({
          fileName: file.name,
          base64Data: base64,
        });
        if (res.success && res.text) {
          extractedText = res.text;
        }
      }

      const isPdf = file.name.toLowerCase().endsWith('.pdf');
      if (!extractedText && !isPdf) {
        try {
          extractedText = await file.text();
        } catch {
          extractedText = '';
        }
      }

      const clean = extractedText.trim();
      setUploadedFileName(file.name);
      if (isPdf && clean.length < 30) {
        setUnreadablePdfWarning(true);
      } else {
        setUnreadablePdfWarning(false);
        setRawTPText(clean.slice(0, 30000));
      }
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateGuide = async () => {
    const activeKey = apiKeyInput.trim() || getSavedGeminiKey();
    if (!activeKey) {
      setIsKeyDrawerOpen(true);
      setErrorMsg('Please set your Google Gemini API Key so the AI coach can open and structure this TP.');
      return;
    }

    setErrorMsg(null);
    setMode('generating');

    try {
      const generated = await generateTPStepByStepGuide({
        subjectName: subject.name,
        part,
        tp,
        rawTPContent: rawTPText.trim() || undefined,
        extraNotes: extraNotes.trim() || undefined,
        apiKey: activeKey,
      });

      setGuide(generated);
      setActiveTab(0);
      setMode('guide');

      const updated = saveTPExecutionGuide(
        subject.id,
        part.id,
        tp.id,
        generated,
        rawTPText.trim() || undefined
      );
      onUpdateSubjects(updated);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to build TP step-by-step guide. Please retry.');
      setMode('setup');
    }
  };

  const persistGuideUpdate = (nextGuide: TPExecutionGuide) => {
    setGuide(nextGuide);
    const updated = saveTPExecutionGuide(subject.id, part.id, tp.id, nextGuide);
    onUpdateSubjects(updated);
  };

  const handleToggleScreenshot = (exerciseId: string, shotId: string) => {
    if (!guide) return;
    const nextGuide: TPExecutionGuide = {
      ...guide,
      exercises: guide.exercises.map((ex) =>
        ex.id !== exerciseId
          ? ex
          : {
              ...ex,
              screenshotsToTake: ex.screenshotsToTake.map((sc) =>
                sc.id === shotId ? { ...sc, isTaken: !sc.isTaken } : sc
              ),
            }
      ),
    };
    persistGuideUpdate(nextGuide);
  };

  const compressScreenshotFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.onload = () => {
        const rawUrl = reader.result as string;
        const img = new Image();
        img.onerror = () => resolve(rawUrl);
        img.onload = () => {
          const maxDim = 1280;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          resolve(compressed.length < rawUrl.length ? compressed : rawUrl);
        };
        img.src = rawUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAttachScreenshotImage = async (exerciseId: string, shotId: string, file: File) => {
    if (!guide || !file.type.startsWith('image/')) return;
    try {
      const imageDataUrl = await compressScreenshotFile(file);
      const nextGuide: TPExecutionGuide = {
        ...guide,
        exercises: guide.exercises.map((ex) =>
          ex.id !== exerciseId
            ? ex
            : {
                ...ex,
                screenshotsToTake: ex.screenshotsToTake.map((sc) =>
                  sc.id === shotId
                    ? {
                        ...sc,
                        imageDataUrl,
                        imageName: file.name,
                        isTaken: true,
                      }
                    : sc
                ),
              }
        ),
      };
      persistGuideUpdate(nextGuide);
    } catch (err) {
      console.warn('Screenshot attach failed:', err);
    }
  };

  const handleRemoveScreenshotImage = (exerciseId: string, shotId: string) => {
    if (!guide) return;
    const nextGuide: TPExecutionGuide = {
      ...guide,
      exercises: guide.exercises.map((ex) =>
        ex.id !== exerciseId
          ? ex
          : {
              ...ex,
              screenshotsToTake: ex.screenshotsToTake.map((sc) =>
                sc.id === shotId
                  ? {
                      ...sc,
                      imageDataUrl: undefined,
                      imageName: undefined,
                    }
                  : sc
              ),
            }
      ),
    };
    persistGuideUpdate(nextGuide);
  };

  const handleToggleExerciseDone = (exerciseId: string, advanceToNext: boolean = false) => {
    if (!guide) return;
    const currentIdx = guide.exercises.findIndex((ex) => ex.id === exerciseId);
    const nextGuide: TPExecutionGuide = {
      ...guide,
      exercises: guide.exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, isCompleted: !ex.isCompleted } : ex
      ),
    };
    persistGuideUpdate(nextGuide);

    if (advanceToNext && currentIdx >= 0) {
      if (currentIdx + 1 < guide.exercises.length) {
        setActiveTab(currentIdx + 1);
      } else {
        setActiveTab('report');
      }
    }
  };

  const handleCompleteExerciseAndNext = (exerciseId: string) => {
    if (!guide) return;
    const currentIdx = guide.exercises.findIndex((ex) => ex.id === exerciseId);
    const nextGuide: TPExecutionGuide = {
      ...guide,
      exercises: guide.exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, isCompleted: true } : ex
      ),
    };
    persistGuideUpdate(nextGuide);

    if (currentIdx + 1 < guide.exercises.length) {
      setActiveTab(currentIdx + 1);
    } else {
      setActiveTab('report');
    }
  };

  const handleMarkEntireTPDone = () => {
    if (guide) {
      const allDoneGuide: TPExecutionGuide = {
        ...guide,
        exercises: guide.exercises.map((ex) => ({ ...ex, isCompleted: true })),
      };
      saveTPExecutionGuide(subject.id, part.id, tp.id, allDoneGuide);
    }
    const updated = setStudyTPCompletedState(subject.id, part.id, tp.id, true);
    onUpdateSubjects(updated);
    onTPCompleted?.(tp.title, { ...tp, isCompleted: true });
    onClose();
  };

  const handleAskStepCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guide || typeof activeTab !== 'number' || !askInput.trim() || askLoading) return;
    const activeEx = guide.exercises[activeTab];
    if (!activeEx) return;

    const activeKey = apiKeyInput.trim() || getSavedGeminiKey();
    if (!activeKey) {
      setIsKeyDrawerOpen(true);
      return;
    }

    setAskLoading(true);
    try {
      const reply = await askTPStepAssistant({
        subjectName: subject.name,
        tpTitle: tp.title,
        exercise: activeEx,
        userQuestion: askInput.trim(),
        apiKey: activeKey,
      });
      setAskReplyByExercise((prev) => ({
        ...prev,
        [activeEx.id]: reply,
      }));
      setAskInput('');
    } catch (err: any) {
      setAskReplyByExercise((prev) => ({
        ...prev,
        [activeEx.id]: `Could not get AI help right now: ${err?.message || 'Unknown error'}`,
      }));
    } finally {
      setAskLoading(false);
    }
  };

  const completedExercisesCount = guide
    ? guide.exercises.filter((ex) => ex.isCompleted).length
    : 0;
  const totalExercisesCount = guide ? guide.exercises.length : 0;

  const activeExercise =
    guide && typeof activeTab === 'number' ? guide.exercises[activeTab] : null;

  const fullCompiledReportText = guide
    ? [
        `# ${tp.title} — Lab Report Blueprint`,
        '',
        '## Overall Report Structure',
        guide.reportGeneralStructure,
        '',
        ...guide.exercises.map((ex) => ex.reportSectionLayout),
      ].join('\n\n---\n\n')
    : '';

  const totalAttachedScreenshots = guide
    ? guide.exercises.reduce(
        (acc, ex) => acc + ex.screenshotsToTake.filter((s) => !!s.imageDataUrl).length,
        0
      )
    : 0;

  const sanitizeFilename = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'lab-report';

  const triggerBlobDownload = (content: string, mimeType: string, filename: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportToast(`Exported ${filename}`);
    setTimeout(() => setExportToast(null), 3000);
  };

  const escapeHtmlText = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const handleExportMarkdownReport = () => {
    if (!guide) return;
    const lines: string[] = [
      `# ${subject.name} — ${tp.title}`,
      `**Part ${part.partNumber}:** ${part.title}`,
      `**Date:** ${new Date().toLocaleDateString()}`,
      '',
      '## Lab Overview',
      guide.overview,
      '',
    ];

    if (guide.environmentSetup) {
      lines.push('## Environment Setup', guide.environmentSetup, '');
    }

    lines.push('## Document Structure', '```', guide.reportGeneralStructure, '```', '');

    for (const ex of guide.exercises) {
      lines.push(`## Exercise ${ex.exerciseNumber}: ${ex.title}`, '');
      lines.push(ex.description, '');

      if (ex.machineSteps.length > 0) {
        lines.push('### Commands & Execution Steps');
        for (const st of ex.machineSteps) {
          lines.push(`- **Step ${st.stepNumber} — ${st.title}:** ${st.instruction}`);
          if (st.command) {
            lines.push('  ```bash', `  ${st.command}`, '  ```');
          }
          if (st.expectedResult) {
            lines.push(`  _Expected output:_ ${st.expectedResult}`);
          }
        }
        lines.push('');
      }

      if (ex.questionAnswers.length > 0) {
        lines.push('### Questions & Answers');
        ex.questionAnswers.forEach((qa, idx) => {
          lines.push(`**Q${idx + 1}: ${qa.question}**`, '', qa.answer, '');
        });
      }

      if (ex.screenshotsToTake.length > 0) {
        lines.push('### Captured Screenshots & Figures');
        ex.screenshotsToTake.forEach((sc, idx) => {
          const caption = sc.captionSuggestion || `${sc.label}: ${sc.whatToShow}`;
          if (sc.imageDataUrl) {
            lines.push(`**Figure ${ex.exerciseNumber}.${idx + 1} — ${caption}**`, '');
            lines.push(`![${caption}](${sc.imageDataUrl})`, '');
          } else {
            lines.push(`- [ ] **${sc.label}** — ${sc.whatToShow} _(${sc.captionSuggestion || 'Insert screenshot here'})_`);
          }
        });
        lines.push('');
      }

      lines.push('---', '');
    }

    triggerBlobDownload(
      lines.join('\n'),
      'text/markdown;charset=utf-8',
      `${sanitizeFilename(tp.title)}-report.md`
    );
  };

  const handleExportHtmlReport = () => {
    if (!guide) return;
    const exerciseSectionsHtml = guide.exercises
      .map((ex) => {
        const stepsHtml = ex.machineSteps
          .map(
            (st) => `
              <div class="step-box">
                <div class="step-title">Step ${st.stepNumber}: ${escapeHtmlText(st.title)}</div>
                <p>${escapeHtmlText(st.instruction)}</p>
                ${st.command ? `<pre class="cmd">${escapeHtmlText(st.command)}</pre>` : ''}
                ${st.expectedResult ? `<p class="expected"><strong>Expected:</strong> ${escapeHtmlText(st.expectedResult)}</p>` : ''}
              </div>`
          )
          .join('');

        const qaHtml = ex.questionAnswers
          .map(
            (qa, idx) => `
              <div class="qa-box">
                <div class="qa-q">Q${idx + 1}. ${escapeHtmlText(qa.question)}</div>
                <div class="qa-a">${escapeHtmlText(qa.answer).replace(/\n/g, '<br/>')}</div>
              </div>`
          )
          .join('');

        const shotsHtml = ex.screenshotsToTake
          .map((sc, idx) => {
            const caption = sc.captionSuggestion || `${sc.label} — ${sc.whatToShow}`;
            if (sc.imageDataUrl) {
              return `
                <figure class="shot-fig">
                  <img src="${sc.imageDataUrl}" alt="${escapeHtmlText(sc.label)}" />
                  <figcaption>Figure ${ex.exerciseNumber}.${idx + 1}: ${escapeHtmlText(caption)}</figcaption>
                </figure>`;
            }
            return `
              <div class="shot-placeholder">
                <strong>[Screenshot Placeholder] ${escapeHtmlText(sc.label)}</strong>
                <div>${escapeHtmlText(sc.whatToShow)}</div>
                ${sc.captionSuggestion ? `<div class="muted">Caption: "${escapeHtmlText(sc.captionSuggestion)}"</div>` : ''}
              </div>`;
          })
          .join('');

        return `
          <section class="exercise">
            <h2>Exercise ${ex.exerciseNumber}: ${escapeHtmlText(ex.title)}</h2>
            <p class="desc">${escapeHtmlText(ex.description)}</p>
            ${stepsHtml ? `<h3>Procedure & Commands</h3>${stepsHtml}` : ''}
            ${qaHtml ? `<h3>Questions & Analysis</h3>${qaHtml}` : ''}
            ${shotsHtml ? `<h3>Screenshots & Observations</h3>${shotsHtml}` : ''}
          </section>`;
      })
      .join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtmlText(tp.title)} — Lab Report</title>
  <style>
    body { font-family: 'Segoe UI', Roboto, Arial, sans-serif; color: #18181b; max-width: 860px; margin: 40px auto; padding: 0 24px; line-height: 1.55; }
    header.cover { border-bottom: 3px solid #4f46e5; padding-bottom: 18px; margin-bottom: 28px; }
    .meta { color: #52525b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; }
    h1 { margin: 6px 0 8px; font-size: 26px; color: #09090b; }
    h2 { margin-top: 32px; font-size: 19px; color: #1e1b4b; border-left: 4px solid #4f46e5; padding-left: 10px; }
    h3 { margin-top: 18px; font-size: 14px; color: #3f3f46; text-transform: uppercase; letter-spacing: 0.04em; }
    .overview { background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px; }
    .step-box { border: 1px solid #e4e4e7; border-radius: 8px; padding: 10px 14px; margin-bottom: 10px; background: #fafafa; }
    .step-title { font-weight: 700; font-size: 14px; margin-bottom: 4px; }
    pre.cmd { background: #18181b; color: #e4e4e7; padding: 10px 12px; border-radius: 6px; overflow-x: auto; font-size: 12.5px; }
    .expected { font-size: 12.5px; color: #3f3f46; margin-top: 6px; }
    .qa-box { background: #eef2ff; border-left: 3px solid #4f46e5; padding: 10px 14px; border-radius: 6px; margin-bottom: 10px; }
    .qa-q { font-weight: 700; margin-bottom: 4px; color: #1e1b4b; }
    .shot-fig { margin: 16px 0; text-align: center; page-break-inside: avoid; }
    .shot-fig img { max-width: 100%; max-height: 480px; border: 1px solid #d4d4d8; border-radius: 6px; }
    .shot-fig figcaption { font-size: 12.5px; color: #52525b; margin-top: 6px; font-style: italic; }
    .shot-placeholder { border: 2px dashed #a1a1aa; border-radius: 8px; padding: 16px; text-align: center; margin: 12px 0; color: #52525b; }
    .muted { font-size: 12px; color: #71717a; margin-top: 4px; }
    @media print { body { margin: 16px; } section.exercise { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <header class="cover">
    <div class="meta">${escapeHtmlText(subject.name)} • Part ${part.partNumber}: ${escapeHtmlText(part.title)}</div>
    <h1>${escapeHtmlText(tp.title)}</h1>
    <div class="muted">Generated ${new Date().toLocaleDateString()} • Tip: Open in Word to edit directly, or press Ctrl+P → Save as PDF.</div>
  </header>
  <div class="overview">
    <strong>Lab Objective:</strong> ${escapeHtmlText(guide.overview)}
    ${guide.environmentSetup ? `<br/><br/><strong>Environment Setup:</strong> ${escapeHtmlText(guide.environmentSetup)}` : ''}
  </div>
  ${exerciseSectionsHtml}
</body>
</html>`;

    triggerBlobDownload(
      html,
      'text/html;charset=utf-8',
      `${sanitizeFilename(tp.title)}-report.html`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-5xl max-h-[93vh] flex flex-col p-5 shadow-2xl relative overflow-hidden">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800 shrink-0 gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-sky-950/70 border border-sky-700/70 flex items-center justify-center text-sky-300 shrink-0">
              <Play className="w-4.5 h-4.5 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-extrabold font-display uppercase tracking-wider text-white truncate">
                  AI TP Coach: {tp.title}
                </h3>
                {guide && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-mono">
                    {completedExercisesCount}/{totalExercisesCount} Exercises Done
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                {subject.name} • Part {part.partNumber}: {part.title}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {mode === 'guide' && (
              <button
                type="button"
                onClick={() => {
                  setMode('setup');
                  setErrorMsg(null);
                }}
                title="Upload a new TP PDF or regenerate this guide"
                className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-[11px] font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Re-open / New PDF</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsKeyDrawerOpen(!isKeyDrawerOpen)}
              title="Configure Gemini API Key"
              className={`p-1.5 px-2.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                apiKeyInput
                  ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white'
                  : 'bg-amber-950/40 text-amber-300 border-amber-800/60 hover:bg-amber-900/60'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden sm:inline">
                {apiKeyInput ? 'API Key Active' : 'Set Key'}
              </span>
            </button>

            <button
              type="button"
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
                <span>Get key at Google AI Studio</span>
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
                type="button"
                onClick={handleSaveApiKey}
                className="px-3 py-1.5 bg-zinc-200 hover:bg-white text-zinc-950 rounded-lg text-xs font-bold font-display uppercase tracking-wider cursor-pointer"
              >
                Save
              </button>
            </div>
            {keySavedMessage && (
              <span className="text-[11px] text-emerald-400 mt-1 block font-medium">
                ✓ Gemini API key saved!
              </span>
            )}
          </div>
        )}

        {/* MODE 1: PRE-LAUNCH SETUP */}
        {mode === 'setup' && (
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            <div className="bg-sky-950/25 border border-sky-800/60 rounded-xl p-4 space-y-2">
              <span className="text-[11px] font-bold font-display uppercase tracking-wider text-sky-300 block">
                Lab Overview &amp; Coaching Strategy
              </span>
              <p className="text-xs text-zinc-200 leading-relaxed">{tp.description}</p>
              <div className="text-[11px] font-mono text-zinc-400 pt-1">
                Prerequisites used: {tp.requiredConceptNames.join(' • ')}
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-950/40 border border-red-800/70 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-red-200">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Optional Full TP PDF Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) processTPFile(f);
              }}
              className={`rounded-xl border-2 border-dashed p-5 transition-all space-y-3 ${
                isDragging
                  ? 'bg-sky-950/35 border-sky-400 ring-2 ring-sky-500/30'
                  : 'bg-zinc-900/40 border-zinc-700/80 hover:border-zinc-600'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sky-400 shrink-0">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold font-display uppercase tracking-wider text-white">
                      Attach TP Assignment PDF / Sheet (Optional)
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Upload the original TP PDF if you want the AI to read every exact question and sub-exercise from the sheet. Otherwise click Start right away using the saved TP plan!
                    </p>
                  </div>
                </div>

                <label className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold font-display uppercase tracking-wider border border-zinc-600 cursor-pointer flex items-center space-x-1.5 shrink-0">
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  <span>Select TP PDF</span>
                  <input
                    type="file"
                    accept=".pdf,.txt,.md,.docx"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) processTPFile(f);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {(uploadedFileName || rawTPText.trim().length > 0) && (
                <div
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${
                    unreadablePdfWarning
                      ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                      : 'bg-zinc-950/80 border-zinc-800 text-emerald-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate font-medium">
                      {uploadedFileName || 'Saved TP assignment text loaded'}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                      {unreadablePdfWarning
                        ? '(Could not extract text — scanned image PDF?)'
                        : `(${Math.max(1, Math.round(rawTPText.length / 1000))}k chars ready)`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRawTPText('');
                      setUploadedFileName('');
                      setUnreadablePdfWarning(false);
                    }}
                    className="p-1 text-zinc-500 hover:text-red-400 cursor-pointer"
                    title="Clear TP sheet text"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <textarea
                rows={2}
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
                placeholder="Optional: Paste specific TP questions or describe your setup (e.g. 'Debian 13 VM, sudo user, /dev/sdb empty 5GB disk')..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-hidden focus:border-zinc-600 resize-none"
              />
            </div>

            {/* Strategy Preview */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-2">
              <span className="text-[11px] font-bold font-display uppercase tracking-wider text-zinc-400 block">
                How the AI Will Guide You Part by Part
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-[11px]">
                <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-2.5">
                  <div className="font-bold text-indigo-300">1. Exercise Objective</div>
                  <div className="text-zinc-400 mt-0.5">What we will accomplish in this exercise</div>
                </div>
                <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-2.5">
                  <div className="font-bold text-sky-300">2. Machine Steps &amp; Q&amp;A</div>
                  <div className="text-zinc-400 mt-0.5">Copy-ready commands + answers to questions</div>
                </div>
                <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-2.5">
                  <div className="font-bold text-amber-300">3. Screenshots Checklist</div>
                  <div className="text-zinc-400 mt-0.5">Exact outputs to capture &amp; check off</div>
                </div>
                <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-2.5">
                  <div className="font-bold text-emerald-300">4. Report Blueprint</div>
                  <div className="text-zinc-400 mt-0.5">Where to place screenshots &amp; answers</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: GENERATING SPINNER */}
        {mode === 'generating' && (
          <div className="flex-1 flex flex-col items-center justify-center py-16 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-sky-950/60 border border-sky-700/70 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />
            </div>
            <div>
              <h4 className="text-base font-extrabold font-display text-white">
                Preparing Your Part-by-Part TP Execution Plan...
              </h4>
              <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                Breaking {tp.title} down exercise by exercise with machine commands, question answers, screenshots to capture, and report layout.
              </p>
            </div>
          </div>
        )}

        {/* MODE 3: INTERACTIVE STEP-BY-STEP GUIDE */}
        {mode === 'guide' && guide && (
          <div className="flex-1 flex flex-col min-h-0 pt-3 space-y-3">
            {/* Overview & Environment Setup */}
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl px-3.5 py-2.5 shrink-0 space-y-1">
              <p className="text-xs text-zinc-200 leading-relaxed">{guide.overview}</p>
              {guide.environmentSetup && (
                <p className="text-[11px] text-amber-300/90 font-mono">
                  Prep: {guide.environmentSetup}
                </p>
              )}
            </div>

            {/* Part-by-Part Exercise Stepper Bar */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 shrink-0">
              {guide.exercises.map((ex, idx) => {
                const isActive = activeTab === idx;
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => setActiveTab(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-display flex items-center space-x-1.5 border transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-sky-600 text-white border-sky-400 shadow-sm'
                        : ex.isCompleted
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-700/70 hover:bg-emerald-950/60'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    {ex.isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                    ) : (
                      <span className="text-[10px] font-mono opacity-80">#{ex.exerciseNumber}</span>
                    )}
                    <span className="max-w-[180px] truncate">{ex.title}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setActiveTab('report')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-display flex items-center space-x-1.5 border transition-all shrink-0 ml-auto cursor-pointer ${
                  activeTab === 'report'
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                    : 'bg-zinc-900 text-emerald-300 border-emerald-800/60 hover:bg-emerald-950/40'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>Full Report Blueprint</span>
              </button>
            </div>

            {/* Active Exercise Content */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 pb-2">
              {activeExercise ? (
                <>
                  {/* SECTION 1: Description — What We Gonna Do */}
                  <div className="bg-indigo-950/25 border border-indigo-800/60 rounded-xl p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <Layers className="w-4 h-4 text-indigo-400" />
                        <span className="text-[11px] font-extrabold font-display uppercase tracking-wider text-indigo-300">
                          Exercise {activeExercise.exerciseNumber} — What We&apos;re Going to Do
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleExerciseDone(activeExercise.id)}
                        className={`px-2.5 py-1 rounded-md border text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-colors ${
                          activeExercise.isCompleted
                            ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        {activeExercise.isCompleted ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Circle className="w-3.5 h-3.5" />
                        )}
                        <span>{activeExercise.isCompleted ? 'Exercise Done' : 'Mark Exercise Done'}</span>
                      </button>
                    </div>
                    <h4 className="text-sm font-extrabold text-white">{activeExercise.title}</h4>
                    <p className="text-xs text-zinc-200 leading-relaxed">
                      {activeExercise.description}
                    </p>
                  </div>

                  {/* SECTION 2: Steps on Your Machine + Questions Answered */}
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Terminal className="w-4 h-4 text-sky-400" />
                      <span className="text-[11px] font-extrabold font-display uppercase tracking-wider text-sky-300">
                        Steps to Execute on Your Machine ({activeExercise.machineSteps.length} Steps)
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {activeExercise.machineSteps.map((st) => {
                        const copyKey = `${activeExercise.id}_step_${st.stepNumber}`;
                        return (
                          <div
                            key={copyKey}
                            className="bg-zinc-950/90 border border-zinc-800 rounded-lg p-3 space-y-2"
                          >
                            <div className="flex items-start space-x-2.5">
                              <span className="w-5 h-5 rounded-full bg-sky-950 text-sky-300 border border-sky-800 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {st.stepNumber}
                              </span>
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="text-xs font-bold text-white">{st.title}</div>
                                <p className="text-xs text-zinc-300 leading-relaxed">
                                  {st.instruction}
                                </p>
                              </div>
                            </div>

                            {st.command && (
                              <div className="bg-[#0d0d10] border border-zinc-800 rounded-lg px-3 py-2 flex items-start justify-between gap-2 ml-7">
                                <pre className="text-[11px] font-mono text-emerald-300 whitespace-pre-wrap break-all leading-relaxed flex-1">
                                  {st.command}
                                </pre>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(copyKey, st.command!)}
                                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono flex items-center space-x-1 shrink-0 cursor-pointer"
                                >
                                  {copiedId === copyKey ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-300">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}

                            {st.expectedResult && (
                              <div className="ml-7 text-[11px] text-zinc-400 bg-zinc-900/60 border border-zinc-800/70 rounded px-2.5 py-1.5">
                                <span className="text-emerald-400 font-semibold mr-1">Expected:</span>
                                {st.expectedResult}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Answering Questions in This Exercise */}
                    {activeExercise.questionAnswers.length > 0 ? (
                      <div className="pt-3 border-t border-zinc-800 space-y-2.5">
                        <div className="flex items-center space-x-2">
                          <HelpCircle className="w-4 h-4 text-purple-400" />
                          <span className="text-[11px] font-extrabold font-display uppercase tracking-wider text-purple-300">
                            Answers to Questions ({activeExercise.questionAnswers.length})
                          </span>
                        </div>
                        <div className="space-y-2">
                          {activeExercise.questionAnswers.map((qa, qaIdx) => (
                            <div
                              key={qaIdx}
                              className="bg-purple-950/15 border border-purple-800/50 rounded-lg p-3 space-y-1.5"
                            >
                              <div className="text-xs font-bold text-purple-200">
                                Q{qaIdx + 1}: {qa.question}
                              </div>
                              <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-line">
                                <span className="font-bold text-emerald-300 mr-1">Answer:</span>
                                {qa.answer}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-500 font-mono">
                        No separate theory questions in this exercise — follow the machine commands and capture the proof below.
                      </div>
                    )}
                  </div>

                  {/* SECTION 3: Screenshots to Take */}
                  <div className="bg-amber-950/15 border border-amber-800/50 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Camera className="w-4 h-4 text-amber-400" />
                        <span className="text-[11px] font-extrabold font-display uppercase tracking-wider text-amber-300">
                          Screenshots to Take ({activeExercise.screenshotsToTake.filter((s) => s.isTaken).length}/{activeExercise.screenshotsToTake.length} Captured)
                        </span>
                      </div>
                    </div>

                    {activeExercise.screenshotsToTake.length > 0 ? (
                      <div className="space-y-2.5">
                        {activeExercise.screenshotsToTake.map((sc) => (
                          <div
                            key={sc.id}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDraggingShotId(sc.id);
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDraggingShotId((prev) => (prev === sc.id ? null : prev));
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDraggingShotId(null);
                              const file = e.dataTransfer.files?.[0];
                              if (file) {
                                handleAttachScreenshotImage(activeExercise.id, sc.id, file);
                              }
                            }}
                            className={`rounded-lg border p-3 transition-colors space-y-2.5 ${
                              draggingShotId === sc.id
                                ? 'bg-amber-950/50 border-amber-400 ring-2 ring-amber-400/30'
                                : sc.isTaken
                                ? 'bg-amber-950/30 border-amber-600/60'
                                : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <label className="flex items-start space-x-3 flex-1 min-w-0 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!sc.isTaken}
                                  onChange={() => handleToggleScreenshot(activeExercise.id, sc.id)}
                                  className="w-4 h-4 mt-0.5 rounded bg-zinc-950 border-zinc-600 text-amber-500 focus:ring-0"
                                />
                                <div className="flex-1 min-w-0 space-y-0.5">
                                  <div
                                    className={`text-xs font-bold ${
                                      sc.isTaken ? 'line-through text-zinc-400' : 'text-amber-100'
                                    }`}
                                  >
                                    {sc.label}
                                  </div>
                                  <p className="text-[11px] text-zinc-300">{sc.whatToShow}</p>
                                  {sc.captionSuggestion && (
                                    <p className="text-[10px] font-mono text-zinc-400 pt-0.5">
                                      Suggested caption: &quot;{sc.captionSuggestion}&quot;
                                    </p>
                                  )}
                                </div>
                              </label>

                              <label className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] font-semibold text-amber-300 cursor-pointer shrink-0 transition-colors">
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span>{sc.imageDataUrl ? 'Replace' : 'Attach PNG/JPG'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) {
                                      handleAttachScreenshotImage(activeExercise.id, sc.id, f);
                                    }
                                    e.target.value = '';
                                  }}
                                  className="hidden"
                                />
                              </label>
                            </div>

                            {sc.imageDataUrl ? (
                              <div className="relative rounded-lg overflow-hidden border border-zinc-800 bg-black/50 p-2 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <img
                                    src={sc.imageDataUrl}
                                    alt={sc.label}
                                    onClick={() =>
                                      setPreviewImage({
                                        src: sc.imageDataUrl!,
                                        caption: sc.captionSuggestion || sc.label,
                                      })
                                    }
                                    className="h-16 w-28 object-cover rounded border border-zinc-700 cursor-zoom-in shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-[11px] font-medium text-emerald-300 truncate">
                                      Attached: {sc.imageName || 'Screenshot'}
                                    </div>
                                    <div className="text-[10px] text-zinc-500">
                                      Included automatically in exported Lab Report (click thumbnail to zoom)
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveScreenshotImage(activeExercise.id, sc.id)}
                                  className="p-1.5 rounded-md text-zinc-400 hover:text-red-400 hover:bg-zinc-900 cursor-pointer shrink-0"
                                  title="Remove attached screenshot"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="text-[10px] text-zinc-500 font-mono pl-7">
                                Tip: Drag &amp; drop your terminal/VM screenshot directly onto this card to embed it in the exported report.
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400">
                        No screenshots strictly required for this exercise.
                      </p>
                    )}
                  </div>

                  {/* SECTION 4: How Your Report Should Look Like */}
                  <div className="bg-emerald-950/15 border border-emerald-800/50 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <FileCode2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-[11px] font-extrabold font-display uppercase tracking-wider text-emerald-300">
                          How Your Report Should Look Like (Where to Put Screenshots &amp; Questions)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(`rep_${activeExercise.id}`, activeExercise.reportSectionLayout)
                        }
                        className="px-2.5 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/70 text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                      >
                        {copiedId === `rep_${activeExercise.id}` ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Section</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="bg-zinc-950/90 border border-zinc-800 rounded-lg p-3.5 text-[11px] font-mono text-zinc-200 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                      {activeExercise.reportSectionLayout}
                    </pre>
                  </div>

                  {/* Collapsible In-Step Troubleshooting Helper */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 space-y-2.5">
                    <button
                      type="button"
                      onClick={() => setIsAskOpen(!isAskOpen)}
                      className="w-full flex items-center justify-between text-xs font-bold text-indigo-300 hover:text-indigo-200 cursor-pointer"
                    >
                      <span className="flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Stuck on a command or got an error in Exercise {activeExercise.exerciseNumber}? Ask AI Coach</span>
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {isAskOpen ? 'Hide' : 'Ask'}
                      </span>
                    </button>

                    {isAskOpen && (
                      <div className="space-y-2.5 pt-1">
                        <form onSubmit={handleAskStepCoach} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={askInput}
                            onChange={(e) => setAskInput(e.target.value)}
                            placeholder="Paste terminal error or ask a quick question about this exercise..."
                            className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-indigo-500"
                          />
                          <button
                            type="submit"
                            disabled={askLoading || !askInput.trim()}
                            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white text-xs font-bold flex items-center space-x-1 cursor-pointer disabled:cursor-not-allowed"
                          >
                            {askLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            <span>Ask</span>
                          </button>
                        </form>

                        {askReplyByExercise[activeExercise.id] && (
                          <div className="bg-zinc-950 border border-indigo-800/60 rounded-lg p-3 text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">
                            {askReplyByExercise[activeExercise.id]}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* FULL REPORT BLUEPRINT TAB */
                <div className="space-y-4">
                  <div className="bg-emerald-950/20 border border-emerald-700/70 rounded-xl p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-extrabold font-display text-white">
                          Complete TP Report Blueprint
                        </h4>
                        <p className="text-xs text-zinc-300 mt-0.5">
                          Full structure showing how to assemble your Word / PDF report from cover page to conclusion.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleExportHtmlReport}
                          className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
                          title="Export printable HTML report (open in Word or print to PDF) with embedded screenshots"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>Export HTML / Word Report ({totalAttachedScreenshots} imgs)</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleExportMarkdownReport}
                          className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export .MD</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy('full_report', fullCompiledReportText)}
                          className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
                        >
                          {copiedId === 'full_report' ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Outline</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    {exportToast && (
                      <div className="text-xs text-emerald-300 font-medium pt-1">
                        ✓ {exportToast} — check your Downloads folder.
                      </div>
                    )}
                  </div>

                  {totalAttachedScreenshots > 0 && (
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
                      <span className="text-[11px] font-bold font-display uppercase tracking-wider text-amber-300 block">
                        Embedded Lab Screenshots ({totalAttachedScreenshots})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {guide.exercises.flatMap((ex) =>
                          ex.screenshotsToTake
                            .filter((sc) => !!sc.imageDataUrl)
                            .map((sc) => (
                              <div
                                key={`${ex.id}_${sc.id}`}
                                className="rounded-lg border border-zinc-800 bg-zinc-950 p-2 space-y-1.5"
                              >
                                <img
                                  src={sc.imageDataUrl}
                                  alt={sc.label}
                                  onClick={() =>
                                    setPreviewImage({
                                      src: sc.imageDataUrl!,
                                      caption: `Ex ${ex.exerciseNumber}: ${sc.captionSuggestion || sc.label}`,
                                    })
                                  }
                                  className="w-full h-28 object-cover rounded cursor-zoom-in"
                                />
                                <div className="text-[11px] font-semibold text-zinc-200 truncate">
                                  Ex {ex.exerciseNumber}: {sc.label}
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  )}

                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-2">
                    <span className="text-[11px] font-bold font-display uppercase tracking-wider text-zinc-400 block">
                      Recommended Document Skeleton
                    </span>
                    <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3.5 text-xs font-mono text-zinc-200 whitespace-pre-wrap leading-relaxed">
                      {guide.reportGeneralStructure}
                    </pre>
                  </div>

                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
                    <span className="text-[11px] font-bold font-display uppercase tracking-wider text-emerald-300 block">
                      Combined Exercise Report Sections
                    </span>
                    <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3.5 text-[11px] font-mono text-zinc-200 whitespace-pre-wrap leading-relaxed">
                      {guide.exercises.map((ex) => ex.reportSectionLayout).join('\n\n────────────────────────\n\n')}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Action Bar */}
        {mode !== 'generating' && (
          <div className="pt-3.5 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
            {mode === 'setup' ? (
              <>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {rawTPText.trim()
                    ? 'Using uploaded TP sheet + Part prerequisites'
                    : 'Using saved TP summary + Part prerequisite commands'}
                </span>
                <div className="flex items-center space-x-2 ml-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold font-display uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateGuide}
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold font-display uppercase tracking-wider flex items-center space-x-2 cursor-pointer shadow-md transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Start TP Step-by-Step</span>
                  </button>
                </div>
              </>
            ) : guide && typeof activeTab === 'number' ? (
              <>
                <button
                  type="button"
                  disabled={activeTab === 0}
                  onClick={() => setActiveTab(Math.max(0, activeTab - 1))}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous Exercise</span>
                </button>

                <div className="flex items-center space-x-2 ml-auto">
                  {activeTab + 1 < guide.exercises.length ? (
                    <button
                      type="button"
                      onClick={() =>
                        activeExercise && handleCompleteExerciseAndNext(activeExercise.id)
                      }
                      className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold font-display uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer shadow-md"
                    >
                      <span>Done &amp; Next Exercise</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveTab('report')}
                        className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-300 border border-emerald-700/60 text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
                      >
                        <FileCode2 className="w-3.5 h-3.5" />
                        <span>View Full Report Layout</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleMarkEntireTPDone}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold font-display uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer shadow-md"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Finish &amp; Mark TP Done</span>
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab(Math.max(0, (guide?.exercises.length || 1) - 1))}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Exercises</span>
                </button>
                <button
                  type="button"
                  onClick={handleMarkEntireTPDone}
                  className="ml-auto px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold font-display uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Finish &amp; Mark TP Done</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Screenshot Zoom Preview */}
        {previewImage && (
          <div
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-[80] bg-black/90 flex flex-col items-center justify-center p-6 cursor-zoom-out"
          >
            <img
              src={previewImage.src}
              alt={previewImage.caption}
              className="max-w-full max-h-[82vh] rounded-xl border border-zinc-700 shadow-2xl object-contain"
            />
            <p className="text-xs text-zinc-300 mt-3 bg-zinc-900/90 px-4 py-1.5 rounded-full border border-zinc-800">
              {previewImage.caption} (Click anywhere to close)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
