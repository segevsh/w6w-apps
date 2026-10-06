import type { OutputField, Param } from "@w6w/types";
import { toList } from "./client.ts";

/** Shared `Param` fragments. Every name and bound is copied from Slite's reference. */

export const cursorParam: Param = {
  key: "cursor",
  label: "Cursor",
  type: "string",
  hint: "Paste the `nextCursor` value from the previous page's output to fetch the next page.",
};

export const REVIEW_STATES = [
  "Verified",
  "Outdated",
  "VerificationRequested",
  "VerificationExpired",
];

export const reviewStateOptions = REVIEW_STATES.map((s) => ({ value: s, label: s }));

export const cursorPageOutput = (listKey: string, label: string): OutputField[] => [
  { key: listKey, type: "array", label },
  { key: "total", type: "number", label: "Total matching records" },
  { key: "hasNextPage", type: "boolean", label: "Whether another page exists" },
  { key: "nextCursor", type: "string", label: "Cursor for the next page, or null" },
];

export const noteOutput: OutputField[] = [
  { key: "id", type: "string", label: "Note id" },
  { key: "title", type: "string", label: "Title" },
  { key: "url", type: "string", label: "URL of the note" },
  { key: "parentNoteId", type: "string", label: "Parent note id, or null" },
  {
    key: "reviewState",
    type: "string",
    label: "Verified, Outdated, VerificationRequested or VerificationExpired",
  },
  { key: "owner", type: "object", label: "Owner ({userId} or {groupId})" },
  { key: "createdAt", type: "string", label: "Created at" },
  { key: "updatedAt", type: "string", label: "Updated at" },
  { key: "lastEditedAt", type: "string", label: "Last edited at" },
  { key: "archivedAt", type: "string", label: "Archived at, or null" },
];

export const noteIdParam: Param = {
  key: "noteId",
  label: "Note ID",
  type: "string",
  required: true,
  hint: "The note's id — the segment after `/p/` in its URL, or the `id` of any note result.",
};

/** Path-segment guard: an id must be present and is URL-encoded. */
export function seg(value: string | undefined, label: string): string {
  const v = (value ?? "").trim();
  if (!v) throw new Error(`${label} is required`);
  return encodeURIComponent(v);
}

/** The four knowledge-management lists share `first`, `cursor`, `ownerIdList`, `channelIdList`. */
export const kmFirstParam: Param = {
  key: "first",
  label: "Page size",
  type: "number",
  default: 20,
  validation: { min: 1, max: 50, integer: true },
  hint: "Notes per page. Slite's default is 20 and the documented maximum is 50.",
};

export const kmOwnerParam: Param = {
  key: "ownerIdList",
  label: "Owner IDs",
  type: "string",
  hint: "Comma-separated user or group ids; notes owned by ANY of them are returned.",
};

export const kmChannelParam: Param = {
  key: "channelIdList",
  label: "Channel IDs",
  type: "string",
  hint: "Comma-separated channel ids to restrict to.",
};

export const kmReviewStateParam: Param = {
  key: "reviewStateList",
  label: "Review states",
  type: "multiselect",
  options: reviewStateOptions,
  hint: "Only notes in one of these review states.",
};

export const kmSinceParam: Param = {
  key: "sinceDaysAgo",
  label: "Trailing days",
  type: "number",
  validation: { min: 0 },
  hint: "Number of trailing days to consider.",
};

export interface KmInput {
  reviewStateList?: string[] | string;
  ownerIdList?: string[] | string;
  channelIdList?: string[] | string;
  sinceDaysAgo?: number;
  first?: number;
  cursor?: string;
}

export function kmQuery(
  input: KmInput,
  full: boolean,
): Record<string, string | number | string[] | undefined> {
  return {
    reviewStateList: full ? toList(input.reviewStateList) : undefined,
    ownerIdList: toList(input.ownerIdList),
    channelIdList: toList(input.channelIdList),
    sinceDaysAgo: full ? input.sinceDaysAgo : undefined,
    first: input.first,
    cursor: input.cursor,
  };
}

/** `top` / `bottom` pass through; a numeric string becomes the explicit position number. */
export function listPosition(v: string | number | undefined): string | number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "number") return v;
  const s = v.trim();
  if (s === "top" || s === "bottom") return s;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("listPosition must be top, bottom or a positive number");
  }
  return n;
}

/** Comma-separated (or already-listed) collection attributes; blanks inside are kept. */
export function attributeList(v: string[] | string | undefined): string[] | undefined {
  if (Array.isArray(v)) return v.length ? v : undefined;
  return v ? v.split(",").map((s) => s.trim()) : undefined;
}
