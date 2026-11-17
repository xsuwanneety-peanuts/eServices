import {
  ApprovalAuditEntry,
  DepartmentId,
  ItRequestData,
  ItWorkRecord,
  MenuItemPermission,
  UserPersona,
  WorkflowDefinition,
} from '../types';
import { CORPORATE_DEPARTMENTS } from '../data/mockData';

// The IT & Request Form: the paper work-order form of the IT department, done in the system.
// Part 1 is filled in by the requester, part 2 by IT, part 3 is the hand-over and sign-off.
// Like the memo it is a built-in form, added to each project's data once.
export const IT_REQUEST_FORM_ID = 'form-it-request';
export const IT_REQUEST_WORKFLOW_ID = 'wf-it-request';
export const IT_REQUEST_SEED_MARKER = 'seed-it-request-form';
export const IT_REQUEST_FORM_NAME = 'IT & Request Form (ใบสั่งงาน IT)';
export const COMPANY_NAME_TH = 'บริษัท เจมาร์ทประกันภัย จำกัด (มหาชน)';

/** The checklist of part 1, in the order printed on the form. */
export const IT_ITEM_TYPES = [
  'คอมพิวเตอร์ / จอ',
  'ระบบเครือข่าย',
  'กล้องวงจรปิด',
  'ปริ้นเตอร์ / โทรศัพท์',
  'UPS / Fingerscan',
  'เกี่ยวกับโปรแกรม',
  'Backup / Restore',
  'อื่น ๆ',
];
export const IT_IMPACTS = ['กระทบงานประจำ', 'ไม่กระทบงานประจำ', 'กระทบระบบคอมพิวเตอร์'];
export const IT_ACTIONS = ['ซื้อ', 'ซ่อม', 'สร้าง', 'แก้ไข', 'โอนย้าย'];
export const IT_KINDS = ['HW', 'SW', 'PW'];
export const IT_RATING_LABELS: { key: keyof NonNullable<ItRequestData['acceptance']>['ratings']; label: string }[] = [
  { key: 'service', label: '(ตรงใจ) พอใจการให้บริการ' },
  { key: 'speed', label: '(ตรงเวลา) รวดเร็ว ทันใจ' },
  { key: 'accuracy', label: '(ตรงจุด) ความถูกต้อง แม่นยำ' },
  { key: 'tools', label: '(ตรงสเป็ค) อุปกรณ์เครื่องมือ' },
];
export const IT_RATING_SCALE = ['น้อยมาก', 'น้อย', 'ปานกลาง', 'ดี', 'ดีมาก'];

export const IT_REQUEST_FORM: MenuItemPermission = {
  id: IT_REQUEST_FORM_ID,
  menuCode: 'IT-FORM-06',
  menuName: IT_REQUEST_FORM_NAME,
  category: 'Information Technology',
  ownerDepartmentId: 'it',
  description: 'ใบสั่งงาน IT ตามแบบฟอร์มกระดาษ: แจ้งงาน อนุมัติ ดำเนินการ ส่งมอบ และประเมินความพึงพอใจ',
  template: 'it_request',
  workflowId: IT_REQUEST_WORKFLOW_ID,
  allowedDepartments: Object.fromEntries(CORPORATE_DEPARTMENTS.map(d => [d.id, true])) as Record<
    DepartmentId,
    boolean
  >,
};

/**
 * The flow of the paper form. The IT director step points at the IT employee whose position
 * says director, when the directory has one; otherwise an admin picks the person in
 * Flow อนุมัติ (until then admins approve that step).
 */
export const buildItRequestWorkflow = (employees: UserPersona[]): WorkflowDefinition => {
  const director = employees.find(e => e.departmentId === 'it' && /director|ผู้อำนวยการ/i.test(e.position));
  const base = { sendEmailNotification: true, slaHours: 24 };
  return {
    id: IT_REQUEST_WORKFLOW_ID,
    formId: IT_REQUEST_FORM_ID,
    formTitle: IT_REQUEST_FORM_NAME,
    departmentId: 'it',
    description: 'ผู้ร้องขอ → ผู้บังคับบัญชาต้นสังกัด → ผอ.ฝ่าย IT → ผู้ดำเนินการ IT → ผู้ร้องขอรับมอบงาน',
    itilCategory: 'service_request',
    steps: [
      {
        ...base,
        id: `${IT_REQUEST_WORKFLOW_ID}-requester`,
        stepIndex: 0,
        title: 'ผู้ร้องขอ',
        roleName: 'ผู้ร้องขอ',
        approverType: 'requester',
        slaHours: 0,
      },
      {
        ...base,
        id: `${IT_REQUEST_WORKFLOW_ID}-head`,
        stepIndex: 1,
        title: 'ผู้บังคับบัญชาสูงสุด / ต้นสังกัด',
        roleName: 'ผู้อนุมัติ',
        approverType: 'reports_to',
      },
      {
        ...base,
        id: `${IT_REQUEST_WORKFLOW_ID}-director`,
        stepIndex: 2,
        title: 'ผู้อำนวยการฝ่ายเทคโนโลยีสารสนเทศ',
        roleName: 'ผู้อนุมัติ',
        approverType: 'employee',
        approverEmployeeId: director?.id,
      },
      {
        ...base,
        id: `${IT_REQUEST_WORKFLOW_ID}-work`,
        stepIndex: 3,
        title: 'ผู้ดำเนินการ (ฝ่าย IT)',
        roleName: 'ผู้ดำเนินการ',
        approverType: 'department',
        approverDepartmentId: 'it',
        task: 'it_work',
      },
      {
        ...base,
        id: `${IT_REQUEST_WORKFLOW_ID}-acceptance`,
        stepIndex: 4,
        title: 'ผู้รับมอบงาน / ผู้ตรวจสอบ',
        roleName: 'ผู้รับมอบงาน',
        approverType: 'requester',
        task: 'acceptance',
      },
    ],
  };
};

