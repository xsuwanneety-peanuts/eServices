import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DepartmentId, FormFieldType, MenuItemPermission, StepApproverType } from '../types';
import { APPROVER_TYPE_LABELS } from '../utils/approvers';
import { CustomFormInput, FIELD_TYPE_LABELS, FormAudience, newId } from '../utils/forms';
import { AlertTriangle, ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';

type FieldDraft = CustomFormInput['fields'][number] & { optionsText: string };
type StepDraft = CustomFormInput['steps'][number];

const FIELD_TYPES: FormFieldType[] = ['text', 'textarea', 'number', 'date', 'select'];
const APPROVER_TYPES: StepApproverType[] = ['reports_to', 'reports_to_2', 'employee'];

const move = <T,>(list: T[], index: number, delta: number): T[] => {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

/** Create or edit a form that a department offers on its own page. */
export const FormBuilderModal: React.FC<{
  deptId: DepartmentId;
  form: MenuItemPermission | null;
  onClose: () => void;
}> = ({ deptId, form, onClose }) => {
  const { departments, employees, workflows, saveCustomForm, deleteCustomForm } = useApp();
  const dept = departments.find(d => d.id === deptId);
  const isNew = form === null;
  const workflow = form?.workflowId ? workflows.find(w => w.id === form.workflowId) : undefined;

  const allowedCount = form ? departments.filter(d => form.allowedDepartments[d.id]).length : 0;
  const initialAudience: FormAudience = !form
    ? 'all'
    : allowedCount === departments.length
      ? 'all'
      : allowedCount === 1 && form.allowedDepartments[deptId]
        ? 'own'
        : 'custom';

  const [name, setName] = useState(form?.menuName ?? '');
  const [description, setDescription] = useState(form?.description ?? '');
  const [audience, setAudience] = useState<FormAudience>(initialAudience);
  const [fields, setFields] = useState<FieldDraft[]>(
    form?.fields?.map(f => ({ ...f, optionsText: (f.options ?? []).join(', ') })) ?? [
      { id: newId('field'), label: 'รายละเอียด', type: 'textarea', required: true, optionsText: '' },
    ]
  );
  const [steps, setSteps] = useState<StepDraft[]>(
    workflow?.steps
      .filter(s => s.approverType !== 'requester')
      .map(s => ({ id: s.id, title: s.title, approverType: s.approverType, approverEmployeeId: s.approverEmployeeId })) ?? [
      { id: newId('step'), title: 'หัวหน้างานต้นสังกัด', approverType: 'reports_to' },
    ]
  );
  const [error, setError] = useState('');

  const updateField = (id: string, patch: Partial<FieldDraft>) =>
    setFields(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));
  const updateStep = (id: string, patch: Partial<StepDraft>) =>
    setSteps(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));

  const handleSave = () => {
    if (!name.trim()) return setError('กรุณาตั้งชื่อแบบฟอร์ม');
    if (fields.length === 0) return setError('แบบฟอร์มต้องมีช่องข้อมูลอย่างน้อย 1 ช่อง');
    if (fields.some(f => !f.label.trim())) return setError('กรุณาตั้งชื่อช่องข้อมูลให้ครบทุกช่อง');
    const options = (f: FieldDraft) =>
      f.optionsText
        .split(',')
        .map(o => o.trim())
        .filter(Boolean);
    if (fields.some(f => f.type === 'select' && options(f).length === 0)) {
      return setError('ช่องแบบตัวเลือกต้องมีตัวเลือกอย่างน้อย 1 รายการ (คั่นด้วยจุลภาค)');
    }
    if (steps.length === 0) return setError('ต้องมีขั้นตอนอนุมัติอย่างน้อย 1 ขั้น');
    if (steps.some(s => !s.title.trim())) return setError('กรุณาตั้งชื่อขั้นตอนอนุมัติให้ครบ');
    if (steps.some(s => s.approverType === 'employee' && !s.approverEmployeeId)) {
      return setError('กรุณาเลือกพนักงานผู้อนุมัติให้ครบ');
    }

    saveCustomForm(
      deptId,
      {
        name: name.trim(),
        description: description.trim(),
        audience,
        fields: fields.map(({ optionsText, ...f }) => ({
          ...f,
          label: f.label.trim(),
          options: f.type === 'select' ? options({ ...f, optionsText }) : undefined,
        })),
        steps: steps.map(s => ({
          ...s,
          title: s.title.trim(),
          approverEmployeeId: s.approverType === 'employee' ? s.approverEmployeeId : undefined,
        })),
      },
      form?.id
    );
    onClose();
  };

  const handleDelete = () => {
    if (!form) return;
    if (window.confirm(`ลบแบบฟอร์ม "${form.menuName}"?\n\nคำร้องที่ยื่นไปแล้วยังอยู่ แต่จะยื่นแบบฟอร์มนี้ใหม่ไม่ได้อีก`)) {
      deleteCustomForm(form.id);
      onClose();
    }
  };

  const inputClass =
    'w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-sm text-slate-800 focus:outline-hidden focus:border-red-500';
  const iconButton = 'p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer';

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="form-builder-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[94vh]">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 id="form-builder-title" className="text-base font-bold text-slate-900">
              {isNew ? 'สร้างแบบฟอร์มใหม่' : `แก้ไขแบบฟอร์ม ${form.menuCode}`}
            </h2>
            <p className="text-xs text-slate-500 truncate">{dept?.nameEn}</p>
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

        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
          {/* Basics */}
          <section className="space-y-3">
            <div>
              <label htmlFor="fb-name" className="block font-semibold text-slate-700 mb-1">
                ชื่อแบบฟอร์ม
              </label>
              <input
                id="fb-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="เช่น ขอใช้รถส่วนกลาง"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="fb-desc" className="block font-semibold text-slate-700 mb-1">
                คำอธิบาย (ไม่บังคับ)
              </label>
              <textarea
                id="fb-desc"
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="แบบฟอร์มนี้ใช้ทำอะไร ต้องเตรียมอะไร"
                className={inputClass}
              />
            </div>
          </section>

          {/* Fields */}
          <section>
            <h3 className="text-sm font-bold text-slate-900">ช่องข้อมูลที่ผู้ยื่นต้องกรอก</h3>
            <p className="text-slate-500 mb-3">ระบบมีช่อง "หัวเรื่อง" ให้อยู่แล้ว เพิ่มเฉพาะข้อมูลที่หน่วยงานต้องการ</p>
            <div className="space-y-2.5">
              {fields.map((field, index) => (
                <div key={field.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <input
                      value={field.label}
                      onChange={e => updateField(field.id, { label: e.target.value })}
                      placeholder="ชื่อช่อง เช่น วันที่ต้องการใช้"
                      aria-label={`ชื่อช่องที่ ${index + 1}`}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setFields(prev => move(prev, index, -1))}
                      disabled={index === 0}
                      title="เลื่อนขึ้น"
                      className={iconButton}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFields(prev => move(prev, index, 1))}
                      disabled={index === fields.length - 1}
                      title="เลื่อนลง"
                      className={iconButton}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFields(prev => prev.filter(f => f.id !== field.id))}
                      title="ลบช่องนี้"
                      className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pl-7">
                    <select
                      value={field.type}
                      onChange={e => updateField(field.id, { type: e.target.value as FormFieldType })}
                      aria-label="ชนิดข้อมูล"
                      className="px-2 py-1 border border-slate-300 rounded-lg bg-white text-xs text-slate-700 focus:outline-hidden focus:border-red-500"
                    >
                      {FIELD_TYPES.map(type => (
                        <option key={type} value={type}>
                          {FIELD_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                    <label className="inline-flex items-center gap-1.5 text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={e => updateField(field.id, { required: e.target.checked })}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-red-600 cursor-pointer"
                      />
                      บังคับกรอก
                    </label>
                  </div>
                  {field.type === 'select' && (
                    <div className="pl-7">
                      <input
                        value={field.optionsText}
                        onChange={e => updateField(field.id, { optionsText: e.target.value })}
                        placeholder="ตัวเลือก คั่นด้วยจุลภาค เช่น เช้า, บ่าย, ทั้งวัน"
                        aria-label="ตัวเลือก"
                        className={inputClass}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setFields(prev => [
                  ...prev,
                  { id: newId('field'), label: '', type: 'text', required: false, optionsText: '' },
                ])
              }
              className="mt-2.5 w-full py-2 rounded-xl border border-dashed border-red-300 text-red-700 bg-red-50/40 hover:bg-red-50 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              เพิ่มช่องข้อมูล
            </button>
          </section>

          {/* Approval steps */}
          <section>
            <h3 className="text-sm font-bold text-slate-900">ขั้นตอนอนุมัติ</h3>
            <p className="text-slate-500 mb-3">
              ผู้อนุมัติดึงจาก Employee Directory — ระบบส่งอีเมลขออนุมัติตามลำดับนี้หลังผู้ยื่นส่งคำร้อง
            </p>
            <div className="space-y-2.5">
              {steps.map((step, index) => (
                <div key={step.id} className="p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 shrink-0 w-12">ขั้นที่ {index + 1}</span>
                    <input
                      value={step.title}
                      onChange={e => updateStep(step.id, { title: e.target.value })}
                      placeholder="ชื่อขั้นตอน เช่น หัวหน้าฝ่ายธุรการ"
                      aria-label={`ชื่อขั้นตอนที่ ${index + 1}`}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setSteps(prev => move(prev, index, -1))}
                      disabled={index === 0}
                      title="เลื่อนขึ้น"
                      className={iconButton}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSteps(prev => move(prev, index, 1))}
                      disabled={index === steps.length - 1}
                      title="เลื่อนลง"
                      className={iconButton}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSteps(prev => prev.filter(s => s.id !== step.id))}
                      title="ลบขั้นตอนนี้"
                      className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:pl-14">
                    <select
                      value={step.approverType}
                      onChange={e => {
                        const approverType = e.target.value as StepApproverType;
                        updateStep(step.id, {
                          approverType,
                          approverEmployeeId: approverType === 'employee' ? step.approverEmployeeId : undefined,
                        });
                      }}
                      aria-label="ผู้อนุมัติ"
                      className={inputClass}
                    >
                      {APPROVER_TYPES.map(type => (
                        <option key={type} value={type}>
                          {APPROVER_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                    {step.approverType === 'employee' && (
                      <select
                        value={step.approverEmployeeId ?? ''}
                        onChange={e => updateStep(step.id, { approverEmployeeId: e.target.value || undefined })}
                        aria-label="พนักงานผู้อนุมัติ"
                        className={inputClass}
                      >
                        <option value="">— เลือกพนักงาน —</option>
                        {employees.map(person => (
                          <option key={person.id} value={person.id}>
                            {person.name} — {person.position}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSteps(prev => [...prev, { id: newId('step'), title: '', approverType: 'reports_to' }])}
              className="mt-2.5 w-full py-2 rounded-xl border border-dashed border-red-300 text-red-700 bg-red-50/40 hover:bg-red-50 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              เพิ่มขั้นตอนอนุมัติ
            </button>
          </section>

          {/* Audience */}
          <section>
            <h3 className="text-sm font-bold text-slate-900 mb-2">ใครยื่นแบบฟอร์มนี้ได้</h3>
            <div className="space-y-1.5">
              {(
                [
                  ['all', 'ทุกหน่วยงาน'],
                  ['own', `เฉพาะ ${dept?.nameEn ?? 'หน่วยงานนี้'}`],
                  ...(initialAudience === 'custom' ? [['custom', 'ตามที่ตั้งไว้ในหน้าสิทธิ์เข้าถึง']] : []),
                ] as [FormAudience, string][]
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="fb-audience"
                    value={value}
                    checked={audience === value}
                    onChange={() => setAudience(value)}
                    className="w-3.5 h-3.5 text-red-600 cursor-pointer"
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>

          {error && (
            <p role="alert" className="flex items-center gap-1.5 text-rose-700 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
          {!isNew ? (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              ลบแบบฟอร์ม
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs cursor-pointer"
            >
              {isNew ? 'สร้างแบบฟอร์ม' : 'บันทึก'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
