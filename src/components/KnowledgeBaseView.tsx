import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { DepartmentId, KbAttachment, KnowledgeArticle } from '../types';
import { DEPT_ICONS } from '../utils/departmentIcons';
import { downloadKbFile, formatFileSize } from '../utils/kbFiles';
import { ArticleEditorModal } from './ArticleEditorModal';
import { IT_REQUEST_FORM_ID } from '../utils/itRequest';
import { RichTextView } from './RichText';
import {
  Download,
  Paperclip,
  Pencil,
  Plus,
  User,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  FileText,
  Lightbulb,
  Search,
  SearchX,
  Building2,
  Lock,
} from 'lucide-react';

/** Marks an article only one department can read, naming that department. */
const LimitedBadge: React.FC<{ article: KnowledgeArticle }> = ({ article }) => {
  const { departments } = useApp();
  if (article.visibility !== 'department') return null;
  const dept = departments.find(d => d.id === article.visibleDepartmentId);
  return (
    <span
      title="บทความนี้เห็นได้เฉพาะหน่วยงานนี้ คนที่เพิ่มรายชื่อไว้ ผู้เขียน และผู้ดูแลระบบ"
      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md"
    >
      <Lock className="w-3 h-3" />
      เฉพาะ {dept?.nameEn ?? 'หน่วยงาน'}
      {!!article.sharedWith?.length && <> + {article.sharedWith.length} คน</>}
    </span>
  );
};

/** All searchable text of an article, lower-cased. */
const articleSearchText = (article: KnowledgeArticle): string =>
  [
    article.title,
    article.summary,
    article.body ?? '',
    article.authorName ?? '',
    ...(article.attachments ?? []).map(a => a.name),
    ...article.tags,
    ...article.sections.flatMap(s => [s.heading, ...(s.paragraphs ?? []), ...(s.steps ?? []), s.tip ?? '']),
  ]
    .join(' ')
    .toLowerCase();

