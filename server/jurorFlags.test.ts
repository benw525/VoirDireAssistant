import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeCaseFlags,
  classifyTopics,
  detectConcededOrWeakLiability,
} from "./jurorFlags";

const WRECK_Q = {
  questionNumber: 1,
  originalText: "Has anyone here ever been involved in a car wreck or automobile accident?",
};
const WITNESS_Q = {
  questionNumber: 2,
  originalText: "Do any of you know any of the witnesses or parties in this case?",
};

const CONCEDED_SUMMARY =
  "Rear-end collision. Liability is conceded; the only dispute is the extent of damages from soft-tissue injuries.";
const DISPUTED_SUMMARY = "Intersection collision; both liability and damages are contested.";

function baseInput(overrides: Partial<Parameters<typeof computeCaseFlags>[0]> = {}) {
  return {
    caseSummary: DISPUTED_SUMMARY,
    jurors: [
      { number: 1, name: "Alice Adams" },
      { number: 2, name: "Bob Brown" },
    ],
    questions: [WRECK_Q, WITNESS_Q],
    responses: [],
    courtDismissed: [],
    ...overrides,
  };
}

test("hand raise on a wreck question creates an unresolved accident flag", () => {
  const result = computeCaseFlags(
    baseInput({
      responses: [
        { jurorNumber: 1, questionId: 1, responseText: "[Hand] Raised hand", questionSummary: "prior wrecks" },
      ],
    }),
  );
  const flag = result.flags.find((f) => f.topic === "accident-history" && f.jurorNumber === 1);
  assert.ok(flag, "expected an accident-history flag");
  assert.equal(flag!.resolved, false);
  assert.equal(flag!.sources[0].kind, "raise");
  assert.ok(result.summaryLine.includes("1 undeveloped accident/wreck raise"));
});

test("Whigham scenario: 36 unvalenced raises → 36 unresolved flags in the rollup", () => {
  const jurors = Array.from({ length: 36 }, (_, i) => ({ number: i + 1, name: `Juror ${i + 1}` }));
  const responses = jurors.map((j) => ({
    jurorNumber: j.number,
    questionId: 1,
    responseText: "[Hand] Raised hand",
    questionSummary: "global wreck question",
  }));
  const result = computeCaseFlags(baseInput({ jurors, responses }));
  const topic = result.topics.find((t) => t.topic === "accident-history");
  assert.equal(topic?.unresolvedCount, 36);
  assert.ok(result.summaryLine.includes("36 undeveloped accident/wreck raises"));
});

test("a recorded follow-up answer resolves the raise", () => {
  const result = computeCaseFlags(
    baseInput({
      responses: [
        {
          jurorNumber: 1,
          questionId: 1,
          responseText: "[Hand] Raised hand",
          followUps: [{ question: "Were you hurt?", answer: "Rear-ended in 2019, no injuries, no claim, satisfied." }],
        },
      ],
    }),
  );
  const flag = result.flags.find((f) => f.topic === "accident-history" && f.jurorNumber === 1);
  assert.equal(flag!.resolved, true);
  assert.equal(flag!.resolvedBy, "follow-up answer recorded");
});

test("a developed verbal narrative self-resolves; a bare short verbal does not", () => {
  const result = computeCaseFlags(
    baseInput({
      responses: [
        {
          jurorNumber: 1,
          questionId: 1,
          responseText:
            "I was rear-ended on I-65 in 2020. I was the one struck, went to my doctor twice, never filed any claim, and the insurance company handled everything fairly.",
        },
        { jurorNumber: 2, questionId: 1, responseText: "Yes, once." },
      ],
    }),
  );
  const developed = result.flags.find((f) => f.topic === "accident-history" && f.jurorNumber === 1);
  const bare = result.flags.find((f) => f.topic === "accident-history" && f.jurorNumber === 2);
  assert.equal(developed!.resolved, true);
  assert.equal(developed!.resolvedBy, "developed narrative answer");
  assert.equal(bare!.resolved, false);
});

test("negative-lead verbal answers do not create question-topic flags", () => {
  const result = computeCaseFlags(
    baseInput({
      responses: [{ jurorNumber: 1, questionId: 1, responseText: "No, never been in one." }],
    }),
  );
  assert.equal(result.flags.filter((f) => f.topic === "accident-history").length, 0);
});

test("negative-lead verbal still flags topics revealed in the answer text", () => {
  const result = computeCaseFlags(
    baseInput({
      responses: [
        { jurorNumber: 1, questionId: 1, responseText: "No, but my brother sued somebody after his crash." },
      ],
    }),
  );
  assert.ok(result.flags.some((f) => f.topic === "injury-claim" && f.jurorNumber === 1));
});

