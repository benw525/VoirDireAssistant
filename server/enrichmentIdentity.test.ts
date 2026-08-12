import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cleanOcrArtifacts,
  repairOcrDigits,
  isUnusable,
  parseCourtName,
  nameVariants,
  cleanupEmployer,
  buildCleanIdentity,
} from "./enrichmentIdentity";

// ---------------------------------------------------------------------------
// OCR cleanup
// ---------------------------------------------------------------------------

test("cleanOcrArtifacts deletes garbage symbols in-token and strips (partial)", () => {
  assert.equal(cleanOcrArtifacts("SM~ITH §JOHN!!"), "SMITH JOHN");
  assert.equal(cleanOcrArtifacts("SHAWN (partial)"), "SHAWN");
  assert.equal(cleanOcrArtifacts("  A   B  "), "A B");
});

test("repairOcrDigits fixes digit substitutions only in mostly-alpha tokens", () => {
  assert.equal(repairOcrDigits("SM1TH"), "SMITH");
  assert.equal(repairOcrDigits("0NEAL"), "ONEAL");
  assert.equal(repairOcrDigits("12345"), "12345"); // numeric: untouched
  assert.equal(repairOcrDigits("3RD"), "3RD"); // ordinal: untouched
});

test("isUnusable flags sentinels and letterless noise", () => {
  assert.equal(isUnusable("Illegible"), true);
  assert.equal(isUnusable("Unknown"), true);
  assert.equal(isUnusable(""), true);
  assert.equal(isUnusable(undefined), true);
  assert.equal(isUnusable("~~!!"), true);
  assert.equal(isUnusable("Walmart"), false);
});

// ---------------------------------------------------------------------------
// Court-name parsing and variants
// ---------------------------------------------------------------------------

test("parseCourtName handles LAST FIRST MIDDLE and suffixes", () => {
  const p = parseCourtName("SMITH JOHN A JR");
  assert.deepEqual(p.last, ["SMITH"]);
  assert.equal(p.first, "JOHN");
  assert.deepEqual(p.middles, ["A"]);
  assert.equal(p.suffix?.toLowerCase(), "jr");
});

test("nameVariants: two-token name yields First Last", () => {
  const v = nameVariants("SMITH JOHN");
  assert.deepEqual(v.map((x) => x.name), ["John Smith"]);
});

test("nameVariants: middle dropped first, full second", () => {
  const v = nameVariants("SMITH JOHN ALLEN");
  assert.equal(v[0].name, "John Smith");
  assert.equal(v[0].kind, "primary");
  assert.ok(v.some((x) => x.name === "John Allen Smith" && x.kind === "full"));
});

test("nameVariants: compound surname reordering (directive example)", () => {
  const v = nameVariants("MARTINEZ VANEGAS JOSE CRUZ");
  const names = v.map((x) => x.name);
  assert.ok(names.includes("Jose Cruz Martinez Vanegas"), `missing full compound in ${names}`);
  assert.ok(names.includes("Jose Martinez"), `missing short compound in ${names}`);
});

test("nameVariants: maiden-name pattern for female jurors", () => {
  const v = nameVariants("SMITH MARY JONES", "F");
  assert.ok(v.some((x) => x.kind === "maiden" && x.name === "Mary Jones"));
  // Not generated for male jurors.
  const vm = nameVariants("SMITH GARY JONES", "M");
  assert.ok(!vm.some((x) => x.kind === "maiden"));
});

test("nameVariants: bounded at 5 and deduped", () => {
  const v = nameVariants("MARTINEZ VANEGAS JOSE CRUZ ALLEN", "F");
  assert.ok(v.length <= 5);
  const names = v.map((x) => x.name.toLowerCase());
  assert.equal(new Set(names).size, names.length);
});

test("nameVariants: repairs OCR digits inside names", () => {
  const v = nameVariants("SM1TH JOHN");
  assert.equal(v[0].name, "John Smith");
});

// ---------------------------------------------------------------------------
// Employer cleanup
// ---------------------------------------------------------------------------

test("cleanupEmployer corrects known court-OCR mangles", () => {
  const { employer, notes } = cleanupEmployer("SHEFIFF DEPARTMENT");
  assert.equal(employer, "SHERIFF DEPARTMENT");
  assert.ok(notes.length > 0);
});

test("cleanupEmployer returns null for unusable values", () => {
  assert.equal(cleanupEmployer("Illegible").employer, null);
  assert.equal(cleanupEmployer("Unknown").employer, null);
  assert.equal(cleanupEmployer(undefined).employer, null);
});

test("cleanupEmployer leaves clean employers alone", () => {
  assert.equal(cleanupEmployer("Baptist Medical Center").employer, "Baptist Medical Center");
});

// ---------------------------------------------------------------------------
// Full identity build
// ---------------------------------------------------------------------------

test("buildCleanIdentity: sentinel fields become null, location prefers cityStateZip", () => {
  const id = buildCleanIdentity({
    name: "WHIGHAM LAUREN",
    sex: "F",
    occupation: "Illegible",
    employer: "Unknown",
    cityStateZip: "Birmingham, AL 35203",
    address: "123 Main St",
  });
  assert.equal(id.occupation, null);
  assert.equal(id.employer, null);
  assert.equal(id.location, "Birmingham, AL 35203");
  assert.equal(id.streetAddress, "123 Main St");
  assert.equal(id.displayName, "Lauren Whigham");
  assert.ok(id.variants.length >= 1);

  const noAddress = buildCleanIdentity({ name: "SMITH JOHN", address: "Illegible" });
  assert.equal(noAddress.streetAddress, null);
});
