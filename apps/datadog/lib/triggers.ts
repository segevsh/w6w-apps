import type {
  ActionDefinition,
  HookContext,
  OutputField,
  Param,
  TriggerDefinition,
} from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** The kit's snapshot ceiling; a walk that reaches it fails loudly instead of dropping records. */
export const MAX_ROWS = 5000;

type Params = Record<string, unknown>;
type Item = Record<string, unknown>;

/**
 * Bounded-collection feed (brief 9.1 c). Each check walks the wrapped list action page by page —
 * the SAME `execute`, client and auth as the action — and diffs the ids with `pollSnapshot`,
 * emitting only records whose id was not in the previous snapshot. The first check records the ids
 * and emits nothing. More than `MAX_ROWS` records (or a walk that is still open after the pages
 * needed to hold them) throws instead of silently truncating.
 */
export function snapshotFeed(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never>;
  params?: Param[];
  /** Page size the walk requests; with `MAX_ROWS` it fixes how many pages a check may read. */
  pageSize: number;
  /** The action input for one page; `cursor` is `0` on the first page, then what `next` returned. */
  input(o: { params: Params; cursor: number; pageSize: number }): Params;
  items(result: unknown): Item[];
  idOf(item: Item): string;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  const maxPages = Math.ceil(MAX_ROWS / spec.pageSize) + 1;
  const run = spec.action.execute as unknown as (i: Params, c: HookContext) => Promise<unknown>;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx: HookContext) {
      const rows = new Map<string, { key: string; values: unknown }>();
      let cursor = 0;
      for (let page = 0;; page++) {
        if (page >= maxPages) {
          throw new Error(
            `${spec.key}: more than ${MAX_ROWS} records; the snapshot trigger cannot cover it`,
          );
        }
        const result = await run(
          spec.input({ params: params as Params, cursor, pageSize: spec.pageSize }),
          ctx,
        );
        const items = spec.items(result);
        for (const item of items) {
          const key = spec.idOf(item);
          if (key && !rows.has(key)) rows.set(key, { key, values: item });
        }
        if (items.length < spec.pageSize) break;
        cursor += 1;
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...rows.values()],
        emit: { added: true, updated: false },
        maxRows: MAX_ROWS,
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}
