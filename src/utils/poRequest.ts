import { DepartmentId, MenuItemPermission, PoRequestData, WorkflowDefinition } from '../types';
import { CORPORATE_DEPARTMENTS } from '../data/mockData';
import { COMPANY_NAME_TH } from './itRequest';

// P&O Business Requirement (JRF): the request form of P&O Global Technologies, sent to them
// once it is approved. A built-in shared form (no owning department): the requester picks who
// approves, as on a Ticket Request, and the PDF follows P&O's paper form.
export const PO_FORM_ID = 'form-po-jrf';
export const PO_WORKFLOW_ID = 'wf-po-jrf';
export const PO_SEED_MARKER = 'seed-po-form';
export const PO_FORM_NAME = 'P&O Business Requirement (JRF)';
/** JRF numbers read JRF-<year>-<5 digits>, e.g. JRF-2026-00001 (see requestNumbering in forms.ts). */
export const PO_DOC_PREFIX = 'JRF';
/** The prefix the form was first saved with; an admin's sign-in moves it to PO_DOC_PREFIX. */
export const PO_OLD_DOC_PREFIX = 'PO';

/** Printed at the top of the form, as on P&O's paper form. */
export const PO_HEADER = {
  company: 'P&O GLOBAL TECHNOLOGIES SDN BHD',
  group: '(A member of the Pacific Orient Group)',
  companyNo: 'Company No : 181345 T',
  title: 'Business Requirement (JRF)',
  note: 'Please complete this form and fax it to P&O GLOBAL TECHNOLOGIES SDN BHD for immediate attention',
  contact: 'TEL NO : (03) 2697 9877     FAX NO : (03) 2698 6201',
};

export const PO_DEFAULT_CLIENT = COMPANY_NAME_TH;
export const PO_DEFAULT_TO = 'เจ้าหน้าที่';
export const PO_CLOSING_LINE = 'จึงเรียนมาเพื่ออนุมัติและดำเนินการ';

/** The title of approver n, e.g. "ผู้อนุมัติ (2)", as on the paper form. */
export const poApproverTitle = (n: number) => `ผู้อนุมัติ (${n})`;

export const PO_FORM: MenuItemPermission = {
  id: PO_FORM_ID,
  menuCode: 'PO-JRF',
  menuName: PO_FORM_NAME,
  category: 'แบบฟอร์มกลาง',
  // Shared form: no department owns it; requests belong to the requester's department
  ownerDepartmentId: 'it',
  description: 'ใบขอดำเนินการถึง P&O ผู้ยื่นเลือกผู้อนุมัติเอง ดาวน์โหลดเป็น PDF ตามแบบฟอร์มของ P&O ได้',
  template: 'po_request',
  workflowId: PO_WORKFLOW_ID,
  docPrefix: PO_DOC_PREFIX,
  requesterAddsSteps: true,
  allowedDepartments: Object.fromEntries(CORPORATE_DEPARTMENTS.map(d => [d.id, true])) as Record<
    DepartmentId,
    boolean
  >,
};

// Only the requester is fixed; the approvers are added on the form
export const PO_WORKFLOW: WorkflowDefinition = {
  id: PO_WORKFLOW_ID,
  formId: PO_FORM_ID,
  formTitle: PO_FORM_NAME,
  departmentId: 'it',
  description: 'P&O JRF: ผู้ร้องขอ → ผู้อนุมัติที่ผู้ยื่นเลือก ตามลำดับ',
  itilCategory: 'service_request',
  steps: [
    {
      id: `${PO_WORKFLOW_ID}-requester`,
      stepIndex: 0,
      title: 'ผู้ร้องขอ',
      roleName: 'ผู้ร้องขอ',
      approverType: 'requester',
      sendEmailNotification: true,
      slaHours: 0,
    },
  ],
};

/** yyyy-mm-dd as dd/mm/yyyy in the Buddhist era; empty stays empty. */
export const poDate = (iso: string): string => {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${Number(match[1]) + 543}` : iso;
};

/** The JRF's content as the label/value list shown in the request window. */
export const poAnswers = (po: PoRequestData): { label: string; value: string }[] => [
  { label: "Client's Reference Number", value: po.refNo },
  { label: 'Requested Form (Client Name)', value: po.clientName },
  { label: 'Date Of Request', value: po.requestDate },
  { label: 'Expected Date Of Completion', value: poDate(po.expectedDate) },
  { label: 'Attention To', value: po.attentionTo },
  { label: 'เรียน', value: po.to },
  { label: 'Description Of Request', value: po.description },
];

/** The same content as plain text, for lists, search and email previews. */
export const poDetails = (po: PoRequestData): string =>
  poAnswers(po)
    .filter(a => a.value)
    .map(a => `${a.label}: ${a.value}`)
    .join('\n');
