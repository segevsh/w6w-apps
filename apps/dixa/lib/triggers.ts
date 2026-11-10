import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** Pages a `pageKey` walk follows before it gives up (100 rows each, as `new-agent` does). */
export const MAX_PAGES = 20;

/**
 * Follow Dixa's opaque `pageKey` cursor (`meta.next`, surfaced by the list actions as
 * `nextPageKey`) to the last page. Throws past `MAX_PAGES`, so a runaway list fails loudly instead
 * of comparing a partial list (which would announce old rows as new). Verified 2026-11-10 against
 * https://docs.dixa.io/openapi/dixa-api/v1/ .
 */
export async function collectPageKeys(
  fetchPage: (
    pageKey: string | undefined,
  ) => Promise<{ data?: unknown[]; nextPageKey?: string }>,
  what: string,
): Promise<unknown[]> {
  const rows: unknown[] = [];
  let pageKey: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await fetchPage(pageKey);
    rows.push(...(result.data ?? []));
    if (!result.nextPageKey) return rows;
    pageKey = result.nextPageKey;
  }
  throw new Error(`Dixa ${what} exceeds ${MAX_PAGES} pages; refusing to poll it`);
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
            throw new Error(`${spec.key}: a Dixa row came back without an id`);
          }
          return { key: String(id), values: row };
        }),
        emit: { added: true, updated: false, removed: false },
      });
      return { events: events.map((change) => change.values), nextState };
    },
  };
}

const idOf = (row: unknown) => (row as { id?: unknown }).id;
export { idOf };
