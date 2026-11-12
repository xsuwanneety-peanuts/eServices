import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { DepartmentId } from '../types';
import { KNOWLEDGE_ARTICLES } from '../data/knowledgeBase';
import { DEPT_ICONS } from '../utils/departmentIcons';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Menu,
  X,
  Home,
  Laptop,
  BookOpen,
  ShieldCheck,
  GitBranch,
  Contact,
} from 'lucide-react';


// System administration tools
const ADMIN_NAV_ITEMS = [
  { tab: 'access_control', name: 'ตั้งค่าสิทธิ์เข้าถึง', icon: ShieldCheck },
  { tab: 'workflow_builder', name: 'ตั้งค่า Flow อนุมัติ & แจ้งเตือน', icon: GitBranch },
  { tab: 'employee_directory', name: 'Employee Directory', icon: Contact },
];

const DEPT_GROUP_LABEL = 'หน่วยงานองค์กร';
const ADMIN_GROUP_LABEL = 'การจัดการระบบ';
const HOME_LABEL = 'เมนูของฉัน';
const KB_LABEL = 'Knowledge Base';

type OpenMenu = 'dept' | 'admin' | 'notif' | 'persona' | 'mobile' | null;

interface NavbarProps {
  /** True once the main content has been scrolled, used to show the navbar shadow. */
  scrolled?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ scrolled = false }) => {
  const {
    currentUser,
    setCurrentUser,
    availablePersonas,
    setIsEmailSimulatorModalOpen,
    setActiveRequestId,
    canAccessTab,
    myNotifications,
    myStatusUpdates,
    unseenStatusUpdateCount,
    markStatusUpdatesSeen,
    setSelectedNotificationId,
    activeTab,
    setActiveTab,
    activeDeptFilter,
    setActiveDeptFilter,
    departments,
    activeArticleId,
    setActiveArticleId,
  } = useApp();

  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [mobileSection, setMobileSection] = useState<'dept' | 'admin' | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Bell badge: approvals waiting on me + unseen progress on my own requests
  const pendingApprovalNotifs = myNotifications.filter(n => !n.actionTaken);
  const bellCount = pendingApprovalNotifs.filter(n => !n.read).length + unseenStatusUpdateCount;
  const hasAnyNotification = pendingApprovalNotifs.length > 0 || myStatusUpdates.length > 0;

  // Progress updates count as seen once the bell dropdown is closed
  const wasNotifOpen = useRef(false);
  useEffect(() => {
    if (wasNotifOpen.current && openMenu !== 'notif') markStatusUpdatesSeen();
    wasNotifOpen.current = openMenu === 'notif';
  }, [openMenu]);

  const toggleMenu = (menu: Exclude<OpenMenu, null>) =>
    setOpenMenu(prev => (prev === menu ? null : menu));

  const goTo = (tab: string, dept: DepartmentId | null = null) => {
    setActiveTab(tab);
    setActiveDeptFilter(dept);
    setActiveArticleId(null);
    setOpenMenu(null);
  };

  // Close any open menu on outside click or Escape
  useEffect(() => {
    if (!openMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenu]);

  const isHomeActive = activeTab === 'my_workspace';
  const isDeptActive = activeTab === 'department_view';
  const isKbActive = activeTab === 'knowledge_base';
  const activeArticle = isKbActive ? KNOWLEDGE_ARTICLES.find(a => a.id === activeArticleId) : undefined;
  // System-management screens this user may open
  const adminItems = ADMIN_NAV_ITEMS.filter(item => canAccessTab(item.tab));
  const activeAdminItem = adminItems.find(item => item.tab === activeTab);
  const activeDept = isDeptActive
    ? departments.find(d => d.id === (activeDeptFilter || 'it'))
    : undefined;

  // Breadcrumb trail shown under the navbar
  const breadcrumb: string[] = isDeptActive
    ? [DEPT_GROUP_LABEL, activeDept?.nameEn ?? '']
    : isKbActive
      ? activeArticle
        ? [KB_LABEL, activeArticle.title]
        : [KB_LABEL]
    : activeAdminItem
      ? [ADMIN_GROUP_LABEL, activeAdminItem.name]
      : [HOME_LABEL];

  const topLinkClass = (isActive: boolean, isOpen = false) =>
    `h-14 inline-flex items-center gap-1.5 px-3 text-sm border-b-2 transition-colors cursor-pointer whitespace-nowrap focus:outline-hidden focus-visible:bg-red-50 ${
      isActive
        ? 'border-red-600 text-red-700 font-bold'
        : `border-transparent font-medium hover:text-red-700 ${isOpen ? 'text-red-700' : 'text-slate-700'}`
    }`;

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 shrink-0 z-30 bg-white border-b border-slate-200 transition-shadow duration-200 ${
        scrolled ? 'shadow-md' : ''
      }`}
    >
      <div className="relative max-w-[1280px] mx-auto h-14 px-4 sm:px-6 flex items-center justify-between gap-3">
        {/* Left: Hamburger (mobile/tablet) + Corporate Red Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => toggleMenu('mobile')}
            aria-label={openMenu === 'mobile' ? 'ปิดเมนู' : 'เปิดเมนู'}
            aria-expanded={openMenu === 'mobile'}
            className="lg:hidden p-1.5 -ml-1.5 rounded-lg text-slate-600 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
          >
            {openMenu === 'mobile' ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <button
            onClick={() => goTo('my_workspace')}
            className="flex items-center text-left focus:outline-hidden cursor-pointer"
          >
            <span className="text-xl sm:text-2xl font-black tracking-tight text-red-700 hover:text-red-800 transition-colors whitespace-nowrap">
              e-Service
            </span>
          </button>
        </div>

        {/* Center: Main menu (desktop) */}
        <nav className="hidden lg:flex items-stretch gap-1 select-none" aria-label="เมนูหลัก">
          <button
            onClick={() => goTo('my_workspace')}
            aria-current={isHomeActive ? 'page' : undefined}
            className={topLinkClass(isHomeActive)}
          >
            <Home className="w-4 h-4" />
            <span>{HOME_LABEL}</span>
          </button>

          <button
            onClick={() => toggleMenu('dept')}
            aria-haspopup="true"
            aria-expanded={openMenu === 'dept'}
            className={topLinkClass(isDeptActive, openMenu === 'dept')}
          >
            <span>{DEPT_GROUP_LABEL}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${openMenu === 'dept' ? 'rotate-180' : ''}`}
            />
          </button>

          <button
            onClick={() => goTo('knowledge_base')}
            aria-current={isKbActive ? 'page' : undefined}
            className={topLinkClass(isKbActive)}
          >
            <BookOpen className="w-4 h-4" />
            <span>{KB_LABEL}</span>
          </button>

          {adminItems.length > 0 && (
          <div className="relative flex">
            <button
              onClick={() => toggleMenu('admin')}
              aria-haspopup="true"
              aria-expanded={openMenu === 'admin'}
              className={topLinkClass(Boolean(activeAdminItem), openMenu === 'admin')}
            >
              <span>{ADMIN_GROUP_LABEL}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${openMenu === 'admin' ? 'rotate-180' : ''}`}
              />
            </button>

            {openMenu === 'admin' && (
              <div className="absolute left-0 top-full mt-px w-72 bg-white rounded-b-2xl shadow-xl border border-slate-200 border-t-0 py-2 z-50">
                {adminItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.tab;
                  return (
                    <button
                      key={item.tab}
                      onClick={() => goTo(item.tab)}
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-medium border-l-4 transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-red-50 text-red-700 font-bold border-red-600'
                          : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-red-600' : 'text-slate-500'}`} />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          )}
        </nav>

        {/* Right Tools: Bell + Profile Avatar */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">

          {/* Notification Bell with unread count */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('notif')}
              aria-expanded={openMenu === 'notif'}
              className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors relative border border-slate-200 cursor-pointer"
              title="การแจ้งเตือน"
            >
              <Bell className="w-4 h-4" />
              {bellCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold leading-none ring-2 ring-white">
                  {bellCount}
                </span>
              )}
            </button>

            {openMenu === 'notif' && (
              <div className="absolute -right-10 sm:right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50">
                <div className="px-4 pb-2 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-slate-800">การแจ้งเตือน</h4>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {/* Approvals waiting on me (approvers only) */}
                  {pendingApprovalNotifs.length > 0 && (
                    <div>
                      <div className="px-4 pt-2.5 pb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <span>รอคุณอนุมัติ</span>
                        <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full normal-case tracking-normal">
                          {pendingApprovalNotifs.length} รายการ
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {pendingApprovalNotifs.map(item => (
                          <div
                            key={item.id}
                            onClick={() => {
                              setSelectedNotificationId(item.id);
                              setIsEmailSimulatorModalOpen(true);
                              setOpenMenu(null);
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
                              <span className="text-red-600 font-bold hover:underline">เปิดอนุมัติ →</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Progress on my own requests */}
                  {myStatusUpdates.length > 0 && (
                    <div>
                      <div className="px-4 pt-2.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        ความคืบหน้าคำร้องของฉัน
                      </div>
                      <div className="divide-y divide-slate-100">
                        {myStatusUpdates.map(update => (
                          <div
                            key={update.key}
                            onClick={() => {
                              setActiveRequestId(update.requestId);
                              setOpenMenu(null);
                            }}
                            className="p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-red-700">{update.requestCode}</span>
                              <span className="text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {update.timestamp}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-800 mt-0.5 truncate">{update.requestTitle}</p>
                            <p
                              className={`mt-1 text-[11px] font-medium ${
                                update.kind === 'returned'
                                  ? 'text-rose-700'
                                  : update.kind === 'completed'
                                    ? 'text-emerald-700'
                                    : 'text-amber-700'
                              }`}
                            >
                              {update.message}
                            </p>
                            {update.kind === 'returned' && update.comment && (
                              <p className="mt-0.5 text-[11px] text-slate-500 truncate">{update.comment}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!hasAnyNotification && (
                    <p className="px-4 py-6 text-center text-xs text-slate-400">ยังไม่มีการแจ้งเตือน</p>
                  )}
                </div>

                {pendingApprovalNotifs.length > 0 && (
                  <div className="px-4 pt-2 border-t border-slate-100 text-center">
                    <button
                      onClick={() => {
                        setIsEmailSimulatorModalOpen(true);
                        setOpenMenu(null);
                      }}
                      className="text-xs font-bold text-red-600 hover:text-red-800 cursor-pointer"
                    >
                      เปิดดูการจำลอง Action-Driven Email ทั้งหมด
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Profile Avatar with Persona Switcher */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('persona')}
              aria-expanded={openMenu === 'persona'}
              title="สลับบทบาทผู้ใช้ตามโครงสร้างองค์กร"
              className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-red-400 transition-all focus:outline-hidden cursor-pointer"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-red-600/30"
              />
              <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
            </button>

            {openMenu === 'persona' && (
              <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50">
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
                          setOpenMenu(null);
                        }}
                        className={`w-full px-3.5 py-2.5 text-left flex items-center gap-3 transition-colors cursor-pointer ${
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
      </div>

      {/* Mega Menu: หน่วยงานองค์กร (desktop, full width) */}
      {openMenu === 'dept' && (
        <div className="hidden lg:block absolute left-0 right-0 top-14 mt-px bg-white border-b border-slate-200 shadow-xl z-40">
          <div className="max-w-[1280px] mx-auto px-6 py-5">
            <div className="pb-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {DEPT_GROUP_LABEL} ({departments.length})
            </div>
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-2">
              {departments.map(dept => {
                const Icon = DEPT_ICONS[dept.id] || Laptop;
                const isActive = isDeptActive && activeDept?.id === dept.id;
                return (
                  <button
                    key={dept.id}
                    onClick={() => goTo('department_view', dept.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-4 text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-red-50 border-red-600'
                        : 'border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-white text-red-600' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block text-sm leading-snug ${
                          isActive ? 'font-bold text-red-700' : 'font-semibold text-slate-800'
                        }`}
                      >
                        {dept.nameEn}
                      </span>
                      <span className="block text-[11px] text-slate-400 truncate">{dept.nameTh}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile / Tablet: vertical accordion menu */}
      {openMenu === 'mobile' && (
        <nav
          aria-label="เมนูหลัก"
          className="lg:hidden absolute left-0 right-0 top-14 mt-px max-h-[calc(100vh-3.5rem)] overflow-y-auto bg-white border-b border-slate-200 shadow-xl z-40 px-3 py-2 select-none"
        >
          <button
            onClick={() => goTo('my_workspace')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-l-4 text-sm text-left cursor-pointer ${
              isHomeActive
                ? 'bg-red-50 text-red-700 font-bold border-red-600'
                : 'border-transparent text-slate-700 font-medium hover:bg-slate-50'
            }`}
          >
            <Home className={`w-4 h-4 ${isHomeActive ? 'text-red-600' : 'text-slate-500'}`} />
            <span>{HOME_LABEL}</span>
          </button>

          {/* Accordion: หน่วยงานองค์กร */}
          <button
            onClick={() => setMobileSection(prev => (prev === 'dept' ? null : 'dept'))}
            aria-expanded={mobileSection === 'dept'}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border-l-4 border-transparent text-sm text-left cursor-pointer hover:bg-slate-50 ${
              isDeptActive ? 'text-red-700 font-bold' : 'text-slate-700 font-medium'
            }`}
          >
            <span>
              {DEPT_GROUP_LABEL} ({departments.length})
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${mobileSection === 'dept' ? 'rotate-180' : ''}`}
            />
          </button>
          {mobileSection === 'dept' && (
            <div className="pl-3 pb-1 space-y-0.5">
              {departments.map(dept => {
                const Icon = DEPT_ICONS[dept.id] || Laptop;
                const isActive = isDeptActive && activeDept?.id === dept.id;
                return (
                  <button
                    key={dept.id}
                    onClick={() => goTo('department_view', dept.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border-l-4 text-left cursor-pointer ${
                      isActive ? 'bg-red-50 border-red-600' : 'border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-red-600' : 'text-slate-400'}`} />
                    <span className="min-w-0">
                      <span
                        className={`block text-xs leading-snug ${
                          isActive ? 'font-bold text-red-700' : 'font-medium text-slate-700'
                        }`}
                      >
                        {dept.nameEn}
                      </span>
                      <span className="block text-[10px] text-slate-400 truncate">{dept.nameTh}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={() => goTo('knowledge_base')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-l-4 text-sm text-left cursor-pointer ${
              isKbActive
                ? 'bg-red-50 text-red-700 font-bold border-red-600'
                : 'border-transparent text-slate-700 font-medium hover:bg-slate-50'
            }`}
          >
            <BookOpen className={`w-4 h-4 ${isKbActive ? 'text-red-600' : 'text-slate-500'}`} />
            <span>{KB_LABEL}</span>
          </button>

          {/* Accordion: การจัดการระบบ (only the screens this user may open) */}
          {adminItems.length > 0 && (
          <>
          <button
            onClick={() => setMobileSection(prev => (prev === 'admin' ? null : 'admin'))}
            aria-expanded={mobileSection === 'admin'}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border-l-4 border-transparent text-sm text-left cursor-pointer hover:bg-slate-50 ${
              activeAdminItem ? 'text-red-700 font-bold' : 'text-slate-700 font-medium'
            }`}
          >
            <span>{ADMIN_GROUP_LABEL}</span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${mobileSection === 'admin' ? 'rotate-180' : ''}`}
            />
          </button>
          {mobileSection === 'admin' && (
            <div className="pl-3 pb-1 space-y-0.5">
              {adminItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.tab;
                return (
                  <button
                    key={item.tab}
                    onClick={() => goTo(item.tab)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border-l-4 text-xs text-left cursor-pointer ${
                      isActive
                        ? 'bg-red-50 text-red-700 font-bold border-red-600'
                        : 'border-transparent text-slate-700 font-medium hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-red-600' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          )}
          </>
          )}
        </nav>
      )}

      {/* Breadcrumb */}
      <div className="border-t border-slate-100 bg-slate-50/70">
        <ol
          aria-label="Breadcrumb"
          className="max-w-[1280px] mx-auto px-4 sm:px-6 h-8 flex items-center gap-1.5 text-xs text-slate-500 min-w-0"
        >
          {breadcrumb.map((label, index) => {
            const isLast = index === breadcrumb.length - 1;
            return (
              <li key={label} className="flex items-center gap-1.5 min-w-0">
                {index > 0 && <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />}
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={`truncate ${isLast ? 'font-bold text-red-700' : ''}`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </header>
  );
};
