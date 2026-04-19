import Anthropic from "@anthropic-ai/sdk";
import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages";
import type { Response } from "express";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const CLAUDE_OPUS = "claude-opus-4-7";
export const CLAUDE_SONNET = "claude-sonnet-4-6";

interface ClaudeOptions {
  model: string;
  system: string;
  userPrompt: string;
  maxTokens: number;
  temperature?: number;
}

function modelSupportsTemperature(model: string): boolean {
  return !/^claude-opus-4-7/.test(model);
}

export async function claudeComplete(opts: ClaudeOptions): Promise<string> {
  const params: MessageCreateParamsNonStreaming = {
    model: opts.model,
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages: [{ role: "user", content: opts.userPrompt }],
  };
  if (modelSupportsTemperature(opts.model)) {
    params.temperature = opts.temperature ?? 0.3;
  }
  const response = await anthropic.messages.create(params);

  for (const block of response.content) {
    if (block.type === "text") return block.text;
  }
  return "";
}

interface AnthropicErrorPayload {
  status: number;
  code: string;
  message: string;
}

export function classifyAnthropicError(err: any, fallbackMessage: string): AnthropicErrorPayload {
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
    const match = cleaned.match(/[\[{][\s\S]*[\]}]/);
    if (match) {
      try {
        return { raw, parsed: JSON.parse(match[0]) as T };
      } catch {
        return { raw, parsed: null };
      }
    }
    return { raw, parsed: null };
  }
}
