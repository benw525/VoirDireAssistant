import type { CaseInfo, Juror, FlagRollupResult, JurorTopicFlag } from '../../types';

/**
 * Pure builder for the assistant's per-message context block.
 * Kept free of React so it can be regression-tested server-side
 * (see server/chatContext.test.ts).
 */

/** Cap on full per-juror summary lines to bound prompt size. Flag data is NEVER capped. */
export const PANEL_SUMMARY_CAP = 30;

export function buildContextBlock(
  caseInfo?: CaseInfo | null,
  jurors?: Juror[],
  currentPhase?: number,
  flagData?: FlagRollupResult | null,
  flagError?: string | null,
  moduleStatus?: { causeRun: boolean; batsonRun: boolean },
): string {
  const parts: string[] = [];

  if (currentPhase !== undefined && currentPhase !== null) {
    const phaseNames: Record<number, string> = {
      0: 'Welcome Screen',
      1: 'Case Setup',
      2: 'Voir Dire Questions',
      3: 'Strike List / Juror Entry',
      4: 'Recording Responses',
      5: 'Review Risks',
      6: 'Strikes & Challenges',
    };
    parts.push(`The user is currently on: ${phaseNames[currentPhase] || 'Unknown'} (Phase ${currentPhase})`);
  }

  if (caseInfo) {
    parts.push(`Active Case: "${caseInfo.name}"`);
    parts.push(`Area of Law: ${caseInfo.areaOfLaw}`);
    parts.push(`Side: ${caseInfo.side}`);
    if (caseInfo.summary) parts.push(`Case Summary: ${caseInfo.summary}`);
    if (caseInfo.favorableTraits?.length) parts.push(`Favorable juror traits: ${caseInfo.favorableTraits.join(', ')}`);
    if (caseInfo.riskTraits?.length) parts.push(`Risk juror traits: ${caseInfo.riskTraits.join(', ')}`);
  }

  // DATA QUALITY (INTEGRITY FIRST): surface failed/stale/default analyses and
  // un-run modules so the assistant discloses them before relying on the data.
  if (jurors && jurors.length > 0) {
    const failed = jurors.filter(j => j.analysisStatus === 'failed');
    const stale = jurors.filter(j => j.analysisStatus === 'stale');
    const unanalyzed = jurors.filter(j => !j.analysisStatus || j.analysisStatus === 'none');
    const provisional = jurors.filter(j => j.analysisProvisional);
    const dq: string[] = [];
    if (failed.length) dq.push(`FAILED AI analyses (no valid output; displayed values are NOT trustworthy): ${failed.map(j => `#${j.number} ${j.name}`).join(', ')}`);
    if (stale.length) dq.push(`STALE analyses (new answers recorded since last analysis): ${stale.map(j => `#${j.number}`).join(', ')}`);
    if (unanalyzed.length) dq.push(`Never analyzed (assessments are defaults, not AI or attorney judgments): ${unanalyzed.map(j => `#${j.number}`).join(', ')}`);
    if (provisional.length) dq.push(`PROVISIONAL scores (record too thin for a settled score): ${provisional.map(j => `#${j.number}`).join(', ')}`);
    if (moduleStatus && currentPhase !== undefined && currentPhase >= 5) {
      if (!moduleStatus.causeRun) dq.push('Strike-for-cause module has NOT been run.');
      if (!moduleStatus.batsonRun) dq.push('Batson analysis has NOT been run and no executed strikes are recorded with it.');
    }
    if (flagError) dq.push(`Unresolved-flag rollup could not be loaded (${flagError}); flag data below may be missing.`);
    if (dq.length) {
      parts.push('\nDATA QUALITY PROBLEMS (disclose per INTEGRITY FIRST before answering anything that depends on this data):');
      dq.forEach(d => parts.push(`- ${d}`));
    }
  }

  if (flagData) {
    parts.push(`\nUNRESOLVED FLAG ROLLUP (ranked by case-dispositive value): ${flagData.summaryLine || 'none — every case-critical raise has a recorded answer'}`);
  }

  if (jurors && jurors.length > 0) {
    parts.push(`\nJuror Panel (${jurors.length} jurors):`);
    const leanCounts = { favorable: 0, neutral: 0, unfavorable: 0, unknown: 0 };
    const riskCounts = { low: 0, medium: 0, high: 0, unassessed: 0 };
    jurors.forEach(j => {
      leanCounts[j.lean] = (leanCounts[j.lean] || 0) + 1;
      riskCounts[j.riskTier] = (riskCounts[j.riskTier] || 0) + 1;
    });
    parts.push(`Lean breakdown: ${leanCounts.favorable} favorable, ${leanCounts.neutral} neutral, ${leanCounts.unfavorable} unfavorable, ${leanCounts.unknown} unknown`);
    parts.push(`Risk breakdown: ${riskCounts.low} low, ${riskCounts.medium} medium, ${riskCounts.high} high, ${riskCounts.unassessed} unassessed`);

    const flagsByJuror = new Map<number, JurorTopicFlag[]>();
    (flagData?.flags ?? []).forEach(f => {
      const arr = flagsByJuror.get(f.jurorNumber) ?? [];
      arr.push(f);
      flagsByJuror.set(f.jurorNumber, arr);
    });

    const flagLine = (jf: JurorTopicFlag[]): string => {
      const flagStr = jf.length
        ? ` | flags: ${jf.map(f => `${f.label}${f.resolved ? ' (resolved)' : ' UNRESOLVED'}`).join('; ')}`
        : '';
      const keyRaise = jf.find(f => !f.resolved && f.sources.length > 0);
      const raiseStr = keyRaise
        ? ` | key raise: ${keyRaise.sources[0].kind} on "${keyRaise.sources[0].question}"`
        : '';
      return `${flagStr}${raiseStr}`;
    };

    const jurorSummaries = jurors.slice(0, PANEL_SUMMARY_CAP).map(j => {
      const jf = flagsByJuror.get(j.number) ?? [];
      return `#${j.number} ${j.name} | ${j.occupation} | ${j.sex}/${j.race} | lean:${j.lean} risk:${j.riskTier} | analysis:${j.analysisStatus || 'none'}${j.analysisProvisional ? '(provisional)' : ''}${flagLine(jf)}${j.notes ? ` | notes: ${j.notes.slice(0, 80)}` : ''}`;
    });
    parts.push(jurorSummaries.join('\n'));

    // Flagged jurors must NEVER disappear from context because of the summary
    // cap: on a 36-juror panel, a recorded-history question about juror #34
    // must be answerable. Every flagged juror beyond the cap gets a flag-only
    // line with its unresolved source question.
    if (jurors.length > PANEL_SUMMARY_CAP) {
      const overflow = jurors
        .slice(PANEL_SUMMARY_CAP)
        .filter(j => (flagsByJuror.get(j.number) ?? []).length > 0);
      if (overflow.length) {
        parts.push(`\nFlagged jurors beyond the ${PANEL_SUMMARY_CAP}-juror summary above (flag data covers ALL ${jurors.length} jurors):`);
        overflow.forEach(j => {
          parts.push(`#${j.number} ${j.name}${flagLine(flagsByJuror.get(j.number) ?? [])}`);
        });
      }
    }

    parts.push('\nAnswer juror-history questions from the recorded flags/raises above, not from lean labels.');
  }

  return parts.length > 0 ? parts.join('\n') : '';
}
