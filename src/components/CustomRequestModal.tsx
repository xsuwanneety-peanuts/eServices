import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MenuItemPermission } from '../types';
import { resolveStepApprover } from '../utils/approvers';
import { AlertTriangle, ArrowRight, Send, X } from 'lucide-react';

/** Fill in and submit a department-built form. */
export const CustomRequestModal: React.FC<{ form: MenuItemPermission; onClose: () => void }> = ({ form, onClose }) => {
  const { workflows, employees, currentUser, departments, createNewRequest } = useApp();
  const workflow = workflows.find(w => w.id === form.workflowId);
  const dept = departments.find(d => d.id === form.ownerDepartmentId);
  const fields = form.fields ?? [];

  const [title, setTitle] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  // Who will approve, resolved for the person filling in the form
  const approvalPath = (workflow?.steps ?? [])
    .filter(step => step.approverType !== 'requester')
    .map(step => ({ step, approver: resolveStepApprover(step, currentUser.id, employees) }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return setError('กรุณากรอกหัวเรื่อง');
    const missing = fields.find(f => f.required && !(values[f.id] ?? '').trim());
    if (missing) return setError(`กรุณากรอก "${missing.label}"`);
    if (!workflow) return setError('แบบฟอร์มนี้ยังไม่มีขั้นตอนอนุมัติ กรุณาติดต่อหน่วยงานเจ้าของแบบฟอร์ม');

    const answers = fields
      .map(f => ({ label: f.label, value: (values[f.id] ?? '').trim() }))
      .filter(a => a.value);
    createNewRequest({
      title: title.trim(),
      category: form.menuName,
      departmentId: form.ownerDepartmentId,
      workflowId: workflow.id,
      itilCategory: 'service_request',
      formId: form.id,
      answers,
      details: answers.map(a => `${a.label}: ${a.value}`).join('\n'),
    });
    onClose();
  };

  const inputClass =
    'w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-sm text-slate-800 focus:outline-hidden focus:border-red-500';

  return (
    <div
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
            <span className="text-[10px] font-mono text-slate-400">{form.menuCode}</span>
            <h2 id="custom-request-title" className="text-base font-bold text-slate-900">
              {form.menuName}
            </h2>
            <p className="text-xs text-slate-500">{dept?.nameEn}</p>
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
                {field.type === 'textarea' ? (
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

          {/* Approval path preview */}
          <div className="pt-1">
            <p className="font-semibold text-slate-700 mb-1.5">เส้นทางอนุมัติ</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {approvalPath.map(({ step, approver }, index) => (
                <React.Fragment key={step.id}>
                  {index > 0 && <ArrowRight className="w-3.5 h-3.5 text-slate-300" />}
                  <span
                    className={`px-2 py-1 rounded-lg border ${
                      approver ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-amber-300 bg-amber-50 text-amber-800'
                    }`}
                  >
                    {step.title}: <strong>{approver?.name ?? 'ยังไม่ได้กำหนด'}</strong>
                  </span>
                </React.Fragment>
              ))}
            </div>
            {approvalPath.some(p => !p.approver) && (
              <p className="mt-1.5 text-amber-700">
                บางขั้นยังไม่มีผู้อนุมัติ (เช่น ยังไม่ได้ตั้ง Report to) — ยื่นได้ แต่ต้องให้ผู้ดูแลระบบอนุมัติแทน
              </p>
            )}
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
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            ส่งคำร้อง
          </button>
        </div>
      </form>
    </div>
  );
};
