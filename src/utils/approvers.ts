import { ApprovalStepConfig, StepApproverType, UserPersona } from '../types';

export const APPROVER_TYPE_LABELS: Record<StepApproverType, string> = {
  requester: 'ผู้ยื่นคำร้อง',
  reports_to: 'ผู้บังคับบัญชาของผู้ยื่น (Report to)',
  reports_to_2: 'ผู้บังคับบัญชาลำดับถัดไป (Report to ของหัวหน้า)',
  employee: 'พนักงานที่ระบุ',
};

export const ROLE_LABELS: Record<UserPersona['role'], string> = {
  employee: 'พนักงาน',
  approver: 'ผู้อนุมัติ',
  manager: 'ผู้จัดการ',
  director: 'ผู้อำนวยการ',
  admin: 'ผู้ดูแลระบบ',
};

const findEmployee = (employees: UserPersona[], id?: string) =>
  id ? employees.find(e => e.id === id) : undefined;

/**
 * The employee who approves a step for a request submitted by `requestorId`,
 * looked up in the Employee Directory. Undefined when the reporting line is not set up.
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
      return findEmployee(employees, requestor?.reportsToId);
    case 'reports_to_2':
      return findEmployee(employees, findEmployee(employees, requestor?.reportsToId)?.reportsToId);
    case 'employee':
      return findEmployee(employees, step.approverEmployeeId);
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
