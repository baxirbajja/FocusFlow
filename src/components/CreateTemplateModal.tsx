import React, { useState } from 'react';
import { X, BookmarkPlus, Trash2, Check, Clock, Plus, Pencil, RotateCcw } from 'lucide-react';
import { TaskTemplate, PriorityLevel } from '../types';
import { formatMinutes } from '../utils/storage';

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: TaskTemplate[];
  onSaveTemplate: (template: TaskTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
}

export const CreateTemplateModal: React.FC<CreateTemplateModalProps> = ({
  isOpen,
  onClose,
  templates,
  onSaveTemplate,
  onDeleteTemplate,
}) => {
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(30);
  const [startTime, setStartTime] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('essential');
  const [notes, setNotes] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartEdit = (tpl: TaskTemplate) => {
    setEditingTemplateId(tpl.id);
    setTitle(tpl.title);
    setDuration(tpl.plannedDuration);
    setStartTime(tpl.scheduledStartTime || '');
    setPriority(tpl.priority);
    setNotes(tpl.notes || '');
  };

  const handleCancelEdit = () => {
    setEditingTemplateId(null);
    setTitle('');
    setDuration(30);
    setStartTime('');
    setPriority('essential');
    setNotes('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tplData: TaskTemplate = {
      id: editingTemplateId || ('template_' + Date.now()),
      title: title.trim(),
      notes: notes.trim(),
      plannedDuration: Number(duration),
      priority,
      scheduledStartTime: startTime || undefined,
    };

    onSaveTemplate(tplData);
    setFeedbackMessage(editingTemplateId ? 'Template Updated!' : 'Template Created!');
    
    // Reset form
    handleCancelEdit();

    setTimeout(() => {
      setFeedbackMessage(null);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col p-5 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200">
              <BookmarkPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-display uppercase tracking-wider text-white">
                Task Templates Manager
              </h3>
              <p className="text-[11px] text-zinc-400">
                Create and edit reusable tasks (like daily French, reading, workout) for 1-click scheduling.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto space-y-5 flex-1 pr-1">
          
          {/* Create or Edit Template Form */}
          <form onSubmit={handleSubmit} className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold font-display uppercase tracking-wider text-zinc-200 flex items-center space-x-1.5">
                {editingTemplateId ? (
                  <>
                    <Pencil className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Edit Existing Template</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 text-zinc-400 stroke-[2.5]" />
                    <span>Create New Template</span>
                  </>
                )}
              </h4>

              <div className="flex items-center space-x-2">
                {editingTemplateId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-[11px] text-zinc-400 hover:text-white flex items-center space-x-1 font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Cancel Edit</span>
                  </button>
                )}
                {feedbackMessage && (
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>{feedbackMessage}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              <div className="md:col-span-7">
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                  Task Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Learn French (TV5MONDE app)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#18181b] border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 font-medium focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="md:col-span-5">
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                  Default Duration
                </label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min="5"
                    max="240"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full bg-[#18181b] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-none"
                  />
                  <span className="text-xs text-zinc-400 font-medium">min</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                Preset Descriptive Notes (Formulas, app instructions, checklist)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Open TV5MONDE app. Complete 1 video listening comprehension exercise and vocabulary drill."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#18181b] border border-zinc-700 rounded-lg p-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] text-zinc-400 font-bold">Priority:</span>
                {(['essential', 'normal', 'flexible'] as PriorityLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setPriority(lvl)}
                    className={`px-2.5 py-1 rounded text-xs font-bold capitalize border transition-colors cursor-pointer ${
                      priority === lvl
                        ? 'bg-zinc-800 text-white border-zinc-600'
                        : 'bg-[#18181b] border-zinc-800 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="px-4 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-lg text-xs transition-colors flex items-center space-x-1.5 cursor-pointer shadow-sm"
              >
                {editingTemplateId ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>Create Template</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Existing Templates Shelf */}
          <div>
            <h4 className="text-xs font-bold font-display uppercase tracking-wider text-zinc-300 mb-2.5">
              Saved Reusable Templates ({templates.length})
            </h4>

            {templates.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4 border border-dashed border-zinc-800 rounded-xl">
                No saved templates yet. Use the form above to add your first recurring task.
              </p>
            ) : (
              <div className="space-y-2">
                {templates.map((tpl) => {
                  const isBeingEdited = editingTemplateId === tpl.id;

                  return (
                    <div
                      key={tpl.id}
                      className={`border rounded-xl p-3 flex items-start justify-between gap-3 transition-colors ${
                        isBeingEdited
                          ? 'bg-zinc-900 border-zinc-500 shadow-sm'
                          : 'bg-[#18181b] border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h5 className="text-xs font-bold text-white truncate">{tpl.title}</h5>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                            {formatMinutes(tpl.plannedDuration)}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 capitalize">
                            {tpl.priority}
                          </span>
                          {isBeingEdited && (
                            <span className="text-[10px] font-bold text-zinc-300 bg-zinc-800 px-1.5 py-0.2 rounded border border-zinc-700">
                              Editing now
                            </span>
                          )}
                        </div>
                        {tpl.notes && (
                          <p className="text-[11px] text-zinc-400 line-clamp-2">
                            {tpl.notes}
                          </p>
                        )}
                      </div>

                      {/* Action buttons: Edit & Delete */}
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(tpl)}
                          title="Edit this template"
                          className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
                            isBeingEdited
                              ? 'bg-zinc-200 text-zinc-950 border-white'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border-zinc-700/80'
                          }`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span className="text-[11px] hidden sm:inline">Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (isBeingEdited) handleCancelEdit();
                            onDeleteTemplate(tpl.id);
                          }}
                          title="Delete template"
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 border border-zinc-700/80 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-lg text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
