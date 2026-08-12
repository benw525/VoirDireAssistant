import Anthropic from "@anthropic-ai/sdk";
import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages";
import type { Response } from "express";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const CLAUDE_OPUS = "claude-opus-5";
export const CLAUDE_SONNET = "claude-sonnet-5";

interface ClaudeOptions {
  model: string;
  system: string;
  userPrompt: string;
  maxTokens: number;
  temperature?: number;
  /**
   * Prompt caching (Lewis/Whigham Section 9): a large context block that is
   * IDENTICAL across many calls (case context, panel roster, stats). When
   * present, the system parameter is sent as two blocks — the static system
   * prompt and this shared context — each marked with `cache_control:
   * ephemeral`, so Anthropic caches the shared prefix across the 30+
   * per-juror / per-chunk calls. Everything call-specific must stay in
   * `userPrompt`.
   */
  cacheableContext?: string;
}

function modelSupportsTemperature(model: string): boolean {
  // temperature is unsupported on opus-4-7 and deprecated on the 5-series models
  return !/^claude-(opus-4-7|opus-5|sonnet-5)/.test(model);
}

export async function claudeComplete(opts: ClaudeOptions): Promise<string> {
  const system: MessageCreateParamsNonStreaming["system"] = opts.cacheableContext
    ? [
        { type: "text", text: opts.system, cache_control: { type: "ephemeral" } },
        { type: "text", text: opts.cacheableContext, cache_control: { type: "ephemeral" } },
      ]
    : opts.system;
  const params: MessageCreateParamsNonStreaming = {
    model: opts.model,
    max_tokens: opts.maxTokens,
    system,
    messages: [{ role: "user", content: opts.userPrompt }],
  };
  if (modelSupportsTemperature(opts.model)) {
    params.temperature = opts.temperature ?? 0.3;
  }
  const response = await anthropic.messages.create(params);

  if (response.stop_reason === "max_tokens") {
    // Truncated output is the silent killer of JSON parsing downstream —
    // make it visible so a parse failure can be traced to its real cause.
    console.warn(
      `[claudeComplete] Output truncated at max_tokens=${opts.maxTokens} (model ${opts.model}) — JSON callers will likely fail to parse this response`,
    );
  }

  for (const block of response.content) {
    if (block.type === "text") return block.text;
  }
  return "";
}

/**
 * Thrown when the model returned output that could not be parsed/validated
 * even after a retry. Callers must NEVER substitute default values for this
 * error — it must surface to the UI as a failed analysis.
 */
export class AIOutputError extends Error {
  readonly kind = "ai_output_invalid";
  constructor(message: string) {
    super(message);
    this.name = "AIOutputError";
  }
}

interface AnthropicErrorPayload {
  status: number;
  code: string;
  message: string;
}

export function classifyAnthropicError(err: any, fallbackMessage: string): AnthropicErrorPayload {
  if (err instanceof AIOutputError || err?.kind === "ai_output_invalid") {
    return {
      status: 502,
      code: "ai_output_invalid",
      message: err.message || "The AI returned an invalid or incomplete result. Please retry the analysis.",
    };
  }

  const status: number | undefined = err?.status;
  const errType: string | undefined = err?.error?.error?.type || err?.error?.type;

  if (status === 429 || errType === "rate_limit_error") {
    return {
      status: 429,
      code: "rate_limit",
      message: "Anthropic is rate-limiting requests right now. Please wait a few seconds and try again.",
    };
  }
  if (status === 529 || errType === "overloaded_error") {
    return {
      status: 503,
      code: "overloaded",
      message: "Claude is temporarily overloaded. Please try again in a moment.",
    };
  }
  if (status === 400 || errType === "invalid_request_error") {
    return {
      status: 422,
      code: "invalid_request",
      message: "Claude rejected the request as invalid. Try simplifying the input or contact support if this persists.",
    };
  }
  if (status === 401 || status === 403 || errType === "authentication_error" || errType === "permission_error") {
    return {
      status: 500,
      code: "auth_error",
      message: "Could not authenticate with Anthropic. Please contact support.",
    };
  }
  if (status && status >= 500) {
    return {
      status: 502,
      code: "upstream_error",
      message: "Claude is having trouble responding. Please try again.",
    };
  }
  return {
    status: 500,
    code: "server_error",
    message: err?.message || fallbackMessage,
  };
}

export function respondWithAnthropicError(res: Response, err: any, fallbackMessage: string) {
  const payload = classifyAnthropicError(err, fallbackMessage);
  res.status(payload.status).json({ message: payload.message, code: payload.code });
}

export async function claudeJson<T = unknown>(opts: ClaudeOptions): Promise<{ raw: string; parsed: T | null }> {
  const systemWithJson =
    opts.system +
    "\n\nCRITICAL OUTPUT RULES: Respond with ONLY a single valid JSON value. No markdown code fences. No prose before or after the JSON. No explanations. Begin your response with `{` or `[` and end with `}` or `]`.";

  const raw = await claudeComplete({ ...opts, system: systemWithJson });

  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return { raw, parsed: JSON.parse(cleaned) as T };
  } catch {
    const candidates = collectJsonCandidates(cleaned);
    for (const candidate of candidates) {
      try {
        return { raw, parsed: JSON.parse(candidate) as T };
      } catch {
        // try next candidate
      }
    }
    return { raw, parsed: null };
  }
}

export function extractFirstJsonValue(text: string): string | null {
  for (const candidate of collectJsonCandidates(text)) {
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      // try next candidate
    }
  }
  return null;
}

export function collectJsonCandidates(text: string): string[] {
  const candidates: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== "{" && ch !== "[") continue;
    const end = findMatchingClose(text, i);
    if (end !== -1) {
      candidates.push(text.slice(i, end + 1));
    }
  }
  return candidates;
}

function findMatchingClose(text: string, start: number): number {
  const open = text[start];
  const close = open === "{" ? "}" : "]";
  const stack: string[] = [open];
  let inString = false;
  let escape = false;

  for (let i = start + 1; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{" || ch === "[") {
      stack.push(ch);
      continue;
    }

    if (ch === "}" || ch === "]") {
      const top = stack[stack.length - 1];
      const expected = top === "{" ? "}" : "]";
      if (ch !== expected) return -1;
      stack.pop();
      if (stack.length === 0) {
        return ch === close ? i : -1;
      }
    }
  }

  return -1;
}
