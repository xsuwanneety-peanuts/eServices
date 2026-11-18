import React, { forwardRef } from 'react';
import { DocumentRequest } from '../types';
import { shortThaiDate } from '../utils/memo';
import { PO_CLOSING_LINE, PO_HEADER, poDate } from '../utils/poRequest';
import poLogo from '../assets/po-logo.png';

// A4 at 96 dpi, the same width the other PDFs are drawn at
const A4_WIDTH_PX = 794;
/** Description rows on the paper form; longer text simply adds rows. */
const MIN_DESCRIPTION_ROWS = 4;

interface PoRequestDocumentProps {
  request: DocumentRequest;
  /** Lay out at full A4 width regardless of the screen (used for the PDF copy). */
  forExport?: boolean;
}

const border = 'border-slate-900';
const shade = 'bg-slate-100';
/** A ruled line of the description area. */
const Line: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`min-h-[30px] px-2 py-1 flex items-center border-b border-dotted border-slate-400 ${className}`}>
    {children}
  </div>
);

/**
 * P&O's Business Requirement (JRF) as printed: the same boxes and order as P&O's paper form,
 * filled in from the request. The bottom part is left blank for P&O to complete.
 */
export const PoRequestDocument = forwardRef<HTMLDivElement, PoRequestDocumentProps>(
  ({ request, forExport = false }, ref) => {
    const po = request.poRequest;
    if (!po) return null;

    const approvers = request.steps.slice(1);
    const descriptionLines = po.description.split('\n');
    const blankRows = Math.max(0, MIN_DESCRIPTION_ROWS - descriptionLines.length);
    const headerRows: [string, string][] = [
      ['Requested Form (Client Name)', po.clientName],
      ["Requested By (Person's Name)", request.requestorName],
      ['Date Of Request', po.requestDate],
      ["Client's Reference Number", po.refNo],
      ['Expected Date Of Completion', poDate(po.expectedDate)],
      ['Attention To', po.attentionTo],
    ];

    return (
      <div
        ref={ref}
        className={`${forExport ? 'px-12 py-10' : 'p-5 sm:p-8 overflow-y-auto'} bg-white text-slate-900 text-[13px]`}
        style={forExport ? { width: A4_WIDTH_PX } : undefined}
      >
        {/* Letterhead */}
        <div className="flex items-start gap-4">
          <img src={poLogo} alt="P&O" className="w-28 h-auto object-contain shrink-0" />
          <div className="flex-1 text-center font-serif">
            <p className="text-xl sm:text-2xl font-bold tracking-wide">{PO_HEADER.company}</p>
            <p className="text-sm italic">{PO_HEADER.group}</p>
            <p className="text-sm font-bold">{PO_HEADER.companyNo}</p>
            <p className="mt-3 text-lg font-bold">{PO_HEADER.title}</p>
          </div>
        </div>

        <div className={`mt-6 border-2 ${border} px-4 py-2 text-center font-serif italic font-bold text-xs`}>
          <p>{PO_HEADER.note}</p>
          <p>{PO_HEADER.contact}</p>
        </div>

        {/* Request header with the signature box on the right */}
        <div className={`mt-3 border ${border} font-serif`}>
          <div className="grid grid-cols-[1fr_1fr_0.95fr]">
            <div className="col-span-2">
              {headerRows.map(([label, value]) => (
                <div key={label} className={`grid grid-cols-2 border-b ${border} min-h-[30px]`}>
                  <span className={`px-2 py-1 font-bold border-r ${border} ${shade}`}>{label}</span>
                  <span className={`px-2 py-1 text-center font-sans border-r ${border}`}>{value}</span>
                </div>
              ))}
            </div>
            <div className={`border-b ${border} px-2 py-1 text-center font-bold`}>Signature &amp; Company Chop</div>
          </div>

          {/* Description of the request */}
          <div className={`px-2 py-1 font-bold border-b ${border}`}>
            Description Of Request (Please specify each request on a separate form)
          </div>
          <div className="font-sans">
            <Line>เรียน{po.to}</Line>
            {descriptionLines.map((line, i) => (
              <Line key={i}>
                <span className="whitespace-pre-wrap break-words">{line}</span>
              </Line>
            ))}
            {Array.from({ length: blankRows }, (_, i) => (
              <Line key={`blank-${i}`} />
            ))}
            <Line className="pl-14">{PO_CLOSING_LINE}</Line>
            <Line className="pl-24">{request.requestorName}</Line>
            <Line />

            {/* Approvers, in order: signed ones show who and when */}
            {approvers.map((step, i) => {
              const signed = step.status === 'approved';
              const returned = step.status === 'rejected';
              return (
                <div
                  key={i}
                  className="min-h-[30px] px-2 py-1 grid grid-cols-[34%_33%_33%] gap-2 items-center border-b border-dotted border-slate-400"
                >
                  <span className="text-right">{step.stepTitle}</span>
                  <span className="text-center text-xs">
                    {signed ? (
                      <span className="text-emerald-700 font-bold">
                        ✓ {step.approverName} {shortThaiDate(step.timestamp)}
                      </span>
                    ) : returned ? (
                      <span className="text-rose-700 font-bold">ตีกลับ</span>
                    ) : (
                      <span className="text-slate-400">{step.approverName}</span>
                    )}
                  </span>
                  <span className="text-xs">{step.approverRole}</span>
                </div>
              );
            })}
            <Line />
          </div>

          {/* Acknowledged by */}
          <div className={`min-h-[30px] px-2 py-1 border-b ${border} ${shade} font-sans text-center text-xs`}>รับทราบ</div>

          {/* For P&O to fill in */}
          <div className={`grid grid-cols-[30%_25%_25%_20%] border-b ${border}`}>
            <span className={`px-2 py-1 font-bold border-r ${border} ${shade}`}>Job Request Number</span>
            <span className={`border-r ${border}`} />
            <span className={`px-2 py-1 font-bold border-r ${border} ${shade}`}>Date Submitted</span>
            <span />
          </div>
          <div className="font-sans">
            <Line />
            <Line />
            <div className={`min-h-[30px] border-b ${border}`} />
          </div>
          <div className={`grid grid-cols-[40%_20%_20%_20%] border-b ${border}`}>
            <span className={`px-2 py-1 font-bold border-r ${border} ${shade}`}>Department</span>
            <span className={`px-2 py-1 font-bold border-r ${border} ${shade}`}>Received By</span>
            <span className={`px-2 py-1 font-bold border-r ${border} ${shade}`}>Signature</span>
            <span className={`px-2 py-1 font-bold ${shade}`}>Date</span>
          </div>
          <div className="grid grid-cols-[40%_20%_20%_20%] min-h-[30px]">
            <span className={`px-2 py-1 font-bold border-r ${border} flex gap-8`}>
              <span>o S&amp;M</span>
              <span>o SUP</span>
              <span>o DEV</span>
            </span>
            <span className={`border-r ${border}`} />
            <span className={`border-r ${border}`} />
            <span />
          </div>
        </div>
      </div>
    );
  }
);
PoRequestDocument.displayName = 'PoRequestDocument';
