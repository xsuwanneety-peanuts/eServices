import React from 'react';
import { useApp } from '../context/AppContext';
import { DepartmentId, ItRequestCategory } from '../types';
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
  } = useApp();

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
  const isItDepartment = currentDeptKey === 'it';

  // Requests belonging strictly to this department
  const deptRequests = requests.filter(r => r.departmentId === currentDeptKey && canViewRequest(r));
  // Staff of this department (and system admins) see every request; others only their own
  const seesAllDeptRequests =
    isSystemAdmin || (canApprove && currentUser.departmentId === currentDeptKey);

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

      {/* Forms Section: IT forms ONLY appear in เทคโนโลยีสารสนเทศ */}
      {isItDepartment ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                แบบฟอร์มฝ่าย Information Technology (IT Service Catalog)
              </h3>
              <p className="text-xs text-slate-500">
                เปิดให้บริการทั้งหมด 5 แบบฟอร์มสำหรับทุกหน่วยงานในองค์กร
              </p>
            </div>
            <span className="text-xs bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded-md border border-red-200">
              5 แบบฟอร์มไอที
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {menuPermissions.map(form => {
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
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-slate-400">{form.menuCode}</span>
                      {hasAccess ? (
                        <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                          พร้อมให้บริการ
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Lock className="w-3 h-3" /> จำกัดสิทธิ์
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-800">{form.menuName}</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      คลิกเพื่อเปิดแบบฟอร์มคำขอและเริ่มขั้นตอนการอนุมัติอัตโนมัติ
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                    {hasAccess ? (
                      <button
                        onClick={() => {
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
                        เปิดกรอกแบบฟอร์ม →
                      </button>
                    ) : !canAccessTab('access_control') ? (
                      <span className="text-[11px] text-slate-400">
                        หน่วยงานของคุณยังไม่ได้รับสิทธิ์ใช้แบบฟอร์มนี้
                      </span>
                    ) : (
                      <button
                        onClick={() => setActiveTab('access_control')}
                        className="text-[11px] text-slate-400 hover:text-red-600 flex items-center gap-1 cursor-pointer"
                      >
                        ดูการตั้งค่าสิทธิ์ (RBAC) →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Empty State for other departments waiting for their forms to be added */
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                แบบฟอร์มประจำหน่วยงาน ({deptInfo.nameEn})
              </h3>
              <p className="text-xs text-slate-500">
                ขณะนี้แบบฟอร์มของหน่วยงานนี้ยังไม่ได้เปิดใช้งาน
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
              <FolderPlus className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">
                ยังไม่มีแบบฟอร์มเปิดใช้งานในหน่วยงานนี้
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                อยู่ระหว่างการจัดเตรียมและออกแบบฟอร์มสำหรับ {deptInfo.nameEn} ({deptInfo.nameTh}) โดยปัจจุบันระบบเปิดให้บริการเฉพาะแบบฟอร์มของฝ่าย Information Technology 5 ด้าน
              </p>
            </div>
            <div className="pt-2 flex justify-center">
              <button
                onClick={() => {
                  setActiveTab('department_view');
                  setActiveDeptFilter('it');
                }}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold border border-red-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>ไปที่แบบฟอร์มฝ่าย Information Technology</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Requests for this Department */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3">
          {seesAllDeptRequests ? 'คำขอในหน่วยงาน' : 'คำขอของฉันในหน่วยงาน'} {deptInfo.nameEn} ({deptRequests.length})
        </h3>
        {deptRequests.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
            {deptRequests.map(req => (
              <div
                key={req.id}
                onClick={() => setActiveRequestId(req.id)}
                className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold font-mono text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                      {req.code}
                    </span>
                    {req.priority && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                        {req.priority}
                      </span>
                    )}
                    <span className="text-xs font-bold text-slate-800">{req.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    ผู้ยื่น: {req.requestorName} • วันที่: {req.createdAt}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      req.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {req.status === 'approved' ? 'อนุมัติแล้ว' : 'รอตรวจสอบ'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            {seesAllDeptRequests ? 'ยังไม่มีรายการคำขอในหน่วยงานนี้' : 'คุณยังไม่มีคำขอในหน่วยงานนี้'}
          </div>
        )}
      </div>
    </div>
  );
};
