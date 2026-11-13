import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  DepartmentId,
  DepartmentInfo,
  UserPersona,
  MenuItemPermission,
  WorkflowDefinition,
  ApprovalStepConfig,
  DocumentRequest,
  ActionEmailNotification,
  ApprovalAuditEntry,
  ItilCategory,
  ItRequestCategory,
  UrgencyLevel,
  ImpactScope,
  PriorityLevel,
} from '../types';
import {
  CORPORATE_DEPARTMENTS,
  USER_PERSONAS,
  INITIAL_MENU_PERMISSIONS,
  INITIAL_WORKFLOWS,
  INITIAL_REQUESTS,
  initialsAvatar,
} from '../data/mockData';
import { resolveStepApprover } from '../utils/approvers';
import { isArray, usePersistentState } from '../utils/persistentState';
import { seedCollectionsOnce, useFirestoreCollection } from '../utils/firestoreCollection';
import { useAuth } from '../components/AuthGate';
import { SEED_SAMPLE_DATA } from '../lib/firebase';
import { CustomFormInput, FORM_CODE_PREFIX } from '../utils/forms';

const ADMIN_TABS = ['access_control', 'workflow_builder', 'employee_directory'];

const UNASSIGNED_APPROVER = 'ยังไม่ได้กำหนดผู้อนุมัติ';

/** Audit-trail fields for the person who must decide a step (or a placeholder when none is set up). */
const approverFields = (
  step: ApprovalStepConfig | undefined,
  requestorId: string,
  employees: UserPersona[]
): Pick<ApprovalAuditEntry, 'approverName' | 'approverRole' | 'approverEmail'> => {
  const approver = step ? resolveStepApprover(step, requestorId, employees) : undefined;
  return approver
    ? { approverName: approver.name, approverRole: approver.position, approverEmail: approver.email }
    : { approverName: UNASSIGNED_APPROVER, approverRole: step?.title ?? '', approverEmail: '' };
};

// Sample requests: point every step that is not decided yet at the approver from the directory
const INITIAL_REQUESTS_RESOLVED: DocumentRequest[] = INITIAL_REQUESTS.map(req => {
  const wf = INITIAL_WORKFLOWS.find(w => w.id === req.workflowId);
  return {
    ...req,
    steps: req.steps.map((step, idx) =>
      step.status === 'pending' || step.status === 'waiting'
        ? { ...step, ...approverFields(wf?.steps[idx], req.requestorId, USER_PERSONAS) }
        : step
    ),
  };
});

// Sample notifications: one approval email for every request waiting on someone
const INITIAL_NOTIFICATIONS: ActionEmailNotification[] = INITIAL_REQUESTS_RESOLVED.flatMap(req => {
  const step = req.steps[req.currentStepIndex];
  if (req.status !== 'in_review' || step?.status !== 'pending' || !step.approverEmail) return [];
  return [
    {
      id: `email-${req.id}-${req.currentStepIndex}`,
      requestId: req.id,
      requestCode: req.code,
      requestTitle: req.title,
      recipientEmail: step.approverEmail,
      recipientName: step.approverName,
      senderName: 'ระบบเดินเอกสาร e-Service',
      stepTitle: step.stepTitle,
      createdAt: req.steps[req.currentStepIndex - 1]?.timestamp ?? req.updatedAt,
      read: false,
      priority: req.priority,
    },
  ];
});

const isAdminRole = (user: UserPersona) => user.role === 'admin' || user.role === 'director';

// Who may open each screen. System-management screens need an individual admin sign-in;
// the shared staff account cannot open them (and firestore.rules blocks its writes there).
const canUserAccessTab = (isAdminLogin: boolean, tab: string): boolean =>
  !ADMIN_TABS.includes(tab) || isAdminLogin;

// Stand-in while the employee list is still loading, so derived values never see undefined
const NO_USER: UserPersona = {
  id: '',
  name: '',
  email: '',
  departmentId: 'it',
  departmentName: '',
  position: '',
  role: 'employee',
  avatar: '',
};

/** A progress update on one of the current user's own requests. */
export interface RequestStatusUpdate {
  key: string;
  requestId: string;
  requestCode: string;
  requestTitle: string;
  kind: 'progress' | 'completed' | 'returned';
  message: string;
  comment?: string;
  timestamp: string;
}

interface AppContextType {
  // Corporate departments
  departments: DepartmentInfo[];

  /** The employee who is signed in, matched by sign-in email in the Employee Directory. */
  currentUser: UserPersona;
  /** False when the signed-in email is not in the Employee Directory yet. */
  isLinkedAccount: boolean;

  // Employee Directory (also the source of approvers and email recipients)
  employees: UserPersona[];
  addEmployee: (employee: Omit<UserPersona, 'id' | 'avatar' | 'departmentName'>) => void;
  updateEmployee: (id: string, patch: Partial<Omit<UserPersona, 'id'>>) => void;

  /** True once the shared data has loaded from Firestore. */
  dataReady: boolean;

