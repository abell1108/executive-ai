import type { Domain } from "./types";

/** Domain excluding the UI "All" filter. */
export type LabeledDomain = Exclude<Domain, "All">;

/**
 * Strict domain inference from subject / snippet / event title / from.
 * Returns null when no clear domain keyword matches — never default to TPFI.
 */
export function inferDomain(text: string): LabeledDomain | null {
  const t = text.toLowerCase();

  // ALO — Alpha Kappa Omega / chapter
  if (
    /\balo\s+chapter\b/.test(t) ||
    /\balo\b/.test(t) ||
    t.includes("alpha kappa omega") ||
    t.includes("alpha kappa") ||
    (/\bchapter\b/.test(t) &&
      (/\balo\b/.test(t) || t.includes("alpha kappa")))
  ) {
    return "ALO";
  }

  // DeeperRSC
  if (
    t.includes("deeper rsc") ||
    t.includes("deepersc") ||
    t.includes("deeper-rsc") ||
    /\bdeepersc\b/.test(t) ||
    (/\bdeeper\b/.test(t) && /\brsc\b/.test(t))
  ) {
    return "DeeperRSC";
  }

  // Kingdom Builders (KB) — before generic "kingdom" → TPFI
  if (
    t.includes("kingdom builders") ||
    t.includes("kingdom builder") ||
    /\bkb\b/.test(t) ||
    t.includes("scholarship submission")
  ) {
    return "KB";
  }

  // She Rocks Foundation / SRF / BWSS
  if (
    t.includes("she rocks") ||
    t.includes("she-rocks") ||
    /\bsrf\b/.test(t) ||
    /\bbwss\b/.test(t) ||
    t.includes("black women in sports")
  ) {
    return "SRF";
  }

  // Myers scholarship / family
  if (
    t.includes("myers") ||
    t.includes("myers scholarship") ||
    t.includes("scholarship committee")
  ) {
    return "Myers";
  }

  // TPFI — precise ministry keywords only (no bare "kingdom")
  if (
    /\btpfi\b/.test(t) ||
    t.includes("the purpose foundation") ||
    t.includes("purpose foundation international") ||
    t.includes("tpfi summit") ||
    t.includes("global africa summit") ||
    (/\bsummit\b/.test(t) &&
      (/\btpfi\b/.test(t) || t.includes("africa") || t.includes("purpose")))
  ) {
    return "TPFI";
  }

  return null;
}

/** True when text clearly relates to one of the six domains. */
export function isDomainRelated(text: string): boolean {
  return inferDomain(text) !== null;
}

/** Short UI label for a domain id (internal id stays DeeperRSC). */
export function domainDisplayName(d: string): string {
  if (d === "DeeperRSC") return "DRSC";
  return d;
}

/**
 * Map URL / chip aliases to the canonical Domain id used by filtering.
 * Accepts DRSC (and common typo DeepRSC) → DeeperRSC.
 */
export function canonicalizeDomainParam(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw === "DRSC" || raw === "DeepRSC") return "DeeperRSC";
  return raw;
}
