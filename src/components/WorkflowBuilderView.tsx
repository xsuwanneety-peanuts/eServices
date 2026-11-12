import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ApprovalStepConfig, StepApproverType } from '../types';
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
  Eye,
  Contact,
  AlertTriangle,
} from 'lucide-react';
import { EMAIL_SENDER_NAME, renderStepEmail } from '../utils/emailTemplate';
import { APPROVER_TYPE_LABELS, resolveStepApprover } from '../utils/approvers';

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
    myNotifications,
    requests,
    employees,
    canAccessTab,
    setActiveTab,
    showToast,
  } = useApp();

  // Short description of who approves a step, used in the diagram
  const approverDescription = (step: ApprovalStepConfig): string => {
    if (step.approverType === 'employee') {
      const person = employees.find(e => e.id === step.approverEmployeeId);
      return person ? `${person.name} (${person.position})` : 'ยังไม่ได้เลือกพนักงาน';
    }
    return APPROVER_TYPE_LABELS[step.approverType];
  };

  const [activeStepEditingId, setActiveStepEditingId] = useState<string | null>(null);

  if (!activeWorkflow) return null;

  // A real request of this form (if any) supplies the details shown in the email previews
  const previewRequest = requests.find(r => r.workflowId === activeWorkflow.id) ?? null;
  // One sample is enough: every step gets the same wording, so preview the first step that sends an email
  // (the first step of a flow is the requester, who gets none)
  const emailSteps = activeWorkflow.steps
    .filter((step, idx) => idx > 0 && step.sendEmailNotification)
    .slice(0, 1);

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
                        <span>{approverDescription(step)}</span>
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
              <h3 className="text-sm font-bold text-slate-900">กำหนดผู้อนุมัติ & การแจ้งเตือน</h3>
              <p className="text-xs text-slate-400">
                เลือกผู้อนุมัติจาก Employee Directory ระบบจะส่งอีเมลถึงผู้อนุมัติตามข้อมูลพนักงานในนั้น
              </p>
            </div>
            <button
              onClick={() => {
                if (myNotifications.length > 0) {
                  setSelectedNotificationId(myNotifications[0].id);
                  setIsEmailSimulatorModalOpen(true);
                } else {
                  showToast('ยังไม่มีอีเมลรออนุมัติที่ส่งถึงคุณ — ดูตัวอย่างอีเมลได้ที่ด้านล่างของหน้านี้', 'info');
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

                  {isFirst ? (
                    <p className="mt-3 text-xs text-slate-500">ผู้ยื่นคำร้อง — ระบบใช้ข้อมูลของพนักงานที่ส่งคำขอ</p>
                  ) : (
                    (() => {
                      const chosen =
                        step.approverType === 'employee'
                          ? employees.find(e => e.id === step.approverEmployeeId)
                          : undefined;
                      const selectClass =
                        'w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:border-red-500';
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">ผู้อนุมัติ</label>
                            <select
                              value={step.approverType}
                              onChange={e => {
                                const approverType = e.target.value as StepApproverType;
                                updateWorkflowStep(step.id, {
                                  approverType,
                                  approverEmployeeId:
                                    approverType === 'employee' ? step.approverEmployeeId ?? employees[0]?.id : undefined,
                                });
                              }}
                              className={selectClass}
                            >
                              {(['reports_to', 'reports_to_2', 'employee'] as StepApproverType[]).map(type => (
                                <option key={type} value={type}>
                                  {APPROVER_TYPE_LABELS[type]}
                                </option>
                              ))}
                            </select>
                          </div>

                          {step.approverType === 'employee' ? (
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                พนักงาน (ส่งอีเมลถึง)
                              </label>
                              <select
                                value={step.approverEmployeeId ?? ''}
                                onChange={e => updateWorkflowStep(step.id, { approverEmployeeId: e.target.value })}
                                className={selectClass}
                              >
                                {!chosen && <option value="">— เลือกพนักงาน —</option>}
                                {employees.map(person => (
                                  <option key={person.id} value={person.id}>
                                    {person.name} — {person.position}
                                  </option>
                                ))}
                              </select>
                              {chosen && (
                                <p className="mt-1 text-[11px] text-slate-400 font-mono break-all">{chosen.email}</p>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="block text-[11px] font-semibold text-slate-600 mb-1">ส่งอีเมลถึง</span>
                              <p className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 leading-relaxed">
                                ดึงจาก Report to ของผู้ยื่นแต่ละคนใน Employee Directory
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}

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

      {/* Outgoing email previews for the selected form — read-only, one standard wording */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-red-600" />
              ตัวอย่างอีเมลที่จะส่งออก — {activeWorkflow.formTitle}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              ทุกแบบฟอร์มและทุกขั้นตอนใช้ข้อความมาตรฐานชุดเดียวกัน ต่างกันเฉพาะผู้รับและรายละเอียดคำร้อง
              {previewRequest
                ? ` (ตัวอย่างนี้ใช้ข้อมูลจากคำร้อง ${previewRequest.code})`
                : ' (ยังไม่มีคำร้องของแบบฟอร์มนี้ จึงแสดงด้วยข้อมูลสมมติ)'}
            </p>
          </div>
          {canAccessTab('employee_directory') && (
            <button
              type="button"
              onClick={() => setActiveTab('employee_directory')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-800 cursor-pointer shrink-0"
            >
              <Contact className="w-3.5 h-3.5" />
              จัดการ Report to ใน Employee Directory
            </button>
          )}

        </div>

        {emailSteps.length > 0 ? (
          <div className="max-w-2xl">
            {emailSteps.map(step => {
              const approver = previewRequest
                ? resolveStepApprover(step, previewRequest.requestorId, employees)
                : step.approverType === 'employee'
                  ? employees.find(e => e.id === step.approverEmployeeId)
                  : undefined;
              const email = renderStepEmail(step.title, approver?.name, previewRequest);
              return (
                <div key={step.id} className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                  <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                      {step.stepIndex + 1}
                    </span>
                    <span className="font-bold text-slate-800 truncate">{step.title}</span>
                  </div>
                  <div className="p-3.5 space-y-2">
                    <p className="text-slate-500">
                      จาก: <span className="text-slate-800">{EMAIL_SENDER_NAME}</span>
                    </p>
                    <p className="text-slate-500 break-all">
                      ถึง:{' '}
                      {approver ? (
                        <span className="text-slate-800">
                          {approver.name} <span className="font-mono text-[11px]">&lt;{approver.email}&gt;</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {previewRequest
                            ? `ยังไม่มีผู้รับ — ${previewRequest.requestorName} ยังไม่ได้ตั้ง Report to`
                            : 'ผู้บังคับบัญชาของผู้ยื่น (ตาม Employee Directory)'}
                        </span>
                      )}
                    </p>
                    <p className="pt-2 border-t border-slate-100 font-bold text-slate-900 break-words">
                      {email.subject}
                    </p>
                    <p className="text-slate-700 whitespace-pre-line leading-relaxed break-words">{email.body}</p>
                    <div className="pt-1 flex flex-wrap gap-1.5">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold">
                        อนุมัติทันที
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 text-[11px] font-semibold">
                        ตีกลับพร้อมเหตุผล
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            แบบฟอร์มนี้ยังไม่มีขั้นตอนที่เปิดส่งอีเมลแจ้งเตือน
          </p>
        )}
      </div>
    </div>
  );
};
