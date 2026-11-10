import type { ActionDefinition, HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import { pollFromListAction, pollSnapshot } from "../../_shared/poll/mod.ts";
import canvasList from "../actions/canvas-list.ts";
import catalogList from "../actions/catalog-list.ts";
import contentBlockList from "../actions/content-block-list.ts";
import emailHardBouncesList from "../actions/email-hard-bounces-list.ts";
import emailUnsubscribesList from "../actions/email-unsubscribes-list.ts";
import segmentList from "../actions/segment-list.ts";
import smsInvalidPhoneNumberList from "../actions/sms-invalid-phone-number-list.ts";
import { pollWindow, toMs } from "./window.ts";

/** Look-back before the previous check, so a record that lands late is still seen. */
export const OVERLAP_MS = 120_000;
/** Per-check ceiling in pages (canvas: 100 per page; the rest: `limit` rows per page). */
export const MAX_PAGES = 5;
export const BLOCK_LIMIT = 100;
export const SUPPRESSION_LIMIT = 500;
export const SEEN_WINDOW = MAX_PAGES * SUPPRESSION_LIMIT + SUPPRESSION_LIMIT;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

const ymd = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
const isoSeconds = (ms: number): string => `${new Date(ms).toISOString().slice(0, 19)}Z`;
const DAY_MS = 86_400_000;

type Row = Record<string, unknown>;

// --- newest-first lists (sort_direction=desc sorts by creation time) -------------------------

export const newCanvas: TriggerDefinition = pollFromListAction({
  key: "new-canvas",
  title: "New Canvas",
  description: "The run gets each newly created Braze Canvas.",
  action: canvasList as unknown as ActionDefinition,
  input: () => ({ page: 0, includeArchived: false, sortDirection: "desc" }),
  items: (result) => (result as { canvases?: unknown[] }).canvases ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Canvas ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "last_edited", type: "string", label: "Last edited" },
  ],
  sample: {
    id: "canvas-sample-id",
    name: "Welcome journey",
    tags: ["onboarding"],
    last_edited: "2026-11-09T09:00:00+00:00",
  },
  maxPages: 1,
});

export const newSegment: TriggerDefinition = pollFromListAction({
  key: "new-segment",
  title: "New Segment",
  description: "The run gets each newly created Braze segment.",
  action: segmentList as unknown as ActionDefinition,
  input: () => ({ page: 0, sortDirection: "desc" }),
  items: (result) => (result as { segments?: unknown[] }).segments ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Segment ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "analytics_tracking_enabled", type: "boolean", label: "Analytics tracking enabled" },
    { key: "tags", type: "array", label: "Tags" },
  ],
  sample: {
    id: "segment-sample-id",
    name: "Lapsed customers",
    analytics_tracking_enabled: true,
    tags: ["retention"],
  },
  maxPages: 1,
});

// --- bounded snapshot ------------------------------------------------------------------------

/** `GET /catalogs` returns the workspace's few catalogs whole (no paging); diffed by name. */
export const newCatalog: TriggerDefinition = {
  key: "new-catalog",
  title: "New Catalog",
  description: "The run gets each newly created Braze catalog.",
  output: [
    { key: "name", type: "string", label: "Catalog name" },
    { key: "description", type: "string", label: "Description" },
    { key: "fields", type: "array", label: "Field schema" },
  ],
  sample: { name: "restaurants", description: "My Restaurants", fields: [] },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const res = await catalogList.execute({}, ctx) as { catalogs?: Array<{ name?: string }> };
    const catalogs = (res.catalogs ?? []).filter((c) => c.name !== undefined && c.name !== "");
    const byName = new Map(catalogs.map((c) => [String(c.name), c]));
    const { events, nextState } = await pollSnapshot({
      state,
      rows: [...byName.keys()].map((key) => ({ key, values: { name: key } })),
      emit: { added: true, updated: false },
    });
    return { events: events.map((e) => byName.get(e.key)), nextState };
  },
};

// --- since-filter windows --------------------------------------------------------------------

interface WindowSpec {
  key: string;
  title: string;
  description: string;
  output: OutputField[];
  sample: unknown;
  idOf(item: Row): string;
  tsOf(item: Row): number | undefined;
  pageSize: number;
  load(since: number, offset: number, ctx: HookContext): Promise<Row[]>;
}

function windowTrigger(spec: WindowSpec): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    poll({ state }, ctx) {
      return pollWindow<Row, number>({
        state,
        now: clock.now(),
        overlapMs: OVERLAP_MS,
        maxPages: MAX_PAGES,
        pageSize: spec.pageSize,
        seenWindow: SEEN_WINDOW,
        idOf: spec.idOf,
        tsOf: spec.tsOf,
        async load(since, pos) {
          const offset = pos ?? 0;
          const items = await spec.load(since, offset, ctx);
          return {
            items,
            next: items.length >= spec.pageSize ? offset + spec.pageSize : undefined,
            read: items.length,
          };
        },
      });
    },
  };
}

