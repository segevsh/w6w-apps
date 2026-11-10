import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";

/** Look-back before the previous window, so a record that lands late is still seen. */
export const OVERLAP_MS = 120_000;
/** Vendor pages read per check; a longer window is resumed on the next check (brief 9.8). */
export const MAX_PAGES = 3;
export const PAGE_SIZE = 100;
const MAX_EVENTS = 1000;
const SEEN_WINDOW = 2000;

/** Clock seam. Tests replace `clock.now`; the host hands a trigger no clock. */
export const clock = { now: (): number => Date.now() };

export interface SinceSpec<T, P = Record<string, unknown>> {
  key: string;
  title: string;
  description: string;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
  /** One page (1-based) of records at or after `sinceMs`; `more` is true when another page follows. */
  fetchPage(
    sinceMs: number,
    page: number,
    ctx: HookContext,
    params: P,
  ): Promise<{ items: T[]; more: boolean }>;
  idOf(item: T): string;
  /** When the record was created, epoch ms; `undefined` when it has no parseable stamp. */
  createdAtMs(item: T): number | undefined;
}

interface Resume {
  since: number;
  until: number;
  page: number;
}

interface Prior {
  ids: string[];
  floor: number;
  cursor: number;
  resume?: Resume;
}

function readPrior(state: unknown): Prior | null {
  const s = state as Record<string, unknown> | null;
  if (!s || s.v !== 1 || s.kind !== "ids" || s.seeded !== true || !Array.isArray(s.ids)) {
    return null;
  }
  if (typeof s.floor !== "number" || typeof s.cursor !== "number") return null;
  const r = s.resume as Partial<Resume> | undefined;
  const resume = r && typeof r.since === "number" && typeof r.until === "number" &&
      typeof r.page === "number"
    ? { since: r.since, until: r.until, page: r.page }
    : undefined;
  return { ids: s.ids.map(String), floor: s.floor, cursor: s.cursor, resume };
}

/**
 * Since-filter poll (brief 9.1 b, 9.8, 9.9) over the app's own list action.
 *
 * - Seed (unseeded state): reads nothing, emits nothing, stores `floor = now`. A record created
 *   before the floor is never emitted by a later check, however many pages the window holds.
 * - Each check lists records since `cursor - OVERLAP_MS`, at most `MAX_PAGES` pages. If the window
 *   holds more, the next page is stored in `resume` and the cursor stays until the window is
 *   drained; it then advances to the moment the window began. Ids are deduped with `pollNewItems`.
 */
export function sinceTrigger<T, P = Record<string, unknown>>(
  spec: SinceSpec<T, P>,
): TriggerDefinition<P> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx) {
      const now = clock.now();
      const prior = readPrior(state);
      if (!prior) {
        return {
          events: [],
          nextState: { v: 1, kind: "ids", seeded: true, ids: [], floor: now, cursor: now },
        };
      }
      const since = prior.resume?.since ?? prior.cursor - OVERLAP_MS;
      const until = prior.resume?.until ?? now;
      let page = prior.resume?.page ?? 1;
      const found: T[] = [];
      let more = true;
      for (let n = 0; n < MAX_PAGES && more; n++) {
        const res = await spec.fetchPage(since, page, ctx, params);
        found.push(...res.items);
        more = res.more;
        page += 1;
      }
      const fresh = found.filter((item) => {
        const at = spec.createdAtMs(item);
        return at === undefined || at >= prior.floor;
      });
      // pollNewItems expects newest-first and emits oldest-first.
      fresh.sort((a, b) => (spec.createdAtMs(b) ?? 0) - (spec.createdAtMs(a) ?? 0));
      const { events, nextState } = await pollNewItems<T>({
        state: { v: 1, kind: "ids", seeded: true, ids: prior.ids },
        maxPages: 1,
        maxEvents: MAX_EVENTS,
        seenWindow: SEEN_WINDOW,
        idOf: spec.idOf,
        fetchPage: () => Promise.resolve({ items: fresh }),
      });
      return {
        events,
        nextState: {
          ...nextState,
          floor: prior.floor,
          cursor: more ? prior.cursor : until,
          ...(more ? { resume: { since, until, page } } : {}),
        },
      };
    },
  };
}
