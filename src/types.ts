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
}

export type RequestStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'returned';

export interface ApprovalStepConfig {
  id: string;
  stepIndex: number;
  title: string;
  roleName: string;
  assigneeEmail: string;
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

export interface MenuItemPermission {
  id: string;
  menuCode: string;
  menuName: string;
  category: string;
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
