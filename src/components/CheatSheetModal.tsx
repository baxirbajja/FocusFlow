import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  FileText,
  Copy,
  Check,
  Download,
  FileDown,
  Terminal,
  AlertTriangle,
  BookOpen,
  FlaskConical,
  Search,
  Filter,
} from 'lucide-react';
import { StudySubject, SubjectStudyPart, SubjectMilestoneTP } from '../types';

interface CheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: StudySubject;
  initialPartId?: string | null;
}

export const CheatSheetModal: React.FC<CheatSheetModalProps> = ({
  isOpen,
  onClose,
  subject,
  initialPartId = null,
}) => {
  const [selectedPartId, setSelectedPartId] = useState<string>(initialPartId || 'all');
  const [includeSummaries, setIncludeSummaries] = useState<boolean>(true);
  const [includeConceptNotes, setIncludeConceptNotes] = useState<boolean>(true);
  const [includeTPGuides, setIncludeTPGuides] = useState<boolean>(true);
  const [includeNotices, setIncludeNotices] = useState<boolean>(true);
  const [onlyPending, setOnlyPending] = useState<boolean>(false);
  const [filterText, setFilterText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [exportToast, setExportToast] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedPartId(initialPartId || 'all');
      setFilterText('');
      setCopied(false);
      setExportToast(null);
    }
  }, [isOpen, subject.id, initialPartId]);

  const studyPlan = subject.studyPlan;

  const filteredData = useMemo(() => {
    if (!studyPlan) {
      return { parts: [] as SubjectStudyPart[], notices: [] as NonNullable<typeof studyPlan>['attentionNotices'] };
    }

    const q = filterText.trim().toLowerCase();

    const parts = studyPlan.parts
      .filter((p) => (selectedPartId === 'all' ? true : p.id === selectedPartId))
      .filter((p) => (onlyPending ? !p.isCompleted : true))
      .map((p) => {
        if (!q) return p;

        const partMatches =
          p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
        if (partMatches) return p;

        const matchingConcepts = p.mustLearnConcepts.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.summary.toLowerCase().includes(q) ||
            (c.additionalNotes || '').toLowerCase().includes(q)
        );

        const partTPs = [
          ...(p.targetTP ? [p.targetTP] : []),
          ...(p.additionalTPs || []),
        ].filter((tp) => {
          const baseMatch =
            tp.title.toLowerCase().includes(q) || tp.description.toLowerCase().includes(q);
          const guideMatch = (tp.executionGuide?.exercises || []).some(
            (ex) =>
              ex.title.toLowerCase().includes(q) ||
              ex.machineSteps.some(
                (st) =>
                  st.title.toLowerCase().includes(q) ||
                  (st.command || '').toLowerCase().includes(q)
              ) ||
              ex.questionAnswers.some(
                (qa) => qa.question.toLowerCase().includes(q) || qa.answer.toLowerCase().includes(q)
              )
          );
          return baseMatch || guideMatch;
        });

        if (matchingConcepts.length === 0 && partTPs.length === 0) {
          return null;
        }

        return {
          ...p,
          mustLearnConcepts: matchingConcepts,
          targetTP: partTPs[0],
          additionalTPs: partTPs.slice(1),
        };
      })
      .filter((p): p is SubjectStudyPart => p !== null);

    const notices = includeNotices
      ? (studyPlan.attentionNotices || []).filter(
          (n) =>
            !n.isDismissed &&
            (!q ||
              n.title.toLowerCase().includes(q) ||
              n.details.toLowerCase().includes(q) ||
              n.sessionSource.toLowerCase().includes(q))
        )
      : [];

    return { parts, notices };
  }, [studyPlan, selectedPartId, onlyPending, filterText, includeNotices]);

  const compiledStats = useMemo(() => {
    let conceptCount = 0;
    let commandNoteCount = 0;
    let tpCount = 0;
    let labStepCommandCount = 0;

    for (const part of filteredData.parts) {
      conceptCount += part.mustLearnConcepts.length;
      for (const c of part.mustLearnConcepts) {
        if (c.additionalNotes?.trim()) commandNoteCount += 1;
      }
      const tps = [...(part.targetTP ? [part.targetTP] : []), ...(part.additionalTPs || [])];
      tpCount += tps.length;
      for (const tp of tps) {
        for (const ex of tp.executionGuide?.exercises || []) {
          labStepCommandCount += ex.machineSteps.filter((st) => Boolean(st.command?.trim())).length;
        }
      }
    }

    return {
      partCount: filteredData.parts.length,
      conceptCount,
      commandNoteCount,
      tpCount,
      labStepCommandCount,
      noticeCount: filteredData.notices.length,
    };
  }, [filteredData]);

  const getPartTPs = (part: SubjectStudyPart): SubjectMilestoneTP[] => [
    ...(part.targetTP ? [part.targetTP] : []),
    ...(part.additionalTPs || []),
  ];

  const markdownContent = useMemo(() => {
    if (!studyPlan) return '';
    const scopeLabel =
      selectedPartId === 'all'
        ? 'Master Course Cheat Sheet'
        : `Part ${filteredData.parts[0]?.partNumber || ''} Quick Sheet`;

    const lines: string[] = [
      `# ${subject.name} — ${scopeLabel}`,
      `_Compiled from Study Roadmap on ${new Date().toLocaleDateString()}_`,
      '',
    ];

    if (studyPlan.bigPictureDescription && selectedPartId === 'all') {
      lines.push('## Core Mental Model', studyPlan.bigPictureDescription, '');
    }

    if (filteredData.notices.length > 0) {
      lines.push('## Exam Hints, Deadlines & Warnings');
      for (const n of filteredData.notices) {
        lines.push(`- **[${n.category.replace('_', ' ').toUpperCase()}] ${n.title}** _(${n.sessionSource})_: ${n.details}`);
      }
      lines.push('');
    }

    for (const part of filteredData.parts) {
      const cleanTitle = part.title.replace(/^Part\s+\d+\s*[:\-–]\s*/i, '');
      lines.push(`---`, '', `## Part ${part.partNumber}: ${cleanTitle}`);
      if (part.description) {
        lines.push(`> ${part.description}`, '');
      }

      if (part.mustLearnConcepts.length > 0) {
        lines.push('### Concepts & Commands');
        for (const c of part.mustLearnConcepts) {
          lines.push(`#### ${c.name}${c.isCompleted ? ' [Done]' : ''}`);
          if (includeSummaries && c.summary) {
            lines.push(c.summary);
          }
          if (includeConceptNotes && c.additionalNotes?.trim()) {
            lines.push('```bash', c.additionalNotes.trim(), '```');
          }
          lines.push('');
        }
      }

      const partTPs = getPartTPs(part);
      if (partTPs.length > 0) {
        lines.push('### Practical Labs (TP)');
        for (const tp of partTPs) {
          lines.push(`#### ${tp.title}${tp.deadline ? ` _(Due: ${tp.deadline})_` : ''}`);
          if (tp.description) lines.push(tp.description);

          if (includeTPGuides && tp.executionGuide) {
            for (const ex of tp.executionGuide.exercises) {
              const cmds = ex.machineSteps.filter((st) => st.command?.trim());
              if (cmds.length > 0 || ex.questionAnswers.length > 0) {
                lines.push(`- **Exercise ${ex.exerciseNumber}: ${ex.title}**`);
                if (cmds.length > 0) {
                  lines.push('  ```bash');
                  for (const st of cmds) {
                    lines.push(`  # Step ${st.stepNumber}: ${st.title}`);
                    lines.push(`  ${st.command!.trim()}`);
                  }
                  lines.push('  ```');
                }
                for (const qa of ex.questionAnswers) {
                  lines.push(`  - **Q:** ${qa.question}`);
                  lines.push(`    **A:** ${qa.answer}`);
                }
              }
            }
          }
          lines.push('');
        }
      }
    }

    return lines.join('\n');
  }, [
    studyPlan,
    subject.name,
    selectedPartId,
    filteredData,
    includeSummaries,
    includeConceptNotes,
    includeTPGuides,
  ]);

  if (!isOpen || !studyPlan) return null;

  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const sanitizeFilename = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'cheat-sheet';

  const triggerDownload = (content: string, mimeType: string, filename: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportToast(`Saved ${filename} to Downloads`);
    setTimeout(() => setExportToast(null), 3000);
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportHtml = () => {
    const scopeTitle =
      selectedPartId === 'all'
        ? 'Master Course Cheat Sheet'
        : `Part ${filteredData.parts[0]?.partNumber || ''} Cheat Sheet`;

    const noticesHtml =
      filteredData.notices.length > 0
        ? `<div class="notices">
            <h2>Exam Hints, Deadlines &amp; Class Warnings</h2>
            <ul>
              ${filteredData.notices
                .map(
                  (n) =>
                    `<li><strong>[${escapeHtml(n.category.replace('_', ' ').toUpperCase())}] ${escapeHtml(
                      n.title
                    )}</strong> <em>(${escapeHtml(n.sessionSource)})</em>: ${escapeHtml(n.details)}</li>`
                )
                .join('')}
            </ul>
          </div>`
        : '';

    const partsHtml = filteredData.parts
      .map((part) => {
        const cleanTitle = part.title.replace(/^Part\s+\d+\s*[:\-–]\s*/i, '');
        const conceptsHtml = part.mustLearnConcepts
          .map(
            (c) => `
              <div class="concept">
                <div class="concept-title">${escapeHtml(c.name)} ${
              c.isCompleted ? '<span class="badge-done">Done</span>' : ''
            }</div>
                ${includeSummaries && c.summary ? `<p class="summary">${escapeHtml(c.summary)}</p>` : ''}
                ${
                  includeConceptNotes && c.additionalNotes?.trim()
                    ? `<pre class="code">${escapeHtml(c.additionalNotes.trim())}</pre>`
                    : ''
                }
              </div>`
          )
          .join('');

        const tpsHtml = getPartTPs(part)
          .map((tp) => {
            const coachHtml =
              includeTPGuides && tp.executionGuide
                ? tp.executionGuide.exercises
                    .map((ex) => {
                      const cmds = ex.machineSteps.filter((st) => st.command?.trim());
                      if (cmds.length === 0 && ex.questionAnswers.length === 0) return '';
                      return `
                        <div class="ex-block">
                          <div class="ex-title">Exercise ${ex.exerciseNumber}: ${escapeHtml(ex.title)}</div>
                          ${
                            cmds.length > 0
                              ? `<pre class="code">${escapeHtml(
                                  cmds.map((st) => `# Step ${st.stepNumber}: ${st.title}\n${st.command!.trim()}`).join('\n')
                                )}</pre>`
                              : ''
                          }
                          ${ex.questionAnswers
                            .map(
                              (qa) =>
                                `<div class="qa"><strong>Q:</strong> ${escapeHtml(
                                  qa.question
                                )}<br/><strong>A:</strong> ${escapeHtml(qa.answer)}</div>`
                            )
                            .join('')}
                        </div>`;
                    })
                    .join('')
                : '';

            return `
              <div class="tp">
                <div class="tp-title">${escapeHtml(tp.title)} ${
              tp.deadline ? `<span class="due">Due: ${escapeHtml(tp.deadline)}</span>` : ''
            }</div>
                ${tp.description ? `<p class="summary">${escapeHtml(tp.description)}</p>` : ''}
                ${coachHtml}
              </div>`;
          })
          .join('');

        return `
          <section class="part">
            <h2>Part ${part.partNumber}: ${escapeHtml(cleanTitle)}</h2>
            ${part.description ? `<p class="part-desc">${escapeHtml(part.description)}</p>` : ''}
            ${conceptsHtml}
            ${tpsHtml}
          </section>`;
      })
      .join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(subject.name)} — ${escapeHtml(scopeTitle)}</title>
  <style>
    body { font-family: 'Segoe UI', Roboto, Arial, sans-serif; color: #18181b; max-width: 960px; margin: 28px auto; padding: 0 20px; line-height: 1.45; font-size: 13px; }
    header { border-bottom: 3px solid #4f46e5; padding-bottom: 12px; margin-bottom: 18px; }
    h1 { margin: 0; font-size: 24px; color: #09090b; }
    .sub { color: #52525b; font-size: 12px; margin-top: 4px; }
    .big-pic { background: #eef2ff; border-left: 4px solid #4f46e5; padding: 10px 14px; border-radius: 6px; margin-bottom: 16px; }
    .notices { background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 10px 14px; margin-bottom: 18px; }
    .notices h2 { margin: 0 0 6px; font-size: 14px; color: #92400e; border: none; padding: 0; }
    .notices ul { margin: 0; padding-left: 18px; }
    section.part { border: 1px solid #e4e4e7; border-radius: 10px; padding: 14px 16px; margin-bottom: 16px; page-break-inside: avoid; }
    h2 { margin: 0 0 8px; font-size: 16px; color: #1e1b4b; border-left: 4px solid #6366f1; padding-left: 8px; }
    .part-desc { color: #3f3f46; font-style: italic; margin: 4px 0 12px; }
    .concept { border-top: 1px solid #f4f4f5; padding-top: 8px; margin-top: 8px; }
    .concept-title { font-weight: 700; color: #111827; font-size: 13.5px; }
    .badge-done { font-size: 10px; background: #d1fae5; color: #065f46; padding: 1px 6px; border-radius: 4px; margin-left: 6px; }
    .summary { margin: 3px 0 6px; color: #3f3f46; }
    pre.code { background: #18181b; color: #a7f3d0; padding: 8px 10px; border-radius: 6px; font-size: 11.5px; overflow-x: auto; white-space: pre-wrap; margin: 4px 0 6px; font-family: Consolas, monospace; }
    .tp { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 10px 12px; margin-top: 10px; }
    .tp-title { font-weight: 700; color: #0c4a6e; }
    .due { font-size: 11px; background: #fef3c7; color: #92400e; padding: 1px 6px; border-radius: 4px; margin-left: 6px; }
    .ex-block { margin-top: 8px; padding-top: 6px; border-top: 1px dashed #bae6fd; }
    .ex-title { font-weight: 600; font-size: 12px; color: #0369a1; }
    .qa { margin-top: 4px; font-size: 12px; color: #1f2937; }
    @media print { body { margin: 12px; font-size: 11.5px; } section.part { break-inside: avoid; } }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(subject.name)} — ${escapeHtml(scopeTitle)}</h1>
    <div class="sub">Compiled ${new Date().toLocaleDateString()} • ${compiledStats.partCount} Parts • ${compiledStats.conceptCount} Concepts • Press Ctrl+P to Save as PDF</div>
  </header>
  ${
    studyPlan.bigPictureDescription && selectedPartId === 'all'
      ? `<div class="big-pic"><strong>Big Picture:</strong> ${escapeHtml(studyPlan.bigPictureDescription)}</div>`
      : ''
  }
  ${noticesHtml}
  ${partsHtml}
</body>
</html>`;

    triggerDownload(
      html,
      'text/html;charset=utf-8',
      `${sanitizeFilename(subject.name)}-cheat-sheet.html`
    );
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 px-5 border-b border-zinc-800 flex items-center justify-between gap-3 shrink-0 bg-[#1b1b20]">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-950/60 border border-amber-700/60 flex items-center justify-center text-amber-300 shrink-0">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold font-display text-white truncate">
                  {subject.name} — Master Cheat Sheet Compiler
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 shrink-0">
                  {compiledStats.partCount} Parts • {compiledStats.conceptCount} Concepts •{' '}
                  {compiledStats.commandNoteCount + compiledStats.labStepCommandCount} Cmd/Note Blocks
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Compile concepts, Linux/CLI commands, TP lab steps, and exam warnings into one exam cram sheet.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter & Compiler Toolbar */}
        <div className="p-3.5 px-5 border-b border-zinc-800/80 bg-[#141418] space-y-2.5 shrink-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center space-x-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter commands, concepts, or TPs..."
                className="bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none w-full"
              />
              {filterText && (
                <button
                  type="button"
                  onClick={() => setFilterText('')}
                  className="text-zinc-500 hover:text-zinc-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <select
                value={selectedPartId}
                onChange={(e) => setSelectedPartId(e.target.value)}
                className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer max-w-[220px]"
              >
                <option value="all" className="bg-zinc-900">
                  All Parts ({studyPlan.parts.length})
                </option>
                {studyPlan.parts.map((p) => (
                  <option key={p.id} value={p.id} className="bg-zinc-900">
                    Part {p.partNumber}: {p.title.replace(/^Part\s+\d+\s*[:\-–]\s*/i, '').slice(0, 42)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            {[
              { label: 'Concept Summaries', val: includeSummaries, set: setIncludeSummaries },
              { label: 'Commands & Concept Notes', val: includeConceptNotes, set: setIncludeConceptNotes },
              { label: 'TP Coach Commands & Q&A', val: includeTPGuides, set: setIncludeTPGuides },
              { label: 'Exam Notices', val: includeNotices, set: setIncludeNotices },
              { label: 'Incomplete Parts Only', val: onlyPending, set: setOnlyPending },
            ].map((opt) => (
              <label
                key={opt.label}
                className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border cursor-pointer transition-colors select-none ${
                  opt.val
                    ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-200'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={opt.val}
                  onChange={(e) => opt.set(e.target.checked)}
                  className="w-3 h-3 accent-indigo-500 rounded"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Live Cheat Sheet Preview Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {studyPlan.bigPictureDescription && selectedPartId === 'all' && !filterText && (
            <div className="bg-indigo-950/25 border border-indigo-800/50 rounded-xl p-3.5 text-xs text-zinc-200 leading-relaxed">
              <span className="font-bold text-indigo-300 uppercase tracking-wider font-mono text-[10px] block mb-1">
                Course Mental Model
              </span>
              {studyPlan.bigPictureDescription}
            </div>
          )}

          {filteredData.notices.length > 0 && (
            <div className="bg-amber-950/20 border border-amber-700/50 rounded-xl p-4 space-y-2">
              <div className="flex items-center space-x-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>Exam Hints, Deadlines &amp; Class Warnings ({filteredData.notices.length})</span>
              </div>
              <ul className="space-y-1.5 text-xs text-amber-100/90">
                {filteredData.notices.map((n) => (
                  <li key={n.id} className="leading-snug">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-900/50 border border-amber-700/50 text-amber-200 mr-1.5 uppercase">
                      {n.category.replace('_', ' ')}
                    </span>
                    <span className="font-bold">{n.title}:</span> {n.details}{' '}
                    <span className="text-amber-400/80 text-[11px]">({n.sessionSource})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {filteredData.parts.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
              No matching concepts, commands, or parts for the current filter.
            </div>
          ) : (
            filteredData.parts.map((part) => {
              const cleanTitle = part.title.replace(/^Part\s+\d+\s*[:\-–]\s*/i, '');
              const tps = getPartTPs(part);

              return (
                <div
                  key={part.id}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
                    <h4 className="text-sm font-extrabold font-display text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>
                        Part {part.partNumber}: {cleanTitle}
                      </span>
                    </h4>
                    {part.isCompleted && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
                        Mastered
                      </span>
                    )}
                  </div>

                  {part.description && (
                    <p className="text-xs text-zinc-400 italic">{part.description}</p>
                  )}

                  {part.mustLearnConcepts.length > 0 && (
                    <div className="space-y-2">
                      {part.mustLearnConcepts.map((c) => (
                        <div
                          key={c.id}
                          className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-3 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-zinc-100">{c.name}</span>
                            {c.isCompleted && (
                              <span className="text-[10px] text-emerald-400 font-mono">Done</span>
                            )}
                          </div>
                          {includeSummaries && c.summary && (
                            <p className="text-xs text-zinc-400 leading-relaxed">{c.summary}</p>
                          )}
                          {includeConceptNotes && c.additionalNotes?.trim() && (
                            <pre className="bg-black/70 border border-emerald-900/40 rounded-md p-2.5 text-[11px] font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed">
                              {c.additionalNotes.trim()}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {tps.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {tps.map((tp) => (
                        <div
                          key={tp.id}
                          className="bg-sky-950/15 border border-sky-800/50 rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-sky-200">
                              <FlaskConical className="w-3.5 h-3.5 text-sky-400" />
                              <span>{tp.title}</span>
                            </div>
                            {tp.deadline && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/60">
                                Due: {tp.deadline}
                              </span>
                            )}
                          </div>
                          {tp.description && (
                            <p className="text-[11px] text-zinc-300">{tp.description}</p>
                          )}

                          {includeTPGuides && tp.executionGuide && (
                            <div className="space-y-2 pt-1">
                              {tp.executionGuide.exercises.map((ex) => {
                                const cmds = ex.machineSteps.filter((st) => st.command?.trim());
                                if (cmds.length === 0 && ex.questionAnswers.length === 0) {
                                  return null;
                                }
                                return (
                                  <div
                                    key={ex.id}
                                    className="bg-zinc-950/80 border border-zinc-800 rounded-md p-2.5 space-y-1.5"
                                  >
                                    <div className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                                      <Terminal className="w-3 h-3" />
                                      <span>
                                        Exercise {ex.exerciseNumber}: {ex.title}
                                      </span>
                                    </div>
                                    {cmds.length > 0 && (
                                      <pre className="bg-black/80 border border-zinc-800 rounded p-2 text-[11px] font-mono text-emerald-300 whitespace-pre-wrap">
                                        {cmds
                                          .map(
                                            (st) =>
                                              `# Step ${st.stepNumber}: ${st.title}\n${st.command!.trim()}`
                                          )
                                          .join('\n')}
                                      </pre>
                                    )}
                                    {ex.questionAnswers.map((qa, idx) => (
                                      <div
                                        key={idx}
                                        className="text-[11px] text-zinc-300 border-l-2 border-purple-500/50 pl-2"
                                      >
                                        <span className="font-semibold text-purple-300">Q:</span>{' '}
                                        {qa.question}
                                        <div className="text-zinc-400">
                                          <span className="font-semibold text-emerald-300">A:</span>{' '}
                                          {qa.answer}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Export Bar */}
        <div className="p-3.5 px-5 border-t border-zinc-800 bg-[#141418] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="text-xs text-emerald-300 font-medium">
            {exportToast ? `✓ ${exportToast}` : 'Tip: Export HTML and press Ctrl+P to save a clean PDF cram sheet.'}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                triggerDownload(
                  markdownContent,
                  'text/markdown;charset=utf-8',
                  `${sanitizeFilename(subject.name)}-cheat-sheet.md`
                )
              }
              className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .MD</span>
            </button>

            <button
              type="button"
              onClick={handleExportHtml}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-display uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer shadow-md"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Export Printable HTML / PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
