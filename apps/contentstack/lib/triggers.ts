import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** Rows a snapshot trigger will compare; the kit throws past 5000, so stop one page short of it. */
export const MAX_ROWS = 5000;

/**
 * Walk a Contentstack `limit`/`skip` list to its end: a page shorter than `limit` is the end
 * (the documented pager, https://www.contentstack.com/docs/developers/apis/content-management-api , verified 2026-11-10). Throws
 * once the collection holds more than `maxRows`, so a runaway list fails loudly instead of
 * comparing a partial list (which would announce old rows as new). A since-filter window passes
 * `truncate` and gets the first `maxRows` rows instead.
 */
export async function collectPages<T>(
  limit: number,
  fetchPage: (skip: number, limit: number) => Promise<T[]>,
  maxRows = MAX_ROWS,
  truncate = false,
): Promise<T[]> {
  const rows: T[] = [];
  for (let skip = 0;;) {
    const page = await fetchPage(skip, limit);
    rows.push(...page);
    if (rows.length > maxRows) {
      if (truncate) return rows.slice(0, maxRows);
      throw new Error(`Contentstack list holds more than ${maxRows} rows; refusing to compare it`);
    }
    if (page.length < limit) return rows;
    skip += page.length;
  }
}

export interface SnapshotSpec<P> {
  key: string;
  title: string;
  description: string;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
  /** Every row of the collection. */
  fetchRows(params: P, ctx: HookContext): Promise<unknown[]>;
  idOf(row: unknown): unknown;
}

/**
 * Bounded-collection poll (brief 9.1 c): compare the whole list from check to check with
 * `pollSnapshot` and emit only the rows that were added.
 */
export function snapshotTrigger<P = Record<string, unknown>>(
  spec: SnapshotSpec<P>,
): TriggerDefinition<P> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx) {
      const rows = await spec.fetchRows(params, ctx);
      const { events, nextState } = await pollSnapshot({
        state,
        rows: rows.map((row) => {
          const id = spec.idOf(row);
          if (id === undefined || id === null || id === "") {
            throw new Error(`${spec.key}: a Contentstack row came back without an id`);
          }
          return { key: String(id), values: row };
        }),
        emit: { added: true, updated: false, removed: false },
      });
      return { events: events.map((change) => change.values), nextState };
    },
  };
}
