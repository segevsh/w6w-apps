import type {
  ActionDefinition,
  HookContext,
  OutputField,
  Param,
  TriggerDefinition,
} from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import refundList from "../actions/refund-list.ts";

/** Re-read this much before the saved cursor, so clock skew and in-flight rows are not lost. */
export const OVERLAP_MS = 120_000;
export const PAGE_SIZE = 100;
export const clock = { now: (): number => Date.now() };

/**
 * SamCart documents its timestamps as UTC but writes no zone marker (`2026-11-09 00:06:00`), and
 * `Date.parse` reads a marker-less date-time as HOST-local time. Read it as UTC explicitly.
 */
export function parseUtc(value: string): number {
  const s = value.trim();
  const bare = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)$/.exec(s);
  return Date.parse(bare ? `${bare[1]}T${bare[2]}Z` : s);
}

/** True when the item's own timestamp is before the floor; an unparseable stamp keeps the item. */
function beforeFloor(item: unknown, floor: number | undefined, field: string): boolean {
  if (floor === undefined) return false;
  const t = parseUtc(String((item as Record<string, unknown>)[field] ?? ""));
  return Number.isFinite(t) && t < floor;
}

const isoAt = (ms: number) => new Date(ms).toISOString();
const idOfItem = (item: unknown) => String((item as { id?: unknown }).id ?? "");

interface Resume {
  since: string;
  offset: string;
  startedAt: string;
}
interface SinceState {
  cursor?: string;
  /** Creation instants before this (ms) predate the seed and are never emitted. */
  floor?: number;
  resume?: Resume;
}

export interface SinceSpec {
  key: string;
  title: string;
  description: string;
  /** A list action taking `createdAtMin` (and, when `paged`, `limit` + `offset`). */
  // deno-lint-ignore no-explicit-any
  action: ActionDefinition<any>;
  /** The record field holding its creation instant (read as UTC). */
  stampField: string;
  /** False for an action that returns the whole window in one unpaginated response. */
  paged?: boolean;
  params?: Param[];
  /** Extra action input derived from the trigger's params (e.g. a parent id). */
  input?(params: Record<string, unknown>): Record<string, unknown>;
  output: OutputField[];
  sample: unknown;
}

/**
 * A created-since poll over a SamCart list action (brief 9.1 b): ask for `cursor - overlap`,
 * de-duplicate by `id`, resume a window longer than one page from the saved offset (9.8), and
 * drop anything created before the seed (9.9).
 */
export function sinceTrigger(spec: SinceSpec): TriggerDefinition {
  const paged = spec.paged !== false;
  async function check(
    params: Record<string, unknown>,
    state: unknown,
    ctx: HookContext,
  ) {
    const s = (state ?? {}) as SinceState;
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
      maxEvents: paged ? PAGE_SIZE : 1000,
      seenWindow: 1000,
      idOf: idOfItem,
      async fetchPage() {
        const page = await spec.action.execute({
          ...(spec.input?.(params) ?? {}),
          createdAtMin: since,
          ...(paged ? { limit: PAGE_SIZE } : {}),
          ...(paged && resume ? { offset: Number(resume.offset) } : {}),
        }, ctx) as { data?: unknown[]; nextOffset?: string | null };
        more = paged ? page.nextOffset ?? undefined : undefined;
        return {
          items: (page.data ?? []).filter((i) => !beforeFloor(i, floor, spec.stampField)),
        };
      },
    });
    if (!seeded) {
      return { events: [], nextState: { ...result.nextState, cursor: startedAt, floor } };
    }
    // The cursor moves only once the window is drained; until then resume where this check stopped.
    return {
      events: result.events,
      nextState: more !== undefined
        ? {
          ...result.nextState,
          cursor: s.cursor,
          floor,
          resume: { since, offset: more, startedAt },
        }
        : { ...result.nextState, cursor: startedAt, floor },
    };
  }
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    ...(spec.params ? { params: spec.params } : {}),
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    poll: ({ params, state }, ctx) => check((params ?? {}) as Record<string, unknown>, state, ctx),
  };
}

interface RefundState {
  /** Highest refund id already handled; the next page starts after it. */
  lastId?: number;
  floor?: number;
}

/** A refund id is an integer; the largest 32-bit value is "after every refund". */
const END_OF_IDS = 2_147_483_647;

/**
 * `GET /v1/refunds` has no created-since filter and no sort argument, but the OpenAPI document
 * says "results are sorted by Refund ID" and that `offset` is a record id (`dir=next` = records
 * after it, `dir=prev` = records before it). So the trigger keeps the highest id it has handled
 * and asks for the page after it; every check advances the id, so it cannot stall. The seed reads
 * the one record just before the end of the id range and stamps `floor = now`, which keeps a
 * refund older than the seed from ever being emitted even if that read returns something else.
 */
export async function checkRefunds(state: unknown, ctx: HookContext) {
  const s = (state ?? {}) as RefundState;
  if (typeof s.lastId !== "number") {
    const seed = await refundList.execute(
      { offset: END_OF_IDS, dir: "prev", limit: 1 },
      ctx,
    ) as { data?: unknown[] };
    const ids = (seed.data ?? []).map((i) => Number((i as { id?: unknown }).id)).filter(
      Number.isFinite,
    );
    return {
      events: [],
      nextState: { lastId: ids.length ? Math.max(...ids) : 0, floor: clock.now() },
    };
  }
  const page = await refundList.execute({
    ...(s.lastId > 0 ? { offset: s.lastId } : {}),
    limit: PAGE_SIZE,
  }, ctx) as { data?: unknown[] };
  const fresh = (page.data ?? []).filter((i) => Number((i as { id?: unknown }).id) > s.lastId!);
  const ids = fresh.map((i) => Number((i as { id: unknown }).id));
  return {
    events: fresh.filter((i) => !beforeFloor(i, s.floor, "created_at")),
    nextState: { lastId: ids.length ? Math.max(s.lastId, ...ids) : s.lastId, floor: s.floor },
  };
}
