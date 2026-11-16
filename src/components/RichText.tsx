import React from 'react';
import { EditorContent, JSONContent, useEditor, useEditorState, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from 'lucide-react';

// Formatting available in Knowledge Base articles. Content is saved as the editor's JSON
// (never raw HTML), so a saved article can only contain these kinds of blocks and marks.
const kit = (editable: boolean) =>
  StarterKit.configure({
    heading: { levels: [2, 3] },
    code: false,
    codeBlock: false,
    // Links open in a new tab; the editor's link check rejects javascript: and similar URLs
    link: { openOnClick: !editable, autolink: true, defaultProtocol: 'https' },
  });
const extensions = [kit(true)];
const viewExtensions = [kit(false)];

const ToolbarButton: React.FC<{
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ label, active, disabled, onClick, children }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    aria-pressed={active}
    disabled={disabled}
    onMouseDown={e => e.preventDefault()}
    onClick={onClick}
    className={`p-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-30 ${
      active ? 'bg-red-100 text-red-700' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
    }`}
  >
    {children}
  </button>
);

const Toolbar: React.FC<{ editor: Editor }> = ({ editor }) => {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      link: e.isActive('link'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('ใส่ลิงก์ (เว้นว่างเพื่อเอาลิงก์ออก)', previous ?? 'https://');
    if (url === null) return;
    if (url.trim() === '' || url.trim() === 'https://') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const icon = 'w-4 h-4';
  const divider = <span className="w-px h-5 bg-slate-300 mx-0.5" aria-hidden />;
  const chain = () => editor.chain().focus();

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1 border-b border-slate-200 bg-slate-50 rounded-t-lg">
      <ToolbarButton label="หัวข้อใหญ่" active={state.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
        <Heading2 className={icon} />
      </ToolbarButton>
      <ToolbarButton label="หัวข้อย่อย" active={state.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
        <Heading3 className={icon} />
      </ToolbarButton>
      {divider}
      <ToolbarButton label="ตัวหนา" active={state.bold} onClick={() => chain().toggleBold().run()}>
        <Bold className={icon} />
      </ToolbarButton>
      <ToolbarButton label="ตัวเอียง" active={state.italic} onClick={() => chain().toggleItalic().run()}>
        <Italic className={icon} />
      </ToolbarButton>
      <ToolbarButton label="ขีดเส้นใต้" active={state.underline} onClick={() => chain().toggleUnderline().run()}>
        <Underline className={icon} />
      </ToolbarButton>
      <ToolbarButton label="ขีดฆ่า" active={state.strike} onClick={() => chain().toggleStrike().run()}>
        <Strikethrough className={icon} />
      </ToolbarButton>
      {divider}
      <ToolbarButton label="รายการแบบจุด" active={state.bullet} onClick={() => chain().toggleBulletList().run()}>
        <List className={icon} />
      </ToolbarButton>
      <ToolbarButton label="รายการแบบตัวเลข" active={state.ordered} onClick={() => chain().toggleOrderedList().run()}>
        <ListOrdered className={icon} />
      </ToolbarButton>
      <ToolbarButton label="ข้อความอ้างอิง / หมายเหตุ" active={state.quote} onClick={() => chain().toggleBlockquote().run()}>
        <Quote className={icon} />
      </ToolbarButton>
      <ToolbarButton label="ลิงก์" active={state.link} onClick={setLink}>
        <Link2 className={icon} />
      </ToolbarButton>
      <ToolbarButton label="เส้นคั่น" onClick={() => chain().setHorizontalRule().run()}>
        <Minus className={icon} />
      </ToolbarButton>
      {divider}
      <ToolbarButton label="เลิกทำ" disabled={!state.canUndo} onClick={() => chain().undo().run()}>
        <Undo2 className={icon} />
      </ToolbarButton>
      <ToolbarButton label="ทำซ้ำ" disabled={!state.canRedo} onClick={() => chain().redo().run()}>
        <Redo2 className={icon} />
      </ToolbarButton>
    </div>
  );
};

/** Formatted text input with a toolbar. Reports the content as JSON plus its plain text. */
export const RichTextEditor: React.FC<{
  initialContent?: JSONContent;
  /** Used when there is no formatted content yet (paragraphs split by blank lines). */
  initialText?: string;
  onChange: (content: JSONContent, text: string) => void;
  labelledBy?: string;
}> = ({ initialContent, initialText, onChange, labelledBy }) => {
  const editor = useEditor({
    extensions,
    content:
      initialContent ??
      (initialText
        ? {
            type: 'doc',
            content: initialText
              .split(/\n\s*\n/)
              .filter(Boolean)
              .map(p => ({ type: 'paragraph', content: [{ type: 'text', text: p }] })),
          }
        : ''),
    editorProps: {
      attributes: {
        class: 'kb-content min-h-[220px] px-3 py-2.5 text-sm focus:outline-hidden',
        ...(labelledBy ? { 'aria-labelledby': labelledBy } : {}),
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getJSON(), e.getText({ blockSeparator: '\n\n' })),
  });

  if (!editor) return null;
  return (
    <div className="border border-slate-300 rounded-lg bg-white focus-within:border-red-500">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};

/** Read-only display of formatted content. */
export const RichTextView: React.FC<{ content: JSONContent }> = ({ content }) => {
  const editor = useEditor(
    {
      extensions: viewExtensions,
      content,
      editable: false,
      editorProps: { attributes: { class: 'kb-content text-sm' } },
    },
    [content]
  );
  return <EditorContent editor={editor} />;
};
