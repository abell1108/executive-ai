import type { Domain } from "./types";

/** Domain excluding the UI "All" filter. */
export type LabeledDomain = Exclude<Domain, "All">;

/**
 * Best-effort domain inference from subject / snippet / event title.
 * Defaults to TPFI (ministry umbrella) when nothing clear matches.
 */
export function inferDomain(text: string): LabeledDomain {
  const t = text.toLowerCase();

  if (
    /\balo\b/.test(t) ||
    /\bchapter\b/.test(t) ||
    t.includes("alpha kappa")
  ) {
    return "ALO";
  }

  if (
    t.includes("deeper rsc") ||
    t.includes("deepersc") ||
    /\bdeeper\b/.test(t) ||
    /\brsc\b/.test(t)
  ) {
    return "DeeperRSC";
  }

  if (
    t.includes("scholarship submission") ||
    /\bkb\b/.test(t) ||
    t.includes("kingdom builders")
  ) {
    return "KB";
  }

  if (
    t.includes("she rocks") ||
    /\bsrf\b/.test(t) ||
    /\bbwss\b/.test(t) ||
    t.includes("finances")
  ) {
    return "SRF";
  }

  if (
    t.includes("myers") ||
    t.includes("scholarship committee")
  ) {
    return "Myers";
  }

  if (
    /\btpfi\b/.test(t) ||
    t.includes("kingdom") ||
    t.includes("summit")
  ) {
    return "TPFI";
  }

  return "TPFI";
}
