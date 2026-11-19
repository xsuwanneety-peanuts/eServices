import React, { useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useApp } from '../context/AppContext';
import { isArray, usePersistentState } from '../utils/persistentState';
import { askConfirm } from './ConfirmDialog';
import {
  AssistantAnswer,
  AssistantSource,
  MAX_URLS_PER_SOURCE,
  askAssistant,
  assistantErrorMessage,
  suggestQuestions,
} from '../utils/assistant';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  FileText,
  Globe,
  Library,
  Lightbulb,
  Link2,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  urls?: AssistantAnswer['urls'];
  error?: boolean;
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const DEFAULT_SOURCE = (): AssistantSource => ({ id: newId(), name: 'แหล่งข้อมูลของฉัน', urls: [], notes: [] });

/** Markdown from the model, made safe before it is shown. */
const renderMarkdown = (text: string) => DOMPurify.sanitize(marked.parse(text, { async: false }) as string);

// Markdown output styled to match the rest of the app (no typography plugin in this project)
const MARKDOWN_CLASS =
  'text-sm text-slate-800 leading-relaxed break-words [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-3 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-3 [&_h3]:font-semibold [&_h3]:mt-2 [&_strong]:font-bold [&_strong]:text-slate-900 [&_a]:text-red-700 [&_a]:underline [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:rounded [&_code]:text-[13px] [&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_blockquote]:border-l-4 [&_blockquote]:border-red-200 [&_blockquote]:pl-3 [&_blockquote]:text-slate-600 [&_table]:w-full [&_table]:text-xs [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-1';

/**
 * Knowledge › Assistance: ask questions and get answers drawn from the Knowledge Base articles
 * this person may read, plus links and pasted text they keep in their own sources.
 */
