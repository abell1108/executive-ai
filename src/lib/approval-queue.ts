/**
 * localStorage store for in-app Approval Queue items (MVP outbound drafts).
 * Approve/Hold are client-only — nothing sends email.
 */

import type { ApprovalItem, ApprovalStatus, Domain } from "@/lib/types";

export const APPROVAL_QUEUE_STORAGE_KEY = "ea-approval-queue-v1";
export const APPROVAL_QUEUE_CHANGE_EVENT = "ea-approval-queue-change";

export type StoredApprovalItem = ApprovalItem & {
  status: ApprovalStatus;
  body?: string;
  to?: string;
  subject?: string;
  from?: string;
  triageId?: string;
  /** Original Hey Roxy request excerpt for Approval Queue UI. */
  requestExcerpt?: string;
  updatedAt: string;
};

export type ApprovalQueueMap = Record<string, StoredApprovalItem>;

/** Stable empty snapshot for useSyncExternalStore. */
export const EMPTY_APPROVAL_QUEUE_MAP: ApprovalQueueMap = Object.freeze(
  {},
) as ApprovalQueueMap;

export const EMPTY_APPROVAL_QUEUE_LIST: StoredApprovalItem[] = [];

const DOMAINS: Domain[] = [
  "All",
  "TPFI",
  "DeeperRSC",
  "Myers",
  "ALO",
  "KB",
  "SRF",
];

const STATUSES: ApprovalStatus[] = ["pending", "approved", "held"];

let cachedRaw: string | null = null;
let cachedMap: ApprovalQueueMap = EMPTY_APPROVAL_QUEUE_MAP;
let cachedList: StoredApprovalItem[] = EMPTY_APPROVAL_QUEUE_LIST;

function isDomain(value: unknown): value is Domain {
  return typeof value === "string" && (DOMAINS as string[]).includes(value);
}

function isStatus(value: unknown): value is ApprovalStatus {
  return typeof value === "string" && (STATUSES as string[]).includes(value);
}

function optionalString(
  value: unknown,
): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isStoredItem(value: unknown): value is StoredApprovalItem {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  if (typeof o.id !== "string" || !o.id) return false;
  if (typeof o.title !== "string") return false;
  if (typeof o.meta !== "string") return false;
  if (!isDomain(o.domain) || o.domain === "All") return false;
  if (!isStatus(o.status)) return false;
  if (!optionalString(o.body)) return false;
  if (!optionalString(o.to)) return false;
  if (!optionalString(o.subject)) return false;
  if (!optionalString(o.from)) return false;
  if (!optionalString(o.triageId)) return false;
  if (!optionalString(o.requestExcerpt)) return false;
  if (typeof o.updatedAt !== "string") return false;
  return true;
}

function pickOptionalString(
  value: unknown,
): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseQueueMap(raw: string): ApprovalQueueMap {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object") return EMPTY_APPROVAL_QUEUE_MAP;
  const out: ApprovalQueueMap = {};
  for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!id || !isStoredItem(value)) continue;
    const body = pickOptionalString(value.body);
    const to = pickOptionalString(value.to);
    const subject = pickOptionalString(value.subject);
    const from = pickOptionalString(value.from);
    const triageId = pickOptionalString(value.triageId);
    const requestExcerpt = pickOptionalString(value.requestExcerpt);
    out[id] = {
      id: value.id,
      title: value.title,
      meta: value.meta,
      domain: value.domain,
      status: value.status,
      ...(body !== undefined ? { body } : {}),
      ...(to !== undefined ? { to } : {}),
      ...(subject !== undefined ? { subject } : {}),
      ...(from !== undefined ? { from } : {}),
      ...(triageId !== undefined ? { triageId } : {}),
      ...(requestExcerpt !== undefined ? { requestExcerpt } : {}),
      updatedAt: value.updatedAt,
    };
  }
  return Object.keys(out).length === 0 ? EMPTY_APPROVAL_QUEUE_MAP : out;
}

function listFromMap(map: ApprovalQueueMap): StoredApprovalItem[] {
  const list = Object.values(map).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  return list.length === 0 ? EMPTY_APPROVAL_QUEUE_LIST : list;
}

export function readApprovalQueueMap(): ApprovalQueueMap {
  if (typeof window === "undefined") return EMPTY_APPROVAL_QUEUE_MAP;
  try {
    const raw = window.localStorage.getItem(APPROVAL_QUEUE_STORAGE_KEY);
    if (!raw) {
      cachedRaw = null;
      cachedMap = EMPTY_APPROVAL_QUEUE_MAP;
      cachedList = EMPTY_APPROVAL_QUEUE_LIST;
      return EMPTY_APPROVAL_QUEUE_MAP;
    }
    if (raw === cachedRaw) return cachedMap;
    const map = parseQueueMap(raw);
    cachedRaw = raw;
    cachedMap = map;
    cachedList = listFromMap(map);
    return map;
  } catch {
    cachedRaw = null;
    cachedMap = EMPTY_APPROVAL_QUEUE_MAP;
    cachedList = EMPTY_APPROVAL_QUEUE_LIST;
    return EMPTY_APPROVAL_QUEUE_MAP;
  }
}

