import { DepartmentId, FormFieldType, MenuItemPermission, StepApproverType } from '../types';

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'ข้อความสั้น',
  textarea: 'ข้อความยาว',
  number: 'ตัวเลข',
  date: 'วันที่',
  select: 'ตัวเลือก (dropdown)',
  file: 'แนบไฟล์',
};

/** Prefix for form codes such as HR-FORM-01. */
export const FORM_CODE_PREFIX: Record<DepartmentId, string> = {
  compliance_legal: 'LEG',
  new_venture: 'NVB',
  it: 'IT',
  sales: 'SAL',
  underwriting: 'UW',
  claims: 'CLM',
  finance_invest: 'FIN',
  accounting_tax: 'ACC',
  admin_procure: 'GA',
  hr: 'HR',
};

/** Who may submit the form: every department, only the owning one, or a custom set from the access page. */
export type FormAudience = 'all' | 'own' | 'custom';

/** What the form builder hands to saveCustomForm. */
export interface CustomFormInput {
  name: string;
  description: string;
  fields: { id: string; label: string; type: FormFieldType; required: boolean; options?: string[] }[];
  /** Approval steps after the requester, in order. */
  steps: { id: string; title: string; approverType: StepApproverType; approverEmployeeId?: string }[];
  audience: FormAudience;
  /** Start of the request number; empty means the default. */
  docPrefix: string;
  /** The requester adds handlers (any number) after the steps above, when filling in the form. */
  requesterAddsSteps: boolean;
}

/** A step the requester added while filling in a form: one named employee handles it. */
export interface AddedStep {
  title: string;
  employeeId: string;
}

/** Request numbers read <prefix>-<year>-<running>, e.g. REQ-2026-0007 or Ticket-2026-0001. */
export const DEFAULT_DOC_PREFIX = 'REQ';
export const isValidDocPrefix = (prefix: string) => /^[A-Za-z][A-Za-z0-9]{1,11}$/.test(prefix);

/** Labels that mean the request's title, which every request already asks for itself. */
const TITLE_LABELS = ['หัวเรื่อง', 'เรื่อง', 'title', 'subject'];
/** True for a form field that only asks for the request's title again. */
export const isTitleField = (label: string) => TITLE_LABELS.includes(label.trim().toLowerCase());

/** Digits of the running number unless a form says otherwise, e.g. 0007. */
export const DEFAULT_RUNNING_DIGITS = 4;

/**
 * How a form's requests are numbered: <prefix>-<year>-<running>. The standard forms have fixed
 * numbers, whatever prefix they were saved with:
 *   Memorandum      MEMO-2026-00001
 *   IT & Request    ITR-2026-00001
 *   P&O JRF         JRF-2026-00001 (its saved prefix)
 *   Quotation       QUO-2026-00001
 *   Ticket Request  TICKET-2026-00001 (a form-builder form saved with the prefix "Ticket")
 * Earlier numbers are counted without regard to case, so Ticket-2026-0001 is followed by
 * TICKET-2026-00002. Every other form uses its own prefix and 4 digits.
 */
export const requestNumbering = (
  form?: Pick<MenuItemPermission, 'template' | 'docPrefix'>
): { prefix: string; digits: number } => {
  if (form?.template === 'memo') return { prefix: 'MEMO', digits: 5 };
  if (form?.template === 'it_request') return { prefix: 'ITR', digits: 5 };
  if (form?.template === 'po_request') return { prefix: form.docPrefix ?? '', digits: 5 };
  if (form?.template === 'quotation') return { prefix: 'QUO', digits: 5 };
  if (form?.docPrefix?.toLowerCase() === 'ticket') return { prefix: 'TICKET', digits: 5 };
  return { prefix: form?.docPrefix ?? '', digits: DEFAULT_RUNNING_DIGITS };
};

/** The number the next request from a form will get. */
export const nextRequestCodeFor = (
  form: Pick<MenuItemPermission, 'template' | 'docPrefix'> | undefined,
  codes: string[],
  now = new Date()
) => {
  const { prefix, digits } = requestNumbering(form);
  return nextRequestCode(prefix, codes, now, digits);
};

/** The next free number for a prefix in the given year, counted over the requests that already use it. */
export const nextRequestCode = (
  prefix: string,
  codes: string[],
  now = new Date(),
  digits = DEFAULT_RUNNING_DIGITS
): string => {
  const start = `${prefix || DEFAULT_DOC_PREFIX}-${now.getFullYear()}-`;
  const last = codes.reduce((max, code) => {
    if (!code.toLowerCase().startsWith(start.toLowerCase())) return max;
    const n = Number(code.slice(start.length));
    return Number.isInteger(n) && n > max ? n : max;
  }, 0);
  return `${start}${String(last + 1).padStart(digits, '0')}`;
};

/**
 * Forms people can fill in: the built-in ones with their own screen (template) and the ones
 * a department made in the form builder (fields). The five original IT forms are neither,
 * so they are no longer offered; requests made with them stay readable.
 */
export const isOfferedForm = (form: MenuItemPermission): boolean => !!form.template || !!form.fields;

export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