/** Canvas list pages are 100 rows; `last_edit.time[gt]` is the documented edited-since filter. */
export const updatedCanvas = windowTrigger({
  key: "new-or-updated-canvas",
  title: "New or Updated Canvas",
  description: "The run gets each Braze Canvas that is created or edited.",
  output: [
    { key: "id", type: "string", label: "Canvas ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "last_edited", type: "string", label: "Last edited" },
  ],
  sample: {
    id: "canvas-sample-id",
    name: "Welcome journey",
    tags: ["onboarding"],
    last_edited: "2026-11-09T11:00:00+00:00",
  },
  idOf: (c) => `${c.id}:${c.last_edited ?? ""}`,
  tsOf: (c) => toMs(c.last_edited),
  pageSize: 100,
  async load(since, offset, ctx) {
    const res = await canvasList.execute({
      page: offset / 100,
      includeArchived: false,
      lastEditTimeGt: isoSeconds(since),
    }, ctx) as { canvases?: Row[] };
    return res.canvases ?? [];
  },
});

const BLOCK_OUTPUT: OutputField[] = [
  { key: "content_block_id", type: "string", label: "Content Block ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "content_type", type: "string", label: "Content type" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "last_edited", type: "string", label: "Last edited" },
];
const BLOCK_SAMPLE = {
  content_block_id: "block-sample-id",
  name: "Footer",
  content_type: "html",
  created_at: "2026-11-09T09:00:00.000+00:00",
  last_edited: "2026-11-09T11:00:00.000+00:00",
};

/** `GET /content_blocks/list?modified_after=` returns blocks modified since; `limit`/`offset` page. */
async function loadBlocks(since: number, offset: number, ctx: HookContext): Promise<Row[]> {
  const res = await contentBlockList.execute({
    modifiedAfter: isoSeconds(since),
    limit: BLOCK_LIMIT,
    offset,
  }, ctx) as { content_blocks?: Row[] };
  return res.content_blocks ?? [];
}

export const newContentBlock = windowTrigger({
  key: "new-content-block",
  title: "New Content Block",
  description: "The run gets each newly created Braze Content Block.",
  output: BLOCK_OUTPUT,
  sample: BLOCK_SAMPLE,
  idOf: (b) => String(b.content_block_id),
  tsOf: (b) => toMs(b.created_at),
  pageSize: BLOCK_LIMIT,
  load: loadBlocks,
});

export const updatedContentBlock = windowTrigger({
  key: "new-or-updated-content-block",
  title: "New or Updated Content Block",
  description: "The run gets each Braze Content Block that is created or edited.",
  output: BLOCK_OUTPUT,
  sample: BLOCK_SAMPLE,
  idOf: (b) => `${b.content_block_id}:${b.last_edited ?? ""}`,
  tsOf: (b) => toMs(b.last_edited),
  pageSize: BLOCK_LIMIT,
  load: loadBlocks,
});

/** Suppression feeds take a UTC date range (`end_date` required, midnight UTC) and `limit`/`offset`. */
export const newEmailUnsubscribe = windowTrigger({
  key: "new-email-unsubscribe",
  title: "New Email Unsubscribe",
  description: "The run gets each email address that unsubscribes.",
  output: [
    { key: "email", type: "string", label: "Email" },
    { key: "unsubscribed_at", type: "string", label: "Unsubscribed at" },
  ],
  sample: { email: "reader@example.com", unsubscribed_at: "2026-11-09T09:00:00.000+00:00" },
  idOf: (e) => `${e.email}:${e.unsubscribed_at ?? ""}`,
  tsOf: (e) => toMs(e.unsubscribed_at),
  pageSize: SUPPRESSION_LIMIT,
  async load(since, offset, ctx) {
    const res = await emailUnsubscribesList.execute({
      startDate: ymd(since),
      endDate: ymd(clock.now() + DAY_MS),
      limit: SUPPRESSION_LIMIT,
      offset,
      // Oldest first, so records created while a long window drains append instead of shifting offsets.
      sortDirection: "asc",
    }, ctx) as { emails?: Row[] };
    return res.emails ?? [];
  },
});

export const newEmailHardBounce = windowTrigger({
  key: "new-email-hard-bounce",
  title: "New Email Hard Bounce",
  description: "The run gets each email address that hard bounces.",
  output: [
    { key: "email", type: "string", label: "Email" },
    { key: "hard_bounced_at", type: "string", label: "Hard bounced at" },
  ],
  sample: { email: "gone@example.com", hard_bounced_at: "2026-11-09T09:00:00.000+00:00" },
  idOf: (e) => `${e.email}:${e.hard_bounced_at ?? ""}`,
  tsOf: (e) => toMs(e.hard_bounced_at),
  pageSize: SUPPRESSION_LIMIT,
  async load(since, offset, ctx) {
    const res = await emailHardBouncesList.execute({
      startDate: ymd(since),
      endDate: ymd(clock.now() + DAY_MS),
      limit: SUPPRESSION_LIMIT,
      offset,
    }, ctx) as { emails?: Row[] };
    return res.emails ?? [];
  },
});

export const newInvalidPhoneNumber = windowTrigger({
  key: "new-invalid-phone-number",
  title: "New Invalid Phone Number",
  description: "The run gets each phone number Braze newly finds undeliverable by SMS.",
  output: [
    { key: "phone", type: "string", label: "Phone (E.164)" },
    { key: "invalid_detected_at", type: "string", label: "Detected at" },
    { key: "reason", type: "string", label: "Reason" },
  ],
  sample: {
    phone: "+12345678901",
    invalid_detected_at: "2026-11-09T09:00:00.000+00:00",
    reason: "provider_error",
  },
  idOf: (p) => `${p.phone}:${p.invalid_detected_at ?? ""}`,
  tsOf: (p) => toMs(p.invalid_detected_at),
  pageSize: SUPPRESSION_LIMIT,
  async load(since, offset, ctx) {
    const res = await smsInvalidPhoneNumberList.execute({
      startDate: ymd(since),
      endDate: ymd(clock.now()),
      limit: SUPPRESSION_LIMIT,
      offset,
    }, ctx) as { sms?: Row[]; invalid_phone_numbers?: Row[] };
    return res.sms ?? res.invalid_phone_numbers ?? [];
  },
});
