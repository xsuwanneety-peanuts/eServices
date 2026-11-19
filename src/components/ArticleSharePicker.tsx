import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DepartmentId } from '../types';
import { activeEmployees } from '../utils/approvers';
import { UserPlus, UserRound, X } from 'lucide-react';

/**
 * People from other departments who may also read a department-only article, picked one by
 * one. Members of the article's own department already read it, so they are not offered.
 */
export const ArticleSharePicker: React.FC<{
  /** Sign-in emails, lower case. */
  emails: string[];
  onChange: (emails: string[]) => void;
  /** The department the article is limited to. */
  ownDepartmentId: DepartmentId;
}> = ({ emails, onChange, ownDepartmentId }) => {
  const { employees, departments } = useApp();
  const otherDepts = departments.filter(d => d.id !== ownDepartmentId);
  const [deptId, setDeptId] = useState<DepartmentId | ''>(otherDepts[0]?.id ?? '');
  const [employeeId, setEmployeeId] = useState('');

  const byEmail = (email: string) => employees.find(e => e.email.toLowerCase() === email);
  const options = activeEmployees(employees).filter(
    e => e.departmentId === deptId && !emails.includes(e.email.toLowerCase())
  );

  const add = () => {
    const person = employees.find(e => e.id === employeeId);
    if (!person) return;
    onChange([...emails, person.email.toLowerCase()]);
    setEmployeeId('');
  };

  const inputClass =
    'w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-sm text-slate-800 focus:outline-hidden focus:border-red-500';

  return (
    <div className="mt-2 p-3 rounded-lg border border-amber-200 bg-amber-50/50 space-y-2">
      <p className="font-semibold text-slate-700 flex items-center gap-1.5">
        <UserPlus className="w-3.5 h-3.5 text-amber-700" />
        เพิ่มคนจากหน่วยงานอื่นที่อ่านได้ (ไม่บังคับ)
      </p>

      {emails.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {emails.map(email => {
            const person = byEmail(email);
            const dept = departments.find(d => d.id === person?.departmentId);
            return (
              <li
                key={email}
                className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-white border border-amber-300 text-slate-700"
              >
                <UserRound className="w-3 h-3 text-amber-700" />
                <span className="font-semibold">{person?.name ?? email}</span>
                {dept && <span className="text-[11px] text-slate-400">· {dept.nameEn}</span>}
                {person?.disabled && <span className="text-[11px] text-rose-600">· ปิดการใช้งาน</span>}
                <button
                  type="button"
                  onClick={() => onChange(emails.filter(e => e !== email))}
                  aria-label={`เอา ${person?.name ?? email} ออก`}
                  className="p-0.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[11px] text-slate-500">ยังไม่ได้เพิ่มใคร มีแค่คนในหน่วยงาน ผู้เขียน และผู้ดูแลระบบที่อ่านได้</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
        <select
          value={deptId}
          onChange={e => {
            setDeptId(e.target.value as DepartmentId);
            setEmployeeId('');
          }}
          aria-label="หน่วยงานของคนที่จะเพิ่ม"
          className={inputClass}
        >
          {otherDepts.map(d => (
            <option key={d.id} value={d.id}>
              {d.nameEn}
            </option>
          ))}
        </select>
        <select
          value={employeeId}
          onChange={e => setEmployeeId(e.target.value)}
          aria-label="พนักงานที่จะเพิ่ม"
          className={inputClass}
        >
          <option value="">{options.length ? '— เลือกพนักงาน —' : '— ไม่มีพนักงานให้เพิ่ม —'}</option>
          {options.map(e => (
            <option key={e.id} value={e.id}>
              {e.name} — {e.position}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={add}
          disabled={!employeeId}
          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-semibold cursor-pointer disabled:cursor-not-allowed"
        >
          <UserPlus className="w-3.5 h-3.5" />
          เพิ่ม
        </button>
      </div>
    </div>
  );
};