/** Snapshot for useSyncExternalStore — stable list sorted newest-first. */
export function getApprovalQueueSnapshot(): StoredApprovalItem[] {
  readApprovalQueueMap();
  return cachedList;
}

export function getApprovalQueueServerSnapshot(): StoredApprovalItem[] {
  return EMPTY_APPROVAL_QUEUE_LIST;
}

function writeApprovalQueueMap(map: ApprovalQueueMap): void {
  if (typeof window === "undefined") return;
  try {
    const stable =
      Object.keys(map).length === 0 ? EMPTY_APPROVAL_QUEUE_MAP : map;
    const raw = JSON.stringify(stable);
    cachedRaw = raw;
    cachedMap = stable;
    cachedList = listFromMap(stable);
    window.localStorage.setItem(APPROVAL_QUEUE_STORAGE_KEY, raw);
    window.dispatchEvent(new Event(APPROVAL_QUEUE_CHANGE_EVENT));
  } catch {
    // Quota / private mode — ignore.
  }
}

export function subscribeApprovalQueue(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener(APPROVAL_QUEUE_CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(APPROVAL_QUEUE_CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export type UpsertApprovalInput = {
  id: string;
  title: string;
  meta: string;
  domain: Exclude<Domain, "All">;
  status?: ApprovalStatus;
  body?: string;
  to?: string;
  subject?: string;
  from?: string;
  triageId?: string;
  requestExcerpt?: string;
};

function applyOptionalField(
  next: StoredApprovalItem,
  key: "body" | "to" | "subject" | "from" | "triageId" | "requestExcerpt",
  incoming: string | undefined,
  prev: string | undefined,
): void {
  const value = incoming !== undefined ? incoming : prev;
  if (typeof value === "string" && (key === "triageId" ? Boolean(value) : value.trim() !== "")) {
    next[key] = value;
  }
}

export function upsertApprovalItem(input: UpsertApprovalInput): void {
  if (!input.id) return;
  const map = { ...readApprovalQueueMap() };
  const prev = map[input.id];
  const next: StoredApprovalItem = {
    id: input.id,
    title: input.title,
    meta: input.meta,
    domain: input.domain,
    status: input.status ?? prev?.status ?? "pending",
    updatedAt: new Date().toISOString(),
  };
  applyOptionalField(next, "body", input.body, prev?.body);
  applyOptionalField(next, "to", input.to, prev?.to);
  applyOptionalField(next, "subject", input.subject, prev?.subject);
  applyOptionalField(next, "from", input.from, prev?.from);
  applyOptionalField(next, "triageId", input.triageId, prev?.triageId);
  applyOptionalField(next, "requestExcerpt", input.requestExcerpt, prev?.requestExcerpt);
  map[input.id] = next;
  writeApprovalQueueMap(map);
}

/** Patch draft fields on an existing queue item (local edit in Approvals panel). */
export function updateApprovalDraft(
  id: string | undefined | null,
  patch: { to?: string; subject?: string; body?: string; title?: string; meta?: string },
): void {
  if (!id) return;
  const map = { ...readApprovalQueueMap() };
  const prev = map[id];
  if (!prev) return;
  const subject =
    patch.subject !== undefined ? patch.subject : prev.subject ?? prev.title;
  const next: StoredApprovalItem = {
    ...prev,
    ...(patch.to !== undefined ? { to: patch.to } : {}),
    ...(patch.subject !== undefined ? { subject: patch.subject } : {}),
    ...(patch.body !== undefined ? { body: patch.body } : {}),
    ...(patch.title !== undefined
      ? { title: patch.title }
      : patch.subject !== undefined
        ? { title: patch.subject }
        : {}),
    ...(patch.meta !== undefined ? { meta: patch.meta } : {}),
    updatedAt: new Date().toISOString(),
  };
  // Keep subject in sync with title display when subject was patched.
  if (patch.subject !== undefined) {
    next.subject = subject;
    if (patch.title === undefined) next.title = subject;
  }
  map[id] = next;
  writeApprovalQueueMap(map);
}

export function removeApprovalItem(id: string | undefined | null): void {
  if (!id) return;
  const map = { ...readApprovalQueueMap() };
  if (!(id in map)) return;
  delete map[id];
  writeApprovalQueueMap(map);
}

export function setApprovalStatus(
  id: string | undefined | null,
  status: ApprovalStatus,
): void {
  if (!id) return;
  const map = { ...readApprovalQueueMap() };
  const prev = map[id];
  if (!prev) return;
  map[id] = {
    ...prev,
    status,
    updatedAt: new Date().toISOString(),
  };
  writeApprovalQueueMap(map);
}

/** Count of items with status pending (optionally filtered by role). */
export function countPendingApprovals(
  items: StoredApprovalItem[],
  domain?: Domain,
): number {
  return items.filter(
    (item) =>
      item.status === "pending" &&
      (domain == null || domain === "All" || item.domain === domain),
  ).length;
}

/** Stable approval id derived from a triage/Gmail message id. */
export function approvalIdFromTriage(triageId: string): string {
  return `triage:${triageId}`;
}