export const AssistanceView: React.FC = () => {
  const { knowledgeArticles, currentUser, showToast } = useApp();

  // Sources are personal and stay in this browser, as in the original project
  const [sources, setSources] = usePersistentState<AssistantSource[]>(
    `assistant:sources:${currentUser.email.toLowerCase()}`,
    [DEFAULT_SOURCE()],
    isArray
  );
  const [activeId, setActiveId] = usePersistentState<string>(
    `assistant:active:${currentUser.email.toLowerCase()}`,
    ''
  );
  const [useKb, setUseKb] = usePersistentState<boolean>('assistant:useKb', true);
  const active = sources.find(s => s.id === activeId) ?? sources[0];

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const articles = useKb ? knowledgeArticles : [];
  const urlCount = active?.urls.length ?? 0;
  const noteCount = active?.notes.length ?? 0;
  const hasSources = articles.length > 0 || urlCount > 0 || noteCount > 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  // A fresh conversation whenever the sources in use change
  const sourceKey = `${active?.id}|${useKb}|${urlCount}|${noteCount}|${knowledgeArticles.length}`;
  useEffect(() => {
    setMessages([]);
    setSuggestions([]);
  }, [sourceKey]);

  const updateActive = (change: (s: AssistantSource) => AssistantSource) =>
    setSources(prev => prev.map(s => (s.id === active?.id ? change(s) : s)));

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    if (!hasSources) {
      showToast('เปิดใช้ Knowledge Base หรือเพิ่มลิงก์ / ข้อความก่อนถาม', 'warning');
      return;
    }
    setInput('');
    setSuggestions([]);
    setMessages(prev => [...prev, { id: newId(), sender: 'user', text: q }]);
    setBusy(true);
    try {
      const answer = await askAssistant(q, { articles, urls: active?.urls ?? [], notes: active?.notes ?? [] });
      setMessages(prev => [...prev, { id: newId(), sender: 'assistant', text: answer.text, urls: answer.urls }]);
    } catch (error) {
      console.warn('Assistant error:', error);
      setMessages(prev => [
        ...prev,
        { id: newId(), sender: 'assistant', text: assistantErrorMessage(error), error: true },
      ]);
    }
    setBusy(false);
  };

  const loadSuggestions = async () => {
    if (loadingSuggestions || !hasSources) return;
    setLoadingSuggestions(true);
    try {
      const list = await suggestQuestions({ articles, urls: active?.urls ?? [], notes: active?.notes ?? [] });
      setSuggestions(list);
      if (list.length === 0) showToast('ยังคิดคำถามแนะนำไม่ได้ ลองพิมพ์คำถามเองได้เลย', 'info');
    } catch (error) {
      console.warn('Assistant suggestions error:', error);
      showToast(assistantErrorMessage(error), 'warning');
    }
    setLoadingSuggestions(false);
  };

  const sourceSummary = [
    useKb && `Knowledge Base ${knowledgeArticles.length} บทความ`,
    urlCount > 0 && `${urlCount} ลิงก์`,
    noteCount > 0 && `${noteCount} ข้อความ`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="pb-3 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-red-700 text-white flex items-center justify-center shadow-xs shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Assistance</h1>
            <p className="text-xs text-slate-500 truncate">ถาม AI จาก Knowledge Base และเอกสารของคุณ</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowSources(v => !v)}
          aria-expanded={showSources}
          className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:border-red-300 cursor-pointer shrink-0"
        >
          <Library className="w-4 h-4 text-red-600" />
          แหล่งความรู้
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSources ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 items-start">
        {/* Sources */}
        <aside className={`${showSources ? 'block' : 'hidden'} lg:block space-y-4`}>
          <KbSourceCard
            enabled={useKb}
            onToggle={() => setUseKb(v => !v)}
            count={knowledgeArticles.length}
          />
          {active && (
            <PersonalSources
              sources={sources}
              active={active}
              onSelect={id => setActiveId(id)}
              onAdd={() => {
                const source = { ...DEFAULT_SOURCE(), name: `ชุดที่ ${sources.length + 1}` };
                setSources(prev => [...prev, source]);
                setActiveId(source.id);
              }}
              onRename={name => updateActive(s => ({ ...s, name }))}
              onDelete={() => {
                const rest = sources.filter(s => s.id !== active.id);
                const next = rest.length ? rest : [DEFAULT_SOURCE()];
                setSources(next);
                setActiveId(next[0].id);
              }}
              onChange={updateActive}
            />
          )}
        </aside>

        {/* Chat */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[calc(100vh-15rem)] min-h-[480px]">
          <div className="px-4 sm:px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">ผู้ช่วย JMI E-Service</p>
              <p className="text-[11px] text-slate-500 truncate">
                {hasSources ? `ตอบจาก: ${sourceSummary}` : 'ยังไม่มีแหล่งความรู้ เปิดใช้ Knowledge Base หรือเพิ่มลิงก์ / ข้อความ'}
              </p>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  setSuggestions([]);
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-red-700 cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                เริ่มใหม่
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
            {messages.length === 0 ? (
              <Welcome
                hasSources={hasSources}
                suggestions={suggestions}
                loadingSuggestions={loadingSuggestions}
                onSuggest={loadSuggestions}
                onAsk={ask}
              />
            ) : (
              messages.map(message => <MessageBubble key={message.id} message={message} />)
            )}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="w-7 h-7 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
                  <Loader2 className="w-3.5 h-3.5 text-red-600 animate-spin" />
                </span>
                กำลังค้นคำตอบจากแหล่งความรู้...
              </div>
            )}
            {messages.length > 0 && suggestions.length > 0 && !busy && (
              <SuggestionChips suggestions={suggestions} onAsk={ask} />
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={e => {
              e.preventDefault();
              ask(input);
            }}
            className="p-3 sm:p-4 border-t border-slate-100 flex items-end gap-2"
          >
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  ask(input);
                }
              }}
              rows={1}
              placeholder={hasSources ? 'พิมพ์คำถาม เช่น ลาป่วยต้องแนบใบรับรองแพทย์ไหม' : 'เพิ่มแหล่งความรู้ก่อนเริ่มถาม'}
              aria-label="คำถาม"
              disabled={busy}
              className="flex-1 resize-none max-h-32 px-3 py-2.5 border border-slate-300 rounded-xl bg-white text-sm text-slate-800 focus:outline-hidden focus:border-red-500 disabled:bg-slate-50"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="ส่งคำถาม"
              className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white shadow-xs cursor-pointer disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

