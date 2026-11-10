import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** Rows a snapshot trigger will compare; the kit throws past 5000, so stop one row past it. */
export const MAX_ROWS = 5000;

/** Seconds-resolution RFC 3339 for Gitea's `since` (rounded down, so the window only widens). */
export function sinceParam(ms: number): string {
  return new Date(Math.floor(ms / 1000) * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Read a whole Gitea list through its list action: the action's own `page`/`limit` walk (the
 * documented 1-based pager, https://docs.gitea.com/api/1.24/ , verified 2026-11-10) is asked for
 * one row more than `maxRows`, and a longer list throws instead of being compared in part (which
 * would announce old rows as new). A since-filter window passes `truncate` and gets the first
 * `maxRows` rows instead.
 */
export async function collectAll<T>(
  list: (limit: number) => unknown,
  what: string,
  maxRows = MAX_ROWS,
  truncate = false,
): Promise<T[]> {
  const out = await list(maxRows + 1);
  const rows = Array.isArray(out) ? out as T[] : [];
  if (rows.length > maxRows) {
    if (truncate) return rows.slice(0, maxRows);
    throw new Error(`Gitea ${what} holds more than ${maxRows} rows; refusing to compare it`);
  }
  return rows;
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
            throw new Error(`${spec.key}: a Gitea row came back without an id`);
          }
          return { key: String(id), values: row };
        }),
        emit: { added: true, updated: false, removed: false },
      });
      return { events: events.map((change) => change.values), nextState };
    },
  };
}
