import React, { createContext, useContext, useState, useMemo } from 'react';
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
  INITIAL_EMAIL_NOTIFICATIONS,
} from '../data/mockData';

interface AppContextType {
  // Corporate departments
  departments: DepartmentInfo[];

  // Current user & persona switcher
  currentUser: UserPersona;
  setCurrentUser: (user: UserPersona) => void;
  availablePersonas: UserPersona[];

  // Navigation
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeDeptFilter: DepartmentId | null;
  setActiveDeptFilter: (dept: DepartmentId | null) => void;

  // Permissions (Top-Right Screen: ตั้งค่าสิทธิ์เข้าถึง)
  menuPermissions: MenuItemPermission[];
  togglePermission: (menuId: string, deptId: DepartmentId) => void;
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

  // Requests & 100% Traceability
  requests: DocumentRequest[];
  createNewRequest: (newReq: Partial<DocumentRequest>) => DocumentRequest;
  approveRequest: (requestId: string, comment?: string) => void;
  rejectRequest: (requestId: string, reason: string) => void;
  activeRequest: DocumentRequest | null;
  setActiveRequestId: (id: string | null) => void;

  // Action-Driven Notification
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

  // Stats
  userPendingCount: number;
  userApprovedCount: number;
  userTotalCount: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserPersona>(USER_PERSONAS[0]); // Default to Suwannee (Procurement)
  const [activeTab, setActiveTab] = useState<string>('my_workspace');
  const [activeDeptFilter, setActiveDeptFilter] = useState<DepartmentId | null>(null);

  const [menuPermissions, setMenuPermissions] = useState<MenuItemPermission[]>(INITIAL_MENU_PERMISSIONS);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>(INITIAL_WORKFLOWS);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(INITIAL_WORKFLOWS[0].id);

  const [requests, setRequests] = useState<DocumentRequest[]>(INITIAL_REQUESTS);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  const [emailNotifications, setEmailNotifications] = useState<ActionEmailNotification[]>(INITIAL_EMAIL_NOTIFICATIONS);
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

  const resetPermissions = () => {
    setMenuPermissions(INITIAL_MENU_PERMISSIONS);
    showToast('รีเซ็ตสิทธิ์การเข้าถึงตามค่ามาตรฐานองค์กรแล้ว', 'info');
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
            title: 'ฝ่ายตรวจสอบเพิ่มเติม (อีเมล)',
            roleName: 'ผู้ตรวจสอบภายใน / ฝ่ายสนับสนุน',
            assigneeEmail: 'compliance@eservice.corp',
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
    const codeNum = Math.floor(1000 + Math.random() * 9000);
    const requestCode = `REQ-${now.getFullYear()}-${codeNum}`;

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
      } else if (idx === 1) {
        return {
          stepIndex: idx,
          stepTitle: s.title,
          approverName: s.roleName,
          approverRole: s.roleName,
          approverEmail: s.assigneeEmail,
          status: 'pending',
        };
      } else {
        return {
          stepIndex: idx,
          stepTitle: s.title,
          approverName: s.roleName,
          approverRole: s.roleName,
          approverEmail: s.assigneeEmail,
          status: 'waiting',
        };
      }
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
      impact: newReq.impact || 'department',
      priority: newReq.priority || 'P3',
      assignedTo: newReq.assignedTo || 'ยังไม่มอบหมาย (ส่งเข้าคิวกลาง)',
      details: newReq.details || '',
      attachments: newReq.attachments || [],
      workflowId: matchedWf.id,
      currentStepIndex: 1, // Next approver
      steps: auditSteps,
    };

    setRequests(prev => [doc, ...prev]);

    // Create action email notification for the next approver (Core Concept 3)
    const nextStepConfig = matchedWf.steps[1];
    if (nextStepConfig && nextStepConfig.sendEmailNotification) {
      const emailNotif: ActionEmailNotification = {
        id: `email-${Date.now()}`,
        requestId: doc.id,
        requestCode: doc.code,
        requestTitle: doc.title,
        recipientEmail: nextStepConfig.assigneeEmail,
        recipientName: `${nextStepConfig.roleName} (${nextStepConfig.title})`,
        senderName: `${currentUser.name} (${currentUser.departmentName})`,
        stepTitle: nextStepConfig.title,
        createdAt: dateStr,
        read: false,
        amount: doc.amount,
      };
      setEmailNotifications(prev => [emailNotif, ...prev]);
    }

    showToast(`สร้างคำร้อง ${doc.code} สำเร็จ! เอกสารส่งอีเมลแจ้งผู้อนุมัติลำดับถัดไปทันที`, 'success');
    return doc;
  };

  // Approve a request
  const approveRequest = (requestId: string, comment: string = 'เห็นชอบอนุมัติตามระเบียบ') => {
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

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

        // Send next email if not final
        if (!isFinalStep) {
          const nextStepIdx = currentStep + 1;
          const nextAudit = updatedSteps[nextStepIdx];
          const newNotif: ActionEmailNotification = {
            id: `email-${Date.now()}`,
            requestId: req.id,
            requestCode: req.code,
            requestTitle: req.title,
            recipientEmail: nextAudit.approverEmail,
            recipientName: nextAudit.approverRole || 'ผู้อนุมัติขั้นตอนถัดไป',
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

  // Execute Action directly from Action-Driven Email (Core Concept 3)
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
        setCurrentUser,
        availablePersonas: USER_PERSONAS,
        activeTab,
        setActiveTab,
        activeDeptFilter,
        setActiveDeptFilter,
        menuPermissions,
        togglePermission,
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
