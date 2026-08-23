import type { ToolContext } from "@lovable.dev/mcp-js";

type Json = Record<string, unknown>;

/** Structured JSON result with a success flag, mirrored as text content. */
export function jsonResult(payload: Json, isError = false) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
    ...(isError ? { isError: true } : {}),
  };
}

export function jsonError(code: string, message: string) {
  return jsonResult({ success: false, code, error: message }, true);
}

/**
 * Code tools are privileged: they only run for a caller who completed the
 * server's OAuth flow. Returns null when the caller is authorised.
 */
export function requireAuth(ctx: ToolContext) {
  if (!ctx?.isAuthenticated?.()) {
    return jsonError(
      "unauthorized",
      "This tool requires an authenticated Alfa Mind Hub OAuth session.",
    );
  }
  return null;
}
