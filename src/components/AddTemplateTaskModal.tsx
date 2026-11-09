import React, { useState, useEffect } from 'react';
import { X, Plus, Clock, FileText } from 'lucide-react';
import { TaskTemplate, PriorityLevel, Task } from '../types';

interface AddTemplateTaskModalProps {
  template: TaskTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmAdd: (customizedTask: Omit<Task, 'id' | 'actualDuration' | 'status'>) => void;
}

export const AddTemplateTaskModal: React.FC<AddTemplateTaskModalProps> = ({
  template,
  isOpen,
  onClose,
  onConfirmAdd,
}) => {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(30);
  const [startTime, setStartTime] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('essential');
  const [notes, setNotes] = useState('');

  // Sync state whenever a new template is selected
  useEffect(() => {
    if (template) {
      setTitle(template.title);
      setDuration(template.plannedDuration);
      setStartTime(template.scheduledStartTime || '');
      setPriority(template.priority);
      setNotes(template.notes || '');
    }
  }, [template]);

  if (!isOpen || !template) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onConfirmAdd({
      title: title.trim(),
      plannedDuration: Number(duration),
      scheduledStartTime: startTime || undefined,
      priority,
      notes: notes.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#18181b] border border-zinc-700 rounded-2xl w-full max-w-lg p-5 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-display">
              Template Preview
            </span>
            <h3 className="text-base font-bold font-display text-white mt-1">
              Add Task to Schedule
            </h3>
            <p className="text-[11px] text-zinc-400">
              Review or customize the duration, description, or priority for today before adding.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          
          {/* Title */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-300 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Duration & Start Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                Duration (minutes)
              </label>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  min="5"
                  max="360"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-none"
                />
                <div className="flex space-x-1">
                  {[20, 30, 45].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className="px-1.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded text-[10px] font-mono font-bold cursor-pointer"
                    >
                      {d}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                Target Start Time (optional)
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Descriptive Notes */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-300 mb-1">
              Descriptive Notes (Homework details, concepts, chapter/video to watch)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add specific homework problems or concepts for today..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-200 font-medium placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none leading-relaxed"
            />
          </div>

          {/* Priority */}
          <div>
            <span className="block text-[11px] font-bold text-zinc-400 mb-1">Priority:</span>
            <div className="flex items-center space-x-1.5">
              {(['essential', 'normal', 'flexible'] as PriorityLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setPriority(lvl)}
                  className={`px-3 py-1 rounded text-xs font-bold capitalize border transition-colors cursor-pointer ${
                    priority === lvl
                      ? 'bg-zinc-800 text-white border-zinc-600'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-lg text-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add to Schedule</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
