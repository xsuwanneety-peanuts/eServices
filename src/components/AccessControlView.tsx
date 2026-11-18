import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DepartmentId, MenuItemPermission } from '../types';
import { ROLE_LABELS } from '../utils/approvers';
import { DEPT_ICONS } from '../utils/departmentIcons';
import { isOfferedForm } from '../utils/forms';
import { askConfirm } from './ConfirmDialog';
import { AlertTriangle, Check, FileText, FolderPlus, RotateCcw, ShieldCheck, Undo2, Users } from 'lucide-react';

type Access = Record<DepartmentId, boolean>;
type ViewMode = 'form' | 'department';

/**
 * Who may use each form. Two ways to look at the same settings: pick a form and tick its
 * departments, or pick a department and tick its forms. An employee gets the forms of the
 * department they are placed in (Employee Directory).
 */
export const AccessControlView: React.FC = () => {
  const { menuPermissions, setFormsAccess, departments, employees, showToast } = useApp();

  const forms = menuPermissions.filter(isOfferedForm);
  const [mode, setMode] = useState<ViewMode>('form');
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<DepartmentId>(departments[0].id);
  // What the last change replaced, so it can be put back
  const [undo, setUndo] = useState<{ label: string; previous: Record<string, Access> } | null>(null);

  const form = forms.find(f => f.id === selectedFormId) ?? forms[0];
  const dept = departments.find(d => d.id === selectedDeptId) ?? departments[0];

  const allowedCount = (f: MenuItemPermission) => departments.filter(d => f.allowedDepartments[d.id]).length;
  const formsOfDept = (deptId: DepartmentId) => forms.filter(f => f.allowedDepartments[deptId]);
  const membersOf = (deptId: DepartmentId) => employees.filter(e => e.departmentId === deptId);
  const everyDept = (allowed: boolean) => Object.fromEntries(departments.map(d => [d.id, allowed])) as Access;

  /** Saves a change and remembers what it replaced. */
  const apply = (label: string, changes: Record<string, Access>) => {
    const previous = Object.fromEntries(
      forms.filter(f => changes[f.id]).map(f => [f.id, f.allowedDepartments])
    ) as Record<string, Access>;
    setFormsAccess(changes);
    setUndo({ label, previous });
  };

  const toggle = (f: MenuItemPermission, deptId: DepartmentId) => {
    const deptName = departments.find(d => d.id === deptId)?.nameEn ?? deptId;
    const next = !f.allowedDepartments[deptId];
    apply(`${next ? 'เปิด' : 'ปิด'} ${f.menuName} ให้ ${deptName}`, {
      [f.id]: { ...f.allowedDepartments, [deptId]: next },
    });
  };

  const setAllDepartments = async (f: MenuItemPermission, allowed: boolean) => {
    if (
      !allowed &&
      !(await askConfirm({
        title: `ปิด "${f.menuName}" ทุกหน่วยงาน?`,
        message: 'จะไม่มีใครยื่นแบบฟอร์มนี้ได้ ยกเว้นผู้บริหาร',
        confirmLabel: 'ปิดทุกหน่วยงาน',
        danger: true,
      }))
    ) {
      return;
    }
    apply(`${allowed ? 'เปิด' : 'ปิด'} ${f.menuName} ทุกหน่วยงาน`, { [f.id]: everyDept(allowed) });
  };

  const setAllForms = async (deptId: DepartmentId, allowed: boolean) => {
    const deptName = departments.find(d => d.id === deptId)?.nameEn ?? deptId;
    if (
      !allowed &&
      !(await askConfirm({
        title: `ปิดทุกแบบฟอร์มสำหรับ ${deptName}?`,
        message: 'พนักงานหน่วยงานนี้จะยื่นแบบฟอร์มไม่ได้เลย ยกเว้นผู้บริหาร',
        confirmLabel: 'ปิดทุกแบบฟอร์ม',
        danger: true,
      }))
    ) {
      return;
    }
    apply(
      `${allowed ? 'เปิด' : 'ปิด'}ทุกแบบฟอร์มให้ ${deptName}`,
      Object.fromEntries(forms.map(f => [f.id, { ...f.allowedDepartments, [deptId]: allowed }]))
    );
  };

  // The standard setting: every form open to every department
  const isStandard = forms.every(f => allowedCount(f) === departments.length);
  const resetToStandard = async () => {
    const ok = await askConfirm({
      title: 'รีเซ็ตสิทธิ์เป็นค่ามาตรฐาน?',
      message: `ทุกแบบฟอร์ม (${forms.length}) จะเปิดให้ทุกหน่วยงาน`,
      confirmLabel: 'รีเซ็ต',
    });
    if (!ok) return;
    apply('รีเซ็ตเป็นค่ามาตรฐาน', Object.fromEntries(forms.map(f => [f.id, everyDept(true)])));
    showToast('เปิดทุกแบบฟอร์มให้ทุกหน่วยงานแล้ว', 'info');
  };

  const undoLast = () => {
    if (!undo) return;
    setFormsAccess(undo.previous);
    showToast(`เลิกทำ: ${undo.label}`, 'info');
    setUndo(null);
  };

  // Forms nobody but executives can submit
  const closedForms = forms.filter(f => allowedCount(f) === 0);

  const tabClass = (active: boolean) =>
    `flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors cursor-pointer ${
      active ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900 font-semibold'
    }`;
  const listItemClass = (active: boolean) =>
    `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-4 text-left transition-colors cursor-pointer ${
      active ? 'bg-red-50 border-red-600' : 'border-transparent hover:bg-slate-50'
    }`;
  const countBadge = 'text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 bg-slate-100 text-slate-500';

  /** One tick row: a department (form view) or a form (department view). */
  const tickRow = (key: string, checked: boolean, onChange: () => void, icon: React.ReactNode, label: string, extra?: React.ReactNode) => (
    <label
      key={key}
      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border cursor-pointer transition-colors ${
        checked ? 'border-red-200 bg-red-50/40 hover:bg-red-50' : 'border-slate-200 hover:bg-slate-50'
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
      <span
        aria-hidden="true"
        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 peer-focus-visible:ring-2 peer-focus-visible:ring-red-400 ${
          checked ? 'bg-red-600 text-white' : 'border-2 border-slate-300 bg-white'
        }`}
      >
        {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
      </span>
      {icon}
      <span className={`min-w-0 flex-1 text-xs leading-snug ${checked ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
        {label}
      </span>
      {extra}
    </label>
  );

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-700 text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">สิทธิ์เข้าถึง</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {undo && (
            <button
              onClick={undoLast}
              title={undo.label}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>เลิกทำ</span>
            </button>
          )}
          <button
            onClick={resetToStandard}
            disabled={isStandard || forms.length === 0}
            title={isStandard ? 'ทุกแบบฟอร์มเปิดให้ทุกหน่วยงานอยู่แล้ว' : 'เปิดทุกแบบฟอร์มให้ทุกหน่วยงาน'}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>รีเซ็ตค่ามาตรฐาน</span>
          </button>
          <span className="text-[11px] text-slate-400">บันทึกอัตโนมัติ</span>
        </div>
      </div>

      {forms.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
            <FolderPlus className="w-6 h-6" />
          </div>
          <p className="mt-3 text-sm font-bold text-slate-800">ยังไม่มีแบบฟอร์ม</p>
        </div>
      ) : (
        <>
          {closedForms.length > 0 && (
            <p role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                ไม่มีหน่วยงานใดมีสิทธิ์ใช้: <strong>{closedForms.map(f => f.menuName).join(', ')}</strong> —
                ยื่นได้เฉพาะผู้บริหาร
              </span>
            </p>
          )}

          <div className="bg-slate-100 p-1 rounded-xl inline-flex w-full sm:w-auto" role="tablist" aria-label="มุมมอง">
            <button role="tab" aria-selected={mode === 'form'} onClick={() => setMode('form')} className={tabClass(mode === 'form')}>
              ตามแบบฟอร์ม
            </button>
            <button
              role="tab"
              aria-selected={mode === 'department'}
              onClick={() => setMode('department')}
              className={tabClass(mode === 'department')}
            >
              ตามหน่วยงาน
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left: what to configure. A dropdown on small screens, a list on large ones */}
            <div className="lg:hidden">
              <label htmlFor="access-pick" className="block text-xs font-semibold text-slate-600 mb-1">
                {mode === 'form' ? 'แบบฟอร์ม' : 'หน่วยงาน'}
              </label>
              <select
                id="access-pick"
                value={mode === 'form' ? form.id : dept.id}
                onChange={e =>
                  mode === 'form' ? setSelectedFormId(e.target.value) : setSelectedDeptId(e.target.value as DepartmentId)
                }
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-hidden focus:border-red-500"
              >
                {mode === 'form'
                  ? forms.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.menuName}
                      </option>
                    ))
                  : departments.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.nameEn}
                      </option>
                    ))}
              </select>
            </div>

            <nav
              aria-label={mode === 'form' ? 'แบบฟอร์ม' : 'หน่วยงาน'}
              className="hidden lg:block lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs p-2"
            >
              <p className="px-2 pt-1 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {mode === 'form' ? `แบบฟอร์ม (${forms.length})` : `หน่วยงาน (${departments.length})`}
              </p>
              {mode === 'form'
                ? forms.map(f => {
                    const active = f.id === form.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedFormId(f.id)}
                        aria-current={active ? 'true' : undefined}
                        className={listItemClass(active)}
                      >
                        <FileText className={`w-4 h-4 shrink-0 ${active ? 'text-red-600' : 'text-slate-400'}`} />
                        <span
                          className={`min-w-0 flex-1 text-xs leading-snug ${active ? 'font-bold text-red-700' : 'font-semibold text-slate-800'}`}
                        >
                          {f.menuName}
                        </span>
                        <span title="จำนวนหน่วยงานที่มีสิทธิ์" className={countBadge}>
                          {allowedCount(f)}/{departments.length}
                        </span>
                      </button>
                    );
                  })
                : departments.map(d => {
                    const active = d.id === dept.id;
                    const Icon = DEPT_ICONS[d.id];
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSelectedDeptId(d.id)}
                        aria-current={active ? 'true' : undefined}
                        className={listItemClass(active)}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-red-600' : 'text-slate-400'}`} />
                        <span
                          className={`min-w-0 flex-1 text-xs leading-snug ${active ? 'font-bold text-red-700' : 'font-semibold text-slate-800'}`}
                        >
                          {d.nameEn}
                        </span>
                        <span title="จำนวนแบบฟอร์มที่ใช้ได้" className={countBadge}>
                          {formsOfDept(d.id).length}/{forms.length}
                        </span>
                      </button>
                    );
                  })}
            </nav>

            {/* Right: the ticks for the selected form or department */}
            {mode === 'form' ? (
              <section className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-900 leading-snug">{form.menuName}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      หน่วยงานที่มีสิทธิ์ <span className="font-bold text-red-700">{allowedCount(form)}</span> จาก{' '}
                      {departments.length}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAllDepartments(form, allowedCount(form) !== departments.length)}
                    className="text-xs font-bold text-red-600 hover:text-red-800 cursor-pointer shrink-0 self-start"
                  >
                    {allowedCount(form) === departments.length ? 'ปิดทุกหน่วยงาน' : 'เปิดให้ทุกหน่วยงาน'}
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {departments.map(d => {
                    const Icon = DEPT_ICONS[d.id];
                    return tickRow(
                      d.id,
                      form.allowedDepartments[d.id] ?? false,
                      () => toggle(form, d.id),
                      <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
                      d.nameEn,
                      <span title="จำนวนพนักงานในหน่วยงานนี้" className="inline-flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
                        <Users className="w-3 h-3" />
                        {membersOf(d.id).length}
                      </span>
                    );
                  })}
                </div>
              </section>
            ) : (
              <section className="lg:col-span-8 space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-slate-900 leading-snug">{dept.nameEn}</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {dept.nameTh} · ใช้ได้ <span className="font-bold text-red-700">{formsOfDept(dept.id).length}</span>{' '}
                        จาก {forms.length} แบบฟอร์ม
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAllForms(dept.id, formsOfDept(dept.id).length !== forms.length)}
                      className="text-xs font-bold text-red-600 hover:text-red-800 cursor-pointer shrink-0 self-start"
                    >
                      {formsOfDept(dept.id).length === forms.length ? 'ปิดทุกแบบฟอร์ม' : 'เปิดทุกแบบฟอร์ม'}
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {forms.map(f =>
                      tickRow(
                        f.id,
                        f.allowedDepartments[dept.id] ?? false,
                        () => toggle(f, dept.id),
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
                        f.menuName
                      )
                    )}
                  </div>
                </div>

                {/* Who this applies to */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-400" />
                    พนักงานในหน่วยงานนี้ <span className="font-normal text-slate-400">{membersOf(dept.id).length}</span>
                  </h3>
                  {membersOf(dept.id).length > 0 ? (
                    <ul className="mt-2 divide-y divide-slate-100">
                      {membersOf(dept.id).map(person => {
                        const isExecutive = person.role === 'director' || person.role === 'admin';
                        return (
                          <li key={person.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                            <span className="min-w-0">
                              <span className="block font-semibold text-slate-800 truncate">{person.name}</span>
                              <span className="block text-slate-400 truncate">{person.position}</span>
                            </span>
                            <span
                              className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isExecutive ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {isExecutive ? `${ROLE_LABELS[person.role]} · ใช้ได้ทุกแบบฟอร์ม` : ROLE_LABELS[person.role]}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">ยังไม่มีพนักงาน — เพิ่มได้ที่ Employee Directory</p>
                  )}
                </div>
              </section>
            )}
          </div>

          <p className="text-[11px] text-slate-400">
            สิทธิ์เป็นไปตามหน่วยงานของพนักงานใน Employee Directory ผู้บริหารใช้ได้ทุกแบบฟอร์ม
          </p>
        </>
      )}
    </div>
  );
};
