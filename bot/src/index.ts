import { KNOWLEDGE_ARTICLES } from '../../src/data/knowledgeBase';
import { ASSISTANT_MODEL, SYSTEM_INSTRUCTION, buildContext } from '../../src/utils/assistantPrompt';
import type { Env } from './env';
import { readOpenArticles } from './firestore';
import { relevantArticles } from './relevance';
import { postToWorkflow, questionFromTeamsText, teamsReply, verifyTeamsSignature } from './teams';

// "น้องบอท": the JMI E-Service assistant for Microsoft Teams, on Cloudflare Workers (free plan).
//
//   POST /teams   Teams outgoing webhook. Answers from Knowledge Base articles open to every
//                 department; department-only articles are never used, because the webhook
//                 does not say who is asking.
//   POST /ask     JSON API for other tools: {"question": "..."} -> {"answer": "..."}.
//                 Only when the API_TOKEN secret is set; call with "Authorization: Bearer <token>".
//   GET  /        Health check.

/** Teams drops a webhook reply that takes longer than 5 seconds. */
const TEAMS_BUDGET_MS = 4500;
/** A late answer, posted through the Workflow, may take this long (Workers allow 30 s). */
const LATE_BUDGET_MS = 25_000;

/** Tried in order when the main model is busy (503/500) or out of free quota (429), or no longer exists (404). */
const FALLBACK_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];
const RETRY_STATUSES = new Set([404, 429, 500, 503]);

/** The part of Cloudflare's execution context used here: work that continues after replying. */
interface WorkerContext {
  waitUntil(promise: Promise<unknown>): void;
}

const HELP =
  'สวัสดีค่ะ หนูคือผู้ช่วย JMI E-Service 😊 พิมพ์ @ชื่อบอท ตามด้วยคำถามได้เลย เช่น "ลาป่วยต้องแนบใบรับรองแพทย์ไหม" ' +
  'หนูจะตอบจากบทความใน Knowledge Base ที่เปิดให้ทุกหน่วยงานอ่านค่ะ';

const FOOTER = '\n\n_ตอบจาก Knowledge Base ของ JMI E-Service (บทความที่ทุกหน่วยงานอ่านได้) โปรดตรวจสอบก่อนนำไปใช้_';

