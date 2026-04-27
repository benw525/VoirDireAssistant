import { describe, it, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import {
  extractFirstJsonValue,
  collectJsonCandidates,
  classifyAnthropicError,
  claudeJson,
  anthropic,
} from "./anthropic";

function expectParsed(input: string, expected: unknown) {
  const extracted = extractFirstJsonValue(input);
  assert.notEqual(extracted, null, `expected JSON to be extracted from: ${input}`);
  assert.deepEqual(JSON.parse(extracted as string), expected);
}

describe("extractFirstJsonValue", () => {
  it("parses pure JSON object input", () => {
    expectParsed('{"name":"Alice","age":42}', { name: "Alice", age: 42 });
  });

  it("parses pure JSON array input", () => {
    expectParsed("[1,2,3]", [1, 2, 3]);
  });

  it("extracts a JSON object wrapped in prose", () => {
    expectParsed(
      'Sure, here is the JSON: {"name":"Bob","age":30} hope it helps!',
      { name: "Bob", age: 30 },
    );
  });

  it("extracts a JSON array wrapped in prose", () => {
    expectParsed("Preamble [1,2,3] trailing", [1, 2, 3]);
  });

  it("handles nested objects and arrays", () => {
    expectParsed(
      '{"a":1,"b":{"c":[2,3,{"d":4}]},"e":[[1,2],[3,4]]}',
      { a: 1, b: { c: [2, 3, { d: 4 }] }, e: [[1, 2], [3, 4]] },
    );
  });

  it("ignores braces inside string literals", () => {
    expectParsed(
      '{"a":"has } brace in string","b":[1,2,{"c":3}]}',
      { a: "has } brace in string", b: [1, 2, { c: 3 }] },
    );
  });

  it("handles escaped quotes inside strings", () => {
    expectParsed('{"escaped":"a \\" quote"}', { escaped: 'a " quote' });
  });

  it("handles escaped backslashes preceding a quote", () => {
    expectParsed('{"path":"C:\\\\folder\\\\"}', { path: "C:\\folder\\" });
  });

  it("extracts JSON from code-fenced output", () => {
    const input = '```json\n{"ok":true,"items":[1,2]}\n```';
    expectParsed(input, { ok: true, items: [1, 2] });
  });

  it("extracts JSON from a generic code fence without language tag", () => {
    const input = '```\n[{"id":1},{"id":2}]\n```';
    expectParsed(input, [{ id: 1 }, { id: 2 }]);
  });

  it("skips misleading bracketed prose before real JSON", () => {
    expectParsed('[Note] something happened {"ok":true}', { ok: true });
  });

  it("skips misleading braced prose before real JSON", () => {
    expectParsed(
      '{summary here} then the answer: {"answer":42}',
      { answer: 42 },
    );
  });

  it("extracts trailing JSON after multi-line commentary", () => {
    expectParsed(
      'Result follows.\n[{"id":1},{"id":2}]\nThank you.',
      [{ id: 1 }, { id: 2 }],
    );
  });

  it("returns null when no JSON value is present", () => {
    assert.equal(extractFirstJsonValue("no json here"), null);
  });

  it("returns null for empty input", () => {
    assert.equal(extractFirstJsonValue(""), null);
  });

  it("returns null when braces never balance", () => {
    assert.equal(extractFirstJsonValue('{"a":1'), null);
    assert.equal(extractFirstJsonValue('[1,2,3'), null);
  });
});

describe("collectJsonCandidates", () => {
  it("collects all balanced candidates in order of appearance", () => {
    const input = '[bad token] {"first":1} {"second":2}';
    const candidates = collectJsonCandidates(input);
    const parseable = candidates.filter((c) => {
      try {
        JSON.parse(c);
        return true;
      } catch {
        return false;
      }
    });
    assert.deepEqual(
      parseable.map((c) => JSON.parse(c)),
      [{ first: 1 }, { second: 2 }],
    );
  });

  it("returns an empty list when no opening bracket exists", () => {
    assert.deepEqual(collectJsonCandidates("plain text"), []);
  });
});

describe("classifyAnthropicError", () => {
  const fallback = "Something went wrong.";

  it("classifies rate limit by status 429", () => {
    const result = classifyAnthropicError({ status: 429 }, fallback);
    assert.equal(result.status, 429);
    assert.equal(result.code, "rate_limit");
    assert.match(result.message, /rate-limit/i);
  });

  it("classifies rate limit by error type", () => {
    const result = classifyAnthropicError(
      { error: { error: { type: "rate_limit_error" } } },
      fallback,
    );
    assert.equal(result.code, "rate_limit");
  });

  it("classifies overloaded by status 529", () => {
    const result = classifyAnthropicError({ status: 529 }, fallback);
    assert.equal(result.status, 503);
    assert.equal(result.code, "overloaded");
    assert.match(result.message, /overloaded/i);
  });

  it("classifies overloaded by error type", () => {
    const result = classifyAnthropicError(
      { error: { type: "overloaded_error" } },
      fallback,
    );
    assert.equal(result.code, "overloaded");
  });

  it("classifies invalid request by status 400", () => {
    const result = classifyAnthropicError({ status: 400 }, fallback);
    assert.equal(result.status, 422);
    assert.equal(result.code, "invalid_request");
  });

  it("classifies invalid request by error type", () => {
    const result = classifyAnthropicError(
      { error: { error: { type: "invalid_request_error" } } },
      fallback,
    );
    assert.equal(result.code, "invalid_request");
  });

  it("classifies auth by 401", () => {
    const result = classifyAnthropicError({ status: 401 }, fallback);
    assert.equal(result.status, 500);
    assert.equal(result.code, "auth_error");
  });

  it("classifies auth by 403", () => {
    const result = classifyAnthropicError({ status: 403 }, fallback);
    assert.equal(result.code, "auth_error");
  });

  it("classifies auth by authentication_error type", () => {
    const result = classifyAnthropicError(
      { error: { error: { type: "authentication_error" } } },
      fallback,
    );
    assert.equal(result.code, "auth_error");
  });

  it("classifies auth by permission_error type", () => {
    const result = classifyAnthropicError(
      { error: { error: { type: "permission_error" } } },
      fallback,
    );
    assert.equal(result.code, "auth_error");
  });

  it("classifies generic 5xx as upstream_error", () => {
    const result = classifyAnthropicError({ status: 500 }, fallback);
    assert.equal(result.status, 502);
    assert.equal(result.code, "upstream_error");
  });

  it("classifies 503 as upstream_error", () => {
    const result = classifyAnthropicError({ status: 503 }, fallback);
    assert.equal(result.code, "upstream_error");
  });

  it("falls back to server_error using err.message when unknown", () => {
    const result = classifyAnthropicError({ message: "weird boom" }, fallback);
    assert.equal(result.status, 500);
    assert.equal(result.code, "server_error");
    assert.equal(result.message, "weird boom");
  });

  it("falls back to provided message when err has no message", () => {
    const result = classifyAnthropicError({}, fallback);
    assert.equal(result.code, "server_error");
    assert.equal(result.message, fallback);
  });
});

describe("claudeJson", () => {
  function mockResponse(text: string) {
    mock.method(anthropic.messages, "create", async () => ({
      id: "msg_test",
      type: "message",
      role: "assistant",
      model: "claude-sonnet-4-6",
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 },
      content: [{ type: "text", text, citations: null }],
    }));
  }

  afterEach(() => {
    mock.restoreAll();
  });

  it("parses clean JSON output", async () => {
    mockResponse('{"a":1,"b":[2,3]}');
    const result = await claudeJson<{ a: number; b: number[] }>({
      model: "claude-sonnet-4-6",
      system: "sys",
      userPrompt: "u",
      maxTokens: 100,
    });
    assert.deepEqual(result.parsed, { a: 1, b: [2, 3] });
    assert.equal(result.raw, '{"a":1,"b":[2,3]}');
  });

  it("parses code-fenced JSON output", async () => {
    const raw = '```json\n{"ok":true}\n```';
    mockResponse(raw);
    const result = await claudeJson<{ ok: boolean }>({
      model: "claude-sonnet-4-6",
      system: "sys",
      userPrompt: "u",
      maxTokens: 100,
    });
    assert.deepEqual(result.parsed, { ok: true });
    assert.equal(result.raw, raw);
  });

  it("parses JSON wrapped in prose by extracting candidates", async () => {
    const raw = 'Sure! Here you go: {"answer":42} -- hope that helps.';
    mockResponse(raw);
    const result = await claudeJson<{ answer: number }>({
      model: "claude-sonnet-4-6",
      system: "sys",
      userPrompt: "u",
      maxTokens: 100,
    });
    assert.deepEqual(result.parsed, { answer: 42 });
    assert.equal(result.raw, raw);
  });

  it("returns parsed=null but preserves raw when output is unparseable", async () => {
    const raw = "this is just prose with no json at all";
    mockResponse(raw);
    const result = await claudeJson({
      model: "claude-sonnet-4-6",
      system: "sys",
      userPrompt: "u",
      maxTokens: 100,
    });
    assert.equal(result.parsed, null);
    assert.equal(result.raw, raw);
  });
});
