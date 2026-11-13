import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DepartmentId, ItRequestCategory, MenuItemPermission } from '../types';
import { FormBuilderModal } from './FormBuilderModal';
import { CustomRequestModal } from './CustomRequestModal';
import {
  FileText,
  Lock,
  CheckCircle2,
  Users,
  Shield,
  Rocket,
  Laptop,
  TrendingUp,
  FileCheck,
  AlertCircle,
  DollarSign,
  Calculator,
  ShoppingBag,
  ArrowRight,
  FolderPlus,
  Inbox,
  Plus,
  Pencil,
} from 'lucide-react';

export const DepartmentWorkspaceView: React.FC = () => {
  const {
    activeDeptFilter,
    setActiveDeptFilter,
    currentUser,
    menuPermissions,
    isMenuPermittedForUser,
    requests,
    setActiveRequestId,
    openNewRequestModal,
    setActiveTab,
    departments,
    isSystemAdmin,
    canAccessTab,
    canApprove,
    canViewRequest,
    canManageForms,
    canEditForm,
  } = useApp();

  // Form builder: undefined = closed, null = new form, otherwise the form being edited
  const [builderForm, setBuilderForm] = useState<MenuItemPermission | null | undefined>(undefined);
  // Department-built form being filled in
  const [fillingForm, setFillingForm] = useState<MenuItemPermission | null>(null);

  const deptIcons: Record<DepartmentId, React.ElementType> = {
    compliance_legal: Shield,
    new_venture: Rocket,
    it: Laptop,
    sales: TrendingUp,
    underwriting: FileCheck,
    claims: AlertCircle,
    finance_invest: DollarSign,
    accounting_tax: Calculator,
    admin_procure: ShoppingBag,
    hr: Users,
  };

  const currentDeptKey = activeDeptFilter || 'it';
  const deptInfo = departments.find(d => d.id === currentDeptKey) || departments[2];
  const DeptIcon = deptIcons[currentDeptKey] || Laptop;
  // Forms this department provides (configured in ตั้งค่าสิทธิ์เข้าถึง)
  const deptForms = menuPermissions.filter(f => f.ownerDepartmentId === currentDeptKey);
  const canCreate = canManageForms(currentDeptKey);

  const createButton = (
    <button
      type="button"
      onClick={() => setBuilderForm(null)}
      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
    >
      <Plus className="w-4 h-4" />
      สร้างแบบฟอร์มใหม่
    </button>
  );

  // Requests belonging strictly to this department
  const deptRequests = requests.filter(r => r.departmentId === currentDeptKey && canViewRequest(r));
  // Staff of this department (and system admins) see every request; others only their own
  const seesAllDeptRequests =
    isSystemAdmin || currentUser.departmentId === currentDeptKey;

  return (
    <div className="space-y-5">
      {/* Banner in Corporate Red (No HC / Headcount text) */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-red-800 via-red-700 to-rose-700 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
            <DeptIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{deptInfo.nameEn}</h1>
            <p className="text-xs sm:text-sm text-red-100 mt-0.5">{deptInfo.nameTh}</p>
          </div>
        </div>
      </div>

      {/* Forms Section: only the forms this department provides */}
      {deptForms.length > 0 ? (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <h3 className="text-sm font-bold text-slate-900">แบบฟอร์ม</h3>
            {canCreate && createButton}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {deptForms.map(form => {
              const hasAccess =
                currentUser.role === 'admin' ||
                isMenuPermittedForUser(form.menuCode);

              return (
                <div
                  key={form.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    hasAccess
                      ? 'bg-white border-slate-200 hover:border-red-400 hover:shadow-md'
                      : 'bg-slate-50 border-slate-200/60 opacity-60'
                  }`}
                >
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      {!hasAccess && <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                      {form.menuName}
                    </h4>
                    {form.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{form.description}</p>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                    {hasAccess ? (
                      <button
                        onClick={() => {
                          if (form.fields) {
                            setFillingForm(form);
                            return;
                          }
                          const itFormCategoryMap: Record<string, ItRequestCategory> = {
                            'form-it-access': 'system_access',
                            'form-it-equipment': 'equipment',
                            'form-it-incident': 'incident',
                            'form-it-development': 'development',
                            'form-it-data': 'data_report',
                          };
                          openNewRequestModal(itFormCategoryMap[form.id] || 'system_access');
                        }}
                        className="text-xs font-bold text-red-600 hover:text-red-800 flex items-center gap-1 cursor-pointer"
                      >
                        กรอกแบบฟอร์ม →
                      </button>
                    ) : !canAccessTab('access_control') ? (
                      <span className="text-[11px] text-slate-400">ไม่มีสิทธิ์</span>
                    ) : (
                      <button
                        onClick={() => setActiveTab('access_control')}
                        className="text-[11px] text-slate-400 hover:text-red-600 flex items-center gap-1 cursor-pointer"
                      >
                        ตั้งค่าสิทธิ์ →
                      </button>
                    )}
                    {canEditForm(form) && (
                      <button
                        type="button"
                        onClick={() => setBuilderForm(form)}
                        title={`แก้ไขแบบฟอร์ม ${form.menuName}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Empty state: no forms yet */
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3">แบบฟอร์ม</h3>

          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
              <FolderPlus className="w-6 h-6" />
            </div>
            <p className="text-sm text-slate-400">ยังไม่มีแบบฟอร์ม</p>
            {canCreate && <div className="pt-2 flex justify-center">{createButton}</div>}
          </div>
        </div>
      )}
      {/* Recent Requests for this Department */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3">
          {seesAllDeptRequests ? 'คำร้อง' : 'คำร้องของฉัน'}{' '}
          <span className="text-slate-400 font-normal">{deptRequests.length}</span>
        </h3>
        {deptRequests.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
            {deptRequests.map(req => (
              <div
                key={req.id}
                onClick={() => setActiveRequestId(req.id)}
                className="p-4 hover:bg-slate-50 cursor-pointer flex items-start sm:items-center justify-between gap-3 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs font-bold font-mono text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 whitespace-nowrap">
                      {req.code}
                    </span>
                    {req.priority && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                        {req.priority}
                      </span>
                    )}
                    <span className="basis-full sm:basis-auto text-xs font-bold text-slate-800">{req.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {req.requestorName} · {req.createdAt.split(' ')[0]}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                      req.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : req.status === 'returned' || req.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {req.status === 'approved'
                      ? 'อนุมัติแล้ว'
                      : req.status === 'returned'
                        ? 'ตีกลับ'
                        : req.status === 'rejected'
                          ? 'ไม่อนุมัติ'
                          : 'รอตรวจสอบ'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            ยังไม่มีคำร้อง
          </div>
        )}
      </div>

      {builderForm !== undefined && (
        <FormBuilderModal deptId={currentDeptKey} form={builderForm} onClose={() => setBuilderForm(undefined)} />
      )}
      {fillingForm && <CustomRequestModal form={fillingForm} onClose={() => setFillingForm(null)} />}
    </div>
  );
};
