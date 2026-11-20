import React, { createContext, useContext, useEffect, useRef, useState, useMemo } from 'react';
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
  KnowledgeArticle,
  KbAttachment,
  KbVisibility,
  MemoData,
  ItRequestData,
  PoRequestData,
  RequestDraft,
} from '../types';
import {
  MEMO_FORM,
  MEMO_OLD_REQUESTS_MARKER,
  MEMO_SEED_MARKER,
  MEMO_TITLES_MARKER,
  memoRequestWithCurrentWording,
  memoStepTitle,
  MEMO_WORKFLOW,
  MEMO_WORKFLOW_ID,
  withCurrentMemoWording,
  memoAnswers,
  memoDetails,
  nextMemoNo,
  thaiDate,
} from '../utils/memo';
import {
  PO_DOC_PREFIX,
  PO_FORM,
  PO_FORM_ID,
  PO_OLD_DOC_PREFIX,
  PO_SEED_MARKER,
  PO_WORKFLOW,
  poAnswers,
  poDetails,
  runningDigitsFor,
} from '../utils/poRequest';
import {
  IT_REQUEST_FORM,
  IT_REQUEST_SEED_MARKER,
  buildItRequestWorkflow,
  itRequestAnswers,
  itRequestDetails,
  itRequestTitle,
} from '../utils/itRequest';
import { KNOWLEDGE_ARTICLES } from '../data/knowledgeBase';
import { deleteKbFiles, linkKbFilesToArticlesOnce, uploadKbFile } from '../utils/kbFiles';
import { syncUserDepartments } from '../utils/userDepartments';
import {
  CORPORATE_DEPARTMENTS,
  USER_PERSONAS,
  INITIAL_MENU_PERMISSIONS,
  INITIAL_WORKFLOWS,
  INITIAL_REQUESTS,
  initialsAvatar,
} from '../data/mockData';
import { resolveStepApprover } from '../utils/approvers';
import { AddedStep, isOfferedForm, nextRequestCode } from '../utils/forms';
import { isArray, usePersistentState } from '../utils/persistentState';
import { markOnce, seedCollectionsOnce, useFirestoreCollection } from '../utils/firestoreCollection';
import { where } from 'firebase/firestore';
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
): Pick<ApprovalAuditEntry, 'approverName' | 'approverRole' | 'approverEmail' | 'approverDepartmentId' | 'task'> => {
  // A step open to a whole department has no single person until someone picks it up
  if (step?.approverType === 'department' && step.approverDepartmentId) {
    const dept = CORPORATE_DEPARTMENTS.find(d => d.id === step.approverDepartmentId);
    return {
      approverName: `ทีม ${dept?.nameEn ?? step.approverDepartmentId}`,
      approverRole: step.title,
      approverEmail: '',
      approverDepartmentId: step.approverDepartmentId,
      task: step.task,
    };
  }
  const approver = step ? resolveStepApprover(step, requestorId, employees) : undefined;
  if (step?.task) {
    return approver
      ? { approverName: approver.name, approverRole: approver.position, approverEmail: approver.email, task: step.task }
      : { approverName: UNASSIGNED_APPROVER, approverRole: step.title, approverEmail: '', task: step.task };
  }
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
      senderName: 'ระบบเอกสารภายในองค์กร JMI E-Service',
      stepTitle: step.stepTitle,
      createdAt: req.steps[req.currentStepIndex - 1]?.timestamp ?? req.updatedAt,
      read: false,
      priority: req.priority,
    },
  ];
});

const isAdminRole = (user: UserPersona) =>
  user.role === 'admin' || user.role === 'director' || user.role === 'system_admin';

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

/** What the article editor sends when saving. */
export interface KnowledgeArticleInput {
  title: string;
  summary: string;
  departmentId: DepartmentId;
  tags: string[];
  visibility: KbVisibility;
  /** With 'department': emails of people from other departments who may also read it. */
  sharedWith: string[];
  /** Plain text of the content. */
  body: string;
  content: KnowledgeArticle['content'];
  /** Attachments already saved that the author kept. */
  keptAttachments: KbAttachment[];
  newFiles: File[];
}

interface AppContextType {
  // Corporate departments
  departments: DepartmentInfo[];

  /** The employee who is signed in, matched by sign-in email in the Employee Directory. */
  currentUser: UserPersona;
  /** False when the signed-in email is not in the Employee Directory yet. */
  isLinkedAccount: boolean;
  /** The signed-in account is in the directory but has been switched off. */
  isDisabledAccount: boolean;
  deleteEmployee: (id: string) => void;

