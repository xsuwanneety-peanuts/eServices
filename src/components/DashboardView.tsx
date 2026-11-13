import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
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
    myRequests,
    approvalQueue,
    isLinkedAccount,
    setActiveTab,
  } = useApp();

  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Requesters see only what they submitted; directors/admins see the whole system
  const scopedRequests = isSystemAdmin ? requests : myRequests;
  const pendingCount = scopedRequests.filter(r => r.status === 'in_review' || r.status === 'pending').length;
  const approvedCount = scopedRequests.filter(r => r.status === 'approved').length;
  const listTitle = isSystemAdmin ? 'คำร้องทั้งหมด' : 'คำร้องของฉัน';

  // Filter requests
  const filteredRequests = useMemo(() => {
    return scopedRequests.filter(req => {
      const isPending = req.status === 'in_review' || req.status === 'pending';
      const isApproved = req.status === 'approved';

      if (filterStatus === 'pending' && !isPending) return false;
      if (filterStatus === 'approved' && !isApproved) return false;

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
          <h2 className="text-base font-bold text-slate-900">{listTitle}</h2>

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

        {/* Requests List */}
        {filteredRequests.length > 0 ? (
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

                    </div>

                    <h3 className="text-sm font-bold text-slate-800 group-hover:text-red-700 transition-colors">
                      {req.title}
                    </h3>

                    <p className="text-xs text-slate-400">
                      {isSystemAdmin && <>{req.requestorName} · </>}
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
                      title="พิมพ์ใบสำคัญอิเล็กทรอนิกส์"
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
