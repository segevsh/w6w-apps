import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import { pollWindow, toMs } from "./window.ts";

/**
 * Eventbrite poll triggers (brief 9.1 b, c; 10.1). The webhook triggers in `triggers.ts` cover the
 * records Eventbrite sends events for (events, orders, attendees' edits and check-ins, ticket classes,
 * organizers, venues); these poll the record types it sends no event for, through the SAME list
 * action the app already ships (same client, same endpoint, same auth).
 *
 * Source: https://www.eventbrite.com/platform/api (list endpoints, verified 2026-11-10).
 */

type Item = Record<string, unknown>;

/** Eventbrite pagination envelope: `has_more_items` + a `continuation` token for the next page. */
interface Page {
  pagination?: { has_more_items?: boolean; continuation?: string };
  [field: string]: unknown;
}

/** Pages one snapshot check reads (a page holds up to 50 records): past this the check fails loudly. */
export const MAX_PAGES = 20;
/** The most records a snapshot can hold: `MAX_PAGES` pages of 50. */
export const MAX_ROWS = MAX_PAGES * 50;

const idOf = (item: Item): string | undefined => {
  const id = item.id;
  return typeof id === "string" && id !== "" ? id : typeof id === "number" ? String(id) : undefined;
};

/**
 * Read a whole list: follow `pagination.continuation` while `has_more_items`. A list the action
 * cannot page (no `continuation` input) or one longer than {@link MAX_PAGES} pages is refused, never
 * compared half-read, because a partial list would announce records it simply did not read.
 */
async function readWhole(
  spec: { key: string; list: string; paged: boolean },
  run: (continuation: string | undefined) => Promise<unknown>,
): Promise<Item[]> {
  const items: Item[] = [];
  let continuation: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = (await run(continuation)) as Page;
    const batch = res?.[spec.list];
    if (Array.isArray(batch)) items.push(...batch as Item[]);
    if (!res?.pagination?.has_more_items) return items;
    if (!spec.paged || !res.pagination.continuation) {
      throw new Error(
        `${spec.key}: Eventbrite reports more records than one response holds and gives no way to read them; the list cannot be compared.`,
      );
    }
    continuation = res.pagination.continuation;
  }
  throw new Error(
    `${spec.key}: more than ${MAX_PAGES} pages of records; the list is too long to compare.`,
  );
}

export interface SnapshotSpec {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never>;
  /** The response field holding the records (`ticket_groups`, `teams`, ...). */
  list: string;
  /** Whether the action accepts a `continuation` input. */
  paged: boolean;
  params: Param[];
  /** The action input for these params (without `continuation`). */
  input(params: Record<string, unknown>): Record<string, unknown>;
  output: OutputField[];
  sample: Record<string, unknown>;
}

/**
 * A record type scoped by a parent the user picks (an event, an organization): each check reads the
 * whole list and `pollSnapshot` emits the ids it has not seen (added only). The first check records
 * what exists and emits nothing.
 */
export function snapshotTrigger(spec: SnapshotSpec): TriggerDefinition {
  const action = spec.action as unknown as ActionDefinition;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx) {
      const base = spec.input((params ?? {}) as Record<string, unknown>);
      const items = await readWhole(
        spec,
        async (continuation) =>
          await action.execute(continuation ? { ...base, continuation } : base, ctx),
      );
      const byId = new Map<string, Item>();
      for (const item of items) {
        const id = idOf(item);
        if (id !== undefined) byId.set(id, item);
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...byId.keys()].map((key) => ({ key, values: { id: key } })),
        emit: { added: true, updated: false, removed: false },
        maxRows: MAX_ROWS,
      });
      return { events: events.map((e) => byId.get(e.key)), nextState };
    },
  };
}

// ── attendees: since-filter (brief 9.1 b, 9.8, 9.9) ─────────────────────────────────────────────

export const OVERLAP_MS = 120_000;
/** Pages one check reads; a window with more is resumed from the stored continuation (brief 9.8). */
export const ATTENDEE_MAX_PAGES = 3;
/** Eventbrite's attendee page size. */
export const ATTENDEE_PAGE_SIZE = 50;
const SEEN_WINDOW = ATTENDEE_MAX_PAGES * ATTENDEE_PAGE_SIZE + ATTENDEE_PAGE_SIZE;

export const clock = { now: (): number => Date.now() };

/** Eventbrite's documented datetime form: UTC, no fractional seconds. */
const eventbriteTime = (ms: number): string => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");

/**
 * `list-attendees` with `changed_since = cursor - overlap`, resumed through `continuation` when a
 * window holds more than {@link ATTENDEE_MAX_PAGES} pages. An attendee is announced again each time
 * it changes (`<id>:<changed>`), so an edit or a check-in is a new event. The seed stores
 * `floor = now`; later checks drop attendees last changed before it (brief 9.9).
 */
export function newOrUpdatedAttendeeTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never>;
  params: Param[];
  output: OutputField[];
  sample: Record<string, unknown>;
}): TriggerDefinition {
  const action = spec.action as unknown as ActionDefinition;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    poll({ state, params }, ctx) {
      const p = (params ?? {}) as { scope?: string; scopeId?: string };
      const scopeId = p.scopeId?.trim();
      if (!scopeId) throw new Error("Set Scope ID to the organization or event to watch.");
      const scope = p.scope === "event" ? "event" : "organization";
      return pollWindow<Item, string>({
        state,
        now: clock.now(),
        overlapMs: OVERLAP_MS,
        maxPages: ATTENDEE_MAX_PAGES,
        pageSize: ATTENDEE_PAGE_SIZE,
        seenWindow: SEEN_WINDOW,
        idOf: (item) => `${String(item.id ?? "")}:${String(item.changed ?? "")}`,
        tsOf: (item) => toMs(item.changed),
        async load(sinceMs, continuation) {
          const res = await action.execute({
            scope,
            scopeId,
            changedSince: eventbriteTime(sinceMs),
            ...(continuation ? { continuation } : {}),
          }, ctx) as Page;
          const items = Array.isArray(res?.attendees) ? res.attendees as Item[] : [];
          const more = res?.pagination?.has_more_items === true &&
            typeof res.pagination.continuation === "string" && res.pagination.continuation !== "";
          return { items, next: more ? res.pagination!.continuation : undefined };
        },
      });
    },
  };
}