  // Navigation
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeDeptFilter: DepartmentId | null;
  setActiveDeptFilter: (dept: DepartmentId | null) => void;
  /** Knowledge Base article being read (null shows the article list). */
  activeArticleId: string | null;
  setActiveArticleId: (id: string | null) => void;

  // Permissions (Top-Right Screen: ตั้งค่าสิทธิ์เข้าถึง)
  menuPermissions: MenuItemPermission[];
  togglePermission: (menuId: string, deptId: DepartmentId) => void;
  /** Open a form to every department (true) or close it to all of them (false). */
  setFormAccessForAll: (menuId: string, allowed: boolean) => void;
  /** Whether the signed-in user may build forms for this department (its members, and admins). */
  canManageForms: (deptId: DepartmentId) => boolean;
  /** Whether the signed-in user may edit or delete this department-built form. */
  canEditForm: (form: MenuItemPermission) => boolean;
  /** Create (no existingId) or update a department-built form and its approval workflow. */
  saveCustomForm: (deptId: DepartmentId, input: CustomFormInput, existingId?: string) => void;
  deleteCustomForm: (formId: string) => void;
  resetPermissions: () => void;
  isMenuPermittedForUser: (menuCode: string) => boolean;

  // Workflows (Bottom-Right Screen: ตั้งค่า Flow อนุมัติ & แจ้งเตือนอีเมล)
  workflows: WorkflowDefinition[];
  selectedWorkflowId: string;
  setSelectedWorkflowId: (id: string) => void;
  activeWorkflow: WorkflowDefinition | undefined;
  updateWorkflowStep: (stepId: string, patch: Partial<ApprovalStepConfig>) => void;
  addWorkflowStep: (afterIndex: number) => void;
  removeWorkflowStep: (stepId: string) => void;
  moveWorkflowStep: (stepId: string, direction: 'up' | 'down') => void;
  saveWorkflowChanges: () => void;

  // Requests
  requests: DocumentRequest[];
  createNewRequest: (newReq: Partial<DocumentRequest>) => DocumentRequest;
  approveRequest: (requestId: string, comment?: string) => void;
  rejectRequest: (requestId: string, reason: string) => void;
  /** Requester fixes a returned request and sends it back to the step that returned it. */
  resubmitRequest: (requestId: string, input: { title: string; details: string; note: string }) => void;
  activeRequest: DocumentRequest | null;
  setActiveRequestId: (id: string | null) => void;

  // Approval notifications
  emailNotifications: ActionEmailNotification[];
  selectedNotification: ActionEmailNotification | null;
  setSelectedNotificationId: (id: string | null) => void;
  executeEmailAction: (notificationId: string, action: 'approved' | 'rejected', comment?: string) => void;

  // Modals
  isNewRequestModalOpen: boolean;
  setIsNewRequestModalOpen: (open: boolean) => void;
  selectedItRequestCategory: ItRequestCategory;
  setSelectedItRequestCategory: (cat: ItRequestCategory) => void;
  openNewRequestModal: (category?: ItRequestCategory) => void;
  isEmailSimulatorModalOpen: boolean;
  setIsEmailSimulatorModalOpen: (open: boolean) => void;
  isPrintModalOpen: boolean;
  setIsPrintModalOpen: (open: boolean) => void;

  // Toast
  toast: { message: string; type: 'success' | 'info' | 'warning' } | null;
  showToast: (message: string, type?: 'success' | 'info' | 'warning') => void;

  // Role-based visibility
  /** Directors and admins: see everything and manage the system. */
  isSystemAdmin: boolean;
  /** Whether the current user may open the given screen. */
  canAccessTab: (tab: string) => boolean;
  /** Anyone who takes part in approving requests (not a plain requester). */
  canApprove: boolean;
  /** True when the current step of the request is waiting on the current user. */
  canActOnRequest: (request: DocumentRequest) => boolean;
  canViewRequest: (request: DocumentRequest) => boolean;
  /** Requests submitted by the current user. */
  myRequests: DocumentRequest[];
  /** Requests whose current step is waiting on the current user. */
  approvalQueue: DocumentRequest[];
  /** Approval notifications addressed to the current user. */
  myNotifications: ActionEmailNotification[];
  /** Progress updates on the current user's own requests, newest first. */
  myStatusUpdates: RequestStatusUpdate[];
  unseenStatusUpdateCount: number;
  markStatusUpdatesSeen: () => void;

