/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthGate, FullScreenLoader, useAuth } from './components/AuthGate';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { AccessControlView } from './components/AccessControlView';
import { WorkflowBuilderView } from './components/WorkflowBuilderView';
import { EmployeeDirectoryView } from './components/EmployeeDirectoryView';
import { DepartmentWorkspaceView } from './components/DepartmentWorkspaceView';
import { KnowledgeBaseView } from './components/KnowledgeBaseView';
import { NewRequestModal } from './components/NewRequestModal';
import { EmailSimulatorModal } from './components/EmailSimulatorModal';
import { RequestDetailModal } from './components/RequestDetailModal';
import { PrintSlipModal } from './components/PrintSlipModal';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

const AppContent: React.FC = () => {
  const { activeTab, toast, dataReady, employees } = useApp();
  const { isAdminLogin, signOutUser } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  if (!dataReady) return <FullScreenLoader message="กำลังโหลดข้อมูล..." />;

  // Fresh project before the first admin sign-in has filled in the starting data
  if (employees.length === 0) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-2xl font-black text-red-700">e-Service</p>
          <p className="text-sm font-bold text-slate-800">
            {isAdminLogin ? 'กำลังตั้งค่าข้อมูลเริ่มต้น...' : 'ระบบยังไม่มีข้อมูล'}
          </p>
          <p className="text-xs text-slate-500">
            {isAdminLogin
              ? 'ถ้าค้างอยู่หน้านี้ ให้ตรวจว่าตั้ง Firestore rules และอีเมลผู้ดูแลระบบถูกต้อง'
              : 'ผู้ดูแลระบบต้องเข้าสู่ระบบครั้งแรกเพื่อตั้งค่าข้อมูลก่อน'}
          </p>
          <button
            type="button"
            onClick={signOutUser}
            className="text-xs font-bold text-red-600 hover:text-red-800 cursor-pointer"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 text-slate-800 overflow-hidden">
      {/* Top Navigation Bar + Mega Menu, pinned above the scrolling content */}
      <Navbar scrolled={isScrolled} />

      {/* Scrollable Main Workspace Content (full width, centered, max 1280px) */}
      <main
        onScroll={event => setIsScrolled(event.currentTarget.scrollTop > 4)}
        className="flex-1 overflow-y-auto py-4 sm:py-6 lg:py-7 bg-slate-50/60"
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          {activeTab === 'my_workspace' && <DashboardView />}
          {activeTab === 'access_control' && <AccessControlView />}
          {activeTab === 'workflow_builder' && <WorkflowBuilderView />}
          {activeTab === 'employee_directory' && <EmployeeDirectoryView />}
          {activeTab === 'department_view' && <DepartmentWorkspaceView />}
          {activeTab === 'knowledge_base' && <KnowledgeBaseView />}
        </div>
      </main>

      {/* Global Modals */}
      <NewRequestModal />
      <EmailSimulatorModal />
      <RequestDetailModal />
      <PrintSlipModal />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-5 duration-200">
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
          <span className="text-xs sm:text-sm font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthGate>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthGate>
  );
}
