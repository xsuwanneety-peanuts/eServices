import React, { useState } from 'react';
import { closeOnBackdrop } from './backdrop';
import { useApp } from '../context/AppContext';
import { MenuItemPermission } from '../types';
import { resolveStepApprover } from '../utils/approvers';
import { isTitleField, nextRequestCodeFor } from '../utils/forms';
import { HandlerDraft, HandlerSteps, handlersToSteps, newHandler } from './HandlerSteps';
import { DraftNotice, SaveDraftButton, useFormDraft } from './FormDraft';
import { FilePicker, PickedFile } from './FilePicker';
import { AlertTriangle, Send, X } from 'lucide-react';

const handlerLabel = (n: number) => `ผู้ดำเนินการ ${n}`;

/** Fill in and submit a form made in the form builder. */
export const CustomRequestModal: React.FC<{ form: MenuItemPermission; onClose: () => void }> = ({ form, onClose }) => {
  const { workflows, employees, currentUser, requests, createNewRequest } = useApp();
  const workflow = workflows.find(w => w.id === form.workflowId);
  // Every request already has its own title box, so a form field that only asks for the title again is left out
  const fields = (form.fields ?? []).filter(f => !isTitleField(f.label));
  const addsSteps = !!form.requesterAddsSteps;

  const draft = useFormDraft<{
    title: string;
    values: Record<string, string>;
    files: Record<string, PickedFile[]>;
    handlers: HandlerDraft[];
  }>(form);
  const [title, setTitle] = useState(draft.restored?.title ?? '');
  const [values, setValues] = useState<Record<string, string>>(draft.restored?.values ?? {});
  // Files picked in "แนบไฟล์" fields, by field id
  const [files, setFiles] = useState<Record<string, PickedFile[]>>(draft.restored?.files ?? {});
  const [handlers, setHandlers] = useState<HandlerDraft[]>(
    draft.restored?.handlers ?? (addsSteps ? [newHandler()] : [])
  );
  const [error, setError] = useState('');
  const saveDraft = () => {
    draft.save(title, { title, values, files, handlers });
    onClose();
  };
  /** A field's answer as text: what was typed, or the names of the files picked. */
  const answerOf = (fieldId: string, type: string) =>
    type === 'file'
      ? (files[fieldId] ?? []).map(f => f.name).join(', ')
      : (values[fieldId] ?? '').trim();

  // The form's own steps, resolved for the person filling it in
  const fixedSteps = (workflow?.steps ?? [])
    .filter(step => step.approverType !== 'requester')
    .map(step => ({
      key: step.id,
      title: step.title,
      name: resolveStepApprover(step, currentUser.id, employees)?.name,
    }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return setError('กรุณากรอกหัวเรื่อง');
    const missing = fields.find(f => f.required && !answerOf(f.id, f.type));
    if (missing) {
      return setError(missing.type === 'file' ? `กรุณาแนบไฟล์ "${missing.label}"` : `กรุณากรอก "${missing.label}"`);
    }
    if (!workflow) return setError('แบบฟอร์มนี้ยังไม่มีขั้นตอนอนุมัติ กรุณาติดต่อผู้ดูแลระบบ');
    if (handlers.some(h => !h.employeeId)) return setError('กรุณาเลือกผู้ดำเนินการให้ครบทุกขั้น หรือลบขั้นที่ไม่ใช้');
    if (fixedSteps.length === 0 && handlers.length === 0) {
      return setError('กรุณาเพิ่มผู้ดำเนินการอย่างน้อย 1 คน');
    }

    const answers = fields
      .map(f => ({ label: f.label, value: answerOf(f.id, f.type) }))
      .filter(a => a.value);
    // Only the file names and sizes are kept for now: the files themselves are not uploaded yet
    const attachments = fields
      .filter(f => f.type === 'file')
      .flatMap(f => files[f.id] ?? []);
    createNewRequest(
      {
        title: title.trim(),
        category: form.menuName,
        // A shared form has no owning department: the request belongs to the requester's own
        departmentId: currentUser.departmentId,
        workflowId: workflow.id,
        itilCategory: 'service_request',
        formId: form.id,
        answers,
        details: answers.map(a => `${a.label}: ${a.value}`).join('\n'),
        ...(attachments.length ? { attachments } : {}),
      },
      {},
      handlersToSteps(handlers, handlerLabel)
    );
    draft.sent();
    onClose();
  };

  const inputClass =
    'w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-sm text-slate-800 focus:outline-hidden focus:border-red-500';

  return (
    <div
      {...closeOnBackdrop(onClose)}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-request-title"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[94vh]"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="custom-request-title" className="text-base font-bold text-slate-900">
              {form.menuName}
            </h2>
            <p className="text-xs text-slate-500">
              เลขที่เอกสารถัดไป{' '}
              <span className="font-mono text-slate-700">
                {nextRequestCodeFor(
                  form,
                  requests.map(r => r.code)
                )}
              </span>
            </p>
            <DraftNotice savedAt={draft.draft?.savedAt} />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {form.description && (
            <p className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 leading-relaxed whitespace-pre-line">
              {form.description}
            </p>
          )}

          <div>
            <label htmlFor="cr-title" className="block font-semibold text-slate-700 mb-1">
              หัวเรื่อง <span className="text-rose-600">*</span>
            </label>
            <input
              id="cr-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="สรุปสั้น ๆ ว่าขออะไร"
              className={inputClass}
            />
          </div>

          {fields.map(field => {
            const id = `cr-${field.id}`;
            const value = values[field.id] ?? '';
            const set = (v: string) => setValues(prev => ({ ...prev, [field.id]: v }));
            return (
              <div key={field.id}>
                <label htmlFor={id} className="block font-semibold text-slate-700 mb-1">
                  {field.label} {field.required && <span className="text-rose-600">*</span>}
                </label>
                {field.type === 'file' ? (
                  <FilePicker
                    id={id}
                    files={files[field.id] ?? []}
                    onChange={list => setFiles(prev => ({ ...prev, [field.id]: list }))}
                  />
                ) : field.type === 'textarea' ? (
                  <textarea id={id} rows={3} value={value} onChange={e => set(e.target.value)} className={inputClass} />
                ) : field.type === 'select' ? (
                  <select id={id} value={value} onChange={e => set(e.target.value)} className={inputClass}>
                    <option value="">— เลือก —</option>
                    {(field.options ?? []).map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={id}
                    type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                    value={value}
                    onChange={e => set(e.target.value)}
                    className={inputClass}
                  />
                )}
              </div>
            );
          })}

          <HandlerSteps
            handlers={handlers}
            setHandlers={setHandlers}
            fixedSteps={fixedSteps}
            heading="ผู้ดำเนินการ"
            label={handlerLabel}
            inputClass={inputClass}
            allowAdd={addsSteps}
          />

          {error && (
            <p role="alert" className="flex items-center gap-1.5 text-rose-700 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            ยกเลิก
          </button>
          <SaveDraftButton onClick={saveDraft} />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-red-600 hover:bg-red-700 text-white shadow-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            ส่งคำร้อง
          </button>
        </div>
      </form>
    </div>
  );
};
