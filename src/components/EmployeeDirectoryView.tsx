import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { DepartmentId, UserPersona } from '../types';
import { ROLE_LABELS, wouldCreateCycle } from '../utils/approvers';
import { ADMIN_EMAILS } from '../lib/firebase';
import { isOfferedForm } from '../utils/forms';
import { AccountSetup, MIN_PASSWORD_LENGTH, createLoginAccount } from '../utils/loginAccounts';
import { askConfirm } from './ConfirmDialog';
import {
  Contact,
  KeyRound,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Search,
  SearchX,
  Trash2,
  Users,
  X,
  AlertTriangle,
} from 'lucide-react';

type Role = UserPersona['role'];
const ROLES: Role[] = ['employee', 'approver', 'manager', 'director'];
const isAdminAccount = (email: string) => ADMIN_EMAILS.includes(email.toLowerCase());

const ROLE_BADGE: Record<Role, string> = {
  employee: 'bg-slate-100 text-slate-600',
  approver: 'bg-blue-50 text-blue-700',
  manager: 'bg-amber-50 text-amber-800',
  director: 'bg-red-50 text-red-700',
  admin: 'bg-red-50 text-red-700',
};

export const EmployeeDirectoryView: React.FC = () => {
  const { employees, updateEmployee, deleteEmployee, departments, currentUser, workflows, requests, showToast } =
    useApp();

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

  // The signed-in person and admin accounts cannot be switched off or removed: that would lock
  // the system's own administrators out
  const isProtected = (employee: UserPersona) => employee.id === currentUser.id || isAdminAccount(employee.email);
  const protectedReason = 'บัญชีผู้ดูแลระบบและบัญชีของตัวเอง ปิดการใช้งานหรือลบไม่ได้';

  // Requests still in progress that are waiting on this person now, or will reach them later.
  // Their steps were filled in at submission, so they keep pointing at this person.
  const openRequestsFor = (employee: UserPersona) => {
    const email = employee.email.toLowerCase();
    const open = requests.filter(r => r.status === 'in_review' || r.status === 'pending' || r.status === 'returned');
    const onStep = (r: (typeof open)[number], status: 'pending' | 'waiting' | 'rejected') =>
      r.steps.some(s => s.status === status && s.approverEmail.toLowerCase() === email);
    return {
      now: open.filter(r => r.status !== 'returned' && onStep(r, 'pending')).length,
      // A request this person sent back comes back to them once it is resubmitted
      later: open.filter(r => onStep(r, 'waiting') || (r.status === 'returned' && onStep(r, 'rejected'))).length,
    };
  };

  const openRequestLines = (employee: UserPersona) => {
    const { now, later } = openRequestsFor(employee);
    return [
      now > 0 && `• คำร้อง ${now} รายการกำลังรอคนนี้อนุมัติอยู่`,
      later > 0 && `• คำร้อง ${later} รายการจะถึงคิวคนนี้ในขั้นถัดไป`,
      (now > 0 || later > 0) && '  คำร้องเหล่านี้จะค้าง ผู้ดูแลระบบต้องอนุมัติแทน',
    ].filter(Boolean);
  };

  const toggleActive = async (employee: UserPersona) => {
    if (employee.disabled) {
      updateEmployee(employee.id, { disabled: undefined });
      showToast(`เปิดใช้งาน ${employee.name} แล้ว`, 'success');
      return;
    }
    const effects = openRequestLines(employee);
    const ok = await askConfirm({
      title: `ปิดการใช้งาน "${employee.name}"?`,
      message: `ชื่อยังอยู่ใน Employee Directory และเอกสารทั้งหมดยังอยู่ แต่บัญชีนี้จะเข้าใช้งานระบบไม่ได้จนกว่าจะเปิดใช้งานอีกครั้ง และคำร้องใหม่จะไม่ส่งถึงคนนี้${
        effects.length ? `\n\n${effects.join('\n')}` : ''
      }`,
      confirmLabel: 'ปิดการใช้งาน',
      danger: true,
    });
    if (!ok) return;
    updateEmployee(employee.id, { disabled: true });
    showToast(`ปิดการใช้งาน ${employee.name} แล้ว`, 'info');
  };

  const removeEmployee = async (employee: UserPersona) => {
    const reports = employees.filter(e => e.reportsToId === employee.id).length;
    const steps = workflows.reduce(
      (count, w) => count + w.steps.filter(step => step.approverEmployeeId === employee.id).length,
      0
    );
    const effects = [
      ...openRequestLines(employee),
      reports > 0 && `• ลูกทีม ${reports} คนจะไม่มี Report to ต้องตั้งใหม่`,
      steps > 0 && `• ขั้นตอนอนุมัติ ${steps} ขั้นที่ระบุคนนี้จะไม่มีผู้อนุมัติ ต้องตั้งใหม่ที่หน้า Flow อนุมัติ`,
    ].filter(Boolean);
    const ok = await askConfirm({
      title: `ลบ "${employee.name}" ออกจากระบบถาวร?`,
      message: `รายชื่อจะหายจาก Employee Directory และบัญชีนี้จะเข้าใช้งานไม่ได้ เอกสารที่เคยยื่นหรืออนุมัติไว้ยังอยู่ครบ${
        effects.length ? `\n\n${effects.join('\n')}` : ''
      }\n\nการลบนี้ย้อนกลับไม่ได้`,
      confirmLabel: 'ลบถาวร',
      danger: true,
    });
    if (!ok) return;
    deleteEmployee(employee.id);
    showToast(`ลบ ${employee.name} ออกจากระบบแล้ว`, 'info');
  };

  const statusButton = (employee: UserPersona) => (
    <button
      type="button"
      onClick={() => toggleActive(employee)}
      disabled={isProtected(employee)}
      aria-pressed={!employee.disabled}
      title={
        isProtected(employee)
          ? protectedReason
          : employee.disabled
            ? 'กดเพื่อเปิดใช้งานบัญชีนี้'
            : 'กดเพื่อปิดการใช้งานบัญชีนี้'
      }
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer disabled:cursor-not-allowed ${
        employee.disabled
          ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
          : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:hover:bg-emerald-600'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${employee.disabled ? 'bg-slate-400' : 'bg-white'}`} />
      {employee.disabled ? 'ปิดการใช้งาน' : 'เปิดใช้งาน'}
    </button>
  );

  const deleteButton = (employee: UserPersona, padding: string) => (
    <button
      type="button"
      onClick={() => removeEmployee(employee)}
      disabled={isProtected(employee)}
      title={isProtected(employee) ? protectedReason : `ลบถาวร ${employee.name}`}
      aria-label={`ลบถาวร ${employee.name}`}
      className={`${padding} rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-transparent`}
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );

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
        </div>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer whitespace-nowrap self-start md:self-auto"
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
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[1020px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">พนักงาน</th>
                <th className="py-3 px-3">ตำแหน่ง / บทบาท</th>
                <th className="py-3 px-3">หน่วยงาน</th>
                <th className="py-3 px-3 min-w-[220px]">Report to</th>
                <th className="py-3 px-3 text-center">ลูกทีม</th>
                <th className="py-3 px-3">สถานะ</th>
                <th className="py-3 px-3 w-20">
                  <span className="sr-only">แก้ไข / ลบ</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(employee => {
                const dept = departments.find(d => d.id === employee.departmentId);
                const directReports = employees.filter(e => e.reportsToId === employee.id).length;
                const managerOptions = employees.filter(
                  e =>
                    e.id !== employee.id &&
                    (!e.disabled || e.id === employee.reportsToId) &&
                    !wouldCreateCycle(employee.id, e.id, employees)
                );
                return (
                  <tr key={employee.id} className={employee.disabled ? 'bg-slate-50' : 'hover:bg-slate-50/60'}>
                    <td className="py-3 px-4">
                      <div className={`flex items-center gap-3 ${employee.disabled ? 'opacity-50' : ''}`}>
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
                      {isAdminAccount(employee.email) && (
                        <span
                          title="บัญชีนี้เข้าเมนูการจัดการระบบได้"
                          className="inline-block mt-1 ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-white"
                        >
                          ผู้ดูแลระบบ
                        </span>
                      )}
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
                    <td className="py-3 px-3">{statusButton(employee)}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => setEditing(employee)}
                          title={`แก้ไขข้อมูล ${employee.name}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {deleteButton(employee, 'p-1.5')}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Below desktop width: one card per employee, with Report to and edit in view */}
        <div className="lg:hidden divide-y divide-slate-100">
          {filtered.map(employee => {
            const dept = departments.find(d => d.id === employee.departmentId);
            const directReports = employees.filter(e => e.reportsToId === employee.id).length;
            const managerOptions = employees.filter(
              e =>
                e.id !== employee.id &&
                (!e.disabled || e.id === employee.reportsToId) &&
                !wouldCreateCycle(employee.id, e.id, employees)
            );
            return (
              <div key={employee.id} className="p-4 space-y-3 text-xs">
                <div className="flex items-start gap-3">
                  <img
                    src={employee.avatar}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                  />
                  <div className={`min-w-0 flex-1 ${employee.disabled ? 'opacity-50' : ''}`}>
                    <p className="font-bold text-slate-900 text-sm truncate">{employee.name}</p>
                    <p className="text-slate-400 font-mono text-[11px] truncate">{employee.email}</p>
                    <p className="text-slate-700 mt-1">{employee.position}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ROLE_BADGE[employee.role]}`}>
                        {ROLE_LABELS[employee.role]}
                      </span>
                      {isAdminAccount(employee.email) && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-white">
                          ผู้ดูแลระบบ
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {dept?.nameEn}
                      {directReports > 0 && ` • ลูกทีม ${directReports} คน`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing(employee)}
                    title={`แก้ไขข้อมูล ${employee.name}`}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 cursor-pointer shrink-0"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {deleteButton(employee, 'p-2 shrink-0')}
                </div>
                <div>{statusButton(employee)}</div>
                <div>
                  <label
                    htmlFor={`reports-to-${employee.id}`}
                    className="block text-[11px] font-semibold text-slate-500 mb-1"
                  >
                    Report to
                  </label>
                  <select
                    id={`reports-to-${employee.id}`}
                    value={employee.reportsToId ?? ''}
                    onChange={e => setReportsTo(employee, e.target.value)}
                    className={`w-full px-2.5 py-2 border rounded-lg bg-white text-slate-800 focus:outline-hidden focus:border-red-500 ${
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
                </div>
              </div>
            );
          })}
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
  const { employees, departments, menuPermissions, addEmployee, updateEmployee, showToast } = useApp();
  const isNew = employee === null;

  const [name, setName] = useState(employee?.name ?? '');
  const [email, setEmail] = useState(employee?.email ?? '');
  const [position, setPosition] = useState(employee?.position ?? '');
  const [departmentId, setDepartmentId] = useState<DepartmentId>(employee?.departmentId ?? 'it');
  // The retired 'admin' role is the same as 'director' (ผู้บริหาร)
  const [role, setRole] = useState<Role>(employee?.role === 'admin' ? 'director' : employee?.role ?? 'employee');
  const [reportsToId, setReportsToId] = useState(employee?.reportsToId ?? '');
  // Sign-in account: made here, so the admin does not also add the person in Firebase
  const [accountSetup, setAccountSetup] = useState<AccountSetup>('reset_link');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const emailChanged = !isNew && email.trim().toLowerCase() !== employee.email.toLowerCase();
  const allowedForms = menuPermissions.filter(f => isOfferedForm(f) && f.allowedDepartments[departmentId]);

  const managerOptions = employees.filter(
    e =>
      e.id !== employee?.id &&
      (!e.disabled || e.id === employee?.reportsToId) &&
      (!employee || !wouldCreateCycle(employee.id, e.id, employees))
  );

  // Existing employee: make their account if it is missing, or send a new set-password link
  const handleSendLink = async () => {
    if (!employee || busy) return;
    setBusy(true);
    setError('');
    const result = await createLoginAccount(employee.email.toLowerCase());
    setBusy(false);
    if (!result.ok) return setError(result.message);
    showToast(
      result.created
        ? `สร้างบัญชีและส่งลิงก์ตั้งรหัสผ่านไปที่ ${employee.email} แล้ว`
        : `ส่งลิงก์ตั้งรหัสผ่านไปที่ ${employee.email} แล้ว`,
      'success'
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
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
    if (isNew && accountSetup === 'set_password' && password.length < MIN_PASSWORD_LENGTH) {
      setError(`รหัสผ่านเริ่มต้นต้องยาวอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`);
      return;
    }

    // The account comes first: if it cannot be made, nothing is added and the admin can retry
    let accountNote = '';
    if (isNew && accountSetup !== 'none') {
      setBusy(true);
      setError('');
      const result = await createLoginAccount(
        trimmedEmail,
        accountSetup === 'set_password' ? password : undefined
      );
      setBusy(false);
      if (!result.ok) {
        setError(`${result.message} — ยังไม่ได้เพิ่มพนักงาน`);
        return;
      }
      accountNote = result.created
        ? result.linkSent
          ? ' สร้างบัญชีและส่งลิงก์ตั้งรหัสผ่านทางอีเมลแล้ว'
          : ' สร้างบัญชีด้วยรหัสผ่านเริ่มต้นแล้ว'
        : result.linkSent
          ? ' อีเมลนี้มีบัญชีอยู่แล้ว ส่งลิงก์ตั้งรหัสผ่านให้แล้ว'
          : ' อีเมลนี้มีบัญชีอยู่แล้ว รหัสผ่านเดิมไม่เปลี่ยน';
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
      showToast(`เพิ่ม ${data.name} ใน Employee Directory แล้ว${accountNote}`, 'success');
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
              อีเมล (ใช้เข้าสู่ระบบ และรับอีเมลขออนุมัติ)
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
          {/* The department decides which forms the employee can use (set on the access page) */}
          <p className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
            <span className="font-semibold text-slate-700">แบบฟอร์มที่ใช้ได้ตามสิทธิ์ของหน่วยงานนี้: </span>
            {role === 'director'
              ? 'ทุกแบบฟอร์ม (ผู้บริหาร)'
              : allowedForms.length > 0
                ? allowedForms.map(f => f.menuName).join(', ')
                : 'ยังไม่มี — ตั้งได้ที่หน้าสิทธิ์เข้าถึง'}
          </p>
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
              ผู้บริหารเห็นคำร้องทั้งหมดและอนุมัติแทนได้ทุกขั้นตอน ส่วนสิทธิ์เข้าเมนูการจัดการระบบ (ผู้ดูแลระบบ)
              กำหนดจากบัญชีเข้าสู่ระบบ ไม่ได้มาจากบทบาทนี้
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

          {/* Sign-in account, made in Firebase from here */}
          <fieldset className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
            <legend className="px-1 font-semibold text-slate-700 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-red-600" />
              บัญชีเข้าสู่ระบบ
            </legend>
            {isNew ? (
              <>
                {(
                  [
                    ['reset_link', 'ส่งลิงก์ให้พนักงานตั้งรหัสผ่านเองทางอีเมล', 'อีเมลต้องรับเมลได้จริง'],
                    ['set_password', 'ตั้งรหัสผ่านเริ่มต้นให้', 'แจ้งรหัสให้พนักงานเอง เหมาะกับบัญชีทดสอบ'],
                    ['none', 'ไม่สร้างบัญชีตอนนี้', 'มีบัญชีอยู่แล้ว หรือจะสร้างภายหลัง'],
                  ] as [AccountSetup, string, string][]
                ).map(([value, label, hint]) => (
                  <label key={value} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="emp-account"
                      value={value}
                      checked={accountSetup === value}
                      onChange={() => setAccountSetup(value)}
                      className="mt-0.5 w-3.5 h-3.5 text-red-600 cursor-pointer"
                    />
                    <span>
                      <span className="text-slate-800">{label}</span>
                      <span className="block text-[11px] text-slate-400">{hint}</span>
                    </span>
                  </label>
                ))}
                {accountSetup === 'set_password' && (
                  <div className="pl-5">
                    <label htmlFor="emp-password" className="sr-only">
                      รหัสผ่านเริ่มต้น
                    </label>
                    <input
                      id="emp-password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={`รหัสผ่านเริ่มต้น อย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`}
                      className={inputClass}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-slate-600">
                  สร้างบัญชีให้ถ้ายังไม่มี หรือส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่{' '}
                  <span className="font-mono text-slate-800">{employee.email}</span>
                </p>
                <button
                  type="button"
                  onClick={handleSendLink}
                  disabled={busy || emailChanged}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Mail className="w-3.5 h-3.5" />
                  ส่งลิงก์ตั้งรหัสผ่าน
                </button>
                {emailChanged && (
                  <p className="text-[11px] text-amber-700">
                    แก้อีเมลแล้ว: บันทึกก่อน แล้วเปิดแก้ไขอีกครั้งเพื่อสร้างบัญชีให้อีเมลใหม่
                  </p>
                )}
              </>
            )}
          </fieldset>

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
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 disabled:opacity-70 text-white shadow-xs cursor-pointer disabled:cursor-wait"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isNew ? 'เพิ่มพนักงาน' : 'บันทึก'}
          </button>
        </div>
      </form>
    </div>
  );
};
