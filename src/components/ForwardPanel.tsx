import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { DepartmentId, DocumentRequest } from '../types';
import { activeEmployees } from '../utils/approvers';
import { AlertTriangle, ArrowRight, Forward, UserRound } from 'lucide-react';

/**
 * Hand the current step of a Ticket Request to someone else: when the work is not yours, or
 * to give it to a teammate (Assign). The step keeps its place in the order; who it waits on
 * changes, and the hand-over with its reason is kept in the approval history.
 */
export const ForwardPanel: React.FC<{ request: DocumentRequest; onCancel: () => void }> = ({ request, onCancel }) => {
  const { employees, departments, currentUser, forwardRequest } = useApp();
  const step = request.steps[request.currentStepIndex];

  const [deptId, setDeptId] = useState<DepartmentId>(currentUser.departmentId);
  const [employeeId, setEmployeeId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  // Anyone active except the person the step already waits on
  const candidates = useMemo(
    () =>
      activeEmployees(employees).filter(
        e => e.email.toLowerCase() !== (step?.approverEmail ?? '').toLowerCase() && e.id !== currentUser.id
      ),
    [employees, step?.approverEmail, currentUser.id]
  );
  const inDept = candidates.filter(e => e.departmentId === deptId);
  const chosen = candidates.find(e => e.id === employeeId);
  // Teammates first: handing work to someone in your own team is the common case
  const teammates = candidates.filter(e => e.departmentId === currentUser.departmentId).slice(0, 6);

  const submit = () => {
    if (!chosen) return setError('กรุณาเลือกคนที่จะส่งต่อให้');
    if (!reason.trim()) return setError('กรุณาเขียนเหตุผล หรือสิ่งที่ฝากถึงผู้รับ');
    forwardRequest(request.id, chosen.id, reason.trim());
    onCancel();
  };

  const inputClass =
    'w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500';

  if (!step) return null;

  return (
    <div className="p-4 rounded-xl border-2 border-indigo-200 bg-indigo-50/40 space-y-3 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-indigo-950 flex items-center gap-1.5">
            <Forward className="w-4 h-4 text-indigo-600" />
            ส่งต่องาน / Assign
          </p>
          <p className="text-indigo-900/80 mt-0.5">
            ไม่ใช่งานของคุณ หรืออยากมอบให้คนในทีมทำ ส่งต่อได้ คำร้องจะไปรอที่ผู้รับแทนคุณ
          </p>
        </div>
      </div>

      {teammates.length > 0 && (
        <div>
          <p className="font-semibold text-slate-700 mb-1">คนในทีมของคุณ</p>
          <div className="flex flex-wrap gap-1.5">
            {teammates.map(e => (
              <button
                key={e.id}
                type="button"
                onClick={() => {
                  setDeptId(e.departmentId);
                  setEmployeeId(e.id);
                  setError('');
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border cursor-pointer ${
                  employeeId === e.id
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white border-slate-300 text-slate-700 hover:border-indigo-400'
                }`}
              >
                <UserRound className="w-3 h-3" />
                {e.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label htmlFor="fw-dept" className="block font-semibold text-slate-700 mb-1">
            หน่วยงาน
          </label>
          <select
            id="fw-dept"
            value={deptId}
            onChange={e => {
              setDeptId(e.target.value as DepartmentId);
              setEmployeeId('');
            }}
            className={inputClass}
          >
            {departments.map(d => (
              <option key={d.id} value={d.id}>
                {d.nameEn}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="fw-person" className="block font-semibold text-slate-700 mb-1">
            ส่งต่อให้
          </label>
          <select
            id="fw-person"
            value={employeeId}
            onChange={e => {
              setEmployeeId(e.target.value);
              setError('');
            }}
            className={inputClass}
          >
            <option value="">{inDept.length ? '— เลือกพนักงาน —' : '— ไม่มีพนักงานในหน่วยงานนี้ —'}</option>
            {inDept.map(e => (
              <option key={e.id} value={e.id}>
                {e.name} — {e.position}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="fw-reason" className="block font-semibold text-slate-700 mb-1">
          เหตุผล / สิ่งที่ฝากถึงผู้รับ <span className="text-rose-600">*</span>
        </label>
        <textarea
          id="fw-reason"
          rows={2}
          value={reason}
          onChange={e => {
            setReason(e.target.value);
            setError('');
          }}
          placeholder="เช่น งานนี้เป็นของทีม Network / ฝากน้องดำเนินการต่อ ติดต่อผู้ยื่นได้ที่เบอร์ใน Ticket"
          className={inputClass}
        />
      </div>

      {/* What will happen, in one line */}
      <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-lg bg-white border border-indigo-100 text-slate-700">
        <span>ขั้น "{step.stepTitle}"</span>
        <span className="font-semibold">{step.approverName}</span>
        <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
        <span className={chosen ? 'font-semibold text-indigo-700' : 'text-slate-400'}>
          {chosen ? `${chosen.name} (${chosen.position})` : 'ยังไม่ได้เลือก'}
        </span>
      </div>

      {error && (
        <p role="alert" className="flex items-center gap-1.5 font-semibold text-rose-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 cursor-pointer"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={submit}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs cursor-pointer"
        >
          <Forward className="w-4 h-4" />
          ส่งต่องาน
        </button>
      </div>
    </div>
  );
};
