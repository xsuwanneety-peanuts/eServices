import { DepartmentId, DocumentRequest, MemoData, MenuItemPermission, WorkflowDefinition } from '../types';
import { CORPORATE_DEPARTMENTS } from '../data/mockData';
import { FORM_CODE_PREFIX } from './forms';

// The Memorandum (บันทึกภายใน) form of Administrative & Procurement. It is a built-in form
// with a fixed layout, so it is added to each project's data once instead of being made in
// the form builder.
export const MEMO_FORM_ID = 'form-ga-memo';
export const MEMO_WORKFLOW_ID = 'wf-ga-memo';
export const MEMO_SEED_MARKER = 'seed-memo-form';
export const MEMO_FORM_NAME = 'Memorandum (แบบฟอร์มบันทึกภายใน)';
export const MEMO_CLOSING_LINE = 'จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติและดำเนินการต่อไป';

export const MEMO_FORM: MenuItemPermission = {
  id: MEMO_FORM_ID,
  menuCode: 'GA-MEMO',
  menuName: MEMO_FORM_NAME,
  category: 'Administrative & Procurement',
  ownerDepartmentId: 'admin_procure',
  description: 'บันทึกภายในเสนอผู้ตรวจสอบ CFO และ CEO อนุมัติ ดาวน์โหลดเป็น PDF ได้',
  template: 'memo',
  workflowId: MEMO_WORKFLOW_ID,
  allowedDepartments: Object.fromEntries(CORPORATE_DEPARTMENTS.map(d => [d.id, true])) as Record<
    DepartmentId,
    boolean
  >,
};

// The step titles are the headings of the signature boxes on the memo; the requester
// chooses who signs each one when filling in the form.
export const MEMO_WORKFLOW: WorkflowDefinition = {
  id: MEMO_WORKFLOW_ID,
  formId: MEMO_FORM_ID,
  formTitle: MEMO_FORM_NAME,
  departmentId: 'admin_procure',
  description: 'บันทึกภายใน: ผู้จัดทำ → ผู้ตรวจสอบ → CFO อนุมัติ → CEO อนุมัติ',
  itilCategory: 'service_request',
  steps: [
    {
      id: `${MEMO_WORKFLOW_ID}-requester`,
      stepIndex: 0,
      title: 'ผู้จัดทำ',
      roleName: 'ผู้จัดทำ',
      approverType: 'requester',
      sendEmailNotification: true,
      slaHours: 0,
    },
    ...['ผู้ตรวจสอบ', 'CFO อนุมัติ', 'CEO อนุมัติ'].map((title, idx) => ({
      id: `${MEMO_WORKFLOW_ID}-step-${idx + 1}`,
      stepIndex: idx + 1,
      title,
      roleName: title,
      approverType: 'requester_picks' as const,
      sendEmailNotification: true,
      slaHours: 24,
    })),
  ],
};

/** The memo's content as the label/value list shown in the request window. */
export const memoAnswers = (memo: MemoData): { label: string; value: string }[] => [
  { label: 'ที่', value: memo.docNo },
  { label: 'เรียน', value: memo.to },
  { label: 'สรุปความเป็นมา', value: memo.background },
  { label: 'สรุปสาระสำคัญ', value: memo.summary },
];

/** The same content as plain text, for lists, search and email previews. */
export const memoDetails = (memo: MemoData): string =>
  memoAnswers(memo)
    .map(a => `${a.label}: ${a.value}`)
    .join('\n');

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Buddhist-era date as dd/mm/yyyy, e.g. 07/09/2569. */
export const thaiDate = (date: Date): string =>
  `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear() + 543}`;

/**
 * A system timestamp ("16.11.2026 14:05") as the short Buddhist-era date written beside a
 * signature, e.g. 16/11/69. Empty when there is no timestamp yet.
 */
export const shortThaiDate = (timestamp?: string): string => {
  const match = timestamp?.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  return match ? `${match[1]}/${match[2]}/${pad2((Number(match[3]) + 543) % 100)}` : '';
};

/**
 * Next memo number for a department in the current Buddhist year, e.g. IT015/69: the
 * department's code, a three-digit running number and the two-digit year.
 */
export const nextMemoNo = (deptId: DepartmentId, requests: DocumentRequest[], now = new Date()): string => {
  const prefix = FORM_CODE_PREFIX[deptId];
  const year = pad2((now.getFullYear() + 543) % 100);
  const pattern = new RegExp(`^${prefix}(\\d+)/${year}$`);
  const last = requests.reduce((max, r) => {
    const n = Number(r.memo?.docNo.match(pattern)?.[1] ?? 0);
    return n > max ? n : max;
  }, 0);
  return `${prefix}${String(last + 1).padStart(3, '0')}/${year}`;
};
