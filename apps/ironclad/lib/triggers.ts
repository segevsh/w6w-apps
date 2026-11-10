import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import workflowList from "../actions/workflow-list.ts";

/** Re-read this much before the saved cursor, so clock skew and in-flight rows are not lost. */
export const OVERLAP_MS = 120_000;
export const PAGE_SIZE = 100;
export const clock = { now: (): number => Date.now() };

interface Resume {
  since: string;
  page: number;
  startedAt: string;
}
interface SinceState {
  cursor?: string;
  /** Instants before this (ms) predate the seed; such a workflow is never emitted (brief 9.9). */
  floor?: number;
  resume?: Resume;
}

const isoAt = (ms: number) => new Date(ms).toISOString();
/** Ironclad's `lastUpdated` is "a UTC date": send the date part, which is never later than the cursor. */
const dateAt = (ms: number) => isoAt(ms).slice(0, 10);

/** True when the item's own stamp is before the floor; an unparseable stamp keeps the item. */
function beforeFloor(item: unknown, floor: number | undefined, field: string): boolean {
  if (floor === undefined) return false;
  const t = Date.parse(String((item as Record<string, unknown>)[field] ?? ""));
  return Number.isFinite(t) && t < floor;
}

export interface WorkflowSpec {
  key: string;
  title: string;
  description: string;
  /** The workflow field read against the seed floor (`created` or `lastUpdated`). */
  stampField: "created" | "lastUpdated";
  idOf(item: unknown): string;
  output: OutputField[];
  sample: unknown;
}

export const statusParam: Param = {
  key: "status",
  label: "Status",
  type: "string",
  hint: "Comma-separated workflow statuses to watch (active, paused, completed, cancelled). " +
    "Leave empty for Ironclad's own default, active workflows.",
};

/**
 * A "since" poll over `GET /workflows` (brief 9.1 b). The endpoint has no sort argument but takes
 * `lastUpdated` ("workflows updated since a UTC date"), so a check asks for the date of
 * `cursor - overlap`, reads one page of 100 (`page` from 0), and de-duplicates by `spec.idOf`.
 * A window longer than one page is resumed from the saved page number on the next check and the
 * cursor moves only once the last page is read (9.8). The seed stamps `floor = now`, and every
 * later check drops a workflow whose own stamp is before it (9.9).
 */
export function workflowSinceTrigger(spec: WorkflowSpec): TriggerDefinition {
  async function check(params: Record<string, unknown>, state: unknown, ctx: HookContext) {
    const s = (state ?? {}) as SinceState;
    const nowMs = clock.now();
    const seeded = typeof s.cursor === "string";
    const resume = seeded && s.resume && typeof s.resume.since === "string" ? s.resume : undefined;
    const since = resume?.since ?? dateAt((seeded ? Date.parse(s.cursor!) : nowMs) - OVERLAP_MS);
    const floor = typeof s.floor === "number" ? s.floor : seeded ? undefined : nowMs;
    const startedAt = resume?.startedAt ?? isoAt(nowMs);
    const pageNo = resume?.page ?? 0;
    const status = typeof params.status === "string" && params.status.trim() !== ""
      ? params.status.split(",").map((x) => x.trim()).filter(Boolean)
      : undefined;
    let more: number | undefined;
    const result = await pollNewItems<unknown>({
      state: seeded ? state : undefined,
      maxPages: 1,
      maxEvents: PAGE_SIZE,
      seenWindow: 1000,
      idOf: spec.idOf,
      async fetchPage() {
        const res = await workflowList.execute({
          page: pageNo,
          pageSize: PAGE_SIZE,
          lastUpdated: since,
          ...(status ? { status } : {}),
        }, ctx) as { list?: unknown[]; count?: number };
        const list = res.list ?? [];
        more = list.length >= PAGE_SIZE && (pageNo + 1) * PAGE_SIZE < (res.count ?? 0)
          ? pageNo + 1
          : undefined;
        return { items: list.filter((i) => !beforeFloor(i, floor, spec.stampField)) };
      },
    });
    if (!seeded) {
      return { events: [], nextState: { ...result.nextState, cursor: startedAt, floor } };
    }
    return {
      events: result.events,
      nextState: more !== undefined
        ? {
          ...result.nextState,
          cursor: s.cursor,
          floor,
          resume: { since, page: more, startedAt },
        }
        : { ...result.nextState, cursor: startedAt, floor },
    };
  }
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [statusParam],
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    poll: ({ params, state }, ctx) => check((params ?? {}) as Record<string, unknown>, state, ctx),
  };
}
