import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RequestStatus } from '../types';
import {
  FileCheck2,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Printer,
  Calendar,
  Building,
  ShieldAlert,
} from 'lucide-react';

export const TraceabilityCenterView: React.FC = () => {
  const { requests, setActiveRequestId, departments } = useApp();

  const [statusFilter, setStatusFilter] = useState<'all' | RequestStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  const filteredRequests = requests.filter(req => {
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesDept = deptFilter === 'all' || req.departmentId === deptFilter;
    const matchesSearch =
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requestorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.priority && req.priority.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesDept && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-red-700 text-white flex items-center justify-center shadow-xs">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              100% Traceability: ตรวจสอบสถานะคำร้องไอที
            </h1>
            <span className="text-xs bg-red-50 text-red-700 font-bold px-2.5 py-0.5 rounded-full border border-red-200">
              Real-time ITIL Audit
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            <strong>Core Concept 4:</strong> โปร่งใส ตรวจสอบได้ เอกสารไม่หาย — เช็กสถานะคำร้องไอทีได้ตลอด 24 ชั่วโมงว่าติดอยู่ที่ใคร พร้อมลายเซ็นดิจิทัล
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ค้นหาเลขที่คำร้อง, หัวเรื่อง, ผู้ยื่น, P1/P2..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-red-500"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด ({requests.length})
          </button>
          <button
            onClick={() => setStatusFilter('in_review')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === 'in_review'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            รอตรวจสอบ ({requests.filter(r => r.status === 'in_review' || r.status === 'pending').length})
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === 'approved'
                ? 'bg-red-700 text-white shadow-xs'
                : 'bg-red-50 text-red-800 hover:bg-red-100'
            }`}
          >
            อนุมัติแล้ว ({requests.filter(r => r.status === 'approved').length})
          </button>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {filteredRequests.map(req => {
          const isPending = req.status === 'in_review' || req.status === 'pending';
          const isApproved = req.status === 'approved';
          const currentStep = req.steps[req.currentStepIndex];

          return (
            <div
              key={req.id}
              onClick={() => setActiveRequestId(req.id)}
              className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-red-500 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left Info */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-md border border-red-200">
                      {req.code}
                    </span>
                    {req.priority && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        req.priority === 'P1'
                          ? 'bg-red-600 text-white'
                          : req.priority === 'P2'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {req.priority}
                      </span>
                    )}
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                      {req.category}
                    </span>
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
                        ? '✓ อนุมัติและดำเนินการเสร็จสิ้น'
                        : isPending
                        ? `⏳ รอขั้นตอนที่ ${req.currentStepIndex + 1}/${req.steps.length}`
                        : '✕ ตีกลับ'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-red-700 transition-colors">
                    {req.title}
                  </h3>

                  <div className="flex flex-wrap items-center text-xs text-slate-500 gap-x-4 gap-y-1">
                    <span>
                      ผู้ยื่น: <strong>{req.requestorName}</strong> ({req.requestorDepartment})
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {req.createdAt}
                    </span>
                    {req.assignedTo && (
                      <>
                        <span>•</span>
                        <span className="text-red-700 font-semibold">
                          ผู้รับผิดชอบ: {req.assignedTo}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Bottleneck / Approval Progress Indicator */}
                <div className="lg:w-80 shrink-0 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                      ความคืบหน้าการลงนาม
                    </span>
                    <span className="font-bold text-red-700">
                      {isApproved ? '100%' : `${Math.round(((req.currentStepIndex) / req.steps.length) * 100)}%`}
                    </span>
                  </div>

                  {/* Visual Step Dots */}
                  <div className="flex items-center space-x-1.5 mb-2">
                    {req.steps.map((st, i) => (
                      <div
                        key={i}
                        title={`${st.stepTitle}: ${st.status}`}
                        className={`h-2 flex-1 rounded-full ${
                          st.status === 'approved'
                            ? 'bg-red-600'
                            : st.status === 'pending'
                            ? 'bg-amber-400 animate-pulse'
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Bottleneck text */}
                  {isPending && currentStep ? (
                    <div className="text-[11px] text-amber-800 truncate">
                      <span className="font-semibold">จุดคอขวด:</span> {currentStep.stepTitle}
                    </div>
                  ) : isApproved ? (
                    <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> ดำเนินการสมบูรณ์ครบทุกขั้นตอน
                    </div>
                  ) : (
                    <div className="text-[11px] text-rose-700">ถูกตีกลับแก้ไข</div>
                  )}
                </div>

                <div className="hidden lg:flex items-center pl-2">
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-red-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