test("notes are classified including their body; witness connections rank first", () => {
  const result = computeCaseFlags(
    baseInput({
      responses: [
        { jurorNumber: 1, questionId: 2, responseText: "[Hand] Raised hand" },
        { jurorNumber: 2, questionId: 1, responseText: "[Note] Says he is a former patient of Dr. White" },
        { jurorNumber: 2, questionId: 1, responseText: "[Hand] Raised hand" },
      ],
    }),
  );
  const witnessTopic = result.topics.find((t) => t.topic === "witness-connection");
  assert.equal(witnessTopic?.unresolvedCount, 2);
  assert.equal(result.topics[0].topic, "witness-connection", "witness connections must rank first");
  const phrases = result.summaryLine.split("; ");
  assert.ok(phrases[0].includes("party/witness connection"));
});

test("shake and silent reactions never create flags", () => {
  const result = computeCaseFlags(
    baseInput({
      responses: [
        { jurorNumber: 1, questionId: 1, responseText: "[Shake] Head shake" },
        { jurorNumber: 2, questionId: 1, responseText: "[Silent] No response" },
      ],
    }),
  );
  assert.equal(result.flags.length, 0);
});

test("court-dismissed jurors are excluded from flags and rollup", () => {
  const result = computeCaseFlags(
    baseInput({
      responses: [{ jurorNumber: 1, questionId: 1, responseText: "[Hand] Raised hand" }],
      courtDismissed: [1],
    }),
  );
  assert.equal(result.flags.length, 0);
});

test("follow-up answers are classified in their own right (claim revealed → resolved claim flag)", () => {
  const result = computeCaseFlags(
    baseInput({
      responses: [
        {
          jurorNumber: 1,
          questionId: 1,
          responseText: "[Hand] Raised hand",
          followUps: [{ question: "Did you make a claim?", answer: "Yes, we settled with the insurance company." }],
        },
      ],
    }),
  );
  const claim = result.flags.find((f) => f.topic === "injury-claim" && f.jurorNumber === 1);
  assert.ok(claim, "expected an injury-claim flag from the follow-up answer");
  assert.equal(claim!.resolved, true);
});

test("detectConcededOrWeakLiability", () => {
  assert.equal(detectConcededOrWeakLiability(CONCEDED_SUMMARY), true);
  assert.equal(detectConcededOrWeakLiability("Defendant admits fault for the collision."), true);
  assert.equal(detectConcededOrWeakLiability("The only issue is damages."), true);
  assert.equal(detectConcededOrWeakLiability(DISPUTED_SUMMARY), false);
  assert.equal(detectConcededOrWeakLiability(""), false);
});

test("damages-posture flags appear only in conceded/weak-liability cases", () => {
  const responses = [
    {
      jurorNumber: 1,
      questionId: 1,
      responseText: "If the evidence supports it I could award just the medical bills and nothing more.",
    },
  ];
  const conceded = computeCaseFlags(baseInput({ caseSummary: CONCEDED_SUMMARY, responses }));
  const posturized = conceded.flags.filter((f) => f.topic === "damages-posture");
  assert.equal(conceded.posture, "conceded-or-weak-liability");
  assert.equal(posturized.length, 1, "only the juror with no damages answer is flagged");
  assert.equal(posturized[0].jurorNumber, 2);

  const disputed = computeCaseFlags(baseInput({ responses }));
  assert.equal(disputed.flags.filter((f) => f.topic === "damages-posture").length, 0);
});

test("classifyResponseTopics honors response kind", async () => {
  const { classifyResponseTopics } = await import("./jurorFlags");
  const q = WRECK_Q.originalText;
  assert.ok(classifyResponseTopics(q, "[Hand] Raised hand").includes("accident-history"));
  assert.deepEqual(classifyResponseTopics(q, "[Shake] Head shake"), []);
  assert.deepEqual(classifyResponseTopics(q, "No, never."), []);
  assert.ok(classifyResponseTopics(q, "Yes, I was rear-ended last year.").includes("accident-history"));
});

test("classifyTopics: disability and legal-field ties", () => {
  assert.ok(classifyTopics("Have you or a family member ever filed for disability benefits?").includes("disability-filing"));
  assert.ok(classifyTopics("My wife is a paralegal at a law firm downtown.").includes("legal-field-ties"));
  assert.ok(!classifyTopics("I enjoy gardening and reading.").length);
});
