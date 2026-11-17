import type { JSONContent } from '@tiptap/react';

export type DepartmentId =
  | 'compliance_legal' // Office of the President, Compliance & Legal (สำนักกรรมการผู้จัดการ - 6 HC)
  | 'new_venture'      // New Venture, Business Dev & Partnership (New Venture & BD - 4 HC)
  | 'it'               // Information Technology (เทคโนโลยีสารสนเทศ - 5 HC)
  | 'sales'            // Sales & Intermediary Distribution (พาณิชย์และพันธมิตร - 5 HC)
  | 'underwriting'     // Underwriting (Non-Motor) (รับประกันภัยทั่วไป - 6 HC)
  | 'claims'           // Claims (Motor & Non-Motor) (สินไหมรถยนต์ + ทั่วไป - 17 HC)
  | 'finance_invest'   // Finance & Investment (การเงินและการลงทุน - 5 HC)
  | 'accounting_tax'   // Accounting, Taxation, FP&A and Actuary (บัญชีและภาษี - 7 HC)
  | 'admin_procure'    // Administrative & Procurement (ธุรการ - 4 HC)
  | 'hr';              // Human Resources (ทรัพยากรบุคคล - 1 HC)

export interface DepartmentInfo {
  id: DepartmentId;
  nameEn: string;
  nameTh: string;
  headcount: number;
  shortName: string;
  iconName: string;
}

export type ItilCategory = 'service_request' | 'incident' | 'change_request' | 'problem_rca';
export type ItRequestCategory =
  | 'system_access'    // ขอสิทธิ์เข้าใช้งานระบบ
  | 'equipment'        // ขอเบิกอุปกรณ์
  | 'incident'         // แจ้งปัญหาระบบขัดข้อง
  | 'development'      // ขอพัฒนาระบบใหม่
  | 'data_report';     // ขอข้อมูล

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';
export type ImpactScope = 'individual' | 'department' | 'organization';
export type PriorityLevel = 'P1' | 'P2' | 'P3' | 'P4';

export interface UserPersona {
  id: string;
  name: string;
  email: string;
  departmentId: DepartmentId;
  departmentName: string;
  position: string;
  role: 'employee' | 'approver' | 'manager' | 'director' | 'admin';
  avatar: string;
  /** Employee this person reports to (their line manager). Unset for the top of a reporting line. */
  reportsToId?: string;
}

/**
 * Who approves a workflow step, resolved against the Employee Directory:
 * - requester: the person who submitted the request
 * - reports_to: the requester's line manager
 * - reports_to_2: the line manager's own manager
 * - employee: one specific employee
 * - requester_picks: whoever the requester chooses when filling in the form
 * - department: any member of one department (whoever picks the job up)
 */
export type StepApproverType =
  | 'requester'
  | 'reports_to'
  | 'reports_to_2'
  | 'employee'
  | 'requester_picks'
  | 'department';

/**
 * A step where the person acting records something instead of only approving:
 * - it_work: IT records the diagnosis, the work done and what is handed over
 * - acceptance: the requester accepts the finished work and rates the service
 */
export type StepTask = 'it_work' | 'acceptance';

export type RequestStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'returned';

export interface ApprovalStepConfig {
  id: string;
  stepIndex: number;
  title: string;
  roleName: string;
  approverType: StepApproverType;
  /** Set when approverType is 'employee'. */
  approverEmployeeId?: string;
  /** Set when approverType is 'department'. */
  approverDepartmentId?: DepartmentId;
  task?: StepTask;
  sendEmailNotification: boolean;

  slaHours?: number;
  conditionDescription?: string;
}

export interface WorkflowDefinition {
  id: string;
  formId: string;
  formTitle: string;
  departmentId: DepartmentId;
  description: string;
  itilCategory?: ItilCategory;
  steps: ApprovalStepConfig[];
  createdBy?: string;
}

export interface ApprovalAuditEntry {
  stepIndex: number;
  stepTitle: string;
  approverName: string;
  approverRole: string;
  approverEmail: string;
  /** Set when any member of this department may act on the step. */
  approverDepartmentId?: DepartmentId;
  task?: StepTask;
  status: 'pending' | 'approved' | 'rejected' | 'waiting';
  timestamp?: string;
  comment?: string;
  digitalSignatureHash?: string;
}

export interface DocumentRequest {
  id: string;
  code: string; // e.g. REQ-2025-0102
  title: string;
  category: string;
  departmentId: DepartmentId;
  itilCategory?: ItilCategory;
  itRequestCategory?: ItRequestCategory;
  subCategory?: string;
  requestorId: string;
  requestorName: string;
  requestorEmail: string;
  requestorDepartment: string;
  createdAt: string;
  updatedAt: string;
  status: RequestStatus;
  urgency: UrgencyLevel;
  impact?: ImpactScope;
  priority?: PriorityLevel;
  assignedTo?: string;
  details: string;
  amount?: number;
  attachments?: {
    name: string;
    size: string;
    type: string;
  }[];
  workflowId: string;
  currentStepIndex: number;
  steps: ApprovalAuditEntry[];
  qrCodeUrl?: string;
  /** Set when the request was made with a department-built form. */
  formId?: string;
  answers?: { label: string; value: string }[];
  /** Set when the request is an internal memorandum (printed in the memo layout). */
  memo?: MemoData;
  /** Set when the request is an IT & Request Form (printed in the paper form's layout). */
  itRequest?: ItRequestData;
}

