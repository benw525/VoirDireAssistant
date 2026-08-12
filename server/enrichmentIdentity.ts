/**
 * Pre-search identity cleanup for juror enrichment.
 *
 * Strike-list names/employers arrive as court-formatted OCR output
 * ("LASTNAME FIRSTNAME MIDDLE", garbled characters, misspelled employers).
 * Exact-match searching on that noise kills recall, so before any query we:
 *  - strip OCR artifacts and repair in-token digit/letter substitutions
 *  - drop unusable sentinel values ("Illegible", "Unknown")
 *  - normalize employers with a small correction/expansion map
 *  - generate a bounded set of name variants (middle-drop, compound-surname
 *    reorder, maiden-name pattern) so common real-world forms are searchable
 *
 * Everything here is pure and deterministic — no network, no LLM.
 */

const SENTINELS = new Set(["", "illegible", "unknown", "n/a", "na", "none", "not provided"]);

/** Suffix tokens that are part of a name but never a searchable surname. */
const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

/**
 * OCR digit->letter repairs, applied only inside mostly-alphabetic tokens
 * (e.g. "SM1TH" -> "SMITH"). Conservative on purpose: tokens that are mostly
 * digits (phone fragments, zip codes) are left alone.
 */
const OCR_DIGIT_MAP: Record<string, string> = { "0": "O", "1": "I", "3": "E", "5": "S", "8": "B" };

/**
 * Known court-OCR employer mangles and safe expansions, grown from observed
 * strike lists (e.g. Whigham panel: "SHEFIFF DEPARTMENT"). Keys are matched
 * as whole words, case-insensitively.
 */
const EMPLOYER_CORRECTIONS: Record<string, string> = {
  SHEFIFF: "SHERIFF",
  SHERRIF: "SHERIFF",
  SHERRIFF: "SHERIFF",
  DEPT: "DEPARTMENT",
  DEPTARTMENT: "DEPARTMENT",
  HOSP: "HOSPITAL",
  MFG: "MANUFACTURING",
  ELEM: "ELEMENTARY",
  BD: "BOARD",
  ED: "EDUCATION",
};

export interface NameVariant {
  name: string;
  kind: "primary" | "full" | "compound_surname" | "maiden" | "no_initial";
}

export interface CleanIdentity {
  rawName: string;
  /** Best-guess "First Last" for logging and query anchoring. */
  displayName: string;
  /** Bounded (<=5), deduped, ordered most-likely-first. */
  variants: NameVariant[];
  /** Cleaned employer, or null when the field is unusable. */
  employer: string | null;
  occupation: string | null;
  location: string | null;
  /** Cleaned street address (juror.address), or null when unusable. */
  streetAddress: string | null;
  /** Human-readable audit of what cleanup changed (stored in rawRequest). */
  cleanupNotes: string[];
}

