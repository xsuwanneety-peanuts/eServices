import React from 'react';
import { useApp } from '../context/AppContext';
import { DepartmentId } from '../types';
import {
  Home,
  Shield,
  Rocket,
  Laptop,
  TrendingUp,
  FileCheck,
  AlertCircle,
  DollarSign,
  Calculator,
  ShoppingBag,
  Users,
  ShieldCheck,
  GitBranch,
  FileCheck2,
  Lock,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    activeDeptFilter,
    setActiveDeptFilter,
    departments,
    isMenuPermittedForUser,
  } = useApp();

  // Icon mapping for each of the 10 corporate departments from image_e04b8c47.png
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

  // Administration and Core Concept tools
  const configNavItems = [
    {
      id: 'access-control',
      name: 'ตั้งค่าสิทธิ์เข้าถึง',
      icon: ShieldCheck,
      tab: 'access_control',
    },
    {
      id: 'workflow-builder',
      name: 'ตั้งค่า Flow อนุมัติ & แจ้งเตือน',
      icon: GitBranch,
      tab: 'workflow_builder',
    },
    {
      id: 'traceability',
      name: '100% Traceability ตรวจสอบสถานะ',
      icon: FileCheck2,
      tab: 'traceability_center',
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 shrink-0 flex flex-col py-3 select-none overflow-y-auto">
      {/* Top Main Menu: เมนูของฉัน */}
      <div className="px-3 pb-2 border-b border-slate-100">
        <button
          onClick={() => {
            setActiveTab('my_workspace');
            setActiveDeptFilter(null);
          }}
          className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
            activeTab === 'my_workspace'
              ? 'bg-red-50 text-red-700 font-bold border-l-4 border-red-600'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Home className={`w-4 h-4 shrink-0 ${activeTab === 'my_workspace' ? 'text-red-600' : 'text-slate-500'}`} />
          <span>เมนูของฉัน</span>
        </button>
      </div>

      {/* Corporate Departments Section (from image_e04b8c47.png) */}
      <div className="px-3 pt-3 flex-1 space-y-1">
        <div className="px-2 pb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          หน่วยงานองค์กร ({departments.length})
        </div>

        {departments.map(dept => {
          const Icon = deptIcons[dept.id] || Laptop;
          const isActive = activeTab === 'department_view' && activeDeptFilter === dept.id;
          const isUserDept = currentUser.departmentId === dept.id;

          return (
            <button
              key={dept.id}
              onClick={() => {
                setActiveTab('department_view');
                setActiveDeptFilter(dept.id);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                isActive
                  ? 'bg-red-50 text-red-700 font-bold border-l-4 border-red-600'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate min-w-0">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-red-600' : isUserDept ? 'text-red-500' : 'text-slate-400'}`} />
                <span className="truncate text-xs">
                  {dept.nameTh}
                </span>
              </div>
            </button>
          );
        })}

        {/* Administration Section */}
        <div className="pt-4 pb-1 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          การจัดการระบบ
        </div>

        {configNavItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.tab;

          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.tab);
                setActiveDeptFilter(null);
              }}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-red-50 text-red-700 font-bold border-l-4 border-red-600'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-red-600' : 'text-slate-500'}`} />
              <span className="truncate">{item.name}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Profile Mini Tag */}
      <div className="px-4 py-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="truncate">{currentUser.departmentName.split('(')[0]}</span>
        <span className="w-2 h-2 rounded-full bg-red-600 shrink-0"></span>
      </div>
    </aside>
  );
};
