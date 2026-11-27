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
  /**
   * 'system_admin' (ผู้ดูแลระบบ) has everything 'director' has, plus the system-management menus
   * and admin rights in the Firestore rules. 'admin' is a retired name for 'director'.
   */
  role: 'employee' | 'approver' | 'manager' | 'director' | 'system_admin' | 'admin';
  avatar: string;
  /** Employee this person reports to (their line manager). Unset for the top of a reporting line. */
  reportsToId?: string;
  /** Switched off by an admin: stays in the directory and on documents, but cannot use the system. */
  disabled?: boolean;
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

/** A step handed from the person it waited on to someone else (Ticket Request: Assign / ส่งต่อ). */
export interface StepForward {
  fromName: string;
  fromEmail: string;
  toName: string;
  toEmail: string;
  /** Why it was handed over, or what the new person should do. */
  reason: string;
  /** dd.mm.yyyy hh:mm */
  at: string;
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
  /** Each time the step was handed to someone else, oldest first. */
  forwards?: StepForward[];
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
  /** Set when the request is a P&O Business Requirement (printed in P&O's JRF layout). */
  poRequest?: PoRequestData;
  /** Set when the request is an insurance quotation (ข้อเสนอการประกันภัย). */
  quotation?: QuotationData;
  /** Set when the request is a ticket opened from an email (email-to-ticket). */
  email?: EmailSource;
}

/**
 * The email a ticket was opened from. Employees redirect work email to the shared ticket
 * mailbox; the system reads only that mailbox. Not connected yet: no ticket has this so far.
 */
export interface EmailSource {
  /** The mail server's id of the first message, so the same email never opens two tickets. */
  messageId: string;
  /** Groups replies in the same thread onto this ticket. */
  conversationId?: string;
  fromEmail: string;
  fromName?: string;
  /** Who the email was sent to: the employee among them is the one the ticket is assigned to. */
  to: string[];
  subject: string;
  /** dd.mm.yyyy hh:mm */
  receivedAt: string;
  /** Category key, worked out from the subject (see EMAIL_TICKET_CATEGORIES). */
  category: string;
  /** Messages in the thread, including the first. */
  messageCount?: number;
}

/**
 * An insurance quotation (ข้อเสนอการประกันภัย) for a residential building, as on the company's
 * paper quotation. Amounts and counts are kept as typed (digits, no commas).
 */
export interface QuotationData {
  /** เลขที่: the request number, given when the quotation is sent. */
  docNo: string;
  /** วันที่: long Thai date, e.g. 10 กรกฎาคม พ.ศ. 2569, given when sent. */
  date: string;
  /** ประเภท */
  insuranceType: string;
  /** ผู้เอาประกันภัย */
  insured: string;
  /** โครงการ (optional) */
  project: string;
  /** จำนวนผู้เข้าร่วม, in ราย (optional) */
  participants: string;
  /** สถานที่ตั้งทรัพย์สิน */
  location: string;
  /** ลักษณะสิ่งปลูกสร้าง: the construction classes ticked (1, 2, 3). */
  constructionClasses: number[];
  /** สถานที่ใช้เป็น */
  occupancy: string;
  /** ระยะเวลาเอาประกันภัย: a number and its unit. */
  periodValue: string;
  periodUnit: 'วัน' | 'เดือน' | 'ปี';
  /** ทรัพย์สินที่เอาประกันภัย */
  propertyInsured: string;
  /** ความคุ้มครอง: one item per line. */
  coverage: string;
  /** จำกัดวงเงินความรับผิด (บาท) */
  liabilityLimit: string;
  /** The policy wording the cover follows. */
  policyReference: string;
  /** เงื่อนไขที่สำคัญ */
  conditions: string;
  /** ทุนประกันภัย (บาท ต่อราย) */
  sumInsured: string;
  /** เบี้ยประกันภัยรวม (บาท) */
  premium: string;
  /** ข้อยกเว้น: the clauses chosen, in order. */
  exclusions: string[];
  /** ข้อเสนอนี้มีผลบังคับใช้ภายใน ... วัน */
  validityDays: string;
}

