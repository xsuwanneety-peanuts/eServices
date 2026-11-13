import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DepartmentId } from '../types';
import { DEPT_ICONS } from '../utils/departmentIcons';
import { Check, FolderPlus, RotateCcw, Save, Search, ShieldCheck } from 'lucide-react';

export const AccessControlView: React.FC = () => {
  const {
    menuPermissions,
    togglePermission,
    setFormAccessForAll,
    resetPermissions,
    departments,
    showToast,
  } = useApp();

  // Department that owns the forms being configured (IT is the only one with forms so far)
  const [ownerDept, setOwnerDept] = useState<DepartmentId>('it');
  const [searchQuery, setSearchQuery] = useState('');

  const formsOf = (deptId: DepartmentId) => menuPermissions.filter(f => f.ownerDepartmentId === deptId);
  const owner = departments.find(d => d.id === ownerDept);
  const OwnerIcon = DEPT_ICONS[ownerDept];

  const q = searchQuery.trim().toLowerCase();
  const forms = formsOf(ownerDept).filter(
    f => !q || f.menuName.toLowerCase().includes(q) || f.menuCode.toLowerCase().includes(q)
  );

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-700 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">ตั้งค่าสิทธิ์เข้าถึง</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            เลือกหน่วยงานเจ้าของแบบฟอร์ม แล้วกำหนดว่าหน่วยงานใดยื่นแบบฟอร์มนั้นได้
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={resetPermissions}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>รีเซ็ตค่ามาตรฐาน</span>
          </button>
          <span className="text-[11px] text-slate-400">บันทึกอัตโนมัติ</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Owning departments: dropdown on small screens, list on large screens */}
        <div className="lg:hidden">
          <label htmlFor="owner-dept" className="block text-xs font-semibold text-slate-600 mb-1">
            หน่วยงานเจ้าของแบบฟอร์ม
          </label>
          <select
            id="owner-dept"
            value={ownerDept}
            onChange={e => setOwnerDept(e.target.value as DepartmentId)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-hidden focus:border-red-500"
          >
            {departments.map(d => (
              <option key={d.id} value={d.id}>
                {d.nameEn} ({formsOf(d.id).length} แบบฟอร์ม)
              </option>
            ))}
          </select>
        </div>

        <nav
          aria-label="หน่วยงานเจ้าของแบบฟอร์ม"
          className="hidden lg:block lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs p-2"
        >
          <p className="px-2 pt-1 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            หน่วยงานเจ้าของแบบฟอร์ม ({departments.length})
          </p>
          {departments.map(dept => {
            const Icon = DEPT_ICONS[dept.id];
            const count = formsOf(dept.id).length;
            const isActive = dept.id === ownerDept;
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => setOwnerDept(dept.id)}
                aria-current={isActive ? 'true' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-4 text-left transition-colors cursor-pointer ${
                  isActive ? 'bg-red-50 border-red-600' : 'border-transparent hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-red-600' : 'text-slate-400'}`} />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-xs leading-snug ${
                      isActive ? 'font-bold text-red-700' : 'font-semibold text-slate-800'
                    }`}
                  >
                    {dept.nameEn}
                  </span>
                  <span className="block text-[10px] text-slate-400 truncate">{dept.nameTh}</span>
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                    count > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Forms of the selected department and who may use them */}
        <section className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <OwnerIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 leading-snug">{owner?.nameEn}</h2>
                <p className="text-xs text-slate-400">
                  {owner?.nameTh} • {formsOf(ownerDept).length} แบบฟอร์ม
                </p>
              </div>
            </div>
            {formsOf(ownerDept).length > 0 && (
              <div className="relative sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาแบบฟอร์ม..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-red-500"
                />
              </div>
            )}
          </div>

          {formsOf(ownerDept).length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                <FolderPlus className="w-6 h-6" />
              </div>
              <p className="mt-3 text-sm font-bold text-slate-800">หน่วยงานนี้ยังไม่มีแบบฟอร์ม</p>
              <p className="text-xs text-slate-500 mt-1">
                เมื่อ {owner?.nameEn} เปิดใช้แบบฟอร์มแล้ว จะกำหนดสิทธิ์การใช้งานได้ที่นี่
              </p>
            </div>
          ) : forms.length === 0 ? (
            <p className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
              ไม่พบแบบฟอร์มที่ตรงกับคำค้นหา
            </p>
          ) : (
            forms.map(form => {
              const allowedCount = departments.filter(d => form.allowedDepartments[d.id]).length;
              const allAllowed = allowedCount === departments.length;
              return (
                <div key={form.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono text-slate-400">{form.menuCode}</span>
                      <h3 className="text-sm font-bold text-slate-900">{form.menuName}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        เปิดให้ <span className="font-bold text-red-700">{allowedCount}</span> จาก{' '}
                        {departments.length} หน่วยงาน
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormAccessForAll(form.id, !allAllowed)}
                      className="text-xs font-bold text-red-600 hover:text-red-800 cursor-pointer shrink-0 self-start"
                    >
                      {allAllowed ? 'ปิดทุกหน่วยงาน' : 'เปิดให้ทุกหน่วยงาน'}
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {departments.map(dept => {
                      const isChecked = form.allowedDepartments[dept.id] ?? false;
                      const Icon = DEPT_ICONS[dept.id];
                      return (
                        <label
                          key={dept.id}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border cursor-pointer transition-colors ${
                            isChecked
                              ? 'border-red-200 bg-red-50/40 hover:bg-red-50'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(form.id, dept.id)}
                            className="sr-only peer"
                          />
                          <span
                            aria-hidden="true"
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 peer-focus-visible:ring-2 peer-focus-visible:ring-red-400 ${
                              isChecked ? 'bg-red-600 text-white' : 'border-2 border-slate-300 bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </span>
                          <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="min-w-0 text-xs leading-snug">
                            <span className={isChecked ? 'font-semibold text-slate-900' : 'text-slate-600'}>
                              {dept.nameEn}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
};
