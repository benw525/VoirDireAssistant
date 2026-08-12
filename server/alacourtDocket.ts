/**
 * AlaCourt docket search — integration point (gated, not yet active).
 *
 * "Has this juror sued or been sued" is the single most predictive enrichment
 * datum for jury selection (claimant history was a top-3 signal in both
 * ground-truth trials), and it is structurally UNAVAILABLE to web search:
 * Alabama civil/criminal dockets live in AlaCourt (alacourt.com), a paid
 * subscription service, not on the crawlable web.
 *
 * Contract with the rest of the pipeline:
 *  - The web-search categories NEVER claim to answer litigation history.
 *  - The enrichment "docket" category reports exactly one of:
 *      - `not_configured`: no AlaCourt credentials supplied (current state)
 *      - `pending_implementation`: credentials present but the fetcher below
 *        has not been implemented/validated against a live account yet
 *  - The UI shows docket history as unavailable rather than silently absent.
 *
 * To activate: the user supplies ALACOURT_USERNAME / ALACOURT_PASSWORD
 * (Replit Secrets), then `searchDocketsByParty` is implemented against the
 * AlaCourt party-search flow (login -> party name search per county, filtered
 * by DOB where offered). Results should map to DocketCase below; a DOB match
 * justifies "confirmed" confidence, name-only hits are "possible".
 */

export interface DocketCase {
  caseNumber: string;
  court: string;
  role: "plaintiff" | "defendant" | "other";
  caseType: string;
  filedDate: string;
  status: string;
  disposition?: string;
}

export interface DocketSearchParams {
  /** Name variants, most likely first (from enrichmentIdentity). */
  nameVariants: string[];
  /** MM/DD/YYYY where known. */
  birthDate?: string | null;
  /** County hint parsed from the juror's cityStateZip. */
  county?: string | null;
}

export type DocketCapability =
  | { available: true }
  | { available: false; reason: "not_configured" | "pending_implementation"; note: string };

export function getDocketCapability(): DocketCapability {
  const hasCredentials = Boolean(process.env.ALACOURT_USERNAME && process.env.ALACOURT_PASSWORD);
  if (!hasCredentials) {
    return {
      available: false,
      reason: "not_configured",
      note: "AlaCourt not connected — court docket / litigation history is not searched. AlaCourt is a paid subscription; add ALACOURT_USERNAME and ALACOURT_PASSWORD to enable.",
    };
  }
  // Credentials present but the live integration has not been built/validated.
  // This branch exists so supplying credentials never silently pretends to work.
  return {
    available: false,
    reason: "pending_implementation",
    note: "AlaCourt credentials detected, but the docket search integration is not yet implemented. Docket history remains unsearched.",
  };
}

export class DocketUnavailableError extends Error {
  readonly reason: string;
  constructor(capability: Exclude<DocketCapability, { available: true }>) {
    super(capability.note);
    this.name = "DocketUnavailableError";
    this.reason = capability.reason;
  }
}

/**
 * Party search against AlaCourt. Currently always throws
 * DocketUnavailableError — see module header for the activation path.
 */
export async function searchDocketsByParty(_params: DocketSearchParams): Promise<DocketCase[]> {
  const capability = getDocketCapability();
  if (!capability.available) throw new DocketUnavailableError(capability);
  throw new Error("unreachable: getDocketCapability() never returns available=true yet");
}