  // Employee Directory (also the source of approvers and email recipients)
  employees: UserPersona[];
  addEmployee: (employee: Omit<UserPersona, 'id' | 'avatar' | 'departmentName'>) => void;
  updateEmployee: (id: string, patch: Partial<Omit<UserPersona, 'id'>>) => void;

  /** True once the shared data has loaded from Firestore. */
  dataReady: boolean;

  // Navigation
  activeTab: string;
  setActiveTab: (tab: string) => void;
  /** Forms on offer in the แบบฟอร์ม menu that the signed-in user may fill in. */
  offeredForms: MenuItemPermission[];
  /** Form being filled in (null when none is open). */
  fillingFormId: string | null;
  setFillingFormId: (id: string | null) => void;
  /** The signed-in person's saved request drafts, latest first. */
  requestDrafts: RequestDraft[];
  /** The draft the open form was opened from (null for a blank form). */
  resumingDraft: RequestDraft | null;
  /** Open a draft's form, filled in with what was saved. */
  openDraft: (draft: RequestDraft) => void;
  /** Save a form as a draft (or update the draft `draftId`); returns the draft's id. */
  saveRequestDraft: (
    form: Pick<MenuItemPermission, 'id' | 'menuName'>,
    title: string,
    state: unknown,
    draftId?: string
  ) => string;
  deleteRequestDraft: (id: string) => void;
  /** Form builder: null = closed; `form: null` = a new form for that department. */
  formBuilder: { deptId: DepartmentId; form: MenuItemPermission | null } | null;
  setFormBuilder: (state: { deptId: DepartmentId; form: MenuItemPermission | null } | null) => void;
  /** Knowledge Base article being read (null shows the article list). */
  activeArticleId: string | null;
  setActiveArticleId: (id: string | null) => void;
  /** Articles employees wrote (newest first), then the built-in sample articles. */
  knowledgeArticles: KnowledgeArticle[];
  /** Whether the signed-in user may write knowledge articles. */
  canWriteArticles: boolean;
  /** Employee-written articles can be changed by their author and by admins. */
  canEditArticle: (article: KnowledgeArticle) => boolean;
  /** Save an article; resolves to its id, or null when saving failed. */
  saveArticle: (input: KnowledgeArticleInput, existingId?: string) => Promise<string | null>;
  deleteArticle: (id: string) => Promise<void>;

