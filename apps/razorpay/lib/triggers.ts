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
/** Razorpay's documented maximum `count`. */
const PAGE_SIZE = 100;
/** Pages read per check; a longer window resumes on the next check (brief 9.8). */
const MAX_PAGES = 5;
const SEEN_WINDOW = 1000;
/** 50 pages x 100 rows, the kit's 5000-row ceiling. */
const SNAPSHOT_PAGES = 50;

const rowsOf = (result: unknown, field: string): Item[] => {
  const rows = (result as Record<string, unknown> | null)?.[field];
  return Array.isArray(rows) ? rows as Item[] : [];
};

/** A required string param, trimmed; throws a message naming the param when empty. */
function requireParam(params: Params, param: Param): void {
  const value = params[param.key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Set ${param.label} before this trigger can poll.`);
  }
}

/**
 * Since-filter feed (brief 9.1 b, 9.8, 9.9). Each check asks the wrapped list action for
 * `from = cursor - overlap` (Unix seconds, Razorpay's created-at filter), `count` 100, paging with
 * `skip`, and dedupes by `idOf`. A window of more than MAX_PAGES pages resumes on the next check;
 * the seed stores `floor = now` so a record created before the trigger was switched on never
 * fires (lib/window.ts).
 */
export function sinceFeed(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never>;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    minIntervalMs: 300_000,
    async poll({ state }, ctx: HookContext) {
      return await pollWindow<Item, number>({
        state,
        now: Date.now(),
        overlapMs: OVERLAP_MS,
        maxPages: MAX_PAGES,
        pageSize: PAGE_SIZE,
        seenWindow: SEEN_WINDOW,
        idOf: (item) => String(item.id ?? ""),
        tsOf: (item) => {
          const seconds = Number(item.created_at);
          return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined;
        },
        async load(sinceMs, pos) {
          const skip = pos ?? 0;
          const result = await spec.action.execute(
            { from: Math.floor(sinceMs / 1000), count: PAGE_SIZE, skip } as never,
            ctx,
          );
          const items = rowsOf(result, "items");
          return { items, next: items.length >= PAGE_SIZE ? skip + PAGE_SIZE : undefined };
        },
      });
    },
    output: spec.output,
    sample: spec.sample,
  };
}

/**
 * Bounded collection (brief 9.1 c): the list is read whole (`count` 100, paged with `skip` when
 * `paged`) and compared check to check; only added rows fire. A list past 5000 rows is refused
 * rather than compared as a partial one.
 */
export function boundedList(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never>;
  params?: Param[];
  /** The action input besides `count`/`skip`. */
  input?(params: Params): Params;
  /** Response field holding the rows (`items`, or `payment_links`). */
  rows?: string;
  /** False for an endpoint with no `count`/`skip` (payment links, an order's payments). */
  paged: boolean;
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
      for (const param of spec.params ?? []) if (param.required) requireParam(p, param);
      const all: Item[] = [];
      const read = async (page: number) => {
        const input = {
          ...spec.input?.(p),
          ...(spec.paged ? { count: PAGE_SIZE, skip: page * PAGE_SIZE } : {}),
        };
        return rowsOf(await spec.action.execute(input as never, ctx), spec.rows ?? "items");
      };
      for (let page = 0; page < (spec.paged ? SNAPSHOT_PAGES : 1); page++) {
        const got = await read(page);
        all.push(...got);
        if (!spec.paged || got.length < PAGE_SIZE) break;
        // 5000 rows exactly is fine: only a non-empty page after the last allowed one is too many.
        if (page === SNAPSHOT_PAGES - 1 && (await read(page + 1)).length > 0) {
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
