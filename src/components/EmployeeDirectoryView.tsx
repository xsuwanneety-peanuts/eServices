import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { DepartmentId, UserPersona } from '../types';
import { ROLE_LABELS, wouldCreateCycle } from '../utils/approvers';
import { Contact, Pencil, Plus, Search, SearchX, Users, X, AlertTriangle } from 'lucide-react';

type Role = UserPersona['role'];
const ROLES: Role[] = ['employee', 'approver', 'manager', 'director', 'admin'];

const ROLE_BADGE: Record<Role, string> = {
  employee: 'bg-slate-100 text-slate-600',
  approver: 'bg-blue-50 text-blue-700',
  manager: 'bg-amber-50 text-amber-800',
  director: 'bg-red-50 text-red-700',
  admin: 'bg-red-50 text-red-700',
};

export const EmployeeDirectoryView: React.FC = () => {
  const { employees, updateEmployee, departments, showToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<DepartmentId | 'all'>('all');
  const [missingOnly, setMissingOnly] = useState(false);
  // undefined: form closed, null: adding a new employee, otherwise the employee being edited
  const [editing, setEditing] = useState<UserPersona | null | undefined>(undefined);

  const byId = (id?: string) => (id ? employees.find(e => e.id === id) : undefined);
  const missingCount = employees.filter(e => !e.reportsToId).length;

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return employees.filter(e => {
      if (deptFilter !== 'all' && e.departmentId !== deptFilter) return false;
      if (missingOnly && e.reportsToId) return false;
      if (!q) return true;
      return [e.name, e.email, e.position].some(v => v.toLowerCase().includes(q));
    });
  }, [employees, searchQuery, deptFilter, missingOnly]);

  const setReportsTo = (employee: UserPersona, managerId: string) => {
    updateEmployee(employee.id, { reportsToId: managerId || undefined });
    const manager = byId(managerId);
    showToast(
      manager
        ? `ตั้งให้ ${employee.name} รายงานต่อ ${manager.name} แล้ว — ใช้กับคำร้องที่ยื่นหลังจากนี้`
        : `ล้าง Report to ของ ${employee.name} แล้ว`,
      'success'
    );
  };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-700 text-white flex items-center justify-center shadow-xs">
              <Contact className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Employee Directory</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ข้อมูลพนักงานและสายการบังคับบัญชา (Report to) — ระบบใช้ข้อมูลนี้กำหนดผู้รับอีเมลขออนุมัติ
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          เพิ่มพนักงาน
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อ อีเมล หรือตำแหน่ง..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-red-500"
          />
        </div>
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value as DepartmentId | 'all')}
          aria-label="กรองตามหน่วยงาน"
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-hidden focus:border-red-500"
        >
          <option value="all">ทุกหน่วยงาน</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>
              {d.nameEn}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={missingOnly}
            onChange={e => setMissingOnly(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-red-600 cursor-pointer"
          />
          ยังไม่ได้ตั้ง Report to ({missingCount})
        </label>
        <span className="lg:ml-auto text-xs text-slate-500">
          พนักงาน <span className="font-bold text-red-700">{filtered.length}</span> จาก {employees.length} คน
        </span>
      </div>

      {/* Directory table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[880px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">พนักงาน</th>
                <th className="py-3 px-3">ตำแหน่ง / บทบาท</th>
                <th className="py-3 px-3">หน่วยงาน</th>
                <th className="py-3 px-3 min-w-[220px]">Report to</th>
                <th className="py-3 px-3 text-center">ลูกทีม</th>
                <th className="py-3 px-3 w-12">
                  <span className="sr-only">แก้ไข</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(employee => {
                const dept = departments.find(d => d.id === employee.departmentId);
                const directReports = employees.filter(e => e.reportsToId === employee.id).length;
                const managerOptions = employees.filter(
                  e => e.id !== employee.id && !wouldCreateCycle(employee.id, e.id, employees)
                );
                return (
                  <tr key={employee.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={employee.avatar}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">{employee.name}</p>
                          <p className="text-slate-400 font-mono text-[11px] truncate">{employee.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <p className="text-slate-800">{employee.position}</p>
                      <span
                        className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${ROLE_BADGE[employee.role]}`}
                      >
                        {ROLE_LABELS[employee.role]}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      {dept?.nameEn}
                      <span className="block text-[11px] text-slate-400">{dept?.nameTh}</span>
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={employee.reportsToId ?? ''}
                        onChange={e => setReportsTo(employee, e.target.value)}
                        aria-label={`Report to ของ ${employee.name}`}
                        className={`w-full px-2.5 py-1.5 border rounded-lg bg-white text-slate-800 focus:outline-hidden focus:border-red-500 ${
                          employee.reportsToId ? 'border-slate-300' : 'border-amber-300 bg-amber-50/50'
                        }`}
                      >
                        <option value="">— ยังไม่ได้ตั้ง —</option>
                        {managerOptions.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} — {m.position}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {directReports > 0 ? (
                        <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {directReports}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => setEditing(employee)}
                        title={`แก้ไขข้อมูล ${employee.name}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-12 px-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
              <SearchX className="w-6 h-6" />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-700">ไม่พบพนักงานที่ตรงกับเงื่อนไข</p>
          </div>
        )}
      </div>

      {editing !== undefined && <EmployeeFormModal employee={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Add / edit form
// ---------------------------------------------------------------------------

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EmployeeFormModal: React.FC<{ employee: UserPersona | null; onClose: () => void }> = ({
  employee,
  onClose,
}) => {
  const { employees, departments, addEmployee, updateEmployee, showToast } = useApp();
  const isNew = employee === null;

  const [name, setName] = useState(employee?.name ?? '');
  const [email, setEmail] = useState(employee?.email ?? '');
  const [position, setPosition] = useState(employee?.position ?? '');
  const [departmentId, setDepartmentId] = useState<DepartmentId>(employee?.departmentId ?? 'it');
  const [role, setRole] = useState<Role>(employee?.role ?? 'employee');
  const [reportsToId, setReportsToId] = useState(employee?.reportsToId ?? '');
  const [error, setError] = useState('');

  const managerOptions = employees.filter(
    e => e.id !== employee?.id && (!employee || !wouldCreateCycle(employee.id, e.id, employees))
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!name.trim() || !trimmedEmail || !position.trim()) {
      setError('กรุณากรอกชื่อ อีเมล และตำแหน่งให้ครบ');
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError('รูปแบบอีเมลไม่ถูกต้อง');
      return;
    }
    if (employees.some(e => e.id !== employee?.id && e.email.toLowerCase() === trimmedEmail)) {
      setError('อีเมลนี้มีพนักงานคนอื่นใช้อยู่แล้ว');
      return;
    }

    const data = {
      name: name.trim(),
      email: trimmedEmail,
      position: position.trim(),
      departmentId,
      role,
      reportsToId: reportsToId || undefined,
    };
    if (isNew) {
      addEmployee(data);
      showToast(`เพิ่ม ${data.name} ใน Employee Directory แล้ว`, 'success');
    } else {
      updateEmployee(employee.id, data);
      showToast(`บันทึกข้อมูล ${data.name} แล้ว`, 'success');
    }
    onClose();
  };

  const inputClass =
    'w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-sm text-slate-800 focus:outline-hidden focus:border-red-500';

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="employee-form-title"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 id="employee-form-title" className="text-base font-bold text-slate-900">
            {isNew ? 'เพิ่มพนักงาน' : 'แก้ไขข้อมูลพนักงาน'}
          </h2>
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
          <div>
            <label htmlFor="emp-name" className="block font-semibold text-slate-700 mb-1">
              ชื่อ-นามสกุล
            </label>
            <input id="emp-name" value={name} onChange={e => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="emp-email" className="block font-semibold text-slate-700 mb-1">
              อีเมล (ใช้ส่งอีเมลขออนุมัติ)
            </label>
            <input
              id="emp-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="emp-position" className="block font-semibold text-slate-700 mb-1">
                ตำแหน่ง
              </label>
              <input
                id="emp-position"
                value={position}
                onChange={e => setPosition(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="emp-dept" className="block font-semibold text-slate-700 mb-1">
                หน่วยงาน
              </label>
              <select
                id="emp-dept"
                value={departmentId}
                onChange={e => setDepartmentId(e.target.value as DepartmentId)}
                className={inputClass}
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.nameEn}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="emp-role" className="block font-semibold text-slate-700 mb-1">
              บทบาทในระบบ
            </label>
            <select id="emp-role" value={role} onChange={e => setRole(e.target.value as Role)} className={inputClass}>
              {ROLES.map(r => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              ผู้อำนวยการและผู้ดูแลระบบเห็นคำร้องทั้งหมดและอนุมัติแทนได้ทุกขั้นตอน
            </p>
          </div>
          <div>
            <label htmlFor="emp-reports-to" className="block font-semibold text-slate-700 mb-1">
              Report to (ผู้บังคับบัญชา)
            </label>
            <select
              id="emp-reports-to"
              value={reportsToId}
              onChange={e => setReportsToId(e.target.value)}
              className={inputClass}
            >
              <option value="">— ยังไม่ได้ตั้ง —</option>
              {managerOptions.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.position}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              ขั้นตอน "ผู้บังคับบัญชาของผู้ยื่น" ใน Flow อนุมัติจะส่งอีเมลถึงคนนี้
            </p>
          </div>

          {error && (
            <p role="alert" className="flex items-center gap-1.5 text-rose-700 font-semibold">
              <AlertTriangle className="w-4 h-4" />
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
            className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs cursor-pointer"
          >
            {isNew ? 'เพิ่มพนักงาน' : 'บันทึก'}
          </button>
        </div>
      </form>
    </div>
  );
};
