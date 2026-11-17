import React, { forwardRef } from 'react';
import { ApprovalAuditEntry, DocumentRequest } from '../types';
import {
  COMPANY_NAME_TH,
  IT_ACTIONS,
  IT_IMPACTS,
  IT_ITEM_TYPES,
  IT_KINDS,
  IT_RATING_LABELS,
  itRequestSigners,
  stampParts,
  thaiDateTime,
  workDuration,
} from '../utils/itRequest';
import companyLogo from '../assets/company-logo.png';

// A4 at 96 dpi, the same width the e-Slip PDF is drawn at
const A4_WIDTH_PX = 794;

interface ItRequestDocumentProps {
  request: DocumentRequest;
  /** Lay out at full A4 width regardless of the screen (used for the PDF copy). */
  forExport?: boolean;
}

const Tick: React.FC<{ on?: boolean; children: React.ReactNode }> = ({ on, children }) => (
  <span className="inline-flex items-center gap-1 mr-3 whitespace-nowrap">
    <span className="inline-flex items-center justify-center w-3 h-3 border border-slate-900 text-[9px] leading-none font-bold">
      {on ? '✓' : ''}
    </span>
    {children}
  </span>
);

/** A filled-in blank: the value on a dotted line, or just the line when empty. */
const Blank: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`inline-block border-b border-dotted border-slate-500 px-1 min-w-[2.5rem] font-semibold ${className}`}>
    {children || ' '}
  </span>
);

/** One signature line: who signed electronically and when. */
const Signature: React.FC<{ step?: ApprovalAuditEntry; caption: string; note?: string }> = ({ step, caption, note }) => {
  const signed = step?.status === 'approved';
  return (
    <div className="text-center">
      <p>
        ลงชื่อ <Blank className="min-w-[9rem]">{signed ? `✓ ${step.approverName}` : ''}</Blank> {caption}
      </p>
      {note && <p className="mt-0.5">{note}</p>}
      <p className="mt-0.5">
        <Blank className="min-w-[6rem]">{signed ? stampParts(step.timestamp).date : ''}</Blank>
      </p>
    </div>
  );
};

