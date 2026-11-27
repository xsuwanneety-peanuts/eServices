import type { DocumentRequest, WorkflowDefinition } from '../types';

// Numbers for the management dashboard (ผู้บริหาร and ผู้ดูแลระบบ), worked out from the requests
// already loaded in the app: nothing extra is stored.

export type DashboardPeriod = 'month' | 'quarter' | 'year' | 'all';

export const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  month: 'เดือนนี้',
  quarter: '3 เดือนล่าสุด',
  year: 'ปีนี้',
  all: 'ทั้งหมด',
};

export interface DashboardFilters {
  period: DashboardPeriod;
  /** A department id, or 'all'. Matches the department the request was made for. */
  departmentId: string;
  /** A form key (see formKeyOf), or 'all'. */
  formKey: string;
}

/** Hours a step may wait when its workflow sets none. 0 on a step means "no time limit". */
const DEFAULT_SLA_HOURS = 24;
const HOUR = 3_600_000;

/** dd.mm.yyyy or dd.mm.yyyy hh:mm (how the app stamps requests) as a Date; null when unreadable. */
export const parseStamp = (stamp: string | undefined): Date | null => {
  const m = stamp?.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  const date = new Date(+m[3], +m[2] - 1, +m[1], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Requests of the same form group together; old requests without a form group by category. */
export const formKeyOf = (request: DocumentRequest) => request.formId || `cat:${request.category}`;

export const isOpen = (request: DocumentRequest) =>
  request.status === 'pending' || request.status === 'in_review';

export const periodStart = (period: DashboardPeriod, now: Date): Date | null => {
  switch (period) {
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'quarter':
      return new Date(now.getFullYear(), now.getMonth() - 2, 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    default:
      return null;
  }
};

/** When the current step started waiting: the previous step's stamp, else the last update. */
export const waitingSince = (request: DocumentRequest): Date | null =>
  parseStamp(request.steps[request.currentStepIndex - 1]?.timestamp) ?? parseStamp(request.updatedAt);

/** The time limit of the request's current step, in hours (0 = none). */
export const currentStepSla = (request: DocumentRequest, workflows: WorkflowDefinition[]): number => {
  const step = workflows.find(w => w.id === request.workflowId)?.steps[request.currentStepIndex];
  return step?.slaHours ?? DEFAULT_SLA_HOURS;
};

export interface WaitingRequest {
  request: DocumentRequest;
  stepTitle: string;
  holder: string;
  waitHours: number;
  slaHours: number;
  overdue: boolean;
}

export interface Holder {
  name: string;
  count: number;
  overdue: number;
  longestHours: number;
}

export interface FormTiming {
  key: string;
  label: string;
  completed: number;
  avgDays: number;
}

export interface MonthCount {
  label: string;
  count: number;
}

export interface DashboardStats {
  total: number;
  /** Waiting right now, whatever the period. */
  open: number;
  approved: number;
  rejected: number;
  returned: number;
  overdue: number;
  /** Average days from sending to the last approval, over approved requests (null: none yet). */
  avgDays: number | null;
  waiting: WaitingRequest[];
  holders: Holder[];
  formTimings: FormTiming[];
  months: MonthCount[];
  byDepartment: { name: string; count: number }[];
  quotations: { total: number; open: number; approved: number };
}

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/** Whoever the current step waits on, as shown on the request. */
const holderOf = (request: DocumentRequest) => request.steps[request.currentStepIndex]?.approverName || 'ไม่ระบุ';

export const computeDashboardStats = (
  requests: DocumentRequest[],
  workflows: WorkflowDefinition[],
  filters: DashboardFilters,
  formLabel: (key: string) => string,
  now = new Date()
): DashboardStats => {
  const matchesScope = (r: DocumentRequest) =>
    (filters.departmentId === 'all' || r.departmentId === filters.departmentId) &&
    (filters.formKey === 'all' || formKeyOf(r) === filters.formKey);
  const scoped = requests.filter(matchesScope);

  const start = periodStart(filters.period, now);
  const inPeriod = scoped.filter(r => {
    if (!start) return true;
    const made = parseStamp(r.createdAt);
    return !!made && made >= start;
  });

  // What is waiting right now ignores the period: an old request still waiting matters most
  const waiting: WaitingRequest[] = scoped
    .filter(isOpen)
    .map(request => {
      const since = waitingSince(request);
      const waitHours = since ? Math.max(0, (now.getTime() - since.getTime()) / HOUR) : 0;
      const slaHours = currentStepSla(request, workflows);
      return {
        request,
        stepTitle: request.steps[request.currentStepIndex]?.stepTitle ?? '',
        holder: holderOf(request),
        waitHours,
        slaHours,
        overdue: slaHours > 0 && waitHours > slaHours,
      };
    })
    .sort((a, b) => b.waitHours - a.waitHours);

  const holderMap = new Map<string, Holder>();
  waiting.forEach(w => {
    const h = holderMap.get(w.holder) ?? { name: w.holder, count: 0, overdue: 0, longestHours: 0 };
    h.count += 1;
    if (w.overdue) h.overdue += 1;
    h.longestHours = Math.max(h.longestHours, w.waitHours);
    holderMap.set(w.holder, h);
  });
  const holders = [...holderMap.values()].sort((a, b) => b.count - a.count || b.longestHours - a.longestHours);

  // Days from sending to the last stamped step, for requests that went all the way through
  const daysTaken = (r: DocumentRequest): number | null => {
    const made = parseStamp(r.createdAt);
    const stamps = r.steps.map(s => parseStamp(s.timestamp)).filter((d): d is Date => !!d);
    if (!made || stamps.length === 0) return null;
    const last = Math.max(...stamps.map(d => d.getTime()));
    return Math.max(0, (last - made.getTime()) / (24 * HOUR));
  };
  const approvedInPeriod = inPeriod.filter(r => r.status === 'approved');
  const allDays = approvedInPeriod.map(daysTaken).filter((d): d is number => d !== null);

  const timingMap = new Map<string, number[]>();
  approvedInPeriod.forEach(r => {
    const d = daysTaken(r);
    if (d === null) return;
    const list = timingMap.get(formKeyOf(r)) ?? [];
    list.push(d);
    timingMap.set(formKeyOf(r), list);
  });
  const formTimings: FormTiming[] = [...timingMap.entries()]
    .map(([key, days]) => ({
      key,
      label: formLabel(key),
      completed: days.length,
      avgDays: days.reduce((a, b) => a + b, 0) / days.length,
    }))
    .sort((a, b) => b.avgDays - a.avgDays);

  // The last six months, whatever the period, so the trend is always visible
  const months: MonthCount[] = Array.from({ length: 6 }, (_, i) => {
    const from = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const to = new Date(from.getFullYear(), from.getMonth() + 1, 1);
    const count = scoped.filter(r => {
      const made = parseStamp(r.createdAt);
      return !!made && made >= from && made < to;
    }).length;
    return { label: `${THAI_MONTHS[from.getMonth()]} ${String((from.getFullYear() + 543) % 100).padStart(2, '0')}`, count };
  });

  const deptMap = new Map<string, number>();
  inPeriod.forEach(r => {
    const name = r.requestorDepartment || 'ไม่ระบุ';
    deptMap.set(name, (deptMap.get(name) ?? 0) + 1);
  });
  const byDepartment = [...deptMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const quotes = inPeriod.filter(r => r.quotation);

  return {
    total: inPeriod.length,
    open: waiting.length,
    approved: approvedInPeriod.length,
    rejected: inPeriod.filter(r => r.status === 'rejected').length,
    returned: inPeriod.filter(r => r.status === 'returned').length,
    overdue: waiting.filter(w => w.overdue).length,
    avgDays: allDays.length ? allDays.reduce((a, b) => a + b, 0) / allDays.length : null,
    waiting,
    holders,
    formTimings,
    months,
    byDepartment,
    quotations: {
      total: quotes.length,
      open: quotes.filter(isOpen).length,
      approved: quotes.filter(r => r.status === 'approved').length,
    },
  };
};

/** Hours waited, written the way people say it: "5 ชม." under a day, else "3 วัน". */
export const formatWait = (hours: number): string =>
  hours < 24 ? `${Math.max(1, Math.round(hours))} ชม.` : `${Math.floor(hours / 24)} วัน`;