/**
 * A request saved with "บันทึกฉบับร่าง": kept for the person who saved it and not sent to any
 * approver until they open it again and send it.
 */
export interface RequestDraft {
  id: string;
  /** The form it was saved from (MenuItemPermission.id); opening the draft opens that form. */
  formId: string;
  /** The form's name when the draft was saved, shown in the list even if the form is renamed. */
  formName: string;
  /** The title typed so far (may be empty). */
  title: string;
  /** The form's own fields as JSON; each form reads back its own shape. */
  state: string;
  /** dd.mm.yyyy hh:mm of the last save */
  savedAt: string;
  /** The same moment in milliseconds, to list the latest first. */
  savedAtMs: number;
  /** Email of the person who saved it; only they can read it (Firestore rules). */
  createdBy: string;
}

/**
 * A Business Requirement (JRF) sent to P&O. The subject is the request title; the requester,
 * request date and reference number come from the request itself.
 */
export interface PoRequestData {
  /** Requested Form (Client Name) */
  clientName: string;
  /** Attention To: who at P&O it is for (optional). */
  attentionTo: string;
  /** Expected Date Of Completion as yyyy-mm-dd (optional). */
  expectedDate: string;
  /** Addressee line that opens the description, e.g. เจ้าหน้าที่. */
  to: string;
  /** Description Of Request */
  description: string;
  /** Client's Reference Number, given when the request is sent. */
  refNo: string;
  /** Date Of Request as dd/mm/yyyy in the Buddhist era, given when the request is sent. */
  requestDate: string;
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
  /** "ที่": the request number, e.g. MEMO-2026-00001 (memos from before 2026-11 read IT015/69). */
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

/** Who may read a knowledge article. */
export type KbVisibility = 'all' | 'department';

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
  /** Optional shortcut to a JMI E-Service form related to the article. */
  relatedForm?: { label: string; category: ItRequestCategory };
  /** Plain text of an article written by an employee, for search and reading time. */
  body?: string;
  /** Formatted content of an article written by an employee (rich text editor JSON). */
  content?: JSONContent;
  attachments?: KbAttachment[];
  /** Who may read it: everyone (the default) or only one department. */
  visibility?: KbVisibility;
  /** With 'department': the department that may read it, the author's own when written. */
  visibleDepartmentId?: DepartmentId;
  /** With 'department': sign-in emails (lower case) of people outside it who may also read it. */
  sharedWith?: string[];
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

/** 'file' lets the requester pick files; only their names and sizes are kept for now (no upload yet). */
export type FormFieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'file';

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
  /**
   * Department behind a built-in form. A form made in the form builder is a shared one with no
   * owner: this only records the department of whoever made it, and is not shown.
   */
  ownerDepartmentId: DepartmentId;
  // ---- Set on forms a department builds itself (the original IT forms have their own screen) ----
  description?: string;
  fields?: FormFieldDefinition[];
  workflowId?: string;
  /** Start of the request number for this form, e.g. 'Ticket' gives Ticket-2026-0001 (default REQ). */
  docPrefix?: string;
  /** The requester adds the people who handle the request, as many as needed, when filling it in. */
  requesterAddsSteps?: boolean;
  /** A built-in form with its own screen and print layout (not made in the form builder). */
  template?: 'memo' | 'it_request' | 'po_request' | 'quotation';
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
  /** 'forwarded': the person handed the step to someone else instead of deciding. */
  actionTaken?: 'approved' | 'rejected' | 'forwarded' | null;
  /** 'completed' tells the requester their request is fully approved; nothing to decide. */
  kind?: 'approval' | 'completed';
  priority?: PriorityLevel;
  amount?: number;
}
