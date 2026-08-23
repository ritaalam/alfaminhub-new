import OpenAI from "openai";

const clients = new Map<number, OpenAI | null>();
export const worksheetPlanningProviderTimeoutMs = 18_000;

/**
 * The AI integration is intentionally optional. A missing provider must not
 * prevent teachers from using the deterministic local worksheet generator.
 */
export function getOpenAIClient(timeoutMs = worksheetPlanningProviderTimeoutMs): OpenAI | null {
  const existing = clients.get(timeoutMs);
  if (existing !== undefined) return existing;

  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  if (!apiKey || !baseURL || process.env.AI_WORKSHEET_PLANNING_ENABLED === "false") {
    clients.set(timeoutMs, null);
    return null;
  }

  const client = new OpenAI({
    apiKey,
    baseURL,
    timeout: timeoutMs,
    maxRetries: 0,
  });
  clients.set(timeoutMs, client);
  return client;
}

/** The managed provider stays server-side; deployments can select another supported model. */
export function getWorksheetModel(): string {
  const configured = process.env.AI_WORKSHEET_MODEL?.trim();
  return configured && configured.length <= 80 ? configured : "gpt-5-nano";
}

/** Chat may use a separately selected managed model without exposing it to browsers. */
export function getChatModel(): string {
  const configured = process.env.AI_CHAT_MODEL?.trim();
  return configured && configured.length <= 80 ? configured : getWorksheetModel();
}