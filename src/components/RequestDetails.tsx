import React from 'react';
import { DocumentRequest } from '../types';
import { requestDetailSections } from '../utils/requestDetails';
import { FileText, Paperclip } from 'lucide-react';

/** What the request says, as labelled fields in titled groups (the same look for every form). */
export const RequestDetails: React.FC<{ request: DocumentRequest }> = ({ request }) => {
  const sections = requestDetailSections(request);
  const attachments = request.attachments ?? [];

  return (
    <section aria-labelledby="request-details-title" className="rounded-xl border border-slate-200 overflow-hidden">
      <h4
        id="request-details-title"
        className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-sm font-bold text-slate-900 flex items-center gap-1.5"
      >
        <FileText className="w-4 h-4 text-red-600" />
        รายละเอียดคำร้อง
      </h4>

      <div className="divide-y divide-slate-100">
        {sections.map((section, idx) => (
          <div key={idx} className="px-4 py-3">
            {section.title && (
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-red-700">{section.title}</p>
            )}
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {section.fields.map((f, i) => (
                <div key={i} className={f.wide ? 'sm:col-span-2' : undefined}>
                  {f.label && <dt className="text-[11px] font-medium text-slate-400">{f.label}</dt>}
                  <dd
                    className={`text-sm text-slate-900 leading-relaxed whitespace-pre-line break-words ${
                      f.label ? 'mt-0.5 font-medium' : ''
                    }`}
                  >
                    {f.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}

        {!!request.amount && (
          <div className="px-4 py-3">
            <p className="text-[11px] font-medium text-slate-400">วงเงินงบประมาณ</p>
            <p className="mt-0.5 text-base font-extrabold text-red-700">฿{request.amount.toLocaleString()} บาท</p>
          </div>
        )}

        {attachments.length > 0 && (
          <div className="px-4 py-3">
            <p className="mb-2 text-[11px] font-medium text-slate-400">เอกสารแนบ ({attachments.length})</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {attachments.map((att, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium truncate">{att.name}</span>
                  </span>
                  <span className="text-[11px] text-slate-400 shrink-0">{att.size}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
};
