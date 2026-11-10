import type { ActionDefinition, HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import { pollWindow } from "./window.ts";
import leadsList from "../actions/leads-list.ts";
import salesList from "../actions/sales-list.ts";

/** Seconds of look-back before the previous check, so a record that lands late is still seen. */
export const OVERLAP_SECONDS = 120;
/** Hyros' documented maximum `pageSize`. */
export const PAGE_SIZE = 250;
/** Per-check ceiling on pages (1,250 records inside one window). */
export const MAX_PAGES = 5;
/** Room for MAX_EVENTS plus an overlap re-list, so an overlap never re-emits an id. */
export const SEEN_WINDOW = 2000;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

type Row = Record<string, unknown>;

function isoSeconds(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d+Z$/, "Z");
}

/**
 * One check reads up to MAX_PAGES pages of the window; a larger window keeps its `pageId` cursor in
 * state and continues from it next check (`pollWindow`, brief 9.8). Hyros documents `fromDate` as "only [records] whose join date is more recent than this" and an
 * opaque `pageId` cursor, but no result order — so every page of the (small) window is read and
 * the id dedupe decides what is new.
 */
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
/** UTC offsets (hours) of the zone abbreviations a Hyros date can carry; an unknown one is not guessed. */
const ZONES: Record<string, number> = {
  UTC: 0,
  GMT: 0,
  Z: 0,
  ART: -3,
  BRT: -3,
  EST: -5,
  EDT: -4,
  CST: -6,
  CDT: -5,
  MST: -7,
  MDT: -6,
  PST: -8,
  PDT: -7,
  CET: 1,
  CEST: 2,
  BST: 1,
};

/**
 * Milliseconds of a Hyros `creationDate`. The documented format is `Thu Nov 17 10:51:54 ART 2022`
 * (Java `Date.toString`), which `Date.parse` rejects; ISO strings are accepted too. A value whose
 * zone abbreviation is unknown is `undefined` (kept, not floored) rather than a guessed offset.
 */
export function creationMs(value: unknown): number | undefined {
  const text = String(value ?? "").trim();
  const iso = Date.parse(text);
  if (!Number.isNaN(iso)) return iso;
  const m =
    /^[A-Za-z]{3}\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})\s+([A-Za-z]+)\s+(\d{4})$/
      .exec(text);
  if (!m) return undefined;
  const month = MONTHS.indexOf(m[1].toLowerCase());
  const zone = ZONES[m[6].toUpperCase()];
  if (month < 0 || zone === undefined) return undefined;
  return Date.UTC(+m[7], month, +m[2], +m[3], +m[4], +m[5]) - zone * 3_600_000;
}

function check(
  action: ActionDefinition<Record<string, unknown>>,
  state: unknown,
  ctx: HookContext,
) {
  return pollWindow<Row, string>({
    state,
    now: clock.now(),
    overlapMs: OVERLAP_SECONDS * 1000,
    maxPages: MAX_PAGES,
    pageSize: PAGE_SIZE,
    seenWindow: SEEN_WINDOW,
    idOf: (r) => String(r.id),
    // `creationDate` is the field `fromDate` filters on; one that does not parse is kept.
    tsOf: (r) => creationMs(r.creationDate),
    async load(since, pageId) {
      const res = await action.execute({
        fromDate: isoSeconds(since),
        pageSize: PAGE_SIZE,
        pageId,
      }, ctx) as { result?: Row[]; nextPageId?: string | null };
      return { items: res.result ?? [], next: res.nextPageId || undefined };
    },
  });
}

function build(
  key: string,
  title: string,
  description: string,
  action: unknown,
  output: OutputField[],
  sample: Row,
): TriggerDefinition {
  return {
    key,
    title,
    description,
    output,
    sample,
    minIntervalMs: 300_000,
    poll({ state }, ctx) {
      return check(action as ActionDefinition<Record<string, unknown>>, state, ctx);
    },
  };
}

export const newLeadTrigger = build(
  "new-lead",
  "New Lead",
  "The run gets each newly created Hyros lead.",
  leadsList,
  [
    { key: "id", type: "string", label: "Lead ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "creationDate", type: "string", label: "Created" },
    { key: "tags", type: "array", label: "Tags" },
  ],
  {
    id: "40b5af5444756c2b5e666fcb658affd2a4b455bce3711c43f88763147381e368",
    email: "lead1@email.com",
    creationDate: "2023-01-04T04:36:41-05:00",
    tags: ["@testing"],
  },
);

export const newSaleTrigger = build(
  "new-sale",
  "New Sale",
  "The run gets each newly recorded Hyros sale.",
  salesList,
  [
    { key: "id", type: "string", label: "Sale ID" },
    { key: "orderId", type: "string", label: "Order ID" },
    { key: "creationDate", type: "string", label: "Created" },
    { key: "quantity", type: "number", label: "Quantity" },
    { key: "recurring", type: "boolean", label: "Recurring" },
    { key: "lead", type: "object", label: "Lead" },
  ],
  {
    id: "sle-db882bfed1b5280735eb03ac5b9be0c6edf04d7a52204d41f0c6cf6c28ad52234",
    orderId: "7016953413",
    creationDate: "Thu Nov 17 10:51:54 ART 2022",
    quantity: 1,
    recurring: false,
    lead: {
      email: "John@doe.com",
      id: "6e7f85e73a49189f2cb30cc255304adb4d3b20a0bc26776a29bf2a861602078s",
    },
  },
);