/** The IT & Request Form as printed, in the layout of the paper form. */
export const ItRequestDocument = forwardRef<HTMLDivElement, ItRequestDocumentProps>(
  ({ request, forExport = false }, ref) => {
    const data = request.itRequest;
    if (!data) return null;
    const { work, acceptance } = data;
    const signers = itRequestSigners(request.steps);
    const issued = stampParts(request.createdAt);
    // The form reaches IT when the step before the IT work is approved
    const workIndex = request.steps.findIndex(step => step.task === 'it_work');
    const received = stampParts(workIndex > 0 ? request.steps[workIndex - 1]?.timestamp : undefined);
    const delivered = stampParts(signers.operator?.status === 'approved' ? signers.operator.timestamp : undefined);
    const actual = work ? workDuration(work) : undefined;
    const start = thaiDateTime(work?.startAt).split(' ');
    const end = thaiDateTime(work?.endAt).split(' ');

    const border = 'border border-slate-900';
    const sectionTitle = 'font-bold px-2 py-1';

    return (
      <div
        ref={ref}
        className={`${forExport ? 'p-8' : 'p-4 sm:p-8 overflow-y-auto'} font-sans bg-white text-slate-900 text-[11px] leading-snug`}
        style={forExport ? { width: A4_WIDTH_PX } : undefined}
      >
        <div className={border}>
          {/* Title block */}
          <div className="flex items-stretch border-b border-slate-900">
            <div className="w-[18%] flex items-center justify-center p-1.5 border-r border-slate-900">
              <img src={companyLogo} alt="Jaymart Insurance" className="w-12 h-12 object-contain" />
            </div>
            <div className="flex-1 flex items-center justify-center text-lg font-bold tracking-wide">IT &amp; REQUEST FORM</div>
            <div className="w-[30%] border-l border-slate-900">
              <p className="px-2 py-1 border-b border-slate-900">
                Doc NO. <span className="font-semibold">{request.code}</span>
              </p>
              <p className="px-2 py-1">{COMPANY_NAME_TH}</p>
            </div>
          </div>

          {/* Part 1: requester */}
          <div className="flex items-center justify-between border-b border-slate-900">
            <p className={sectionTitle}>
              1. ส่วนของผู้ออกใบสั่งงาน User :- <Blank>{data.userLogin}</Blank>
            </p>
            <p className="px-2">
              วันที่ออกใบสั่งงาน <Blank>{issued.date}</Blank> เวลา <Blank>{issued.time}</Blank> น.
            </p>
          </div>
          <div className="px-2 py-1.5 space-y-1 border-b border-slate-900">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <p className="flex-1 min-w-[40%]">
                ชื่อผู้ร้องขอ <Blank>{request.requestorName}</Blank>
              </p>
              <p>
                ฝ่าย / แผนก : <Blank>{request.requestorDepartment}</Blank>
              </p>
              <p>
                เบอร์โทร. <Blank>{data.phone}</Blank>
              </p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <p className="flex-1 min-w-[40%]">
                ผู้ครอบครองทรัพย์สิน : <Blank>{data.assetHolder}</Blank>
              </p>
              <p className="flex-1">
                สถานที่ : <Blank>{data.location}</Blank>
              </p>
            </div>
          </div>

          <div className="flex border-b border-slate-900">
            <table className="w-[62%] border-collapse">
              <thead>
                <tr className="font-bold">
                  <td className="px-2 py-1 w-[36%]">รายการ</td>
                  <td className="px-2 py-1 w-[22%]">ทะเบียน ฯ</td>
                  <td className="px-2 py-1">รายละเอียด / ระบุความต้องการ</td>
                </tr>
              </thead>
              <tbody>
                {IT_ITEM_TYPES.map(type => {
                  const item = data.items.find(i => i.type === type);
                  return (
                    <tr key={type}>
                      <td className="px-2 py-0.5">
                        <Tick on={!!item}>{type}</Tick>
                      </td>
                      <td className="px-2 py-0.5 border-b border-dotted border-slate-400 font-semibold">{item?.assetNo}</td>
                      <td className="px-2 py-0.5 border-b border-dotted border-slate-400 font-semibold break-words">
                        {item?.detail}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex-1 border-l border-slate-900 p-2 min-h-[150px]">
              <p className="text-slate-500">สาเหตุ / อาการ</p>
              <p className="mt-1 font-semibold whitespace-pre-line break-words">{data.symptom}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 px-2 py-3 border-b border-slate-900">
            <Signature step={signers.requester} caption="ลงชื่อผู้ขอ" />
            <Signature step={signers.head} caption="ผู้อนุมัติ" note="ผู้บังคับบัญชาสูงสุด / ต้นสังกัด" />
          </div>

          {/* Part 2: IT */}
          <div className="flex items-center justify-between border-b border-slate-900">
            <p className={sectionTitle}>2. ส่วนของผู้รับใบสั่งงาน IT :-</p>
            <p className="px-2">
              วันที่รับใบสั่งงาน <Blank>{received.date}</Blank> เวลา <Blank>{received.time}</Blank> น.
            </p>
          </div>
          <div className="px-2 py-1.5 space-y-1.5 border-b border-slate-900">
            <p>
              <span className="mr-3">การวินิจฉัย :-</span>
              <Tick on={work?.urgency === 'urgent'}>ด่วน</Tick>
              <Tick on={work?.urgency === 'can_wait'}>
                รอได้ <Blank>{work?.urgency === 'can_wait' ? work.waitDays : ''}</Blank> วัน
              </Tick>
              {IT_IMPACTS.map(impact => (
                <Tick key={impact} on={work?.impacts.includes(impact)}>
                  {impact}
                </Tick>
              ))}
            </p>
            <p>
              ประมาณการเวลาดำเนินการ :- <Blank>{work?.estimate.days}</Blank> วัน <Blank>{work?.estimate.hours}</Blank> ชม.{' '}
              <Blank>{work?.estimate.minutes}</Blank> นาที (แจ้ง User ทันทีที่ได้รับใบสั่งงาน)
            </p>
            <p>
              <span className="mr-3">สาเหตุ / แนวทางแก้ไข / การแก้ไข หรือการดำเนินการ</span>
              {IT_ACTIONS.map(action => (
                <Tick key={action} on={work?.actions.includes(action)}>
                  {action}
                </Tick>
              ))}
              {IT_KINDS.map(kind => (
                <Tick key={kind} on={work?.kinds.includes(kind)}>
                  {kind}
                </Tick>
              ))}
            </p>
            <div className={`${border} p-2 min-h-[80px] font-semibold whitespace-pre-line break-words`}>{work?.solution}</div>
            <p>
              เวลาดำเนินการ :- วันที่เริ่ม <Blank>{start[0]}</Blank> เวลาเริ่ม <Blank>{start[1]}</Blank> น. วันที่สิ้นสุด{' '}
              <Blank>{end[0]}</Blank> เวลาสิ้นสุด <Blank>{end[1]}</Blank> น.
            </p>
            <p>
              รวมเวลาดำเนินการเสร็จจริง :- <Blank>{actual?.days}</Blank> วัน <Blank>{actual?.hours}</Blank> ชม.{' '}
              <Blank>{actual?.minutes}</Blank> นาที
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2 pb-1">
              <Signature step={signers.operator} caption="ผู้ดำเนินการ" />
              <Signature step={signers.director} caption="ผู้อนุมัติ" note="ผู้อำนวยการฝ่ายเทคโนโลยีสารสนเทศ" />
            </div>
          </div>

          {/* Part 3: hand-over */}
          <div className="flex items-center justify-between border-b border-slate-900">
            <p className={sectionTitle}>3. ส่วนของการส่งมอบงาน User :-</p>
            <p className="px-2">
              วันที่ส่งมอบงาน <Blank>{delivered.date}</Blank> เวลา <Blank>{delivered.time}</Blank> น.
            </p>
          </div>
          <div className="px-2 py-1.5 space-y-1.5 border-b border-slate-900">
            <p>
              เรียน ฝ่าย/แผนกที่ร้องขอ บัดนี้ฝ่ายเทคโนโลยีสารสนเทศ ได้ดำเนินการตามที่ท่านต้องการเสร็จเรียบร้อยแล้ว
              จึงขอส่งมอบงานดังนี้
            </p>
            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5">
                <p>
                  <Tick on={!!work && work.cost === 0}>ไม่มีค่าใช้จ่าย</Tick>
                  <Tick on={!!work && work.cost > 0}>
                    มีค่าใช้จ่าย <Blank>{work && work.cost > 0 ? work.cost.toLocaleString() : ''}</Blank> บาท
                  </Tick>
                </p>
                <div className="flex gap-2">
                  <span>อุปกรณ์ที่ใช้</span>
                  <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-1">
                    {[0, 1, 2, 3].map(idx => (
                      <p key={idx}>
                        {idx + 1}. <Blank className="min-w-[6rem]">{work?.equipmentUsed[idx]}</Blank>
                      </p>
                    ))}
                  </div>
                </div>
                <p className={`${border} px-2 py-1 text-center`}>
                  อ้างอิงใบเบิกเลขที่ <Blank className="min-w-[5rem]">{work?.requisitionNo}</Blank> วันที่{' '}
                  <Blank className="min-w-[5rem]">
                    {work?.requisitionDate ? thaiDateTime(`${work.requisitionDate}T00:00`).split(' ')[0] : ''}
                  </Blank>
                </p>
              </div>
              <div className={`${border} w-[38%] p-2 space-y-1`}>
                <p className="text-center">กรณีตัดทำลายทรัพย์สิน :-</p>
                <p>
                  รหัสทรัพย์สินที่ตัดทำลาย <Blank>{work?.disposedAssetNo}</Blank>
                </p>
                <p>
                  รหัสทรัพย์สินที่ต้องโอนย้าย <Blank>{work?.transferredAssetNo}</Blank>
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <div className="w-[42%]">
                <p>หมายเหตุ / ข้อเสนอแนะ : -</p>
                <p className="mt-1 min-h-[40px] border-b border-dotted border-slate-500 font-semibold whitespace-pre-line break-words">
                  {acceptance?.remark}
                </p>
              </div>
              <div className="flex-1">
                <p>ประเมินความพึงพอใจ : - 5 = ดีมาก 4 = ดี 3 = ปานกลาง 2 = น้อย 1 = น้อยมาก</p>
                <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
                  {IT_RATING_LABELS.map(({ key, label }) => (
                    <p key={key} className="flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center w-7 h-5 border border-dotted border-slate-700 font-bold">
                        {acceptance?.ratings[key]}
                      </span>
                      {label}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2">
            <div className="px-2 py-2 border-r border-slate-900">
              <p>ผู้ส่งมอบงาน :-</p>
              <Signature step={signers.operator} caption="" />
            </div>
            <div className="px-2 py-2">
              <p>ผู้รับมอบงาน / ผู้ตรวจสอบ :-</p>
              <Signature step={signers.receiver} caption="" />
            </div>
          </div>
        </div>
      </div>
    );
  }
);
ItRequestDocument.displayName = 'ItRequestDocument';
