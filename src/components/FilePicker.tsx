import React from 'react';
import { FileText, Paperclip, Trash2 } from 'lucide-react';

/** A file picked in a "แนบไฟล์" field: only its details are kept until upload is connected. */
export type PickedFile = { name: string; size: string; type: string };

const fileSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** "แนบไฟล์" field: pick one or more files, see them listed, remove any. */
export const FilePicker: React.FC<{ id: string; files: PickedFile[]; onChange: (files: PickedFile[]) => void }> = ({
  id,
  files,
  onChange,
}) => (
  <div className="space-y-1.5">
    <label
      htmlFor={id}
      className="flex items-center justify-center gap-2 px-3 py-3 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-600 hover:border-red-400 hover:bg-red-50/40 hover:text-red-700 cursor-pointer transition-colors"
    >
      <Paperclip className="w-4 h-4" />
      <span className="font-semibold">เลือกไฟล์แนบ</span>
      <span className="text-slate-400">(เลือกได้หลายไฟล์)</span>
    </label>
    <input
      id={id}
      type="file"
      multiple
      className="sr-only"
      onChange={e => {
        const picked = Array.from(e.target.files ?? []).map(f => ({
          name: f.name,
          size: fileSize(f.size),
          type: f.type || 'application/octet-stream',
        }));
        // The same file picked twice is listed once
        onChange([...files, ...picked.filter(p => !files.some(f => f.name === p.name))]);
        e.target.value = '';
      }}
    />
    {files.length > 0 && (
      <ul className="space-y-1">
        {files.map(file => (
          <li
            key={file.name}
            className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200"
          >
            <span className="flex items-center gap-2 min-w-0">
              <FileText className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span className="font-medium text-slate-800 truncate">{file.name}</span>
              <span className="text-[11px] text-slate-400 shrink-0">{file.size}</span>
            </span>
            <button
              type="button"
              onClick={() => onChange(files.filter(f => f.name !== file.name))}
              aria-label={`เอา ${file.name} ออก`}
              className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);
