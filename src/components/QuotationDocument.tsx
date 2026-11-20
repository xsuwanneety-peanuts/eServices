import React, { forwardRef } from 'react';
import { DocumentRequest } from '../types';
import { shortThaiDate } from '../utils/memo';
import {
  COMPANY_LETTERHEAD,
  QUOTATION_CLOSING,
  QUOTATION_DOCUMENTS,
  QUOTATION_FORMULA,
  QUOTATION_NOTES,
  QUOTATION_SIGNER_TITLE,
  constructionLines,
  formatBaht,
  formatCount,
  quotationPeriod,
} from '../utils/quotation';
import companyLogo from '../assets/company-logo.png';

// A4 at 96 dpi: the PDF is cut into pages of this height, so each page is drawn exactly this tall
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

interface QuotationDocumentProps {
  request: DocumentRequest;
  /** Lay out at full A4 width regardless of the screen (used for the PDF copy). */
  forExport?: boolean;
}

/** One "label : value" row of the quotation. */
const Row: React.FC<{ label: string; children: React.ReactNode; bold?: boolean }> = ({ label, children, bold }) => (
  <div className="grid grid-cols-[150px_14px_1fr] gap-x-1 py-1">
    <span className="font-semibold">{label}</span>
    <span>:</span>
    <div className={`min-w-0 break-words ${bold ? 'font-semibold' : ''}`}>{children}</div>
  </div>
);

/** One sheet: logo on top, the company's footer at the bottom, a faint name down the side. */
const Sheet: React.FC<{ forExport: boolean; children: React.ReactNode }> = ({ forExport, children }) => (
  <div
    className={`relative bg-white flex flex-col overflow-hidden ${forExport ? 'px-16 pt-10 pb-6' : 'px-6 sm:px-12 pt-8 pb-5 border border-slate-200 shadow-xs'}`}
    style={forExport ? { width: A4_WIDTH_PX, height: A4_HEIGHT_PX } : { minHeight: 900 }}
  >
    <span
      aria-hidden="true"
      className="pointer-events-none select-none absolute right-2 top-24 text-[88px] leading-none font-black text-slate-100 [writing-mode:vertical-rl]"
    >
      jaymart insurance
    </span>
    <img src={companyLogo} alt="Jaymart Insurance" className="relative w-20 h-20 object-contain" />
    <div className="relative flex-1 mt-4">{children}</div>
    <footer className="relative mt-4 pt-2 border-t-2 border-red-600 text-[10px] text-slate-600 leading-snug">
      <p>
        <span className="font-bold text-slate-900 text-[12px]">{COMPANY_LETTERHEAD.nameTh}</span>{' '}
        <span className="font-semibold">{COMPANY_LETTERHEAD.nameEn}</span>
      </p>
      <p>{COMPANY_LETTERHEAD.address}</p>
      <p className="flex justify-between gap-4">
        <span>{COMPANY_LETTERHEAD.contact}</span>
        <span>{COMPANY_LETTERHEAD.web}</span>
      </p>
    </footer>
  </div>
);

/**
 * An insurance quotation (ข้อเสนอการประกันภัย) as printed: two A4 pages laid out like the
 * company's paper quotation. The signature shows once the authorised signer has approved; the
 * part for the insured is left blank for them to fill in on paper.
 */
