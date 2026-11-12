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
 */
export type StepApproverType = 'requester' | 'reports_to' | 'reports_to_2' | 'employee';

export type RequestStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'returned';

export interface ApprovalStepConfig {
  id: string;
  stepIndex: number;
  title: string;
  roleName: string;
  approverType: StepApproverType;
  /** Set when approverType is 'employee'. */
  approverEmployeeId?: string;
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
}

export interface ApprovalAuditEntry {
  stepIndex: number;
  stepTitle: string;
  approverName: string;
  approverRole: string;
  approverEmail: string;
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
}

export interface MenuItemPermission {
  id: string;
  menuCode: string;
  menuName: string;
  category: string;
  /** Department that provides the form (its forms appear on that department's page). */
  ownerDepartmentId: DepartmentId;
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
