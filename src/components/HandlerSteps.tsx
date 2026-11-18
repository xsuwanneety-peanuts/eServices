import React from 'react';
import { useApp } from '../context/AppContext';
import { DepartmentId } from '../types';
import { AddedStep } from '../utils/forms';
import { ArrowDown, ArrowRight, ArrowUp, Plus, Trash2 } from 'lucide-react';

/** A handler row while a form is being filled in: pick a department, then a person in it. */
export interface HandlerDraft {
  key: number;
  departmentId: DepartmentId | '';
  employeeId: string;
}

export const newHandler = (): HandlerDraft => ({ key: Date.now() + Math.random(), departmentId: '', employeeId: '' });

/** The handlers as approval steps, titled in order with `label`. */
export const handlersToSteps = (handlers: HandlerDraft[], label: (n: number) => string): AddedStep[] =>
  handlers.map((h, i) => ({ title: label(i + 1), employeeId: h.employeeId }));

/** A fixed step of the form, already resolved for the requester. */
export interface FixedPathStep {
  key: string;
  title: string;
  /** Who it goes to; undefined when nobody is set up. */
  name?: string;
}

interface HandlerStepsProps {
  handlers: HandlerDraft[];
  setHandlers: React.Dispatch<React.SetStateAction<HandlerDraft[]>>;
  /** Steps the form always has, shown before the handlers in the path preview. */
  fixedSteps?: FixedPathStep[];
  /** Section heading, e.g. ผู้ดำเนินการ or ผู้อนุมัติ. */
  heading: string;
  /** The title of handler n, e.g. "ผู้ดำเนินการ 2" or "ผู้อนุมัติ (2)". */
  label: (n: number) => string;
  inputClass: string;
  /** False on a form with only fixed steps: just the path preview is shown. */
  allowAdd?: boolean;
}

/**
 * The requester picks who handles the request, any number of people from any department, in
 * order; with a preview of the whole approval path underneath.
 */
export const HandlerSteps: React.FC<HandlerStepsProps> = ({
  handlers,
  setHandlers,
  fixedSteps = [],
  heading,
  label,
  inputClass,
  allowAdd = true,
}) => {
  const { employees, departments, currentUser } = useApp();

  // People who can be picked: everyone active except the requester
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

  const chip = (ok: boolean) =>
    `px-2 py-1 rounded-lg border ${
      ok ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-amber-300 bg-amber-50 text-amber-800'
    }`;

  return (
    <>
      {allowAdd && (
      <section className="pt-1">
        <p className="font-semibold text-slate-700">{heading}</p>
        <p className="text-slate-500 mb-2">เลือกได้จากทุกหน่วยงาน กี่คนก็ได้ คำร้องจะส่งต่อตามลำดับจากบนลงล่าง</p>
        <div className="space-y-2">
          {handlers.map((handler, index) => {
            const people = pickable.filter(e => !handler.departmentId || e.departmentId === handler.departmentId);
            const title = label(index + 1);
            return (
              <div key={handler.key} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <span className="font-semibold text-slate-700">{title}</span>
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
                      aria-label={`ลบ${title}`}
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
                    aria-label={`หน่วยงานของ${title}`}
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
                    aria-label={title}
                    className={inputClass}
                  >
                    <option value="">{people.length ? '— เลือกพนักงาน —' : '— หน่วยงานนี้ยังไม่มีพนักงาน —'}</option>
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
          onClick={() => setHandlers(prev => [...prev, newHandler()])}
          className="mt-2 w-full py-2 rounded-xl border border-dashed border-red-300 text-red-700 bg-red-50/40 hover:bg-red-50 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          เพิ่ม{heading}
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
          {fixedSteps.map(step => (
            <React.Fragment key={step.key}>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
              <span className={chip(!!step.name)}>
                {step.title}: <strong>{step.name ?? 'ยังไม่ได้กำหนด'}</strong>
              </span>
            </React.Fragment>
          ))}
          {handlers.map((handler, index) => {
            const person = pickable.find(p => p.id === handler.employeeId);
            const dept = departments.find(d => d.id === person?.departmentId);
            return (
              <React.Fragment key={handler.key}>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                <span className={chip(!!person)}>
                  {label(index + 1)}: <strong>{person?.name ?? 'ยังไม่ได้เลือก'}</strong>
                  {dept && <span className="text-slate-500"> ({dept.nameEn})</span>}
                </span>
              </React.Fragment>
            );
          })}
        </div>
        {fixedSteps.some(s => !s.name) && (
          <p className="mt-1.5 text-amber-700">
            บางขั้นยังไม่มีผู้อนุมัติ (เช่น ยังไม่ได้ตั้ง Report to) — ยื่นได้ แต่ต้องให้ผู้ดูแลระบบอนุมัติแทน
          </p>
        )}
      </div>
    </>
  );
};