/** Strip OCR garbage characters, "(partial)" markers, collapse whitespace. */
export function cleanOcrArtifacts(input: string): string {
  return input
    .replace(/\(partial\)/gi, " ")
    // Garbage symbols usually REPLACE letters mid-token ("SM~ITH"), so delete
    // them rather than splitting the token with a space.
    .replace(/[~§¥¢©®†‡|_*#^{}\[\]<>\\]/g, "")
    .replace(/[!?]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Repair digits embedded in mostly-alphabetic tokens (OCR substitutions). */
export function repairOcrDigits(token: string): string {
  if (/^\d+(st|nd|rd|th)$/i.test(token)) return token; // ordinals: "3RD" street
  const letters = (token.match(/[A-Za-z]/g) || []).length;
  const digits = (token.match(/[0-9]/g) || []).length;
  if (digits === 0 || letters < 2 || digits > letters) return token;
  return token.replace(/[0-9]/g, (d) => OCR_DIGIT_MAP[d] ?? d);
}

/** True when a field value carries no usable content. */
export function isUnusable(value: string | null | undefined): boolean {
  if (!value) return true;
  const cleaned = cleanOcrArtifacts(value).toLowerCase();
  if (SENTINELS.has(cleaned)) return true;
  // A field with no alphabetic content at all is noise.
  return !/[a-z]/i.test(cleaned);
}

function titleCaseToken(token: string): string {
  if (token.length <= 1) return token.toUpperCase();
  const lower = token.toLowerCase();
  if (SUFFIXES.has(lower)) {
    return lower === "jr" || lower === "sr"
      ? lower.charAt(0).toUpperCase() + lower.slice(1) + "."
      : token.toUpperCase();
  }
  // Handle O'Brien / hyphenated compounds per segment.
  return lower
    .split(/([-'])/)
    .map((seg) => (seg === "-" || seg === "'" ? seg : seg.charAt(0).toUpperCase() + seg.slice(1)))
    .join("");
}

function titleCaseName(tokens: string[]): string {
  return tokens.map(titleCaseToken).join(" ");
}

interface ParsedCourtName {
  /** Surname tokens (court lists print surname first). */
  last: string[];
  first: string | null;
  middles: string[];
  suffix: string | null;
}

/**
 * Parse court strike-list order: "LASTNAME FIRSTNAME MIDDLE [SUFFIX]".
 * With two tokens we assume "LAST FIRST" (the parser's documented format).
 */
export function parseCourtName(rawName: string): ParsedCourtName {
  const cleaned = cleanOcrArtifacts(rawName)
    .split(/\s+/)
    .map((t) => repairOcrDigits(t).replace(/[.,]+$/g, ""))
    .filter((t) => t.length > 0);

  let suffix: string | null = null;
  if (cleaned.length > 2 && SUFFIXES.has(cleaned[cleaned.length - 1].toLowerCase())) {
    suffix = cleaned.pop()!;
  }

  if (cleaned.length === 0) return { last: [], first: null, middles: [], suffix };
  if (cleaned.length === 1) return { last: cleaned, first: null, middles: [], suffix };

  return {
    last: [cleaned[0]],
    first: cleaned[1],
    middles: cleaned.slice(2),
    suffix,
  };
}

function pushVariant(list: NameVariant[], seen: Set<string>, name: string, kind: NameVariant["kind"]) {
  const key = name.toLowerCase();
  if (!name.trim() || seen.has(key)) return;
  seen.add(key);
  list.push({ name, kind });
}

/**
 * Bounded name-variant generation (max 5). Court order is surname-first, so
 * "MARTINEZ VANEGAS JOSE CRUZ" yields "Jose Martinez", the compound
 * "Jose Cruz Martinez Vanegas", etc. For female jurors with a surname-like
 * middle token we add the maiden-name pattern ("SMITH MARY JONES" ->
 * "Mary Jones").
 */
export function nameVariants(rawName: string, sex?: string): NameVariant[] {
  const parsed = parseCourtName(rawName);
  const variants: NameVariant[] = [];
  const seen = new Set<string>();

  if (!parsed.first) {
    if (parsed.last.length > 0) pushVariant(variants, seen, titleCaseName(parsed.last), "primary");
    return variants;
  }

  const first = parsed.first;
  const last = parsed.last;
  const middles = parsed.middles;

  // 1. Primary: First Last (middle dropped — the form people actually use).
  pushVariant(variants, seen, titleCaseName([first, ...last]), "primary");

  // 2. Full: First Middle(s) Last.
  if (middles.length > 0) {
    pushVariant(variants, seen, titleCaseName([first, ...middles, ...last]), "full");
  }

  // 3. Initials dropped (only when it differs from #1 and #2).
  const nonInitialMiddles = middles.filter((m) => m.replace(/\./g, "").length > 1);
  if (nonInitialMiddles.length > 0 && nonInitialMiddles.length !== middles.length) {
    pushVariant(variants, seen, titleCaseName([first, ...nonInitialMiddles, ...last]), "no_initial");
  }

  // 4. Compound-surname hypothesis: with 2+ middle tokens the court may have
  //    printed a two-token surname first ("MARTINEZ VANEGAS JOSE CRUZ" is
  //    really Jose Cruz MARTINEZ VANEGAS). Emit both the full reordering and
  //    the short "First FirstSurname" form people actually go by.
  if (middles.length >= 1 && last.length === 1) {
    const compoundLast = [last[0], first];
    const compoundFirst = middles[0];
    const compoundMiddles = middles.slice(1);
    if (compoundFirst && compoundFirst.replace(/\./g, "").length > 1) {
      pushVariant(
        variants,
        seen,
        titleCaseName([compoundFirst, ...compoundMiddles, ...compoundLast]),
        "compound_surname"
      );
      pushVariant(variants, seen, titleCaseName([compoundFirst, last[0]]), "compound_surname");
    }
  }

  // 5. Maiden-name pattern for female jurors: a surname-like middle token is
  //    often a maiden name; "First Maiden" is how pre-marriage records read.
  const sexNorm = (sex || "").trim().toUpperCase();
  const lastMiddle = middles[middles.length - 1];
  if (sexNorm === "F" && lastMiddle && lastMiddle.replace(/\./g, "").length > 2) {
    pushVariant(variants, seen, titleCaseName([first, lastMiddle]), "maiden");
  }

  return variants.slice(0, 5);
}

/** Clean an employer string; returns null when unusable. */
export function cleanupEmployer(rawEmployer: string | null | undefined): {
  employer: string | null;
  notes: string[];
} {
  const notes: string[] = [];
  if (isUnusable(rawEmployer)) return { employer: null, notes };

  const cleaned = cleanOcrArtifacts(rawEmployer!);
  const tokens = cleaned.split(/\s+/).map((t) => {
    const repaired = repairOcrDigits(t);
    const correction = EMPLOYER_CORRECTIONS[repaired.toUpperCase().replace(/[.,]+$/g, "")];
    if (correction && correction !== repaired.toUpperCase()) {
      notes.push(`employer token "${t}" -> "${correction}"`);
      return correction;
    }
    if (repaired !== t) notes.push(`employer token "${t}" -> "${repaired}"`);
    return repaired;
  });

  const result = tokens.join(" ").trim();
  return { employer: result || null, notes };
}

/** Full pre-search cleanup for one juror. */
export function buildCleanIdentity(juror: {
  name: string;
  sex?: string;
  occupation?: string;
  employer?: string;
  cityStateZip?: string;
  address?: string;
}): CleanIdentity {
  const notes: string[] = [];

  const rawName = juror.name || "";
  const cleanedNameStr = cleanOcrArtifacts(rawName);
  if (cleanedNameStr !== rawName.trim()) notes.push(`name cleaned: "${rawName}" -> "${cleanedNameStr}"`);

  const variants = nameVariants(rawName, juror.sex);
  const displayName = variants[0]?.name || cleanedNameStr || rawName;

  const { employer, notes: employerNotes } = cleanupEmployer(juror.employer);
  notes.push(...employerNotes);

  const occupation = isUnusable(juror.occupation) ? null : cleanOcrArtifacts(juror.occupation!);

  let location: string | null = null;
  if (!isUnusable(juror.cityStateZip)) location = cleanOcrArtifacts(juror.cityStateZip!);
  else if (!isUnusable(juror.address)) location = cleanOcrArtifacts(juror.address!);

  const streetAddress = isUnusable(juror.address) ? null : cleanOcrArtifacts(juror.address!);

  return { rawName, displayName, variants, employer, occupation, location, streetAddress, cleanupNotes: notes };
}
