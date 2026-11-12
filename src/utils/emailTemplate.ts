import { DocumentRequest } from '../types';

export const EMAIL_SENDER_NAME = 'ระบบเดินเอกสาร e-Service';

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
  request?: DocumentRequest | null
): { subject: string; body: string } => {
  const code = request?.code ?? SAMPLE_REQUEST.code;
  const title = request?.title ?? SAMPLE_REQUEST.title;
  const requestorName = request?.requestorName ?? SAMPLE_REQUEST.requestorName;
  const requestorDepartment = request?.requestorDepartment ?? SAMPLE_REQUEST.requestorDepartment;

  return {
    subject: `[โปรดพิจารณาอนุมัติ] ${code}: ${title}`,
    body: [
      approverName ? `เรียน คุณ${approverName}` : 'เรียน ผู้อนุมัติ',
      '',
      `มีคำร้อง ${code} "${title}" จากคุณ ${requestorName} (${requestorDepartment}) รอการพิจารณาของท่านในขั้นตอน "${stepTitle}"`,
      '',
      'หากมีข้อสงสัยหรือไม่สามารถดำเนินการได้กรุณาติดต่อฝ่าย เทคโนโลยีสารสนเทศ',
      'ขอบคุณค่ะ',
    ].join('\n'),
  };
};
