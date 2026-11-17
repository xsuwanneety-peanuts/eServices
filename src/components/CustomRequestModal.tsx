import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DepartmentId, MenuItemPermission } from '../types';
import { resolveStepApprover } from '../utils/approvers';
import { AddedStep, nextRequestCode } from '../utils/forms';
import { AlertTriangle, ArrowDown, ArrowRight, ArrowUp, Plus, Send, Trash2, X } from 'lucide-react';

/** A handler row while the form is being filled in: pick a department, then a person in it. */
interface HandlerDraft {
  key: number;
  departmentId: DepartmentId | '';
  employeeId: string;
}

/** Fill in and submit a department-built form. */
export const CustomRequestModal: React.FC<{ form: MenuItemPermission; onClose: () => void }> = ({ form, onClose }) => {
  const { workflows, employees, departments, currentUser, requests, createNewRequest } = useApp();
  const workflow = workflows.find(w => w.id === form.workflowId);
  const fields = form.fields ?? [];
  const addsSteps = !!form.requesterAddsSteps;

  const [title, setTitle] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [handlers, setHandlers] = useState<HandlerDraft[]>(
    addsSteps ? [{ key: Date.now(), departmentId: '', employeeId: '' }] : []
  );
  const [error, setError] = useState('');

  // Who will approve, resolved for the person filling in the form
  const approvalPath = (workflow?.steps ?? [])
    .filter(step => step.approverType !== 'requester')
    .map(step => ({ step, approver: resolveStepApprover(step, currentUser.id, employees) }));

  // People who can be picked as handlers: everyone active except the requester
  const pickable = employees.filter(e => !e.disabled && e.id !== currentUser.id);
  const updateHandler = (key: number, patch: Partial<HandlerDraft>) =>
    setHandlers(prev => prev.map(h => (h.key === key ? { ...h, ...patch } : h)));
  const moveHandler = (index: number, delta: number) =>
    setHandlers(prev => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return setError('กรุณากรอกหัวเรื่อง');
    const missing = fields.find(f => f.required && !(values[f.id] ?? '').trim());
    if (missing) return setError(`กรุณากรอก "${missing.label}"`);
    if (!workflow) return setError('แบบฟอร์มนี้ยังไม่มีขั้นตอนอนุมัติ กรุณาติดต่อผู้ดูแลระบบ');
    if (handlers.some(h => !h.employeeId)) return setError('กรุณาเลือกผู้ดำเนินการให้ครบทุกขั้น หรือลบขั้นที่ไม่ใช้');
    if (approvalPath.length === 0 && handlers.length === 0) {
      return setError('กรุณาเพิ่มผู้ดำเนินการอย่างน้อย 1 คน');
    }

    const addedSteps: AddedStep[] = handlers.map((h, i) => ({
      title: `ผู้ดำเนินการ ${i + 1}`,
      employeeId: h.employeeId,
    }));
    const answers = fields
      .map(f => ({ label: f.label, value: (values[f.id] ?? '').trim() }))
      .filter(a => a.value);
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
      },
      {},
      addedSteps
    );
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
            <h2 id="custom-request-title" className="text-base font-bold text-slate-900">
              {form.menuName}
            </h2>
            <p className="text-xs text-slate-500">
              เลขที่เอกสารถัดไป{' '}
              <span className="font-mono text-slate-700">
                {nextRequestCode(
                  form.docPrefix ?? '',
                  requests.map(r => r.code)
                )}
              </span>
            </p>
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

          {/* Handlers the requester adds, in the order the request goes to them */}
          {addsSteps && (
            <section className="pt-1">
              <p className="font-semibold text-slate-700">ผู้ดำเนินการ</p>
              <p className="text-slate-500 mb-2">
                เลือกได้จากทุกหน่วยงาน กี่คนก็ได้ คำร้องจะส่งต่อตามลำดับจากบนลงล่าง
              </p>
              <div className="space-y-2">
                {handlers.map((handler, index) => {
                  const people = pickable.filter(e => !handler.departmentId || e.departmentId === handler.departmentId);
                  return (
                    <div key={handler.key} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <span className="font-semibold text-slate-700">ผู้ดำเนินการ {index + 1}</span>
                        <span className="ml-auto flex items-center">
                          <button
                            type="button"
                            onClick={() => moveHandler(index, -1)}
                            disabled={index === 0}
                            title="เลื่อนขึ้น"
                            className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveHandler(index, 1)}
                            disabled={index === handlers.length - 1}
                            title="เลื่อนลง"
                            className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setHandlers(prev => prev.filter(h => h.key !== handler.key))}
                            title="ลบขั้นนี้"
                            aria-label={`ลบผู้ดำเนินการ ${index + 1}`}
                            className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <select
                          value={handler.departmentId}
                          onChange={e => {
                            const departmentId = e.target.value as DepartmentId | '';
                            const keep = pickable.find(p => p.id === handler.employeeId)?.departmentId === departmentId;
                            updateHandler(handler.key, { departmentId, employeeId: keep ? handler.employeeId : '' });
                          }}
                          aria-label={`หน่วยงานของผู้ดำเนินการ ${index + 1}`}
                          className={inputClass}
                        >
                          <option value="">ทุกหน่วยงาน</option>
                          {departments.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.nameEn}
                            </option>
                          ))}
                        </select>
                        <select
                          value={handler.employeeId}
                          onChange={e => {
                            const person = pickable.find(p => p.id === e.target.value);
                            updateHandler(handler.key, {
                              employeeId: e.target.value,
                              ...(person ? { departmentId: person.departmentId } : {}),
                            });
                          }}
                          aria-label={`ผู้ดำเนินการ ${index + 1}`}
                          className={inputClass}
                        >
                          <option value="">
                            {people.length ? '— เลือกพนักงาน —' : '— หน่วยงานนี้ยังไม่มีพนักงาน —'}
                          </option>
                          {people.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} — {p.position}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setHandlers(prev => [...prev, { key: Date.now(), departmentId: '', employeeId: '' }])}
                className="mt-2 w-full py-2 rounded-xl border border-dashed border-red-300 text-red-700 bg-red-50/40 hover:bg-red-50 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                เพิ่มผู้ดำเนินการ
              </button>
            </section>
          )}

          {/* Approval path preview */}
          <div className="pt-1">
            <p className="font-semibold text-slate-700 mb-1.5">เส้นทางอนุมัติ</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700">
                ผู้ยื่น: <strong>{currentUser.name}</strong>
              </span>
              {approvalPath.map(({ step, approver }) => (
                <React.Fragment key={step.id}>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                  <span
                    className={`px-2 py-1 rounded-lg border ${
                      approver ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-amber-300 bg-amber-50 text-amber-800'
                    }`}
                  >
                    {step.title}: <strong>{approver?.name ?? 'ยังไม่ได้กำหนด'}</strong>
                  </span>
                </React.Fragment>
              ))}
              {handlers.map((handler, index) => {
                const person = pickable.find(p => p.id === handler.employeeId);
                const dept = departments.find(d => d.id === person?.departmentId);
                return (
                  <React.Fragment key={handler.key}>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                    <span
                      className={`px-2 py-1 rounded-lg border ${
                        person ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-amber-300 bg-amber-50 text-amber-800'
                      }`}
                    >
                      ผู้ดำเนินการ {index + 1}: <strong>{person?.name ?? 'ยังไม่ได้เลือก'}</strong>
                      {dept && <span className="text-slate-500"> ({dept.nameEn})</span>}
                    </span>
                  </React.Fragment>
                );
              })}
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
