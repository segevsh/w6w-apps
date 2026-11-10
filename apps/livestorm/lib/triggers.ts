import type {
  ActionDefinition,
  HookContext,
  OutputField,
  Param,
  TriggerDefinition,
} from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import { pollWindow } from "./window.ts";

type Item = Record<string, unknown>;
type Params = Record<string, unknown>;

/** Look-back before the stored cursor, so a record that lands late is still read. */
const OVERLAP_MS = 120_000;
/** Page size requested from the wrapped list action. */
const PAGE_SIZE = 100;
/** Pages read per check; a longer window resumes on the next check (brief 9.8). */
const MAX_PAGES = 5;
const SEEN_WINDOW = 1000;
/** 50 pages x 100 rows, the kit's 5000-row ceiling. */
const SNAPSHOT_PAGES = 50;

const rows = (result: unknown): Item[] => {
  const data = (result as { data?: unknown } | null)?.data;
  return Array.isArray(data) ? data as Item[] : [];
};

const attr = (item: Item, field: string): unknown =>
  (item.attributes as Record<string, unknown> | undefined)?.[field];

/** Livestorm stamps are Unix seconds; a missing or unparseable one keeps the item. */
const stampMs = (item: Item, field: string): number | undefined => {
  const n = Number(attr(item, field));
  return Number.isFinite(n) && n > 0 ? n * 1000 : undefined;
};

/** The required `sessionId` parameter shared by the per-session triggers. */
export const SESSION_ID_PARAM: Param = {
  key: "sessionId",
  label: "Session ID",
  type: "string",
  required: true,
  hint:
    "The Livestorm session to watch (the id shown in the session's URL or returned by List Sessions).",
};

const sessionIdOf = (params: Params): string => {
  const id = typeof params.sessionId === "string" ? params.sessionId.trim() : "";
  if (!id) throw new Error("Set Session ID to the Livestorm session to watch.");
  return id;
};

/**
 * Since-filter feed (brief 9.1 b, 9.8, 9.9). Each check asks the wrapped list action for
 * `filter[<since>] = cursor - overlap`, 0-indexed pages of 100, and dedupes by `idOf`. A window of
 * more than MAX_PAGES pages is resumed on the next check; the seed stores `floor = now` so a
 * record that existed before the trigger was switched on never fires (lib/window.ts).
 */
export function sinceFeed(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never>;
  params?: Param[];
  /** Which stamp the vendor filter and the floor compare. */
  stamp: "created_at" | "updated_at";
  /** The action input for one page; `since` is Unix seconds as a string. */
  input(o: { params: Params; since: string; page: number; pageSize: number }): Params;
  idOf(item: Item): string;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx: HookContext) {
      const p = (params ?? {}) as Params;
      if (spec.params?.some((x) => x.required)) sessionIdOf(p);
      return await pollWindow<Item, number>({
        state,
        now: Date.now(),
        overlapMs: OVERLAP_MS,
        maxPages: MAX_PAGES,
        pageSize: PAGE_SIZE,
        seenWindow: SEEN_WINDOW,
        idOf: spec.idOf,
        tsOf: (item) => stampMs(item, spec.stamp),
        async load(sinceMs, pos) {
          const page = pos ?? 0;
          const result = await spec.action.execute(
            spec.input({
              params: p,
              since: String(Math.floor(sinceMs / 1000)),
              page,
              pageSize: PAGE_SIZE,
            }) as never,
            ctx,
          );
          const items = rows(result);
          return { items, next: items.length >= PAGE_SIZE ? page + 1 : undefined };
        },
      });
    },
    output: spec.output,
    sample: spec.sample,
  };
}

/**
 * Bounded collection (brief 9.1 c): the list is read whole (0-indexed pages of 100 when
 * `paged`) and compared check to check; only added rows fire. A list past 5000 rows is refused
 * rather than compared as a partial one.
 */
export function boundedList(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never>;
  params?: Param[];
  /** Page through the list; false for an endpoint that documents no paging. */
  paged: boolean;
  input?(o: { params: Params; page: number; pageSize: number }): Params;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx: HookContext) {
      const p = (params ?? {}) as Params;
      if (spec.params?.some((x) => x.required)) sessionIdOf(p);
      const all: Item[] = [];
      for (let page = 0; page < (spec.paged ? SNAPSHOT_PAGES : 1); page++) {
        const input = { ...spec.input?.({ params: p, page, pageSize: PAGE_SIZE }) };
        const got = rows(await spec.action.execute(input as never, ctx));
        all.push(...got);
        if (!spec.paged || got.length < PAGE_SIZE) break;
        if (page === SNAPSHOT_PAGES - 1) {
          throw new Error(
            `${spec.title} cannot compare more than ${SNAPSHOT_PAGES * PAGE_SIZE} rows.`,
          );
        }
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: all.map((item) => ({ key: String(item.id ?? ""), values: item })),
        emit: { added: true, updated: false, removed: false },
      });
      return { events: events.map((change) => change.values), nextState };
    },
    output: spec.output,
    sample: spec.sample,
  };
}

export { sessionIdOf };
