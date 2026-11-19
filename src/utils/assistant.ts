import { GoogleAIBackend, getAI, getGenerativeModel } from 'firebase/ai';
import { firebaseApp } from '../lib/firebase';
import { KnowledgeArticle } from '../types';
import { AssistantNote, ASSISTANT_MODEL, SYSTEM_INSTRUCTION, buildContext } from './assistantPrompt';

export { ASSISTANT_MODEL, articleText } from './assistantPrompt';
export type { AssistantNote } from './assistantPrompt';

// Assistance: answers questions from the Knowledge Base and from sources the person adds
// (web links and pasted text). Ported from the Chat-with-documentation project; instead of
// its own server holding a Gemini key, the app calls Gemini through Firebase AI Logic, so the
// key never reaches the browser and GitHub Pages needs no backend.

export const MAX_URLS_PER_SOURCE = 20;

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
