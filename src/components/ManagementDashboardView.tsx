import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  computeDashboardStats,
  formatWait,
  formKeyOf,
  PERIOD_LABELS,
  type DashboardFilters,
  type DashboardPeriod,
} from '../utils/dashboardStats';
import { AlertTriangle, BarChart3, CheckCircle2, Clock, FileText, Hourglass, Users } from 'lucide-react';

// Management dashboard: an overview of every request for ผู้บริหาร and ผู้ดูแลระบบ. The home page
// (เมนูของฉัน) stays each person's own view; this one shows where work is stuck across the company.

const card = 'bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs';
const selectClass =
  'h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 focus:outline-hidden focus:border-red-400 cursor-pointer';

const days = (n: number) => (n < 1 ? '< 1 วัน' : `${n.toFixed(1)} วัน`);

export const ManagementDashboardView: React.FC = () => {
  const { requests, workflows, menuPermissions, departments, setActiveRequestId } = useApp();
  const [filters, setFilters] = useState<DashboardFilters>({ period: 'month', departmentId: 'all', formKey: 'all' });
  const [showAllWaiting, setShowAllWaiting] = useState(false);

  const formLabel = useMemo(() => {
    const names = new Map<string, string>();
    menuPermissions.forEach(f => names.set(f.id, f.menuName));
    return (key: string) =>
      key.startsWith('cat:') ? key.slice(4) || 'ไม่ระบุ' : names.get(key) ?? workflows.find(w => w.formId === key)?.formTitle ?? key;
  }, [menuPermissions, workflows]);

  // Forms that have at least one request, for the filter
  const formOptions = useMemo(() => {
    const keys = [...new Set(requests.map(formKeyOf))];
    return keys.map(key => ({ key, label: formLabel(key) })).sort((a, b) => a.label.localeCompare(b.label, 'th'));
  }, [requests, formLabel]);

  const stats = useMemo(
    () => computeDashboardStats(requests, workflows, filters, formLabel),
    [requests, workflows, filters, formLabel]
  );

  const waitingShown = showAllWaiting ? stats.waiting : stats.waiting.slice(0, 6);
  const maxMonth = Math.max(1, ...stats.months.map(m => m.count));
  const maxDept = Math.max(1, ...stats.byDepartment.map(d => d.count));
  const maxHolder = Math.max(1, ...stats.holders.map(h => h.count));
  const maxDays = Math.max(1, ...stats.formTimings.map(f => f.avgDays));

  const tiles = [
    { label: `คำร้อง${PERIOD_LABELS[filters.period]}`, value: stats.total, icon: FileText, tone: 'text-slate-900' },
    { label: 'กำลังดำเนินการ', value: stats.open, icon: Hourglass, tone: 'text-amber-700' },
    { label: 'เกินเวลาที่กำหนด', value: stats.overdue, icon: AlertTriangle, tone: stats.overdue ? 'text-red-700' : 'text-slate-900' },
    {
      label: 'อนุมัติเฉลี่ย',
      value: stats.avgDays === null ? '–' : days(stats.avgDays),
      icon: CheckCircle2,
      tone: 'text-emerald-700',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">แดชบอร์ด</h1>
          <p className="text-xs text-slate-400 mt-0.5">ภาพรวมคำร้องทั้งบริษัท งานที่ค้าง และเวลาที่ใช้อนุมัติ</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:w-[560px]">
          <select
            aria-label="ช่วงเวลา"
            className={selectClass}
            value={filters.period}
            onChange={e => setFilters(f => ({ ...f, period: e.target.value as DashboardPeriod }))}
          >
            {(Object.keys(PERIOD_LABELS) as DashboardPeriod[]).map(p => (
              <option key={p} value={p}>{PERIOD_LABELS[p]}</option>
            ))}
          </select>
          <select
            aria-label="หน่วยงาน"
            className={selectClass}
            value={filters.departmentId}
            onChange={e => setFilters(f => ({ ...f, departmentId: e.target.value }))}
          >
            <option value="all">ทุกหน่วยงาน</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.nameTh}</option>
            ))}
          </select>
          <select
            aria-label="แบบฟอร์ม"
            className={selectClass}
            value={filters.formKey}
            onChange={e => setFilters(f => ({ ...f, formKey: e.target.value }))}
          >
            <option value="all">ทุกแบบฟอร์ม</option>
            {formOptions.map(f => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map(t => {
          const Icon = t.icon;
          return (
            <div key={t.label} className={card}>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </div>
              <p className={`text-2xl font-bold mt-1 ${t.tone}`}>{t.value}</p>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400 -mt-2">
        อนุมัติแล้ว {stats.approved} · ไม่อนุมัติ {stats.rejected} · ตีกลับ {stats.returned} ·
        "กำลังดำเนินการ" และ "เกินเวลา" นับงานที่ค้างอยู่ตอนนี้ทั้งหมด ไม่ขึ้นกับช่วงเวลา
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4">
        {/* Longest waiting */}
        <div className={`${card} space-y-3`}>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-red-600" />
            <h2 className="text-base font-bold text-slate-900">ค้างนานที่สุด</h2>
            <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">{stats.waiting.length}</span>
          </div>
          {stats.waiting.length === 0 ? (
            <p className="text-xs text-slate-400">ไม่มีงานค้าง</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {waitingShown.map(w => (
                <button
                  key={w.request.id}
                  type="button"
                  onClick={() => setActiveRequestId(w.request.id)}
                  className="w-full py-2.5 px-2 rounded-xl hover:bg-red-50/40 cursor-pointer text-left flex items-center justify-between gap-3"
                >
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-mono font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 whitespace-nowrap">
                        {w.request.code}
                      </span>
                      <span className="text-sm font-semibold text-slate-800 truncate">{w.request.title}</span>
                    </span>
                    <span className="block text-xs text-slate-400 mt-0.5 truncate">
                      รอ {w.holder} · {w.stepTitle}
                    </span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className={`block text-sm font-bold ${w.overdue ? 'text-red-700' : 'text-slate-700'}`}>
                      {formatWait(w.waitHours)}
                    </span>
                    {w.overdue && (
                      <span
                        title={`กำหนดไว้ ${formatWait(w.slaHours)}`}
                        className="text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded-full whitespace-nowrap"
                      >
                        เกินกำหนด
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
          {stats.waiting.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAllWaiting(v => !v)}
              className="text-xs font-bold text-red-600 hover:text-red-800 cursor-pointer"
            >
              {showAllWaiting ? 'แสดงน้อยลง' : `ดูทั้งหมด ${stats.waiting.length} รายการ`}
            </button>
          )}
        </div>

        {/* Who holds the most */}
        <div className={`${card} space-y-3`}>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-red-600" />
            <h2 className="text-base font-bold text-slate-900">งานค้างอยู่ที่ใคร</h2>
          </div>
          {stats.holders.length === 0 ? (
            <p className="text-xs text-slate-400">ไม่มีงานค้าง</p>
          ) : (
            <ul className="space-y-2.5">
              {stats.holders.slice(0, 8).map(h => (
                <li key={h.name}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-700 truncate">{h.name}</span>
                    <span className="text-slate-500 whitespace-nowrap">
                      {h.count} งาน{h.overdue > 0 && <span className="text-red-700 font-bold"> · เกิน {h.overdue}</span>}
                    </span>
                  </div>
                  <div className="h-2 mt-1 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${h.overdue ? 'bg-red-500' : 'bg-amber-400'}`}
                      style={{ width: `${(h.count / maxHolder) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Average approval time per form */}
        <div className={`${card} space-y-3`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-red-600" />
            <h2 className="text-base font-bold text-slate-900">เวลาอนุมัติเฉลี่ยต่อแบบฟอร์ม</h2>
          </div>
          {stats.formTimings.length === 0 ? (
            <p className="text-xs text-slate-400">ยังไม่มีคำร้องที่อนุมัติครบในช่วงนี้</p>
          ) : (
            <ul className="space-y-2.5">
              {stats.formTimings.map(f => (
                <li key={f.key}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-700 truncate">{f.label}</span>
                    <span className="text-slate-500 whitespace-nowrap">
                      {days(f.avgDays)} · {f.completed} รายการ
                    </span>
                  </div>
                  <div className="h-2 mt-1 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(f.avgDays / maxDays) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Monthly volume */}
        <div className={`${card} space-y-3`}>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-red-600" />
            <h2 className="text-base font-bold text-slate-900">จำนวนคำร้อง 6 เดือนล่าสุด</h2>
          </div>
          <div className="flex items-end gap-2 h-36 pt-4">
            {stats.months.map(m => (
              <div key={m.label} className="flex-1 flex flex-col items-center justify-end h-full gap-1 min-w-0">
                <span className="text-[11px] font-bold text-slate-600">{m.count}</span>
                <div
                  className="w-full max-w-10 rounded-t-md bg-red-500/80"
                  style={{ height: `${Math.max(2, (m.count / maxMonth) * 100)}%` }}
                  title={`${m.label}: ${m.count} คำร้อง`}
                />
                <span className="text-[10px] text-slate-400 whitespace-nowrap">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4">
        {/* By requesting department */}
        <div className={`${card} space-y-3`}>
          <h2 className="text-base font-bold text-slate-900">คำร้องตามหน่วยงานผู้ยื่น</h2>
          {stats.byDepartment.length === 0 ? (
            <p className="text-xs text-slate-400">ไม่มีคำร้องในช่วงนี้</p>
          ) : (
            <ul className="space-y-2">
              {stats.byDepartment.map(d => (
                <li key={d.name} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_2rem] items-center gap-2 text-xs">
                  <span className="text-slate-700 truncate">{d.name}</span>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-slate-500" style={{ width: `${(d.count / maxDept) * 100}%` }} />
                  </div>
                  <span className="text-right font-bold text-slate-600">{d.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quotations */}
        <div className={`${card} space-y-3`}>
          <h2 className="text-base font-bold text-slate-900">ข้อเสนอการประกันภัย (Quotation)</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'ทั้งหมด', value: stats.quotations.total },
              { label: 'รอลงนาม', value: stats.quotations.open },
              { label: 'ลงนามแล้ว', value: stats.quotations.approved },
            ].map(q => (
              <div key={q.label} className="rounded-xl bg-slate-50 py-3">
                <p className="text-xl font-bold text-slate-900">{q.value}</p>
                <p className="text-[11px] text-slate-500">{q.label}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400">นับตามช่วงเวลาที่เลือก</p>
        </div>
      </div>
    </div>
  );
};
