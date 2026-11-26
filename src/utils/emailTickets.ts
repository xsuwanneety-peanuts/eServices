import type { DocumentRequest } from '../types';
import { parseStamp } from './dashboardStats';

// Email-to-ticket tracking for the dashboard. Tickets come from the shared ticket mailbox (not
// connected yet), each carrying `request.email`. Until the first real one arrives, the dashboard
// can show SAMPLE_EMAIL_TICKETS, clearly marked as sample data.

/** Categories worked out from the subject. A draft list: to be confirmed with the teams. */
export const EMAIL_TICKET_CATEGORIES: { key: string; label: string; words: string[]; slaHours: number }[] = [
  { key: 'claim', label: 'เคลม', words: ['เคลม', 'claim', 'สินไหม', 'อุบัติเหตุ', 'รถชน'], slaHours: 8 },
  { key: 'renewal', label: 'ต่ออายุ', words: ['ต่ออายุ', 'renew'], slaHours: 24 },
  { key: 'quotation', label: 'ใบเสนอราคา', words: ['ใบเสนอราคา', 'quotation', 'เสนอราคา'], slaHours: 24 },
  { key: 'change', label: 'แก้ไขข้อมูล', words: ['แก้ไข', 'เปลี่ยน', 'endorse'], slaHours: 48 },
  { key: 'other', label: 'อื่นๆ', words: [], slaHours: 48 },
];

const categoryOf = (key: string) =>
  EMAIL_TICKET_CATEGORIES.find(c => c.key === key) ?? EMAIL_TICKET_CATEGORIES[EMAIL_TICKET_CATEGORIES.length - 1];

export const categoryLabel = (key: string) => categoryOf(key).label;

/** The category whose words appear first in the subject; "other" when none do. */
export const categoryFromSubject = (subject: string): string => {
  const text = subject.toLowerCase();
  return EMAIL_TICKET_CATEGORIES.find(c => c.words.some(w => text.includes(w.toLowerCase())))?.key ?? 'other';
};

export type EmailTicketState = 'unassigned' | 'open' | 'closed';

/** One ticket as the dashboard shows it. */
export interface EmailTicket {
  id: string;
  code: string;
  subject: string;
  from: string;
  category: string;
  assignee: string;
  state: EmailTicketState;
  received: Date;
  /** When it was closed (null while open). */
  closed: Date | null;
  messageCount: number;
  /** Clicking opens the real request; sample tickets have none. */
  requestId?: string;
}

/** Tickets from the requests that were opened from an email. */
export const ticketsFromRequests = (requests: DocumentRequest[]): EmailTicket[] =>
  requests.flatMap(r => {
    if (!r.email) return [];
    const received = parseStamp(r.email.receivedAt) ?? parseStamp(r.createdAt);
    if (!received) return [];
    const step = r.steps[r.currentStepIndex];
    const done = r.status === 'approved' || r.status === 'rejected';
    const stamps = r.steps.map(s => parseStamp(s.timestamp)).filter((d): d is Date => !!d);
    return [
      {
        id: r.id,
        code: r.code,
        subject: r.email.subject,
        from: r.email.fromName || r.email.fromEmail,
        category: r.email.category,
        assignee: step?.approverEmail ? step.approverName : '',
        state: done ? 'closed' : step?.approverEmail ? 'open' : 'unassigned',
        received,
        closed: done && stamps.length ? new Date(Math.max(...stamps.map(d => d.getTime()))) : null,
        messageCount: r.email.messageCount ?? 1,
        requestId: r.id,
      },
    ];
  });

const HOUR = 3_600_000;

