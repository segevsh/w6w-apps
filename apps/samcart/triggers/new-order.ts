import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import orderList from "../actions/order-list.ts";

/** Re-read this much before the saved cursor, so clock skew and in-flight rows are not lost. */
const OVERLAP_MS = 120_000;
const PAGE_SIZE = 100;

interface Resume {
  since: string;
  offset: string;
  startedAt: string;
}
interface State {
  cursor?: string;
  /** Creation instants before this (ms) predate the seed and are never emitted. */
  floor?: number;
  resume?: Resume;
}
export const clock = { now: (): number => Date.now() };

/**
 * SamCart documents `order_date` as UTC but writes no zone marker (`2026-11-09 00:06:00`), and
 * `Date.parse` reads a marker-less date-time as HOST-local time. Read it as UTC explicitly.
 */
export function parseUtc(value: string): number {
  const s = value.trim();
  const bare = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)$/.exec(s);
  return Date.parse(bare ? `${bare[1]}T${bare[2]}Z` : s);
}

/** True when the item's own timestamp is before the floor; an unparseable stamp keeps the item. */
const beforeFloor = (item: unknown, floor: number | undefined, field: string) => {
  if (floor === undefined) return false;
  const t = parseUtc(String((item as Record<string, unknown>)[field] ?? ""));
  return Number.isFinite(t) && t < floor;
};

const isoAt = (ms: number) => new Date(ms).toISOString();

async function check(state: unknown, ctx: HookContext) {
  const s = (state ?? {}) as State;
  const nowMs = clock.now();
  const seeded = typeof s.cursor === "string";
  const resume = seeded && s.resume && typeof s.resume.since === "string" ? s.resume : undefined;
  const since = resume?.since ??
    isoAt((seeded ? Date.parse(s.cursor!) : nowMs) - OVERLAP_MS);
  const floor = typeof s.floor === "number" ? s.floor : seeded ? undefined : nowMs;
  const startedAt = resume?.startedAt ?? isoAt(nowMs);
  let more: string | undefined;
  const result = await pollNewItems<unknown>({
    state: seeded ? state : undefined,
    maxPages: 1,
    maxEvents: PAGE_SIZE,
    seenWindow: 1000,
    idOf: (item) => String((item as { id?: unknown }).id ?? ""),
    async fetchPage() {
      const page = await orderList.execute({
        createdAtMin: since,
        limit: PAGE_SIZE,
        ...(resume ? { offset: Number(resume.offset) } : {}),
      }, ctx) as { data?: unknown[]; nextOffset?: string | null };
      more = page.nextOffset ?? undefined;
      return { items: (page.data ?? []).filter((i) => !beforeFloor(i, floor, "order_date")) };
    },
  });
  if (!seeded) {
    return { events: [], nextState: { ...result.nextState, cursor: startedAt, floor } };
  }
  // Cursor moves only once the window is drained; until then resume where this check stopped.
  return {
    events: result.events,
    nextState: more !== undefined
      ? { ...result.nextState, cursor: s.cursor, floor, resume: { since, offset: more, startedAt } }
      : { ...result.nextState, cursor: startedAt, floor },
  };
}

const trigger: TriggerDefinition = {
  key: "new-order",
  title: "New Order",
  description: "The run gets each newly created order.",
  output: [{ key: "id", type: "number", label: "Order ID" }],
  sample: { id: 101 },
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) => check(state, ctx),
};
export default trigger;