export const QuotationDocument = forwardRef<HTMLDivElement, QuotationDocumentProps>(
  ({ request, forExport = false }, ref) => {
    const q = request.quotation;
    if (!q) return null;

    const signer = request.steps.find(step => step.stepTitle === QUOTATION_SIGNER_TITLE) ?? request.steps[1];
    const signed = signer?.status === 'approved';
    const coverage = q.coverage.split('\n').map(line => line.trim()).filter(Boolean);
    const notes = [`ข้อเสนอนี้มีผลบังคับใช้ภายใน ${q.validityDays || 30} วัน นับจากวันที่ออกข้อเสนอ`, ...QUOTATION_NOTES];

    return (
      <div
        ref={ref}
        className={`${forExport ? '' : 'p-3 sm:p-6 space-y-6 overflow-y-auto bg-slate-100'} text-slate-900 text-[13px] leading-relaxed`}
        style={forExport ? { width: A4_WIDTH_PX } : undefined}
      >
        {/* Page 1: what is insured and the cover */}
        <Sheet forExport={forExport}>
          <div className="flex justify-between gap-4 font-bold">
            <span>เลขที่ {q.docNo}</span>
            <span>วันที่ {q.date}</span>
          </div>
          <p className="mt-2 text-center font-bold underline underline-offset-4">ข้อเสนอการประกันภัย</p>

          <div className="mt-3">
            <Row label="ประเภท">{q.insuranceType}</Row>
            <Row label="ผู้เอาประกันภัย" bold>
              {q.insured}
            </Row>
            {q.project && (
              <Row label="โครงการ" bold>
                {q.project}
              </Row>
            )}
            {q.participants && (
              <Row label="จำนวนผู้เข้าร่วม" bold>
                {formatCount(q.participants)} ราย
              </Row>
            )}
            <Row label="สถานที่ตั้งทรัพย์สิน">{q.location}</Row>
            <Row label="ลักษณะสิ่งปลูกสร้าง">
              {constructionLines(q).map(line => (
                <p key={line}>{line}</p>
              ))}
            </Row>
            <Row label="สถานที่ใช้เป็น">{q.occupancy}</Row>
            <Row label="ระยะเวลาเอาประกันภัย">{quotationPeriod(q)}</Row>
            <Row label="ทรัพย์สินที่เอาประกันภัย">{q.propertyInsured}</Row>
            <Row label="ความคุ้มครอง">
              <p>คุ้มครองความเสียหายต่อทรัพย์สินที่เอาประกันภัยอันมีสาเหตุเนื่องจาก</p>
              <ol className="mt-1 ml-5 list-decimal space-y-1">
                {coverage.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ol>
              <p className="mt-1 ml-5 font-bold">
                จำกัดวงเงินความรับผิดทุกภัยรวมกันแล้วไม่เกิน {formatCount(q.liabilityLimit)}.- บาท
                ต่อครั้งและตลอดระยะเวลาเอาประกันภัย
              </p>
            </Row>
            {q.policyReference && <p className="mt-2 pl-[168px]">{q.policyReference}</p>}
            <div className="mt-3">
              <Row label="เงื่อนไขที่สำคัญ">
                <p className="whitespace-pre-line">{q.conditions}</p>
              </Row>
            </div>

            {/* How a claim is worked out */}
            <div className="mt-4 grid grid-cols-[150px_20px_1fr] gap-x-1 items-start text-[12px]">
              <div className="text-center">
                <p>{QUOTATION_FORMULA.left}</p>
                <p>{QUOTATION_FORMULA.leftNote}</p>
              </div>
              <span className="text-center">=</span>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="underline underline-offset-2">{QUOTATION_FORMULA.numerator}</p>
                  <p>{QUOTATION_FORMULA.denominator}</p>
                </div>
                <span className="whitespace-nowrap">{QUOTATION_FORMULA.tail}</span>
              </div>
            </div>
          </div>
        </Sheet>

        {/* Page 2: the price, exclusions, signature and the part for the insured */}
        <Sheet forExport={forExport}>
          <p className="text-center font-bold">ทุนประกันภัย {formatBaht(q.sumInsured)} บาท ต่อราย</p>

          <div className="mt-4">
            <Row label="เบี้ยประกันภัย">
              <span className="font-semibold">เบี้ยประกันภัยรวม</span>
              <span className="mx-8 font-bold underline underline-offset-2">{formatBaht(q.premium)}</span>
              <span>บาท</span>
            </Row>
            {q.exclusions.length > 0 && (
              <Row label="ข้อยกเว้น">
                <ol className="ml-5 list-decimal space-y-0.5">
                  {q.exclusions.map((clause, i) => (
                    <li key={i}>{clause}</li>
                  ))}
                </ol>
              </Row>
            )}
          </div>

          <p className="mt-4 indent-12">{QUOTATION_CLOSING[0]}</p>
          <p className="mt-3 indent-12">{QUOTATION_CLOSING[1]}</p>

          {/* Signature of the authorised signer */}
          <div className="mt-6 ml-auto w-64 text-center">
            <p>ขอแสดงความนับถือ</p>
            <div className="h-16 flex items-end justify-center pb-1">
              {signed ? (
                <span className="inline-block border-2 border-dashed border-emerald-600 rounded-lg px-2 py-1 text-emerald-800 rotate-[-3deg]">
                  <span className="block text-[11px] font-black">✓ อนุมัติ</span>
                  <span className="block text-[10px]">
                    {signer?.approverName} · {shortThaiDate(signer?.timestamp)}
                  </span>
                </span>
              ) : signer?.status === 'rejected' ? (
                <span className="text-rose-700 font-bold">ตีกลับ</span>
              ) : (
                <span className="text-slate-300 text-xs">รอลงนาม</span>
              )}
            </div>
            <div className="border-t border-dotted border-slate-500" />
            {signer && <p className="mt-1 text-xs">({signer.approverName})</p>}
            <p className="text-xs">{QUOTATION_SIGNER_TITLE}</p>
          </div>

          {/* หมายเหตุ */}
          <div className="mt-5 grid grid-cols-[70px_1fr] gap-x-2 text-[12px]">
            <span className="font-bold">หมายเหตุ</span>
            <ol className="list-decimal ml-4 space-y-1">
              {notes.map((note, i) => (
                <li key={i}>
                  {note}
                  {i === notes.length - 1 && (
                    <div className="mt-1 space-y-1">
                      {QUOTATION_DOCUMENTS.map(group => (
                        <div key={group.who} className="grid grid-cols-[110px_1fr] gap-x-2">
                          <span className="underline underline-offset-2">{group.who}</span>
                          <div>
                            {group.items.map(item => (
                              <p key={item}>- {item}</p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>

          {/* For the insured, filled in on paper */}
          <div className="mt-5 pt-3 border-t border-slate-700 text-[12px]">
            <p className="text-center font-bold underline underline-offset-2">สำหรับผู้เอาประกันภัย</p>
            <p className="mt-2 flex items-center gap-2">
              <span className="w-4 h-4 border border-slate-700 inline-block shrink-0" />
              ยืนยันและยอมรับเงื่อนไขความคุ้มครองตามใบเสนอราคาเลขที่ <span className="font-bold">{q.docNo}</span>
            </p>
            <p className="mt-2 flex items-center gap-2">
              <span className="w-4 h-4 border border-slate-700 inline-block shrink-0" />
              ต้องการแก้ไขรายละเอียดการประกันภัย ดังนี้
              <span className="flex-1 border-b border-dotted border-slate-500" />
            </p>
            <div className="mt-4 ml-auto w-72 text-center space-y-2">
              <p>ลงชื่อ ..........................................................</p>
              <p>( .......................................................... )</p>
              <p>(ผู้เอาประกันภัย / ผู้มีอำนาจกระทำการแทน)</p>
              <p>วันที่............เดือน.........................พ.ศ............</p>
            </div>
          </div>
        </Sheet>
      </div>
    );
  }
);
QuotationDocument.displayName = 'QuotationDocument';
