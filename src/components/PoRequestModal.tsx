import React, { useState } from 'react';
import { closeOnBackdrop } from './backdrop';
import { useApp } from '../context/AppContext';
import { MenuItemPermission } from '../types';
import { nextRequestCodeFor } from '../utils/forms';
import { thaiDate } from '../utils/memo';
import {
  PO_CLOSING_LINE,
  PO_DEFAULT_CLIENT,
  PO_DEFAULT_TO,
  poApproverTitle,
} from '../utils/poRequest';
import { HandlerDraft, HandlerSteps, handlersToSteps, newHandler } from './HandlerSteps';
import { DraftNotice, SaveDraftButton, useFormDraft } from './FormDraft';
import poLogo from '../assets/po-logo.png';
import { AlertTriangle, Send, X } from 'lucide-react';

/** Fill in a P&O Business Requirement (JRF) and choose who approves it. */
export const PoRequestModal: React.FC<{ form: MenuItemPermission; onClose: () => void }> = ({ form, onClose }) => {
  const { workflows, currentUser, requests, createNewRequest } = useApp();
  const workflow = workflows.find(w => w.id === form.workflowId);

  type Saved = {
    title: string;
    clientName: string;
    attentionTo: string;
    expectedDate: string;
    to: string;
    description: string;
    handlers: HandlerDraft[];
  };
  const draft = useFormDraft<Saved>(form);
  const saved = draft.restored;
  const [title, setTitle] = useState(saved?.title ?? '');
  const [clientName, setClientName] = useState(saved?.clientName ?? PO_DEFAULT_CLIENT);
  const [attentionTo, setAttentionTo] = useState(saved?.attentionTo ?? '');
  const [expectedDate, setExpectedDate] = useState(saved?.expectedDate ?? '');
  const [to, setTo] = useState(saved?.to ?? PO_DEFAULT_TO);
  const [description, setDescription] = useState(saved?.description ?? '');
  const [handlers, setHandlers] = useState<HandlerDraft[]>(saved?.handlers ?? [newHandler()]);
  const [error, setError] = useState('');
  const saveDraft = () => {
    draft.save(title, { title, clientName, attentionTo, expectedDate, to, description, handlers });
    onClose();
  };

  const nextRef = nextRequestCodeFor(
    form,
    requests.map(r => r.code)
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return setError('กรุณากรอกหัวเรื่อง');
    if (!clientName.trim()) return setError('กรุณากรอก Requested Form (Client Name)');
    if (!description.trim()) return setError('กรุณากรอก Description Of Request');
    if (!workflow) return setError('แบบฟอร์มนี้ยังไม่มีขั้นตอนอนุมัติ กรุณาติดต่อผู้ดูแลระบบ');
    if (handlers.length === 0) return setError('กรุณาเพิ่มผู้อนุมัติอย่างน้อย 1 คน');
    if (handlers.some(h => !h.employeeId)) return setError('กรุณาเลือกผู้อนุมัติให้ครบทุกขั้น หรือลบขั้นที่ไม่ใช้');

    createNewRequest(
      {
        title: title.trim(),
        category: form.menuName,
        // A shared form: the request belongs to the requester's own department
        departmentId: currentUser.departmentId,
        workflowId: workflow.id,
        itilCategory: 'service_request',
        formId: form.id,
        // Reference number and date are filled in when the request is sent
        poRequest: {
          clientName: clientName.trim(),
          attentionTo: attentionTo.trim(),
          expectedDate,
          to: to.trim(),
          description: description.trim(),
          refNo: '',
          requestDate: '',
        },
      },
      {},
      handlersToSteps(handlers, poApproverTitle)
    );
    draft.sent();
    onClose();
  };

  const inputClass =
    'w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-sm text-slate-800 focus:outline-hidden focus:border-red-500';
  const labelClass = 'block font-semibold text-slate-700 mb-1';
  const readOnly = 'px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700';

  return (
    <div
      {...closeOnBackdrop(onClose)}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="po-request-title"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[94vh]"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src={poLogo} alt="P&O" className="w-12 h-10 object-contain shrink-0" />
            <div className="min-w-0">
              <h2 id="po-request-title" className="text-base font-bold text-slate-900">
                {form.menuName}
              </h2>
              <p className="text-xs text-slate-500">
                Client&apos;s Reference Number ถัดไป <span className="font-mono text-slate-700">{nextRef}</span>
              </p>
              <DraftNotice savedAt={draft.draft?.savedAt} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          <div>
            <label htmlFor="po-title" className={labelClass}>
              หัวเรื่อง (ใช้ในระบบ) <span className="text-rose-600">*</span>
            </label>
            <input
              id="po-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="เช่น ขอลบรายชื่อกรมธรรม์"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="po-client" className={labelClass}>
                Requested Form (Client Name) <span className="text-rose-600">*</span>
              </label>
              <input id="po-client" value={clientName} onChange={e => setClientName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <p className={labelClass}>Requested By (Person&apos;s Name)</p>
              <p className={readOnly}>{currentUser.name}</p>
            </div>
            <div>
              <p className={labelClass}>Date Of Request</p>
              <p className={readOnly}>{thaiDate(new Date())}</p>
            </div>
            <div>
              <label htmlFor="po-expected" className={labelClass}>
                Expected Date Of Completion
              </label>
              <input
                id="po-expected"
                type="date"
                value={expectedDate}
                onChange={e => setExpectedDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="po-attention" className={labelClass}>
                Attention To
              </label>
              <input
                id="po-attention"
                value={attentionTo}
                onChange={e => setAttentionTo(e.target.value)}
                placeholder="ผู้รับเรื่องที่ P&O (ถ้ามี)"
                className={inputClass}
              />
            </div>
          </div>

          <section className="space-y-2">
            <p className="font-bold text-slate-900">Description Of Request</p>
            <div className="flex items-center gap-2">
              <label htmlFor="po-to" className="font-semibold text-slate-700 shrink-0">
                เรียน
              </label>
              <input id="po-to" value={to} onChange={e => setTo(e.target.value)} className={inputClass} />
            </div>
            <label htmlFor="po-description" className="sr-only">
              Description Of Request
            </label>
            <textarea
              id="po-description"
              rows={7}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={'เช่น ขอลบรายชื่อ จำนวน 4 กรมธรรม์\n1. …\n2. …\nเพื่อ import เข้าไปใหม่'}
              className={inputClass}
            />
            <p className="text-slate-500">
              ท้ายเอกสารจะขึ้นว่า "{PO_CLOSING_LINE}" ตามด้วยชื่อผู้ยื่น
            </p>
          </section>

          <HandlerSteps
            handlers={handlers}
            setHandlers={setHandlers}
            heading="ผู้อนุมัติ"
            label={poApproverTitle}
            inputClass={inputClass}
          />

          {error && (
            <p role="alert" className="flex items-center gap-1.5 text-rose-700 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            ยกเลิก
          </button>
          <SaveDraftButton onClick={saveDraft} />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-red-600 hover:bg-red-700 text-white shadow-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            ส่งคำร้อง
          </button>
        </div>
      </form>
    </div>
  );
};
