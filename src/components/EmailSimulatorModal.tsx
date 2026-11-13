import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { renderStepEmail } from '../utils/emailTemplate';
import {
  Mail,
  X,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  ArrowRight,
  ShieldCheck,
  Paperclip,
  Send,
  Sparkles,
  Inbox,
  AlertTriangle,
} from 'lucide-react';

export const EmailSimulatorModal: React.FC = () => {
  const {
    isEmailSimulatorModalOpen,
    setIsEmailSimulatorModalOpen,
    myNotifications,
    selectedNotification,
    setSelectedNotificationId,
    executeEmailAction,
    requests,
    setActiveRequestId,
  } = useApp();

  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [quickComment, setQuickComment] = useState('เห็นชอบอนุมัติผ่านระบบอัตโนมัติ');

  if (!isEmailSimulatorModalOpen) return null;

  // Only approval emails addressed to the current user are shown
  const emailNotifications = myNotifications;
  const currentEmail =
    emailNotifications.find(n => n.id === selectedNotification?.id) || emailNotifications[0];
  const matchedRequest = currentEmail
    ? requests.find(r => r.id === currentEmail.requestId)
    : null;

  // Standard approval email, addressed to the approver recorded on the notification
  const renderedEmail =
    currentEmail && matchedRequest
      ? renderStepEmail(currentEmail.stepTitle, currentEmail.recipientName, matchedRequest)
      : null;

  const handleApprove = () => {
    if (!currentEmail) return;
    executeEmailAction(currentEmail.id, 'approved', quickComment);
    setShowRejectInput(false);
  };

  const handleReject = () => {
    if (!currentEmail) return;
    if (!rejectReason.trim()) {
      alert('กรุณาระบุเหตุผลการตีกลับ');
      return;
    }
    executeEmailAction(currentEmail.id, 'rejected', rejectReason);
    setShowRejectInput(false);
    setRejectReason('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="bg-red-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 text-white border border-white/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-red-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold tracking-tight">อีเมลขออนุมัติ</h3>
              </div>
              <p className="text-xs text-red-100">
                ตัวอย่างอีเมลที่ระบบจะส่งถึงผู้อนุมัติ — ตอนนี้ยังไม่ได้ส่งออกนอกระบบ กดอนุมัติหรือตีกลับได้จากที่นี่
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsEmailSimulatorModalOpen(false)}
            className="p-1.5 rounded-lg text-red-200 hover:text-white hover:bg-red-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Sidebar of emails + Email preview */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[460px]">
          {/* Email List Column (4 cols) */}
          <div className="md:col-span-4 border-r border-slate-200 bg-slate-50/50 flex flex-col">
            <div className="p-3 border-b border-slate-200 bg-white">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Inbox className="w-3.5 h-3.5 text-red-600" />
                อีเมลขออนุมัติถึงคุณ ({emailNotifications.length})
              </span>
            </div>

            <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
              {emailNotifications.map(email => {
                const isSelected = currentEmail?.id === email.id;
                return (
                  <div
                    key={email.id}
                    onClick={() => {
                      setSelectedNotificationId(email.id);
                      setShowRejectInput(false);
                    }}
                    className={`p-3 cursor-pointer transition-colors text-left ${
                      isSelected
                        ? 'bg-red-50/80 border-l-4 border-red-600'
                        : 'hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-red-700">{email.requestCode}</span>
                      <span className="text-[10px] text-slate-400">{email.createdAt.split(' ')[1] || email.createdAt}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5 line-clamp-1">
                      {email.requestTitle}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      ถึง: {email.recipientName}
                    </p>
                    {email.actionTaken ? (
                      <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        ดำเนินการแล้ว: {email.actionTaken === 'approved' ? 'อนุมัติแล้ว' : 'ตีกลับแล้ว'}
                      </span>
                    ) : (
                      <span className="inline-block mt-1 text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                        รอการตัดสินใจ
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Email View Column (8 cols): Realistic Corporate Email Client Display */}
          <div className="md:col-span-8 p-5 overflow-y-auto bg-white flex flex-col justify-between">
            {currentEmail && matchedRequest ? (
              <div className="space-y-4">
                {/* Email Meta Header */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-slate-500">
                      จาก: <strong className="text-slate-800">{currentEmail.senderName}</strong> &lt;workflow@corp.th&gt;
                    </span>
                    <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                      <Clock className="w-3 h-3" />
                      {currentEmail.createdAt}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">
                      ถึง: <strong className="text-slate-800">{currentEmail.recipientName}</strong> &lt;{currentEmail.recipientEmail}&gt;
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200/80">
                    <span className="text-slate-500">หัวข้อ: </span>
                    <strong className="text-slate-900 text-sm">{renderedEmail?.subject}</strong>
                  </div>
                </div>

                {/* Email body text (configured per step in the workflow builder) */}
                <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed px-1">
                  {renderedEmail?.body}
                </p>

                {/* Email Interactive Document Card */}
                <div className="border-2 border-red-100 rounded-2xl p-5 bg-gradient-to-b from-red-50/20 to-white shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 block">
                        คำร้องขอในระบบ e-Service
                      </span>
                      <h4 className="text-base font-bold text-slate-900">{matchedRequest.title}</h4>
                    </div>
                    <span className="text-xs bg-red-50 text-red-700 border border-red-200 font-bold px-2.5 py-1 rounded-lg">
                      รหัส: {matchedRequest.code}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">ผู้ยื่นคำร้อง:</span>
                      <span className="font-semibold text-slate-800">{matchedRequest.requestorName}</span>
                      <span className="text-slate-500 block text-[11px]">{matchedRequest.requestorDepartment}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">ขั้นตอนปัจจุบัน:</span>
                      <span className="font-semibold text-amber-600">{currentEmail.stepTitle}</span>
                    </div>
                    {matchedRequest.amount && (
                      <div>
                        <span className="text-slate-400 block">วงเงินงบประมาณ:</span>
                        <span className="font-bold text-slate-900 text-sm">
                          ฿{matchedRequest.amount.toLocaleString()} บาท
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400 block">ระดับความเร่งด่วน:</span>
                      <span
                        className={`font-semibold ${
                          matchedRequest.urgency === 'high' || matchedRequest.urgency === 'critical' ? 'text-red-600' : 'text-slate-700'
                        }`}
                      >
                        {matchedRequest.urgency === 'critical' ? 'วิกฤต (Critical)' : matchedRequest.urgency === 'high' ? 'สูง (High)' : 'ปกติ (Medium)'}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700">
                    <span className="font-bold text-slate-800 block mb-1">วัตถุประสงค์และรายละเอียด:</span>
                    <p className="leading-relaxed">{matchedRequest.details}</p>
                  </div>

                  {/* Attachments */}
                  {matchedRequest.attachments && matchedRequest.attachments.length > 0 && (
                    <div>
                      <span className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                        <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                        เอกสารแนบประกอบการพิจารณา ({matchedRequest.attachments.length} ไฟล์):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {matchedRequest.attachments.map((att, i) => (
                          <div
                            key={i}
                            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs border border-slate-200"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            <span>{att.name}</span>
                            <span className="text-[10px] text-slate-400">({att.size})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Approve / return buttons */}
                  <div className="pt-4 border-t border-slate-200">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        ดำเนินการ:
                      </span>
                      <button
                        onClick={() => {
                          setActiveRequestId(matchedRequest.id);
                          setIsEmailSimulatorModalOpen(false);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        ดูรายละเอียดคำร้อง →
                      </button>
                    </div>

                    {currentEmail.actionTaken ? (
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1" />
                        <p className="text-xs font-bold text-emerald-800">
                          คุณได้ทำการ {currentEmail.actionTaken === 'approved' ? 'อนุมัติ' : 'ตีกลับ'} คำร้องนี้แล้ว
                        </p>
                        <p className="text-[11px] text-emerald-600 mt-0.5">
                          ระบบบันทึกการตัดสินใจและส่งต่อให้ขั้นตอนถัดไปแล้ว
                        </p>
                      </div>
                    ) : showRejectInput ? (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                        <label className="block text-xs font-bold text-rose-800">
                          ระบุเหตุผลการตีกลับ / ขอเอกสารเพิ่มเติม:
                        </label>
                        <textarea
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder="เช่น ขอให้แนบใบเสนอราคาเพิ่มอีก 1 เจ้า, วงเงินเกินงบประมาณที่ตั้งไว้..."
                          rows={2}
                          className="w-full text-xs p-2 rounded-lg border border-rose-300 focus:outline-hidden focus:ring-1 focus:ring-rose-500 bg-white"
                        />
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setShowRejectInput(false)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                          <button
                            onClick={handleReject}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer"
                          >
                            ยืนยันตีกลับคำร้อง
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        {/* Approve Button */}
                        <button
                          onClick={handleApprove}
                          className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>อนุมัติทันที (1-Click Approve)</span>
                        </button>

                        {/* Return/Reject Button */}
                        <button
                          onClick={() => setShowRejectInput(true)}
                          className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-semibold text-xs border border-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>ตีกลับพร้อมเหตุผล</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                <Mail className="w-10 h-10 mb-2 opacity-50" />
                <p>เลือกอีเมลจากรายการด้านซ้าย</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            ต้องเข้าสู่ระบบด้วยบัญชีของผู้อนุมัติจึงจะดำเนินการได้
          </span>
          <button
            onClick={() => setIsEmailSimulatorModalOpen(false)}
            className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-100 cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
