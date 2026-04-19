import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractFirstJsonValue, collectJsonCandidates } from "./anthropic";

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
