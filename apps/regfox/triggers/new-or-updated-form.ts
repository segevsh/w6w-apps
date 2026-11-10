import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import formList from "../actions/form-list.ts";

/** Re-read this much before the saved cursor, so clock skew and in-flight edits are not lost. */
const OVERLAP_MS = 120_000;
const PAGE_SIZE = 50;

interface Resume {
  since: string;
  startingAfter: number;
  startedAt: string;
}
interface State {
  cursor?: string;
  /** Creation instants before this (ms) predate the seed and are never emitted. */
  floor?: number;
  resume?: Resume;
}
export const clock = { now: (): number => Date.now() };

/** The vendor accepts `2006-01-02T15:04:05Z`. */
const stamp = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
type FormPage = { forms?: unknown[]; hasMore?: boolean; startingAfter?: number };
/** True when the item's own timestamp is before the floor; an unparseable stamp keeps the item. */
const beforeFloor = (item: unknown, floor: number | undefined, field: string) => {
  if (floor === undefined) return false;
  const t = Date.parse(String((item as Record<string, unknown>)[field] ?? ""));
  return Number.isFinite(t) && t < floor;
};

const idOf = (item: unknown) => {
  const form = item as { id?: unknown; dateUpdated?: unknown };
  return `${form.id ?? ""}:${form.dateUpdated ?? ""}`;
};

async function check(state: unknown, ctx: HookContext) {
  const s = (state ?? {}) as State;
  const nowMs = clock.now();
  const seeded = typeof s.cursor === "string";
  const resume = seeded && s.resume && typeof s.resume.since === "string" ? s.resume : undefined;
  const since = resume?.since ?? stamp((seeded ? Date.parse(s.cursor!) : nowMs) - OVERLAP_MS);
  const floor = typeof s.floor === "number" ? s.floor : seeded ? undefined : nowMs;
  const startedAt = resume?.startedAt ?? new Date(nowMs).toISOString();
  let next: number | undefined;
  const result = await pollNewItems<unknown>({
    state: seeded ? state : undefined,
    maxPages: 1,
    maxEvents: PAGE_SIZE,
    seenWindow: 1000,
    idOf,
    async fetchPage() {
      const page = await formList.execute({
        sort: "asc",
        limit: PAGE_SIZE,
        dateUpdatedAfter: since,
        ...(resume ? { startingAfter: resume.startingAfter } : {}),
      }, ctx) as FormPage;
      if (page.hasMore && typeof page.startingAfter === "number") next = page.startingAfter;
      // The kit expects newest-first pages and emits oldest-first; this page is ascending.
      return {
        items: [...(page.forms ?? [])].reverse().filter((i) =>
          !beforeFloor(i, floor, "dateUpdated")
        ),
      };
    },
  });
  if (!seeded) {
    return { events: [], nextState: { ...result.nextState, cursor: startedAt, floor } };
  }
  // Cursor moves only once the window is drained; until then resume after the last form read.
  return {
    events: result.events,
    nextState: next !== undefined
      ? {
        ...result.nextState,
        cursor: s.cursor,
        floor,
        resume: { since, startingAfter: next, startedAt },
      }
      : { ...result.nextState, cursor: startedAt, floor },
  };
}

const trigger: TriggerDefinition = {
  key: "new-or-updated-form",
  title: "New or Updated Form",
  description: "The run gets each newly created or updated registration form.",
  output: [{ key: "id", type: "number", label: "Form ID" }],
  sample: { id: 101, dateUpdated: "2026-11-09T12:00:00Z" },
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) => check(state, ctx),
};
export default trigger;
