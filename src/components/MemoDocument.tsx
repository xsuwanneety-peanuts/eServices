import React, { forwardRef } from 'react';
import { DocumentRequest } from '../types';
import { MEMO_CLOSING_LINE, shortThaiDate } from '../utils/memo';
import companyLogo from '../assets/company-logo.png';

// A4 at 96 dpi, the same width the e-Slip PDF is drawn at
const A4_WIDTH_PX = 794;

interface MemoDocumentProps {
  request: DocumentRequest;
  /** Lay out at full A4 width regardless of the screen (used for the PDF copy). */
  forExport?: boolean;
}

/** Company logo at the top of the memo. */
const MemoLogo: React.FC = () => (
  <img src={companyLogo} alt="Jaymart Insurance" className="mx-auto w-24 h-24 object-contain" />
);

/** The internal memorandum (บันทึกภายใน) as it is printed: shown in the window and drawn into the PDF. */
export const MemoDocument = forwardRef<HTMLDivElement, MemoDocumentProps>(({ request, forExport = false }, ref) => {
  const memo = request.memo;
  if (!memo) return null;

  const cell = 'border border-slate-900 px-3 py-2 align-top';
  const label = 'font-bold mr-2';
  const section = 'border border-slate-900 px-4 py-3';

  return (
    <div
      ref={ref}
      className={`${forExport ? 'p-14' : 'p-6 sm:p-10 overflow-y-auto'} font-sans bg-white text-slate-900 text-sm`}
      style={forExport ? { width: A4_WIDTH_PX } : undefined}
    >
      <MemoLogo />

      {/* Addressee, sender, date, number and subject */}
      <table className="w-full mt-5 border-collapse">
        <tbody>
          <tr>
            <td className={`${cell} w-[70%]`}>
              <span className={label}>เรียน</span>
              {memo.to}
            </td>
            <td className={cell}>
              <span className={label}>วันที่</span>
              {memo.date}
            </td>
          </tr>
          <tr>
            <td className={cell}>
              <span className={label}>จาก</span>
              {request.requestorName}
            </td>
            <td className={cell}>
              <span className={label}>ที่</span>
              {memo.docNo}
            </td>
          </tr>
          <tr>
            <td className={cell} colSpan={2}>
              <span className={label}>เรื่อง</span>
              {request.title}
            </td>
          </tr>
        </tbody>
      </table>

      <p className="my-4 text-center">
        <span className="inline-block border border-slate-900 px-3 py-0.5 text-base font-bold">บันทึกภายใน</span>
      </p>

      <div className="space-y-2">
        <div className={`${section} min-h-[130px]`}>
          <p className="font-bold mb-1">สรุปความเป็นมา</p>
          <p className="leading-relaxed whitespace-pre-line break-words">{memo.background}</p>
        </div>
        <div className={`${section} min-h-[200px]`}>
          <p className="font-bold mb-1">สรุปสาระสำคัญ</p>
          <p className="leading-relaxed whitespace-pre-line break-words">{memo.summary}</p>
        </div>
        <div className={section}>
          <p className="indent-8">{MEMO_CLOSING_LINE}</p>
        </div>
      </div>

      {/* Signature boxes: one per step of the approval flow, in signing order */}
      <table className="w-full mt-6 border-collapse table-fixed">
        <tbody>
          <tr>
            {request.steps.map((step, idx) => {
              const signed = step.status === 'approved';
              const returned = step.status === 'rejected';
              return (
                <td key={idx} className="border border-slate-900 px-2 py-3 text-center align-top">
                  <p className="font-bold">{step.stepTitle}</p>
                  <div className="h-14 flex items-center justify-center">
                    {signed ? (
                      <span className="text-emerald-700 font-bold text-xs border border-emerald-600 rounded px-2 py-0.5">
                        ✓ {idx === 0 ? 'จัดทำแล้ว' : 'อนุมัติแล้ว'}
                      </span>
                    ) : returned ? (
                      <span className="text-rose-700 font-bold text-xs">ตีกลับ</span>
                    ) : (
                      <span className="text-slate-300 text-xs">รอลงนาม</span>
                    )}
                  </div>
                  <p className="text-xs font-semibold break-words">({step.approverName})</p>
                  <p className="text-[11px] text-slate-600 break-words">{step.approverRole}</p>
                  <p className="mt-2 text-xs">
                    วันที่ {signed ? shortThaiDate(step.timestamp) : '___/___/______'}
                  </p>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
});
MemoDocument.displayName = 'MemoDocument';
