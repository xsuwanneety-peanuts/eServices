import { DepartmentId, FormFieldType, StepApproverType } from '../types';

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
}

export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
