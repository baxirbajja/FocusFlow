import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StudySubject, TaskStudyLink } from '../types';
import {
  Search,
  X,
  BookOpen,
  Terminal,
  FlaskConical,
  AlertTriangle,
  PlayCircle,
  Layers,
  CornerDownLeft,
  CheckCircle2,
} from 'lucide-react';

interface GlobalStudySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: StudySubject[];
  onNavigateToTarget: (target: TaskStudyLink) => void;
}

type SearchCategory = 'all' | 'concept' | 'command' | 'tp' | 'part' | 'notice' | 'video';

interface SearchEntry {
  id: string;
  category: Exclude<SearchCategory, 'all'>;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  title: string;
  subtitle: string;
  snippet?: string;
  searchBlob: string;
  isCompleted?: boolean;
  target: TaskStudyLink;
}

const CATEGORY_TABS: Array<{ id: SearchCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'command', label: 'Commands & Notes' },
  { id: 'concept', label: 'Concepts' },
  { id: 'tp', label: 'TPs & Labs' },
  { id: 'part', label: 'Parts' },
  { id: 'notice', label: 'Notices' },
  { id: 'video', label: 'Playlist Videos' },
];

function extractMatchingSnippet(text: string, query: string): string | undefined {
  if (!text.trim()) return undefined;
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!query.trim()) return lines[0]?.slice(0, 140);
  const qLower = query.toLowerCase();
  const matchedLine = lines.find((line) => line.toLowerCase().includes(qLower));
  if (matchedLine) return matchedLine.slice(0, 160);
  const idx = text.toLowerCase().indexOf(qLower);
  if (idx >= 0) {
    const start = Math.max(0, idx - 35);
    return (start > 0 ? '...' : '') + text.slice(start, start + 140).trim();
  }
  return lines[0]?.slice(0, 140);
}

