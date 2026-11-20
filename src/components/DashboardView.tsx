import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DocumentRequest, RequestDraft } from '../types';
import { askConfirm } from './ConfirmDialog';
import {
  FilePen,
  Trash2,
  ChevronRight,
  ShieldCheck,
  Search,
  ArrowRight,
  Inbox,
  Printer,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    requests,
    setActiveRequestId,
    setIsPrintModalOpen,
    currentUser,
    isSystemAdmin,
    canApprove,
    approvalQueue,
    isLinkedAccount,
    setActiveTab,
    requestDrafts,
    openDraft,
    deleteRequestDraft,
    menuPermissions,
    showToast,
  } = useApp();

  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'drafts'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const showingDrafts = filterStatus === 'drafts';

  // Drafts are always the person's own, also for admins
  const filteredDrafts = requestDrafts.filter(d => {
    const q = searchQuery.trim().toLowerCase();
    return !q || d.title.toLowerCase().includes(q) || d.formName.toLowerCase().includes(q);
  });
  const resumeDraft = (draft: RequestDraft) => {
    if (!menuPermissions.some(f => f.id === draft.formId)) {
      showToast('แบบฟอร์มของฉบับร่างนี้ถูกลบไปแล้ว เปิดต่อไม่ได้', 'warning');
      return;
    }
    openDraft(draft);
  };
  const removeDraft = async (draft: RequestDraft) => {
    const ok = await askConfirm({
      title: 'ลบฉบับร่างนี้?',
      message: `"${draft.title || draft.formName}" จะถูกลบถาวร`,
      confirmLabel: 'ลบฉบับร่าง',
      danger: true,
    });
    if (ok) deleteRequestDraft(draft.id);
  };

  // Requests this person approved at some step (not counting submitting their own)
  const myEmail = currentUser.email.toLowerCase();
  const iApproved = (req: DocumentRequest) =>
    !!myEmail &&
    req.steps.some((s, idx) => idx > 0 && s.status === 'approved' && s.approverEmail.toLowerCase() === myEmail);
  const isOpen = (req: DocumentRequest) => req.status === 'in_review' || req.status === 'pending';
  // "อนุมัติแล้ว": fully approved, or approved by me at my step even while it moves on
  const isApprovedForMe = (req: DocumentRequest) => req.status === 'approved' || iApproved(req);

  // Requesters see what they submitted and what they approved; directors/admins see everything
  const scopedRequests = isSystemAdmin
    ? requests
    : requests.filter(r => r.requestorId === currentUser.id || iApproved(r));
  const pendingCount = scopedRequests.filter(r => isOpen(r) && !iApproved(r)).length;
  const approvedCount = scopedRequests.filter(isApprovedForMe).length;
  const listTitle = isSystemAdmin ? 'คำร้องทั้งหมด' : 'คำร้องของฉัน';

  // Filter requests
  const filteredRequests = useMemo(() => {
    return scopedRequests.filter(req => {
      if (filterStatus === 'pending' && (!isOpen(req) || iApproved(req))) return false;
      if (filterStatus === 'approved' && !isApprovedForMe(req)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = req.code.toLowerCase().includes(q);
        const matchesTitle = req.title.toLowerCase().includes(q);
        const matchesCat = req.category.toLowerCase().includes(q);
        const matchesSub = req.subCategory ? req.subCategory.toLowerCase().includes(q) : false;
        const matchesPerson = req.requestorName.toLowerCase().includes(q);
        return matchesCode || matchesTitle || matchesCat || matchesSub || matchesPerson;
      }

      return true;
    });
  }, [scopedRequests, filterStatus, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Admin signed in with an account that is not in the directory yet */}
      {!isLinkedAccount && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p>
            บัญชี <span className="font-mono">{currentUser.email}</span> ยังไม่มีใน Employee Directory
            ตอนนี้ใช้งานในฐานะผู้ดูแลระบบชั่วคราว
          </p>
          <button
            type="button"
            onClick={() => setActiveTab('employee_directory')}
            className="text-xs font-bold text-amber-900 underline hover:no-underline cursor-pointer shrink-0 self-start sm:self-auto"
          >
            เพิ่มพนักงานใน Employee Directory
          </button>
        </div>
      )}

      {/* Top Header / Welcome Banner */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          สวัสดี, {currentUser.name}
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {currentUser.position} · {currentUser.departmentName}
        </p>
      </div>

      {/* Approver queue: requests whose current step is waiting on this user */}
      {(canApprove || approvalQueue.length > 0) && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-red-200 shadow-xs space-y-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-red-600" />
            <h2 className="text-base font-bold text-slate-900">รอฉันอนุมัติ</h2>
            <span className="text-xs bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded-full">
              {approvalQueue.length}
            </span>
          </div>

          {approvalQueue.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {approvalQueue.map(req => (
                <button
                  key={req.id}
                  type="button"
                  onClick={() => setActiveRequestId(req.id)}
                  className="w-full py-3 px-3 rounded-xl hover:bg-red-50/40 cursor-pointer transition-colors text-left flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 whitespace-nowrap">
                        {req.code}
                      </span>
                      <span className="text-sm font-bold text-slate-800">{req.title}</span>
                    </span>
                    <span className="block text-xs text-slate-400 mt-1">
                      {req.requestorName} · {req.steps[req.currentStepIndex]?.stepTitle}
                    </span>
                  </span>
                  <ArrowRight className="hidden sm:block w-4 h-4 text-red-500 shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">ไม่มีรายการ</p>
          )}
        </div>
      )}

      {/* Main Section: Requests List */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        {/* Controls Bar: Filters & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">{showingDrafts ? 'ฉบับร่างของฉัน' : listTitle}</h2>

          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
            {/* Filter Tabs */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs overflow-x-auto">
              <button
                onClick={() => setFilterStatus('all')}
                className={`flex-1 sm:flex-none px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  filterStatus === 'all'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ทั้งหมด ({scopedRequests.length})
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`flex-1 sm:flex-none px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  filterStatus === 'pending'
                    ? 'bg-white text-amber-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                รอตรวจสอบ ({pendingCount})
              </button>
              <button
                onClick={() => setFilterStatus('approved')}
                className={`flex-1 sm:flex-none px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  filterStatus === 'approved'
                    ? 'bg-white text-red-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                อนุมัติแล้ว ({approvedCount})
              </button>
              <button
                onClick={() => setFilterStatus('drafts')}
                className={`flex-1 sm:flex-none px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  showingDrafts ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ฉบับร่าง ({requestDrafts.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-auto sm:min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ค้นหา"
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-red-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Drafts: saved but not sent to any approver yet */}
        {showingDrafts ? (
          filteredDrafts.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {filteredDrafts.map(draft => (
                <div
                  key={draft.id}
                  onClick={() => resumeDraft(draft)}
                  className="py-3.5 px-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-transparent hover:border-slate-200"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                        <FilePen className="w-3 h-3" />
                        ฉบับร่าง
                      </span>
                      <span className="text-xs font-semibold text-slate-500">{draft.formName}</span>
                    </div>
                    <h3
                      className={`text-sm font-bold group-hover:text-red-700 transition-colors ${
                        draft.title ? 'text-slate-800' : 'text-slate-400 italic'
                      }`}
                    >
                      {draft.title || 'ยังไม่มีหัวเรื่อง'}
                    </h3>
                    <p className="text-xs text-slate-400">บันทึกล่าสุด {draft.savedAt} · ยังไม่ส่งถึงผู้อนุมัติ</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 sm:self-center">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        resumeDraft(draft);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                    >
                      แก้ไขต่อ
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        removeDraft(draft);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="ลบฉบับร่าง"
                      aria-label="ลบฉบับร่าง"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                <FilePen className="w-6 h-6" />
              </div>
              <p className="text-sm text-slate-400">
                {requestDrafts.length === 0
                  ? 'ยังไม่มีฉบับร่าง กด "บันทึกฉบับร่าง" ในแบบฟอร์มเพื่อเก็บไว้ส่งทีหลัง'
                  : 'ไม่พบฉบับร่าง'}
              </p>
            </div>
          )
        ) : /* Requests List */
        filteredRequests.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredRequests.map(req => {
              const isPending = req.status === 'in_review' || req.status === 'pending';
              const isApproved = req.status === 'approved';
              const currentStep = req.steps[req.currentStepIndex];

              return (
                <div
                  key={req.id}
                  onClick={() => setActiveRequestId(req.id)}
                  className="py-3.5 px-3 rounded-xl hover:bg-red-50/20 cursor-pointer transition-colors group flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-transparent hover:border-red-200"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Priority Tag */}
                      {req.priority && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            req.priority === 'P1'
                              ? 'bg-red-600 text-white font-mono'
                              : req.priority === 'P2'
                              ? 'bg-orange-100 text-orange-800 font-mono'
                              : 'bg-slate-100 text-slate-700 font-mono'
                          }`}
                        >
                          {req.priority}
                        </span>
                      )}

                      {/* Code */}
                      <span className="text-xs font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 whitespace-nowrap">
                        {req.code}
                      </span>
                      {iApproved(req) && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                          ✓ ฉันอนุมัติแล้ว
                        </span>
                      )}

                    </div>

                    <h3 className="text-sm font-bold text-slate-800 group-hover:text-red-700 transition-colors">
                      {req.title}
                    </h3>

                    <p className="text-xs text-slate-400">
                      {(isSystemAdmin || req.requestorId !== currentUser.id) && <>{req.requestorName} · </>}
                      {req.createdAt.split(' ')[0]}
                      {isPending && currentStep && (
                        <span className="text-amber-700"> · {currentStep.stepTitle}</span>
                      )}
                    </p>
                  </div>

                  {/* Status & Action */}
                  <div className="flex items-center space-x-3 shrink-0 sm:self-center">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-800'
                          : isPending
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isApproved
                        ? 'อนุมัติแล้ว'
                        : isPending
                        ? 'รอตรวจสอบ'
                        : 'ตีกลับ'}
                    </span>

                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setActiveRequestId(req.id);
                        setIsPrintModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="ใบคำร้องอิเล็กทรอนิกส์ (PDF)"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-red-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
              <Inbox className="w-6 h-6" />
            </div>
            <p className="text-sm text-slate-400">
              {scopedRequests.length === 0 ? 'ยังไม่มีคำร้อง' : 'ไม่พบคำร้อง'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
