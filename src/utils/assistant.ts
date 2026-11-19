import { GoogleAIBackend, getAI, getGenerativeModel } from 'firebase/ai';
import { firebaseApp } from '../lib/firebase';
import { KnowledgeArticle } from '../types';

// Assistance: answers questions from the Knowledge Base and from sources the person adds
// (web links and pasted text). Ported from the Chat-with-documentation project; instead of
// its own server holding a Gemini key, the app calls Gemini through Firebase AI Logic, so the
// key never reaches the browser and GitHub Pages needs no backend.

/** The model the original project used: Gemini's free-tier "flash lite". */
export const ASSISTANT_MODEL = 'gemini-3.1-flash-lite';
export const MAX_URLS_PER_SOURCE = 20;
/** How much text is sent as context at most, so a question stays within the free tier. */
const MAX_CONTEXT_CHARS = 60000;

export interface AssistantNote {
  id: string;
  title: string;
  content: string;
}

/** A set of sources the person keeps for asking questions about (kept in this browser). */
export interface AssistantSource {
  id: string;
  name: string;
  urls: string[];
  notes: AssistantNote[];
}

export type UrlStatus = 'ok' | 'failed' | 'unknown';

export interface AssistantAnswer {
  text: string;
  urls: { url: string; status: UrlStatus }[];
}

const SYSTEM_INSTRUCTION = `คุณคือผู้ช่วยของระบบ JMI E-Service ตอบคำถามจากคลังความรู้ขององค์กร ตอบเป็นภาษาไทยอย่างชัดเจน กระชับ และเป็นระเบียบ
กฎสำคัญที่สุด:
1. ตอบโดยอ้างอิงเฉพาะข้อมูลที่อยู่ใน [บทความ Knowledge Base], [ข้อความอ้างอิง] และเนื้อหาของลิงก์ที่ให้มาเท่านั้น
2. ห้ามคาดเดา หรือนำความรู้ทั่วไปมาตอบแทน ถ้าข้อมูลนั้นไม่ได้อยู่ในแหล่งข้อมูล
3. ถ้าไม่พบคำตอบในแหล่งข้อมูล ให้บอกตรงๆ ว่าไม่พบ และแนะนำให้เพิ่มแหล่งข้อมูล หรือยื่นคำร้องถึงหน่วยงานที่เกี่ยวข้อง
4. เมื่ออ้างถึงบทความ ให้บอกชื่อบทความด้วย
5. ใช้ Markdown จัดรูปแบบ (หัวข้อ รายการ ตัวหนา) ให้อ่านง่าย
6. [เนื้อหาจากลิงก์ที่ผู้ใช้ให้มา] คือสิ่งที่ผู้ใช้ตั้งใจให้ใช้ตอบคำถามนี้ ให้ใช้ก่อนแหล่งอื่น
7. ถ้ามีหมายเหตุว่าลิงก์ใดอ่านไม่ได้ ให้บอกผู้ใช้ และแนะนำให้คัดลอกเนื้อหามาวางในแท็บ "วางข้อความ"`;

const READER_INSTRUCTION = `คุณมีหน้าที่เปิดอ่านลิงก์ที่ได้รับด้วยเครื่องมืออ่าน URL ทุกลิงก์ แล้วคัดเนื้อหาจากลิงก์ที่เกี่ยวข้องกับคำถามออกมาให้ครบถ้วนตามต้นฉบับ (ภาษาไทยหรือภาษาเดิมของเอกสาร)
- ห้ามตอบจากความรู้ของตัวเอง ใช้เฉพาะเนื้อหาที่อ่านได้จากลิงก์
- แยกเนื้อหาตามลิงก์ โดยขึ้นต้นแต่ละส่วนด้วย [ลิงก์: <url>]
- ถ้าลิงก์ไหนอ่านไม่ได้ ให้เขียน [ลิงก์: <url>] อ่านไม่ได้`;

let model: ReturnType<typeof getGenerativeModel> | undefined;
let reader: ReturnType<typeof getGenerativeModel> | undefined;
const getModel = () => {
  model ??= getGenerativeModel(getAI(firebaseApp, { backend: new GoogleAIBackend() }), {
    model: ASSISTANT_MODEL,
    systemInstruction: SYSTEM_INSTRUCTION,
  });
  return model;
};
/**
 * Reads the links on its own. Asked together with a long Knowledge Base, the model tended to
 * answer from the articles and never open the links, so links are read in a separate call
 * whose only job is that, and what it found is passed on as context.
 */
const getReader = () => {
  reader ??= getGenerativeModel(getAI(firebaseApp, { backend: new GoogleAIBackend() }), {
    model: ASSISTANT_MODEL,
    systemInstruction: READER_INSTRUCTION,
    // Gemini fetches the pages itself; the browser could not fetch other sites
    tools: [{ urlContext: {} }],
  });
  return reader;
};