  // Permissions (Top-Right Screen: ตั้งค่าสิทธิ์เข้าถึง)
  menuPermissions: MenuItemPermission[];
  /** Sets which departments may use the given forms: form id → department → allowed. */
  setFormsAccess: (changes: Record<string, Record<DepartmentId, boolean>>) => void;
  /** Whether the signed-in user may build forms for this department (its members, and admins). */
  canManageForms: (deptId: DepartmentId) => boolean;
  /** Whether the signed-in user may edit or delete this department-built form. */
  canEditForm: (form: MenuItemPermission) => boolean;
  /** Create (no existingId) or update a department-built form and its approval workflow. */
  saveCustomForm: (deptId: DepartmentId, input: CustomFormInput, existingId?: string) => void;
  deleteCustomForm: (formId: string) => void;
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
  /**
   * `pickedApprovers` maps a step id to the employee the requester chose, for steps whose
   * approver is picked on the form ('requester_picks').
   */
  createNewRequest: (
    newReq: Partial<DocumentRequest>,
    pickedApprovers?: Record<string, string>,
    /** Steps the requester added on a form that allows it, run after the form's own steps. */
    addedSteps?: AddedStep[]
  ) => DocumentRequest;
  /** `record` is what the person acting filled in, for steps that record something (IT work, acceptance). */
  approveRequest: (
    requestId: string,
    comment?: string,
    record?: Pick<ItRequestData, 'work'> | Pick<ItRequestData, 'acceptance'>
  ) => void;
  rejectRequest: (requestId: string, reason: string) => void;
  /** Hand the current step to another employee instead of deciding it (Ticket Request). */
  forwardRequest: (requestId: string, toEmployeeId: string, reason: string) => void;
  /** Requester fixes a returned request and sends it back to the step that returned it. */
  resubmitRequest: (
    requestId: string,
    input: { title: string; details: string; note: string; memo?: Pick<MemoData, 'to' | 'background' | 'summary'> }
  ) => void;
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
  /** Opens the system-management menus: an ADMIN_EMAILS account or the ผู้ดูแลระบบ role. */
  isAdminLogin: boolean;
  /** Whether the current user may open the given screen. */
  canAccessTab: (tab: string) => boolean;
  /** Anyone who takes part in approving requests (not a plain requester). */
  canApprove: boolean;
  /** True when the current step of the request is waiting on the current user. */
  canActOnRequest: (request: DocumentRequest) => boolean;
  /** Whether the person who may act on the current step may also hand it to someone else. */
  canForwardRequest: (request: DocumentRequest) => boolean;
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
  // Admins are the accounts in ADMIN_EMAILS, plus employees given the ผู้ดูแลระบบ role (below)
  const { user, isAdminLogin: isBuiltInAdmin } = useAuth();
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
  const directoryEntry = employees.find(e => e.email.toLowerCase() === signedInEmail);
  // A switched-off employee is kept in the directory but treated as not being in it (admins
  // are never locked out this way)
  const isDisabledAccount = !!directoryEntry?.disabled && !isBuiltInAdmin;
  const linkedEmployee = isDisabledAccount ? undefined : directoryEntry;
  const isLinkedAccount = !!linkedEmployee;
  // Firestore rules give the role the same rights, from userDepartments (see userDepartments.ts)
  const isAdminLogin = isBuiltInAdmin || linkedEmployee?.role === 'system_admin';
  // An admin account that is not in the directory yet still needs to get in to add people,
  // so it gets a temporary admin profile; other unlinked accounts are stopped in App
  const currentUser: UserPersona =
    linkedEmployee ??
    (isBuiltInAdmin
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
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [fillingFormId, setFillingFormIdState] = useState<string | null>(null);
  const [resumingDraft, setResumingDraft] = useState<RequestDraft | null>(null);
  // Opening a form from the menu starts blank; closing a form forgets the draft it came from
  const setFillingFormId = (id: string | null) => {
    setResumingDraft(null);
    setFillingFormIdState(id);
  };
  const openDraft = (draft: RequestDraft) => {
    setResumingDraft(draft);
    setFillingFormIdState(draft.formId);
  };

  // Each person's drafts, read only by them (Firestore rules)
  const draftScope = useMemo(
    () => ({ key: signedInEmail, queries: [[where('createdBy', '==', signedInEmail)]] }),
    [signedInEmail]
  );
  const [draftRows, setDraftRows] = useFirestoreCollection<RequestDraft>('requestDrafts', handleWriteError, draftScope);
  const requestDrafts = useMemo(() => [...draftRows].sort((a, b) => b.savedAtMs - a.savedAtMs), [draftRows]);

  const saveRequestDraft = (
    form: Pick<MenuItemPermission, 'id' | 'menuName'>,
    title: string,
    state: unknown,
    draftId?: string
  ) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const draft: RequestDraft = {
      id: draftId ?? `draft-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
      formId: form.id,
      formName: form.menuName,
      title: title.trim(),
      state: JSON.stringify(state),
      savedAt: `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
      savedAtMs: now.getTime(),
      createdBy: signedInEmail,
    };
    setDraftRows(prev => (prev.some(d => d.id === draft.id) ? prev.map(d => (d.id === draft.id ? draft : d)) : [draft, ...prev]));
    return draft.id;
  };
  const deleteRequestDraft = (id: string) => setDraftRows(prev => prev.filter(d => d.id !== id));

