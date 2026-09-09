export type Domain =
  | "All"
  | "TPFI"
  | "DeeperRSC"
  | "Myers"
  | "ALO"
  | "KB"
  | "SRF";

export type PillKind = "corp" | "tpfi" | "alo" | "rest";

export type ApprovalStatus = "pending" | "approved" | "held";

export interface AgendaEvent {
  title: string;
  meta: string;
  domain?: Domain;
  highlight?: "alo";
}

export interface AgendaDay {
  label: string;
  dateKey: string;
  isToday?: boolean;
  countdown?: boolean;
  events: AgendaEvent[];
}

export interface InboxItem {
  domain: Domain;
  title: string;
  meta: string;
}

export interface ApprovalItem {
  id: string;
  title: string;
  meta: string;
  domain: Domain;
  status?: ApprovalStatus;
}

export interface CalendarPill {
  label: string;
  kind: PillKind;
}

export interface CalendarDay {
  day: number;
  outOfMonth?: boolean;
  isToday?: boolean;
  pills: CalendarPill[];
  dots: PillKind[];
}

export const HARD_RULES = [
  {
    title: "Mon–Fri 9–5 protected",
    detail:
      "Corporate focus block is protected. Role / board / chapter work is scheduled after 5 unless Alisa overrides.",
  },
  {
    title: "Meeting buffers",
    detail:
      "Roxy inserts lead-up and recovery buffers around high-stakes events (e.g. ALO Chapter).",
  },
  {
    title: "ALO — 2nd Saturday",
    detail:
      "ALO Chapter stands on the 2nd Saturday each month (e.g. 11:00 AM ET).",
  },
  {
    title: "Approval gate",
    detail:
      "Outbound email drafts never send until Alisa taps Approve. Approve marks approved in-app only — it does not send email in this MVP.",
  },
  {
    title: "Sunday recap — standing approval",
    detail:
      "Weekly Sunday recap to Alisa is pre-approved as a standing exception to the outbound approval gate.",
  },
] as const;
