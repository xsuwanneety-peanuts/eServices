import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

// The app's own confirm and text-input boxes. The browser's built-in ones (window.confirm,
// window.prompt) can be blocked or silently answered "cancel" by some browsers and embedded
// views, which made buttons such as delete look like they did nothing.

interface DialogOptions {
  title: string;
  /** Plain text; line breaks are kept. */
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button, for actions that remove or switch something off. */
  danger?: boolean;
}

interface TextOptions extends DialogOptions {
  label: string;
  initial?: string;
  placeholder?: string;
}

type Pending =
  | { kind: 'confirm'; options: DialogOptions; resolve: (ok: boolean) => void }
  | { kind: 'text'; options: TextOptions; resolve: (value: string | null) => void };

let enqueue: ((item: Pending) => void) | null = null;

/** Asks a yes/no question in the app's own dialog. Resolves true when confirmed. */
export const askConfirm = (options: DialogOptions): Promise<boolean> =>
  new Promise(resolve => {
    if (enqueue) enqueue({ kind: 'confirm', options, resolve });
    else resolve(false);
  });

/** Asks for one line of text. Resolves null when cancelled. */
export const askText = (options: TextOptions): Promise<string | null> =>
  new Promise(resolve => {
    if (enqueue) enqueue({ kind: 'text', options, resolve });
    else resolve(null);
  });

/** Shows the dialogs asked for with askConfirm / askText, one at a time. Mount once. */
export const ConfirmDialogHost: React.FC = () => {
  const [queue, setQueue] = useState<Pending[]>([]);
  const [text, setText] = useState('');
  const confirmRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const current = queue[0];

  useEffect(() => {
    enqueue = item => setQueue(prev => [...prev, item]);
    return () => {
      enqueue = null;
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    if (current.kind === 'text') {
      setText(current.options.initial ?? '');
      setTimeout(() => inputRef.current?.select(), 0);
    } else {
      setTimeout(() => confirmRef.current?.focus(), 0);
    }
  }, [current]);

  if (!current) return null;
  const { options } = current;

  const finish = (ok: boolean) => {
    if (current.kind === 'confirm') current.resolve(ok);
    else current.resolve(ok ? text : null);
    setQueue(prev => prev.slice(1));
  };

  const Icon = options.danger ? AlertTriangle : HelpCircle;

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onKeyDown={event => {
        if (event.key === 'Escape') finish(false);
      }}
    >
      <form
        onSubmit={event => {
          event.preventDefault();
          finish(true);
        }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden"
      >
        <div className="p-5 flex gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              options.danger ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-dialog-title" className="text-sm font-bold text-slate-900 break-words">
              {options.title}
            </h2>
            {options.message && (
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed whitespace-pre-line break-words">
                {options.message}
              </p>
            )}
            {current.kind === 'text' && (
              <div className="mt-3">
                <label htmlFor="confirm-dialog-input" className="block text-xs font-semibold text-slate-700 mb-1">
                  {current.options.label}
                </label>
                <input
                  id="confirm-dialog-input"
                  ref={inputRef}
                  value={text}
                  onChange={event => setText(event.target.value)}
                  placeholder={current.options.placeholder}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-sm text-slate-800 focus:outline-hidden focus:border-red-500"
                />
              </div>
            )}
          </div>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => finish(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            {options.cancelLabel ?? 'ยกเลิก'}
          </button>
          <button
            ref={confirmRef}
            type="submit"
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer ${
              options.danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {options.confirmLabel ?? 'ยืนยัน'}
          </button>
        </div>
      </form>
    </div>
  );
};