  // Stats
  userPendingCount: number;
  userApprovedCount: number;
  userTotalCount: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdminLogin } = useAuth();
  const signedInEmail = (user.email ?? '').toLowerCase();

  // Write failures (e.g. the staff account editing admin-only data) are reported, and the
  // Firestore listener puts the shared data back the way it was
  const handleWriteError = (error: unknown) => {
    const code = (error as { code?: string })?.code;
    showToast(
      code === 'permission-denied'
        ? 'บัญชีนี้ไม่มีสิทธิ์แก้ไขข้อมูลส่วนนี้'
        : 'บันทึกข้อมูลไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่',
      'warning'
    );
  };

  // Shared through Firestore: every device sees the same data
  const [employees, setEmployees, employeesLoaded] = useFirestoreCollection<UserPersona>('employees', handleWriteError);

  // Each account is one employee: the directory entry with the same email as the sign-in
  const linkedEmployee = employees.find(e => e.email.toLowerCase() === signedInEmail);
  const isLinkedAccount = !!linkedEmployee;
  // An admin account that is not in the directory yet still needs to get in to add people,
  // so it gets a temporary admin profile; other unlinked accounts are stopped in App
  const currentUser: UserPersona =
    linkedEmployee ??
    (isAdminLogin
      ? {
          id: `account:${user.uid}`,
          name: signedInEmail,
          email: signedInEmail,
          departmentId: 'it',
          departmentName: 'Information Technology (เทคโนโลยีสารสนเทศ)',
          position: 'ผู้ดูแลระบบ',
          role: 'director',
          avatar: initialsAvatar(signedInEmail),
        }
      : NO_USER);
  const [activeTab, setActiveTab] = useState<string>('my_workspace');
  // Which progress updates this account has already seen (kept in this browser, per account)
  const [seenStatusUpdateKeys, setSeenStatusUpdateKeys] = usePersistentState<string[]>(
    `seenStatusUpdates:${signedInEmail}`,
    [],
    isArray
  );
  const [activeDeptFilter, setActiveDeptFilter] = useState<DepartmentId | null>(null);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);

  const [menuPermissions, setMenuPermissions, permissionsLoaded] = useFirestoreCollection<MenuItemPermission>(
    'menuPermissions',
    handleWriteError
  );
  const [workflows, setWorkflows, workflowsLoaded] = useFirestoreCollection<WorkflowDefinition>(
    'workflows',
    handleWriteError
  );
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(INITIAL_WORKFLOWS[0].id);

  const [requests, setRequests, requestsLoaded] = useFirestoreCollection<DocumentRequest>('requests', handleWriteError);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  const [emailNotifications, setEmailNotifications, notificationsLoaded] =
    useFirestoreCollection<ActionEmailNotification>('notifications', handleWriteError);

  const dataReady =
    employeesLoaded && permissionsLoaded && workflowsLoaded && requestsLoaded && notificationsLoaded;

  // A brand-new Firebase project starts empty: the first admin sign-in fills it, once (a
  // marker document prevents re-seeding after data is cleaned up). Development gets sample
  // employees and requests; production only gets the standard IT forms and their flows.
  useEffect(() => {
    if (!isAdminLogin) return;
    seedCollectionsOnce(
      SEED_SAMPLE_DATA
        ? {
            employees: USER_PERSONAS,
            menuPermissions: INITIAL_MENU_PERMISSIONS,
            workflows: INITIAL_WORKFLOWS,
            requests: INITIAL_REQUESTS_RESOLVED,
            notifications: INITIAL_NOTIFICATIONS,
          }
        : {
            menuPermissions: INITIAL_MENU_PERMISSIONS,
            workflows: INITIAL_WORKFLOWS,
          }
    ).catch(handleWriteError);
  }, [isAdminLogin]);

  // ---- Employee Directory ----
  const departmentLabel = (deptId: DepartmentId) => {
    const dept = CORPORATE_DEPARTMENTS.find(d => d.id === deptId);
    return dept ? `${dept.nameEn} (${dept.nameTh})` : deptId;
  };

  const addEmployee = (employee: Omit<UserPersona, 'id' | 'avatar' | 'departmentName'>) => {
    const newEmployee: UserPersona = {
      ...employee,
      id: `emp-${Date.now()}`,
      avatar: initialsAvatar(employee.name),
      departmentName: departmentLabel(employee.departmentId),
    };
    setEmployees(prev => [...prev, newEmployee]);
  };

  const updateEmployee = (id: string, patch: Partial<Omit<UserPersona, 'id'>>) => {
    setEmployees(prev =>
      prev.map(e => {
        if (e.id !== id) return e;
        const next = { ...e, ...patch };
        if (patch.departmentId && patch.departmentId !== e.departmentId) {
          next.departmentName = departmentLabel(patch.departmentId);
        }
        if (patch.name && patch.name !== e.name && e.avatar.startsWith('data:image/svg')) {
          next.avatar = initialsAvatar(patch.name);
        }
        return next;
      })
    );
  };
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);

  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [selectedItRequestCategory, setSelectedItRequestCategory] = useState<ItRequestCategory>('system_access');

  const openNewRequestModal = (category?: ItRequestCategory) => {
    if (category) {
      setSelectedItRequestCategory(category);
    }
    setIsNewRequestModalOpen(true);
  };

  const [isEmailSimulatorModalOpen, setIsEmailSimulatorModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Check if current user has permission for a specific menu code
  const isMenuPermittedForUser = (menuCode: string): boolean => {
    if (currentUser.role === 'admin' || currentUser.role === 'director') return true;
    const perm = menuPermissions.find(p => p.menuCode === menuCode);
    if (!perm) return true;
    return perm.allowedDepartments[currentUser.departmentId] ?? false;
  };

  // Toggle permission in the matrix
  const togglePermission = (menuId: string, deptId: DepartmentId) => {
    setMenuPermissions(prev =>
      prev.map(item => {
        if (item.id === menuId) {
          return {
            ...item,
            allowedDepartments: {
              ...item.allowedDepartments,
              [deptId]: !item.allowedDepartments[deptId],
            },
          };
        }
        return item;
      })
    );
    showToast('ปรับปรุงสิทธิ์การเข้าถึงเรียบร้อยแล้ว', 'info');
  };

  // ---- Department-built forms ----
  const canManageForms = (deptId: DepartmentId) =>
    isAdminLogin || (isLinkedAccount && currentUser.departmentId === deptId);

  const canEditForm = (form: MenuItemPermission) =>
    !!form.fields && (isAdminLogin || form.createdBy?.toLowerCase() === signedInEmail);

  const saveCustomForm = (deptId: DepartmentId, input: CustomFormInput, existingId?: string) => {
    const existing = existingId ? menuPermissions.find(f => f.id === existingId) : undefined;
    const formId = existing?.id ?? `form-${deptId}-${Date.now().toString(36)}`;
    const workflowId = existing?.workflowId ?? `wf-${formId}`;
    const createdBy = existing?.createdBy ?? signedInEmail;

    // Next free code for this department, e.g. HR-FORM-01
    let menuCode = existing?.menuCode;
    if (!menuCode) {
      const prefix = FORM_CODE_PREFIX[deptId];
      let n = menuPermissions.filter(f => f.ownerDepartmentId === deptId).length + 1;
      while (menuPermissions.some(f => f.menuCode === `${prefix}-FORM-${String(n).padStart(2, '0')}`)) n++;
      menuCode = `${prefix}-FORM-${String(n).padStart(2, '0')}`;
    }

    const allowedDepartments =
      input.audience === 'custom' && existing
        ? existing.allowedDepartments
        : (Object.fromEntries(
            CORPORATE_DEPARTMENTS.map(d => [d.id, input.audience === 'all' || d.id === deptId])
          ) as Record<DepartmentId, boolean>);

    const form: MenuItemPermission = {
      id: formId,
      menuCode,
      menuName: input.name,
      category: CORPORATE_DEPARTMENTS.find(d => d.id === deptId)?.nameEn ?? deptId,
      ownerDepartmentId: deptId,
      allowedDepartments,
      description: input.description,
      fields: input.fields,
      workflowId,
      createdBy,
    };

    const workflow: WorkflowDefinition = {
      id: workflowId,
      formId,
      formTitle: input.name,
      departmentId: deptId,
      description: input.description,
      itilCategory: 'service_request',
      createdBy,
      steps: [
        {
          id: `${workflowId}-requester`,
          stepIndex: 0,
          title: 'ผู้ยื่นคำร้อง',
          roleName: 'ผู้ยื่นคำขอ',
          approverType: 'requester',
          sendEmailNotification: true,
          slaHours: 0,
        },
        ...input.steps.map((step, idx) => ({
          id: step.id,
          stepIndex: idx + 1,
          title: step.title,
          roleName: step.title,
          approverType: step.approverType,
          approverEmployeeId: step.approverType === 'employee' ? step.approverEmployeeId : undefined,
          sendEmailNotification: true,
          slaHours: 24,
        })),
      ],
    };

    setMenuPermissions(prev => (existing ? prev.map(f => (f.id === formId ? form : f)) : [...prev, form]));
    setWorkflows(prev =>
      prev.some(w => w.id === workflowId) ? prev.map(w => (w.id === workflowId ? workflow : w)) : [...prev, workflow]
    );
    showToast(existing ? `บันทึกแบบฟอร์ม "${input.name}" แล้ว` : `สร้างแบบฟอร์ม ${menuCode} "${input.name}" แล้ว`, 'success');
  };

  const deleteCustomForm = (formId: string) => {
    const form = menuPermissions.find(f => f.id === formId);
    if (!form) return;
    setMenuPermissions(prev => prev.filter(f => f.id !== formId));
    if (form.workflowId) setWorkflows(prev => prev.filter(w => w.id !== form.workflowId));
    showToast(`ลบแบบฟอร์ม "${form.menuName}" แล้ว`, 'info');
  };

  const setFormAccessForAll = (menuId: string, allowed: boolean) => {
    setMenuPermissions(prev =>
      prev.map(item =>
        item.id === menuId
          ? {
              ...item,
              allowedDepartments: Object.fromEntries(
                CORPORATE_DEPARTMENTS.map(d => [d.id, allowed])
              ) as Record<DepartmentId, boolean>,
            }
          : item
      )
    );
    showToast(allowed ? 'เปิดสิทธิ์ให้ทุกหน่วยงานแล้ว' : 'ปิดสิทธิ์ทุกหน่วยงานแล้ว', 'info');
  };

  // Puts the standard forms' access back to the defaults. Forms that departments built
  // themselves have no default, so they are left exactly as they are.
  const resetPermissions = () => {
    setMenuPermissions(prev =>
      prev.map(form => {
        const standard = INITIAL_MENU_PERMISSIONS.find(f => f.id === form.id);
        return standard ? { ...form, allowedDepartments: standard.allowedDepartments } : form;
      })
    );
    showToast('รีเซ็ตสิทธิ์ของแบบฟอร์มมาตรฐานแล้ว (แบบฟอร์มที่หน่วยงานสร้างเองไม่เปลี่ยน)', 'info');
  };

  // Active workflow
  const activeWorkflow = useMemo(() => {
    return workflows.find(w => w.id === selectedWorkflowId) || workflows[0];
  }, [workflows, selectedWorkflowId]);

  // Update step in workflow builder
  const updateWorkflowStep = (stepId: string, patch: Partial<ApprovalStepConfig>) => {
    setWorkflows(prev =>
      prev.map(wf => {
        if (wf.id === selectedWorkflowId) {
          return {
            ...wf,
            steps: wf.steps.map(step => (step.id === stepId ? { ...step, ...patch } : step)),
          };
        }
        return wf;
      })
    );
  };

  // Add step to workflow
  const addWorkflowStep = (afterIndex: number) => {
    setWorkflows(prev =>
      prev.map(wf => {
        if (wf.id === selectedWorkflowId) {
          const newSteps = [...wf.steps];
          const newStep: ApprovalStepConfig = {
            id: `step-custom-${Date.now()}`,
            stepIndex: afterIndex + 1,
            title: 'ขั้นตอนอนุมัติเพิ่มเติม',
            roleName: 'ผู้บังคับบัญชาของผู้ยื่น',
            approverType: 'reports_to',
            sendEmailNotification: true,
            slaHours: 24,
          };
          newSteps.splice(afterIndex + 1, 0, newStep);
          // Reindex
          const reindexed = newSteps.map((s, idx) => ({ ...s, stepIndex: idx }));
          return { ...wf, steps: reindexed };
        }
        return wf;
      })
    );
    showToast('เพิ่มขั้นตอนสายการอนุมัติแล้ว', 'success');
  };

  // Remove step
  const removeWorkflowStep = (stepId: string) => {
    setWorkflows(prev =>
      prev.map(wf => {
        if (wf.id === selectedWorkflowId) {
          if (wf.steps.length <= 2) {
            showToast('สายการอนุมัติต้องมีอย่างน้อย 2 ขั้นตอน (ผู้ยื่นและผู้อนุมัติ)', 'warning');
            return wf;
          }
          const filtered = wf.steps.filter(s => s.id !== stepId);
          const reindexed = filtered.map((s, idx) => ({ ...s, stepIndex: idx }));
          return { ...wf, steps: reindexed };
        }
        return wf;
      })
    );
    showToast('ลบขั้นตอนการอนุมัติแล้ว', 'info');
  };

  // Move step up or down
  const moveWorkflowStep = (stepId: string, direction: 'up' | 'down') => {
    setWorkflows(prev =>
      prev.map(wf => {
        if (wf.id === selectedWorkflowId) {
          const index = wf.steps.findIndex(s => s.id === stepId);
          if (index < 0) return wf;
          if (direction === 'up' && index <= 1) return wf; // don't move above creator
          if (direction === 'down' && index >= wf.steps.length - 1) return wf;

          const targetIndex = direction === 'up' ? index - 1 : index + 1;
          const newSteps = [...wf.steps];
          const [moved] = newSteps.splice(index, 1);
          newSteps.splice(targetIndex, 0, moved);

          const reindexed = newSteps.map((s, idx) => ({ ...s, stepIndex: idx }));
          return { ...wf, steps: reindexed };
        }
        return wf;
      })
    );
  };

  const saveWorkflowChanges = () => {
    showToast('บันทึกการตั้งค่าสายการอนุมัติและระบบแจ้งเตือนอีเมลเรียบร้อยแล้ว', 'success');
  };

  // Create new request
  const createNewRequest = (newReq: Partial<DocumentRequest>): DocumentRequest => {
    const matchedWf = workflows.find(w => w.id === (newReq.workflowId || 'wf-procure')) || workflows[0];
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    // Next number in this year's sequence, e.g. REQ-2026-0007
    const yearPrefix = `REQ-${now.getFullYear()}-`;
    const lastNumber = requests.reduce((max, r) => {
      if (!r.code.startsWith(yearPrefix)) return max;
      const n = Number(r.code.slice(yearPrefix.length));
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    const requestCode = `${yearPrefix}${String(lastNumber + 1).padStart(4, '0')}`;

    // Generate initial audit entries from workflow steps
    const auditSteps: ApprovalAuditEntry[] = matchedWf.steps.map((s, idx) => {
      if (idx === 0) {
        return {
          stepIndex: 0,
          stepTitle: s.title,
          approverName: currentUser.name,
          approverRole: currentUser.position,
          approverEmail: currentUser.email,
          status: 'approved',
          timestamp: dateStr,
          comment: 'ส่งคำร้องขอผ่านระบบ e-Service เรียบร้อยแล้ว',
          digitalSignatureHash: `DIGI-SIGN-CREATED-${Date.now()}-AUTH`,
        };
      }
      // Approvers come from the Employee Directory, resolved for this requester at submission
      return {
        stepIndex: idx,
        stepTitle: s.title,
        ...approverFields(s, currentUser.id, employees),
        status: idx === 1 ? 'pending' : 'waiting',
      };
    });

    const doc: DocumentRequest = {
      id: `req-${Date.now()}`,
      code: requestCode,
      title: newReq.title || 'คำร้องขอใช้บริการทั่วไป',
      category: newReq.category || matchedWf.formTitle,
      departmentId: newReq.departmentId || 'it',
      itilCategory: newReq.itilCategory || 'service_request',
      requestorId: currentUser.id,
      requestorName: currentUser.name,
      requestorEmail: currentUser.email,
      requestorDepartment: currentUser.departmentName,
      createdAt: dateStr,
      updatedAt: dateStr,
      status: 'in_review',
      amount: newReq.amount,
      urgency: newReq.urgency || 'medium',
      // Impact, priority (P1-P4) and assignee are IT service-desk fields; other forms leave them empty
      impact: newReq.impact,
      priority: newReq.priority,
      assignedTo: newReq.assignedTo,
      details: newReq.details || '',
      attachments: newReq.attachments || [],
      formId: newReq.formId,
      answers: newReq.answers,
      workflowId: matchedWf.id,
      currentStepIndex: 1, // Next approver
      steps: auditSteps,
    };

    setRequests(prev => [doc, ...prev]);

    // Notify the next approver
    const nextStepConfig = matchedWf.steps[1];
    const nextApprover = auditSteps[1];
    if (nextStepConfig && nextStepConfig.sendEmailNotification && nextApprover?.approverEmail) {
      const emailNotif: ActionEmailNotification = {
        id: `email-${Date.now()}`,
        requestId: doc.id,
        requestCode: doc.code,
        requestTitle: doc.title,
        recipientEmail: nextApprover.approverEmail,
        recipientName: nextApprover.approverName,
        senderName: `${currentUser.name} (${currentUser.departmentName})`,
        stepTitle: nextStepConfig.title,
        createdAt: dateStr,
        read: false,
        amount: doc.amount,
      };
      setEmailNotifications(prev => [emailNotif, ...prev]);
    }

    showToast(`สร้างคำร้อง ${doc.code} สำเร็จ — แจ้งเตือนผู้อนุมัติลำดับถัดไปในระบบแล้ว`, 'success');
    return doc;
  };

  // Mark the approval alerts already sent for this request as handled, so the bell clears
  // no matter where the decision was made (request window or email preview)
  const closeOpenNotifications = (requestId: string, action: 'approved' | 'rejected') => {
    const openIds = emailNotifications.filter(n => n.requestId === requestId && !n.actionTaken).map(n => n.id);
    if (openIds.length === 0) return;
    setEmailNotifications(prev =>
      prev.map(n => (openIds.includes(n.id) ? { ...n, read: true, actionTaken: action } : n))
    );
  };

  // Approve a request
  const approveRequest = (requestId: string, comment: string = 'เห็นชอบอนุมัติตามระเบียบ') => {
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Captured before the next step's alert is added below
    closeOpenNotifications(requestId, 'approved');

    setRequests(prev =>
      prev.map(req => {
        if (req.id !== requestId) return req;

        const currentStep = req.currentStepIndex;
        const totalSteps = req.steps.length;

        const updatedSteps = req.steps.map((st, idx) => {
          if (idx === currentStep) {
            return {
              ...st,
              status: 'approved' as const,
              approverName: currentUser.name,
              approverRole: currentUser.position,
              approverEmail: currentUser.email,
              timestamp: dateStr,
              comment: comment || 'อนุมัติเรียบร้อย',
              digitalSignatureHash: `DIGI-STAMP-${Date.now()}-APPROVED-${currentUser.id}`,
            };
          }
          if (idx === currentStep + 1) {
            return {
              ...st,
              status: 'pending' as const,
            };
          }
          return st;
        });

        const isFinalStep = currentStep >= totalSteps - 1;
        const newStatus = isFinalStep ? ('approved' as const) : ('in_review' as const);

        // Alert the next approver, unless that step has email notification switched off
        const nextStepConfig = workflows.find(w => w.id === req.workflowId)?.steps[currentStep + 1];
        const notifyNext = nextStepConfig?.sendEmailNotification ?? true;
        if (!isFinalStep && notifyNext && updatedSteps[currentStep + 1]?.approverEmail) {
          const nextStepIdx = currentStep + 1;
          const nextAudit = updatedSteps[nextStepIdx];
          const newNotif: ActionEmailNotification = {
            id: `email-${Date.now()}`,
            requestId: req.id,
            requestCode: req.code,
            requestTitle: req.title,
            recipientEmail: nextAudit.approverEmail,
            recipientName: nextAudit.approverName,
            senderName: `ระบบ e-Service (ส่งต่อจาก ${currentUser.name})`,
            stepTitle: nextAudit.stepTitle,
            createdAt: dateStr,
            read: false,
            amount: req.amount,
          };
          setEmailNotifications(n => [newNotif, ...n]);
        }

        return {
          ...req,
          status: newStatus,
          currentStepIndex: isFinalStep ? currentStep : currentStep + 1,
          updatedAt: dateStr,
          steps: updatedSteps,
        };
      })
    );

    showToast(`ประทับตราอนุมัติเอกสารเรียบร้อยแล้ว`, 'success');
  };

  // Reject / Return request
  const rejectRequest = (requestId: string, reason: string) => {
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    closeOpenNotifications(requestId, 'rejected');

    setRequests(prev =>
      prev.map(req => {
        if (req.id !== requestId) return req;

        const currentStep = req.currentStepIndex;
        const updatedSteps = req.steps.map((st, idx) => {
          if (idx === currentStep) {
            return {
              ...st,
              status: 'rejected' as const,
              approverName: currentUser.name,
              approverRole: currentUser.position,
              approverEmail: currentUser.email,
              timestamp: dateStr,
              comment: `ตีกลับ: ${reason}`,
              digitalSignatureHash: `DIGI-REJECT-${Date.now()}`,
            };
          }
          return st;
        });

        return {
          ...req,
          status: 'returned' as const,
          updatedAt: dateStr,
          steps: updatedSteps,
        };
      })
    );

    showToast(`ส่งคืน/ตีกลับเอกสารถึงผู้ยื่นคำร้องพร้อมระบุเหตุผลแล้ว`, 'warning');
  };

  const resubmitRequest = (requestId: string, input: { title: string; details: string; note: string }) => {
    const req = requests.find(r => r.id === requestId);
    if (!req || req.status !== 'returned') return;
    const returnedAt = req.steps.findIndex(s => s.status === 'rejected');
    if (returnedAt < 0) return;

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const returnedStep = req.steps[returnedAt];
    const resubmitNote = `ส่งใหม่ ${dateStr}${input.note ? `: ${input.note}` : ''}`;
    const detailsChanged = input.details !== req.details;

    setRequests(prev =>
      prev.map(r => {
        if (r.id !== requestId) return r;
        return {
          ...r,
          title: input.title,
          details: input.details,
          // Answers of a built form are shown from `details`; drop the old copy once it is edited
          answers: detailsChanged ? undefined : r.answers,
          status: 'in_review' as const,
          currentStepIndex: returnedAt,
          updatedAt: dateStr,
          steps: r.steps.map((s, idx) => {
            if (idx === 0) return { ...s, comment: s.comment ? `${s.comment}\n${resubmitNote}` : resubmitNote };
            if (idx === returnedAt) {
              // Back to the same approver, keeping the earlier reason visible
              return {
                ...s,
                status: 'pending' as const,
                timestamp: undefined,
                digitalSignatureHash: undefined,
                comment: `ตีกลับครั้งก่อน: ${(s.comment ?? '').replace(/^ตีกลับ: /, '')}`,
              };
            }
            return s;
          }),
        };
      })
    );

    if (returnedStep.approverEmail) {
      setEmailNotifications(prev => [
        {
          id: `email-${Date.now()}`,
          requestId: req.id,
          requestCode: req.code,
          requestTitle: input.title,
          recipientEmail: returnedStep.approverEmail,
          recipientName: returnedStep.approverName,
          senderName: `${currentUser.name} (ส่งใหม่หลังแก้ไข)`,
          stepTitle: returnedStep.stepTitle,
          createdAt: dateStr,
          read: false,
          amount: req.amount,
        },
        ...prev,
      ]);
    }
    showToast(`ส่งคำร้อง ${req.code} กลับไปที่ขั้น "${returnedStep.stepTitle}" แล้ว`, 'success');
  };

  // Approve or return straight from the approval email preview
  const executeEmailAction = (notificationId: string, action: 'approved' | 'rejected', comment?: string) => {
    const notif = emailNotifications.find(n => n.id === notificationId);
    if (!notif) return;

    if (action === 'approved') {
      approveRequest(notif.requestId, comment || 'อนุมัติผ่าน One-Click Email Action');
    } else {
      rejectRequest(notif.requestId, comment || 'ตีกลับเอกสารผ่าน One-Click Email Action');
    }

    setEmailNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read: true, actionTaken: action } : n))
    );
  };

  const activeRequest = useMemo(() => {
    return requests.find(r => r.id === activeRequestId) || null;
  }, [requests, activeRequestId]);

  // ---- Role-based visibility ----
  const isSystemAdmin = isAdminRole(currentUser);
  const canApprove = currentUser.role !== 'employee';

  // Approvers are real employees from the directory, so a step belongs to whoever's email it carries
  const isMine = (email: string) => isSystemAdmin || (!!email && email === currentUser.email);

  const canActOnRequest = (request: DocumentRequest): boolean => {
    if (request.status !== 'in_review' && request.status !== 'pending') return false;
    const step = request.steps[request.currentStepIndex];
    if (!step || step.status !== 'pending') return false;
    return isMine(step.approverEmail);
  };

  const canViewRequest = (request: DocumentRequest): boolean => {
    if (isSystemAdmin) return true;
    if (request.requestorId === currentUser.id) return true;
    if (request.steps.some(step => step.status !== 'waiting' && isMine(step.approverEmail))) return true;
    // Members of the department that handles the request see it, whatever their role
    return request.departmentId === currentUser.departmentId;
  };

  const myRequests = requests.filter(r => r.requestorId === currentUser.id);
  const approvalQueue = requests.filter(canActOnRequest);

  const myNotifications = emailNotifications.filter(notif => isMine(notif.recipientEmail));

  // Latest progress on each of the current user's own requests
  const myStatusUpdates: RequestStatusUpdate[] = myRequests.flatMap((req): RequestStatusUpdate[] => {
    let latestIndex = -1;
    req.steps.forEach((step, idx) => {
      if (idx > 0 && step.timestamp && (step.status === 'approved' || step.status === 'rejected')) {
        latestIndex = idx;
      }
    });
    if (latestIndex < 0) return [];

    const step = req.steps[latestIndex];
    const nextStep = req.steps[latestIndex + 1];
    const base = {
      key: `${req.id}:${latestIndex}:${step.status}`,
      requestId: req.id,
      requestCode: req.code,
      requestTitle: req.title,
      comment: step.comment,
      timestamp: step.timestamp || req.updatedAt,
    };

    if (step.status === 'rejected') {
      return [{ ...base, kind: 'returned' as const, message: `ถูกตีกลับที่ขั้น "${step.stepTitle}"` }];
    }
    if (req.status === 'approved' || !nextStep) {
      return [{ ...base, kind: 'completed' as const, message: 'อนุมัติครบทุกขั้นตอนแล้ว' }];
    }
    return [
      {
        ...base,
        kind: 'progress' as const,
        message: `ผ่านขั้น "${step.stepTitle}" แล้ว — รอ: ${nextStep.stepTitle}`,
      },
    ];
  });

  const unseenStatusUpdateCount = myStatusUpdates.filter(u => !seenStatusUpdateKeys.includes(u.key)).length;

  const markStatusUpdatesSeen = () => {
    setSeenStatusUpdateKeys(prev => {
      const missing = myStatusUpdates.map(u => u.key).filter(key => !prev.includes(key));
      return missing.length > 0 ? [...prev, ...missing] : prev;
    });
  };

  const selectedNotification = useMemo(() => {
    return emailNotifications.find(n => n.id === selectedNotificationId) || null;
  }, [emailNotifications, selectedNotificationId]);

  // Personalized stats
  const userPendingCount = useMemo(() => {
    return requests.filter(r => r.status === 'in_review' || r.status === 'pending').length;
  }, [requests]);

  const userApprovedCount = useMemo(() => {
    return requests.filter(r => r.status === 'approved').length;
  }, [requests]);

  const userTotalCount = requests.length;

  return (
    <AppContext.Provider
      value={{
        departments: CORPORATE_DEPARTMENTS,
        currentUser,
        isLinkedAccount,
        employees,
        addEmployee,
        updateEmployee,
        dataReady,
        activeTab,
        setActiveTab,
        activeDeptFilter,
        setActiveDeptFilter,
        activeArticleId,
        setActiveArticleId,
        menuPermissions,
        togglePermission,
        setFormAccessForAll,
        canManageForms,
        canEditForm,
        saveCustomForm,
        deleteCustomForm,
        resetPermissions,
        isMenuPermittedForUser,
        workflows,
        selectedWorkflowId,
        setSelectedWorkflowId,
        activeWorkflow,
        updateWorkflowStep,
        addWorkflowStep,
        removeWorkflowStep,
        moveWorkflowStep,
        saveWorkflowChanges,
        requests,
        createNewRequest,
        approveRequest,
        rejectRequest,
        resubmitRequest,
        activeRequest,
        setActiveRequestId,
        emailNotifications,
        selectedNotification,
        setSelectedNotificationId,
        executeEmailAction,
        isNewRequestModalOpen,
        setIsNewRequestModalOpen,
        selectedItRequestCategory,
        setSelectedItRequestCategory,
        openNewRequestModal,
        isEmailSimulatorModalOpen,
        setIsEmailSimulatorModalOpen,
        isPrintModalOpen,
        setIsPrintModalOpen,
        toast,
        showToast,
        isSystemAdmin,
        canAccessTab: (tab: string) => canUserAccessTab(isAdminLogin, tab),
        canApprove,
        canActOnRequest,
        canViewRequest,
        myRequests,
        approvalQueue,
        myNotifications,
        myStatusUpdates,
        unseenStatusUpdateCount,
        markStatusUpdatesSeen,
        userPendingCount,
        userApprovedCount,
        userTotalCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
