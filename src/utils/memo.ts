import { DepartmentId, DocumentRequest, MemoData, MenuItemPermission, WorkflowDefinition } from '../types';
import { CORPORATE_DEPARTMENTS } from '../data/mockData';

// The Memorandum (บันทึกภายใน) form of Administrative & Procurement. It is a built-in form
// with a fixed layout, so it is added to each project's data once instead of being made in
// the form builder.
export const MEMO_FORM_ID = 'form-ga-memo';
export const MEMO_WORKFLOW_ID = 'wf-ga-memo';
export const MEMO_SEED_MARKER = 'seed-memo-form';
export const MEMO_FORM_NAME = 'Memorandum (แบบฟอร์มบันทึกภายใน)';
export const MEMO_CLOSING_LINE = 'จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติและดำเนินการต่อไป';

// The approval boxes are headed just "ผู้อนุมัติ": the requester picks who signs, and that
// person's position is printed under their name.
export const MEMO_APPROVER_TITLE = 'ผู้อนุมัติ';
const MEMO_FORM_DESCRIPTION = 'บันทึกภายในเสนอผู้ตรวจสอบและผู้อนุมัติ ดาวน์โหลดเป็น PDF ได้';
const MEMO_WORKFLOW_DESCRIPTION = 'บันทึกภายใน: ผู้จัดทำ → ผู้ตรวจสอบ → ผู้อนุมัติ → ผู้อนุมัติ';

/** The boxes were first headed "CFO อนุมัติ" and "CEO อนุมัติ"; shown as ผู้อนุมัติ wherever they remain. */
const OLD_APPROVER_TITLE = /^(CFO|CEO) อนุมัติ$/;
export const memoStepTitle = (title: string): string => (OLD_APPROVER_TITLE.test(title) ? MEMO_APPROVER_TITLE : title);

/** One-time update of a memo form and flow saved with the earlier wording. */
export const MEMO_TITLES_MARKER = 'migrate-memo-approver-titles';
export const withCurrentMemoWording = {
  form: (form: MenuItemPermission): MenuItemPermission =>
    form.id === MEMO_FORM_ID ? { ...form, description: MEMO_FORM_DESCRIPTION } : form,
  workflow: (workflow: WorkflowDefinition): WorkflowDefinition =>
    workflow.id === MEMO_WORKFLOW_ID
      ? {
          ...workflow,
          description: MEMO_WORKFLOW_DESCRIPTION,
          steps: workflow.steps.map(step => ({
            ...step,
            title: memoStepTitle(step.title),
            roleName: memoStepTitle(step.roleName),
          })),
        }
      : workflow,
};

/** One-time update of memos sent with the earlier wording, and of their approval alerts. */
export const MEMO_OLD_REQUESTS_MARKER = 'migrate-memo-old-requests';
export const memoRequestWithCurrentWording = (request: DocumentRequest): DocumentRequest =>
  request.memo
    ? {
        ...request,
        steps: request.steps.map(step => ({
          ...step,
          stepTitle: memoStepTitle(step.stepTitle),
          approverRole: memoStepTitle(step.approverRole),
        })),
      }
    : request;

export const MEMO_FORM: MenuItemPermission = {
  id: MEMO_FORM_ID,
  menuCode: 'GA-MEMO',
  menuName: MEMO_FORM_NAME,
  category: 'Administrative & Procurement',
  ownerDepartmentId: 'admin_procure',
  description: MEMO_FORM_DESCRIPTION,
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
  description: MEMO_WORKFLOW_DESCRIPTION,
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
    ...['ผู้ตรวจสอบ', MEMO_APPROVER_TITLE, MEMO_APPROVER_TITLE].map((title, idx) => ({
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

