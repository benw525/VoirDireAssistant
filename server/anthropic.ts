import Anthropic from "@anthropic-ai/sdk";
import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages";

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
