import { DepartmentId, FormFieldType, MenuItemPermission, StepApproverType } from '../types';

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'ข้อความสั้น',
  textarea: 'ข้อความยาว',
  number: 'ตัวเลข',
  date: 'วันที่',
  select: 'ตัวเลือก (dropdown)',
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

/** The next free number for a prefix in the given year, counted over the requests that already use it. */
export const nextRequestCode = (prefix: string, codes: string[], now = new Date()): string => {
  const start = `${prefix || DEFAULT_DOC_PREFIX}-${now.getFullYear()}-`;
  const last = codes.reduce((max, code) => {
    if (!code.toLowerCase().startsWith(start.toLowerCase())) return max;
    const n = Number(code.slice(start.length));
    return Number.isInteger(n) && n > max ? n : max;
  }, 0);
  return `${start}${String(last + 1).padStart(4, '0')}`;
};

/**
 * Forms people can fill in: the built-in ones with their own screen (template) and the ones
 * a department made in the form builder (fields). The five original IT forms are neither,
 * so they are no longer offered; requests made with them stay readable.
 */
export const isOfferedForm = (form: MenuItemPermission): boolean => !!form.template || !!form.fields;

export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