/**
 * One ticked line of the IT & Request Form: what it concerns and the need. Only computers
 * and monitors carry an asset number.
 */
export interface ItRequestItem {
  type: string;
  assetNo: string;
  detail: string;
}

/** Part 2 of the IT & Request Form, plus the hand-over details of part 3, recorded by IT. */
export interface ItWorkRecord {
  urgency: 'urgent' | 'can_wait';
  /** Days it can wait, when urgency is 'can_wait'. */
  waitDays?: number;
  /** กระทบงานประจำ / ไม่กระทบงานประจำ / กระทบระบบคอมพิวเตอร์ */
  impacts: string[];
  estimate: { days: number; hours: number; minutes: number };
  /** สาเหตุ / แนวทางแก้ไข / การแก้ไข หรือการดำเนินการ */
  solution: string;
  /** ซื้อ / ซ่อม / สร้าง / แก้ไข / โอนย้าย */
  actions: string[];
  /** HW / SW / PW */
  kinds: string[];
  /** Start and end of the work as yyyy-mm-ddThh:mm. */
  startAt: string;
  endAt: string;
  /** Cost in baht; 0 when there was none. */
  cost: number;
  equipmentUsed: string[];
  requisitionNo: string;
  requisitionDate: string;
  disposedAssetNo: string;
  transferredAssetNo: string;
}

/** The requester's sign-off in part 3: a 1-5 score on four points and an optional remark. */
export interface ItAcceptance {
  ratings: { service: number; speed: number; accuracy: number; tools: number };
  remark: string;
}

export interface ItRequestData {
  /** The requester's e-mail (the "User" line of the paper form). */
  userLogin: string;
  phone: string;
  /** ผู้ครอบครองทรัพย์สิน: no longer asked for; kept so earlier requests still show it. */
  assetHolder?: string;
  location: string;
  items: ItRequestItem[];
  /** สาเหตุ / อาการ */
  symptom: string;
  work?: ItWorkRecord;
  acceptance?: ItAcceptance;
}

/** Content of an internal memorandum (บันทึกภายใน). The subject is the request title. */
export interface MemoData {
  /** Running number per department and Buddhist year, e.g. IT015/69. */
  docNo: string;
  /** Addressee (เรียน). */
  to: string;
  /** Memo date as dd/mm/yyyy in the Buddhist era. */
  date: string;
  /** สรุปความเป็นมา */
  background: string;
  /** สรุปสาระสำคัญ */
  summary: string;
}

/** One block of a knowledge article: a heading with paragraphs, numbered steps, and/or a tip. */
export interface KnowledgeSection {
  heading: string;
  paragraphs?: string[];
  steps?: string[];
  tip?: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  summary: string;
  /** Department that owns and maintains the article. */
  departmentId: DepartmentId;
  tags: string[];
  updatedAt: string;
  readMinutes: number;
  sections: KnowledgeSection[];
  /** Optional shortcut to an e-Service form related to the article. */
  relatedForm?: { label: string; category: ItRequestCategory };
  /** Plain text of an article written by an employee, for search and reading time. */
  body?: string;
  /** Formatted content of an article written by an employee (rich text editor JSON). */
  content?: JSONContent;
  attachments?: KbAttachment[];
  /** Sign-in email of the employee who wrote it; built-in sample articles have none. */
  createdBy?: string;
  authorName?: string;
}

/** A file attached to a knowledge article. Its bytes live in the kbFiles collection in chunks. */
export interface KbAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  chunks: number;
}

export type FormFieldType = 'text' | 'textarea' | 'number' | 'date' | 'select';

/** One input on a department-built form. */
export interface FormFieldDefinition {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  /** Choices for a 'select' field. */
  options?: string[];
}

export interface MenuItemPermission {
  id: string;
  menuCode: string;
  menuName: string;
  category: string;
  /** Department that provides the form (its forms appear on that department's page). */
  ownerDepartmentId: DepartmentId;
  // ---- Set on forms a department builds itself (the original IT forms have their own screen) ----
  description?: string;
  fields?: FormFieldDefinition[];
  workflowId?: string;
  /** A built-in form with its own screen and print layout (not made in the form builder). */
  template?: 'memo' | 'it_request';
  /** Sign-in email of whoever created the form; they (and admins) may edit or delete it. */
  createdBy?: string;
  allowedDepartments: Record<DepartmentId, boolean>;
}

export interface ActionEmailNotification {
  id: string;
  requestId: string;
  requestCode: string;
  requestTitle: string;
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  stepTitle: string;
  createdAt: string;
  read: boolean;
  actionTaken?: 'approved' | 'rejected' | null;
  priority?: PriorityLevel;
  amount?: number;
}
