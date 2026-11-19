import type { KnowledgeArticle } from '../types';

// The parts of the Assistance prompt that need no Firebase SDK, shared by the web app
// (src/utils/assistant.ts) and the Microsoft Teams bot (bot/src/index.ts), so both answer the
// same way from the same Knowledge Base.

/** The model the original project used: Gemini's free-tier "flash lite". */
export const ASSISTANT_MODEL = 'gemini-3.1-flash-lite';

/** How much text is sent as context at most, so a question stays within the free tier. */
export const MAX_CONTEXT_CHARS = 60000;

export interface AssistantNote {
  id: string;
  title: string;
  content: string;
}

export const SYSTEM_INSTRUCTION = `คุณคือผู้ช่วยของระบบ JMI E-Service ตอบคำถามจากคลังความรู้ขององค์กร ตอบเป็นภาษาไทยอย่างชัดเจน กระชับ และเป็นระเบียบ
กฎสำคัญที่สุด:
1. ตอบโดยอ้างอิงเฉพาะข้อมูลที่อยู่ใน [บทความ Knowledge Base], [ข้อความอ้างอิง] และเนื้อหาของลิงก์ที่ให้มาเท่านั้น
2. ห้ามคาดเดา หรือนำความรู้ทั่วไปมาตอบแทน ถ้าข้อมูลนั้นไม่ได้อยู่ในแหล่งข้อมูล
3. ถ้าไม่พบคำตอบในแหล่งข้อมูล ให้บอกตรงๆ ว่าไม่พบ และแนะนำให้เพิ่มแหล่งข้อมูล หรือยื่นคำร้องถึงหน่วยงานที่เกี่ยวข้อง
4. เมื่ออ้างถึงบทความ ให้บอกชื่อบทความด้วย
5. ใช้ Markdown จัดรูปแบบ (หัวข้อ รายการ ตัวหนา) ให้อ่านง่าย
6. [เนื้อหาจากลิงก์ที่ผู้ใช้ให้มา] คือสิ่งที่ผู้ใช้ตั้งใจให้ใช้ตอบคำถามนี้ ให้ใช้ก่อนแหล่งอื่น
7. ถ้ามีหมายเหตุว่าลิงก์ใดอ่านไม่ได้ ให้บอกผู้ใช้ และแนะนำให้คัดลอกเนื้อหามาวางในแท็บ "วางข้อความ"`;

/** An article as plain text: built-in ones are sections, employee-written ones have a body. */
export const articleText = (article: KnowledgeArticle): string => {
  const parts = [article.title, article.summary];
  if (article.body) parts.push(article.body);
  article.sections.forEach(section => {
    parts.push(`## ${section.heading}`);
    section.paragraphs?.forEach(p => parts.push(p));
    section.steps?.forEach((step, i) => parts.push(`${i + 1}. ${step}`));
    if (section.tip) parts.push(`เคล็ดลับ: ${section.tip}`);
  });
  return parts.filter(Boolean).join('\n');
};

/**
 * Everything sent as context, cut to MAX_CONTEXT_CHARS: what the links said first (the person
 * chose them for this question), then the articles, then pasted notes.
 */
export const buildContext = (articles: KnowledgeArticle[], notes: AssistantNote[], linkText = ''): string => {
  const sections: string[] = [];
  let total = 0;
  const add = (label: string, text: string) => {
    const room = MAX_CONTEXT_CHARS - total;
    if (room <= 0) return;
    const snippet = text.trim().slice(0, room);
    total += snippet.length;
    sections.push(`[${label}]\n${snippet}`);
  };
  if (linkText.trim()) add('เนื้อหาจากลิงก์ที่ผู้ใช้ให้มา', linkText);
  articles.forEach(a => add(`บทความ Knowledge Base: ${a.title}`, articleText(a)));
  notes.forEach(n => add(`ข้อความอ้างอิง: ${n.title.trim() || 'เอกสารเพิ่มเติม'}`, n.content));
  return sections.join('\n\n---\n\n');
};
