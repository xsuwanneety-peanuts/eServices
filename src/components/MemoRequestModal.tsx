import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MenuItemPermission } from '../types';
import { resolveStepApprover } from '../utils/approvers';
import { MEMO_CLOSING_LINE, nextMemoNo, thaiDate } from '../utils/memo';
import { AlertTriangle, Lock, Send, X } from 'lucide-react';
import { DraftNotice, SaveDraftButton, useFormDraft } from './FormDraft';

/** Fill in and send an internal memorandum (บันทึกภายใน). */
export const MemoRequestModal: React.FC<{ form: MenuItemPermission; onClose: () => void }> = ({ form, onClose }) => {
  const { workflows, employees, currentUser, requests, createNewRequest } = useApp();
  const workflow = workflows.find(w => w.id === form.workflowId);
  // Signature boxes after the author's own, in signing order
  const approvalSteps = (workflow?.steps ?? []).filter(step => step.approverType !== 'requester');

  type Saved = { to: string; subject: string; background: string; summary: string; picked: Record<string, string> };
  const draft = useFormDraft<Saved>(form);
  const saved = draft.restored;
  const [to, setTo] = useState(saved?.to ?? '');
  const [subject, setSubject] = useState(saved?.subject ?? '');
  const [background, setBackground] = useState(saved?.background ?? '');
  const [summary, setSummary] = useState(saved?.summary ?? '');
  const [picked, setPicked] = useState<Record<string, string>>(saved?.picked ?? {});
  const [error, setError] = useState('');
  const saveDraft = () => {
    draft.save(subject, { to, subject, background, summary, picked });
    onClose();
  };

  // Anyone but the author can be asked to sign, except people who are switched off
  const candidates = employees
    .filter(e => e.id !== currentUser.id && !e.disabled)
    .sort((a, b) => a.name.localeCompare(b.name, 'th'));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!workflow) return setError('แบบฟอร์มนี้ยังไม่มีขั้นตอนอนุมัติ กรุณาติดต่อผู้ดูแลระบบ');
    if (!to.trim()) return setError('กรุณากรอก "เรียน"');
    if (!subject.trim()) return setError('กรุณากรอก "เรื่อง"');
    if (!background.trim()) return setError('กรุณากรอก "สรุปความเป็นมา"');
    if (!summary.trim()) return setError('กรุณากรอก "สรุปสาระสำคัญ"');
    const unpicked = approvalSteps.find(step => step.approverType === 'requester_picks' && !picked[step.id]);
    if (unpicked) return setError(`กรุณาเลือกผู้ลงนามในช่อง "${unpicked.title}"`);

    createNewRequest(
      {
        title: subject.trim(),
        category: form.menuName,
        departmentId: form.ownerDepartmentId,
        workflowId: workflow.id,
        itilCategory: 'service_request',
        formId: form.id,
        // The number and date are issued when the memo is saved
        memo: { docNo: '', date: '', to: to.trim(), background: background.trim(), summary: summary.trim() },
      },
      picked
    );
    draft.sent();
    onClose();
  };

  const inputClass =
    'w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-sm text-slate-800 focus:outline-hidden focus:border-red-500';
  const lockedClass =
    'w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-100 text-sm text-slate-600 flex items-center gap-1.5';
  const labelClass = 'block font-semibold text-slate-700 mb-1';
  const required = <span className="text-rose-600">*</span>;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="memo-request-title"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[94vh]"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="memo-request-title" className="text-base font-bold text-slate-900">
              {form.menuName}
            </h2>
            <p className="text-xs text-slate-500">บันทึกภายใน</p>
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
          {/* Header block of the memo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="memo-to" className={labelClass}>
                เรียน {required}
              </label>
              <input
                id="memo-to"
                value={to}
                onChange={e => setTo(e.target.value)}
                placeholder="เช่น กรรมการผู้จัดการ"
                className={inputClass}
              />
            </div>
            <div>
              <span className={labelClass}>วันที่</span>
              <p className={lockedClass}>
                <Lock className="w-3 h-3 shrink-0" />
                {thaiDate(new Date())}
              </p>
            </div>
            <div className="sm:col-span-2">
              <span className={labelClass}>จาก</span>
              <p className={lockedClass}>
                <Lock className="w-3 h-3 shrink-0" />
                <span className="truncate">{currentUser.name}</span>
              </p>
            </div>
            <div>
              <span className={labelClass}>ที่</span>
              <p className={lockedClass} title="ระบบออกเลขให้เมื่อส่ง">
                <Lock className="w-3 h-3 shrink-0" />
                {nextMemoNo(currentUser.departmentId, requests)}
              </p>
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="memo-subject" className={labelClass}>
                เรื่อง {required}
              </label>
              <input id="memo-subject" value={subject} onChange={e => setSubject(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label htmlFor="memo-background" className={labelClass}>
              สรุปความเป็นมา {required}
            </label>
            <textarea
              id="memo-background"
              rows={5}
              value={background}
              onChange={e => setBackground(e.target.value)}
              className={`${inputClass} leading-relaxed`}
            />
          </div>

          <div>
            <label htmlFor="memo-summary" className={labelClass}>
              สรุปสาระสำคัญ {required}
            </label>
            <textarea
              id="memo-summary"
              rows={7}
              value={summary}
              onChange={e => setSummary(e.target.value)}
              className={`${inputClass} leading-relaxed`}
            />
          </div>

          <p className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">{MEMO_CLOSING_LINE}</p>

          {/* Signature boxes: titles are fixed, the author chooses who signs */}
          <div>
            <p className={labelClass}>ผู้ลงนาม</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-slate-400" />
                  {workflow?.steps[0]?.title ?? 'ผู้จัดทำ'}
                </p>
                <p className="mt-1.5 text-sm text-slate-700 truncate">{currentUser.name}</p>
                <p className="text-slate-400 truncate">{currentUser.position}</p>
              </div>

              {approvalSteps.map(step => {
                const fixed =
                  step.approverType === 'requester_picks'
                    ? undefined
                    : resolveStepApprover(step, currentUser.id, employees);
                return (
                  <div key={step.id} className="p-3 rounded-xl border border-slate-200">
                    <label htmlFor={`memo-step-${step.id}`} className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-slate-400" />
                      {step.title}
                      {step.approverType === 'requester_picks' && required}
                    </label>
                    {step.approverType === 'requester_picks' ? (
                      <select
                        id={`memo-step-${step.id}`}
                        value={picked[step.id] ?? ''}
                        onChange={e => setPicked(prev => ({ ...prev, [step.id]: e.target.value }))}
                        className={`${inputClass} mt-1.5`}
                      >
                        <option value="">— เลือกผู้ลงนาม —</option>
                        {candidates.map(person => (
                          <option key={person.id} value={person.id}>
                            {person.name} — {person.position}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p id={`memo-step-${step.id}`} className="mt-1.5 text-sm text-slate-700 truncate">
                        {fixed?.name ?? 'ยังไม่ได้กำหนด'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-1.5 text-slate-400">ส่งให้ลงนามตามลำดับ วันที่ลงนามบันทึกอัตโนมัติเมื่ออนุมัติ</p>
          </div>

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
            ส่งบันทึก
          </button>
        </div>
      </form>
    </div>
  );
};
