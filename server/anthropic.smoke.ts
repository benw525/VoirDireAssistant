import { extractFirstJsonValue, collectJsonCandidates } from "./anthropic";

type Case = { name: string; input: string; expectedParsed: unknown };

const cases: Case[] = [
  {
    name: "leading prose around object",
    input: 'Sure, here is the JSON: {"name":"Bob","age":30} hope it helps!',
    expectedParsed: { name: "Bob", age: 30 },
  },
  {
    name: "prose around array",
    input: "Preamble [1,2,3] trailing",
    expectedParsed: [1, 2, 3],
  },
  {
    name: "braces inside string literal",
    input: '{"a":"has } brace in string","b":[1,2,{"c":3}]}',
    expectedParsed: { a: "has } brace in string", b: [1, 2, { c: 3 }] },
  },
  {
    name: "escaped quotes in string",
    input: '{"escaped":"a \\" quote"}',
    expectedParsed: { escaped: 'a " quote' },
  },
  {
    name: "misleading bracketed prose before real JSON",
    input: '[Note] something happened {"ok":true}',
    expectedParsed: { ok: true },
  },
  {
    name: "misleading braced prose before real JSON",
    input: '{summary here} then the answer: {"answer":42}',
    expectedParsed: { answer: 42 },
  },
  {
    name: "trailing commentary after array",
    input: 'Result follows.\n[{"id":1},{"id":2}]\nThank you.',
    expectedParsed: [{ id: 1 }, { id: 2 }],
  },
  {
    name: "no JSON returns null",
    input: "no json here",
    expectedParsed: null,
  },
];

let failed = 0;
for (const c of cases) {
  const extracted = extractFirstJsonValue(c.input);
  const actualParsed = extracted === null ? null : JSON.parse(extracted);
  const ok = JSON.stringify(actualParsed) === JSON.stringify(c.expectedParsed);
  if (!ok) failed++;
  console.log(
    ok ? "PASS" : "FAIL",
    "|",
    c.name,
    "| got:",
    JSON.stringify(actualParsed),
    "| want:",
    JSON.stringify(c.expectedParsed),
  );
}

const candidateOrderInput = '[bad token] {"first":1} {"second":2}';
const candidates = collectJsonCandidates(candidateOrderInput);
console.log("candidate count:", candidates.length, "candidates:", candidates);

console.log(failed === 0 ? "ALL PASS" : `${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
