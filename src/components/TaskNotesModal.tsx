import React, { useState, useEffect } from 'react';
import { X, FileText, Check } from 'lucide-react';
import { Task } from '../types';

interface TaskNotesModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveNotes: (taskId: string, newNotes: string) => void;
}

export const TaskNotesModal: React.FC<TaskNotesModalProps> = ({
  task,
  isOpen,
  onClose,
  onSaveNotes,
}) => {
  const [notes, setNotes] = useState('');
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    if (task) {
      setNotes(task.notes || '');
      setSavedFeedback(false);
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const handleSave = () => {
    onSaveNotes(task.id, notes);
    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-lg p-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-zinc-400" />
            <div>
              <h3 className="text-xs font-semibold text-zinc-100 truncate max-w-xs sm:max-w-md">
                {task.title}
              </h3>
              <p className="text-[10px] text-zinc-500">Descriptive Notes & Concept Checklist</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Textarea */}
        <div className="mb-3">
          <textarea
            rows={7}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write down the homework exercises, page numbers, formula reminders, or checklist..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 font-sans leading-relaxed resize-none"
            autoFocus
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-500 font-mono">
            {notes.length} chars
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-zinc-200 hover:bg-white text-zinc-950 font-semibold rounded-lg text-xs transition-colors flex items-center space-x-1 cursor-pointer"
            >
              {savedFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved</span>
                </>
              ) : (
                <span>Save Notes</span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
