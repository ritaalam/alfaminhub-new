import { Router, type IRouter } from "express";
import { ChatWithAlfaBody, type AlfaChatInput } from "@workspace/api-zod";
import { getChatModel, getOpenAIClient } from "../lib/openai-client";

const router: IRouter = Router();
const requestWindowMs = 60_000;
const maxRequestsPerWindow = 12;
const requestCounts = new Map<string, { count: number; startedAt: number }>();

function hasChatCapacity(clientId: string): boolean {
  const now = Date.now();
  const current = requestCounts.get(clientId);
  if (!current || now - current.startedAt >= requestWindowMs) {
    requestCounts.set(clientId, { count: 1, startedAt: now });
    return true;
  }
  if (current.count >= maxRequestsPerWindow) return false;
  current.count += 1;
  return true;
}

function fallbackMessage(): string {
  return "Alfa AI is unavailable right now. You can still create a worksheet with the tools on this page.";
}

router.post("/ai/chat", async (req, res): Promise<void> => {
  const parsed = ChatWithAlfaBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ issues: parsed.error.issues.length }, "Invalid Alfa AI chat request");
    res.status(400).json({ error: "Please send a short message to Alfa AI." });
    return;
  }

  if (!hasChatCapacity(req.ip ?? "unknown")) {
    res.status(429).json({ error: "Please wait a moment before sending another message." });
    return;
  }

  // Conversational replies may take longer than the worksheet planner's
  // short fallback window, without ever blocking page rendering.
  const client = getOpenAIClient(10_000);
  if (!client) {
    res.json({ source: "fallback", message: fallbackMessage() });
    return;
  }

  const input = parsed.data as AlfaChatInput;
  try {
    const completion = await client.chat.completions.create({
      model: getChatModel(),
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content:
            "You are Alfa AI, a warm, practical assistant for teachers creating printable learning activities. " +
            "Give clear, age-appropriate ideas, small next steps, and concise worksheet suggestions. " +
            "Do not claim to have created, saved, printed, or viewed a worksheet unless the teacher provides it. " +
            "Do not request student names or sensitive information. Keep answers under 350 words, use plain text, and avoid Markdown tables.",
        },
        ...input.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
    });
    const message = completion.choices[0]?.message?.content?.trim();
    res.json({
      source: "ai",
      message: message && message.length <= 6000 ? message : fallbackMessage(),
    });
  } catch (error) {
    req.log.warn(
      { error: error instanceof Error ? error.name : "unknown" },
      "Alfa AI chat unavailable",
    );
    res.json({ source: "fallback", message: fallbackMessage() });
  }
});

export default router;