const pad2 = (n: number) => String(n).padStart(2, '0');

/** "2026-11-16T09:30" as "16/11/2569 09:30"; empty input gives an empty string. */
export const thaiDateTime = (value?: string): string => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${Number(match[1]) + 543} ${match[4]}:${match[5]}` : '';
};

/** A system timestamp ("16.11.2026 14:05") split into a Buddhist-era date and a time. */
export const stampParts = (timestamp?: string): { date: string; time: string } => {
  const match = timestamp?.match(/^(\d{2})\.(\d{2})\.(\d{4})(?: (\d{2}:\d{2}))?/);
  return match
    ? { date: `${match[1]}/${match[2]}/${Number(match[3]) + 543}`, time: match[4] ?? '' }
    : { date: '', time: '' };
};

/** Time the work actually took, from its start and end, as days / hours / minutes. */
export const workDuration = (work: Pick<ItWorkRecord, 'startAt' | 'endAt'>) => {
  const minutes = Math.max(0, Math.round((new Date(work.endAt).getTime() - new Date(work.startAt).getTime()) / 60000));
  if (!Number.isFinite(minutes)) return { days: 0, hours: 0, minutes: 0 };
  return { days: Math.floor(minutes / 1440), hours: Math.floor((minutes % 1440) / 60), minutes: minutes % 60 };
};

export const durationText = (d: { days: number; hours: number; minutes: number }): string =>
  [d.days && `${d.days} วัน`, d.hours && `${d.hours} ชม.`, (d.minutes || (!d.days && !d.hours)) && `${d.minutes} นาที`]
    .filter(Boolean)
    .join(' ');

/** Short title for lists, from what was ticked and the symptom. */
export const itRequestTitle = (data: Pick<ItRequestData, 'items' | 'symptom'>): string => {
  const symptom = data.symptom.split('\n')[0];
  return `${data.items.map(i => i.type).join(', ')}: ${symptom.length > 70 ? `${symptom.slice(0, 70)}…` : symptom}`;
};

/** Everything recorded so far as the label/value list shown in the request window. */
export const itRequestAnswers = (data: ItRequestData): { label: string; value: string }[] => {
  const { work, acceptance } = data;
  return [
    { label: 'User', value: data.userLogin },
    { label: 'เบอร์โทร', value: data.phone },
    { label: 'ผู้ครอบครองทรัพย์สิน', value: data.assetHolder },
    { label: 'สถานที่', value: data.location },
    ...data.items.map(item => ({
      label: item.type,
      value: [item.assetNo && `ทะเบียน ${item.assetNo}`, item.detail].filter(Boolean).join(' — ') || '✓',
    })),
    { label: 'สาเหตุ / อาการ', value: data.symptom },
    ...(work
      ? [
          {
            label: 'การวินิจฉัย',
            value: [work.urgency === 'urgent' ? 'ด่วน' : `รอได้ ${work.waitDays ?? 0} วัน`, ...work.impacts].join(', '),
          },
          { label: 'ประมาณการเวลาดำเนินการ', value: durationText(work.estimate) },
          { label: 'การดำเนินการ', value: [...work.actions, ...work.kinds].join(', ') },
          { label: 'สาเหตุ / แนวทางแก้ไข', value: work.solution },
          { label: 'เวลาดำเนินการ', value: `${thaiDateTime(work.startAt)} – ${thaiDateTime(work.endAt)}` },
          { label: 'รวมเวลาดำเนินการเสร็จจริง', value: durationText(workDuration(work)) },
          { label: 'ค่าใช้จ่าย', value: work.cost > 0 ? `${work.cost.toLocaleString()} บาท` : 'ไม่มีค่าใช้จ่าย' },
          { label: 'อุปกรณ์ที่ใช้', value: work.equipmentUsed.join(', ') },
          {
            label: 'อ้างอิงใบเบิก',
            value: [work.requisitionNo, work.requisitionDate && `วันที่ ${work.requisitionDate}`].filter(Boolean).join(' '),
          },
          { label: 'รหัสทรัพย์สินที่ตัดทำลาย', value: work.disposedAssetNo },
          { label: 'รหัสทรัพย์สินที่ต้องโอนย้าย', value: work.transferredAssetNo },
        ]
      : []),
    ...(acceptance
      ? [
          {
            label: 'ประเมินความพึงพอใจ',
            value: IT_RATING_LABELS.map(r => `${r.label} ${acceptance.ratings[r.key]}`).join(', '),
          },
          { label: 'หมายเหตุ / ข้อเสนอแนะ', value: acceptance.remark },
        ]
      : []),
  ].filter(a => a.value);
};

/** The same content as plain text, for lists, search and email previews. */
export const itRequestDetails = (data: ItRequestData): string =>
  itRequestAnswers(data)
    .map(a => `${a.label}: ${a.value}`)
    .join('\n');

/** The signatures of the paper form, found in a request's steps whatever order the flow is in. */
export const itRequestSigners = (steps: ApprovalAuditEntry[]) => {
  const approvals = steps.filter((step, idx) => idx > 0 && !step.task);
  return {
    requester: steps[0],
    head: approvals[0],
    director: approvals[1],
    operator: steps.find(step => step.task === 'it_work'),
    receiver: steps.find(step => step.task === 'acceptance'),
  };
};
