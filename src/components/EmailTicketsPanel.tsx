import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatWait } from '../utils/dashboardStats';
import {
  categoryLabel,
  computeEmailTicketStats,
  EMAIL_TICKET_CATEGORIES,
  sampleEmailTickets,
  ticketsFromRequests,
} from '../utils/emailTickets';
import { AlertTriangle, CheckCircle2, Inbox, Mail, UserX } from 'lucide-react';

// Dashboard tab: tickets opened from email, for following up that nothing slips. Real tickets
// appear once the shared ticket mailbox is connected; until then a sample can be shown.

const card = 'bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs';

const CATEGORY_TONE: Record<string, string> = {
  claim: 'bg-orange-50 text-orange-800 border-orange-200',
  renewal: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  quotation: 'bg-violet-50 text-violet-800 border-violet-200',
  change: 'bg-pink-50 text-pink-800 border-pink-200',
  other: 'bg-slate-50 text-slate-700 border-slate-200',
};

const CategoryChip: React.FC<{ category: string }> = ({ category }) => (
  <span
    className={`text-[11px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${CATEGORY_TONE[category] ?? CATEGORY_TONE.other}`}
  >
    {categoryLabel(category)}
  </span>
);

const hoursText = (h: number) => (h < 24 ? `${Math.max(1, Math.round(h))} ชม.` : `${(h / 24).toFixed(1)} วัน`);

interface Props {
  /** Start of the period chosen on the dashboard (null: all time). */
  periodStart: Date | null;
  periodLabel: string;
}

