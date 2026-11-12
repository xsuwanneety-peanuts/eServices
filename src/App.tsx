/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { AccessControlView } from './components/AccessControlView';
import { WorkflowBuilderView } from './components/WorkflowBuilderView';
import { TraceabilityCenterView } from './components/TraceabilityCenterView';
import { DepartmentWorkspaceView } from './components/DepartmentWorkspaceView';
import { NewRequestModal } from './components/NewRequestModal';
import { EmailSimulatorModal } from './components/EmailSimulatorModal';
import { RequestDetailModal } from './components/RequestDetailModal';
import { PrintSlipModal } from './components/PrintSlipModal';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

const AppContent: React.FC = () => {
  const { activeTab, toast } = useApp();

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 text-slate-800 overflow-hidden">
      {/* Top Header Navbar fixed at the top */}
      <Navbar />

      {/* Main Layout: Left Sidebar + Main Viewport Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Scrollable Main Workspace Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 bg-slate-50/60">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'my_workspace' && <DashboardView />}
            {activeTab === 'access_control' && <AccessControlView />}
            {activeTab === 'workflow_builder' && <WorkflowBuilderView />}
            {activeTab === 'traceability_center' && <TraceabilityCenterView />}
            {activeTab === 'department_view' && <DepartmentWorkspaceView />}
          </div>
        </main>
      </div>

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
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