export const KnowledgeBaseView: React.FC = () => {
  const { activeArticleId, setActiveArticleId, knowledgeArticles } = useApp();
  const article = knowledgeArticles.find(a => a.id === activeArticleId);
  // null: closed, 'new': writing a new article, otherwise the article being edited
  const [editing, setEditing] = useState<KnowledgeArticle | 'new' | null>(null);

  // Start each article (and the list) at the top of the scrolling content area
  useEffect(() => {
    document.querySelector('main')?.scrollTo({ top: 0 });
  }, [activeArticleId]);

  return (
    <>
      {article ? (
        <ArticleDetail article={article} onBack={() => setActiveArticleId(null)} onEdit={() => setEditing(article)} />
      ) : (
        <ArticleList onOpen={id => setActiveArticleId(id)} onWrite={() => setEditing('new')} />
      )}
      {editing && (
        <ArticleEditorModal
          article={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={id => {
            setEditing(null);
            setActiveArticleId(id);
          }}
        />
      )}
    </>
  );
};

/** Attached files, each downloaded on click. */
const AttachmentList: React.FC<{ attachments: KbAttachment[] }> = ({ attachments }) => {
  const { showToast } = useApp();
  const [busyId, setBusyId] = useState<string | null>(null);

  const open = async (a: KbAttachment) => {
    setBusyId(a.id);
    try {
      await downloadKbFile(a);
    } catch {
      showToast('ดาวน์โหลดไฟล์ไม่สำเร็จ', 'warning');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ul className="space-y-1.5">
      {attachments.map(a => (
        <li key={a.id}>
          <button
            type="button"
            onClick={() => open(a)}
            disabled={busyId === a.id}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50/30 text-left text-xs cursor-pointer disabled:opacity-60"
          >
            <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="flex-1 min-w-0 truncate font-semibold text-slate-700">{a.name}</span>
            <span className="text-slate-400 shrink-0">{busyId === a.id ? 'กำลังโหลด...' : formatFileSize(a.size)}</span>
            <Download className="w-4 h-4 text-red-600 shrink-0" />
          </button>
        </li>
      ))}
    </ul>
  );
};

// ---------------------------------------------------------------------------
// Article list
// ---------------------------------------------------------------------------

const ArticleList: React.FC<{ onOpen: (id: string) => void; onWrite: () => void }> = ({ onOpen, onWrite }) => {
  const { departments, knowledgeArticles: articles, canWriteArticles } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<DepartmentId | 'all'>('all');

  // Departments that own at least one article, in org-chart order
  const ownerDepts = departments.filter(d => articles.some(a => a.departmentId === d.id));

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return articles.filter(
      a => (deptFilter === 'all' || a.departmentId === deptFilter) && (!q || articleSearchText(a).includes(q))
    );
  }, [articles, searchQuery, deptFilter]);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="pb-3 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-700 text-white flex items-center justify-center shadow-xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Knowledge Base</h1>
        </div>
        {canWriteArticles && (
          <button
            type="button"
            onClick={onWrite}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            เพิ่มบทความ
          </button>
        )}
      </div>

      {/* Search + department filter: many departments, so the filter is a dropdown */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-xl">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ค้นหาความรู้ เช่น VPN, การลา, เบิกค่าใช้จ่าย..."
            aria-label="ค้นหาบทความ"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-red-500"
          />
        </div>
        <div className="relative sm:w-72">
          <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value as DepartmentId | 'all')}
            aria-label="ดูตามหน่วยงาน"
            className={`w-full pl-9 pr-3 py-2.5 bg-white border rounded-xl text-sm focus:outline-hidden focus:border-red-500 cursor-pointer ${
              deptFilter === 'all' ? 'border-slate-200 text-slate-700' : 'border-red-300 text-red-700 font-semibold'
            }`}
          >
            <option value="all">ทุกหน่วยงาน ({articles.length})</option>
            {ownerDepts.map(dept => (
              <option key={dept.id} value={dept.id}>
                {dept.nameEn} ({articles.filter(a => a.departmentId === dept.id).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Article cards */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(article => {
            const dept = departments.find(d => d.id === article.departmentId);
            const Icon = DEPT_ICONS[article.departmentId];
            return (
              <button
                key={article.id}
                type="button"
                onClick={() => onOpen(article.id)}
                className="group text-left bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-red-300 hover:shadow-md transition-all flex flex-col cursor-pointer"
              >
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md">
                    <Icon className="w-3.5 h-3.5" />
                    {dept?.nameEn}
                  </span>
                  <LimitedBadge article={article} />
                </span>
                <span className="mt-3 text-base font-bold text-slate-900 leading-snug group-hover:text-red-700 transition-colors">
                  {article.title}
                </span>
                <span className="mt-1.5 text-xs text-slate-500 leading-relaxed">{article.summary}</span>
                <span className="mt-3 flex flex-wrap gap-1.5">
                  {article.tags.map(tag => (
                    <span key={tag} className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </span>
                <span className="mt-auto pt-4 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    อ่าน {article.readMinutes} นาที • อัปเดต {article.updatedAt}
                    {!!article.attachments?.length && (
                      <>
                        {' '}
                        • <Paperclip className="w-3 h-3" />
                        {article.attachments.length}
                      </>
                    )}
                  </span>
                  <span className="flex items-center gap-1 font-bold text-red-600">
                    อ่านต่อ
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 py-12 px-4 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
            <SearchX className="w-6 h-6" />
          </div>
          <p className="mt-3 text-sm font-bold text-slate-700">ไม่พบความรู้ที่ตรงกับคำค้นหา</p>        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Article detail
// ---------------------------------------------------------------------------

const ArticleDetail: React.FC<{ article: KnowledgeArticle; onBack: () => void; onEdit: () => void }> = ({
  article,
  onBack,
  onEdit,
}) => {
  const {
    departments,
    setFillingFormId,
    offeredForms,
    setActiveArticleId,
    knowledgeArticles,
    canEditArticle,
  } = useApp();
  const dept = departments.find(d => d.id === article.departmentId);
  const Icon = DEPT_ICONS[article.departmentId];
  const otherArticles = knowledgeArticles.filter(a => a.id !== article.id).slice(0, 8);
  const paragraphs = (article.body ?? '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-red-700 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        กลับไปยัง Knowledge Base
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Article body */}
        <article className="lg:col-span-8 bg-white rounded-2xl p-5 sm:p-7 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md">
                <Icon className="w-3.5 h-3.5" />
                {dept?.nameEn}
              </span>
              <LimitedBadge article={article} />
            </span>
            {canEditArticle(article) && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-red-700 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                แก้ไข
              </button>
            )}
          </div>
          <h1 className="mt-3 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
            {article.title}
          </h1>
          {article.summary && <p className="mt-2 text-sm text-slate-600 leading-relaxed">{article.summary}</p>}
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            {article.authorName && (
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {article.authorName}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              อัปเดต {article.updatedAt}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              อ่าน {article.readMinutes} นาที
            </span>
          </p>

          {article.content ? (
            <div className="mt-6">
              <RichTextView content={article.content} />
            </div>
          ) : paragraphs.length > 0 && (
            <div className="mt-6 space-y-3">
              {paragraphs.map((text, idx) => (
                <p key={idx} className="text-sm text-slate-700 leading-relaxed whitespace-pre-line break-words">
                  {text}
                </p>
              ))}
            </div>
          )}

          {!!article.attachments?.length && (
            <section className="mt-7">
              <h2 className="text-base font-bold text-slate-900 pb-2 mb-3 border-b border-slate-100">
                ไฟล์แนบ <span className="text-slate-400 font-normal">{article.attachments.length}</span>
              </h2>
              <AttachmentList attachments={article.attachments} />
            </section>
          )}

          <div className="mt-6 space-y-7">
            {article.sections.map(section => (
              <section key={section.heading}>
                <h2 className="text-base font-bold text-slate-900 pb-2 mb-3 border-b border-slate-100">
                  {section.heading}
                </h2>

                {section.paragraphs && (
                  <div className="space-y-2">
                    {section.paragraphs.map(text => (
                      <p key={text} className="text-sm text-slate-700 leading-relaxed">
                        {text}
                      </p>
                    ))}
                  </div>
                )}

                {section.steps && (
                  <ol className="space-y-2.5">
                    {section.steps.map((step, idx) => (
                      <li key={step} className="flex gap-3 text-sm text-slate-700 leading-relaxed">
                        <span className="w-6 h-6 rounded-full bg-red-50 text-red-700 border border-red-100 text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                )}

                {section.tip && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex gap-2 leading-relaxed">
                    <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{section.tip}</span>
                  </div>
                )}
              </section>
            ))}
          </div>
        </article>

        {/* Sidebar: actions, details, other articles */}
        <aside className="lg:col-span-4 space-y-4">
          {article.relatedForm && offeredForms.some(f => f.id === IT_REQUEST_FORM_ID) && (
            <div className="bg-white rounded-2xl p-4 border border-red-200 shadow-xs">
              <p className="text-sm font-bold text-slate-900">ยังแก้ไม่ได้?</p>
              <p className="text-xs text-slate-500 mt-0.5">ส่งคำขอให้ {dept?.nameEn} ช่วยดำเนินการ</p>
              <button
                type="button"
                onClick={() => setFillingFormId(IT_REQUEST_FORM_ID)}
                className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                IT &amp; Request Form
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs text-xs space-y-3">
            <div>
              <p className="text-slate-400">หน่วยงานที่ดูแลเนื้อหา</p>
              <p className="mt-0.5 inline-flex items-center gap-1.5 font-bold text-slate-800">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {dept?.nameEn}
                <span className="font-normal text-slate-400">({dept?.nameTh})</span>
              </p>
            </div>
            <div>
              <p className="text-slate-400 mb-1">แท็ก</p>
              <div className="flex flex-wrap gap-1.5">
                {article.tags.map(tag => (
                  <span key={tag} className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {otherArticles.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <p className="text-xs font-bold text-slate-900 mb-2">ความรู้อื่นที่น่าสนใจ</p>
              <div className="divide-y divide-slate-100">
                {otherArticles.map(other => {
                  const OtherIcon = DEPT_ICONS[other.departmentId];
                  return (
                    <button
                      key={other.id}
                      type="button"
                      onClick={() => setActiveArticleId(other.id)}
                      className="w-full py-2.5 flex items-start gap-2 text-left group cursor-pointer"
                    >
                      <OtherIcon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-xs font-semibold text-slate-700 group-hover:text-red-700 leading-snug">
                        {other.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
