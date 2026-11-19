import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { DepartmentId, KbAttachment, KbVisibility, KnowledgeArticle } from '../types';
import { MAX_FILES_PER_ARTICLE, MAX_FILE_BYTES, formatFileSize } from '../utils/kbFiles';
import { Globe, Lock, Paperclip, Trash2, X } from 'lucide-react';
import type { JSONContent } from '@tiptap/react';
import { RichTextEditor } from './RichText';
import { askConfirm } from './ConfirmDialog';
import { ArticleSharePicker } from './ArticleSharePicker';

/** Write or edit a Knowledge Base article, with attached files. */
export const ArticleEditorModal: React.FC<{
  article: KnowledgeArticle | null;
  onClose: () => void;
  onSaved: (id: string) => void;
}> = ({ article, onClose, onSaved }) => {
  const { departments, currentUser, saveArticle, deleteArticle, showToast } = useApp();
  const isNew = article === null;

  const [title, setTitle] = useState(article?.title ?? '');
  const [summary, setSummary] = useState(article?.summary ?? '');
  const [departmentId, setDepartmentId] = useState<DepartmentId>(article?.departmentId ?? currentUser.departmentId);
  const [tagsText, setTagsText] = useState(article?.tags.join(', ') ?? '');
  const [visibility, setVisibility] = useState<KbVisibility>(article?.visibility ?? 'all');
  // A limited article stays with the department it was first limited to (the author's)
  const visibleDeptId = article?.visibleDepartmentId ?? currentUser.departmentId;
  const visibleDeptName = departments.find(d => d.id === visibleDeptId)?.nameEn ?? visibleDeptId;
  // People from other departments who may also read a department-only article
  const [sharedWith, setSharedWith] = useState<string[]>(article?.sharedWith ?? []);
  const [body, setBody] = useState(article?.body ?? '');
  const [content, setContent] = useState<JSONContent | undefined>(article?.content);
  const [kept, setKept] = useState<KbAttachment[]>(article?.attachments ?? []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const fileCount = kept.length + newFiles.length;

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const picked = Array.from(list);
    const tooBig = picked.filter(f => f.size > MAX_FILE_BYTES);
    if (tooBig.length > 0) {
      showToast(`ไฟล์ใหญ่เกิน ${formatFileSize(MAX_FILE_BYTES)}: ${tooBig.map(f => f.name).join(', ')}`, 'warning');
    }
    const ok = picked.filter(f => f.size <= MAX_FILE_BYTES);
    const room = MAX_FILES_PER_ARTICLE - fileCount;
    if (ok.length > room) showToast(`แนบได้สูงสุด ${MAX_FILES_PER_ARTICLE} ไฟล์ต่อบทความ`, 'warning');
    setNewFiles(prev => [...prev, ...ok.slice(0, Math.max(0, room))]);
    if (fileInput.current) fileInput.current.value = '';
  };

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) {
      showToast('กรอกหัวข้อและเนื้อหาก่อนบันทึก', 'warning');
      return;
    }
    setSaving(true);
    const id = await saveArticle(
      {
        title,
        summary,
        departmentId,
        tags: tagsText.split(',').map(t => t.trim()).filter(Boolean),
        visibility,
        sharedWith: visibility === 'department' ? sharedWith : [],
        body,
        content,
        keptAttachments: kept,
        newFiles,
      },
      article?.id
    );
    setSaving(false);
    if (id) onSaved(id);
  };

  const handleDelete = async () => {
    if (!article) return;
    if (
      await askConfirm({
        title: `ลบบทความ "${article.title}" และไฟล์แนบทั้งหมด?`,
        confirmLabel: 'ลบบทความ',
        danger: true,
      })
    ) {
      onClose();
      await deleteArticle(article.id);
    }
  };

  const inputClass =
    'w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-sm text-slate-800 focus:outline-hidden focus:border-red-500';

  const fileRow = (key: string, name: string, size: number, onRemove: () => void) => (
    <li key={key} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
      <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <span className="flex-1 min-w-0 truncate text-slate-700">{name}</span>
      <span className="text-slate-400 shrink-0">{formatFileSize(size)}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`เอา ${name} ออก`}
        className="p-0.5 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </li>
  );

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="article-editor-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[94vh]">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <h2 id="article-editor-title" className="text-base font-bold text-slate-900">
            {isNew ? 'เพิ่มบทความ' : 'แก้ไขบทความ'}
          </h2>
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
            <label htmlFor="kb-title" className="block font-semibold text-slate-700 mb-1">
              หัวข้อ
            </label>
            <input
              id="kb-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="เช่น วิธีตั้งค่าเครื่องพิมพ์"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="kb-dept" className="block font-semibold text-slate-700 mb-1">
                หน่วยงาน
              </label>
              <select
                id="kb-dept"
                value={departmentId}
                onChange={e => setDepartmentId(e.target.value as DepartmentId)}
                className={inputClass}
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.nameEn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="kb-tags" className="block font-semibold text-slate-700 mb-1">
                แท็ก (คั่นด้วย ,)
              </label>
              <input
                id="kb-tags"
                value={tagsText}
                onChange={e => setTagsText(e.target.value)}
                placeholder="เช่น เครื่องพิมพ์, Printer"
                className={inputClass}
              />
            </div>
          </div>

          <fieldset>
            <legend className="block font-semibold text-slate-700 mb-1">ใครเห็นบทความนี้ได้</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(
                [
                  ['all', Globe, 'ทุกหน่วยงาน', 'พนักงานทุกคนอ่านได้'],
                  [
                    'department',
                    Lock,
                    `เฉพาะหน่วยงาน ${visibleDeptName}`,
                    'คนในหน่วยงานนี้ คนที่เพิ่มรายชื่อไว้ ผู้เขียน และผู้ดูแลระบบเท่านั้น',
                  ],
                ] as [KbVisibility, typeof Globe, string, string][]
              ).map(([value, Icon, label, hint]) => (
                <label
                  key={value}
                  className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer ${
                    visibility === value ? 'border-red-400 bg-red-50/60' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="kb-visibility"
                    value={value}
                    checked={visibility === value}
                    onChange={() => setVisibility(value)}
                    className="mt-0.5 w-3.5 h-3.5 text-red-600 cursor-pointer"
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 font-semibold text-slate-800">
                      <Icon className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                      {label}
                    </span>
                    <span className="block text-[11px] text-slate-500">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
            {visibility === 'department' && (
              <ArticleSharePicker emails={sharedWith} onChange={setSharedWith} ownDepartmentId={visibleDeptId} />
            )}
          </fieldset>

          <div>
            <label htmlFor="kb-summary" className="block font-semibold text-slate-700 mb-1">
              สรุปสั้น ๆ (ไม่บังคับ)
            </label>
            <input
              id="kb-summary"
              value={summary}
              onChange={e => setSummary(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <span id="kb-body-label" className="block font-semibold text-slate-700 mb-1">
              เนื้อหา
            </span>
            <RichTextEditor
              initialContent={article?.content}
              initialText={article?.body}
              labelledBy="kb-body-label"
              onChange={(json, text) => {
                setContent(json);
                setBody(text);
              }}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-700">
                ไฟล์แนบ <span className="font-normal text-slate-400">({fileCount}/{MAX_FILES_PER_ARTICLE} · ไม่เกิน {formatFileSize(MAX_FILE_BYTES)}/ไฟล์)</span>
              </span>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={fileCount >= MAX_FILES_PER_ARTICLE}
                className="inline-flex items-center gap-1 font-bold text-red-600 hover:text-red-800 disabled:opacity-40 cursor-pointer"
              >
                <Paperclip className="w-3.5 h-3.5" />
                แนบไฟล์
              </button>
              <input
                ref={fileInput}
                type="file"
                multiple
                className="hidden"
                onChange={e => addFiles(e.target.files)}
              />
            </div>
            {fileCount > 0 ? (
              <ul className="space-y-1.5">
                {kept.map(a => fileRow(a.id, a.name, a.size, () => setKept(prev => prev.filter(k => k.id !== a.id))))}
                {newFiles.map((f, i) =>
                  fileRow(`new-${i}-${f.name}`, f.name, f.size, () => setNewFiles(prev => prev.filter((_, j) => j !== i)))
                )}
              </ul>
            ) : (
              <p className="text-slate-400">ยังไม่มีไฟล์แนบ</p>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
          {!isNew ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              ลบบทความ
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs cursor-pointer disabled:opacity-60"
            >
              {saving ? 'กำลังบันทึก...' : isNew ? 'เพิ่มบทความ' : 'บันทึก'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
