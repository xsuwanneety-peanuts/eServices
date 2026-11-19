/** Settings of the Worker: [vars] in wrangler.toml, secrets set with `wrangler secret put`. */
export interface Env {
  // Public values (wrangler.toml)
  /** Web API key of the Firebase project (the same public value as in .env.production). */
  FIREBASE_API_KEY: string;
  FIREBASE_PROJECT_ID: string;
  /** Optional: another Gemini model than the app's default. */
  GEMINI_MODEL?: string;

  // Secrets (never in the repo)
  /** Gemini API key from Google AI Studio. */
  GEMINI_API_KEY: string;
  /** Security token Teams shows when the outgoing webhook is created. */
  TEAMS_HMAC_SECRET: string;
  /** The bot's own Firebase Authentication account, used to read the Knowledge Base. */
  BOT_EMAIL: string;
  BOT_PASSWORD: string;
  /**
   * Optional: URL of a Teams Workflow ("Post to a channel when a webhook request is received").
   * Answers that take longer than Teams' 5 seconds are posted there instead of being dropped.
   */
  TEAMS_WORKFLOW_URL?: string;
  /** Optional: enables POST /ask for other tools, called with "Authorization: Bearer <API_TOKEN>". */
  API_TOKEN?: string;
}
