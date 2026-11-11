import React, { useState, useEffect } from 'react';
import {
  X,
  ClipboardCheck,
  UploadCloud,
  FileText,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Key,
  ExternalLink,
  Layers,
  Plus,
  ArrowUpDown,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  Briefcase,
  Check,
} from 'lucide-react';
import {
  StudySubject,
  CoursePlanAuditResult,
  SubjectStudyPart,
} from '../types';
import {
  auditStudyPlanWithCoursePDF,
  enrichAuditSuggestionsWithVideos,
  getSavedGeminiKey,
  saveGeminiKey,
} from '../utils/aiDigest';
import {
  applyCourseAuditSuggestions,
  saveSubjectCourseDocuments,
  removeSubjectCourseDocument,
} from '../utils/storage';

interface CoursePlanAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: StudySubject;
  onUpdateSubjects: (updatedSubjects: StudySubject[]) => void;
  onAuditApplied?: (summaryMessage: string) => void;
}

interface UploadedCourseDoc {
  id: string;
  name: string;
  size: number;
  content: string;
  unreadablePdf?: boolean;
  isRemembered?: boolean;
}

export const CoursePlanAuditModal: React.FC<CoursePlanAuditModalProps> = ({
  isOpen,
  onClose,
  subject,
  onUpdateSubjects,
  onAuditApplied,
}) => {
  const [step, setStep] = useState<'upload' | 'analyzing' | 'result'>('upload');
  const [courseDocs, setCourseDocs] = useState<UploadedCourseDoc[]>([]);
  const [focusNotes, setFocusNotes] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<CoursePlanAuditResult | null>(null);

  // API key drawer
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => getSavedGeminiKey());
  const [isKeyDrawerOpen, setIsKeyDrawerOpen] = useState<boolean>(false);
  const [keySavedMessage, setKeySavedMessage] = useState<boolean>(false);

  // Interactive acceptance state
  const [acceptReorder, setAcceptReorder] = useState<boolean>(true);
  const [selectedEnhancements, setSelectedEnhancements] = useState<Record<string, boolean>>({});
  const [selectedNewParts, setSelectedNewParts] = useState<Record<string, boolean>>({});
  const [includeNotices, setIncludeNotices] = useState<boolean>(true);
  const [isApplying, setIsApplying] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setStep('upload');
      const rememberedDocs: UploadedCourseDoc[] = (subject.savedCourseDocuments || []).map((d) => ({
        id: d.id,
        name: d.name,
        size: d.content.length,
        content: d.content,
        isRemembered: true,
      }));
      setCourseDocs(rememberedDocs);
      setFocusNotes('');
      setAuditError(null);
      setAuditResult(null);
      setApiKeyInput(getSavedGeminiKey());
      setIsKeyDrawerOpen(false);
      setKeySavedMessage(false);
      setAcceptReorder(true);
      setSelectedEnhancements({});
      setSelectedNewParts({});
      setIncludeNotices(true);
      setIsApplying(false);
    }
  }, [isOpen, subject.id]);

  if (!isOpen || !subject.studyPlan) return null;

  const existingPlan = subject.studyPlan;
  const totalConceptsCount = existingPlan.parts.reduce(
    (sum, p) => sum + p.mustLearnConcepts.length,
    0
  );
  const totalTPsCount = existingPlan.parts.reduce(
    (sum, p) => sum + (p.targetTP ? 1 : 0) + (p.additionalTPs?.length || 0),
    0
  );

  const handleSaveApiKey = () => {
    saveGeminiKey(apiKeyInput);
    setKeySavedMessage(true);
    setTimeout(() => setKeySavedMessage(false), 2500);
  };

  const processCourseFile = (file: File) => {
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

      const cleanExtracted = extractedText.trim();
      const unreadablePdf = isPdf && cleanExtracted.length < 30;
      const docId = `cdoc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      setCourseDocs((prev) => {
        const filtered = prev.filter(
          (d) => d.name.trim().toLowerCase() !== file.name.trim().toLowerCase()
        );
        return [
          ...filtered,
          {
            id: docId,
            name: file.name,
            size: file.size,
            content: cleanExtracted,
            unreadablePdf,
            isRemembered: !unreadablePdf && cleanExtracted.length >= 20,
          },
        ];
      });

      if (!unreadablePdf && cleanExtracted.length >= 20) {
        const updatedSubjects = saveSubjectCourseDocuments(subject.id, [
          { id: docId, name: file.name, content: cleanExtracted },
        ]);
        onUpdateSubjects(updatedSubjects);
      }

      setAuditError(null);
    };
    reader.readAsDataURL(file);
  };

  const removeCourseDoc = (id: string) => {
    setCourseDocs((prev) => prev.filter((d) => d.id !== id));
    const updatedSubjects = removeSubjectCourseDocument(subject.id, id);
    onUpdateSubjects(updatedSubjects);
  };

  const readableDocs = courseDocs.filter((d) => !d.unreadablePdf && d.content.length >= 20);
  const hasAnyContentToAudit = readableDocs.length > 0 || focusNotes.trim().length >= 20;

  const handleRunAudit = async () => {
    const activeKey = apiKeyInput.trim() || getSavedGeminiKey();
    if (!activeKey) {
      setIsKeyDrawerOpen(true);
      setAuditError('Please add your Google Gemini API Key so the AI can audit your plan against the Course PDF.');
      return;
    }

    const docsPayload = [...readableDocs.map((d) => ({ name: d.name, content: d.content }))];
    if (docsPayload.length === 0 && focusNotes.trim()) {
      docsPayload.push({ name: 'Course Syllabus / Outline', content: focusNotes.trim() });
    }

    if (docsPayload.length === 0) {
      setAuditError('Upload at least one readable Course PDF (or paste your course syllabus outline).');
      return;
    }

    setAuditError(null);
    setStep('analyzing');

    try {
      const result = await auditStudyPlanWithCoursePDF({
        subjectName: subject.name,
        courseDocuments: docsPayload,
        existingPlan,
        additionalNotes: docsPayload.length > 0 ? focusNotes.trim() : undefined,
        apiKey: activeKey,
      });

      const initEnh: Record<string, boolean> = {};
      result.enhancements.forEach((e) => {
        initEnh[e.id] = true;
      });
      const initNewParts: Record<string, boolean> = {};
      result.newParts.forEach((np) => {
        initNewParts[np.id] = true;
      });

      setAcceptReorder(!!result.reorderSuggestion?.recommended);
      setSelectedEnhancements(initEnh);
      setSelectedNewParts(initNewParts);
      setIncludeNotices(result.additionalNotices.length > 0);
      setAuditResult(result);
      setStep('result');
    } catch (err: any) {
      setAuditError(err?.message || 'Failed to audit study plan. Please try again.');
      setStep('upload');
    }
  };

  const selectedEnhCount = auditResult
    ? auditResult.enhancements.filter((e) => selectedEnhancements[e.id]).length
    : 0;
  const selectedNewPartCount = auditResult
    ? auditResult.newParts.filter((np) => selectedNewParts[np.id]).length
    : 0;
  const reorderSelected = !!auditResult?.reorderSuggestion?.recommended && acceptReorder;
  const noticesSelected =
    !!auditResult && auditResult.additionalNotices.length > 0 && includeNotices;
  const totalSelectedActions =
    selectedEnhCount + selectedNewPartCount + (reorderSelected ? 1 : 0);

  const handleToggleAll = (checked: boolean) => {
    if (!auditResult) return;
    if (auditResult.reorderSuggestion?.recommended) {
      setAcceptReorder(checked);
    }
    const nextEnh: Record<string, boolean> = {};
    auditResult.enhancements.forEach((e) => {
      nextEnh[e.id] = checked;
    });
    setSelectedEnhancements(nextEnh);

    const nextNp: Record<string, boolean> = {};
    auditResult.newParts.forEach((np) => {
      nextNp[np.id] = checked;
    });
    setSelectedNewParts(nextNp);
    setIncludeNotices(checked && auditResult.additionalNotices.length > 0);
  };

  const handleAcceptAndApply = async () => {
    if (!auditResult || isApplying || totalSelectedActions === 0) return;

    setIsApplying(true);
    try {
      const approvedEnhancements = auditResult.enhancements.filter(
        (e) => selectedEnhancements[e.id]
      );
      const approvedNewParts = auditResult.newParts.filter(
        (np) => selectedNewParts[np.id]
      );

      const { preparedEnhancements, preparedNewParts } =
        await enrichAuditSuggestionsWithVideos(approvedEnhancements, approvedNewParts);

      const updatedSubjects = applyCourseAuditSuggestions(subject.id, {
        acceptReorder: reorderSelected,
        orderedPartIds: auditResult.reorderSuggestion?.orderedPartIds,
        acceptedEnhancements: preparedEnhancements,
        acceptedNewParts: preparedNewParts,
        acceptedNotices: noticesSelected ? auditResult.additionalNotices : [],
      });

      onUpdateSubjects(updatedSubjects);

      const summaryBits: string[] = [];
      if (preparedEnhancements.length > 0) {
        summaryBits.push(`${preparedEnhancements.length} part enhancement${preparedEnhancements.length > 1 ? 's' : ''}`);
      }
      if (preparedNewParts.length > 0) {
        summaryBits.push(`${preparedNewParts.length} new part${preparedNewParts.length > 1 ? 's' : ''}`);
      }
      if (reorderSelected) {
        summaryBits.push('prerequisite reorder');
      }

      onAuditApplied?.(`Applied ${summaryBits.join(', ')} to ${subject.name}!`);
      onClose();
    } catch (err: any) {
      setAuditError(err?.message || 'Could not apply changes. Please retry.');
    } finally {
      setIsApplying(false);
    }
  };

  const formatInsertLabel = (
    pos: 'start' | 'after_part' | 'end',
    partNumber: number | null,
    partTitle?: string
  ) => {
    if (pos === 'start') return 'Insert at Start (Before Part 1)';
    if (pos === 'after_part' && partNumber) {
      return `Insert After Part ${partNumber}${partTitle ? `: ${partTitle}` : ''}`;
    }
    return 'Append at End of Roadmap';
  };

  const partLookup = new Map<string, SubjectStudyPart>();
  existingPlan.parts.forEach((p) => partLookup.set(p.id, p));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col p-5 shadow-2xl relative overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/60 border border-emerald-700/70 flex items-center justify-center text-emerald-300">
              <ClipboardCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-extrabold font-display uppercase tracking-wider text-white">
                  AI Course Plan Auditor
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                  {subject.name}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Compare your existing parts &amp; TP concepts against the official Course PDF to verify coverage and ordering.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
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
              <span className="text-[11px]">{apiKeyInput ? 'API Key Active' : 'Set Gemini Key'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isApplying}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Optional Gemini API Key Drawer */}
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

        {/* STEP 1: COURSE PDF UPLOAD */}
        {step === 'upload' && (
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            {/* Existing Roadmap Summary Strip */}
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5">
                <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-white block">
                    Current Plan Being Checked
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    The AI will check all existing parts, concepts, prerequisite flow, and attached TPs against your Course PDF.
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold">
                  {existingPlan.parts.length} Parts
                </span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold">
                  {totalConceptsCount} Concepts
                </span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold">
                  {totalTPsCount} TPs
                </span>
              </div>
            </div>

            {auditError && (
              <div className="bg-red-950/40 border border-red-800/70 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-red-200">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{auditError}</span>
              </div>
            )}

            {/* Drag & Drop Course PDF Zone */}
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
                Array.from(e.dataTransfer.files || []).forEach(processCourseFile);
              }}
              className={`rounded-xl border-2 border-dashed p-6 transition-all text-center space-y-3 ${
                isDragging
                  ? 'bg-emerald-950/30 border-emerald-400 ring-2 ring-emerald-500/30'
                  : 'bg-zinc-900/40 border-zinc-700/80 hover:border-zinc-600'
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto text-emerald-400">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  Drop Course PDF(s) Here
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Upload your lecture slides, course book, or official syllabus (.pdf, .txt, .md)
                </p>
              </div>
              <label className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold font-display uppercase tracking-wider border border-zinc-600 cursor-pointer transition-colors">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Select Course PDF</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.txt,.md,.docx"
                  onChange={(e) => {
                    Array.from(e.target.files || []).forEach(processCourseFile);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </label>

              {courseDocs.length > 0 && (
                <div className="pt-3 text-left space-y-1.5 max-h-40 overflow-y-auto">
                  {courseDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${
                        doc.unreadablePdf
                          ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                          : 'bg-zinc-950/80 border-zinc-800 text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0 pr-2">
                        <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-medium truncate">{doc.name}</span>
                        {doc.unreadablePdf ? (
                          <span className="text-[10px] text-amber-300 font-mono shrink-0">
                            (No selectable text found — scanned PDF?)
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-500 font-mono shrink-0 flex items-center gap-1.5">
                            {doc.isRemembered && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-sans">
                                Saved
                              </span>
                            )}
                            {Math.round(doc.content.length / 1000)}k chars extracted
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCourseDoc(doc.id)}
                        className="p-1 text-zinc-500 hover:text-red-400 cursor-pointer shrink-0"
                        title="Remove file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Optional focus instructions / syllabus paste */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-3 space-y-1.5">
              <label className="block text-[11px] font-bold text-zinc-400 font-display uppercase tracking-wider">
                Optional Focus Notes or Pasted Course Outline
              </label>
              <textarea
                rows={3}
                value={focusNotes}
                onChange={(e) => setFocusNotes(e.target.value)}
                placeholder="Optional: e.g. 'Focus on checking Chapters 1-8 and make sure commands needed for TP 3 & TP 4 are covered before them' — or paste table of contents..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-hidden focus:border-zinc-600 resize-none"
              />
            </div>
          </div>
        )}

        {/* STEP 2: ANALYZING SPINNER */}
        {step === 'analyzing' && (
          <div className="flex-1 flex flex-col items-center justify-center py-16 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-950/50 border border-emerald-700/70 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
            </div>
            <div>
              <h4 className="text-base font-extrabold font-display text-white">
                Auditing Course Coverage &amp; Prerequisite Ordering...
              </h4>
              <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                Comparing {existingPlan.parts.length} existing parts and {totalConceptsCount} concepts against your Course PDF to spot gaps, missing topics, or better ordering.
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: AUDIT RESULT (PERFECT OR REVIEW SUGGESTIONS) */}
        {step === 'result' && auditResult && (
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            {auditResult.status === 'perfect' ? (
              <div className="space-y-4">
                <div className="bg-emerald-950/35 border border-emerald-700/70 rounded-2xl p-6 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mx-auto text-emerald-300">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-700 text-[11px] font-mono font-bold text-emerald-300">
                    <span>{auditResult.coverageScore}% Verified Against Course PDF</span>
                  </div>
                  <h4 className="text-lg font-extrabold font-display text-white">
                    Everything Is Already Perfect!
                  </h4>
                  <p className="text-xs text-zinc-200 max-w-xl mx-auto leading-relaxed">
                    {auditResult.overallVerdict}
                  </p>
                </div>

                {auditResult.coveredHighlights.length > 0 && (
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-2">
                    <span className="text-[11px] font-bold font-display uppercase tracking-wider text-zinc-400 block">
                      Verified Coverage Highlights
                    </span>
                    <ul className="space-y-1.5">
                      {auditResult.coveredHighlights.map((item, i) => (
                        <li key={i} className="flex items-start space-x-2 text-xs text-zinc-200">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {auditError && (
                  <div className="bg-red-950/40 border border-red-800/70 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-red-200">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{auditError}</span>
                  </div>
                )}

                {/* Verdict & Gap Overview */}
                <div className="bg-amber-950/25 border border-amber-800/60 rounded-xl p-4 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <h4 className="text-xs font-extrabold font-display uppercase tracking-wider text-amber-200">
                        Recommended Improvements Found
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-700/60 font-bold">
                      Current Coverage: {auditResult.coverageScore}%
                    </span>
                  </div>
                  <p className="text-xs text-zinc-200 leading-relaxed">
                    {auditResult.overallVerdict}
                  </p>
                  {auditResult.missingTopicsSummary.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {auditResult.missingTopicsSummary.map((topic, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Select / Deselect Controls */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-mono text-zinc-400">
                    Review each suggestion below and accept what you want to apply:
                  </span>
                  <div className="flex items-center space-x-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleToggleAll(true)}
                      className="text-indigo-300 hover:text-indigo-200 font-semibold cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-zinc-700">•</span>
                    <button
                      type="button"
                      onClick={() => handleToggleAll(false)}
                      className="text-zinc-400 hover:text-zinc-200 font-semibold cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* 1. Prerequisite Reordering Card */}
                {auditResult.reorderSuggestion?.recommended && (
                  <label
                    className={`block rounded-xl border p-4 cursor-pointer transition-all space-y-3 ${
                      acceptReorder
                        ? 'bg-indigo-950/25 border-indigo-700/80'
                        : 'bg-zinc-900/40 border-zinc-800 opacity-70'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={acceptReorder}
                        onChange={(e) => setAcceptReorder(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded bg-zinc-950 border-zinc-600 text-indigo-500 focus:ring-0"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <ArrowUpDown className="w-4 h-4 text-indigo-400" />
                          <span className="text-xs font-extrabold font-display uppercase tracking-wider text-white">
                            Reorder Existing Parts for Prerequisite Flow
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300">
                          {auditResult.reorderSuggestion.reason}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px]">
                          <div className="bg-zinc-950/70 border border-zinc-800 rounded-lg p-2.5 space-y-1">
                            <span className="text-[10px] font-mono uppercase text-zinc-500 block">
                              Current Order
                            </span>
                            {existingPlan.parts.map((p) => (
                              <div key={p.id} className="text-zinc-400 truncate">
                                {p.partNumber}. {p.title}
                              </div>
                            ))}
                          </div>
                          <div className="bg-zinc-950/70 border border-indigo-800/50 rounded-lg p-2.5 space-y-1">
                            <span className="text-[10px] font-mono uppercase text-indigo-400 block">
                              Suggested Order (Progress Preserved)
                            </span>
                            {auditResult.reorderSuggestion.orderedPartIds.map((pid, idx) => {
                              const p = partLookup.get(pid);
                              if (!p) return null;
                              const moved = p.partNumber !== idx + 1;
                              return (
                                <div
                                  key={pid}
                                  className={`truncate ${
                                    moved ? 'text-indigo-200 font-semibold' : 'text-zinc-300'
                                  }`}
                                >
                                  {idx + 1}. {p.title}
                                  {moved && (
                                    <span className="text-[10px] font-mono text-indigo-400 ml-1">
                                      (was Part {p.partNumber})
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </label>
                )}

                {/* 2. Enhancements to Existing Parts */}
                {auditResult.enhancements.map((enh) => {
                  const checked = !!selectedEnhancements[enh.id];
                  return (
                    <label
                      key={enh.id}
                      className={`block rounded-xl border p-4 cursor-pointer transition-all space-y-2.5 ${
                        checked
                          ? 'bg-emerald-950/20 border-emerald-700/70'
                          : 'bg-zinc-900/40 border-zinc-800 opacity-70'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSelectedEnhancements((prev) => ({
                              ...prev,
                              [enh.id]: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 mt-0.5 rounded bg-zinc-950 border-zinc-600 text-emerald-500 focus:ring-0"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/70">
                              Enhance Part {enh.targetPartNumber}
                            </span>
                            <span className="text-xs font-bold text-white">
                              {enh.targetPartTitle}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300">{enh.reason}</p>

                          {enh.suggestedTitle && (
                            <div className="text-[11px] bg-zinc-950/70 border border-zinc-800 rounded-lg p-2 text-zinc-300">
                              <span className="text-zinc-500 font-mono mr-1.5">Updated Title:</span>
                              <span className="font-semibold text-white">{enh.suggestedTitle}</span>
                            </div>
                          )}

                          {enh.suggestedDescription && (
                            <div className="text-[11px] bg-zinc-950/70 border border-zinc-800 rounded-lg p-2 text-zinc-300">
                              <span className="text-zinc-500 font-mono block mb-0.5">
                                Updated Big Picture Description:
                              </span>
                              <span>{enh.suggestedDescription}</span>
                            </div>
                          )}

                          {enh.conceptsToAdd.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[10px] font-mono uppercase text-emerald-400 block">
                                + {enh.conceptsToAdd.length} Missing Concept
                                {enh.conceptsToAdd.length > 1 ? 's' : ''} to Add:
                              </span>
                              {enh.conceptsToAdd.map((c, idx) => (
                                <div
                                  key={idx}
                                  className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-2.5 text-xs space-y-1"
                                >
                                  <div className="font-bold text-zinc-100">{c.name}</div>
                                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                                    {c.summary}
                                  </p>
                                  {c.additionalNotes && (
                                    <div className="text-[10px] font-mono text-indigo-300/90 pt-0.5">
                                      Notes: {c.additionalNotes}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}

                {/* 3. Suggested Missing New Parts */}
                {auditResult.newParts.map((np) => {
                  const checked = !!selectedNewParts[np.id];
                  return (
                    <label
                      key={np.id}
                      className={`block rounded-xl border p-4 cursor-pointer transition-all space-y-2.5 ${
                        checked
                          ? 'bg-indigo-950/20 border-indigo-700/70'
                          : 'bg-zinc-900/40 border-zinc-800 opacity-70'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSelectedNewParts((prev) => ({
                              ...prev,
                              [np.id]: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 mt-0.5 rounded bg-zinc-950 border-zinc-600 text-indigo-500 focus:ring-0"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/70 flex items-center space-x-1">
                                <Plus className="w-3 h-3" />
                                <span>New Missing Part</span>
                              </span>
                              <span className="text-xs font-extrabold text-white">
                                {np.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                              {formatInsertLabel(
                                np.insertPosition,
                                np.insertAfterPartNumber,
                                np.insertAfterPartTitle
                              )}
                            </span>
                          </div>

                          <p className="text-xs text-amber-200/90">
                            <span className="font-semibold">Why missing:</span> {np.reason}
                          </p>
                          {np.description && (
                            <p className="text-[11px] text-zinc-300 leading-relaxed bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-2.5">
                              {np.description}
                            </p>
                          )}

                          <div className="space-y-1.5">
                            <span className="text-[10px] font-mono uppercase text-zinc-400 block">
                              Must-Learn Concepts ({np.mustLearnConcepts.length}):
                            </span>
                            {np.mustLearnConcepts.map((c, idx) => (
                              <div
                                key={idx}
                                className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-2.5 text-xs space-y-1"
                              >
                                <div className="font-bold text-zinc-100">{c.name}</div>
                                <p className="text-[11px] text-zinc-400 leading-relaxed">
                                  {c.summary}
                                </p>
                              </div>
                            ))}
                          </div>

                          {np.targetTP && (
                            <div className="bg-amber-950/25 border border-amber-800/50 rounded-lg p-2.5 flex items-start space-x-2 text-xs">
                              <Briefcase className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                              <div>
                                <div className="font-bold text-amber-200">{np.targetTP.title}</div>
                                <p className="text-[11px] text-zinc-300 mt-0.5">
                                  {np.targetTP.description}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}

                {/* 4. Additional Notices */}
                {auditResult.additionalNotices.length > 0 && (
                  <label className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5 cursor-pointer space-y-2">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={includeNotices}
                        onChange={(e) => setIncludeNotices(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded bg-zinc-950 border-zinc-600 text-amber-500 focus:ring-0"
                      />
                      <div className="flex-1 space-y-1">
                        <span className="text-xs font-bold text-zinc-200">
                          Also add {auditResult.additionalNotices.length} Class / Syllabus Notice
                          {auditResult.additionalNotices.length > 1 ? 's' : ''} found in the PDF
                        </span>
                        <div className="text-[11px] text-zinc-400">
                          {auditResult.additionalNotices.map((n) => n.title).join(' • ')}
                        </div>
                      </div>
                    </div>
                  </label>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer CTA Bar */}
        {step !== 'analyzing' && (
          <div className="pt-3.5 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
            {step === 'upload' ? (
              <>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {readableDocs.length} PDF/doc{readableDocs.length === 1 ? '' : 's'} ready
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
                    onClick={handleRunAudit}
                    disabled={!hasAnyContentToAudit}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-xs font-extrabold font-display uppercase tracking-wider flex items-center space-x-2 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-md"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Check Plan with AI</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            ) : auditResult?.status === 'perfect' ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setStep('upload');
                    setAuditResult(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Check Another PDF</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold font-display uppercase tracking-wider flex items-center space-x-2 cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Done — Keep Existing Plan</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isApplying}
                  onClick={() => {
                    setStep('upload');
                    setAuditResult(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Change PDF</span>
                </button>

                <div className="flex items-center space-x-2 ml-auto">
                  <button
                    type="button"
                    disabled={isApplying}
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold font-display uppercase tracking-wider cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAcceptAndApply}
                    disabled={isApplying || totalSelectedActions === 0}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-xs font-extrabold font-display uppercase tracking-wider flex items-center space-x-2 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-md"
                  >
                    {isApplying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Fetching Videos &amp; Applying...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          Accept &amp; Apply ({totalSelectedActions})
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
