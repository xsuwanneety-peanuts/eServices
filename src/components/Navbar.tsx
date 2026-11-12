import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bell,
  Grid,
  Mail,
  ChevronDown,
  CheckCircle2,
  Clock,
  Sparkles,
  Plus,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    setCurrentUser,
    availablePersonas,
    emailNotifications,
    setIsEmailSimulatorModalOpen,
    setIsNewRequestModalOpen,
    setSelectedNotificationId,
    setActiveTab,
  } = useApp();

  const [isPersonaMenuOpen, setIsPersonaMenuOpen] = useState(false);
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);

  const unreadEmailCount = emailNotifications.filter(n => !n.read).length;

  return (
    <header className="h-14 bg-white border-b border-slate-200 shrink-0 z-30 px-4 sm:px-6 flex items-center justify-between shadow-xs">
      {/* Left: Corporate Red Logo & Organization Title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => setActiveTab('my_workspace')}
          className="flex items-center space-x-2 text-left group focus:outline-hidden"
        >
          <span className="text-xl sm:text-2xl font-black tracking-tight text-red-700 hover:text-red-800 transition-colors">
            e-Service
          </span>
        </button>
      </div>

      {/* Right Tools: Create Work Item + Email Routing + App Grid + Bell + Profile Avatar */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Quick Create Work Item Button (Corporate Red) */}
        <button
          onClick={() => setIsNewRequestModalOpen(true)}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-all cursor-pointer active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">สร้างคำขอใหม่</span>
        </button>

        {/* Action-Driven Email Routing Simulator / Notifications */}
        <button
          onClick={() => {
            setSelectedNotificationId(emailNotifications[0]?.id || null);
            setIsEmailSimulatorModalOpen(true);
          }}
          title="การแจ้งเตือน: เอกสารวิ่งหาคน พร้อมปุ่มอนุมัติทันที"
          className="relative p-1.5 rounded-lg text-slate-600 hover:text-red-700 hover:bg-red-50 transition-colors flex items-center space-x-1 border border-slate-200 cursor-pointer"
        >
          <Mail className="w-4 h-4 text-red-600" />
          <span className="text-xs text-slate-700 hidden md:inline font-medium">การแจ้งเตือน</span>
          {unreadEmailCount > 0 && (
            <span className="px-1.5 py-0.2 bg-red-600 text-white text-[10px] font-bold rounded-full animate-pulse">
              {unreadEmailCount}
            </span>
          )}
        </button>

        {/* App Grid Icon (Access Control Matrix shortcut) */}
        <button
          onClick={() => setActiveTab('access_control')}
          title="ผังเมนูและสิทธิ์เข้าถึง (RBAC)"
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
        >
          <Grid className="w-4 h-4" />
        </button>

        {/* Notification Bell with red dot */}
        <div className="relative">
          <button
            onClick={() => setIsNotifMenuOpen(!isNotifMenuOpen)}
            className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors relative border border-slate-200"
            title="การแจ้งเตือน"
          >
            <Bell className="w-4 h-4" />
            {unreadEmailCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white"></span>
            )}
          </button>

          {isNotifMenuOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                    Action-Driven Notifications
                  </h4>
                  <p className="text-xs font-semibold text-slate-800">คำร้องไอทีที่รอการตัดสินใจ</p>
                </div>
                <span className="text-[11px] bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded-full">
                  {emailNotifications.length} รายการ
                </span>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {emailNotifications.map(item => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedNotificationId(item.id);
                      setIsEmailSimulatorModalOpen(true);
                      setIsNotifMenuOpen(false);
                    }}
                    className={`p-3 hover:bg-red-50/50 cursor-pointer transition-colors ${
                      !item.read ? 'bg-red-50/30' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-red-700">{item.requestCode}</span>
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.createdAt}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5 truncate">{item.requestTitle}</p>
                    <div className="mt-1 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-medium">
                        {item.stepTitle}
                      </span>
                      <span className="text-red-600 font-bold hover:underline">
                        เปิดอนุมัติ →
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-4 pt-2 border-t border-slate-100 text-center">
                <button
                  onClick={() => {
                    setIsEmailSimulatorModalOpen(true);
                    setIsNotifMenuOpen(false);
                  }}
                  className="text-xs font-bold text-red-600 hover:text-red-800"
                >
                  เปิดดูการจำลอง Action-Driven Email ทั้งหมด
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar with Persona Switcher */}
        <div className="relative">
          <button
            onClick={() => setIsPersonaMenuOpen(!isPersonaMenuOpen)}
            title="สลับบทบาทผู้ใช้ตามโครงสร้างองค์กร"
            className="flex items-center space-x-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-red-400 transition-all focus:outline-hidden"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-red-600/30"
            />
            <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
          </button>

          {isPersonaMenuOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-red-700">
                    สลับบทบาทพนักงาน (Role-Based Access)
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-red-500" />
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  เลือกหน่วยงานในองค์กรเพื่อทดสอบมุมมอง Personalized Workspace
                </p>
              </div>

              <div className="py-1 max-h-80 overflow-y-auto">
                {availablePersonas.map(persona => {
                  const isCurrent = persona.id === currentUser.id;
                  return (
                    <button
                      key={persona.id}
                      onClick={() => {
                        setCurrentUser(persona);
                        setIsPersonaMenuOpen(false);
                      }}
                      className={`w-full px-3.5 py-2.5 text-left flex items-center space-x-3 transition-colors ${
                        isCurrent ? 'bg-red-50/80 border-l-4 border-red-600' : 'hover:bg-slate-50'
                      }`}
                    >
                      <img
                        src={persona.avatar}
                        alt={persona.name}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0 text-xs">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-800 truncate">{persona.name}</p>
                          {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-red-600 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-red-700 font-medium truncate">{persona.departmentName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{persona.position}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
