import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MenuItemPermission } from '../types';
import { resolveStepApprover } from '../utils/approvers';
import { IT_ITEM_TYPES } from '../utils/itRequest';
import { thaiDate } from '../utils/memo';
import { AlertTriangle, ArrowRight, Lock, Send, X } from 'lucide-react';

type ItemDraft = { checked: boolean; assetNo: string; detail: string };

/** Part 1 of the IT & Request Form: the requester says what is needed and sends it for approval. */
export const ItRequestModal: React.FC<{ form: MenuItemPermission; onClose: () => void }> = ({ form, onClose }) => {
  const { workflows, employees, currentUser, departments, createNewRequest } = useApp();
  const workflow = workflows.find(w => w.id === form.workflowId);
  const dept = departments.find(d => d.id === currentUser.departmentId);

  const [userLogin, setUserLogin] = useState(currentUser.email.split('@')[0]);
  const [phone, setPhone] = useState('');
  const [assetHolder, setAssetHolder] = useState(currentUser.name);
  const [location, setLocation] = useState('');
  const [items, setItems] = useState<Record<string, ItemDraft>>({});
  const [symptom, setSymptom] = useState('');
  const [error, setError] = useState('');

  const setItem = (type: string, patch: Partial<ItemDraft>) =>
    setItems(prev => ({ ...prev, [type]: { ...(prev[type] ?? { checked: false, assetNo: '', detail: '' }), ...patch } }));

  // Who the form goes to after it is sent, in order
  const path = (workflow?.steps ?? []).slice(1).map(step => {
    const person = step.approverType === 'department' ? undefined : resolveStepApprover(step, currentUser.id, employees);
    const who =
      step.approverType === 'department'
        ? `ทีม ${departments.find(d => d.id === step.approverDepartmentId)?.nameEn ?? ''}`
        : person?.name;
    return { step, who };
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!workflow) return setError('แบบฟอร์มนี้ยังไม่มีขั้นตอนอนุมัติ กรุณาติดต่อผู้ดูแลระบบ');
    const chosen = IT_ITEM_TYPES.filter(type => items[type]?.checked).map(type => ({
      type,
      assetNo: items[type].assetNo.trim(),
      detail: items[type].detail.trim(),
    }));
    if (chosen.length === 0) return setError('กรุณาเลือกรายการอย่างน้อย 1 รายการ');
    if (!symptom.trim()) return setError('กรุณากรอก "สาเหตุ / อาการ"');

    createNewRequest({
      category: form.menuName,
      departmentId: form.ownerDepartmentId,
      workflowId: workflow.id,
      itilCategory: 'service_request',
      formId: form.id,
      itRequest: {
        userLogin: userLogin.trim(),
        phone: phone.trim(),
        assetHolder: assetHolder.trim(),
        location: location.trim(),
        items: chosen,
        symptom: symptom.trim(),
      },
    });
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
      aria-labelledby="it-request-title"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[94vh]"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="it-request-title" className="text-base font-bold text-slate-900">
              {form.menuName}
            </h2>
            <p className="text-xs text-slate-500">1. ส่วนของผู้ออกใบสั่งงาน</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className={labelClass}>ชื่อผู้ร้องขอ</span>
              <p className={lockedClass}>
                <Lock className="w-3 h-3 shrink-0" />
                <span className="truncate">{currentUser.name}</span>
              </p>
            </div>
            <div>
              <span className={labelClass}>ฝ่าย / แผนก</span>
              <p className={lockedClass}>
                <Lock className="w-3 h-3 shrink-0" />
                <span className="truncate">{dept?.nameEn ?? currentUser.departmentName}</span>
              </p>
            </div>
            <div>
              <label htmlFor="itr-user" className={labelClass}>
                User
              </label>
              <input id="itr-user" value={userLogin} onChange={e => setUserLogin(e.target.value)} className={inputClass} />
            </div>
            <div>
              <span className={labelClass}>วันที่ออกใบสั่งงาน</span>
              <p className={lockedClass}>
                <Lock className="w-3 h-3 shrink-0" />
                {thaiDate(new Date())}
              </p>
            </div>
            <div>
              <label htmlFor="itr-phone" className={labelClass}>
                เบอร์โทร
              </label>
              <input id="itr-phone" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="itr-location" className={labelClass}>
                สถานที่
              </label>
              <input
                id="itr-location"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="เช่น ชั้น 5 ฝั่ง A"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="itr-holder" className={labelClass}>
                ผู้ครอบครองทรัพย์สิน
              </label>
              <input
                id="itr-holder"
                value={assetHolder}
                onChange={e => setAssetHolder(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Checklist: tick what the job concerns, with its asset number and the need */}
          <fieldset>
            <legend className={labelClass}>รายการ {required}</legend>
            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
              {IT_ITEM_TYPES.map((type, idx) => {
                const item = items[type];
                return (
                  <div key={type} className="p-2.5">
                    <label className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item?.checked ?? false}
                        onChange={e => setItem(type, { checked: e.target.checked })}
                        className="w-4 h-4 accent-red-600"
                      />
                      {type}
                    </label>
                    {item?.checked && (
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 pl-6">
                        <input
                          aria-label={`ทะเบียนฯ ของ ${type}`}
                          value={item.assetNo}
                          onChange={e => setItem(type, { assetNo: e.target.value })}
                          placeholder="ทะเบียนฯ"
                          className={inputClass}
                        />
                        <input
                          aria-label={`รายละเอียดของ ${type}`}
                          value={item.detail}
                          onChange={e => setItem(type, { detail: e.target.value })}
                          placeholder={idx === IT_ITEM_TYPES.length - 1 ? 'ระบุ' : 'รายละเอียด / ระบุความต้องการ'}
                          className={`${inputClass} sm:col-span-2`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label htmlFor="itr-symptom" className={labelClass}>
              สาเหตุ / อาการ {required}
            </label>
            <textarea
              id="itr-symptom"
              rows={4}
              value={symptom}
              onChange={e => setSymptom(e.target.value)}
              className={`${inputClass} leading-relaxed`}
            />
          </div>

          <div>
            <p className={labelClass}>ขั้นตอนหลังส่ง</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {path.map(({ step, who }, index) => (
                <React.Fragment key={step.id}>
                  {index > 0 && <ArrowRight className="w-3.5 h-3.5 text-slate-300" />}
                  <span
                    className={`px-2 py-1 rounded-lg border ${
                      who ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-amber-300 bg-amber-50 text-amber-800'
                    }`}
                  >
                    {step.title}: <strong>{who ?? 'ยังไม่ได้กำหนด'}</strong>
                  </span>
                </React.Fragment>
              ))}
            </div>
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
            ส่งใบสั่งงาน
          </button>
        </div>
      </form>
    </div>
  );
};
