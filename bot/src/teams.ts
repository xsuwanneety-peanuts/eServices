// Microsoft Teams outgoing webhook: Teams POSTs the message that @mentioned the bot, signed
// with HMAC-SHA256 over the raw body using the security token shown when the webhook was made.
// https://learn.microsoft.com/microsoftteams/platform/webhooks-and-connectors/how-to/add-outgoing-webhook

const fromBase64 = (text: string) => Uint8Array.from(atob(text), c => c.charCodeAt(0));
const toBase64 = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes)));

/** True when the request really comes from the Teams webhook that holds this secret. */
export const verifyTeamsSignature = async (rawBody: string, authHeader: string | null, secret: string) => {
  const given = authHeader?.match(/^HMAC\s+(.+)$/i)?.[1];
  if (!given || !secret) return false;
  const key = await crypto.subtle.importKey('raw', fromBase64(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const expected = toBase64(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody)));
  // Compare in constant time
  if (expected.length !== given.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
};

/** The question without the @mention of the bot and the HTML Teams wraps around it. */
export const questionFromTeamsText = (text: string) =>
  text
    .replace(/<at>.*?<\/at>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Posts an answer that was not ready within the webhook's 5 seconds, through a Teams Workflow
 * made from the template "Post to a channel when a webhook request is received". That template
 * expects an Adaptive Card wrapped in a message.
 */
export const postToWorkflow = async (workflowUrl: string, asker: string, question: string, answer: string) => {
  const card = {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    body: [
      {
        type: 'TextBlock',
        text: `คำตอบสำหรับ${asker ? ` คุณ${asker}` : ''}`,
        weight: 'Bolder',
        wrap: true,
      },
      { type: 'TextBlock', text: `❓ ${question}`, isSubtle: true, wrap: true, spacing: 'None' },
      { type: 'TextBlock', text: answer, wrap: true, spacing: 'Medium' },
    ],
  };
  const res = await fetch(workflowUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'message',
      attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', contentUrl: null, content: card }],
    }),
  });
  if (!res.ok) throw new Error(`Workflow returned ${res.status}`);
};

/** The reply Teams shows in the channel. */
export const teamsReply = (text: string) =>
  new Response(JSON.stringify({ type: 'message', text }), { headers: { 'content-type': 'application/json' } });
