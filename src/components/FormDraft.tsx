import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MenuItemPermission } from '../types';
import { FilePen, Save } from 'lucide-react';

/**
 * "บันทึกฉบับร่าง" for a request form. A form opened from a draft starts with what was saved;
 * saving again updates that draft, and sending the request removes it.
 *
 * Each form passes its own fields as `state` and reads them back from `restored`.
 */
export const useFormDraft = <S extends object>(form: MenuItemPermission) => {
  const { resumingDraft, saveRequestDraft, deleteRequestDraft, showToast } = useApp();
  // Read once when the form opens: the draft it was opened from, if any
  const [draft] = useState(() => (resumingDraft?.formId === form.id ? resumingDraft : null));
  const [restored] = useState<Partial<S> | undefined>(() => {
    if (!draft) return undefined;
    try {
      return JSON.parse(draft.state) as Partial<S>;
    } catch {
      return undefined;
    }
  });

  /** Keep what is filled in without sending it to anyone. */
  const save = (title: string, state: S) => {
    saveRequestDraft(form, title, state, draft?.id);
    showToast('บันทึกฉบับร่างแล้ว ยังไม่ส่งถึงผู้อนุมัติ ดูได้ที่ "ฉบับร่าง" ในหน้าแรก', 'success');
  };
  /** Call after the request is sent: the draft is no longer needed. */
  const sent = () => {
    if (draft) deleteRequestDraft(draft.id);
  };

  return { restored, draft, save, sent };
};

/** Footer button that saves the form as a draft. */
export const SaveDraftButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    title="เก็บไว้ก่อน ยังไม่ส่งถึงผู้อนุมัติ"
    className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
  >
    <Save className="w-3.5 h-3.5 shrink-0" />
    {/* Shorter on phones, so the three footer buttons stay on one line */}
    <span className="sm:hidden">บันทึกร่าง</span>
    <span className="hidden sm:inline">บันทึกฉบับร่าง</span>
  </button>
);

/** Line under a form's title when it was opened from a draft. */
export const DraftNotice: React.FC<{ savedAt?: string }> = ({ savedAt }) =>
  savedAt ? (
    <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
      <FilePen className="w-3 h-3" />
      ฉบับร่าง · บันทึกล่าสุด {savedAt}
    </p>
  ) : null;
