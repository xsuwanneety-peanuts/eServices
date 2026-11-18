import { DepartmentId, DocumentRequest } from '../types';
import { CORPORATE_DEPARTMENTS } from '../data/mockData';

export const EMAIL_SENDER_NAME = 'ระบบเอกสารภายในองค์กร JMI E-Service';

/** Values used to preview the email when no real request of the form exists yet. */
const SAMPLE_REQUEST = {
  code: 'REQ-2025-0000',
  title: 'ตัวอย่างหัวเรื่องคำร้อง',
  requestorName: 'ชื่อผู้ยื่นคำร้อง',
  requestorDepartment: 'หน่วยงานผู้ยื่น',
};

/**
 * The approval email sent for a workflow step.
 * One standard wording is used for every form and every step; only the request
 * and step details change.
 */
export const renderStepEmail = (
  stepTitle: string,
  /** Approver's name from the Employee Directory; omitted when no approver is set up yet. */
  approverName: string | undefined,
  request?: DocumentRequest | null,
  /** Department that owns the form; defaults to the request's department. */
  departmentId?: DepartmentId
): { subject: string; body: string } => {
  const ownerDept = CORPORATE_DEPARTMENTS.find(d => d.id === (departmentId ?? request?.departmentId));
  const code = request?.code ?? SAMPLE_REQUEST.code;
  const title = request?.title ?? SAMPLE_REQUEST.title;
  const requestorName = request?.requestorName ?? SAMPLE_REQUEST.requestorName;
  const requestorDepartment = request?.requestorDepartment ?? SAMPLE_REQUEST.requestorDepartment;

  // Where this step sits in the request (step 0 is the requester, so it isn't counted)
  const steps = request?.steps ?? [];
  const found = steps.findIndex((s, i) => i > 0 && s.stepTitle === stepTitle);
  const stepIndex = found > 0 ? found : request?.currentStepIndex ?? 0;
  const approvalSteps = steps.length - 1;
  const stepLine =
    stepIndex > 0 && approvalSteps > 0 ? `"${stepTitle}" (ขั้นที่ ${stepIndex} จาก ${approvalSteps})` : `"${stepTitle}"`;
  // What the approver before this one said, when there was one
  const previous = stepIndex > 1 ? steps[stepIndex - 1] : undefined;
  const previousComment =
    previous?.status === 'approved' && previous.comment?.trim()
      ? `ความเห็นจากผู้อนุมัติก่อนหน้า : ${previous.comment.trim()} (คุณ${previous.approverName})`
      : '';
  const systemLink = typeof window !== 'undefined' ? `${window.location.origin}${import.meta.env.BASE_URL}` : '';

  return {
    subject: `[รออนุมัติ] ${code} ${title}`,
    body: [
      approverName ? `เรียน คุณ${approverName}` : 'เรียน ผู้อนุมัติ',
      '',
      'มีคำร้องรอการพิจารณาอนุมัติจากท่าน รายละเอียดดังนี้',
      '',
      `เลขที่คำร้อง : ${code}`,
      `เรื่อง : ${title}`,
      `ผู้ยื่นคำร้อง : คุณ${requestorName} (${requestorDepartment})`,
      `ขั้นตอนที่รอท่าน : ${stepLine}`,
      ...(previousComment ? [previousComment] : []),
      '',
      'กรุณาเข้าสู่ระบบ JMI E-Service เพื่อตรวจสอบรายละเอียด และพิจารณาอนุมัติหรือตีกลับคำร้อง',
      ...(systemLink ? [systemLink] : []),
      '',
      `หากมีข้อสงสัย กรุณาติดต่อฝ่าย ${ownerDept?.nameEn ?? 'Information Technology'}`,
      '',
      'ขอแสดงความนับถือ',
      EMAIL_SENDER_NAME,
      '(อีเมลนี้ส่งจากระบบอัตโนมัติ กรุณาอย่าตอบกลับ)',
    ].join('\n'),
  };
};
