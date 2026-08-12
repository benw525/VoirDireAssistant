// Deterministic Batson statistics — computed in code, not by the LLM.
// (Lewis/Whigham directive: deterministic math in code; the model only writes
// reasoning and scripts from the computed numbers.)

export interface BatsonJurorInput {
  number: number;
  name: string;
  race: string;
  sex: string;
  occupation: string;
  lean: string;
  riskTier: string;
}

export interface GroupStrikeStat {
  group: string;
  panelCount: number;
  struckCount: number;
  /** struckCount / panelCount, rounded to 3 decimals; null when panelCount is 0 */
  strikeRate: number | null;
}

export interface SideStrikeStats {
  totalStrikes: number;
  panelSize: number;
  /** totalStrikes / panelSize, rounded to 3 decimals; null when panel empty */
  overallStrikeRate: number | null;
  byRace: GroupStrikeStat[];
  bySex: GroupStrikeStat[];
}

export interface ComparatorCandidate {
  struckJurorNumber: number;
  seatedJurorNumber: number;
  seatedJurorName: string;
  sharedTraits: string[];
}

export interface BatsonStats {
  yours: SideStrikeStats;
  theirs: SideStrikeStats;
  /** Deterministic candidate pool for Miller-El comparative analysis of YOUR strikes. */
  comparatorCandidates: ComparatorCandidate[];
}

function normalize(value: string): string {
  const v = (value || '').trim();
  return v.length > 0 ? v : 'Unknown';
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function groupStats(
  jurors: BatsonJurorInput[],
  struck: Set<number>,
  key: 'race' | 'sex'
): GroupStrikeStat[] {
  const groups = new Map<string, { panel: number; struck: number }>();
  for (const j of jurors) {
    const g = normalize(j[key]);
    const entry = groups.get(g) || { panel: 0, struck: 0 };
    entry.panel += 1;
    if (struck.has(j.number)) entry.struck += 1;
    groups.set(g, entry);
  }
  return Array.from(groups.entries())
    .map(([group, { panel, struck: s }]) => ({
      group,
      panelCount: panel,
      struckCount: s,
      strikeRate: panel > 0 ? round3(s / panel) : null,
    }))
    .sort((a, b) => a.group.localeCompare(b.group));
}

function sideStats(jurors: BatsonJurorInput[], strikes: number[]): SideStrikeStats {
  const struck = new Set(strikes);
  const panelSize = jurors.length;
  return {
    totalStrikes: jurors.filter(j => struck.has(j.number)).length,
    panelSize,
    overallStrikeRate: panelSize > 0
      ? round3(jurors.filter(j => struck.has(j.number)).length / panelSize)
      : null,
    byRace: groupStats(jurors, struck, 'race'),
    bySex: groupStats(jurors, struck, 'sex'),
  };
}

const OCCUPATION_STOPWORDS = new Set([
  'the', 'and', 'of', 'at', 'in', 'for', 'a', 'an', '', 'na', 'n/a', 'none',
  'unknown', 'not', 'employed', 'unemployed', 'retired', 'self',
]);

function occupationKeywords(occupation: string): Set<string> {
  return new Set(
    (occupation || '')
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter(w => w.length > 2 && !OCCUPATION_STOPWORDS.has(w))
  );
}

/**
 * For each juror struck by "your side", list seated jurors (struck by neither
 * side) sharing record-based traits: risk tier, lean, or occupation keywords.
 * This is a deterministic candidate pool — the analyst model decides which
 * candidates are true Miller-El comparators.
 */
export function findComparatorCandidates(
  jurors: BatsonJurorInput[],
  yourStrikes: number[],
  theirStrikes: number[]
): ComparatorCandidate[] {
  const yours = new Set(yourStrikes);
  const theirs = new Set(theirStrikes);
  const seated = jurors.filter(j => !yours.has(j.number) && !theirs.has(j.number));
  const candidates: ComparatorCandidate[] = [];

  for (const struckJuror of jurors.filter(j => yours.has(j.number))) {
    const struckKeywords = occupationKeywords(struckJuror.occupation);
    for (const seatedJuror of seated) {
      const shared: string[] = [];
      if (
        struckJuror.riskTier && seatedJuror.riskTier &&
        struckJuror.riskTier !== 'unassessed' &&
        struckJuror.riskTier === seatedJuror.riskTier
      ) {
        shared.push(`same risk tier (${struckJuror.riskTier})`);
      }
      if (
        struckJuror.lean && seatedJuror.lean &&
        struckJuror.lean !== 'unknown' &&
        struckJuror.lean === seatedJuror.lean
      ) {
        shared.push(`same lean (${struckJuror.lean})`);
      }
      const seatedKeywords = occupationKeywords(seatedJuror.occupation);
      const sharedWords = Array.from(struckKeywords).filter(w => seatedKeywords.has(w));
      if (sharedWords.length > 0) {
        shared.push(`occupation overlap (${sharedWords.join(', ')})`);
      }
      if (shared.length > 0) {
        candidates.push({
          struckJurorNumber: struckJuror.number,
          seatedJurorNumber: seatedJuror.number,
          seatedJurorName: seatedJuror.name,
          sharedTraits: shared,
        });
      }
    }
  }
  return candidates;
}

export function computeBatsonStats(
  jurors: BatsonJurorInput[],
  yourStrikes: number[],
  theirStrikes: number[]
): BatsonStats {
  return {
    yours: sideStats(jurors, yourStrikes),
    theirs: sideStats(jurors, theirStrikes),
    comparatorCandidates: findComparatorCandidates(jurors, yourStrikes, theirStrikes),
  };
}

function formatPct(rate: number | null): string {
  return rate === null ? 'n/a' : `${Math.round(rate * 100)}%`;
}

function formatSide(label: string, s: SideStrikeStats): string {
  const lines: string[] = [];
  lines.push(`${label}: ${s.totalStrikes} strike(s) of ${s.panelSize} panel members (overall rate ${formatPct(s.overallStrikeRate)})`);
  lines.push(`  By race:`);
  for (const g of s.byRace) {
    lines.push(`    ${g.group}: struck ${g.struckCount} of ${g.panelCount} (${formatPct(g.strikeRate)})`);
  }
  lines.push(`  By sex:`);
  for (const g of s.bySex) {
    lines.push(`    ${g.group}: struck ${g.struckCount} of ${g.panelCount} (${formatPct(g.strikeRate)})`);
  }
  return lines.join('\n');
}

/**
 * Render the stats as an authoritative prompt block. The model is instructed
 * to use these figures verbatim instead of recomputing them.
 */
export function formatBatsonStatsBlock(stats: BatsonStats): string {
  const lines: string[] = [];
  lines.push('COMPUTED STRIKE STATISTICS (authoritative — computed deterministically in code; use these numbers verbatim, do NOT recount or recalculate):');
  lines.push(formatSide('YOUR SIDE', stats.yours));
  lines.push(formatSide('OPPOSING SIDE', stats.theirs));
  if (stats.comparatorCandidates.length > 0) {
    lines.push('SEATED COMPARATOR CANDIDATES for your strikes (deterministic trait matches; select the true comparators and supply the distinguishing record facts):');
    for (const c of stats.comparatorCandidates) {
      lines.push(`  Struck #${c.struckJurorNumber} vs seated #${c.seatedJurorNumber} ${c.seatedJurorName}: ${c.sharedTraits.join('; ')}`);
    }
  } else {
    lines.push('SEATED COMPARATOR CANDIDATES: none found by deterministic trait matching (risk tier / lean / occupation). If the record suggests other similarly-situated seated jurors, identify them explicitly.');
  }
  return lines.join('\n');
}
