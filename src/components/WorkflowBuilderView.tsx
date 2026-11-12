import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ApprovalStepConfig } from '../types';
import {
  GitBranch,
  ArrowDown,
  Mail,
  Plus,
  Trash2,
  ArrowUp,
  Save,
  Clock,
  Send,
} from 'lucide-react';

export const WorkflowBuilderView: React.FC = () => {
  const {
    workflows,
    selectedWorkflowId,
    setSelectedWorkflowId,
    activeWorkflow,
    updateWorkflowStep,
    addWorkflowStep,
    removeWorkflowStep,
    moveWorkflowStep,
    saveWorkflowChanges,
    setIsEmailSimulatorModalOpen,
    setSelectedNotificationId,
    emailNotifications,
    showToast,
  } = useApp();

  const [activeStepEditingId, setActiveStepEditingId] = useState<string | null>(null);

  if (!activeWorkflow) return null;

  return (
    <div className="space-y-5">
      {/* Header in Corporate Red */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-red-700 text-white flex items-center justify-center shadow-xs">
              <GitBranch className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              ตั้งค่า Flow อนุมัติ & แจ้งเตือนอีเมล
            </h1>
            <span className="text-xs bg-red-50 text-red-700 font-bold px-2.5 py-0.5 rounded-full border border-red-200">
              No-Code ITIL Workflows
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            <strong>Core Concept 2:</strong> ปรับเปลี่ยนลำดับสายการอนุมัติของแบบฟอร์มไอทีทั้ง 5 ด้านได้อย่างอิสระ ระบุผู้รับผิดชอบ และเปิดระบบแจ้งเตือนอีเมลอัตโนมัติ
          </p>
        </div>

        {/* Workflow Selector & Save */}
        <div className="flex items-center space-x-2 shrink-0">
          <select
            value={selectedWorkflowId}
            onChange={e => setSelectedWorkflowId(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-hidden focus:border-red-500 shadow-xs"
          >
            {workflows.map(wf => (
              <option key={wf.id} value={wf.id}>
                {wf.formTitle}
              </option>
            ))}
          </select>

          <button
            onClick={saveWorkflowChanges}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>อัปเดตและบันทึก</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout (Matching Bottom-Right Mockup in Red) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (5 cols): Visual Flowchart Nodes */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                ผังสายการอนุมัติ (Visual Diagram)
              </span>
              <span className="text-xs bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded-md">
                {activeWorkflow.steps.length} ขั้นตอน
              </span>
            </div>

            {/* Visual Node Flow (Vertical list matching mockup) */}
            <div className="space-y-3">
              {activeWorkflow.steps.map((step, idx) => {
                const isFirst = idx === 0;
                const isSelected = activeStepEditingId === step.id;

                return (
                  <React.Fragment key={step.id}>
                    <div
                      onClick={() => setActiveStepEditingId(step.id)}
                      className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-red-600 bg-red-50/70 shadow-xs ring-1 ring-red-500'
                          : isFirst
                          ? 'border-slate-300 bg-slate-50 hover:border-red-300'
                          : 'border-slate-200 bg-white hover:border-red-400 hover:shadow-xs'
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        {isFirst ? 'จุดเริ่มต้น' : `ลำดับที่ ${idx + 1}`}
                      </div>
                      <div className="text-sm font-bold text-slate-800">{step.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center justify-center gap-1">
                        <span>{step.roleName}</span>
                        {step.sendEmailNotification && (
                          <Mail className="w-3 h-3 text-red-600 inline ml-1" />
                        )}
                      </div>
                    </div>

                    {/* Arrow down between nodes */}
                    {idx < activeWorkflow.steps.length - 1 && (
                      <div className="flex justify-center text-slate-400 py-0.5">
                        <ArrowDown className="w-5 h-5 text-red-500 animate-bounce" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Add Step Button */}
          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={() => addWorkflowStep(activeWorkflow.steps.length - 1)}
              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-red-400 text-red-700 bg-red-50/40 hover:bg-red-50 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มขั้นตอนในสายการอนุมัติ (Add Step)</span>
            </button>
          </div>
        </div>

        {/* Right Column (7 cols): Step Configuration Panel */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">กำหนดรายละเอียดผู้อนุมัติ & การแจ้งเตือน</h3>
              <p className="text-xs text-slate-400">ระบุอีเมลหรือตำแหน่งงานที่ต้องการให้เอกสารส่งถึงโดยอัตโนมัติ</p>
            </div>
            <button
              onClick={() => {
                if (emailNotifications.length > 0) {
                  setSelectedNotificationId(emailNotifications[0].id);
                  setIsEmailSimulatorModalOpen(true);
                } else {
                  showToast('ยังไม่มีอีเมลในกล่องจำลอง', 'info');
                }
              }}
              className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Send className="w-3 h-3" />
              <span>ทดสอบหน้าจออีเมลผู้อนุมัติ</span>
            </button>
          </div>

          {/* List of configurable steps */}
          <div className="space-y-3.5">
            {activeWorkflow.steps.map((step, idx) => {
              const isFirst = idx === 0;

              return (
                <div
                  key={step.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isFirst ? 'bg-slate-50/60 border-slate-200' : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800">{step.title}</span>
                    </div>

                    {!isFirst && (
                      <div className="flex items-center space-x-1 self-end sm:self-auto">
                        <button
                          onClick={() => moveWorkflowStep(step.id, 'up')}
                          disabled={idx <= 1}
                          title="เลื่อนขึ้น"
                          className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveWorkflowStep(step.id, 'down')}
                          disabled={idx >= activeWorkflow.steps.length - 1}
                          title="เลื่อนลง"
                          className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeWorkflowStep(step.id)}
                          title="ลบขั้นตอนนี้"
                          className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        ตำแหน่ง / ผู้มีอำนาจ
                      </label>
                      <input
                        type="text"
                        value={step.roleName}
                        disabled={isFirst}
                        onChange={e => updateWorkflowStep(step.id, { roleName: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 text-slate-800 focus:outline-hidden focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        อีเมลแจ้งเตือน (Email Routing)
                      </label>
                      <input
                        type="email"
                        value={step.assigneeEmail}
                        disabled={isFirst}
                        onChange={e => updateWorkflowStep(step.id, { assigneeEmail: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 text-slate-800 focus:outline-hidden focus:border-red-500 font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  {!isFirst && (
                    <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <label className="inline-flex items-center space-x-2 cursor-pointer text-xs font-semibold text-slate-800">
                        <input
                          type="checkbox"
                          checked={step.sendEmailNotification}
                          onChange={e =>
                            updateWorkflowStep(step.id, { sendEmailNotification: e.target.checked })
                          }
                          className="w-4 h-4 rounded text-red-600 border-slate-300 focus:ring-red-500 cursor-pointer"
                        />
                        <span className="flex items-center gap-1 text-slate-800">
                          <Mail className="w-3.5 h-3.5 text-red-600" />
                          ส่ง Email แจ้งเตือนอัตโนมัติ (Action-Driven Notification)
                        </span>
                      </label>

                      <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>SLA: {step.slaHours || 24} ชม.</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Save Button */}
          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              onClick={saveWorkflowChanges}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>อัปเดตและบันทึก</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