export const GlobalStudySearchModal: React.FC<GlobalStudySearchModalProps> = ({
  isOpen,
  onClose,
  subjects,
  onNavigateToTarget,
}) => {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<SearchCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 20);
    }
  }, [isOpen]);

  const indexEntries = useMemo<SearchEntry[]>(() => {
    const items: SearchEntry[] = [];

    for (const subj of subjects) {
      const parts = subj.studyPlan?.parts || [];

      for (const part of parts) {
        items.push({
          id: `part_${subj.id}_${part.id}`,
          category: 'part',
          subjectId: subj.id,
          subjectName: subj.name,
          subjectColor: subj.color,
          title: `Part ${part.partNumber}: ${part.title}`,
          subtitle: part.description || `${part.mustLearnConcepts.length} concepts`,
          searchBlob: `${subj.name} part ${part.partNumber} ${part.title} ${part.description}`.toLowerCase(),
          isCompleted: part.isCompleted,
          target: { subjectId: subj.id, partId: part.id, tab: 'roadmap' },
        });

        for (const concept of part.mustLearnConcepts) {
          items.push({
            id: `concept_${subj.id}_${part.id}_${concept.id}`,
            category: 'concept',
            subjectId: subj.id,
            subjectName: subj.name,
            subjectColor: subj.color,
            title: concept.name,
            subtitle: `Part ${part.partNumber}: ${part.title}`,
            snippet: concept.summary,
            searchBlob: `${subj.name} ${part.title} ${concept.name} ${concept.summary} ${concept.additionalNotes || ''} ${concept.searchQuery}`.toLowerCase(),
            isCompleted: concept.isCompleted,
            target: { subjectId: subj.id, partId: part.id, conceptId: concept.id, tab: 'roadmap' },
          });

          if (concept.additionalNotes && concept.additionalNotes.trim()) {
            items.push({
              id: `cmd_${subj.id}_${part.id}_${concept.id}`,
              category: 'command',
              subjectId: subj.id,
              subjectName: subj.name,
              subjectColor: subj.color,
              title: `${concept.name} — Commands & Study Notes`,
              subtitle: `Part ${part.partNumber} • ${subj.name}`,
              snippet: concept.additionalNotes,
              searchBlob: `${subj.name} ${concept.name} ${concept.additionalNotes}`.toLowerCase(),
              isCompleted: concept.isCompleted,
              target: { subjectId: subj.id, partId: part.id, conceptId: concept.id, tab: 'roadmap' },
            });
          }
        }

        const partTPs = [
          ...(part.targetTP ? [part.targetTP] : []),
          ...(part.additionalTPs || []),
        ];

        for (const tp of partTPs) {
          const coachCommands = (tp.executionGuide?.exercises || [])
            .flatMap((ex) => [
              ex.title,
              ...ex.machineSteps.map((st) => `${st.title} ${st.command || ''}`),
            ])
            .join(' ');

          items.push({
            id: `tp_${subj.id}_${part.id}_${tp.id}`,
            category: 'tp',
            subjectId: subj.id,
            subjectName: subj.name,
            subjectColor: subj.color,
            title: tp.title,
            subtitle: `Part ${part.partNumber} Lab • ~${tp.estimatedMinutes}m${tp.deadline ? ` • Due ${tp.deadline}` : ''}`,
            snippet: `${tp.description} ${coachCommands}`.trim(),
            searchBlob: `${subj.name} tp ${tp.tpNumber} ${tp.title} ${tp.description} ${tp.requiredConceptNames.join(' ')} ${coachCommands}`.toLowerCase(),
            isCompleted: tp.isCompleted,
            target: { subjectId: subj.id, partId: part.id, tpId: tp.id, tab: 'roadmap' },
          });
        }
      }

      for (const notice of subj.studyPlan?.attentionNotices || []) {
        if (notice.isDismissed) continue;
        const firstPartId = subj.studyPlan?.parts[0]?.id || '';
        items.push({
          id: `notice_${subj.id}_${notice.id}`,
          category: 'notice',
          subjectId: subj.id,
          subjectName: subj.name,
          subjectColor: subj.color,
          title: notice.title,
          subtitle: `${notice.category.replace('_', ' ')} • ${notice.sessionSource}`,
          snippet: notice.details,
          searchBlob: `${subj.name} ${notice.title} ${notice.details} ${notice.sessionSource} ${notice.category}`.toLowerCase(),
          target: { subjectId: subj.id, partId: firstPartId, tab: 'roadmap' },
        });
      }

      for (const pl of subj.playlists || []) {
        const firstPartId = subj.studyPlan?.parts[0]?.id || '';
        for (const vid of pl.videos || []) {
          items.push({
            id: `vid_${subj.id}_${pl.id}_${vid.id}`,
            category: 'video',
            subjectId: subj.id,
            subjectName: subj.name,
            subjectColor: subj.color,
            title: vid.title,
            subtitle: `Playlist: ${pl.name} • ${vid.durationMinutes}m`,
            searchBlob: `${subj.name} ${pl.name} ${vid.title}`.toLowerCase(),
            isCompleted: vid.isWatched,
            target: { subjectId: subj.id, partId: firstPartId, tab: 'playlists' },
          });
        }
      }
    }

    return items;
  }, [subjects]);

  const filteredResults = useMemo(() => {
    const terms = query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    const matching = indexEntries.filter((entry) => {
      if (categoryFilter !== 'all' && entry.category !== categoryFilter) {
        return false;
      }
      if (terms.length === 0) {
        return entry.category !== 'command'; // Keep initial view compact & scannable
      }
      return terms.every((t) => entry.searchBlob.includes(t));
    });

    // Rank title matches above body matches
    if (terms.length > 0) {
      const qFull = terms.join(' ');
      matching.sort((a, b) => {
        const aTitle = a.title.toLowerCase().includes(qFull) ? 0 : 1;
        const bTitle = b.title.toLowerCase().includes(qFull) ? 0 : 1;
        if (aTitle !== bTitle) return aTitle - bTitle;
        return a.category === 'command' && b.category !== 'command' ? -1 : 0;
      });
    }

    return matching.slice(0, 60);
  }, [indexEntries, query, categoryFilter]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, categoryFilter]);

  useEffect(() => {
    const el = rowRefs.current[selectedIndex];
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const handleSelectEntry = (entry: SearchEntry) => {
    onNavigateToTarget(entry.target);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filteredResults.length > 0 ? (prev + 1) % filteredResults.length : 0
      );
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filteredResults.length > 0
          ? (prev - 1 + filteredResults.length) % filteredResults.length
          : 0
      );
      return;
    }
    if (e.key === 'Enter' && filteredResults[selectedIndex]) {
      e.preventDefault();
      handleSelectEntry(filteredResults[selectedIndex]);
    }
  };

  const renderCategoryIcon = (cat: SearchEntry['category']) => {
    switch (cat) {
      case 'command':
        return <Terminal className="w-4 h-4 text-emerald-400" />;
      case 'concept':
        return <BookOpen className="w-4 h-4 text-indigo-400" />;
      case 'tp':
        return <FlaskConical className="w-4 h-4 text-purple-400" />;
      case 'part':
        return <Layers className="w-4 h-4 text-sky-400" />;
      case 'notice':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'video':
        return <PlayCircle className="w-4 h-4 text-rose-400" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-start justify-center pt-[10vh] p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#16161a] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Header */}
        <div className="p-3.5 border-b border-zinc-800/80 flex items-center gap-3 bg-[#1b1b20]">
          <Search className="w-4 h-4 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search concepts, commands (e.g. chmod, lvm, netstat), TPs, parts, notices..."
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-zinc-500 hover:text-zinc-300 rounded-md hover:bg-zinc-800"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-md hover:text-zinc-200"
          >
            ESC
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="px-3.5 py-2 border-b border-zinc-800/70 bg-[#141418] flex items-center gap-1.5 overflow-x-auto">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                categoryFilter === tab.id
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredResults.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm text-zinc-400">
                {subjects.length === 0
                  ? 'No subjects in your Study Library yet.'
                  : `No matches found for "${query}"`}
              </p>
              <p className="text-xs text-zinc-600">
                Try searching a concept name, Linux command, TP title, or switch category filters.
              </p>
            </div>
          ) : (
            filteredResults.map((entry, idx) => {
              const isSelected = idx === selectedIndex;
              const displaySnippet = entry.snippet
                ? extractMatchingSnippet(entry.snippet, query)
                : undefined;

              return (
                <button
                  key={entry.id}
                  ref={(el) => {
                    rowRefs.current[idx] = el;
                  }}
                  onClick={() => handleSelectEntry(entry)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl flex items-start gap-3 transition-colors border ${
                    isSelected
                      ? 'bg-indigo-500/12 border-indigo-500/35'
                      : 'bg-transparent border-transparent hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0">
                    {renderCategoryIcon(entry.category)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-300"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: entry.subjectColor || '#6366f1' }}
                        />
                        {entry.subjectName}
                      </span>
                      <span className="text-xs font-semibold text-zinc-100 truncate">
                        {entry.title}
                      </span>
                      {entry.isCompleted && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                      {entry.subtitle}
                    </p>

                    {displaySnippet && (
                      <p
                        className={`text-[11px] mt-1 line-clamp-2 ${
                          entry.category === 'command'
                            ? 'font-mono text-emerald-300/90 bg-emerald-950/30 border border-emerald-900/40 px-2 py-1 rounded-md'
                            : 'text-zinc-500'
                        }`}
                      >
                        {displaySnippet}
                      </p>
                    )}
                  </div>

                  {isSelected && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-indigo-300 bg-indigo-500/15 px-2 py-1 rounded-md shrink-0 mt-1">
                      Jump <CornerDownLeft className="w-3 h-3" />
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Legend */}
        <div className="px-4 py-2 border-t border-zinc-800/80 bg-[#121215] flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>Enter Jump to item</span>
            <span>Esc Close</span>
          </div>
          <span>
            {filteredResults.length} result{filteredResults.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </div>
  );
};