  const [formBuilder, setFormBuilder] = useState<{ deptId: DepartmentId; form: MenuItemPermission | null } | null>(
    null
  );
  // Admins read every article. Everyone else asks only for what the Firestore rules let them
  // read: articles for everyone, their own department's, and their own (a listener on the
  // whole collection would be refused once any article is limited to another department).
  const kbScope = useMemo(() => {
    if (isAdminLogin) return undefined;
    const dept = linkedEmployee?.departmentId;
    return {
      key: `${signedInEmail}|${dept ?? ''}`,
      queries: [
        [where('visibility', '==', 'all')],
        [where('createdBy', '==', signedInEmail)],
        // Articles of another department that were shared with this person by name
        [where('sharedWith', 'array-contains', signedInEmail)],
        ...(dept ? [[where('visibility', '==', 'department'), where('visibleDepartmentId', '==', dept)]] : []),
      ],
    };
  }, [isAdminLogin, signedInEmail, linkedEmployee?.departmentId]);
  const [kbArticles, setKbArticles, kbArticlesLoaded] = useFirestoreCollection<KnowledgeArticle>(
    'kbArticles',
    handleWriteError,
    kbScope
  );

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
    )
      // Built-in forms added after a project was first set up get their own one-time marker
      .then(() =>
        seedCollectionsOnce({ menuPermissions: [MEMO_FORM], workflows: [MEMO_WORKFLOW] }, MEMO_SEED_MARKER, 1000)
      )
      .then(() =>
        seedCollectionsOnce({ menuPermissions: [PO_FORM], workflows: [PO_WORKFLOW] }, PO_SEED_MARKER, 1200)
      )
      .catch(handleWriteError);
  }, [isAdminLogin]);

  // The IT & Request Form waits for the directory, so its flow can point at the IT director
  useEffect(() => {
    if (!isAdminLogin || !employeesLoaded) return;
    seedCollectionsOnce(
      { menuPermissions: [IT_REQUEST_FORM], workflows: [buildItRequestWorkflow(employees)] },
      IT_REQUEST_SEED_MARKER,
      1100
    ).catch(handleWriteError);
  }, [isAdminLogin, employeesLoaded]);

  // Keep the copy of each employee's department that Firestore rules read (see userDepartments.ts)
  const departmentsKey = employees
    .map(e => `${e.email.toLowerCase()}:${e.departmentId}:${e.disabled ? 1 : 0}:${e.role}`)
    .sort()
    .join('|');
  useEffect(() => {
    if (!isAdminLogin || !employeesLoaded) return;
    // Refused until the Firestore rules that include userDepartments are published; it runs
    // again on the next admin sign-in, so nobody needs to see the error
    syncUserDepartments(employees).catch(error => console.warn('userDepartments not updated:', error));
  }, [isAdminLogin, employeesLoaded, departmentsKey]);

  // Articles saved before visibility existed are readable by everyone: say so, so the rules
  // (which let other people read only visibility 'all' or their own department) still show them
  const articlesWithoutVisibility = kbArticles.filter(a => !a.visibility).length;
  useEffect(() => {
    if (!isAdminLogin || articlesWithoutVisibility === 0) return;
    setKbArticles(prev => prev.map(a => (a.visibility ? a : { ...a, visibility: 'all' as const })));
  }, [isAdminLogin, articlesWithoutVisibility]);

  // Attachment files saved before they named their article get its id, so the rules can
  // check the article before letting someone download them
  const kbFilesLinkStarted = useRef(false);
  useEffect(() => {
    if (!isAdminLogin || !kbArticlesLoaded || kbFilesLinkStarted.current) return;
    kbFilesLinkStarted.current = true;
    // Refused by the older rules (chunks could not be updated); retried on a later sign-in
    linkKbFilesToArticlesOnce(kbArticles).catch(error => console.warn('kbFiles not linked yet:', error));
  }, [isAdminLogin, kbArticlesLoaded]);

  // The JRF was first saved numbering PO-yyyy-nnnn; it now numbers JRF-yyyy-nnnnn.
  // The prefix is locked in the form builder, so an admin's sign-in moves it once.
  const poFormHasOldPrefix = menuPermissions.some(f => f.id === PO_FORM_ID && f.docPrefix === PO_OLD_DOC_PREFIX);
  useEffect(() => {
    if (!isAdminLogin || !permissionsLoaded || !poFormHasOldPrefix) return;
    setMenuPermissions(prev =>
      prev.map(f => (f.id === PO_FORM_ID && f.docPrefix === PO_OLD_DOC_PREFIX ? { ...f, docPrefix: PO_DOC_PREFIX } : f))
    );
  }, [isAdminLogin, permissionsLoaded, poFormHasOldPrefix]);

  // A memo form saved with the first wording ("CFO อนุมัติ", "CEO อนุมัติ") is reworded once
  const hasMemoFlow = workflows.some(w => w.id === MEMO_WORKFLOW_ID);
  const memoRewordStarted = useRef(false);
  useEffect(() => {
    if (!isAdminLogin || !workflowsLoaded || !permissionsLoaded || !hasMemoFlow || memoRewordStarted.current) return;
    memoRewordStarted.current = true;
    markOnce(MEMO_TITLES_MARKER)
      .then(first => {
        if (!first) return;
        setWorkflows(prev => prev.map(withCurrentMemoWording.workflow));
        setMenuPermissions(prev => prev.map(withCurrentMemoWording.form));
      })
      .catch(handleWriteError);
  }, [isAdminLogin, workflowsLoaded, permissionsLoaded, hasMemoFlow]);

  // Memos already sent, and the alerts raised for them, get the same rewording once
  const oldMemosRewordStarted = useRef(false);
  useEffect(() => {
    if (!isAdminLogin || !requestsLoaded || !notificationsLoaded || oldMemosRewordStarted.current) return;
    oldMemosRewordStarted.current = true;
    markOnce(MEMO_OLD_REQUESTS_MARKER)
      .then(first => {
        if (!first) return;
        const memoIds = new Set(requests.filter(r => r.memo).map(r => r.id));
        setRequests(prev => prev.map(memoRequestWithCurrentWording));
        setEmailNotifications(prev =>
          prev.map(n => (memoIds.has(n.requestId) ? { ...n, stepTitle: memoStepTitle(n.stepTitle) } : n))
        );
      })
      .catch(handleWriteError);
  }, [isAdminLogin, requestsLoaded, notificationsLoaded]);

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

  // Takes the person out of the directory. Documents keep the names written on them.
  const deleteEmployee = (id: string) => {
    setEmployees(prev =>
      prev.filter(e => e.id !== id).map(e => (e.reportsToId === id ? { ...e, reportsToId: undefined } : e))
    );
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
    if (isAdminRole(currentUser)) return true;
    const perm = menuPermissions.find(p => p.menuCode === menuCode);
    if (!perm) return true;
    return perm.allowedDepartments[currentUser.departmentId] ?? false;
  };

  const offeredForms = menuPermissions.filter(f => isOfferedForm(f) && isMenuPermittedForUser(f.menuCode));

  // Set which departments may use one or more forms (the access page shows its own feedback)
  const setFormsAccess = (changes: Record<string, Record<DepartmentId, boolean>>) => {
    setMenuPermissions(prev =>
      prev.map(form => (changes[form.id] ? { ...form, allowedDepartments: changes[form.id] } : form))
    );
  };

  // ---- Department-built forms ----
  const canManageForms = (deptId: DepartmentId) =>
    isAdminLogin || (isLinkedAccount && currentUser.departmentId === deptId);

  // ---- Knowledge Base (articles employees write) ----
  const canWriteArticles = isAdminLogin || isLinkedAccount;
  const canEditArticle = (article: KnowledgeArticle) =>
    !!article.createdBy && (isAdminLogin || article.createdBy.toLowerCase() === signedInEmail);
  // An article limited to one department is shown to its members, its author and admins only
  const canReadArticle = (article: KnowledgeArticle) =>
    article.visibility !== 'department' ||
    isAdminLogin ||
    (!!article.createdBy && article.createdBy.toLowerCase() === signedInEmail) ||
    (article.sharedWith ?? []).includes(signedInEmail) ||
    (isLinkedAccount && currentUser.departmentId === article.visibleDepartmentId);
  const knowledgeArticles = useMemo(
    () => [...kbArticles.filter(canReadArticle), ...KNOWLEDGE_ARTICLES],
    [kbArticles, isAdminLogin, signedInEmail, isLinkedAccount, currentUser.departmentId]
  );

  const saveArticle = async (input: KnowledgeArticleInput, existingId?: string): Promise<string | null> => {
    const existing = existingId ? kbArticles.find(a => a.id === existingId) : undefined;
    // The id comes first: each uploaded file records which article it belongs to
    const articleId = existing?.id ?? `kb-${Date.now().toString(36)}`;
    let uploaded: KbAttachment[];
    try {
      uploaded = await Promise.all(input.newFiles.map(file => uploadKbFile(file, signedInEmail, articleId)));
    } catch (error) {
      handleWriteError(error);
      return null;
    }
    const removed = (existing?.attachments ?? []).filter(a => !input.keptAttachments.some(k => k.id === a.id));
    const body = input.body.trim();
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const article: KnowledgeArticle = {
      id: articleId,
      title: input.title.trim(),
      summary: input.summary.trim(),
      departmentId: input.departmentId,
      tags: input.tags,
      visibility: input.visibility,
      // Limited to the author's own department, which stays the same when someone else edits it
      ...(input.visibility === 'department'
        ? {
            visibleDepartmentId: existing?.visibleDepartmentId ?? currentUser.departmentId,
            ...(input.sharedWith.length
              ? { sharedWith: [...new Set(input.sharedWith.map(e => e.trim().toLowerCase()))] }
              : {}),
          }
        : {}),
      updatedAt: `${pad(today.getDate())}.${pad(today.getMonth() + 1)}.${today.getFullYear()}`,
      // Thai has no spaces between words, so estimate from characters (~500 per minute)
      readMinutes: Math.max(1, Math.round(body.length / 500)),
      sections: [],
      body,
      content: input.content,
      attachments: [...input.keptAttachments, ...uploaded],
      createdBy: existing?.createdBy ?? signedInEmail,
      authorName: existing?.authorName ?? currentUser.name,
    };
    setKbArticles(prev => (existing ? prev.map(a => (a.id === article.id ? article : a)) : [article, ...prev]));
    deleteKbFiles(removed).catch(handleWriteError);
    showToast(existing ? 'บันทึกบทความแล้ว' : 'เพิ่มบทความแล้ว', 'success');
    return article.id;
  };

  const deleteArticle = async (id: string) => {
    const article = kbArticles.find(a => a.id === id);
    if (!article) return;
    setKbArticles(prev => prev.filter(a => a.id !== id));
    if (activeArticleId === id) setActiveArticleId(null);
    await deleteKbFiles(article.attachments ?? []).catch(handleWriteError);
    showToast(`ลบบทความ "${article.title}" แล้ว`, 'info');
  };

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
            // 'own' is the department of whoever is saving the form
            CORPORATE_DEPARTMENTS.map(d => [d.id, input.audience === 'all' || d.id === currentUser.departmentId])
          ) as Record<DepartmentId, boolean>);

    const form: MenuItemPermission = {
      id: formId,
      menuCode,
      menuName: input.name,
      category: 'แบบฟอร์มกลาง',
      ownerDepartmentId: deptId,
      allowedDepartments,
      description: input.description,
      fields: input.fields,
      workflowId,
      // Once a form has a prefix it keeps it
      ...(existing?.docPrefix || input.docPrefix ? { docPrefix: existing?.docPrefix || input.docPrefix } : {}),
      ...(input.requesterAddsSteps ? { requesterAddsSteps: true } : {}),
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
    showToast(existing ? `บันทึกแบบฟอร์ม "${input.name}" แล้ว` : `สร้างแบบฟอร์ม "${input.name}" แล้ว`, 'success');
  };

  const deleteCustomForm = (formId: string) => {
    const form = menuPermissions.find(f => f.id === formId);
    if (!form) return;
    setMenuPermissions(prev => prev.filter(f => f.id !== formId));
    if (form.workflowId) setWorkflows(prev => prev.filter(w => w.id !== form.workflowId));
    showToast(`ลบแบบฟอร์ม "${form.menuName}" แล้ว`, 'info');
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
  const createNewRequest = (
    newReq: Partial<DocumentRequest>,
    pickedApprovers: Record<string, string> = {},
    addedSteps: AddedStep[] = []
  ): DocumentRequest => {
    const matchedWf = workflows.find(w => w.id === (newReq.workflowId || 'wf-procure')) || workflows[0];
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    // Next number in this year's sequence, e.g. REQ-2026-0007; a form may count under its own prefix
    const requestForm = menuPermissions.find(f => f.id === newReq.formId);
    const requestCode = nextRequestCode(
      requestForm?.docPrefix ?? '',
      requests.map(r => r.code),
      now,
      runningDigitsFor(requestForm)
    );
    // A memo gets its date and running number here, at the moment it is sent
    const memo: MemoData | undefined = newReq.memo && {
      ...newReq.memo,
      date: thaiDate(now),
      docNo: nextMemoNo(currentUser.departmentId, requests, now),
    };

    const itRequest = newReq.itRequest;
    // A P&O JRF takes the request's number as its reference, and today's date
    const poRequest: PoRequestData | undefined = newReq.poRequest && {
      ...newReq.poRequest,
      refNo: requestCode,
      requestDate: thaiDate(now),
    };

    // Steps the requester added run after the form's own, each by the employee they chose
    const stepConfigs: ApprovalStepConfig[] = [
      ...matchedWf.steps,
      ...addedSteps.map((added, i) => ({
        id: `${matchedWf.id}-added-${i + 1}`,
        stepIndex: matchedWf.steps.length + i,
        title: added.title,
        roleName: added.title,
        approverType: 'employee' as const,
        approverEmployeeId: added.employeeId,
        sendEmailNotification: true,
        slaHours: 24,
      })),
    ];

    // Generate initial audit entries from workflow steps
    const auditSteps: ApprovalAuditEntry[] = stepConfigs.map((s, idx) => {
      if (idx === 0) {
        return {
          stepIndex: 0,
          stepTitle: s.title,
          approverName: currentUser.name,
          approverRole: currentUser.position,
          approverEmail: currentUser.email,
          status: 'approved',
          timestamp: dateStr,
          comment: 'ส่งคำร้องขอผ่านระบบ JMI E-Service เรียบร้อยแล้ว',
          digitalSignatureHash: `DIGI-SIGN-CREATED-${Date.now()}-AUTH`,
        };
      }
      // Approvers come from the Employee Directory, resolved for this requester at submission;
      // a step whose approver the requester picks is treated as that specific employee
      const picked = s.approverType === 'requester_picks' ? pickedApprovers[s.id] : undefined;
      return {
        stepIndex: idx,
        stepTitle: s.title,
        ...approverFields(
          picked ? { ...s, approverType: 'employee', approverEmployeeId: picked } : s,
          currentUser.id,
          employees
        ),
        status: idx === 1 ? 'pending' : 'waiting',
      };
    });

    const doc: DocumentRequest = {
      id: `req-${Date.now()}`,
      code: requestCode,
      title: itRequest ? itRequestTitle(itRequest) : newReq.title || 'คำร้องขอใช้บริการทั่วไป',
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
      details: memo
        ? memoDetails(memo)
        : itRequest
          ? itRequestDetails(itRequest)
          : poRequest
            ? poDetails(poRequest)
            : newReq.details || '',
      attachments: newReq.attachments || [],
      formId: newReq.formId,
      answers: memo
        ? memoAnswers(memo)
        : itRequest
          ? itRequestAnswers(itRequest)
          : poRequest
            ? poAnswers(poRequest)
            : newReq.answers,
      memo,
      itRequest,
      poRequest,
      workflowId: matchedWf.id,
      currentStepIndex: 1, // Next approver
      steps: auditSteps,
    };

    setRequests(prev => [doc, ...prev]);

    // Notify the next approver
    const nextStepConfig = stepConfigs[1];
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
  const closeOpenNotifications = (requestId: string, action: 'approved' | 'rejected' | 'forwarded') => {
    const openIds = emailNotifications.filter(n => n.requestId === requestId && !n.actionTaken).map(n => n.id);
    if (openIds.length === 0) return;
    setEmailNotifications(prev =>
      prev.map(n => (openIds.includes(n.id) ? { ...n, read: true, actionTaken: action } : n))
    );
  };

  // Approve a request
  const approveRequest = (
    requestId: string,
    comment: string = 'เห็นชอบอนุมัติตามระเบียบ',
    record?: Pick<ItRequestData, 'work'> | Pick<ItRequestData, 'acceptance'>
  ) => {
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
            senderName: `ระบบเอกสารภายในองค์กร JMI E-Service (ส่งต่อจาก ${currentUser.name})`,
            stepTitle: nextAudit.stepTitle,
            createdAt: dateStr,
            read: false,
            amount: req.amount,
          };
          setEmailNotifications(n => [newNotif, ...n]);
        }

        // Fully approved: tell the requester (unless they approved the last step themselves)
        if (isFinalStep && req.requestorEmail && req.requestorEmail !== currentUser.email) {
          const doneNotif: ActionEmailNotification = {
            id: `email-done-${req.id}-${Date.now()}`,
            kind: 'completed',
            requestId: req.id,
            requestCode: req.code,
            requestTitle: req.title,
            recipientEmail: req.requestorEmail,
            recipientName: req.requestorName,
            senderName: `ระบบเอกสารภายในองค์กร JMI E-Service (อนุมัติขั้นสุดท้ายโดย ${currentUser.name})`,
            stepTitle: 'อนุมัติเรียบร้อย',
            createdAt: dateStr,
            read: false,
            amount: req.amount,
          };
          setEmailNotifications(n => [doneNotif, ...n]);
        }

        // What the person acting recorded (IT work, acceptance) is kept with the form's data
        const itRequest = req.itRequest && record ? { ...req.itRequest, ...record } : req.itRequest;

        return {
          ...req,
          ...(itRequest && record
            ? { itRequest, details: itRequestDetails(itRequest), answers: itRequestAnswers(itRequest) }
            : {}),
          status: newStatus,
          currentStepIndex: isFinalStep ? currentStep : currentStep + 1,
          updatedAt: dateStr,
          steps: updatedSteps,
        };
      })
    );

    showToast(record ? 'บันทึกและส่งต่อเรียบร้อยแล้ว' : `ประทับตราอนุมัติเอกสารเรียบร้อยแล้ว`, 'success');
  };

  // Hand the current step to someone else (Ticket Request: Assign / ส่งต่อ). The step keeps its
  // title and place in the order; who it waits on changes, and the hand-over is kept in history.
  const forwardRequest = (requestId: string, toEmployeeId: string, reason: string) => {
    const req = requests.find(r => r.id === requestId);
    const to = employees.find(e => e.id === toEmployeeId);
    if (!req || !to) return;
    const step = req.steps[req.currentStepIndex];
    if (!step || step.status !== 'pending') return;
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    closeOpenNotifications(requestId, 'forwarded');
    const forward = {
      fromName: currentUser.name,
      fromEmail: currentUser.email,
      toName: to.name,
      toEmail: to.email,
      reason,
      at: dateStr,
    };
    setRequests(prev =>
      prev.map(r => {
        if (r.id !== requestId) return r;
        const steps = r.steps.map((st, idx) => {
          if (idx !== r.currentStepIndex) return st;
          // A step open to a whole department now belongs to the one person it was given to
          const { approverDepartmentId: _dept, ...rest } = st;
          return {
            ...rest,
            approverName: to.name,
            approverRole: to.position,
            approverEmail: to.email,
            forwards: [...(st.forwards ?? []), forward],
          };
        });
        return { ...r, steps, updatedAt: dateStr };
      })
    );
    const notif: ActionEmailNotification = {
      id: `email-fwd-${Date.now()}`,
      requestId: req.id,
      requestCode: req.code,
      requestTitle: req.title,
      recipientEmail: to.email,
      recipientName: to.name,
      senderName: `ระบบเอกสารภายในองค์กร JMI E-Service (ส่งต่อจาก ${currentUser.name})`,
      stepTitle: step.stepTitle,
      createdAt: dateStr,
      read: false,
      amount: req.amount,
    };
    setEmailNotifications(n => [notif, ...n]);
    showToast(`ส่งต่อให้ ${to.name} แล้ว`, 'success');
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

  const resubmitRequest = (
    requestId: string,
    input: { title: string; details: string; note: string; memo?: Pick<MemoData, 'to' | 'background' | 'summary'> }
  ) => {
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
        // A memo is edited field by field; its number and date stay as first issued
        const memo = r.memo && input.memo ? { ...r.memo, ...input.memo } : r.memo;
        // On an IT & Request Form the details box edits the symptom; the rest stays as filled in
        const itRequest = r.itRequest && { ...r.itRequest, symptom: input.details };
        // On a P&O JRF it edits the description of the request
        const poRequest = r.poRequest && { ...r.poRequest, description: input.details };
        return {
          ...r,
          title: itRequest ? itRequestTitle(itRequest) : input.title,
          memo,
          itRequest,
          poRequest,
          details: memo
            ? memoDetails(memo)
            : itRequest
              ? itRequestDetails(itRequest)
              : poRequest
                ? poDetails(poRequest)
                : input.details,
          // Answers of a built form are shown from `details`; drop the old copy once it is edited
          answers: memo
            ? memoAnswers(memo)
            : itRequest
              ? itRequestAnswers(itRequest)
              : poRequest
                ? poAnswers(poRequest)
                : detailsChanged
                  ? undefined
                  : r.answers,
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
    if (isMine(step.approverEmail)) return true;
    // A step open to a whole department belongs to any of its members
    return isLinkedAccount && !!step.approverDepartmentId && step.approverDepartmentId === currentUser.departmentId;
  };

  // Only on forms where the requester picks who handles each step (Ticket Request): there the
  // handler may pass the work on. Approval forms (memo, JRF, IT form) keep their approvers.
  const canForwardRequest = (request: DocumentRequest): boolean => {
    if (!canActOnRequest(request)) return false;
    const form = menuPermissions.find(f => f.id === request.formId);
    return !!form?.requesterAddsSteps && !form.template;
  };

  const canViewRequest = (request: DocumentRequest): boolean => {
    if (isSystemAdmin) return true;
    if (request.requestorId === currentUser.id) return true;
    if (request.steps.some(step => step.status !== 'waiting' && isMine(step.approverEmail))) return true;
    // Whoever handed a step on keeps seeing the request they passed along
    if (request.steps.some(step => step.forwards?.some(f => isMine(f.fromEmail)))) return true;
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
        isDisabledAccount,
        deleteEmployee,
        employees,
        addEmployee,
        updateEmployee,
        dataReady,
        activeTab,
        setActiveTab,
        offeredForms,
        fillingFormId,
        setFillingFormId,
        requestDrafts,
        resumingDraft,
        openDraft,
        saveRequestDraft,
        deleteRequestDraft,
        formBuilder,
        setFormBuilder,
        activeArticleId,
        setActiveArticleId,
        knowledgeArticles,
        canWriteArticles,
        canEditArticle,
        saveArticle,
        deleteArticle,
        menuPermissions,
        setFormsAccess,
        canManageForms,
        canEditForm,
        saveCustomForm,
        deleteCustomForm,
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
        forwardRequest,
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
        isAdminLogin,
        canAccessTab: (tab: string) => canUserAccessTab(isAdminLogin, tab),
        canApprove,
        canActOnRequest,
        canForwardRequest,
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
