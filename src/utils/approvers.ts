import { ApprovalStepConfig, StepApproverType, UserPersona } from '../types';

export const APPROVER_TYPE_LABELS: Record<StepApproverType, string> = {
  requester: 'ผู้ยื่นคำร้อง',
  reports_to: 'ผู้บังคับบัญชาของผู้ยื่น (Report to)',
  reports_to_2: 'ผู้บังคับบัญชาลำดับถัดไป (Report to ของหัวหน้า)',
  employee: 'พนักงานที่ระบุ',
  requester_picks: 'ผู้ยื่นเลือกผู้อนุมัติเองตอนกรอกแบบฟอร์ม',
  department: 'ทุกคนในหน่วยงานที่ระบุ',
};

// "ผู้บริหาร" sees every request and may approve any step. "ผู้ดูแลระบบ" can do the same and
// also opens the system-management menus; so can the accounts in ADMIN_EMAILS, whatever their role.
// The old 'admin' role means the same as 'director' and is no longer offered.
export const ROLE_LABELS: Record<UserPersona['role'], string> = {
  employee: 'พนักงาน',
  approver: 'ผู้อนุมัติ',
  manager: 'ผู้จัดการ',
  director: 'ผู้บริหาร',
  system_admin: 'ผู้ดูแลระบบ',
  admin: 'ผู้บริหาร',
};

const findEmployee = (employees: UserPersona[], id?: string) =>
  id ? employees.find(e => e.id === id) : undefined;

/** People who can still be given work: everyone not switched off. */
export const activeEmployees = (employees: UserPersona[]) => employees.filter(e => !e.disabled);

/** Nobody is asked to approve while switched off: they could not sign in to do it. */
const ifActive = (person?: UserPersona) => (person && !person.disabled ? person : undefined);

/**
 * The employee who approves a step for a request submitted by `requestorId`,
 * looked up in the Employee Directory. Undefined when the reporting line is not set up,
 * or when that person is switched off (an admin then approves in their place).
 */
export const resolveStepApprover = (
  step: Pick<ApprovalStepConfig, 'approverType' | 'approverEmployeeId'>,
  requestorId: string,
  employees: UserPersona[]
): UserPersona | undefined => {
  const requestor = findEmployee(employees, requestorId);
  switch (step.approverType) {
    case 'requester':
      return requestor;
    case 'reports_to':
      return ifActive(findEmployee(employees, requestor?.reportsToId));
    case 'reports_to_2':
      // The line still runs through a switched-off manager to the one above them
      return ifActive(findEmployee(employees, findEmployee(employees, requestor?.reportsToId)?.reportsToId));
    case 'employee':
      return ifActive(findEmployee(employees, step.approverEmployeeId));
    case 'requester_picks':
      // Chosen on the form at submission, so there is nobody to look up beforehand
      return undefined;
    case 'department':
      // Open to the whole department rather than one person
      return undefined;
  }
};

/** True when making `employeeId` report to `managerId` would create a loop in the reporting line. */
export const wouldCreateCycle = (
  employeeId: string,
  managerId: string | undefined,
  employees: UserPersona[]
): boolean => {
  let current = managerId;
  const seen = new Set<string>();
  while (current) {
    if (current === employeeId) return true;
    if (seen.has(current)) return true;
    seen.add(current);
    current = findEmployee(employees, current)?.reportsToId;
  }
  return false;
};