export const EmailTicketsPanel: React.FC<Props> = ({ periodStart, periodLabel }) => {
  const { requests, setActiveRequestId } = useApp();
  const realTickets = useMemo(() => ticketsFromRequests(requests), [requests]);
  const [showSample, setShowSample] = useState(false);
  const [category, setCategory] = useState('all');

  const usingSample = realTickets.length === 0 && showSample;
  const tickets = useMemo(
    () => (usingSample ? sampleEmailTickets() : realTickets),
    [usingSample, realTickets]
  );
  const stats = useMemo(() => computeEmailTicketStats(tickets, periodStart), [tickets, periodStart]);
  const list = stats.waiting.filter(t => category === 'all' || t.category === category);
  const maxCategory = Math.max(1, ...stats.byCategory.map(c => c.open));

  if (realTickets.length === 0 && !showSample) {
    return (
      <div className={`${card} text-center py-10 space-y-3`}>
        <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
        <p className="text-sm font-bold text-slate-800">ยังไม่มี Ticket จากอีเมล</p>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Ticket จะเข้ามาเองเมื่อเชื่อมเมลกลางแล้ว (รอฝ่าย IT สร้างเมลกลางและอนุมัติสิทธิ์ให้ระบบอ่าน)
          พนักงานตั้งกฎ Outlook ส่งเมลงานไปที่เมลกลาง ระบบเปิด Ticket แยกหมวดจากหัวเรื่อง และมอบหมายให้เจ้าของเมล
        </p>
        <button
          type="button"
          onClick={() => setShowSample(true)}
          className="text-xs font-bold text-red-600 hover:text-red-800 cursor-pointer"
        >
          ดูหน้าตาด้วยข้อมูลตัวอย่าง
        </button>
      </div>
    );
  }

  const tiles = [
    { label: `เมลเข้า${periodLabel}`, value: stats.receivedInPeriod, icon: Mail, tone: 'text-slate-900' },
    { label: 'ยังไม่มีผู้รับผิดชอบ', value: stats.unassigned, icon: UserX, tone: stats.unassigned ? 'text-amber-700' : 'text-slate-900' },
    { label: 'เกินกำหนด', value: stats.overdue, icon: AlertTriangle, tone: stats.overdue ? 'text-red-700' : 'text-slate-900' },
    {
      label: `ปิดแล้ว${periodLabel}`,
      value: stats.closedInPeriod,
      sub: stats.avgCloseHours === null ? undefined : `เฉลี่ย ${hoursText(stats.avgCloseHours)}`,
      icon: CheckCircle2,
      tone: 'text-emerald-700',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      {usingSample && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
          <p className="text-xs text-amber-900">
            <span className="font-bold">ข้อมูลตัวอย่าง</span> ไม่ใช่ Ticket จริง แสดงให้ดูหน้าตาก่อนเชื่อมเมลกลาง
          </p>
          <button
            type="button"
            onClick={() => setShowSample(false)}
            className="text-xs font-bold text-amber-900 underline hover:no-underline cursor-pointer self-start sm:self-auto"
          >
            ซ่อนตัวอย่าง
          </button>
        </div>
      )}

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
              {t.sub && <p className="text-[11px] text-slate-400">{t.sub}</p>}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4">
        {/* Open tickets */}
        <div className={`${card} space-y-3`}>
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-red-600" />
            <h2 className="text-base font-bold text-slate-900">Ticket ที่ยังไม่ปิด</h2>
            <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">{stats.open}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[{ key: 'all', label: 'ทั้งหมด' }, ...EMAIL_TICKET_CATEGORIES].map(c => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={`text-xs px-2.5 py-1 rounded-lg border cursor-pointer ${
                  category === c.key
                    ? 'bg-red-50 border-red-300 text-red-700 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          {list.length === 0 ? (
            <p className="text-xs text-slate-400">ไม่มี Ticket ค้างในหมวดนี้</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {list.map(t => (
                <button
                  key={t.id}
                  type="button"
                  disabled={!t.requestId}
                  onClick={() => t.requestId && setActiveRequestId(t.requestId)}
                  className="w-full py-2.5 px-2 rounded-xl enabled:hover:bg-red-50/40 enabled:cursor-pointer text-left flex items-center justify-between gap-3"
                >
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <CategoryChip category={t.category} />
                      <span className="text-sm font-semibold text-slate-800 truncate">{t.subject}</span>
                    </span>
                    <span className="block text-xs text-slate-400 mt-0.5 sm:truncate">
                      {t.code} · จาก {t.from} ·{' '}
                      {t.assignee ? (
                        <>ผู้รับผิดชอบ {t.assignee}</>
                      ) : (
                        <span className="text-amber-700 font-bold">ยังไม่มีผู้รับผิดชอบ</span>
                      )}
                      {t.messageCount > 1 && <> · {t.messageCount} ข้อความ</>}
                    </span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className={`block text-sm font-bold ${t.overdue ? 'text-red-700' : 'text-slate-700'}`}>
                      {formatWait(t.waitHours)}
                    </span>
                    {t.overdue && (
                      <span className="text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        เกินกำหนด
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* By category */}
          <div className={`${card} space-y-3`}>
            <h2 className="text-base font-bold text-slate-900">ค้างตามหมวด</h2>
            <ul className="space-y-2.5">
              {stats.byCategory.map(c => (
                <li key={c.key}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-700">{c.label}</span>
                    <span className="text-slate-500 whitespace-nowrap">
                      {c.open} ค้าง{c.overdue > 0 && <span className="text-red-700 font-bold"> · เกิน {c.overdue}</span>}
                      <span className="text-slate-400"> · เข้า {c.total}</span>
                    </span>
                  </div>
                  <div className="h-2 mt-1 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.overdue ? 'bg-red-500' : 'bg-amber-400'}`}
                      style={{ width: `${(c.open / maxCategory) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-slate-400">
              กำหนดเวลา: {EMAIL_TICKET_CATEGORIES.map(c => `${c.label} ${c.slaHours} ชม.`).join(' · ')}
            </p>
          </div>

          {/* By assignee */}
          <div className={`${card} space-y-3`}>
            <h2 className="text-base font-bold text-slate-900">ตามผู้รับผิดชอบ</h2>
            {stats.byAssignee.length === 0 ? (
              <p className="text-xs text-slate-400">ยังไม่มี</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400">
                    <th className="text-left font-medium pb-1.5">ชื่อ</th>
                    <th className="text-right font-medium pb-1.5">ค้าง</th>
                    <th className="text-right font-medium pb-1.5">เกิน</th>
                    <th className="text-right font-medium pb-1.5">ปิดแล้ว</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.byAssignee.map(a => (
                    <tr key={a.name}>
                      <td className="py-1.5 text-slate-700 font-semibold">{a.name}</td>
                      <td className="py-1.5 text-right text-slate-700">{a.open}</td>
                      <td className={`py-1.5 text-right ${a.overdue ? 'text-red-700 font-bold' : 'text-slate-400'}`}>{a.overdue}</td>
                      <td className="py-1.5 text-right text-emerald-700">{a.closed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
