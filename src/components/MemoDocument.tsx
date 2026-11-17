import React, { forwardRef } from 'react';
import { DocumentRequest } from '../types';
import { MEMO_CLOSING_LINE, memoStepTitle, shortThaiDate } from '../utils/memo';
import { COMPANY_NAME_TH } from '../utils/itRequest';
import companyLogo from '../assets/company-logo.png';

// A4 at 96 dpi, the same width the e-Slip PDF is drawn at
const A4_WIDTH_PX = 794;

interface MemoDocumentProps {
  request: DocumentRequest;
  /** Lay out at full A4 width regardless of the screen (used for the PDF copy). */
  forExport?: boolean;
}

/** One labelled line of the memo heading, e.g. "เรื่อง  ขออนุมัติ…". */
const HeadingLine: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({
  label,
  children,
  className = '',
}) => (
  <div className={`flex gap-3 ${className}`}>
    <span className="w-12 shrink-0 font-bold">{label}</span>
    <span className="min-w-0 break-words">{children}</span>
  </div>
);

/** Text typed on the memo, one indented paragraph per line (a blank line leaves a gap). */
const Paragraphs: React.FC<{ text: string }> = ({ text }) => (
  <div className="mt-1 space-y-0.5">
    {text.split('\n').map((line, i) =>
      line.trim() ? (
        <p key={i} className="indent-8 break-words">
          {line.trim()}
        </p>
      ) : (
        <div key={i} className="h-2" />
      )
    )}
  </div>
);

/**
 * The internal memorandum (บันทึกภายใน) as it is printed: shown in the window and drawn into
 * the PDF. Laid out like a letter, with rules instead of boxes.
 */
export const MemoDocument = forwardRef<HTMLDivElement, MemoDocumentProps>(({ request, forExport = false }, ref) => {
  const memo = request.memo;
  if (!memo) return null;

  // On screen the layout follows the window width; in the PDF it always uses the wide layout
  const layout = (screen: string, pdf: string) => (forExport ? pdf : screen);
  const signers = request.steps.length;

  return (
    <div
      ref={ref}
      className={`${layout('p-6 sm:p-10 overflow-y-auto', 'px-16 py-14')} font-sans bg-white text-slate-900 text-sm leading-relaxed`}
      style={forExport ? { width: A4_WIDTH_PX } : undefined}
    >
      {/* Letterhead: company on the left, document type on the right */}
      <div className="flex items-end justify-between gap-4 pb-3 border-b-2 border-slate-900">
        <div className="flex items-center gap-3 min-w-0">
          <img src={companyLogo} alt="Jaymart Insurance" className="w-14 h-14 object-contain shrink-0" />
          <p className={`${layout('hidden sm:block', '')} text-xs font-semibold text-slate-600`}>{COMPANY_NAME_TH}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold tracking-wide">บันทึกภายใน</p>
          <p className="text-[11px] text-slate-500 tracking-widest uppercase">Internal Memorandum</p>
        </div>
      </div>

      {/* Number, date, addressee, sender and subject */}
      <div className="mt-5 space-y-1.5">
        <div className={`grid ${layout('grid-cols-1 sm:grid-cols-2', 'grid-cols-2')} gap-x-8 gap-y-1.5`}>
          <HeadingLine label="ที่">{memo.docNo}</HeadingLine>
          <HeadingLine label="วันที่">{memo.date}</HeadingLine>
        </div>
        <HeadingLine label="เรียน">{memo.to}</HeadingLine>
        <HeadingLine label="จาก">
          {request.requestorName}
          {request.requestorDepartment && (
            <span className="text-slate-500"> · {request.requestorDepartment.replace(/\s*\(.*\)$/, '')}</span>
          )}
        </HeadingLine>
        <HeadingLine label="เรื่อง" className="pt-1.5 mt-1.5 border-t border-slate-300 font-semibold">
          {request.title}
        </HeadingLine>
      </div>

      {/* Body */}
      <div className="mt-6 space-y-5">
        <section>
          <h3 className="font-bold">สรุปความเป็นมา</h3>
          <Paragraphs text={memo.background} />
        </section>
        <section>
          <h3 className="font-bold">สรุปสาระสำคัญ</h3>
          <Paragraphs text={memo.summary} />
        </section>
        <p className="indent-8">{MEMO_CLOSING_LINE}</p>
      </div>

      {/* Signatures: one per step of the approval flow, in signing order */}
      <div
        className={`mt-12 grid gap-x-6 gap-y-8 ${
          forExport ? '' : signers > 2 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'
        }`}
        style={forExport ? { gridTemplateColumns: `repeat(${Math.min(signers, 4)}, minmax(0, 1fr))` } : undefined}
      >
        {request.steps.map((step, idx) => {
          const signed = step.status === 'approved';
          const returned = step.status === 'rejected';
          return (
            <div key={idx} className="text-center text-xs">
              <p className="font-bold text-[13px]">{memoStepTitle(step.stepTitle)}</p>
              <div className="h-12 flex items-end justify-center pb-1">
                {signed ? (
                  <span className="text-emerald-700 font-bold">✓ {idx === 0 ? 'จัดทำแล้ว' : 'อนุมัติแล้ว'}</span>
                ) : returned ? (
                  <span className="text-rose-700 font-bold">ตีกลับ</span>
                ) : (
                  <span className="text-slate-300">รอลงนาม</span>
                )}
              </div>
              <div className="mx-auto w-11/12 border-t border-dotted border-slate-500" />
              <p className="mt-1.5 font-semibold break-words">({step.approverName})</p>
              <p className="text-[11px] text-slate-600 break-words">{step.approverRole}</p>
              <p className="mt-1 text-[11px] text-slate-600">
                วันที่ {signed ? shortThaiDate(step.timestamp) : '____/____/______'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
});
MemoDocument.displayName = 'MemoDocument';
