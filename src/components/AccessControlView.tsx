import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DepartmentId } from '../types';
import {
  ShieldCheck,
  RotateCcw,
  Save,
  Check,
  Search,
  Users,
  Info,
} from 'lucide-react';

export const AccessControlView: React.FC = () => {
  const {
    menuPermissions,
    togglePermission,
    resetPermissions,
    currentUser,
    departments,
    showToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');

  const filteredPermissions = menuPermissions.filter(item => {
    return (
      item.menuName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.menuCode.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-red-700 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">ตั้งค่าสิทธิ์เข้าถึง</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            <strong>Personalized Workspace:</strong> กำหนดสิทธิ์ให้ 10 หน่วยงานในโครงสร้างองค์กรเข้าถึงแบบฟอร์มไอทีทั้ง 5 ด้านได้อย่างถูกต้อง
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={resetPermissions}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>รีเซ็ตค่ามาตรฐาน</span>
          </button>
          <button
            onClick={() => showToast('บันทึกการตั้งค่าสิทธิ์เข้าถึงเรียบร้อยแล้ว', 'success')}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>บันทึกการตั้งค่า</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ค้นหาแบบฟอร์มไอที..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-red-500"
          />
        </div>

        <div className="text-xs text-slate-500">
          แบบฟอร์มไอที <span className="font-bold text-red-700">{filteredPermissions.length}</span> แบบฟอร์ม
        </div>
      </div>

      {/* Access Matrix Table (Matching Top-Right Screen in mockup with 10 Departments) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider">
                <th className="py-3 px-4 min-w-[260px] sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                  แบบฟอร์มไอที (IT Forms)
                </th>
                {departments.map(dept => (
                  <th key={dept.id} className="py-3.5 px-3 text-center min-w-[110px]">
                    <div className="text-xs font-bold text-slate-800 leading-tight" title={dept.nameEn}>
                      {dept.shortName}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filteredPermissions.map(item => (
                <tr key={item.id} className="hover:bg-red-50/20 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-200">
                    <div className="font-bold text-slate-800">{item.menuName}</div>
                    <span className="text-[10px] font-mono text-slate-400">{item.menuCode}</span>
                  </td>

                  {departments.map(dept => {
                    const isChecked = item.allowedDepartments[dept.id] ?? false;
                    const isCurrentDept = currentUser.departmentId === dept.id;

                    return (
                      <td
                        key={dept.id}
                        className={`py-3 px-2 text-center ${
                          isCurrentDept ? 'bg-red-50/30' : ''
                        }`}
                      >
                        <label className="inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(item.id, dept.id)}
                            className="sr-only"
                          />
                          {isChecked ? (
                            <div className="w-5 h-5 rounded-md bg-red-600 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-md border-2 border-slate-300 hover:border-slate-400 bg-white"></div>
                          )}
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info note */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center space-x-2.5">
        <Info className="w-4 h-4 text-red-600 shrink-0" />
        <p>
          โครงสร้างองค์กรอ้างอิงตามแผนผังบุคลากร (Org Chart) ทั้ง 10 หน่วยงาน โดยไม่รวมระดับฝ่ายบริหาร CFO และ CEO ตามที่ระบุ
        </p>
      </div>
    </div>
  );
};
