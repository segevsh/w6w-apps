import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";

/** Re-read this much before the saved cursor, so clock skew and in-flight rows are not lost. */
const OVERLAP_MS = 120_000;
/** Contacts per check; a window with more unseen contacts is read again on the next check. */
const MAX_EVENTS = 1000;

export const clock = { now: (): number => Date.now() };

interface Resume {
  since: string;
  page: number;
  startedAt: string;
}
interface State {
  cursor?: string;
  /** Creation instants before this (ms) predate the seed and are never emitted. */
  floor?: number;
  resume?: Resume;
}

export interface SinceSpec {
  key: string;
  title: string;
  description: string;
  output: TriggerDefinition["output"];
  sample: unknown;
  idOf(item: unknown): string;
  /** The item's own creation instant in ms; undefined keeps the item. */
  createdMs(item: unknown): number | undefined;
  /** The wrapped action's items for the window starting at `since` (`page` is always 1 here). */
  fetchPage(
    since: string,
    page: number,
    ctx: HookContext,
  ): Promise<{ items: unknown[]; next?: number }>;
}

const iso = (ms: number) => new Date(ms).toISOString();

/** A vendor timestamp as ms: unix seconds, ms, or an ISO string. */
export function stampMs(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1e11 ? value * 1000 : value;
  }
  if (typeof value === "string" && value !== "") {
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : undefined;
  }
  return undefined;
}

async function check(spec: SinceSpec, state: unknown, ctx: HookContext) {
  const s = (state ?? {}) as State;
  const nowMs = clock.now();
  const seeded = typeof s.cursor === "string" && Number.isFinite(Date.parse(s.cursor));
  const resume = seeded && s.resume && typeof s.resume.since === "string" ? s.resume : undefined;
  const since = resume?.since ?? iso((seeded ? Date.parse(s.cursor!) : nowMs) - OVERLAP_MS);
  const floor = typeof s.floor === "number" ? s.floor : seeded ? undefined : nowMs;
  const startedAt = resume?.startedAt ?? iso(nowMs);
  const page = resume?.page ?? 1;
  let next: number | undefined;
  const result = await pollNewItems<unknown>({
    state: seeded ? state : undefined,
    maxPages: 1,
    maxEvents: MAX_EVENTS,
    seenWindow: 2000,
    idOf: spec.idOf,
    async fetchPage() {
      const out = await spec.fetchPage(since, page, ctx);
      next = out.next;
      return {
        items: out.items.filter((item) => {
          const t = spec.createdMs(item);
          return floor === undefined || t === undefined || t >= floor;
        }),
      };
    },
  });
  if (!seeded) {
    return { events: [], nextState: { ...result.nextState, cursor: startedAt, floor } };
  }
  // A truncated page is read again; otherwise move on. The cursor advances only once drained.
  const more = result.events.length >= MAX_EVENTS ? page : next;
  return {
    events: result.events,
    nextState: more !== undefined
      ? { ...result.nextState, cursor: s.cursor, floor, resume: { since, page: more, startedAt } }
      : { ...result.nextState, cursor: startedAt, floor },
  };
}

export function sinceTrigger(spec: SinceSpec): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    poll: ({ state }, ctx) => check(spec, state, ctx),
  };
}

/** SGQL's documented `TIMESTAMP '2019-08-07T18:00:00Z'` literal: whole seconds, Z suffix. */
export const sgqlTime = (isoMs: string) => `${isoMs.slice(0, 19)}Z`;