/** The Knowledge Base as a source, switched on or off. */
const KbSourceCard: React.FC<{ enabled: boolean; onToggle: () => void; count: number }> = ({
  enabled,
  onToggle,
  count,
}) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
        <BookOpen className="w-4 h-4 text-red-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900">Knowledge Base</p>
        <p className="text-[11px] text-slate-500">{count} บทความที่คุณมีสิทธิ์อ่าน</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="ใช้บทความ Knowledge Base ตอบคำถาม"
        onClick={onToggle}
        className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
          enabled ? 'bg-red-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            enabled ? 'translate-x-4' : ''
          }`}
        />
      </button>
    </div>
  </div>
);

/** The person's own sets of links and pasted text, kept in this browser. */
const PersonalSources: React.FC<{
  sources: AssistantSource[];
  active: AssistantSource;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onChange: (change: (s: AssistantSource) => AssistantSource) => void;
}> = ({ sources, active, onSelect, onAdd, onRename, onDelete, onChange }) => {
  const { showToast } = useApp();
  const [tab, setTab] = useState<'urls' | 'notes'>('urls');
  const [url, setUrl] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(active.name);
  useEffect(() => {
    setName(active.name);
    setRenaming(false);
  }, [active.id, active.name]);

  const addUrl = () => {
    const value = url.trim();
    if (!value) return;
    let parsed: URL;
    try {
      parsed = new URL(value);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error('protocol');
    } catch {
      showToast('ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://', 'warning');
      return;
    }
    if (active.urls.includes(parsed.href)) return showToast('มีลิงก์นี้อยู่แล้ว', 'info');
    if (active.urls.length >= MAX_URLS_PER_SOURCE) {
      return showToast(`เพิ่มได้สูงสุด ${MAX_URLS_PER_SOURCE} ลิงก์ต่อชุด`, 'warning');
    }
    onChange(s => ({ ...s, urls: [...s.urls, parsed.href] }));
    setUrl('');
  };

  const addNote = () => {
    if (!noteBody.trim()) return showToast('วางข้อความก่อนบันทึก', 'warning');
    onChange(s => ({
      ...s,
      notes: [...s.notes, { id: newId(), title: noteTitle.trim() || `ข้อความ ${s.notes.length + 1}`, content: noteBody.trim() }],
    }));
    setNoteTitle('');
    setNoteBody('');
  };

  const inputClass =
    'w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-xs text-slate-800 focus:outline-hidden focus:border-red-500';
  const tabClass = (isActive: boolean) =>
    `flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
      isActive ? 'bg-white text-red-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
    }`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <Library className="w-4 h-4 text-red-600" />
          แหล่งข้อมูลของฉัน
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:text-red-800 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          ชุดใหม่
        </button>
      </div>

      {/* Which set, with rename and delete */}
      {renaming ? (
        <form
          onSubmit={e => {
            e.preventDefault();
            if (name.trim()) onRename(name.trim());
            setRenaming(false);
          }}
          className="flex gap-1.5"
        >
          <input value={name} onChange={e => setName(e.target.value)} aria-label="ชื่อชุดแหล่งข้อมูล" className={inputClass} autoFocus />
          <button type="submit" className="px-2.5 rounded-lg bg-red-600 text-white text-xs font-semibold cursor-pointer">
            บันทึก
          </button>
        </form>
      ) : (
        <div className="flex gap-1.5">
          <select
            value={active.id}
            onChange={e => onSelect(e.target.value)}
            aria-label="เลือกชุดแหล่งข้อมูล"
            className={`${inputClass} cursor-pointer`}
          >
            {sources.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.urls.length + s.notes.length})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setRenaming(true)}
            aria-label="เปลี่ยนชื่อชุดนี้"
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-red-700 hover:border-red-300 cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={async () => {
              if (
                await askConfirm({
                  title: `ลบชุด "${active.name}"?`,
                  message: `ลิงก์ ${active.urls.length} รายการ และข้อความ ${active.notes.length} รายการในชุดนี้จะหายไป`,
                  confirmLabel: 'ลบชุดนี้',
                  danger: true,
                })
              ) {
                onDelete();
              }
            }}
            aria-label="ลบชุดนี้"
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-300 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex gap-1 p-1 rounded-xl bg-slate-100">
        <button type="button" onClick={() => setTab('urls')} className={tabClass(tab === 'urls')}>
          <Link2 className="w-3.5 h-3.5" />
          ลิงก์ ({active.urls.length})
        </button>
        <button type="button" onClick={() => setTab('notes')} className={tabClass(tab === 'notes')}>
          <FileText className="w-3.5 h-3.5" />
          วางข้อความ ({active.notes.length})
        </button>
      </div>

      {tab === 'urls' ? (
        <div className="space-y-2">
          <form
            onSubmit={e => {
              e.preventDefault();
              addUrl();
            }}
            className="flex gap-1.5"
          >
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://..."
              aria-label="ลิงก์ที่จะเพิ่ม"
              className={inputClass}
            />
            <button
              type="submit"
              aria-label="เพิ่มลิงก์"
              className="px-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
          {active.urls.length === 0 ? (
            <p className="text-[11px] text-slate-400">ยังไม่มีลิงก์ ใส่ลิงก์หน้าเว็บสาธารณะที่ต้องการให้ AI อ่าน</p>
          ) : (
            <ul className="space-y-1 max-h-56 overflow-y-auto">
              {active.urls.map(u => (
                <li key={u} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-slate-700" title={u}>
                    {u}
                  </span>
                  <button
                    type="button"
                    onClick={() => onChange(s => ({ ...s, urls: s.urls.filter(x => x !== u) }))}
                    aria-label={`เอา ${u} ออก`}
                    className="p-0.5 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-slate-400">
            ลิงก์ภายในบริษัทที่ต้องล็อกอิน AI จะอ่านไม่ได้ ให้คัดลอกเนื้อหามาวางที่แท็บ "วางข้อความ" แทน
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            value={noteTitle}
            onChange={e => setNoteTitle(e.target.value)}
            placeholder="ชื่อเอกสาร (ไม่บังคับ)"
            aria-label="ชื่อเอกสาร"
            className={inputClass}
          />
          <textarea
            value={noteBody}
            onChange={e => setNoteBody(e.target.value)}
            rows={4}
            placeholder="วางเนื้อหาเอกสาร นโยบาย หรือคู่มือที่ต้องการถาม"
            aria-label="เนื้อหาเอกสาร"
            className={inputClass}
          />
          <button
            type="button"
            onClick={addNote}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            บันทึกข้อความ
          </button>
          {active.notes.length > 0 && (
            <ul className="space-y-1 max-h-56 overflow-y-auto">
              {active.notes.map(n => (
                <li key={n.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <FileText className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-slate-700 truncate">{n.title}</span>
                    <span className="block text-[11px] text-slate-400 truncate">{n.content.length.toLocaleString()} ตัวอักษร</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onChange(s => ({ ...s, notes: s.notes.filter(x => x.id !== n.id) }))}
                    aria-label={`ลบ ${n.title}`}
                    className="p-0.5 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="text-[11px] text-slate-400 border-t border-slate-100 pt-2">
        แหล่งข้อมูลชุดนี้เก็บไว้ในเบราว์เซอร์เครื่องนี้ของคุณเท่านั้น คนอื่นไม่เห็น
      </p>
    </div>
  );
};

const SuggestionChips: React.FC<{ suggestions: string[]; onAsk: (q: string) => void }> = ({ suggestions, onAsk }) => (
  <div className="flex flex-wrap gap-2">
    {suggestions.map(q => (
      <button
        key={q}
        type="button"
        onClick={() => onAsk(q)}
        className="text-left text-xs px-3 py-1.5 rounded-full bg-white border border-red-200 text-red-800 hover:bg-red-50 cursor-pointer"
      >
        {q}
      </button>
    ))}
  </div>
);

/** First screen of a conversation: what to do and suggested questions. */
const Welcome: React.FC<{
  hasSources: boolean;
  suggestions: string[];
  loadingSuggestions: boolean;
  onSuggest: () => void;
  onAsk: (q: string) => void;
}> = ({ hasSources, suggestions, loadingSuggestions, onSuggest, onAsk }) => (
  <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-6">
    <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
      <Sparkles className="w-7 h-7 text-red-600" />
    </div>
    <div>
      <p className="text-base font-bold text-slate-900">สวัสดี มีอะไรให้ช่วยค้นหาไหม</p>
      <p className="text-xs text-slate-500 mt-1 max-w-md">
        {hasSources
          ? 'ถามเรื่องระเบียบ ขั้นตอน หรือวิธีใช้งาน ผู้ช่วยจะตอบจากบทความ Knowledge Base และเอกสารที่คุณเพิ่มไว้เท่านั้น'
          : 'เปิดใช้ Knowledge Base หรือเพิ่มลิงก์ / ข้อความในแหล่งข้อมูลของฉันก่อน แล้วค่อยเริ่มถาม'}
      </p>
    </div>
    {hasSources &&
      (suggestions.length > 0 ? (
        <div className="max-w-lg">
          <SuggestionChips suggestions={suggestions} onAsk={onAsk} />
        </div>
      ) : (
        <button
          type="button"
          onClick={onSuggest}
          disabled={loadingSuggestions}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:border-red-300 hover:text-red-700 disabled:opacity-60 cursor-pointer"
        >
          {loadingSuggestions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4 text-amber-500" />}
          แนะนำคำถาม
        </button>
      ))}
    <p className="text-[11px] text-slate-400 max-w-md">
      คำตอบสร้างโดย AI อาจไม่ถูกต้องทั้งหมด โปรดตรวจสอบกับบทความหรือหน่วยงานเจ้าของเรื่องก่อนนำไปใช้
    </p>
  </div>
);

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const html = useMemo(
    () => (message.sender === 'assistant' && !message.error ? renderMarkdown(message.text) : ''),
    [message]
  );
  if (message.sender === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-br-md bg-red-600 text-white text-sm whitespace-pre-wrap break-words">
          {message.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2.5">
      <span className="w-7 h-7 rounded-full bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-red-600" />
      </span>
      <div className="min-w-0 max-w-[90%] space-y-2">
        {message.error ? (
          <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-md bg-rose-50 border border-rose-200 text-sm text-rose-800 flex items-start gap-1.5">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            {message.text}
          </div>
        ) : (
          <div
            className={`px-3.5 py-2.5 rounded-2xl rounded-tl-md bg-slate-50 border border-slate-200 ${MARKDOWN_CLASS}`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
        {!!message.urls?.length && (
          <ul className="flex flex-wrap gap-1.5">
            {message.urls.map(u => (
              <li
                key={u.url}
                title={u.url}
                className={`inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-full border text-[11px] ${
                  u.status === 'ok'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : u.status === 'failed'
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                {u.status === 'ok' ? (
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                ) : u.status === 'failed' ? (
                  <XCircle className="w-3 h-3 shrink-0" />
                ) : (
                  <Globe className="w-3 h-3 shrink-0" />
                )}
                <span className="truncate">{u.url.replace(/^https?:\/\//, '')}</span>
                <span className="shrink-0 font-semibold">
                  {u.status === 'ok' ? '· อ่านแล้ว' : u.status === 'failed' ? '· อ่านไม่ได้' : '· ไม่ได้อ่าน'}
                </span>
              </li>
            ))}
          </ul>
        )}
        {message.urls?.some(u => u.status !== 'ok') && (
          <p className="text-[11px] text-slate-500 leading-relaxed">
            AI เปิดอ่านลิงก์ที่ไม่ใช่สีเขียวไม่ได้ บางเว็บไม่ยอมให้ระบบของ Google เข้าอ่าน หรือต้องล็อกอินก่อน ให้เปิดหน้านั้นเอง
            คัดลอกเนื้อหา แล้ววางที่แท็บ "วางข้อความ" ในแหล่งข้อมูลของฉันแทน
          </p>
        )}
      </div>
    </div>
  );
};
