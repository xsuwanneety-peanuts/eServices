import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  User,
  Paperclip,
  Printer,
  ShieldCheck,
  Send,
  CornerDownRight,
  Stamp,
  Calendar,
  Building,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';

export const RequestDetailModal: React.FC = () => {
  const {
    activeRequest,
    setActiveRequestId,
    approveRequest,
    rejectRequest,
    currentUser,
    setIsPrintModalOpen,
    canActOnRequest,
    resubmitRequest,
  } = useApp();

  // Fixing a returned request
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDetails, setEditDetails] = useState('');
  const [editNote, setEditNote] = useState('');

  const [approveComment, setApproveComment] = useState('เห็นชอบอนุมัติ');
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  if (!activeRequest) return null;

  const currentStep = activeRequest.steps[activeRequest.currentStepIndex];
  const isPending = activeRequest.status === 'in_review' || activeRequest.status === 'pending';
  const isApproved = activeRequest.status === 'approved';
  const isReturned = activeRequest.status === 'returned';
  // Only the person responsible for the current step may approve or return it
  const canDecide = canActOnRequest(activeRequest);
  // The requester can fix a returned request and send it again
  const canResubmit = isReturned && activeRequest.requestorId === currentUser.id;
  const returnedStep = activeRequest.steps.find(s => s.status === 'rejected');

  const startEditing = () => {
    setEditTitle(activeRequest.title);
    setEditDetails(activeRequest.details);
    setEditNote('');
    setIsEditing(true);
  };

  const handleResubmit = () => {
    if (!editTitle.trim()) {
      alert('กรุณากรอกหัวเรื่อง');
      return;
    }
    resubmitRequest(activeRequest.id, {
      title: editTitle.trim(),
      details: editDetails.trim(),
      note: editNote.trim(),
    });
    setIsEditing(false);
  };

  const handleApprove = () => {
    approveRequest(activeRequest.id, approveComment);
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      alert('กรุณากรอกเหตุผลการตีกลับ');
      return;
    }
    rejectRequest(activeRequest.id, rejectReason);
    setIsRejecting(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-red-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-white border border-white/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-red-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold tracking-tight">รายละเอียดคำร้อง</h3>
              </div>
              <p className="text-xs text-red-100">
                รหัสคำร้อง: <strong className="text-white font-mono">{activeRequest.code}</strong> • {activeRequest.category}
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveRequestId(null)}
            className="p-1.5 rounded-lg text-red-200 hover:text-white hover:bg-red-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Top Status & Summary Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 [&>span]:whitespace-nowrap [&>span]:max-w-full [&>span]:truncate">
                {activeRequest.priority && (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    activeRequest.priority === 'P1'
                      ? 'bg-red-600 text-white'
                      : activeRequest.priority === 'P2'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-slate-200 text-slate-800'
                  }`}>
                    {activeRequest.priority}
                  </span>
                )}
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                  {activeRequest.category}
                </span>
                {activeRequest.subCategory && (
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {activeRequest.subCategory.split('(')[0].trim()}
                  </span>
                )}
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    isApproved
                      ? 'bg-emerald-100 text-emerald-800'
                      : isPending
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {isApproved
                    ? '✓ ผ่านการอนุมัติสมบูรณ์'
                    : isPending
                    ? '⏳ อยู่ระหว่างการตรวจสอบ'
                    : '✕ ตีกลับคำร้อง'}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-2">{activeRequest.title}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ยื่นโดย: <strong>{activeRequest.requestorName}</strong> ({activeRequest.requestorDepartment}) • เมื่อ {activeRequest.createdAt}
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>พิมพ์ใบคำร้องอิเล็กทรอนิกส์</span>
              </button>
            </div>
          </div>

          {/* Where the request is waiting now */}
          {isPending && currentStep && (
            <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  จุดคอขวดปัจจุบัน (Current Bottleneck):
                </p>
                <p className="text-amber-800 mt-0.5">
                  เอกสารอยู่ที่ขั้นตอนที่ {activeRequest.currentStepIndex + 1}: <strong>{currentStep.stepTitle}</strong> ({currentStep.approverRole || currentStep.approverName})
                  — ระบบแจ้งเตือนผู้อนุมัติในระบบแล้ว
                </p>
              </div>
            </div>
          )}

          {/* Details & Attachments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 font-medium">รายละเอียดคำร้อง:</span>
              <p className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-line">
                {activeRequest.details}
              </p>
            </div>

            <div className="space-y-3">
              {activeRequest.amount && (
                <div>
                  <span className="text-slate-400 font-medium">วงเงินงบประมาณ:</span>
                  <p className="text-base font-extrabold text-blue-700">
                    ฿{activeRequest.amount.toLocaleString()} บาท
                  </p>
                </div>
              )}

              {activeRequest.attachments && activeRequest.attachments.length > 0 && (
                <div>
                  <span className="text-slate-400 font-medium block mb-1">
                    เอกสารแนบ ({activeRequest.attachments.length}):
                  </span>
                  <div className="space-y-1.5">
                    {activeRequest.attachments.map((att, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="font-medium truncate">{att.name}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 shrink-0">{att.size}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Approval history */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>ประวัติการอนุมัติ</span>
              </h4>

            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {activeRequest.steps.map((st, idx) => {
                const isStepApproved = st.status === 'approved';
                const isStepPending = st.status === 'pending';
                const isStepRejected = st.status === 'rejected';

                return (
                  <div key={idx} className="relative group">
                    {/* Circle icon on the vertical line */}
                    <div
                      className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white ${
                        isStepApproved
                          ? 'bg-emerald-500 text-white'
                          : isStepPending
                          ? 'bg-amber-500 text-white animate-pulse'
                          : isStepRejected
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {isStepApproved ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : isStepPending ? (
                        <Clock className="w-3 h-3" />
                      ) : (
                        <span className="text-[10px] font-bold">{idx + 1}</span>
                      )}
                    </div>

                    {/* Step Card Content */}
                    <div
                      className={`p-3.5 rounded-xl border text-xs transition-all ${
                        isStepApproved
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : isStepPending
                          ? 'bg-amber-50/50 border-amber-300 shadow-xs'
                          : isStepRejected
                          ? 'bg-rose-50/40 border-rose-200'
                          : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900">{st.stepTitle}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              isStepApproved
                                ? 'bg-emerald-100 text-emerald-800'
                                : isStepPending
                                ? 'bg-amber-100 text-amber-800'
                                : isStepRejected
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {isStepApproved
                              ? 'ประทับตราแล้ว'
                              : isStepPending
                              ? 'รอพิจารณา'
                              : isStepRejected
                              ? 'ส่งคืน / ตีกลับ'
                              : 'รอคิว'}
                          </span>
                        </div>

                        {st.timestamp && (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {st.timestamp}
                          </span>
                        )}
                      </div>

                      <div className="text-slate-600 mt-1">
                        ผู้อนุมัติ: <strong className="text-slate-800">{st.approverName}</strong> ({st.approverRole})
                      </div>

                      {st.comment && (
                        <div className="mt-2 p-2 rounded-lg bg-white/80 border border-slate-200 text-slate-700 italic">
                          "{st.comment}"
                        </div>
                      )}

                      {/* Official Digital Signature Hash Stamp */}
                      {st.digitalSignatureHash && (
                        <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                            <Stamp className="w-3 h-3" />
                            ประทับตราดิจิทัลสมบูรณ์
                          </span>
                          <span className="truncate max-w-[200px]">{st.digitalSignatureHash}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Action Area — shown only to the approver of the current step */}
          {isPending && canDecide && (
            <div className="p-4 rounded-xl border-2 border-red-200 bg-red-50/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-950 flex items-center gap-1.5">
                  <Stamp className="w-4 h-4 text-red-600" />
                  การตัดสินใจในฐานะผู้อนุมัติ (Authorized Approver Panel):
                </span>
                <span className="text-[11px] text-red-800">
                  กำลังพิจารณาในชื่อ: <strong>{currentUser.name}</strong>
                </span>
              </div>

              {isRejecting ? (
                <div className="space-y-2">
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="ระบุข้อความตีกลับ เพื่อให้ผู้ยื่นแก้ไขเอกสาร..."
                    rows={2}
                    className="w-full text-xs p-2.5 rounded-lg border border-rose-300 focus:outline-hidden bg-white"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setIsRejecting(false)}
                      className="px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-700 cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={handleReject}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                    >
                      ยืนยันการส่งคืน/ตีกลับ
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={handleApprove}
                    className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ประทับตราอนุมัติทันที (Digital Approve)</span>
                  </button>
                  <button
                    onClick={() => setIsRejecting(true)}
                    className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-white hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-semibold text-xs border border-slate-300 cursor-pointer"
                  >
                    ตีกลับแก้ไข
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Returned to the requester: fix and send again */}
        {canResubmit && (
          <div className="p-4 rounded-xl border-2 border-rose-200 bg-rose-50/40 space-y-3 text-xs">
            <div>
              <p className="font-bold text-rose-900">คำร้องนี้ถูกตีกลับ</p>
              {returnedStep && (
                <p className="text-rose-800 mt-0.5">
                  ขั้น "{returnedStep.stepTitle}" โดย {returnedStep.approverName}:{' '}
                  {(returnedStep.comment ?? '').replace(/^ตีกลับ: /, '') || 'ไม่ได้ระบุเหตุผล'}
                </p>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2.5">
                <div>
                  <label htmlFor="rs-title" className="block font-semibold text-slate-700 mb-1">
                    หัวเรื่อง
                  </label>
                  <input
                    id="rs-title"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:border-red-500"
                  />
                </div>
                <div>
                  <label htmlFor="rs-details" className="block font-semibold text-slate-700 mb-1">
                    รายละเอียด
                  </label>
                  <textarea
                    id="rs-details"
                    rows={4}
                    value={editDetails}
                    onChange={e => setEditDetails(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:border-red-500"
                  />
                </div>
                <div>
                  <label htmlFor="rs-note" className="block font-semibold text-slate-700 mb-1">
                    แก้ไขอะไรไป (ไม่บังคับ)
                  </label>
                  <input
                    id="rs-note"
                    value={editNote}
                    onChange={e => setEditNote(e.target.value)}
                    placeholder="เช่น แนบใบเสนอราคาเพิ่มแล้ว"
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:border-red-500"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleResubmit}
                    className="px-3 py-1.5 rounded-lg font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                  >
                    ส่งใหม่
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={startEditing}
                className="px-4 py-2 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs cursor-pointer"
              >
                แก้ไขแล้วส่งใหม่
              </button>
            )}
          </div>
        )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>อัปเดตล่าสุด: {activeRequest.updatedAt}</span>
          <button
            onClick={() => setActiveRequestId(null)}
            className="px-4 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-100 cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