/** What the links say about the question, and whether each link could be read. */
const readLinks = async (question: string, urls: string[]) => {
  if (urls.length === 0) return { text: '', urls: [] as AssistantAnswer['urls'] };
  const result = await getReader().generateContent(
    `คำถาม: ${question}\n\nลิงก์ที่ต้องอ่าน:\n${urls.map(u => `- ${u}`).join('\n')}`
  );
  let text = '';
  try {
    text = result.response.text();
  } catch {
    text = '';
  }
  return { text, urls: urlStatuses(urls, result.response.candidates?.[0]?.urlContextMetadata?.urlMetadata) };
};

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
const buildContext = (articles: KnowledgeArticle[], notes: AssistantNote[], linkText = ''): string => {
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

/** Friendly Thai messages for the errors people are likely to meet. */
export const assistantErrorMessage = (error: unknown): string => {
  const text = String((error as { message?: string })?.message ?? error);
  if (/App Check/i.test(text)) {
    return 'Firebase ปฏิเสธคำขอเพราะเปิดบังคับ App Check ไว้ กรุณาติดต่อผู้ดูแลระบบ';
  }
  if (/api-not-enabled|not been used in project|SERVICE_DISABLED/i.test(text)) {
    return 'ยังไม่ได้เปิดใช้ Firebase AI Logic ในโปรเจกต์นี้ กรุณาติดต่อผู้ดูแลระบบ';
  }
  if (/quota|RESOURCE_EXHAUSTED|429/i.test(text)) {
    return 'ใช้งาน AI เกินโควตาฟรีแล้ว กรุณารอสักครู่แล้วลองใหม่';
  }
  if (/not found|NOT_FOUND|404/i.test(text) && /model/i.test(text)) {
    return `ไม่พบโมเดล ${ASSISTANT_MODEL} กรุณาติดต่อผู้ดูแลระบบ`;
  }
  if (/network|Failed to fetch/i.test(text)) return 'เชื่อมต่ออินเทอร์เน็ตไม่ได้ กรุณาลองใหม่';
  return 'AI ตอบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
};

const urlStatuses = (urls: string[], meta?: { retrievedUrl?: string; urlRetrievalStatus?: string }[]) =>
  urls.map(url => {
    const hit = meta?.find(m => m.retrievedUrl === url);
    const status: UrlStatus = !hit
      ? 'unknown'
      : hit.urlRetrievalStatus === 'URL_RETRIEVAL_STATUS_SUCCESS'
        ? 'ok'
        : 'failed';
    return { url, status };
  });

/** Ask one question about the given articles, links and notes. */
export const askAssistant = async (
  question: string,
  sources: { articles: KnowledgeArticle[]; urls: string[]; notes: AssistantNote[] }
): Promise<AssistantAnswer> => {
  const urls = sources.urls.slice(0, MAX_URLS_PER_SOURCE);
  const links = await readLinks(question, urls);
  const unread = links.urls.filter(u => u.status !== 'ok').map(u => u.url);
  const context = buildContext(sources.articles, sources.notes, links.text);
  const prompt = `คำถามของผู้ใช้:\n${question}${context ? `\n\nข้อมูลอ้างอิงทั้งหมด:\n${context}` : ''}${
    unread.length ? `\n\nหมายเหตุ: ลิงก์เหล่านี้อ่านไม่ได้: ${unread.join(', ')}` : ''
  }`;

  const result = await getModel().generateContent(prompt);
  const response = result.response;
  const candidate = response.candidates?.[0];
  let text = '';
  try {
    text = response.text();
  } catch {
    text = '';
  }
  if (!text) {
    const reason = candidate?.finishReason;
    text =
      reason === 'SAFETY'
        ? 'ระบบความปลอดภัยของโมเดลระงับคำตอบนี้ กรุณาลองปรับคำถามใหม่'
        : reason === 'RECITATION'
          ? 'แสดงคำตอบไม่ได้เพราะข้อความตรงกับต้นฉบับมากเกินไป ลองขอให้สรุปใจความแทน'
          : 'AI ไม่ได้ส่งคำตอบกลับมา กรุณาลองใหม่';
  }
  return { text, urls: links.urls };
};

/** Three or four questions worth asking about these sources. */
export const suggestQuestions = async (sources: {
  articles: KnowledgeArticle[];
  urls: string[];
  notes: AssistantNote[];
}): Promise<string[]> => {
  const urls = sources.urls.slice(0, MAX_URLS_PER_SOURCE);
  const links = await readLinks('สรุปประเด็นสำคัญของเอกสาร', urls);
  const context = buildContext(sources.articles, sources.notes, links.text);
  if (!context) return [];
  const prompt = `จากเนื้อหาด้านล่าง ช่วยคิดคำถามสั้นๆ เป็นภาษาไทย 4 ข้อ ที่ตอบได้จริงจากเนื้อหานี้ ตอบกลับเป็น JSON เท่านั้น รูปแบบ {"suggestions": ["...", "..."]} ไม่ต้องมีข้อความอื่น${
    context ? `\n\nเนื้อหาอ้างอิง:\n${context}` : ''
  }`;
  const result = await getModel().generateContent(prompt);
  let raw = '';
  try {
    raw = result.response.text();
  } catch {
    return [];
  }
  // The answer may come wrapped in a code block; take the JSON object out of it
  const json = raw.match(/\{[\s\S]*\}/)?.[0];
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as { suggestions?: unknown };
    return Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter((q): q is string => typeof q === 'string' && !!q.trim()).slice(0, 4)
      : [];
  } catch {
    return [];
  }
};