/** Ask Gemini with the shared Assistance instructions and the open Knowledge Base. */
const answer = async (question: string, env: Env, signal: AbortSignal): Promise<string> => {
  const started = Date.now();
  const stored = await readOpenArticles(env, signal);
  const all = [...stored, ...KNOWLEDGE_ARTICLES];
  // Only the closest articles go to Gemini (a whole Knowledge Base is too slow for Teams);
  // the titles of the rest let it point people to them
  const picked = relevantArticles(question, all);
  const others = all.filter(a => !picked.includes(a)).map(a => `- ${a.title}`);
  const context = [
    buildContext(picked, []),
    others.length ? `[บทความอื่นใน Knowledge Base (มีแค่ชื่อ)]\n${others.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n---\n\n');
  const readMs = Date.now() - started;
  // Logged before Gemini is called, so a timeout still shows how far it got
  console.log(`step articles ready in ${readMs}ms (${picked.length} picked, ${context.length} chars)`);
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [
      { role: 'user', parts: [{ text: `คำถามของผู้ใช้:\n${question}\n\nข้อมูลอ้างอิงทั้งหมด:\n${context}` }] },
    ],
    // A chat reply, not a report: shorter answers also come back faster
    generationConfig: { maxOutputTokens: 700 },
  });
  // Free-tier models are sometimes "experiencing high demand" (503) or out of quota (429);
  // the next model on the list usually still answers
  const models = [...new Set([env.GEMINI_MODEL || ASSISTANT_MODEL, ...FALLBACK_MODELS])];
  let res: Response | undefined;
  for (const model of models) {
    const askedAt = Date.now();
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body,
      signal,
    });
    console.log(`timing model=${model} status=${res.status} gemini=${Date.now() - askedAt}ms read=${readMs}ms`);
    if (res.ok || !RETRY_STATUSES.has(res.status)) break;
    console.warn(`${model} unavailable (${res.status}): ${(await res.text()).slice(0, 120)}`);
  }
  if (!res) throw new Error('No Gemini model to ask');
  if (res.status === 429) return 'ตอนนี้มีคนถามเยอะเกินโควตาฟรีของ AI ลองถามใหม่อีกสักครู่นะคะ';
  if (RETRY_STATUSES.has(res.status)) return 'ตอนนี้ระบบ AI ของ Google มีคนใช้งานหนาแน่น ลองถามใหม่อีกสักครู่นะคะ';
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('').trim();
  return text || 'ขอโทษค่ะ หนูหาคำตอบไม่ได้ ลองถามใหม่ด้วยคำอื่นนะคะ';
};

/** Answer within the time budget, or say so instead of letting Teams time out. */
const answerInTime = async (question: string, env: Env, budgetMs: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budgetMs);
  try {
    return await answer(question, env, controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      console.warn(`answer timed out after ${budgetMs}ms`, error);
      return 'หนูใช้เวลาค้นนานเกินไปค่ะ ลองถามอีกครั้งนะคะ (ครั้งถัดไปจะเร็วขึ้น)';
    }
    console.error('answer failed', error);
    return 'ขอโทษค่ะ ตอนนี้หนูตอบไม่ได้ ลองใหม่อีกครั้ง หรือติดต่อฝ่าย Information Technology นะคะ';
  } finally {
    clearTimeout(timer);
  }
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

export default {
  async fetch(request: Request, env: Env, ctx: WorkerContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/') {
      return json({ ok: true, service: 'JMI E-Service Teams bot' });
    }

    if (request.method === 'POST' && url.pathname === '/teams') {
      const raw = await request.text();
      if (!(await verifyTeamsSignature(raw, request.headers.get('authorization'), env.TEAMS_HMAC_SECRET))) {
        return new Response('Unauthorized', { status: 401 });
      }
      let activity: { text?: string; from?: { name?: string } };
      try {
        activity = JSON.parse(raw);
      } catch {
        return new Response('Bad request', { status: 400 });
      }
      const question = questionFromTeamsText(activity.text ?? '');
      if (question.length < 2) return teamsReply(HELP);

      // Without a Workflow to post late answers, the answer has to fit in Teams' 5 seconds
      if (!env.TEAMS_WORKFLOW_URL) {
        return teamsReply((await answerInTime(question, env, TEAMS_BUDGET_MS)) + FOOTER);
      }
      // With one: answer straight away when Gemini is quick, otherwise say the answer is on its
      // way and post it to the channel through the Workflow when it is ready
      const pending = answerInTime(question, env, LATE_BUDGET_MS);
      const quick = await Promise.race([
        pending.then(text => ({ text })),
        new Promise<null>(resolve => setTimeout(() => resolve(null), TEAMS_BUDGET_MS - 300)),
      ]);
      if (quick) return teamsReply(quick.text + FOOTER);
      const asker = activity.from?.name?.trim() || '';
      ctx.waitUntil(
        pending
          .then(text => postToWorkflow(env.TEAMS_WORKFLOW_URL!, asker, question, text + FOOTER))
          .catch(error => console.error('posting the late answer failed', error))
      );
      return teamsReply(
        `รับคำถามแล้วค่ะ${asker ? ` คุณ${asker}` : ''} กำลังหาคำตอบให้อยู่ คำตอบจะตามมาเป็นข้อความใหม่ในแชนเนลนี้ภายในไม่กี่วินาทีนะคะ`
      );
    }

    if (request.method === 'POST' && url.pathname === '/ask') {
      if (!env.API_TOKEN || request.headers.get('authorization') !== `Bearer ${env.API_TOKEN}`) {
        return json({ error: 'unauthorized' }, 401);
      }
      const body = (await request.json().catch(() => ({}))) as { question?: unknown };
      const question = typeof body.question === 'string' ? body.question.trim() : '';
      if (!question) return json({ error: 'question is required' }, 400);
      return json({ answer: await answerInTime(question, env, 25_000) });
    }

    return new Response('Not found', { status: 404 });
  },
};