/** Made-up tickets that show what the tab will look like, relative to `now`. */
export const sampleEmailTickets = (now = new Date()): EmailTicket[] => {
  const ago = (h: number) => new Date(now.getTime() - h * HOUR);
  const t = (
    n: number,
    subject: string,
    from: string,
    assignee: string,
    receivedHoursAgo: number,
    closedHoursAgo: number | null,
    messageCount = 1
  ): EmailTicket => ({
    id: `sample-${n}`,
    code: `TICKET-${now.getFullYear()}-${String(90 + n).padStart(5, '0')}`,
    subject,
    from,
    category: categoryFromSubject(subject),
    assignee,
    state: closedHoursAgo !== null ? 'closed' : assignee ? 'open' : 'unassigned',
    received: ago(receivedHoursAgo),
    closed: closedHoursAgo !== null ? ago(closedHoursAgo) : null,
    messageCount,
  });
  return [
    t(1, 'ด่วน แจ้งเคลมรถชน ทะเบียน กข 1234', 'customer.a@example.com', 'พนักงาน A', 2, null),
    t(2, 'แจ้งเคลมน้ำท่วมบ้าน', 'customer.f@example.com', 'พนักงาน B', 30, null, 3),
    t(3, 'ขอต่ออายุกรมธรรม์อัคคีภัย บ้านเลขที่ 88/1', 'customer.b@example.com', 'พนักงาน A', 20, null, 3),
    t(4, 'RE: ขอใบเสนอราคาประกันรถยนต์ชั้น 1', 'partner.c@example.com', 'พนักงาน C', 52, null, 2),
    t(5, 'แจ้งเปลี่ยนที่อยู่จัดส่งกรมธรรม์', 'customer.d@example.com', '', 5, null),
    t(6, 'สอบถามเวลาทำการช่วงปีใหม่', 'customer.e@example.com', '', 9, null),
    t(7, 'ขอใบเสนอราคาประกันอัคคีภัยโรงงาน', 'partner.g@example.com', 'พนักงาน C', 70, 20, 4),
    t(8, 'เคลมกระจกรถแตก', 'customer.h@example.com', 'พนักงาน B', 50, 44, 2),
    t(9, 'ต่ออายุประกันรถยนต์ 2 คัน', 'customer.i@example.com', 'พนักงาน A', 100, 70, 3),
    t(10, 'แก้ไขชื่อผู้เอาประกัน', 'customer.j@example.com', 'พนักงาน D', 80, 76),
  ];
};

export interface EmailTicketStats {
  receivedInPeriod: number;
  unassigned: number;
  open: number;
  overdue: number;
  closedInPeriod: number;
  /** Average hours from arrival to closing, over tickets closed in the period (null: none). */
  avgCloseHours: number | null;
  byCategory: { key: string; label: string; open: number; overdue: number; total: number }[];
  byAssignee: { name: string; open: number; overdue: number; closed: number }[];
  /** Open tickets, longest waiting first. */
  waiting: (EmailTicket & { waitHours: number; overdue: boolean })[];
}

export const computeEmailTicketStats = (
  tickets: EmailTicket[],
  periodStart: Date | null,
  now = new Date()
): EmailTicketStats => {
  const inPeriod = (d: Date | null) => !!d && (!periodStart || d >= periodStart);

  const waiting = tickets
    .filter(t => t.state !== 'closed')
    .map(t => {
      const waitHours = (now.getTime() - t.received.getTime()) / HOUR;
      return { ...t, waitHours, overdue: waitHours > categoryOf(t.category).slaHours };
    })
    .sort((a, b) => b.waitHours - a.waitHours);

  const closed = tickets.filter(t => t.state === 'closed' && inPeriod(t.closed));
  const closeHours = closed.map(t => ((t.closed as Date).getTime() - t.received.getTime()) / HOUR);

  const byCategory = EMAIL_TICKET_CATEGORIES.map(c => ({
    key: c.key,
    label: c.label,
    open: waiting.filter(t => t.category === c.key).length,
    overdue: waiting.filter(t => t.category === c.key && t.overdue).length,
    total: tickets.filter(t => t.category === c.key && inPeriod(t.received)).length,
  }));

  const assignees = new Map<string, { name: string; open: number; overdue: number; closed: number }>();
  const entry = (name: string) => {
    const e = assignees.get(name) ?? { name, open: 0, overdue: 0, closed: 0 };
    assignees.set(name, e);
    return e;
  };
  waiting.filter(t => t.assignee).forEach(t => {
    const e = entry(t.assignee);
    e.open += 1;
    if (t.overdue) e.overdue += 1;
  });
  closed.filter(t => t.assignee).forEach(t => (entry(t.assignee).closed += 1));

  return {
    receivedInPeriod: tickets.filter(t => inPeriod(t.received)).length,
    unassigned: waiting.filter(t => t.state === 'unassigned').length,
    open: waiting.length,
    overdue: waiting.filter(t => t.overdue).length,
    closedInPeriod: closed.length,
    avgCloseHours: closeHours.length ? closeHours.reduce((a, b) => a + b, 0) / closeHours.length : null,
    byCategory,
    byAssignee: [...assignees.values()].sort((a, b) => b.open - a.open || b.overdue - a.overdue),
    waiting,
  };
};
