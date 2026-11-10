import type {
  ActionDefinition,
  HookContext,
  OutputField,
  Param,
  TriggerDefinition,
} from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import { pollWindow, toMs } from "./window.ts";

type Item = Record<string, unknown>;
type Params = Record<string, unknown>;

/** Look-back before the stored cursor, so a record that lands late is still read. */
const OVERLAP_MS = 120_000;
/** Page size requested from the wrapped list action. */
const PAGE_SIZE = 100;
/** Pages read per check by the since-filter feed; a longer window resumes next check (brief 9.8). */
const MAX_PAGES = 5;
const SEEN_WINDOW = 1000;
/** 50 pages x 100 rows, the kit's 5000-row ceiling. */
const SNAPSHOT_PAGES = 50;

const rows = (result: unknown): Item[] => {
  const data = (result as { data?: unknown } | null)?.data;
  return Array.isArray(data) ? data as Item[] : [];
};

/** A required string param, trimmed; throws a message naming the param when it is empty. */
export function requiredParam(params: Params, key: string, label: string): string {
  const value = typeof params[key] === "string" ? (params[key] as string).trim() : "";
  if (!value) throw new Error(`Set ${label} before this trigger can poll.`);
  return value;
}

/**
 * Bounded collection (brief 9.1 c): the list is read whole (1-indexed pages of 100 when `paged`)
 * and compared check to check; only added rows fire. A list past 5000 rows is refused rather than
 * compared as a partial one.
 */
export function boundedList(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never>;
  params?: Param[];
  /** Page through the list; false for an endpoint whose action sends no paging arguments. */
  paged: boolean;
  /** The action input; `page`/`per_page` are added by this helper when `paged`. */
  input?(params: Params): Params;
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
      for (const param of spec.params ?? []) {
        if (param.required) requiredParam(p, param.key, param.label);
      }
      const all: Item[] = [];
      const read = async (page: number) => {
        const input = { ...spec.input?.(p), ...(spec.paged ? { page, per_page: PAGE_SIZE } : {}) };
        return rows(await spec.action.execute(input as never, ctx));
      };
      for (let page = 1; page <= (spec.paged ? SNAPSHOT_PAGES : 1); page++) {
        const got = await read(page);
        all.push(...got);
        if (!spec.paged || got.length < PAGE_SIZE) break;
        // 5000 rows exactly is fine: only a non-empty page after the last allowed one is too many.
        if (page === SNAPSHOT_PAGES && (await read(page + 1)).length > 0) {
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

/**
 * Since-filter feed (brief 9.1 b, 9.8, 9.9). Each check asks the wrapped list action for the
 * records whose `stamp` is after `cursor - overlap`, 1-indexed pages of 100, and dedupes by `idOf`.
 * A window of more than MAX_PAGES pages is resumed on the next check; the seed stores `floor = now`
 * so a record whose stamp was before the trigger was switched on never fires (lib/window.ts).
 */
export function sinceFeed(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never>;
  params?: Param[];
  /** Field the vendor's since-filter compares and the floor is checked against. */
  stamp: string;
  /** The action input for one page; `since` is an ISO-8601 UTC string. */
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
      for (const param of spec.params ?? []) {
        if (param.required) requiredParam(p, param.key, param.label);
      }
      return await pollWindow<Item, number>({
        state,
        now: Date.now(),
        overlapMs: OVERLAP_MS,
        maxPages: MAX_PAGES,
        pageSize: PAGE_SIZE,
        seenWindow: SEEN_WINDOW,
        idOf: spec.idOf,
        tsOf: (item) => toMs(item[spec.stamp]),
        async load(sinceMs, pos) {
          const page = pos ?? 1;
          const result = await spec.action.execute(
            spec.input({
              params: p,
              since: new Date(sinceMs).toISOString(),
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
